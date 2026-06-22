const ABSOLUTE_URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i
const SPECIAL_URL_RE = /^(about|data|file|mailto|tel|javascript):/i
const LOCAL_HOST_RE = /^(localhost|(?:\d{1,3}\.){3}\d{1,3}|\[[0-9a-f:]+\])(?::\d+)?(?:[/?#]|$)/i

export function normalizeNavigationUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (ABSOLUTE_URL_RE.test(trimmed) || SPECIAL_URL_RE.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`

  const protocol = LOCAL_HOST_RE.test(trimmed) ? 'http' : 'https'
  return `${protocol}://${trimmed}`
}
