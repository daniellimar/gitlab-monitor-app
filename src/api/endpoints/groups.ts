import gitlabClient from '../gitlab'
import { parseTotalHeader } from '../utils'
import type { GitLabGroup, GitLabProject } from '@/types/gitlab'

export async function getGroup(groupId: string | number): Promise<GitLabGroup> {
  const response = await gitlabClient.instance.get<GitLabGroup>(`/groups/${groupId}`, {
    params: { with_projects: false, with_custom_attributes: true },
  })
  return response.data
}

export async function getGroupFull(groupId: string | number): Promise<Record<string, unknown>> {
  const response = await gitlabClient.instance.get(`/groups/${groupId}`, {
    params: { with_projects: false, with_custom_attributes: true },
  })
  return response.data as Record<string, unknown>
}

export async function getGroupProjects(
  groupId: string | number,
  options: {
    page?: number
    perPage?: number
    includeSubgroups?: boolean
    withStatistics?: boolean
    orderBy?: 'id' | 'name' | 'path' | 'created_at' | 'updated_at' | 'last_activity_at'
    sort?: 'asc' | 'desc'
  } = {}
): Promise<{ data: GitLabProject[]; total: number }> {
  const {
    page = 1,
    perPage = 20,
    includeSubgroups = true,
    withStatistics = true,
    orderBy = 'last_activity_at',
    sort = 'desc',
  } = options

  const response = await gitlabClient.instance.get<GitLabProject[]>(`/groups/${groupId}/projects`, {
    params: {
      page,
      per_page: perPage,
      include_subgroups: includeSubgroups,
      with_statistics: withStatistics,
      order_by: orderBy,
      sort,
    },
  })

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getProject(projectId: string | number): Promise<GitLabProject> {
  const response = await gitlabClient.instance.get<GitLabProject>(`/projects/${projectId}`, {
    params: {
      statistics: true,
      with_custom_attributes: true,
      license: true,
    },
  })
  return response.data
}

export async function searchProjects(
  groupId: string | number,
  search: string
): Promise<GitLabProject[]> {
  const response = await gitlabClient.instance.get<GitLabProject[]>(`/groups/${groupId}/projects`, {
    params: {
      search,
      include_subgroups: true,
      per_page: 10,
    },
  })
  return response.data
}
