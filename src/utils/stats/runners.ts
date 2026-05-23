import type { GitLabRunner } from '@/types/gitlab'

export function calculateRunnerStats(runners: GitLabRunner[]) {
  const total = runners.length
  const online = runners.filter((r) => r.status === 'online' && !r.paused).length
  const offline = runners.filter((r) => r.status === 'offline').length
  const paused = runners.filter((r) => r.paused).length
  const stale = runners.filter((r) => r.status === 'stale').length

  const shared = runners.filter((r) => r.is_shared).length
  const group = runners.filter((r) => r.runner_type === 'group_type').length
  const project = runners.filter((r) => r.runner_type === 'project_type').length

  const tags = runners.reduce(
    (acc, runner) => {
      for (const tag of runner.tag_list ?? []) {
        acc[tag] = (acc[tag] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )

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
