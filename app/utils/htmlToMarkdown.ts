import TurndownService from 'turndown'

let turndownInstance: TurndownService | null = null

function getTurndownService(): TurndownService {
  if (!turndownInstance) {
    turndownInstance = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined'
    })

    turndownInstance.addRule('codeBlock', {
      filter: (node) => {
        return node.nodeName === 'PRE' && node.querySelector('code') !== null
      },
      replacement: (_content, node) => {
        const codeElement = (node as HTMLElement).querySelector('code')
        if (!codeElement) return ''

        const language = codeElement.className.match(/language-(\w+)/)?.[1] || ''
        const code = codeElement.textContent || ''

        return `\n\`\`\`${language}\n${code}\n\`\`\`\n`
      }
    })

    turndownInstance.addRule('image', {
      filter: 'img',
      replacement: (_content, node) => {
        const img = node as HTMLImageElement
        const alt = img.alt || ''
        const src = img.src || ''
        const title = img.title ? ` "${img.title}"` : ''

        const youtubeMatch = alt.match(/^youtube:([a-zA-Z0-9_-]+)$/)
        if (youtubeMatch) {
          const videoId = youtubeMatch[1]
          return `\n[![Assista no YouTube](https://img.youtube.com/vi/${videoId}/0.jpg)](https://www.youtube.com/watch?v=${videoId})\n`
        }

        return `![${alt}](${src}${title})`
      }
    })

    turndownInstance.addRule('youtube', {
      filter: (node) => {
        if (node.nodeName === 'DIV' && (node as HTMLElement).dataset.youtubeVideo) {
          return true
        }
        if (node.nodeName === 'IFRAME') {
          const src = (node as HTMLIFrameElement).src || ''
          return src.includes('youtube.com') || src.includes('youtu.be')
        }
        return false
      },
      replacement: (_content, node) => {
        let src = ''
        if (node.nodeName === 'DIV') {
          const iframe = (node as HTMLElement).querySelector('iframe')
          src = iframe?.src || ''
        } else {
          src = (node as HTMLIFrameElement).src || ''
        }

        const videoId = src.match(/embed\/([^?]+)/)?.[1]
        if (videoId) {
          return `\n[![YouTube](https://img.youtube.com/vi/${videoId}/0.jpg)](https://www.youtube.com/watch?v=${videoId})\n`
        }
        return `\n[Vídeo](${src})\n`
      }
    })

    //regra para tabelas
    turndownInstance.addRule('table', {
      filter: 'table',
      replacement: (_content, node) => {
        const table = node as HTMLTableElement
        const rows = table.querySelectorAll('tr')
        if (rows.length === 0) return ''

        let markdown = '\n'
        let headerProcessed = false

        rows.forEach((row, rowIndex) => {
          const cells = row.querySelectorAll('th, td')
          const isHeader = row.querySelector('th') !== null

          const cellContents = Array.from(cells).map(cell => {
            return (cell.textContent || '').trim().replace(/\|/g, '\\|')
          })

          markdown += '| ' + cellContents.join(' | ') + ' |\n'

          if ((isHeader || rowIndex === 0) && !headerProcessed) {
            markdown += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n'
            headerProcessed = true
          }
        })

        return markdown + '\n'
      }
    })

    turndownInstance.addRule('taskList', {
      filter: (node) => {
        return node.nodeName === 'UL' && (node as HTMLElement).dataset.type === 'taskList'
      },
      replacement: (_content, node) => {
        const items = (node as HTMLElement).querySelectorAll('li')
        let markdown = '\n'

        items.forEach(item => {
          const checkbox = item.querySelector('input[type="checkbox"]') as HTMLInputElement
          const checked = checkbox?.checked ? 'x' : ' '
          const text = item.textContent?.replace(/^\s*/, '') || ''
          markdown += `- [${checked}] ${text}\n`
        })

        return markdown
      }
    })

    turndownInstance.addRule('blockquote', {
      filter: 'blockquote',
      replacement: (content) => {
        const lines = content.trim().split('\n')
        return '\n' + lines.map(line => `> ${line}`).join('\n') + '\n'
      }
    })

    turndownInstance.addRule('horizontalRule', {
      filter: 'hr',
      replacement: () => '\n---\n'
    })

    turndownInstance.addRule('subscript', {
      filter: 'sub',
      replacement: (content) => `<sub>${content}</sub>`
    })

    turndownInstance.addRule('superscript', {
      filter: 'sup',
      replacement: (content) => `<sup>${content}</sup>`
    })

    turndownInstance.addRule('underline', {
      filter: 'u',
      replacement: (content) => `<u>${content}</u>`
    })

    turndownInstance.addRule('highlight', {
      filter: 'mark',
      replacement: (content) => `==${content}==`
    })

    turndownInstance.addRule('colorSpan', {
      filter: (node) => {
        return node.nodeName === 'SPAN' && (node as HTMLElement).style.color !== ''
      },
      replacement: (content) => content
    })

    turndownInstance.addRule('latex', {
      filter: (node) => {
        if (node.nodeName === 'SPAN') {
          const element = node as HTMLElement
          return element.dataset.type === 'latex' || element.dataset.latex !== undefined
        }
        return false
      },
      replacement: (_content, node) => {
        const element = node as HTMLElement
        const latex = element.dataset.latex || element.textContent || ''

        return `$${latex}$`
      }
    })

    turndownInstance.addRule('mermaid', {
      filter: (node) => {
        if (node.nodeName === 'DIV') {
          const element = node as HTMLElement
          return element.dataset.type === 'mermaid' || element.dataset.mermaid !== undefined
        }
        return false
      },
      replacement: (_content, node) => {
        const element = node as HTMLElement
        const mermaidCode = element.dataset.mermaid || element.textContent || ''
        return `\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n`
      }
    })
  }

  return turndownInstance
}

export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '' || html === '<p></p>') {
    return ''
  }

  const turndown = getTurndownService()
  return turndown.turndown(html).trim()
}

export function isEmptyContent(markdown: string): boolean {
  return !markdown || markdown.trim() === ''
}
