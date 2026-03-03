import katex from 'katex'

export function renderLatexInHtml(html: string): string {
  if (!html) return ''

  let processedHtml = html

  const processLatex = (_match: string, latexContent: string): string => {
    const decodedLatex = decodeHtmlEntities(latexContent)
    try {
      return katex.renderToString(decodedLatex, {
        throwOnError: false,
        displayMode: decodedLatex.includes('\\begin{') || decodedLatex.includes('\\['),
      })
    } catch (error) {
      console.error('Erro ao renderizar LaTeX:', error)
      return `<span class="latex-error">${decodedLatex}</span>`
    }
  }

  processedHtml = processedHtml.replace(
    /<span[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi,
    processLatex
  )

  processedHtml = processedHtml.replace(
    /<span[^>]*data-latex='([^']*)'[^>]*>[\s\S]*?<\/span>/gi,
    processLatex
  )

  return processedHtml
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  }

  let decoded = text
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char)
  }

  return decoded
}
