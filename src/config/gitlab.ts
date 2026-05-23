import { normalizeGitlabUrl } from '../../gitlab.config'

export { normalizeGitlabUrl }

/** URL pública do GitLab (OAuth redirect, links). */
export function getGitlabWebUrl(): string {
  return normalizeGitlabUrl(import.meta.env.VITE_GITLAB_URL)
}

/**
 * Usa proxy do Vite (/api/gitlab) para evitar CORS no browser.
 * Ative com VITE_USE_API_PROXY=true (recomendado para dev e preview local).
 */
export function shouldUseApiProxy(): boolean {
  const flag = import.meta.env.VITE_USE_API_PROXY
  if (flag === 'false') return false
  if (flag === 'true') return true
  return import.meta.env.DEV
}

/** Base URL do cliente Axios para a API v4. */
export function getGitlabApiBaseUrl(): string {
  if (shouldUseApiProxy()) {
    return '/api/gitlab'
  }
  return `${getGitlabWebUrl()}/api/v4`
}

/** Endpoint para troca do código OAuth (também passa pelo proxy quando ativo). */
export function getOAuthTokenUrl(): string {
  if (shouldUseApiProxy()) {
    return '/oauth/gitlab/oauth/token'
  }
  return `${getGitlabWebUrl()}/oauth/token`
}
