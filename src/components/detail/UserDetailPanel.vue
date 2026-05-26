<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format, parseISO, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, ExternalLink, GitCommit, Loader2 } from 'lucide-vue-next'
import {
  getAllUserEvents,
  getAllUserIssues,
  getAllUserMergeRequests,
  getUserFull,
  getUserGraphqlSummary,
  type UserGraphqlSummary,
} from '@/api/endpoints/users'
import { getGroupMember } from '@/api/endpoints/members'
import { getAllUserCommitsAcrossProjects } from '@/api/endpoints/commits'
import { useMetricsStore } from '@/stores/metrics'
import { useDetailClose } from '@/composables/useDetailClose'
import { getAccessLevelLabel } from '@/utils/gitlabAccess'
import { mergeApiRecords } from '@/utils/apiDataDisplay'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'

const route = useRoute()
const router = useRouter()
const metricsStore = useMetricsStore()
useDetailClose()

const loadingLock = ref(false)

const userId = computed(() => Number(route.params.userId))
const CI_COST_PER_MINUTE_USD = Number(import.meta.env.VITE_CI_COST_PER_MINUTE_USD || '0.008')

const member = computed(() =>
  metricsStore.members.find((m) => m.id === userId.value) ?? null
)

const apiPayload = ref<Record<string, unknown>>({})
const userCommits365 = ref(metricsStore.commits)
const userIssues = ref<Record<string, unknown>[]>([])
const userMergeRequests = ref<Record<string, unknown>[]>([])
const userEvents = ref<Record<string, unknown>[]>([])
const userGraphqlSummary = ref<UserGraphqlSummary | null>(null)
const isLoading = ref(false)

const displayName = computed(() => {
  const n = apiPayload.value.name ?? member.value?.name
  return typeof n === 'string' ? n : 'Usuário'
})

const authorCommits = computed(() => {
  const name = displayName.value.trim().toLowerCase()
  const username = String(apiPayload.value.username ?? member.value?.username ?? '').trim().toLowerCase()

  return userCommits365.value
    .filter((c) => {
      const commitName = c.author_name.trim().toLowerCase()
      const commitEmail = c.author_email.trim().toLowerCase()
      return commitName === name || (username && commitEmail.includes(username))
    })
    .sort((a, b) => new Date(b.committed_date).getTime() - new Date(a.committed_date).getTime())
})

const userJobs = computed(() => {
  const id = userId.value
  if (!id || Number.isNaN(id)) return []
  return metricsStore.jobs.filter((job) => job.user?.id === id)
})

const userProjects = computed(() => {
  const map = new Map<number, { id: number; name: string; web_url: string; jobs: number; ciMinutes: number; cost: number; commits: number; mergeRequests: number; issues: number }>()

  for (const project of metricsStore.projects) {
    map.set(project.id, {
      id: project.id,
      name: project.name,
      web_url: project.web_url,
      jobs: 0,
      ciMinutes: 0,
      cost: 0,
      commits: 0,
      mergeRequests: 0,
      issues: 0,
    })
  }

  for (const job of userJobs.value) {
    const projectId = job.pipeline?.project_id
    if (!projectId) continue
    if (!map.has(projectId)) {
      const project = metricsStore.projects.find((p) => p.id === projectId)
      map.set(projectId, {
        id: projectId,
        name: project?.name || `Projeto ${projectId}`,
        web_url: project?.web_url || '',
        jobs: 0,
        ciMinutes: 0,
        cost: 0,
        commits: 0,
        mergeRequests: 0,
        issues: 0,
      })
    }

    const item = map.get(projectId)
    if (!item) continue
    const totalSeconds = (job.duration || 0) + (job.queued_duration || 0)
    const ciMinutes = Math.round(totalSeconds / 60)
    item.jobs += 1
    item.ciMinutes += ciMinutes
    item.cost += ciMinutes * CI_COST_PER_MINUTE_USD
  }

  for (const commit of userCommits365.value) {
    const projectId = commit.project_id
    if (!projectId) continue
    if (!map.has(projectId)) {
      const project = metricsStore.projects.find((p) => p.id === projectId)
      map.set(projectId, {
        id: projectId,
        name: project?.name || `Projeto ${projectId}`,
        web_url: project?.web_url || '',
        jobs: 0,
        ciMinutes: 0,
        cost: 0,
        commits: 0,
        mergeRequests: 0,
        issues: 0,
      })
    }

    const item = map.get(projectId)
    if (item) item.commits += 1
  }

  for (const mergeRequest of userMergeRequests.value) {
    const projectId = Number(mergeRequest.project_id || 0)
    if (!projectId) continue
    if (!map.has(projectId)) {
      const project = metricsStore.projects.find((p) => p.id === projectId)
      map.set(projectId, {
        id: projectId,
        name: project?.name || `Projeto ${projectId}`,
        web_url: project?.web_url || '',
        jobs: 0,
        ciMinutes: 0,
        cost: 0,
        commits: 0,
        mergeRequests: 0,
        issues: 0,
      })
    }

    const item = map.get(projectId)
    if (item) item.mergeRequests += 1
  }

  for (const issue of userIssues.value) {
    const projectId = Number(issue.project_id || 0)
    if (!projectId) continue
    if (!map.has(projectId)) {
      const project = metricsStore.projects.find((p) => p.id === projectId)
      map.set(projectId, {
        id: projectId,
        name: project?.name || `Projeto ${projectId}`,
        web_url: project?.web_url || '',
        jobs: 0,
        ciMinutes: 0,
        cost: 0,
        commits: 0,
        mergeRequests: 0,
        issues: 0,
      })
    }

    const item = map.get(projectId)
    if (item) item.issues += 1
  }

  return Array.from(map.values())
    .filter((item) => item.jobs > 0 || item.commits > 0 || item.mergeRequests > 0 || item.issues > 0)
    .map((item) => ({ ...item, cost: Number(item.cost.toFixed(2)) }))
    .sort((a, b) => (b.commits + b.jobs + b.mergeRequests + b.issues) - (a.commits + a.jobs + a.mergeRequests + a.issues))
})

