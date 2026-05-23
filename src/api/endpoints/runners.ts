import gitlabClient from '../gitlab'
import { parseTotalHeader } from '../utils'
import type { GitLabRunner } from '@/types/gitlab'

export { calculateRunnerStats } from '@/utils/stats'

export async function getRunners(
  options: {
    page?: number
    perPage?: number
    type?: 'instance_type' | 'group_type' | 'project_type'
    status?: 'online' | 'offline' | 'stale' | 'never_contacted'
    paused?: boolean
    tagList?: string[]
  } = {}
): Promise<{ data: GitLabRunner[]; total: number }> {
  const { page = 1, perPage = 100, type, status, paused, tagList } = options

  const response = await gitlabClient.instance.get<GitLabRunner[]>('/runners', {
    params: {
      page,
      per_page: perPage,
      type,
      status,
      paused,
      tag_list: tagList?.join(','),
    },
  })

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getAllRunners(): Promise<{ data: GitLabRunner[]; total: number }> {
  const response = await gitlabClient.instance.get<GitLabRunner[]>('/runners/all', {
    params: {
      per_page: 100,
    },
  })

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getRunner(runnerId: number): Promise<GitLabRunner> {
  const response = await gitlabClient.instance.get<GitLabRunner>(`/runners/${runnerId}`)
  return response.data
}

export async function getRunnerFull(runnerId: number): Promise<Record<string, unknown>> {
  const response = await gitlabClient.instance.get(`/runners/${runnerId}`)
  return response.data as Record<string, unknown>
}

export async function getGroupRunners(
  groupId: string | number,
  options: {
    page?: number
    perPage?: number
    type?: 'instance_type' | 'group_type' | 'project_type'
    status?: 'online' | 'offline' | 'stale' | 'never_contacted'
  } = {}
): Promise<{ data: GitLabRunner[]; total: number }> {
  const { page = 1, perPage = 100, type, status } = options

  const response = await gitlabClient.instance.get<GitLabRunner[]>(`/groups/${groupId}/runners`, {
    params: {
      page,
      per_page: perPage,
      type,
      status,
    },
  })

  return { data: response.data, total: parseTotalHeader(response.headers) }
}
