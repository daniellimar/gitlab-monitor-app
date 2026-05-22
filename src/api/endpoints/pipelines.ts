import gitlabClient from '../gitlab'
import type { GitLabPipeline, PipelineStatus } from '@/types/gitlab'

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

  const total = parseInt(response.headers['x-total'] || '0', 10)
  return { data: response.data, total }
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
  
  const pipelinesPromises = projects.slice(0, 20).map((project) =>
    getProjectPipelines(project.id, {
      perPage,
      status,
      updatedAfter,
    }).catch(() => ({ data: [], total: 0 }))
  )

  const results = await Promise.all(pipelinesPromises)
  return results.flatMap((r) => r.data)
}

export async function getPipelinesByStatus(
  projects: { id: number }[],
  status: PipelineStatus
): Promise<GitLabPipeline[]> {
  return getAllGroupPipelines(projects, { status, perPage: 50 })
}

export function calculatePipelineStats(pipelines: GitLabPipeline[]) {
  const total = pipelines.length
  const success = pipelines.filter((p) => p.status === 'success').length
  const failed = pipelines.filter((p) => p.status === 'failed').length
  const running = pipelines.filter((p) => p.status === 'running').length
  const pending = pipelines.filter((p) => p.status === 'pending').length
  const canceled = pipelines.filter((p) => p.status === 'canceled').length

  const successRate = total > 0 ? Math.round((success / total) * 100) : 0
  
  const avgDuration = pipelines
    .filter((p) => p.duration)
    .reduce((acc, p) => acc + (p.duration || 0), 0) / (pipelines.filter((p) => p.duration).length || 1)

  return {
    total,
    success,
    failed,
    running,
    pending,
    canceled,
    successRate,
    avgDuration: Math.round(avgDuration),
  }
}
