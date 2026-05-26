import type { SerializableFilter } from '@/types/graphql'

export interface PeriodFilter {
  from?: string
  to?: string
}

export interface AnalyticsFilters {
  period?: PeriodFilter
  branch?: string[]
  user?: string[]
  pipelineStatus?: string[]
  deploymentStatus?: string[]
  mergeRequestStatus?: string[]
  labels?: string[]
  environments?: string[]
  project?: string[]
  group?: string[]
}

export type FilterScope =
  | 'pipelines'
  | 'deployments'
  | 'mergeRequests'
  | 'commits'
  | 'jobs'
  | 'environments'

const FILTER_STORAGE_KEY = 'gitlab_graphql_filters'

export function combineFilters(...filters: AnalyticsFilters[]): AnalyticsFilters {
  return filters.reduce<AnalyticsFilters>((acc, current) => {
    return {
      period: current.period ?? acc.period,
      branch: current.branch ?? acc.branch,
      user: current.user ?? acc.user,
      pipelineStatus: current.pipelineStatus ?? acc.pipelineStatus,
      deploymentStatus: current.deploymentStatus ?? acc.deploymentStatus,
      mergeRequestStatus: current.mergeRequestStatus ?? acc.mergeRequestStatus,
      labels: current.labels ?? acc.labels,
      environments: current.environments ?? acc.environments,
      project: current.project ?? acc.project,
      group: current.group ?? acc.group,
    }
  }, {})
}

export function serializeFilters(filters: AnalyticsFilters): SerializableFilter[] {
  const payload: SerializableFilter[] = []

  if (filters.period?.from) {
    payload.push({ key: 'period.from', operator: 'gte', value: filters.period.from })
  }

  if (filters.period?.to) {
    payload.push({ key: 'period.to', operator: 'lte', value: filters.period.to })
  }

  const addArray = (key: string, values?: string[]) => {
    if (!values?.length) return
    payload.push({ key, operator: values.length === 1 ? 'eq' : 'in', value: values })
  }

  addArray('branch', filters.branch)
  addArray('user', filters.user)
  addArray('pipelineStatus', filters.pipelineStatus)
  addArray('deploymentStatus', filters.deploymentStatus)
  addArray('mergeRequestStatus', filters.mergeRequestStatus)
  addArray('labels', filters.labels)
  addArray('environments', filters.environments)
  addArray('project', filters.project)
  addArray('group', filters.group)

  return payload
}

export function deserializeFilters(payload: SerializableFilter[]): AnalyticsFilters {
  const getValues = (key: string): string[] | undefined => {
    const entry = payload.find((item) => item.key === key)
    if (!entry) return undefined
    if (Array.isArray(entry.value)) return entry.value.map((item) => String(item))
    return [String(entry.value)]
  }

  const from = payload.find((item) => item.key === 'period.from')?.value
  const to = payload.find((item) => item.key === 'period.to')?.value

  return {
    period: from || to ? { from: from ? String(from) : undefined, to: to ? String(to) : undefined } : undefined,
    branch: getValues('branch'),
    user: getValues('user'),
    pipelineStatus: getValues('pipelineStatus'),
    deploymentStatus: getValues('deploymentStatus'),
    mergeRequestStatus: getValues('mergeRequestStatus'),
    labels: getValues('labels'),
    environments: getValues('environments'),
    project: getValues('project'),
    group: getValues('group'),
  }
}

export function persistFilters(filters: AnalyticsFilters) {
  const serialized = serializeFilters(filters)
  localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(serialized))
}

export function loadPersistedFilters(): AnalyticsFilters {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SerializableFilter[]
    return deserializeFilters(parsed)
  } catch {
    return {}
  }
}

function graphQLList(values?: string[]): string | null {
  if (!values?.length) return null
  const encoded = values.map((value) => `"${value}"`).join(', ')
  return `[${encoded}]`
}

export function buildFilterArguments(filters: AnalyticsFilters, scope: FilterScope): string[] {
  const args: string[] = []

  const addUpdatedRange =
    scope === 'pipelines' ||
    scope === 'deployments' ||
    scope === 'mergeRequests'

  if (addUpdatedRange && filters.period?.from) {
    args.push(`updatedAfter: "${filters.period.from}"`)
  }

  if (addUpdatedRange && filters.period?.to) {
    args.push(`updatedBefore: "${filters.period.to}"`)
  }

  if (scope === 'pipelines') {
    const branches = graphQLList(filters.branch)
    if (branches) {
      args.push(`ref: ${branches}`)
    }

    const users = graphQLList(filters.user)
    if (users) {
      args.push(`authorUsername: ${users}`)
    }

    const statuses = graphQLList(filters.pipelineStatus)
    if (statuses) {
      args.push(`status: ${statuses}`)
    }
  }

  if (scope === 'deployments') {
    const statuses = graphQLList(filters.deploymentStatus)
    if (statuses) {
      args.push(`status: ${statuses}`)
    }

    const environments = graphQLList(filters.environments)
    if (environments) {
      args.push(`environment: ${environments}`)
    }
  }

  if (scope === 'mergeRequests') {
    const states = graphQLList(filters.mergeRequestStatus)
    if (states) {
      args.push(`state: ${states}`)
    }

    const labels = graphQLList(filters.labels)
    if (labels) {
      args.push(`labelName: ${labels}`)
    }
  }

  return args
}
