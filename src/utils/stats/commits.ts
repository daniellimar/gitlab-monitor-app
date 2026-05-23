import { format, subDays, parseISO } from 'date-fns'
import type { GitLabCommit } from '@/types/gitlab'
import type { CommitPeriodDays } from '@/constants/periods'

export function calculateCommitStats(commits: GitLabCommit[], periodDays: CommitPeriodDays = 30) {
  const total = commits.length

  const byAuthor = commits.reduce(
    (acc, commit) => {
      const author = commit.author_name
      acc[author] = (acc[author] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const authors = Object.entries(byAuthor)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const periodDates = Array.from({ length: periodDays }, (_, i) => {
    const date = subDays(new Date(), periodDays - 1 - i)
    return format(date, 'yyyy-MM-dd')
  })

  const byDate = commits.reduce(
    (acc, commit) => {
      const date = format(parseISO(commit.committed_date), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = { count: 0, authors: new Set<string>() }
      }
      acc[date].count++
      acc[date].authors.add(commit.author_name)
      return acc
    },
    {} as Record<string, { count: number; authors: Set<string> }>
  )

  const activity = periodDates.map((date) => ({
    date,
    count: byDate[date]?.count || 0,
    authors: byDate[date] ? Array.from(byDate[date].authors) : [],
  }))

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayCommits = byDate[today]?.count || 0

  return {
    total,
    authors,
    activity,
    todayCommits,
    uniqueAuthors: authors.length,
    periodDays,
    avgPerDay: periodDays > 0 ? Math.round((total / periodDays) * 10) / 10 : 0,
  }
}
