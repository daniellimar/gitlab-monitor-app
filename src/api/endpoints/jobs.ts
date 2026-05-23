import gitlabClient from '../gitlab'
import { fetchAcrossProjects, parseTotalHeader } from '../utils'
import type { GitLabJob, JobStatus } from '@/types/gitlab'

export { calculateJobStats } from '@/utils/stats'

export async function getProjectJobs(
  projectId: string | number,
  options: {
    page?: number
    perPage?: number
    scope?: JobStatus | JobStatus[]
  } = {}
): Promise<{ data: GitLabJob[]; total: number }> {
  const { page = 1, perPage = 20, scope } = options

  const response = await gitlabClient.instance.get<GitLabJob[]>(`/projects/${projectId}/jobs`, {
    params: {
      page,
      per_page: perPage,
      scope: Array.isArray(scope) ? scope : scope ? [scope] : undefined,
    },
  })

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getPipelineJobs(
  projectId: string | number,
  pipelineId: number,
  options: {
    page?: number
    perPage?: number
    scope?: JobStatus | JobStatus[]
    includeRetried?: boolean
  } = {}
): Promise<{ data: GitLabJob[]; total: number }> {
  const { page = 1, perPage = 100, scope, includeRetried = false } = options

  const response = await gitlabClient.instance.get<GitLabJob[]>(
    `/projects/${projectId}/pipelines/${pipelineId}/jobs`,
    {
      params: {
        page,
        per_page: perPage,
        scope: Array.isArray(scope) ? scope : scope ? [scope] : undefined,
        include_retried: includeRetried,
      },
    }
  )

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getJob(projectId: string | number, jobId: number): Promise<GitLabJob> {
  const response = await gitlabClient.instance.get<GitLabJob>(
    `/projects/${projectId}/jobs/${jobId}`
  )
  return response.data
}

export async function getAllGroupJobs(
  projects: { id: number }[],
  options: {
    perPage?: number
    scope?: JobStatus | JobStatus[]
  } = {}
): Promise<GitLabJob[]> {
  const { perPage = 50, scope } = options

  return fetchAcrossProjects(projects, (projectId) =>
    getProjectJobs(projectId, { perPage, scope })
  )
}
