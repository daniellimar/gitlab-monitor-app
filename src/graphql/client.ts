import axios, {AxiosError, type AxiosInstance} from 'axios'
import gitlabClient from '@/api/gitlab'
import { getGitlabGraphqlUrl } from '@/config/gitlab'
import type {
  GraphQLClientConfig,
  GraphQLErrorPayload,
  GraphQLRequest,
  GraphQLRequestOptions,
  GraphQLResponse,
  GraphQLVariables,
} from '@/types/graphql'

type InternalRequestOptions = Required<
  Pick<
    GraphQLRequestOptions,
    'timeoutMs' | 'cacheTtlMs' | 'skipCache' | 'debounceMs' | 'retries' | 'batchable'
  >
> &
  Pick<GraphQLRequestOptions, 'debugLabel'>

type CachedGraphQLResponse = {
  expiresAt: number
  response: GraphQLResponse
}

type PendingResponse = {
  promise: Promise<GraphQLResponse>
  resolve: (value: GraphQLResponse) => void
  reject: (reason?: unknown) => void
}

type BatchedEntry = {
  request: GraphQLRequest
  options: InternalRequestOptions
  resolve: (value: GraphQLResponse) => void
  reject: (reason?: unknown) => void
}

function serializeVariables(variables?: GraphQLVariables): string {
  if (!variables) return '{}'
  const keys = Object.keys(variables).sort()
  const normalized = keys.reduce(
    (acc, key) => {
      acc[key] = variables[key]
      return acc
    },
    {} as Record<string, unknown>
  )
  return JSON.stringify(normalized)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class GitLabGraphQLClient {
  private client: AxiosInstance
  private cacheTtlMs: number
  private timeoutMs: number
  private maxRetries: number
  private retryDelayMs: number
  private debounceMs: number
  private batchDebounceMs: number
  private maxBatchSize: number
  private debug: boolean

  private responseCache = new Map<string, CachedGraphQLResponse>()
  private pendingRequests = new Map<string, PendingResponse>()
  private debounceTimers = new Map<string, number>()
  private batchQueue = new Map<string, BatchedEntry[]>()
  private batchTimers = new Map<string, number>()

  constructor(config: GraphQLClientConfig) {
    this.timeoutMs = config.timeoutMs ?? 30000
    this.cacheTtlMs = config.cacheTtlMs ?? Number(import.meta.env.VITE_GITLAB_CACHE_TTL_MS || '15000')
    this.maxRetries = config.maxRetries ?? 2
    this.retryDelayMs = config.retryDelayMs ?? 800
    this.debounceMs = config.debounceMs ?? 100
    this.batchDebounceMs = config.batchDebounceMs ?? 40
    this.maxBatchSize = config.maxBatchSize ?? 8
    this.debug = config.debug ?? import.meta.env.DEV

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use((request: any) => {
      const token = gitlabClient.getToken()
      const authMode = gitlabClient.getAuthMode()

      if (token) {
        if (!request.headers) {
          request.headers = {}
        }

        if (authMode === 'oauth') {
          request.headers.Authorization = `Bearer ${token}`
          delete request.headers['PRIVATE-TOKEN']
        } else {
          request.headers['PRIVATE-TOKEN'] = token
          delete request.headers.Authorization
        }
      }

      return request
    })
  }

  private resolveOptions(options?: GraphQLRequestOptions): InternalRequestOptions {
    return {
      timeoutMs: options?.timeoutMs ?? this.timeoutMs,
      cacheTtlMs: options?.cacheTtlMs ?? this.cacheTtlMs,
      skipCache: options?.skipCache ?? false,
      debounceMs: options?.debounceMs ?? this.debounceMs,
      retries: options?.retries ?? this.maxRetries,
      batchable: options?.batchable ?? false,
      debugLabel: options?.debugLabel,
    }
  }

  private getCacheKey(request: GraphQLRequest): string {
    return `${request.operationName || 'anonymous'}|${request.query}|${serializeVariables(request.variables)}`
  }

  private debugLog(message: string, label?: string) {
    if (!this.debug) return
    const prefix = label ? `[GraphQL:${label}]` : '[GraphQL]'
    console.debug(prefix, message)
  }

  private parseRateLimitRetry(error: AxiosError): number | null {
    const retryAfter = error.response?.headers?.['retry-after']
    if (!retryAfter) return null
    const asNumber = Number(retryAfter)
    if (!Number.isNaN(asNumber)) return asNumber * 1000
    return null
  }

  private async postGraphQL(
    request: GraphQLRequest,
    options: InternalRequestOptions,
    attempt = 0
  ): Promise<GraphQLResponse> {
    try {
      const response = await this.client.post<GraphQLResponse>(
        '',
        {
          query: request.query,
          variables: request.variables,
          operationName: request.operationName,
        },
        {
          timeout: options.timeoutMs,
        }
      )

      if (response.data.errors?.length) {
        const first = response.data.errors[0]
        const error = new Error(first.message)
        ;(error as Error & { graphQLErrors?: GraphQLErrorPayload[] }).graphQLErrors = response.data.errors
        throw error
      }

      return response.data
    } catch (error) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status
      const canRetry = status === 429 || (status !== undefined && status >= 500)

      if (attempt < options.retries && canRetry) {
        const waitMs = this.parseRateLimitRetry(axiosError) ?? this.retryDelayMs * (attempt + 1)
        this.debugLog(`Retry ${attempt + 1}/${options.retries} em ${waitMs}ms`, options.debugLabel)
        await wait(waitMs)
        return this.postGraphQL(request, options, attempt + 1)
      }

      throw error
    }
  }

  private queueBatch(request: GraphQLRequest, options: InternalRequestOptions): Promise<GraphQLResponse> {
    const key = options.debugLabel || 'default'
    const current = this.batchQueue.get(key) || []

    return new Promise((resolve, reject) => {
      current.push({ request, options, resolve, reject })
      this.batchQueue.set(key, current)

      if (current.length >= this.maxBatchSize) {
        void this.flushBatch(key)
        return
      }

      const existingTimer = this.batchTimers.get(key)
      if (existingTimer) {
        window.clearTimeout(existingTimer)
      }

      const timer = window.setTimeout(() => {
        void this.flushBatch(key)
      }, this.batchDebounceMs)
      this.batchTimers.set(key, timer)
    })
  }

  private async flushBatch(key: string): Promise<void> {
    const timer = this.batchTimers.get(key)
    if (timer) {
      window.clearTimeout(timer)
      this.batchTimers.delete(key)
    }

    const entries = this.batchQueue.get(key) || []
    if (!entries.length) return
    this.batchQueue.delete(key)

    await Promise.all(
      entries.map(async (entry) => {
        try {
          const result = await this.postGraphQL(entry.request, entry.options)
          entry.resolve(result)
        } catch (error) {
          entry.reject(error)
        }
      })
    )
  }

  async request<TData = unknown, TVariables extends GraphQLVariables = GraphQLVariables>(
    request: GraphQLRequest<TVariables>,
    options?: GraphQLRequestOptions
  ): Promise<TData> {
    const resolvedOptions = this.resolveOptions(options)
    const cacheKey = this.getCacheKey(request)

    if (!resolvedOptions.skipCache) {
      const cached = this.responseCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        this.debugLog('Cache hit', resolvedOptions.debugLabel)
        return cached.response.data as TData
      }
      if (cached && cached.expiresAt <= Date.now()) {
        this.responseCache.delete(cacheKey)
      }

      const pending = this.pendingRequests.get(cacheKey)
      if (pending) {
        this.debugLog('Deduplicated pending request', resolvedOptions.debugLabel)
        const response = await pending.promise
        return response.data as TData
      }
    }

    let resolvePending!: (value: GraphQLResponse) => void
    let rejectPending!: (reason?: unknown) => void
    const pendingPromise = new Promise<GraphQLResponse>((resolve, reject) => {
      resolvePending = resolve
      rejectPending = reject
    })

    this.pendingRequests.set(cacheKey, {
      promise: pendingPromise,
      resolve: resolvePending,
      reject: rejectPending,
    })

    const run = async () => {
      try {
        const response = resolvedOptions.batchable
          ? await this.queueBatch(request, resolvedOptions)
          : await this.postGraphQL(request, resolvedOptions)

        if (!resolvedOptions.skipCache) {
          this.responseCache.set(cacheKey, {
            response,
            expiresAt: Date.now() + resolvedOptions.cacheTtlMs,
          })
        }

        const pending = this.pendingRequests.get(cacheKey)
        pending?.resolve(response)
        this.pendingRequests.delete(cacheKey)

        return response.data as TData
      } catch (error) {
        const pending = this.pendingRequests.get(cacheKey)
        pending?.reject(error)
        this.pendingRequests.delete(cacheKey)
        throw error
      }
    }

    if (resolvedOptions.debounceMs > 0) {
      const existingTimer = this.debounceTimers.get(cacheKey)
      if (existingTimer) {
        window.clearTimeout(existingTimer)
      }

      return new Promise<TData>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          void run().then(resolve).catch(reject)
        }, resolvedOptions.debounceMs)

        this.debounceTimers.set(cacheKey, timer)
      })
    }

    return run()
  }

  async paginateConnection<TNode, TVariables extends GraphQLVariables = GraphQLVariables>(
    requestFactory: (cursor?: string | null) => GraphQLRequest<TVariables>,
    extractConnection: (data: unknown) => {
      nodes: TNode[]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    },
    options?: GraphQLRequestOptions
  ): Promise<TNode[]> {
    const items: TNode[] = []
    let cursor: string | null | undefined = null
    let hasNextPage = true

    while (hasNextPage) {
      const request = requestFactory(cursor)
      const data = await this.request<unknown, TVariables>(request, options)
      const connection = extractConnection(data)
      items.push(...connection.nodes)
      hasNextPage = connection.pageInfo.hasNextPage
      cursor = connection.pageInfo.endCursor
      if (!hasNextPage) {
        break
      }
    }

    return items
  }

  clearCache() {
    this.responseCache.clear()
  }
}

export const gitlabGraphqlClient = new GitLabGraphQLClient({
  baseUrl: getGitlabGraphqlUrl(),
})

export default gitlabGraphqlClient
