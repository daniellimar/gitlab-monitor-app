import axios, { AxiosInstance, AxiosError } from 'axios'
import type { ApiError } from '@/types/gitlab'

class GitLabClient {
  private client: AxiosInstance
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = import.meta.env.VITE_GITLAB_URL || 'https://gitlab.com'
    
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v4`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers['PRIVATE-TOKEN'] = this.token
      }
      return config
    })

    // Response interceptor for error handling
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

    // Initialize with PAT from env if available
    const envToken = import.meta.env.VITE_GITLAB_TOKEN
    if (envToken) {
      this.setToken(envToken)
    }
  }

  setToken(token: string) {
    this.token = token
  }

  setOAuthToken(token: string) {
    this.token = token
    // Update interceptor for OAuth (uses Authorization header)
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers['Authorization'] = `Bearer ${this.token}`
        delete config.headers['PRIVATE-TOKEN']
      }
      return config
    })
  }

  clearToken() {
    this.token = null
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
