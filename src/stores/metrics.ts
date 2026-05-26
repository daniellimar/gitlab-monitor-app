import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GitLabGroup,
  GitLabProject,
  GitLabPipeline,
  GitLabJob,
  GitLabRunner,
  GitLabCommit,
  GitLabGroupMember,
  DashboardMetrics,
} from '@/types/gitlab'
import { getGroup, getGroupProjects } from '@/api/endpoints/groups'
import { getAllGroupPipelines } from '@/api/endpoints/pipelines'
import { getAllGroupJobs } from '@/api/endpoints/jobs'
import { getGroupRunners, getRunners } from '@/api/endpoints/runners'
import { getAllGroupCommits } from '@/api/endpoints/commits'
import { getAllGroupMembers } from '@/api/endpoints/members'
import {
  calculatePipelineStats,
  calculateJobStats,
  calculateRunnerStats,
  calculateCommitStats,
} from '@/utils/stats'
import { normalizeRunners } from '@/utils/normalize/runner'
import {
  DEFAULT_COMMIT_PERIOD_DAYS,
  parseCommitPeriodDays,
  type CommitPeriodDays,
} from '@/constants/periods'
import { format, subDays } from 'date-fns'

const CI_COST_PER_MINUTE_USD = Number(import.meta.env.VITE_CI_COST_PER_MINUTE_USD || '0.008')

const GROUP_ID_STORAGE_KEY = 'gitlab_monitor_group_id'
const COMMIT_PERIOD_STORAGE_KEY = 'gitlab_monitor_commit_period_days'

