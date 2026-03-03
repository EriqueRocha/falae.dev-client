import { marked, Renderer } from 'marked'
import katex from 'katex'
import { common, createLowlight } from 'lowlight'
import { toHtml } from 'hast-util-to-html'

let isConfigured = false
const lowlight = createLowlight(common)

function configureMarked(): void {
  if (isConfigured) return

  const renderer = new Renderer()

  renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
    const language = lang || 'plaintext'

    if (language === 'mermaid') {
      return `<div class="mermaid-diagram" data-mermaid="${escapeHtml(text).replace(/"/g, '&quot;')}">${escapeHtml(text)}</div>`
    }

    let highlightedCode: string

    try {
      if (lowlight.registered(language)) {
        const highlighted = lowlight.highlight(language, text)
        highlightedCode = toHtml(highlighted)
      } else {
        const highlighted = lowlight.highlightAuto(text)
        highlightedCode = toHtml(highlighted)
      }
    } catch {
      highlightedCode = escapeHtml(text)
    }

    return `<pre><code class="hljs language-${language}">${highlightedCode}</code></pre>`
  }

  marked.setOptions({
    gfm: true,
    breaks: true
  })

  marked.use({ renderer })

  isConfigured = true
}

export function markdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return ''
  }

  configureMarked()

  const latexPlaceholders: Map<string, string> = new Map()
  let placeholderIndex = 0

  let processedMarkdown = markdown

  processedMarkdown = processedMarkdown.replace(/\$\$([\s\S]+?)\$\$/g, (_match, latex) => {
    const placeholder = `LATEXBLOCK${placeholderIndex++}ENDLATEX`
    try {
      latexPlaceholders.set(placeholder, katex.renderToString(latex.trim(), {
        throwOnError: false,
        displayMode: true,
      }))
    } catch (e) {
      console.error('LaTeX block error:', e)
      latexPlaceholders.set(placeholder, `<span class="latex-error">${escapeHtml(latex)}</span>`)
    }
    return placeholder
  })

  processedMarkdown = processedMarkdown.replace(/(?<!\$)\$(?!\$)([\s\S]+?)\$(?!\$)/g, (_match, latex) => {
    if (!latex.trim()) return _match

    const placeholder = `LATEXINLINE${placeholderIndex++}ENDLATEX`
    try {

      const isBlock = latex.includes('\\begin{') || latex.includes('\\[')
      latexPlaceholders.set(placeholder, katex.renderToString(latex.trim(), {
        throwOnError: false,
        displayMode: isBlock,
      }))
    } catch (e) {
      console.error('LaTeX inline error:', e)
      latexPlaceholders.set(placeholder, `<span class="latex-error">${escapeHtml(latex)}</span>`)
    }
    return placeholder
  })

  const html = marked(processedMarkdown)

  if (typeof html !== 'string') {
    return ''
  }

  let finalHtml = html
  latexPlaceholders.forEach((latexHtml, placeholder) => {
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    finalHtml = finalHtml.replace(new RegExp(escapedPlaceholder, 'g'), latexHtml)
  })

  return finalHtml
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function markdownToHtmlAsync(markdown: string): Promise<string> {
  return markdownToHtml(markdown)
}