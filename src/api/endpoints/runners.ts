import gitlabClient from '../gitlab'
import type { GitLabRunner } from '@/types/gitlab'

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

  const total = parseInt(response.headers['x-total'] || '0', 10)
  return { data: response.data, total }
}

export async function getAllRunners(): Promise<{ data: GitLabRunner[]; total: number }> {
  const response = await gitlabClient.instance.get<GitLabRunner[]>('/runners/all', {
    params: {
      per_page: 100,
    },
  })

  const total = parseInt(response.headers['x-total'] || '0', 10)
  return { data: response.data, total }
}

export async function getRunner(runnerId: number): Promise<GitLabRunner> {
  const response = await gitlabClient.instance.get<GitLabRunner>(`/runners/${runnerId}`)
  return response.data
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

  const total = parseInt(response.headers['x-total'] || '0', 10)
  return { data: response.data, total }
}

export function calculateRunnerStats(runners: GitLabRunner[]) {
  const total = runners.length
  const online = runners.filter((r) => r.status === 'online' && !r.paused).length
  const offline = runners.filter((r) => r.status === 'offline').length
  const paused = runners.filter((r) => r.paused).length
  const stale = runners.filter((r) => r.status === 'stale').length

  const shared = runners.filter((r) => r.is_shared).length
  const group = runners.filter((r) => r.runner_type === 'group_type').length
  const project = runners.filter((r) => r.runner_type === 'project_type').length

  const tags = runners.reduce((acc, runner) => {
    runner.tag_list.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  return {
    total,
    online,
    offline,
    paused,
    stale,
    shared,
    group,
    project,
    tags: Object.entries(tags)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  }
}
