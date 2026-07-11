import { loadMermaid } from '~/utils/loadMermaid'

/**
 * Composable para renderizar diagramas Mermaid em conteúdo HTML
 * Suporta:
 * - <div data-type="mermaid" data-mermaid="..."> (artigos HTML)
 * - <pre><code class="language-mermaid">...</code></pre> (artigos Markdown)
 */
export function useMermaidRender() {
  /**
   * Renderiza todos os diagramas Mermaid dentro de um container
   * @param container - Elemento DOM que contém o HTML com diagramas
   */
  const renderMermaidInContainer = async (container: HTMLElement | null) => {
    if (!container) return

    const mermaidDivs = container.querySelectorAll<HTMLElement>('div[data-mermaid], div[data-type="mermaid"]')
    const codeBlocks = container.querySelectorAll<HTMLElement>('pre > code.language-mermaid')

    //sem diagramas na página não baixa o mermaid
    if (mermaidDivs.length === 0 && codeBlocks.length === 0) return

    //1 processa divs com data-mermaid (artigos HTML)
    for (const div of mermaidDivs) {
      const code = div.dataset.mermaid || div.textContent || ''
      if (code.trim()) {
        await renderDiagram(div, code)
      }
    }

    //2 processa blocos de código mermaid (artigos Markdown)
    for (const codeBlock of codeBlocks) {
      const code = codeBlock.textContent || ''
      const preElement = codeBlock.parentElement
      if (code.trim() && preElement) {
        // Substitui o <pre> por um container de diagrama
        const diagramContainer = document.createElement('div')
        diagramContainer.className = 'mermaid-diagram'
        preElement.replaceWith(diagramContainer)
        await renderDiagram(diagramContainer, code)
      }
    }
  }

  /**
   * Renderiza um diagrama Mermaid em um elemento
   */
  const renderDiagram = async (element: HTMLElement, code: string) => {
    try {
      const mermaid = await loadMermaid()
      //decodifica entidades HTML
      const decodedCode = decodeHtmlEntities(code)
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
      const { svg } = await mermaid.render(id, decodedCode)
      element.innerHTML = svg
      element.classList.add('mermaid-rendered')
    } catch (error: any) {
      console.error('Erro ao renderizar Mermaid:', error)
      element.innerHTML = `
        <div class="mermaid-error">
          <span class="mermaid-error-title">Erro no diagrama</span>
          <pre class="mermaid-error-code">${escapeHtml(code)}</pre>
        </div>
      `
      element.classList.add('mermaid-error-container')
    }
  }

  return {
    renderMermaidInContainer
  }
}


//Decodifica entidades HTML
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

//Escapa HTML para exibir erros de forma segura
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
