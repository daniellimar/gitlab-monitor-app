import axios, { AxiosInstance, AxiosError } from 'axios'
import type { ApiError } from '@/types/gitlab'
import { getGitlabApiBaseUrl, getGitlabWebUrl } from '@/config/gitlab'

type AuthMode = 'pat' | 'oauth' | null

class GitLabClient {
  private client: AxiosInstance
  private baseUrl: string
  private token: string | null = null
  private authMode: AuthMode = null

  constructor() {
    this.baseUrl = getGitlabWebUrl()

    this.client = axios.create({
      baseURL: getGitlabApiBaseUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use((config) => {
      if (!this.token) return config

      if (this.authMode === 'oauth') {
        config.headers.Authorization = `Bearer ${this.token}`
        delete config.headers['PRIVATE-TOKEN']
      } else {
        config.headers['PRIVATE-TOKEN'] = this.token
        delete config.headers.Authorization
      }

      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message,
          status: error.response?.status || 500,
          details: error.response?.data as Record<string, unknown>,
        }
        return Promise.reject(apiError)
      }
    )

    const envToken = import.meta.env.VITE_GITLAB_TOKEN
    if (envToken) {
      this.setToken(envToken)
    }
  }

  setToken(token: string) {
    this.token = token
    this.authMode = 'pat'
  }

  setOAuthToken(token: string) {
    this.token = token
    this.authMode = 'oauth'
  }

  clearToken() {
    this.token = null
    this.authMode = null
  }

  getBaseUrl() {
    return this.baseUrl
  }

  isConfigured() {
    return !!this.token
  }

  get instance() {
    return this.client
  }
}

export const gitlabClient = new GitLabClient()
export default gitlabClient
