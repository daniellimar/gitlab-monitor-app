/**
 * Normaliza a URL do GitLab (usado no Vite e no cliente).
 * http://gitlab.com redireciona para HTTPS e quebra requisições CORS no browser.
 */
export function normalizeGitlabUrl(url?: string): string {
  const raw = (url || 'https://gitlab.com').trim().replace(/\/$/, '')
  if (!raw) return 'https://gitlab.com'

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const parsed = new URL(withProtocol)

    if (parsed.hostname === 'gitlab.com' && parsed.protocol === 'http:') {
      parsed.protocol = 'https:'
    }

    return parsed.origin
  } catch {
    return 'https://gitlab.com'
  }
}
