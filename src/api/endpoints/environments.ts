import gitlabClient from '../gitlab'
import { fetchAcrossProjects, parseTotalHeader } from '../utils'
import type { GitLabEnvironment } from '@/types/gitlab'

export async function getProjectEnvironments(
  projectId: string | number,
  options: {
    page?: number
    perPage?: number
    name?: string
    search?: string
  } = {}
): Promise<{ data: GitLabEnvironment[]; total: number }> {
  const { page = 1, perPage = 20, name, search } = options

  const response = await gitlabClient.instance.get<GitLabEnvironment[]>(
    `/projects/${projectId}/environments`,
    {
      params: {
        page,
        per_page: perPage,
        name,
        search,
      },
    }
  )

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getAllGroupEnvironments(
  projects: { id: number }[],
  options: {
    perPage?: number
    search?: string
  } = {}
): Promise<GitLabEnvironment[]> {
  const { perPage = 50, search } = options

  return fetchAcrossProjects(projects, (projectId) =>
    getProjectEnvironments(projectId, { perPage, search })
  )
}
