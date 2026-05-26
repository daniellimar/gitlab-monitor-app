import gitlabClient from '../gitlab'
import { parseTotalHeader } from '../utils'
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
