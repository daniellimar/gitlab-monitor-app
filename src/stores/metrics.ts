import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  GitLabGroup,
  GitLabProject,
  GitLabPipeline,
  GitLabJob,
  GitLabRunner,
  GitLabCommit,
  DashboardMetrics,
} from '@/types/gitlab'
import { getGroup, getGroupProjects } from '@/api/endpoints/groups'
import { getAllGroupPipelines, calculatePipelineStats } from '@/api/endpoints/pipelines'
import { getAllGroupJobs, calculateJobStats } from '@/api/endpoints/jobs'
import { getGroupRunners, calculateRunnerStats, getRunners } from '@/api/endpoints/runners'
import { getAllGroupCommits, calculateCommitStats } from '@/api/endpoints/commits'
import { format, subDays } from 'date-fns'

export const useMetricsStore = defineStore('metrics', () => {
  // State
  const group = ref<GitLabGroup | null>(null)
  const projects = ref<GitLabProject[]>([])
  const pipelines = ref<GitLabPipeline[]>([])
  const jobs = ref<GitLabJob[]>([])
  const runners = ref<GitLabRunner[]>([])
  const commits = ref<GitLabCommit[]>([])
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)
  
  // Config
  const groupId = ref<string>(import.meta.env.VITE_GITLAB_GROUP_ID || '')
  const refreshInterval = ref<number>(60000) // 1 minute default

  // Computed Stats
  const pipelineStats = computed(() => calculatePipelineStats(pipelines.value))
  const jobStats = computed(() => calculateJobStats(jobs.value))
  const runnerStats = computed(() => calculateRunnerStats(runners.value))
  const commitStats = computed(() => calculateCommitStats(commits.value))

  const dashboardMetrics = computed<DashboardMetrics>(() => ({
    totalPipelines: pipelineStats.value.total,
    successRate: pipelineStats.value.successRate,
    failedPipelines: pipelineStats.value.failed,
    runningPipelines: pipelineStats.value.running,
    totalJobs: jobStats.value.total,
    runnersOnline: runnerStats.value.online,
    runnersOffline: runnerStats.value.offline,
    totalCommitsToday: commitStats.value.todayCommits,
    totalProjects: projects.value.length,
  }))

  // Actions
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
      // Try group runners first, fallback to user runners
      if (groupId.value) {
        const result = await getGroupRunners(groupId.value)
        runners.value = result.data
      } else {
        const result = await getRunners()
        runners.value = result.data
      }
    } catch (err) {
      // Fallback to user-accessible runners
      try {
        const result = await getRunners()
        runners.value = result.data
      } catch {
        console.error('Failed to load runners:', err)
      }
    }
  }

  async function loadCommits() {
    if (projects.value.length === 0) return

    try {
      const since = format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ss'Z'")
      commits.value = await getAllGroupCommits(projects.value, {
        perPage: 100,
        since,
      })
    } catch (err) {
      console.error('Failed to load commits:', err)
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
      
      // Load in parallel after projects are loaded
      await Promise.all([
        loadPipelines(),
        loadJobs(),
        loadRunners(),
        loadCommits(),
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

  function setGroupId(id: string) {
    groupId.value = id
    // Clear existing data
    group.value = null
    projects.value = []
    pipelines.value = []
    jobs.value = []
    runners.value = []
    commits.value = []
  }

  function setRefreshInterval(interval: number) {
    refreshInterval.value = interval
  }

  return {
    // State
    group,
    projects,
    pipelines,
    jobs,
    runners,
    commits,
    isLoading,
    error,
    lastUpdated,
    groupId,
    refreshInterval,
    // Computed
    pipelineStats,
    jobStats,
    runnerStats,
    commitStats,
    dashboardMetrics,
    // Actions
    loadGroup,
    loadProjects,
    loadPipelines,
    loadJobs,
    loadRunners,
    loadCommits,
    loadAllMetrics,
    refreshMetrics,
    setGroupId,
    setRefreshInterval,
  }
})
