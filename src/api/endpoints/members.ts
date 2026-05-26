import gitlabClient from '../gitlab'
import { parseTotalHeader } from '../utils'
import type { GitLabGroupMember } from '@/types/gitlab'

export async function getGroupMembers(
  options: {
    page?: number
    perPage?: number
    query?: string
  } = {}
): Promise<{ data: GitLabGroupMember[]; total: number }> {
  const { page = 1, perPage = 100, query } = options

  const response = await gitlabClient.instance.get<Partial<GitLabGroupMember>[]>(
    `/users`,
    {
      params: {
        page,
        per_page: perPage,
        query,
      },
    }
  )

  const data = response.data.map((user) => ({
    id: user.id || 0,
    username: user.username || '',
    name: user.name || user.username || `User ${user.id || ''}`,
    state: user.state || 'active',
    avatar_url: user.avatar_url || '',
    web_url: user.web_url || '',
    access_level: user.access_level || 10,
    created_at: user.created_at || '',
    expires_at: user.expires_at || null,
  }))

  return { data, total: parseTotalHeader(response.headers) }
}

export async function getGroupMember(
  groupId: string | number,
  userId: string | number
): Promise<Record<string, unknown>> {
  const response = await gitlabClient.instance.get(
    `/groups/${groupId}/members/${userId}`
  )
  return response.data as Record<string, unknown>
}

export async function getAllGroupMembers(
): Promise<GitLabGroupMember[]> {
  const first = await getGroupMembers({ perPage: 100, page: 1 })
  if (first.total <= first.data.length) return first.data

  const pages = Math.ceil(first.total / 100)
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      getGroupMembers({ perPage: 100, page: i + 2 }).then((r) => r.data)
    )
  )

  return [...first.data, ...rest.flat()]
}
