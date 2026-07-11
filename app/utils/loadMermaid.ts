type Mermaid = typeof import('mermaid').default

let mermaidInstance: Mermaid | null = null
let loadingPromise: Promise<Mermaid> | null = null

export async function loadMermaid(): Promise<Mermaid> {
  if (mermaidInstance) return mermaidInstance
  if (loadingPromise) return loadingPromise

  loadingPromise = import('mermaid').then((module) => {
    mermaidInstance = module.default
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      suppressErrorRendering: true,
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
