export type GraphQLPrimitive = string | number | boolean | null

export type GraphQLVariables = Record<string, unknown>

export interface GraphQLErrorLocation {
  line: number
  column: number
}

export interface GraphQLErrorExtension {
  code?: string
  [key: string]: unknown
}

export interface GraphQLErrorPayload {
  message: string
  path?: Array<string | number>
  locations?: GraphQLErrorLocation[]
  extensions?: GraphQLErrorExtension
}

export interface GraphQLResponse<TData = unknown> {
  data?: TData
  errors?: GraphQLErrorPayload[]
}

export interface GraphQLRequest<TVariables extends GraphQLVariables = GraphQLVariables> {
  query: string
  variables?: TVariables
  operationName?: string
}

export interface GraphQLRequestOptions {
  timeoutMs?: number
  cacheTtlMs?: number
  skipCache?: boolean
  debounceMs?: number
  retries?: number
  batchable?: boolean
  debugLabel?: string
}

export interface GraphQLPageInfo {
  hasNextPage: boolean
  endCursor: string | null
}

export interface GraphQLEdge<TNode> {
  node: TNode
  cursor: string
}

export interface GraphQLConnection<TNode> {
  edges?: GraphQLEdge<TNode>[]
  nodes?: TNode[]
  pageInfo: GraphQLPageInfo
}

export interface GraphQLClientConfig {
  baseUrl: string
  timeoutMs?: number
  cacheTtlMs?: number
  maxRetries?: number
  retryDelayMs?: number
  debounceMs?: number
  batchDebounceMs?: number
  maxBatchSize?: number
  debug?: boolean
}

export interface GraphQLFragment {
  name: string
  body: string
}

export type     MetricKey =
  | 'pipelines'
  | 'mergeRequests'
  | 'commits'
  | 'jobs'
  | 'environments'
  | 'dora'

export interface QueryPaginationInput {
  first?: number
  after?: string | null
}

export interface QueryBuilderInput {
  projectPath?: string
  groupPath?: string
  filters: Partial<Record<MetricKey, string[]>>
  metrics: MetricKey[]
  pagination?: QueryPaginationInput
}

export interface BuiltQuery {
  query: string
  variables: GraphQLVariables
  fragments: string[]
}

export interface DoraPoint {
  date: string
  deploymentFrequency: number
  leadTimeForChangesSec: number
  changeFailureRate: number
  mttrSec: number
}

export interface DoraSummary {
  deploymentFrequency: number
  leadTimeForChangesSec: number
  changeFailureRate: number
  mttrSec: number
}

export interface DoraAnalyticsResult {
  summary: DoraSummary
  trend: DoraPoint[]
}

export interface SerializableFilter {
  key: string
  operator: 'eq' | 'in' | 'gte' | 'lte' | 'contains'
  value: unknown
}