const userStats = computed(() => {
  const jobs = userJobs.value
  const totalJobs = jobs.length
  const totalRunSeconds = jobs.reduce((acc, j) => acc + (j.duration || 0), 0)
  const totalQueueSeconds = jobs.reduce((acc, j) => acc + (j.queued_duration || 0), 0)
  const totalCiSeconds = totalRunSeconds + totalQueueSeconds
  const totalCiMinutes = Math.round(totalCiSeconds / 60)
  const estimatedCost = Number((totalCiMinutes * CI_COST_PER_MINUTE_USD).toFixed(2))

  const successJobs = jobs.filter((j) => j.status === 'success').length
  const failedJobs = jobs.filter((j) => j.status === 'failed').length
  const runningJobs = jobs.filter((j) => j.status === 'running').length
  const successRate = totalJobs > 0 ? Math.round((successJobs / totalJobs) * 100) : 0

  const commits = userCommits365.value
  const totalCommits = commits.length
  const commitStats = commits.reduce(
    (acc, commit) => {
      acc.additions += commit.stats?.additions || 0
      acc.deletions += commit.stats?.deletions || 0
      acc.totalChanges += commit.stats?.total || 0
      return acc
    },
    { additions: 0, deletions: 0, totalChanges: 0 }
  )

  const issues = userIssues.value
  const openedIssues = issues.filter((issue) => String(issue.state || '') === 'opened').length
  const closedIssues = issues.filter((issue) => String(issue.state || '') === 'closed').length

  const mergeRequests = userMergeRequests.value
  const openedMrs = mergeRequests.filter((mr) => String(mr.state || '') === 'opened').length
  const mergedMrs = mergeRequests.filter((mr) => String(mr.state || '') === 'merged').length
  const closedMrs = mergeRequests.filter((mr) => String(mr.state || '') === 'closed').length

  const wikiEvents = userEvents.value.filter((event) => String(event.target_type || '').toLowerCase() === 'wiki_page').length

  const graphqlSummary = userGraphqlSummary.value

  return {
    totalJobs,
    successJobs,
    failedJobs,
    runningJobs,
    successRate,
    totalRunSeconds,
    totalQueueSeconds,
    totalCiSeconds,
    totalCiMinutes,
    estimatedCost,
    projectsCount: userProjects.value.length,
    totalCommits,
    additions: commitStats.additions,
    deletions: commitStats.deletions,
    totalChanges: commitStats.totalChanges,
    issuesTotal: issues.length,
    openedIssues,
    closedIssues,
    mergeRequestsTotal: mergeRequests.length,
    openedMrs,
    mergedMrs,
    closedMrs,
    wikiEvents,
    contributedProjectsCount: graphqlSummary?.contributedProjectsCount || 0,
    starredProjectsCount: graphqlSummary?.starredProjectsCount || 0,
    assignedMergeRequestsCount: graphqlSummary?.assignedMergeRequestsCount || 0,
    reviewRequestedMergeRequestsCount: graphqlSummary?.reviewRequestedMergeRequestsCount || 0,
    topGroups: graphqlSummary?.topGroups || [],
  }
})

