export function formatDate(dateString: string): string {
  // Assume UTC se não tiver indicador de timezone
  const normalized = dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)
    ? dateString
    : dateString + 'Z'
  const date = new Date(normalized)

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}`
}
