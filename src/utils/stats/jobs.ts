import type { GitLabJob } from '@/types/gitlab'

export function calculateJobStats(jobs: GitLabJob[]) {
  const total = jobs.length
  const success = jobs.filter((j) => j.status === 'success').length
  const failed = jobs.filter((j) => j.status === 'failed').length
  const running = jobs.filter((j) => j.status === 'running').length
  const pending = jobs.filter((j) => j.status === 'pending').length

  const byStage = jobs.reduce(
    (acc, job) => {
      const stage = job.stage || 'unknown'
      if (!acc[stage]) {
        acc[stage] = { count: 0, totalDuration: 0 }
      }
      acc[stage].count++
      acc[stage].totalDuration += job.duration || 0
      return acc
    },
    {} as Record<string, { count: number; totalDuration: number }>
  )

  const stages = Object.entries(byStage).map(([stage, data]) => ({
    stage,
    count: data.count,
    avgDuration: Math.round(data.totalDuration / data.count),
  }))

  const withDuration = jobs.filter((j) => typeof j.duration === 'number')
  const totalDuration = withDuration.reduce((acc, job) => acc + (job.duration || 0), 0)
  const avgDuration = withDuration.length > 0 ? Math.round(totalDuration / withDuration.length) : 0

  return {
    total,
    success,
    failed,
    running,
    pending,
    stages,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    avgDuration,
    totalDuration: Math.round(totalDuration),
  }
}