async function load() {
  if (loadingLock.value) return
  if (!userId.value || Number.isNaN(userId.value)) return

  loadingLock.value = true
  isLoading.value = true

  try {
    const sinceDate = subDays(new Date(), 365)
    const since365 = sinceDate.toISOString()

    const [userFull, groupMember] = await Promise.all([
      getUserFull(userId.value).catch(() => ({})),
      metricsStore.groupId
        ? getGroupMember(metricsStore.groupId, userId.value).catch(() => null)
        : Promise.resolve(null),
    ])

    apiPayload.value = mergeApiRecords(
      apiPayload.value,
      member.value,
      userFull,
      groupMember ? { group_membership: groupMember } : undefined
    )

    const email = String((userFull as any).email || apiPayload.value.email || '')
    const username = String((userFull as any).username || member.value?.username || apiPayload.value.username || '')
    const name = String((userFull as any).name || member.value?.name || apiPayload.value.name || '')

    const fallbackCommits = metricsStore.commits
      .filter((commit) => {
        const commitDate = new Date(commit.committed_date)
        if (Number.isNaN(commitDate.getTime()) || commitDate < sinceDate) return false
        const commitEmail = String(commit.author_email || '').toLowerCase()
        const commitName = String(commit.author_name || '').toLowerCase()
        if (email && commitEmail === email.toLowerCase()) return true
        if (username && commitEmail.includes(username.toLowerCase())) return true
        return Boolean(name) && commitName === name.toLowerCase()
      })
      .sort((a, b) => new Date(b.committed_date).getTime() - new Date(a.committed_date).getTime())

    const [commits365, issues, mergeRequests, events, graphqlSummary] = await Promise.all([
      email
        ? getAllUserCommitsAcrossProjects(metricsStore.projects, {
            perPage: 100,
            since: since365,
            authorEmail: email,
          }).catch(() => null)
        : Promise.resolve(null),
      getAllUserIssues(userId.value, { perPage: 100, state: 'all' }).catch(() => null),
      getAllUserMergeRequests(userId.value, { perPage: 100, state: 'all' }).catch(() => null),
      getAllUserEvents(userId.value, { perPage: 100 }).catch(() => null),
      username ? getUserGraphqlSummary(username).catch(() => null) : Promise.resolve(null),
    ])

    if (commits365 && commits365.length >= 0) {
      userCommits365.value = commits365.length ? commits365 : fallbackCommits
    } else if (!userCommits365.value.length && fallbackCommits.length) {
      userCommits365.value = fallbackCommits
    }

    if (issues) {
      userIssues.value = issues
    }

    if (mergeRequests) {
      userMergeRequests.value = mergeRequests
    }

    if (events) {
      userEvents.value = events
    }

    if (graphqlSummary) {
      userGraphqlSummary.value = graphqlSummary
    }
  } finally {
    isLoading.value = false
    loadingLock.value = false
  }
}

