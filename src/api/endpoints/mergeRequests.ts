import gitlabClient from '../gitlab'
import { fetchAcrossProjects, parseTotalHeader } from '../utils'
import type { GitLabMergeRequest, MergeRequestState } from '@/types/gitlab'

export async function getProjectMergeRequests(
  projectId: string | number,
  options: {
    page?: number
    perPage?: number
    state?: MergeRequestState | 'all'
    updatedAfter?: string
    updatedBefore?: string
    orderBy?: 'created_at' | 'updated_at' | 'title'
    sort?: 'asc' | 'desc'
  } = {}
): Promise<{ data: GitLabMergeRequest[]; total: number }> {
  const {
    page = 1,
    perPage = 20,
    state = 'all',
    updatedAfter,
    updatedBefore,
    orderBy = 'updated_at',
    sort = 'desc',
  } = options

  const response = await gitlabClient.instance.get<GitLabMergeRequest[]>(
    `/projects/${projectId}/merge_requests`,
    {
      params: {
        page,
        per_page: perPage,
        state,
        updated_after: updatedAfter,
        updated_before: updatedBefore,
        order_by: orderBy,
        sort,
      },
    }
  )

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getAllGroupMergeRequests(
  projects: { id: number }[],
  options: {
    perPage?: number
    state?: MergeRequestState | 'all'
    updatedAfter?: string
    updatedBefore?: string
  } = {}
): Promise<GitLabMergeRequest[]> {
  const { perPage = 50, state = 'all', updatedAfter, updatedBefore } = options

  return fetchAcrossProjects(projects, (projectId) =>
    getProjectMergeRequests(projectId, { perPage, state, updatedAfter, updatedBefore })
  )
}
