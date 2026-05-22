import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthState, GitLabUser, OAuthTokenResponse } from '@/types/gitlab'
import gitlabClient from '@/api/gitlab'

export const useAuthStore = defineStore('auth', () => {
  // State
  const isAuthenticated = ref(false)
  const authMethod = ref<'pat' | 'oauth' | null>(null)
  const token = ref<string | null>(null)
  const user = ref<GitLabUser | null>(null)
  const expiresAt = ref<number | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isExpired = computed(() => {
    if (!expiresAt.value) return false
    return Date.now() > expiresAt.value
  })

  const displayName = computed(() => {
    return user.value?.name || user.value?.username || 'User'
  })

  // Actions
  function initFromEnv() {
    const envToken = import.meta.env.VITE_GITLAB_TOKEN
    if (envToken) {
      setPatToken(envToken)
    } else {
      // Try to restore OAuth from localStorage
      const stored = localStorage.getItem('gitlab_auth')
      if (stored) {
        try {
          const data = JSON.parse(stored) as AuthState
          if (data.token && data.authMethod === 'oauth') {
            if (data.expiresAt && Date.now() < data.expiresAt) {
              token.value = data.token
              authMethod.value = 'oauth'
              user.value = data.user
              expiresAt.value = data.expiresAt
              isAuthenticated.value = true
              gitlabClient.setOAuthToken(data.token)
            } else {
              // Token expired, clear it
              localStorage.removeItem('gitlab_auth')
            }
          }
        } catch {
          localStorage.removeItem('gitlab_auth')
        }
      }
    }
  }

  function setPatToken(patToken: string) {
    token.value = patToken
    authMethod.value = 'pat'
    isAuthenticated.value = true
    expiresAt.value = null
    gitlabClient.setToken(patToken)
    fetchCurrentUser()
  }

  function setOAuthToken(tokenResponse: OAuthTokenResponse) {
    token.value = tokenResponse.access_token
    authMethod.value = 'oauth'
    isAuthenticated.value = true
    expiresAt.value = (tokenResponse.created_at + tokenResponse.expires_in) * 1000
    gitlabClient.setOAuthToken(tokenResponse.access_token)
    
    // Persist OAuth token
    const authState: AuthState = {
      isAuthenticated: true,
      authMethod: 'oauth',
      token: tokenResponse.access_token,
      user: null,
      expiresAt: expiresAt.value,
    }
    localStorage.setItem('gitlab_auth', JSON.stringify(authState))
    
    fetchCurrentUser()
  }

  async function fetchCurrentUser() {
    try {
      isLoading.value = true
      const response = await gitlabClient.instance.get<GitLabUser>('/user')
      user.value = response.data
      
      // Update localStorage if OAuth
      if (authMethod.value === 'oauth') {
        const stored = localStorage.getItem('gitlab_auth')
        if (stored) {
          const data = JSON.parse(stored)
          data.user = response.data
          localStorage.setItem('gitlab_auth', JSON.stringify(data))
        }
      }
    } catch (err) {
      error.value = 'Falha ao buscar informações do usuário'
      console.error('Failed to fetch user:', err)
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    token.value = null
    authMethod.value = null
    isAuthenticated.value = false
    user.value = null
    expiresAt.value = null
    error.value = null
    gitlabClient.clearToken()
    localStorage.removeItem('gitlab_auth')
  }

  // OAuth PKCE Flow helpers
  function generateCodeVerifier(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  async function startOAuthFlow() {
    const clientId = import.meta.env.VITE_GITLAB_CLIENT_ID
    const redirectUri = import.meta.env.VITE_GITLAB_REDIRECT_URI
    const gitlabUrl = import.meta.env.VITE_GITLAB_URL || 'https://gitlab.com'

    if (!clientId || !redirectUri) {
      error.value = 'OAuth não configurado. Configure VITE_GITLAB_CLIENT_ID e VITE_GITLAB_REDIRECT_URI.'
      return
    }

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = crypto.randomUUID()

    // Store verifier and state for callback
    sessionStorage.setItem('oauth_code_verifier', codeVerifier)
    sessionStorage.setItem('oauth_state', state)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: 'read_api read_user read_repository',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    window.location.href = `${gitlabUrl}/oauth/authorize?${params.toString()}`
  }

  async function handleOAuthCallback(code: string, state: string): Promise<boolean> {
    const storedState = sessionStorage.getItem('oauth_state')
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier')

    if (state !== storedState || !codeVerifier) {
      error.value = 'Estado OAuth inválido. Tente novamente.'
      return false
    }

    const clientId = import.meta.env.VITE_GITLAB_CLIENT_ID
    const redirectUri = import.meta.env.VITE_GITLAB_REDIRECT_URI
    const gitlabUrl = import.meta.env.VITE_GITLAB_URL || 'https://gitlab.com'

    try {
      isLoading.value = true

      const response = await fetch(`${gitlabUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId || '',
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri || '',
          code_verifier: codeVerifier || '',
        }),
      })

      if (!response.ok) {
        throw new Error('Falha ao trocar código por token')
      }

      const tokenResponse: OAuthTokenResponse = await response.json()
      setOAuthToken(tokenResponse)

      // Clean up
      sessionStorage.removeItem('oauth_code_verifier')
      sessionStorage.removeItem('oauth_state')

      return true
    } catch (err) {
      error.value = 'Falha na autenticação OAuth'
      console.error('OAuth error:', err)
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    isAuthenticated,
    authMethod,
    token,
    user,
    expiresAt,
    isLoading,
    error,
    // Getters
    isExpired,
    displayName,
    // Actions
    initFromEnv,
    setPatToken,
    setOAuthToken,
    fetchCurrentUser,
    logout,
    startOAuthFlow,
    handleOAuthCallback,
  }
})
