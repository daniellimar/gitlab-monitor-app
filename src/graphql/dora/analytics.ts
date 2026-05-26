import type { AnalyticsFilters } from '@/graphql/filters/engine'
import type { DoraAnalyticsResult, DoraPoint } from '@/types/graphql'
import type { GitLabCommit, GitLabDeployment, GitLabMergeRequest } from '@/types/gitlab'

export interface DoraAnalyticsInput {
  deployments: GitLabDeployment[]
  commits: GitLabCommit[]
  mergeRequests: GitLabMergeRequest[]
  filters?: AnalyticsFilters
  periodDays: number
  groupBy?: 'project' | 'group'
}

function toTime(value: string | null | undefined): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function average(values: number[]): number {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function buildTrendRange(periodDays: number): string[] {
  const dates: string[] = []
  const now = new Date()
  for (let index = periodDays - 1; index >= 0; index--) {
    const date = new Date(now)
    date.setDate(now.getDate() - index)
    dates.push(date.toISOString().slice(0, 10))
  }
  return dates
}

function deploymentLeadTimes(
  deployments: GitLabDeployment[],
  commitTimeBySha: Record<string, number>
): number[] {
  const samples: number[] = []

  deployments.forEach((deployment) => {
    const deploymentTime = toTime(deployment.created_at)
    const commitTime = commitTimeBySha[deployment.sha]
    if (!deploymentTime || !commitTime || deploymentTime < commitTime) return
    samples.push(Math.round((deploymentTime - commitTime) / 1000))
  })

  return samples
}

function mergeRequestLeadTimes(mergeRequests: GitLabMergeRequest[]): number[] {
  const samples: number[] = []

  mergeRequests.forEach((mergeRequest) => {
    const created = toTime(mergeRequest.created_at)
    const merged = toTime(mergeRequest.merged_at)
    if (!created || !merged || merged < created) return
    samples.push(Math.round((merged - created) / 1000))
  })

  return samples
}

function calculateMttr(deployments: GitLabDeployment[]): number {
  const groups = deployments.reduce(
    (acc, deployment) => {
      const key = String(deployment.project_id || deployment.environment?.id || 'default')
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(deployment)
      return acc
    },
    {} as Record<string, GitLabDeployment[]>
  )

  const samples: number[] = []

  Object.values(groups).forEach((group) => {
    const sorted = [...group].sort((a, b) => {
      const aTime = toTime(a.created_at) || 0
      const bTime = toTime(b.created_at) || 0
      return aTime - bTime
    })

    sorted.forEach((deployment, index) => {
      const currentTime = toTime(deployment.created_at)
      if (deployment.status !== 'failed' || !currentTime) return

      const recovered = sorted.slice(index + 1).find((candidate) => {
        const candidateTime = toTime(candidate.created_at)
        return candidate.status === 'success' && !!candidateTime
      })

      const recoveredTime = toTime(recovered?.created_at)
      if (!recoveredTime) return
      samples.push(Math.round((recoveredTime - currentTime) / 1000))
    })
  })

  return average(samples)
}

function buildTrend(
  deployments: GitLabDeployment[],
  mergeRequests: GitLabMergeRequest[],
  periodDays: number
): DoraPoint[] {
  const range = buildTrendRange(periodDays)

  return range.map((date) => {
    const deploymentsOnDate = deployments.filter((deployment) => deployment.created_at.startsWith(date))
    const mergeRequestsOnDate = mergeRequests.filter((mergeRequest) =>
      mergeRequest.updated_at.startsWith(date)
    )

    const failed = deploymentsOnDate.filter((deployment) => deployment.status === 'failed').length
    const changeFailureRate =
      deploymentsOnDate.length > 0 ? Number(((failed / deploymentsOnDate.length) * 100).toFixed(2)) : 0

    return {
      date,
      deploymentFrequency: deploymentsOnDate.length,
      leadTimeForChangesSec: average(
        mergeRequestsOnDate
          .map((mergeRequest) => {
            const created = toTime(mergeRequest.created_at)
            const merged = toTime(mergeRequest.merged_at)
            if (!created || !merged || merged < created) return 0
            return Math.round((merged - created) / 1000)
          })
          .filter((value) => value > 0)
      ),
      changeFailureRate,
      mttrSec: 0,
    }
  })
}

export function calculateDoraAnalytics(input: DoraAnalyticsInput): DoraAnalyticsResult {
  const commitTimeBySha = input.commits.reduce(
    (acc, commit) => {
      const commitTime = toTime(commit.committed_date)
      if (commitTime) {
        acc[commit.id] = commitTime
      }
      return acc
    },
    {} as Record<string, number>
  )

  const deploymentLead = deploymentLeadTimes(input.deployments, commitTimeBySha)
  const mergeRequestLead = mergeRequestLeadTimes(input.mergeRequests)
  const leadTimeForChangesSec = average(deploymentLead.length ? deploymentLead : mergeRequestLead)

  const failedDeployments = input.deployments.filter((deployment) => deployment.status === 'failed').length
  const changeFailureRate =
    input.deployments.length > 0
      ? Number(((failedDeployments / input.deployments.length) * 100).toFixed(2))
      : 0

  const summary = {
    deploymentFrequency: Number((input.deployments.length / input.periodDays).toFixed(2)),
    leadTimeForChangesSec,
    changeFailureRate,
    mttrSec: calculateMttr(input.deployments),
  }

  return {
    summary,
    trend: buildTrend(input.deployments, input.mergeRequests, input.periodDays),
  }
}
