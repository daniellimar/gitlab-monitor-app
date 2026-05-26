import axios, { AxiosInstance, AxiosError } from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import type { ApiError } from '@/types/gitlab'
import { getGitlabApiBaseUrl, getGitlabWebUrl } from '@/config/gitlab'

type AuthMode = 'pat' | 'oauth' | null

type CacheHitError = {
  __cacheHit: true
  response: AxiosResponse
}

type PendingHitError = {
  __pendingHit: true
  promise: Promise<AxiosResponse>
}

type GitLabRequestConfig = InternalAxiosRequestConfig & {
  skipCache?: boolean
  __cacheKey?: string
  __cacheEnabled?: boolean
  __cacheStoreEnabled?: boolean
}

type PendingRequest = {
  promise: Promise<AxiosResponse>
  resolve: (response: AxiosResponse) => void
  reject: (error: unknown) => void
}

type CachedResponse = {
  response: AxiosResponse
  expiresAt: number
}

class GitLabClient {
  private client: AxiosInstance
  private baseUrl: string
  private token: string | null = null
  private authMode: AuthMode = null
  private cacheTtlMs = Number(import.meta.env.VITE_GITLAB_CACHE_TTL_MS || '15000')
  private responseCache = new Map<string, CachedResponse>()
  private pendingRequests = new Map<string, PendingRequest>()
  private bypassCache = false

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
      const requestConfig = config as GitLabRequestConfig
      const method = (requestConfig.method || 'get').toLowerCase()
      const isGet = method === 'get'
      const shouldUseCache = isGet && !requestConfig.skipCache && !this.bypassCache
      requestConfig.__cacheEnabled = shouldUseCache
      requestConfig.__cacheStoreEnabled = isGet && !requestConfig.skipCache

      if (shouldUseCache) {
        const cacheKey = this.buildCacheKey(requestConfig)
        requestConfig.__cacheKey = cacheKey

        const now = Date.now()
        const cached = this.responseCache.get(cacheKey)
        if (cached && cached.expiresAt > now) {
          return Promise.reject({ __cacheHit: true, response: cached.response } as CacheHitError)
        }

        if (cached && cached.expiresAt <= now) {
          this.responseCache.delete(cacheKey)
        }

        const pending = this.pendingRequests.get(cacheKey)
        if (pending) {
          return Promise.reject({ __pendingHit: true, promise: pending.promise } as PendingHitError)
        }

        let resolvePending!: (response: AxiosResponse) => void
        let rejectPending!: (error: unknown) => void
        const pendingPromise = new Promise<AxiosResponse>((resolve, reject) => {
          resolvePending = resolve
          rejectPending = reject
        })

        this.pendingRequests.set(cacheKey, {
          promise: pendingPromise,
          resolve: resolvePending,
          reject: rejectPending,
        })
      }

      if (!this.token) return requestConfig

      requestConfig.headers = requestConfig.headers || {}

      if (this.authMode === 'oauth') {
        requestConfig.headers.Authorization = `Bearer ${this.token}`
        delete requestConfig.headers['PRIVATE-TOKEN']
      } else {
        requestConfig.headers['PRIVATE-TOKEN'] = this.token
        delete requestConfig.headers.Authorization
      }

      return requestConfig
    })

    this.client.interceptors.response.use(
      (response) => {
        const requestConfig = response.config as GitLabRequestConfig
        const cacheKey = requestConfig.__cacheKey

        if (requestConfig.__cacheStoreEnabled && cacheKey) {
          this.responseCache.set(cacheKey, {
            response,
            expiresAt: Date.now() + this.cacheTtlMs,
          })
        }

        if (requestConfig.__cacheEnabled && cacheKey) {
          const pending = this.pendingRequests.get(cacheKey)
          if (pending) {
            pending.resolve(response)
            this.pendingRequests.delete(cacheKey)
          }
        }

        return response
      },
      (error: AxiosError | CacheHitError | PendingHitError) => {
        if ((error as CacheHitError).__cacheHit) {
          return Promise.resolve((error as CacheHitError).response)
        }

        if ((error as PendingHitError).__pendingHit) {
          return (error as PendingHitError).promise
        }

        const axiosError = error as AxiosError
        const requestConfig = axiosError.config as GitLabRequestConfig | undefined
        const cacheKey = requestConfig?.__cacheKey
        if (requestConfig?.__cacheEnabled && cacheKey) {
          const pending = this.pendingRequests.get(cacheKey)
          if (pending) {
            pending.reject(axiosError)
            this.pendingRequests.delete(cacheKey)
          }
        }

        const apiError: ApiError = {
          message: axiosError.message,
          status: axiosError.response?.status || 500,
          details: axiosError.response?.data as Record<string, unknown>,
        }
        return Promise.reject(apiError)
      }
    )

    const envToken = import.meta.env.VITE_GITLAB_TOKEN
    if (envToken) {
      this.setToken(envToken)
    }
  }

  private buildCacheKey(config: GitLabRequestConfig): string {
    const baseUrl = config.baseURL || ''
    const url = config.url || ''
    const params = config.params || {}
    const sortedEntries = Object.entries(params as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    )
    const paramsKey = JSON.stringify(sortedEntries)
    return `${baseUrl}|${url}|${paramsKey}`
  }

  clearCache() {
    this.responseCache.clear()
  }

  async withCacheBypass<T>(callback: () => Promise<T>): Promise<T> {
    const previousBypass = this.bypassCache
    this.bypassCache = true
    this.clearCache()
    try {
      return await callback()
    } finally {
      this.bypassCache = previousBypass
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
