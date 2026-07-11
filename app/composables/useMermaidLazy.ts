import { loadMermaid } from '~/utils/loadMermaid'

export function useMermaidLazy() {
  const renderMermaidDiagrams = async (container: HTMLElement | null) => {
    if (!container) return

    const diagrams = container.querySelectorAll('.mermaid-diagram:not(.mermaid-rendered)')
    if (diagrams.length === 0) return

    const mermaid = await loadMermaid()

    for (const diagram of diagrams) {
      const code = diagram.getAttribute('data-mermaid')
      if (!code) continue

      try {
        const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`
        const { svg } = await mermaid.render(id, code)
        diagram.innerHTML = svg
        diagram.classList.add('mermaid-rendered')
      } catch (e) {
        console.error('Erro ao renderizar Mermaid:', e)
        diagram.classList.add('mermaid-error')
        diagram.innerHTML = `<pre class="mermaid-error-content"><code>${diagram.textContent}</code></pre>`
      }
    }
  }

  return {
    renderMermaidDiagrams,
  }
}
