import { parseISO } from 'date-fns'
import type { GitLabCommit, GitLabDeployment, GitLabMergeRequest } from '@/types/gitlab'

export interface DoraMetrics {
  deploymentFrequencyPerDay: number
  leadTimeForChangesSec: number
  changeFailureRate: number
  meanTimeToRecoverySec: number
}

function toTime(value: string | null | undefined): number | null {
  if (!value) return null
  const time = parseISO(value).getTime()
  return Number.isNaN(time) ? null : time
}

export function calculateDoraMetrics(
  deployments: GitLabDeployment[],
  commits: GitLabCommit[],
  mergeRequests: GitLabMergeRequest[],
  periodDays: number
): DoraMetrics {
  const validDeployments = deployments
    .map((d) => ({ ...d, createdTime: toTime(d.created_at), finishedTime: toTime(d.finished_at) }))
    .filter((d) => d.createdTime !== null)

  const deploymentFrequencyPerDay =
    periodDays > 0 ? Number((validDeployments.length / periodDays).toFixed(2)) : 0

  const commitTimeBySha = commits.reduce(
    (acc, commit) => {
      const committed = toTime(commit.committed_date)
      if (committed !== null) {
        acc[commit.id] = committed
      }
      return acc
    },
    {} as Record<string, number>
  )

  const leadTimeSamples: number[] = []
  for (const deployment of validDeployments) {
    const commitTime = commitTimeBySha[deployment.sha]
    if (commitTime && deployment.createdTime && deployment.createdTime >= commitTime) {
      leadTimeSamples.push(Math.round((deployment.createdTime - commitTime) / 1000))
    }
  }

  if (leadTimeSamples.length === 0) {
    for (const mr of mergeRequests) {
      const created = toTime(mr.created_at)
      const merged = toTime(mr.merged_at)
      if (created && merged && merged >= created) {
        leadTimeSamples.push(Math.round((merged - created) / 1000))
      }
    }
  }

  const leadTimeForChangesSec =
    leadTimeSamples.length > 0
      ? Math.round(leadTimeSamples.reduce((sum, sample) => sum + sample, 0) / leadTimeSamples.length)
      : 0

  const failedDeployments = validDeployments.filter((d) => d.status === 'failed')
  const changeFailureRate =
    validDeployments.length > 0
      ? Number(((failedDeployments.length / validDeployments.length) * 100).toFixed(2))
      : 0

  const deploymentsByEnvironment = validDeployments.reduce(
    (acc, deployment) => {
      const key = String(deployment.environment?.id || deployment.environment?.name || 'unknown')
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(deployment)
      return acc
    },
    {} as Record<string, GitLabDeployment[]>
  )

  const recoverySamples: number[] = []
  for (const envDeployments of Object.values(deploymentsByEnvironment)) {
    const sorted = envDeployments
      .map((d) => ({ ...d, createdTime: toTime(d.created_at) }))
      .filter((d) => d.createdTime !== null)
      .sort((a, b) => (a.createdTime || 0) - (b.createdTime || 0))

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i]
      if (current.status !== 'failed' || !current.createdTime) continue
      const recovered = sorted.slice(i + 1).find((d) => d.status === 'success' && d.createdTime)
      if (recovered?.createdTime) {
        recoverySamples.push(Math.round((recovered.createdTime - current.createdTime) / 1000))
      }
    }
  }

  const meanTimeToRecoverySec =
    recoverySamples.length > 0
      ? Math.round(recoverySamples.reduce((sum, sample) => sum + sample, 0) / recoverySamples.length)
      : 0

  return {
    deploymentFrequencyPerDay,
    leadTimeForChangesSec,
    changeFailureRate,
    meanTimeToRecoverySec,
  }
}