function resolveInitialGroupId(): string {
  const fromEnv = import.meta.env.VITE_GITLAB_GROUP_ID
  if (fromEnv) return fromEnv

  try {
    return localStorage.getItem(GROUP_ID_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function resolveInitialCommitPeriod(): CommitPeriodDays {
  try {
    const stored = localStorage.getItem(COMMIT_PERIOD_STORAGE_KEY)
    if (stored) return parseCommitPeriodDays(stored)
  } catch {
    // ignore
  }
  return DEFAULT_COMMIT_PERIOD_DAYS
}

export const useMetricsStore = defineStore('metrics', () => {
  const group = ref<GitLabGroup | null>(null)
  const projects = ref<GitLabProject[]>([])
  const pipelines = ref<GitLabPipeline[]>([])
  const jobs = ref<GitLabJob[]>([])
  const runners = ref<GitLabRunner[]>([])
  const commits = ref<GitLabCommit[]>([])
  const members = ref<GitLabGroupMember[]>([])

  const isLoading = ref(false)
  const isLoadingCommits = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)

  const groupId = ref<string>(resolveInitialGroupId())
  const refreshInterval = ref<number>(60000)
  const commitPeriodDays = ref<CommitPeriodDays>(resolveInitialCommitPeriod())

  const pipelineStats = computed(() => calculatePipelineStats(pipelines.value))
  const jobStats = computed(() => calculateJobStats(jobs.value))
  const runnerStats = computed(() => calculateRunnerStats(runners.value))
  const commitStats = computed(() =>
    calculateCommitStats(commits.value, commitPeriodDays.value)
  )

  const dashboardMetrics = computed<DashboardMetrics>(() => {
    const totalCiSeconds =
      (pipelineStats.value.totalDuration || 0) +
      (jobStats.value.totalDuration || 0) +
      (pipelineStats.value.totalQueuedDuration || 0)
    const totalCiMinutes = Math.round(totalCiSeconds / 60)
    const estimatedCiCost = Number((totalCiMinutes * CI_COST_PER_MINUTE_USD).toFixed(2))

    return {
      totalPipelines: pipelineStats.value.total,
      successRate: pipelineStats.value.successRate,
      failedPipelines: pipelineStats.value.failed,
      runningPipelines: pipelineStats.value.running,
      totalJobs: jobStats.value.total,
      runnersOnline: runnerStats.value.online,
      runnersOffline: runnerStats.value.offline,
      totalCommitsToday: commitStats.value.todayCommits,
      totalProjects: projects.value.length,
      avgPipelineDurationSec: pipelineStats.value.avgDuration || 0,
      avgPipelineQueueDurationSec: pipelineStats.value.avgQueuedDuration || 0,
      avgJobDurationSec: jobStats.value.avgDuration || 0,
      totalCiMinutes,
      estimatedCiCost,
    }
  })

  async function loadGroup() {
    if (!groupId.value) {
      error.value = 'ID do grupo não configurado'
      return
    }

    try {
      group.value = await getGroup(groupId.value)
    } catch (err) {
      console.error('Failed to load group:', err)
      error.value = 'Falha ao carregar informações do grupo'
    }
  }

  async function loadProjects() {
    if (!groupId.value) return

    try {
      const result = await getGroupProjects(groupId.value, {
        perPage: 100,
        includeSubgroups: true,
        withStatistics: true,
      })
      projects.value = result.data
    } catch (err) {
      console.error('Failed to load projects:', err)
      error.value = 'Falha ao carregar projetos'
    }
  }

  async function loadPipelines() {
    if (projects.value.length === 0) return

    try {
      const since = format(subDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm:ss'Z'")
      pipelines.value = await getAllGroupPipelines(projects.value, {
        perPage: 100,
        updatedAfter: since,
      })
    } catch (err) {
      console.error('Failed to load pipelines:', err)
    }
  }

  async function loadJobs() {
    if (projects.value.length === 0) return

    try {
      jobs.value = await getAllGroupJobs(projects.value, {
        perPage: 50,
      })
    } catch (err) {
      console.error('Failed to load jobs:', err)
    }
  }

  async function loadRunners() {
    try {
      if (groupId.value) {
        const result = await getGroupRunners(groupId.value)
        runners.value = normalizeRunners(result.data)
      } else {
        const result = await getRunners()
        runners.value = normalizeRunners(result.data)
      }
    } catch (err) {
      try {
        const result = await getRunners()
        runners.value = normalizeRunners(result.data)
      } catch {
        console.error('Failed to load runners:', err)
      }
    }
  }

  async function loadCommits() {
    if (projects.value.length === 0) return

    isLoadingCommits.value = true
    try {
      const since = format(
        subDays(new Date(), commitPeriodDays.value),
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      )
      commits.value = await getAllGroupCommits(projects.value, {
        perPage: 100,
        since,
      })
    } catch (err) {
      console.error('Failed to load commits:', err)
    } finally {
      isLoadingCommits.value = false
    }
  }

  async function loadMembers() {
    try {
      members.value = await getAllGroupMembers()
    } catch (err) {
      console.error('Failed to load members:', err)
    }
  }

  async function loadAllMetrics() {
    if (!groupId.value) {
      error.value = 'ID do grupo não configurado'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      await loadGroup()
      await loadProjects()

      await Promise.all([
        loadPipelines(),
        loadJobs(),
        loadRunners(),
        loadCommits(),
        loadMembers(),
      ])

      lastUpdated.value = new Date()
    } catch (err) {
      error.value = 'Falha ao carregar métricas'
      console.error('Failed to load metrics:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function refreshMetrics() {
    if (isLoading.value) return
    await loadAllMetrics()
  }

  async function setCommitPeriodDays(days: CommitPeriodDays) {
    commitPeriodDays.value = days
    try {
      localStorage.setItem(COMMIT_PERIOD_STORAGE_KEY, String(days))
    } catch {
      // ignore
    }
    if (projects.value.length > 0) {
      await loadCommits()
    }
  }

  function setGroupId(id: string) {
    groupId.value = id
    try {
      if (id) {
        localStorage.setItem(GROUP_ID_STORAGE_KEY, id)
      } else {
        localStorage.removeItem(GROUP_ID_STORAGE_KEY)
      }
    } catch {
      // ignore
    }
    group.value = null
    projects.value = []
    pipelines.value = []
    jobs.value = []
    runners.value = []
    commits.value = []
    members.value = []
  }

  function setRefreshInterval(interval: number) {
    refreshInterval.value = interval
  }

  return {
    group,
    projects,
    pipelines,
    jobs,
    runners,
    commits,
    members,
    isLoading,
    isLoadingCommits,
    error,
    lastUpdated,
    groupId,
    refreshInterval,
    commitPeriodDays,
    pipelineStats,
    jobStats,
    runnerStats,
    commitStats,
    dashboardMetrics,
    loadGroup,
    loadProjects,
    loadPipelines,
    loadJobs,
    loadRunners,
    loadCommits,
    loadMembers,
    loadAllMetrics,
    refreshMetrics,
    setCommitPeriodDays,
    setGroupId,
    setRefreshInterval,
  }
})
