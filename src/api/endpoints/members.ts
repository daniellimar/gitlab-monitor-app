import gitlabClient from '../gitlab'
import { parseTotalHeader } from '../utils'
import type { GitLabGroupMember } from '@/types/gitlab'

export async function getGroupMembers(
  groupId: string | number,
  options: {
    page?: number
    perPage?: number
    query?: string
  } = {}
): Promise<{ data: GitLabGroupMember[]; total: number }> {
  const { page = 1, perPage = 100, query } = options

  const response = await gitlabClient.instance.get<GitLabGroupMember[]>(
    `/groups/${groupId}/members`,
    {
      params: {
        page,
        per_page: perPage,
        query,
      },
    }
  )

  return { data: response.data, total: parseTotalHeader(response.headers) }
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
  groupId: string | number
): Promise<GitLabGroupMember[]> {
  const first = await getGroupMembers(groupId, { perPage: 100, page: 1 })
  if (first.total <= first.data.length) return first.data

  const pages = Math.ceil(first.total / 100)
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      getGroupMembers(groupId, { perPage: 100, page: i + 2 }).then((r) => r.data)
    )
  )

  return [...first.data, ...rest.flat()]
}
