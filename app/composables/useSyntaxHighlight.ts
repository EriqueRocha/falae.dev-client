import { common, createLowlight } from 'lowlight'
import { toHtml } from 'hast-util-to-html'

const lowlight = createLowlight(common)

/**
 * Composable para syntax highlighting de blocos de codigo
 * Usa lowlight (highlight.js virtual) para destacar codigo
 */
export function useSyntaxHighlight() {
  /**
   * Aplica syntax highlighting em todos os blocos de codigo dentro de um container
   * @param container Elemento HTML que contem os blocos de codigo
   */
  const highlightCodeInContainer = (container: HTMLElement | null) => {
    if (!container) return

    // Encontra todos os blocos <pre><code>
    const codeBlocks = container.querySelectorAll('pre code')

    codeBlocks.forEach((codeElement) => {
      //verifica se ja foi destacado
      if (codeElement.classList.contains('hljs')) return

      //tenta detectar a linguagem pela classe (language-xxx ou xxx)
      const classList = Array.from(codeElement.classList)
      let language = 'plaintext'

      for (const cls of classList) {
        if (cls.startsWith('language-')) {
          language = cls.replace('language-', '')
          break
        }
        //verifica se a classe e uma linguagem conhecida
        if (lowlight.registered(cls)) {
          language = cls
          break
        }
      }

      const code = codeElement.textContent || ''

      try {
        let highlighted: ReturnType<typeof lowlight.highlight>

        if (language !== 'plaintext' && lowlight.registered(language)) {
          highlighted = lowlight.highlight(language, code)
        } else {
          highlighted = lowlight.highlightAuto(code)
        }

        codeElement.innerHTML = toHtml(highlighted)
        codeElement.classList.add('hljs')

        //adiciona a classe da linguagem detectada se nao existir
        if (highlighted.data?.language) {
          codeElement.classList.add(`language-${highlighted.data.language}`)
        }
      } catch (e) {
        console.warn('Erro ao destacar codigo:', e)
      }
    })
  }

  /**
   * Destaca uma string de codigo e retorna o HTML
   * @param code Codigo fonte
   * @param language Linguagem (opcional, sera auto-detectada se nao especificada)
   */
  const highlightCode = (code: string, language?: string): string => {
    try {
      let highlighted: ReturnType<typeof lowlight.highlight>

      if (language && lowlight.registered(language)) {
        highlighted = lowlight.highlight(language, code)
      } else {
        highlighted = lowlight.highlightAuto(code)
      }

      return toHtml(highlighted)
    } catch (e) {
      console.warn('Erro ao destacar codigo:', e)
      return escapeHtml(code)
    }
  }

  return {
    highlightCodeInContainer,
    highlightCode
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
