import gitlabClient from '../gitlab'
import { fetchAcrossProjects, parseTotalHeader } from '../utils'
import type { GitLabDeployment } from '@/types/gitlab'

export async function getProjectDeployments(
  projectId: string | number,
  options: {
    page?: number
    perPage?: number
    updatedAfter?: string
    updatedBefore?: string
    orderBy?: 'created_at' | 'updated_at'
    sort?: 'asc' | 'desc'
  } = {}
): Promise<{ data: GitLabDeployment[]; total: number }> {
  const {
    page = 1,
    perPage = 20,
    updatedAfter,
    updatedBefore,
    orderBy = 'updated_at',
    sort = 'desc',
  } = options

  const response = await gitlabClient.instance.get<GitLabDeployment[]>(
    `/projects/${projectId}/deployments`,
    {
      params: {
        page,
        per_page: perPage,
        updated_after: updatedAfter,
        updated_before: updatedBefore,
        order_by: orderBy,
        sort,
      },
    }
  )

  return {
    data: response.data.map((deployment) => ({ ...deployment, project_id: Number(projectId) })),
    total: parseTotalHeader(response.headers),
  }
}

export async function getAllGroupDeployments(
  projects: { id: number }[],
  options: {
    perPage?: number
    updatedAfter?: string
    updatedBefore?: string
  } = {}
): Promise<GitLabDeployment[]> {
  const { perPage = 50, updatedAfter, updatedBefore } = options

  return fetchAcrossProjects(projects, (projectId) =>
    getProjectDeployments(projectId, { perPage, updatedAfter, updatedBefore })
  )
}
