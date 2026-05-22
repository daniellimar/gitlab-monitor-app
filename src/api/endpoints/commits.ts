import gitlabClient from '../gitlab'
import type { GitLabCommit } from '@/types/gitlab'
import { format, subDays, parseISO } from 'date-fns'

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

  const total = parseInt(response.headers['x-total'] || '0', 10)
  return { data: response.data, total }
}

export async function getCommit(
  projectId: string | number,
  sha: string
): Promise<GitLabCommit> {
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

export async function getAllGroupCommits(
  projects: { id: number }[],
  options: {
    perPage?: number
    since?: string
  } = {}
): Promise<GitLabCommit[]> {
  const { perPage = 50, since } = options

  const commitsPromises = projects.slice(0, 20).map((project) =>
    getProjectCommits(project.id, { perPage, since }).catch(() => ({ data: [], total: 0 }))
  )

  const results = await Promise.all(commitsPromises)
  return results.flatMap((r) => r.data)
}

export function calculateCommitStats(commits: GitLabCommit[]) {
  const total = commits.length
  
  // Group by author
  const byAuthor = commits.reduce((acc, commit) => {
    const author = commit.author_name
    if (!acc[author]) {
      acc[author] = 0
    }
    acc[author]++
    return acc
  }, {} as Record<string, number>)

  const authors = Object.entries(byAuthor)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Group by date (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i)
    return format(date, 'yyyy-MM-dd')
  })

  const byDate = commits.reduce((acc, commit) => {
    const date = format(parseISO(commit.committed_date), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = { count: 0, authors: new Set<string>() }
    }
    acc[date].count++
    acc[date].authors.add(commit.author_name)
    return acc
  }, {} as Record<string, { count: number; authors: Set<string> }>)

  const activity = last30Days.map((date) => ({
    date,
    count: byDate[date]?.count || 0,
    authors: byDate[date] ? Array.from(byDate[date].authors) : [],
  }))

  // Today's commits
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayCommits = byDate[today]?.count || 0

  return {
    total,
    authors,
    activity,
    todayCommits,
    uniqueAuthors: authors.length,
  }
}