function formatJoined(date: string) {
  if (!date) return '-'
  const parsed = parseISO(date)
  if (Number.isNaN(parsed.getTime())) return '-'
  return format(parsed, "dd MMM yyyy", { locale: ptBR })
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function openCommit(commit: { project_id?: number; id: string }) {
  if (!commit.project_id) return
  router.push({
    name: 'CommitDetail',
    params: { projectId: String(commit.project_id), sha: commit.id },
  })
}

onMounted(load)
watch(
    () => route.params.userId,
    async () => {
      await load()
    },
    { immediate: true }
)
</script>

<template>
  <div v-if="isLoading && !Object.keys(apiPayload).length" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else-if="!member && !apiPayload.id" class="py-8 text-center text-muted-foreground">
    <Users class="mx-auto mb-2 h-8 w-8" />
    <p>Usuário não encontrado</p>
  </div>

  <div v-else class="space-y-6">
    <div class="flex items-center gap-4">
      <img
        v-if="typeof apiPayload.avatar_url === 'string'"
        :src="apiPayload.avatar_url"
        :alt="displayName"
        class="h-16 w-16 rounded-full"
      />
      <div
        v-else
        class="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-medium"
      >
        {{ displayName.charAt(0).toUpperCase() }}
      </div>
      <div>
        <h2 class="text-xl font-bold text-foreground">{{ displayName }}</h2>
        <p class="text-muted-foreground">@{{ apiPayload.username ?? member?.username }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <Badge v-if="member || apiPayload.access_level" variant="default">
        {{ getAccessLevelLabel(Number(apiPayload.access_level ?? member?.access_level ?? 0)) }}
      </Badge>
      <Badge
        :variant="(apiPayload.state ?? member?.state) === 'active' ? 'success' : 'destructive'"
      >
        {{ apiPayload.state ?? member?.state }}
      </Badge>
    </div>

    <a
      v-if="typeof (apiPayload.web_url ?? member?.web_url) === 'string'"
      :href="(apiPayload.web_url ?? member?.web_url) as string"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
    >
      <ExternalLink class="h-4 w-4" />
      Perfil no GitLab
    </a>

    <div v-if="member?.created_at || apiPayload.created_at" class="space-y-2 text-sm">
      <div class="flex justify-between text-muted-foreground">
        <span>Membro desde</span>
        <span class="text-foreground">
          {{ formatJoined(String(member?.created_at ?? apiPayload.created_at)) }}
        </span>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Commits (365d)</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ userStats.totalCommits }}</div>
        <p class="mt-1 text-xs text-muted-foreground">Add: {{ userStats.additions }} | Del: {{ userStats.deletions }}</p>
      </Card>
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Projetos em atuação</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ userStats.projectsCount }}</div>
      </Card>
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Tempo total de CI</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ formatDuration(userStats.totalCiSeconds) }}</div>
        <p class="mt-1 text-xs text-muted-foreground">Run: {{ formatDuration(userStats.totalRunSeconds) }} | Fila: {{ formatDuration(userStats.totalQueueSeconds) }}</p>
      </Card>
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Custo estimado</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ formatCurrency(userStats.estimatedCost) }}</div>
        <p class="mt-1 text-xs text-muted-foreground">{{ userStats.totalCiMinutes }} min de CI</p>
      </Card>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Merge Requests</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ userStats.mergeRequestsTotal }}</div>
        <p class="mt-1 text-xs text-muted-foreground">Open {{ userStats.openedMrs }} | Merged {{ userStats.mergedMrs }} | Closed {{ userStats.closedMrs }}</p>
      </Card>
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Issues</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ userStats.issuesTotal }}</div>
        <p class="mt-1 text-xs text-muted-foreground">Open {{ userStats.openedIssues }} | Closed {{ userStats.closedIssues }}</p>
      </Card>
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Projetos com contribuição (GraphQL)</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ userStats.contributedProjectsCount }}</div>
        <p class="mt-1 text-xs text-muted-foreground">Review requests: {{ userStats.reviewRequestedMergeRequestsCount }}</p>
      </Card>
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Projetos favoritos (GraphQL)</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ userStats.starredProjectsCount }}</div>
        <p class="mt-1 text-xs text-muted-foreground">MRs atribuídas: {{ userStats.assignedMergeRequestsCount }}</p>
      </Card>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Wiki events</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ userStats.wikiEvents }}</div>
      </Card>
      <Card class="p-4">
        <div class="text-sm text-muted-foreground">Mudanças de código</div>
        <div class="mt-1 text-2xl font-bold text-foreground">{{ userStats.totalChanges }}</div>
      </Card>
      <Card class="p-4 sm:col-span-2 lg:col-span-2">
        <div class="text-sm text-muted-foreground">Top grupos (GraphQL)</div>
        <div v-if="userStats.topGroups.length" class="mt-2 flex flex-wrap gap-2">
          <Badge v-for="group in userStats.topGroups" :key="group.fullPath || group.name" variant="secondary">
            {{ group.name || group.fullPath }}
          </Badge>
        </div>
        <p v-else class="mt-2 text-xs text-muted-foreground">Sem grupos retornados na consulta GraphQL.</p>
      </Card>
    </div>

    <Card class="p-4">
      <h3 class="mb-3 text-sm font-medium text-foreground">Resumo de jobs</h3>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div class="rounded-lg bg-muted p-3">
          <div class="text-muted-foreground">Total</div>
          <div class="mt-1 text-lg font-semibold text-foreground">{{ userStats.totalJobs }}</div>
        </div>
        <div class="rounded-lg bg-muted p-3">
          <div class="text-muted-foreground">Sucesso</div>
          <div class="mt-1 text-lg font-semibold text-success">{{ userStats.successJobs }} ({{ userStats.successRate }}%)</div>
        </div>
        <div class="rounded-lg bg-muted p-3">
          <div class="text-muted-foreground">Falhas</div>
          <div class="mt-1 text-lg font-semibold text-destructive">{{ userStats.failedJobs }}</div>
        </div>
        <div class="rounded-lg bg-muted p-3">
          <div class="text-muted-foreground">Em execução</div>
          <div class="mt-1 text-lg font-semibold text-primary">{{ userStats.runningJobs }}</div>
        </div>
      </div>
    </Card>

    <Card class="p-4">
      <h3 class="mb-3 text-sm font-medium text-foreground">Projetos em que atua</h3>
      <div v-if="userProjects.length" class="space-y-2">
        <div v-for="project in userProjects" :key="project.id" class="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-foreground">{{ project.name }}</p>
            <p class="text-xs text-muted-foreground">{{ project.commits }} commits · {{ project.jobs }} jobs · {{ project.mergeRequests }} MRs · {{ project.issues }} issues · {{ project.ciMinutes }} min</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-foreground">{{ formatCurrency(project.cost) }}</p>
            <a v-if="project.web_url" :href="project.web_url" target="_blank" rel="noopener noreferrer" class="text-xs text-muted-foreground hover:text-foreground">Abrir projeto</a>
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-muted-foreground">Sem atividades do usuário no período atual.</p>
    </Card>

    <section v-if="authorCommits.length">
      <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <GitCommit class="h-4 w-4" />
        Histórico de commits
      </h3>
      <div class="max-h-96 space-y-2 overflow-auto pr-1">
        <button
          v-for="commit in authorCommits"
          :key="commit.id"
          type="button"
          class="w-full rounded-lg border border-border p-3 text-left hover:bg-muted/40"
          @click="openCommit(commit)"
        >
          <p class="truncate text-sm font-medium">{{ commit.title || commit.message }}</p>
          <p class="text-xs text-muted-foreground">
            {{ commit.short_id }}
            ·
            {{ format(parseISO(commit.committed_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) }}
          </p>
        </button>
      </div>
    </section>
    <Card class="p-4">
      <h3 class="mb-3 text-sm font-medium text-foreground">Merge Requests</h3>
      <div v-if="userMergeRequests.length" class="max-h-72 space-y-2 overflow-auto pr-1">
        <a
          v-for="mr in userMergeRequests.slice(0, 50)"
          :key="String(mr.id)"
          :href="String(mr.web_url || '#')"
          target="_blank"
          rel="noopener noreferrer"
          class="block rounded-lg border border-border px-3 py-2 hover:bg-muted/40"
        >
          <p class="truncate text-sm font-medium text-foreground">{{ String(mr.title || 'Merge Request') }}</p>
          <p class="text-xs text-muted-foreground">{{ String(mr.state || '') }} · {{ String(mr.target_branch || '') }}</p>
        </a>
      </div>
      <p v-else class="text-sm text-muted-foreground">Sem merge requests para este usuário.</p>
    </Card>

    <Card class="p-4">
      <h3 class="mb-3 text-sm font-medium text-foreground">Issues</h3>
      <div v-if="userIssues.length" class="max-h-72 space-y-2 overflow-auto pr-1">
        <a
          v-for="issue in userIssues.slice(0, 50)"
          :key="String(issue.id)"
          :href="String(issue.web_url || '#')"
          target="_blank"
          rel="noopener noreferrer"
          class="block rounded-lg border border-border px-3 py-2 hover:bg-muted/40"
        >
          <p class="truncate text-sm font-medium text-foreground">{{ String(issue.title || 'Issue') }}</p>
          <p class="text-xs text-muted-foreground">{{ String(issue.state || '') }} · </p>
        </a>
      </div>
      <p v-else class="text-sm text-muted-foreground">Sem issues para este usuário.</p>
    </Card>

    <Card class="p-4">
      <h3 class="mb-3 text-sm font-medium text-foreground">Histórico de wiki e eventos</h3>
      <div v-if="userEvents.length" class="max-h-72 space-y-2 overflow-auto pr-1">
        <div
          v-for="event in userEvents.slice(0, 80)"
          :key="String(event.id)"
          class="rounded-lg border border-border px-3 py-2"
        >
          <p class="text-sm font-medium text-foreground">{{ String(event.action_name || 'evento') }}</p>
          <p class="text-xs text-muted-foreground">{{ String(event.target_type || '-') }} · {{ String(event.created_at || '-') }}</p>
        </div>
      </div>
      <p v-else class="text-sm text-muted-foreground">Sem eventos para este usuário.</p>
    </Card>

  </div>
</template>
