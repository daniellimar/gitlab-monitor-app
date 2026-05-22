import gitlabClient from '../gitlab'
import type { GitLabJob, JobStatus } from '@/types/gitlab'

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

  const total = parseInt(response.headers['x-total'] || '0', 10)
  return { data: response.data, total }
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

  const total = parseInt(response.headers['x-total'] || '0', 10)
  return { data: response.data, total }
}

export async function getJob(
  projectId: string | number,
  jobId: number
): Promise<GitLabJob> {
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

  const jobsPromises = projects.slice(0, 20).map((project) =>
    getProjectJobs(project.id, { perPage, scope }).catch(() => ({ data: [], total: 0 }))
  )

  const results = await Promise.all(jobsPromises)
  return results.flatMap((r) => r.data)
}

export function calculateJobStats(jobs: GitLabJob[]) {
  const total = jobs.length
  const success = jobs.filter((j) => j.status === 'success').length
  const failed = jobs.filter((j) => j.status === 'failed').length
  const running = jobs.filter((j) => j.status === 'running').length
  const pending = jobs.filter((j) => j.status === 'pending').length

  const byStage = jobs.reduce(
    (acc, job) => {
      if (!acc[job.stage]) {
        acc[job.stage] = { count: 0, totalDuration: 0 }
      }
      acc[job.stage].count++
      acc[job.stage].totalDuration += job.duration || 0
      return acc
    },
    {} as Record<string, { count: number; totalDuration: number }>
  )

  const stages = Object.entries(byStage).map(([stage, data]) => ({
    stage,
    count: data.count,
    avgDuration: Math.round(data.totalDuration / data.count),
  }))

  return {
    total,
    success,
    failed,
    running,
    pending,
    stages,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
  }
}
