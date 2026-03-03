let mermaidInstance: typeof import('mermaid').default | null = null
let loadingPromise: Promise<typeof import('mermaid').default> | null = null

async function loadMermaid() {
  if (mermaidInstance) return mermaidInstance

  if (loadingPromise) return loadingPromise

  loadingPromise = import('mermaid').then((module) => {
    mermaidInstance = module.default
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#475569',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#334155',
        background: '#1e293b',
        mainBkg: '#1e293b',
        nodeBorder: '#475569',
        clusterBkg: '#334155',
        titleColor: '#e2e8f0',
        edgeLabelBackground: '#1e293b',
      },
    })
    return mermaidInstance
  })

  return loadingPromise
}

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
