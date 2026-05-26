import gitlabClient from '../gitlab'
import { DEFAULT_PROJECT_BATCH, parseTotalHeader } from '../utils'
import type { GitLabCommit } from '@/types/gitlab'

export { calculateCommitStats } from '@/utils/stats'

export async function getProjectCommits(
  projectId: string | number,
  options: {
    page?: number
    perPage?: number
    refName?: string
    since?: string
    until?: string
    withStats?: boolean
  } = {}
): Promise<{ data: GitLabCommit[]; total: number }> {
  const { page = 1, perPage = 20, refName, since, until, withStats = false } = options

  const response = await gitlabClient.instance.get<GitLabCommit[]>(
    `/projects/${projectId}/repository/commits`,
    {
      params: {
        page,
        per_page: perPage,
        ref_name: refName,
        since,
        until,
        with_stats: withStats,
      },
    }
  )

  return { data: response.data, total: parseTotalHeader(response.headers) }
}

export async function getCommit(projectId: string | number, sha: string): Promise<GitLabCommit> {
  const response = await gitlabClient.instance.get<GitLabCommit>(
    `/projects/${projectId}/repository/commits/${sha}`,
    {
      params: {
        stats: true,
      },
    }
  )
  return response.data
}

export async function getCommitFull(
  projectId: string | number,
  sha: string
): Promise<Record<string, unknown>> {
  const response = await gitlabClient.instance.get(
    `/projects/${projectId}/repository/commits/${sha}`,
    { params: { stats: true } }
  )
  return response.data as Record<string, unknown>
}

/** Diff stats por arquivo (quando disponível). */
export async function getCommitDiff(
  projectId: string | number,
  sha: string
): Promise<Record<string, unknown>[]> {
  const response = await gitlabClient.instance.get(
    `/projects/${projectId}/repository/commits/${sha}/diff`,
    { params: { unidiff: true } }
  )
  return response.data as Record<string, unknown>[]
}

export async function getAllGroupCommits(
  projects: { id: number }[],
  options: {
    perPage?: number
    since?: string
    withStats?: boolean
  } = {}
): Promise<GitLabCommit[]> {
  const { perPage = 100, since, withStats = false } = options

  const results = await Promise.all(
    projects.slice(0, DEFAULT_PROJECT_BATCH).map(async (project) => {
      try {
        const { data } = await getProjectCommits(project.id, { perPage, since, withStats })
        return data.map((commit) => ({ ...commit, project_id: project.id }))
      } catch {
        return [] as GitLabCommit[]
      }
    })
  )

  return results.flat()
}

export async function getAllUserCommitsAcrossProjects(
  projects: { id: number }[],
  options: {
    perPage?: number
    since?: string
    until?: string
    authorName?: string
    authorEmail?: string
  } = {}
): Promise<GitLabCommit[]> {
  const { perPage = 100, since, until, authorName, authorEmail } = options
  const normalizedName = (authorName || '').trim().toLowerCase()
  const normalizedEmail = (authorEmail || '').trim().toLowerCase()

  const allCommits = await Promise.all(
    projects.map(async (project) => {
      try {
        const commits: GitLabCommit[] = []
        let page = 1

        while (true) {
          const { data } = await getProjectCommits(project.id, {
            page,
            perPage,
            since,
            until,
            withStats: true,
          })

          if (data.length === 0) break

          const filtered = data.filter((commit) => {
            const commitName = commit.author_name.trim().toLowerCase()
            const commitEmail = commit.author_email.trim().toLowerCase()
            return (
              (normalizedName && commitName === normalizedName) ||
              (normalizedEmail && commitEmail === normalizedEmail)
            )
          })

          commits.push(...filtered.map((commit) => ({ ...commit, project_id: project.id })))

          if (data.length < perPage) break
          page += 1
        }

        return commits
      } catch {
        return [] as GitLabCommit[]
      }
    })
  )

  return allCommits.flat()
}
