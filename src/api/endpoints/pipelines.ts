import gitlabClient from '../gitlab'
import { fetchAcrossProjects, parseTotalHeader } from '../utils'
import type { GitLabPipeline, PipelineStatus } from '@/types/gitlab'

export { calculatePipelineStats } from '@/utils/stats'

export async function getProjectPipelines(
  projectId: string | number,
  options: {
    page?: number
    perPage?: number
    ref?: string
    status?: PipelineStatus
    source?: string
    updatedAfter?: string
    updatedBefore?: string
    orderBy?: 'id' | 'status' | 'ref' | 'updated_at' | 'user_id'
    sort?: 'asc' | 'desc'
  } = {}
): Promise<{ data: GitLabPipeline[]; total: number }> {
  const {
    page = 1,
    perPage = 20,
    ref,
    status,
    source,
    updatedAfter,
    updatedBefore,
    orderBy = 'updated_at',
    sort = 'desc',
  } = options

  const response = await gitlabClient.instance.get<GitLabPipeline[]>(
    `/projects/${projectId}/pipelines`,
    {
      params: {
        page,
        per_page: perPage,
        ref,
        status,
        source,
        updated_after: updatedAfter,
        updated_before: updatedBefore,
        order_by: orderBy,
        sort,
      },
    }
  )

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getPipeline(
  projectId: string | number,
  pipelineId: number
): Promise<GitLabPipeline> {
  const response = await gitlabClient.instance.get<GitLabPipeline>(
    `/projects/${projectId}/pipelines/${pipelineId}`
  )
  return response.data
}

export async function getAllGroupPipelines(
  projects: { id: number }[],
  options: {
    perPage?: number
    status?: PipelineStatus
    updatedAfter?: string
  } = {}
): Promise<GitLabPipeline[]> {
  const { perPage = 100, status, updatedAfter } = options

  return fetchAcrossProjects(projects, (projectId) =>
    getProjectPipelines(projectId, { perPage, status, updatedAfter })
  )
}

export async function getPipelinesByStatus(
  projects: { id: number }[],
  status: PipelineStatus
): Promise<GitLabPipeline[]> {
  return getAllGroupPipelines(projects, { status, perPage: 50 })
}
