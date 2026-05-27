import gitlabClient from '../gitlab'
import { parseTotalHeader } from '../utils'
import gitlabGraphqlClient from '@/graphql/client'
import type { GitLabUser } from '@/types/gitlab'

export async function getUser(userId: string | number): Promise<GitLabUser> {
  const response = await gitlabClient.instance.get<GitLabUser>(`/users/${userId}`)
  return response.data
}

export async function getUserFull(userId: string | number): Promise<Record<string, unknown>> {
  const response = await gitlabClient.instance.get(`/users/${userId}`)
  return response.data as Record<string, unknown>
}

export async function getUserIssues(
  userId: string | number,
  options: { page?: number; perPage?: number; state?: string } = {}
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const { page = 1, perPage = 100, state = 'all' } = options
  const response = await gitlabClient.instance.get<Record<string, unknown>[]>(`/issues`, {
    params: {
      assignee_id: userId,
      page,
      per_page: perPage,
      state,
      scope: 'all',
    },
  })

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getAllUserIssues(
  userId: string | number,
  options: { perPage?: number; state?: string } = {}
): Promise<Record<string, unknown>[]> {
  const { perPage = 100, state = 'all' } = options
  const issues: Record<string, unknown>[] = []
  let page = 1

  while (true) {
    const { data } = await getUserIssues(userId, { page, perPage, state })
    if (data.length === 0) break
    issues.push(...data)
    if (data.length < perPage) break
    page += 1
  }

  return issues
}

export async function getUserMergeRequests(
  userId: string | number,
  options: { page?: number; perPage?: number; state?: string } = {}
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const { page = 1, perPage = 100, state = 'all' } = options
  const response = await gitlabClient.instance.get<Record<string, unknown>[]>(`/merge_requests`, {
    params: {
      author_id: userId,
      page,
      per_page: perPage,
      state,
      scope: 'all',
    },
  })

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getAllUserMergeRequests(
  userId: string | number,
  options: { perPage?: number; state?: string } = {}
): Promise<Record<string, unknown>[]> {
  const { perPage = 100, state = 'all' } = options
  const mergeRequests: Record<string, unknown>[] = []
  let page = 1

  while (true) {
    const { data } = await getUserMergeRequests(userId, { page, perPage, state })
    if (data.length === 0) break
    mergeRequests.push(...data)
    if (data.length < perPage) break
    page += 1
  }

  return mergeRequests
}

export async function getUserEvents(
  userId: string | number,
  options: { page?: number; perPage?: number; action?: string } = {}
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const { page = 1, perPage = 100, action } = options
  const response = await gitlabClient.instance.get<Record<string, unknown>[]>(`/users/${userId}/events`, {
    params: {
      page,
      per_page: perPage,
      action,
    },
  })

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getAllUserEvents(
  userId: string | number,
  options: { perPage?: number; action?: string } = {}
): Promise<Record<string, unknown>[]> {
  const { perPage = 100, action } = options
  const events: Record<string, unknown>[] = []
  let page = 1

  while (true) {
    const { data } = await getUserEvents(userId, { page, perPage, action })
    if (data.length === 0) break
    events.push(...data)
    if (data.length < perPage) break
    page += 1
  }

  return events
}

export interface UserGraphqlSummary {
  contributedProjectsCount: number
  mergeRequestsCount: number
  assignedMergeRequestsCount: number
  reviewRequestedMergeRequestsCount: number
  starredProjectsCount: number
  topGroups: Array<{ fullPath: string; name: string }>
}

interface UserGraphqlSummaryResponse {
  user?: {
    contributedProjects?: {
      count?: number
    }
    authoredMergeRequests?: {
      count?: number
    }
    assignedMergeRequests?: {
      count?: number
    }
    reviewRequestedMergeRequests?: {
      count?: number
    }
    starredProjects?: {
      count?: number
    }
    groups?: {
      nodes?: Array<{ fullPath?: string; name?: string }>
    }
  }
}

const USER_GRAPHQL_SUMMARY_QUERY = `query UserSummary($username: String!) {
  user(username: $username) {
    contributedProjects {
      count
    }
    authoredMergeRequests {
      count
    }
    assignedMergeRequests {
      count
    }
    reviewRequestedMergeRequests {
      count
    }
    starredProjects {
      count
    }
    groups(first: 10) {
      nodes {
        fullPath
        name
      }
    }
  }
}`

export async function getUserGraphqlSummary(
  username: string
): Promise<UserGraphqlSummary | null> {
  if (!username.trim()) return null

  const response = await gitlabGraphqlClient.request<UserGraphqlSummaryResponse>(
    {
      query: USER_GRAPHQL_SUMMARY_QUERY,
      operationName: 'UserSummary',
      variables: { username },
    },
    {
      debugLabel: 'user-summary',
      batchable: true,
      skipCache: true,
    }
  )

  const user = response.user
  if (!user) return null

  const topGroups = (user.groups?.nodes || [])
    .map((group) => ({
      fullPath: String(group.fullPath || ''),
      name: String(group.name || ''),
    }))
    .filter((group) => group.fullPath || group.name)

  return {
    contributedProjectsCount: Number(user.contributedProjects?.count || 0),
    mergeRequestsCount: Number(user.authoredMergeRequests?.count || 0),
    assignedMergeRequestsCount: Number(user.assignedMergeRequests?.count || 0),
    reviewRequestedMergeRequestsCount: Number(user.reviewRequestedMergeRequests?.count || 0),
    starredProjectsCount: Number(user.starredProjects?.count || 0),
    topGroups,
  }
}

export async function searchUsersByUsername(username: string): Promise<GitLabUser[]> {
  const value = username.trim()
  if (!value) return []

  const response = await gitlabClient.instance.get<GitLabUser[]>('/users', {
    params: {
      username: value,
      per_page: 20,
    },
  })

  return response.data
}

export async function getUserProjects(userId: string | number): Promise<Record<string, unknown>[]> {
  const response = await gitlabClient.instance.get<Record<string, unknown>[]>(`/users/${userId}/projects`, {
    params: {
      per_page: 100,
      order_by: 'last_activity_at',
      sort: 'desc',
      simple: false,
      statistics: true,
    },
  })

  return response.data
}

export async function getUserRecentEvents(userId: string | number): Promise<Record<string, unknown>[]> {
  const response = await gitlabClient.instance.get<Record<string, unknown>[]>(`/users/${userId}/events`, {
    params: {
      per_page: 30,
    },
  })

  return response.data
}
