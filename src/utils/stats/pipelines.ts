import type { GitLabPipeline } from '@/types/gitlab'

export function calculatePipelineStats(pipelines: GitLabPipeline[]) {
  const total = pipelines.length
  const success = pipelines.filter((p) => p.status === 'success').length
  const failed = pipelines.filter((p) => p.status === 'failed').length
  const running = pipelines.filter((p) => p.status === 'running').length
  const pending = pipelines.filter((p) => p.status === 'pending').length
  const canceled = pipelines.filter((p) => p.status === 'canceled').length

  const successRate = total > 0 ? Math.round((success / total) * 100) : 0

  const withDuration = pipelines.filter((p) => p.duration)
  const avgDuration =
    withDuration.reduce((acc, p) => acc + (p.duration || 0), 0) / (withDuration.length || 1)

  const totalDuration = withDuration.reduce((acc, p) => acc + (p.duration || 0), 0)
  const totalQueuedDuration = pipelines.reduce((acc, p) => acc + (p.queued_duration || 0), 0)
  const withQueuedDuration = pipelines.filter((p) => typeof p.queued_duration === 'number')
  const avgQueuedDuration =
    withQueuedDuration.length > 0
      ? Math.round(totalQueuedDuration / withQueuedDuration.length)
      : 0

  return {
    total,
    success,
    failed,
    running,
    pending,
    canceled,
    successRate,
    avgDuration: Math.round(avgDuration),
    avgQueuedDuration,
    totalDuration: Math.round(totalDuration),
    totalQueuedDuration: Math.round(totalQueuedDuration),
  }
}
