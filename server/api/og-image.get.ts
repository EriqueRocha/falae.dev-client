function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
    if (lines.length === maxLines - 1 && current.length > maxChars) break
  }
  if (current) lines.push(current)

  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines)
    const last = truncated[maxLines - 1]
    if (last !== undefined) truncated[maxLines - 1] = last.slice(0, maxChars - 3) + '...'
    return truncated
  }

  const lastLine = lines[maxLines - 1]
  if (lines.length === maxLines && lastLine !== undefined && lastLine.length > maxChars) {
    lines[maxLines - 1] = lastLine.slice(0, maxChars - 3) + '...'
  }

  return lines
}

export default defineEventHandler((event) => {
  const query = getQuery(event)

  const title = String(query.title ?? 'Artigo')
  const author = String(query.author ?? 'Autor')
  const initials = String(query.initials ?? author.charAt(0)).toUpperCase()
  const gradientIndex = Math.abs(parseInt(String(query.g ?? '0'))) % 5

  const gradients: [string, string, string][] = [
    ['#ec4899', '#a855f7', '#fb923c'],
    ['#ec4899', '#ef4444', '#fb923c'],
    ['#3b82f6', '#a855f7', '#ec4899'],
    ['#4ade80', '#06b6d4', '#3b82f6'],
    ['#fb923c', '#ef4444', '#ec4899'],
  ]

  const gradient = gradients[gradientIndex] ?? gradients[0]!
  const [c1, c2, c3] = gradient

  const titleLines = wrapText(title, 38, 3)
  const lineHeight = 68
  // Vertically center the title block in the remaining space below author row
  const titleBlockHeight = titleLines.length * lineHeight
  const titleStartY = Math.round((630 - 140 - titleBlockHeight) / 2) + 140 + lineHeight - 12

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="80" y="${titleStartY + i * lineHeight}" font-size="58" font-weight="bold" fill="white" font-family="system-ui, -apple-system, sans-serif" letter-spacing="-1">${escapeXml(line)}</text>`,
    )
    .join('\n  ')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="1"/>
      <stop offset="50%" stop-color="${c2}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${c3}" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#overlay)"/>

  <!-- Author row -->
  <!-- Avatar circle (top right) -->
  <circle cx="1100" cy="90" r="58" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
  <text x="1100" y="108" text-anchor="middle" font-size="44" font-weight="bold" fill="white" font-family="system-ui, -apple-system, sans-serif">${escapeXml(initials)}</text>

  <!-- Author name (top left) -->
  <text x="80" y="108" font-size="30" fill="rgba(255,255,255,0.88)" font-family="system-ui, -apple-system, sans-serif" font-weight="600">&gt; ${escapeXml(author)}</text>

  <!-- Title -->
  ${titleSvg}

  <!-- Site name (bottom left) -->
  <text x="80" y="592" font-size="26" fill="rgba(255,255,255,0.65)" font-family="system-ui, -apple-system, sans-serif" font-weight="500">falae.dev</text>
</svg>`

  setHeader(event, 'Content-Type', 'image/svg+xml')
  setHeader(event, 'Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')

  return svg
})
