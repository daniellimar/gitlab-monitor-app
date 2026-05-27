<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Search,
  Activity,
  Clock3,
  RefreshCw,
  FolderGit2,
  ExternalLink,
  Star,
  GitFork,
  AlertCircle,
  ArrowLeft,
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import Select from '@/components/ui/Select.vue'
import Badge from '@/components/ui/Badge.vue'
import Spinner from '@/components/ui/Spinner.vue'
import ApiDataExplorer from '@/components/detail/ApiDataExplorer.vue'
import {
  getUserFull,
  getUserGraphqlSummary,
  getUserProjects,
  getUserRecentEvents,
  searchUsersByUsername,
} from '@/api/endpoints/users'
import { getProjectByPath, getProjectFull, getProjectLanguages, searchProjects } from '@/api/endpoints/projects'

type SearchMode = 'auto' | 'user' | 'project'
type ScreenMode = 'query' | 'user' | 'project'
type ProjectBackTarget = 'query' | 'user'
type RecentQuery = {
  value: string
  mode: SearchMode
  timestamp: string
}

const RECENT_QUERIES_KEY = 'home_recent_queries_v1'
const RECENT_QUERIES_LIMIT = 8

const query = ref('')
const searchMode = ref<SearchMode>('auto')
const screenMode = ref<ScreenMode>('query')
const projectBackTarget = ref<ProjectBackTarget>('query')
const recentQueries = ref<RecentQuery[]>([])
const isLoading = ref(false)
const error = ref('')

const user = ref<Record<string, unknown> | null>(null)
const userProjects = ref<Record<string, unknown>[]>([])
const userEvents = ref<Record<string, unknown>[]>([])
const userSummary = ref<{
  contributedProjectsCount: number
  mergeRequestsCount: number
  assignedMergeRequestsCount: number
  reviewRequestedMergeRequestsCount: number
  starredProjectsCount: number
  topGroups: Array<{ fullPath: string; name: string }>
} | null>(null)

const project = ref<Record<string, unknown> | null>(null)
const projectLanguages = ref<Record<string, number>>({})

const modeOptions = [
  { value: 'auto', label: 'Auto: usuário ou repositório' },
  { value: 'user', label: 'Usuário GitLab' },
  { value: 'project', label: 'Repositório GitLab' },
]

const userLanguageStats = computed(() => {
  const counter: Record<string, number> = {}
  for (const repo of userProjects.value) {
    const lang = String(repo.language || '').trim()
    if (!lang) continue
    counter[lang] = (counter[lang] || 0) + 1
  }
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
})

const userStats = computed(() => {
  const stars = userProjects.value.reduce((sum, repo) => sum + Number(repo.star_count || 0), 0)
  const forks = userProjects.value.reduce((sum, repo) => sum + Number(repo.forks_count || 0), 0)
  const openIssues = userProjects.value.reduce((sum, repo) => sum + Number(repo.open_issues_count || 0), 0)
  return {
    projects: userProjects.value.length,
    stars,
    forks,
    openIssues,
  }
})

const projectLanguagesSorted = computed(() => {
  return Object.entries(projectLanguages.value).sort((a, b) => b[1] - a[1])
})

const projectTopics = computed(() => {
  if (!project.value) return []
  const topics = project.value.topics
  if (!Array.isArray(topics)) return []
  return topics.map((topic) => String(topic)).filter(Boolean)
})

const projectCommitCount = computed(() => {
  const stats = project.value?.statistics as { commit_count?: number } | undefined
  return Number(stats?.commit_count || 0)
})

const projectRepositorySize = computed(() => {
  const stats = project.value?.statistics as { repository_size?: number } | undefined
  return Number(stats?.repository_size || 0)
})

const projectNamespaceFullPath = computed(() => {
  const namespace = project.value?.namespace as { full_path?: string } | undefined
  return namespace?.full_path || '-'
})

const projectStorageSize = computed(() => {
  const stats = project.value?.statistics as { storage_size?: number } | undefined
  return Number(stats?.storage_size || 0)
})

const projectLicenseName = computed(() => {
  const license = project.value?.license as { name?: string } | undefined
  return license?.name || '-'
})

const projectOwnerUsername = computed(() => {
  const owner = project.value?.owner as { username?: string } | undefined
  return owner?.username || '-'
})

function formatDate(value: unknown) {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatRelativeTime(value: unknown) {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return '-'
  const now = Date.now()
  const diffMs = date.getTime() - now
  const absMs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

  if (absMs >= year) return rtf.format(Math.round(diffMs / year), 'year')
  if (absMs >= month) return rtf.format(Math.round(diffMs / month), 'month')
  if (absMs >= day) return rtf.format(Math.round(diffMs / day), 'day')
  if (absMs >= hour) return rtf.format(Math.round(diffMs / hour), 'hour')
  return rtf.format(Math.round(diffMs / minute), 'minute')
}

function formatNumber(value: unknown) {
  const parsed = Number(value || 0)
  return new Intl.NumberFormat('pt-BR').format(parsed)
}

function formatBytes(value: unknown) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const amount = bytes / 1024 ** power
  return `${amount.toFixed(amount >= 10 || power === 0 ? 0 : 1)} ${units[power]}`
}

function clearDashboards() {
  user.value = null
  userProjects.value = []
  userEvents.value = []
  userSummary.value = null
  project.value = null
  projectLanguages.value = {}
}

function loadRecentQueries() {
  try {
    const raw = localStorage.getItem(RECENT_QUERIES_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as RecentQuery[]
    if (!Array.isArray(parsed)) return
    recentQueries.value = parsed
      .filter((item) => item && typeof item.value === 'string' && typeof item.mode === 'string' && typeof item.timestamp === 'string')
      .slice(0, RECENT_QUERIES_LIMIT)
  } catch {
    recentQueries.value = []
  }
}

function persistRecentQueries() {
  localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(recentQueries.value))
}

function saveRecentQuery(value: string, mode: SearchMode) {
  const normalized = value.trim()
  if (!normalized) return
  const filtered = recentQueries.value.filter(
    (item) => !(item.value.toLowerCase() === normalized.toLowerCase() && item.mode === mode),
  )
  recentQueries.value = [{ value: normalized, mode, timestamp: new Date().toISOString() }, ...filtered].slice(0, RECENT_QUERIES_LIMIT)
  persistRecentQueries()
}

function applyRecentQuery(item: RecentQuery) {
  query.value = item.value
  searchMode.value = item.mode
  submitQuery()
}

function clearRecentQueries() {
  recentQueries.value = []
  localStorage.removeItem(RECENT_QUERIES_KEY)
}

function goToHomeSearch() {
  screenMode.value = 'query'
  error.value = ''
}

function goBackFromProject() {
  if (projectBackTarget.value === 'user' && user.value) {
    screenMode.value = 'user'
    error.value = ''
    return
  }
  goToHomeSearch()
}

loadRecentQueries()

async function openProjectDashboard(repo: Record<string, unknown>) {
  try {
    isLoading.value = true
    error.value = ''

    const repoId = repo.id
    const repoPath = repo.path_with_namespace

    let detail: Record<string, unknown>
    if (repoId) {
      detail = await getProjectFull(String(repoId))
    } else if (repoPath) {
      detail = await getProjectByPath(String(repoPath))
    } else {
      throw new Error('Repositório inválido')
    }

    const projectId = String(detail.id || repoId || '')
    const languages = projectId ? await getProjectLanguages(projectId) : {}

    project.value = detail
    projectLanguages.value = languages
    projectBackTarget.value = user.value ? 'user' : 'query'
    screenMode.value = 'project'
  } catch {
    error.value = 'Não foi possível abrir o dashboard do repositório selecionado.'
  } finally {
    isLoading.value = false
  }
}

async function loadUserDashboard(value: string) {
  const users = await searchUsersByUsername(value)
  const exact = users.find((item) => item.username.toLowerCase() === value.toLowerCase())
  const selected = exact || users[0]

  if (!selected) {
    throw new Error('Usuário não encontrado')
  }

  const [full, projects, events, summary] = await Promise.all([
    getUserFull(selected.id),
    getUserProjects(selected.id),
    getUserRecentEvents(selected.id),
    getUserGraphqlSummary(selected.username),
  ])

  user.value = full
  userProjects.value = projects
  userEvents.value = events
  userSummary.value = summary
  screenMode.value = 'user'
}

async function loadProjectDashboard(value: string) {
  const normalized = value.trim()
  let detail: Record<string, unknown> | null = null

  if (normalized.includes('/')) {
    detail = await getProjectByPath(normalized)
  } else {
    const found = await searchProjects(normalized)
    const exact = found.find((item) => {
      const name = String(item.name || '').toLowerCase()
      const fullPath = String(item.path_with_namespace || '').toLowerCase()
      const queryLower = normalized.toLowerCase()
      return name === queryLower || fullPath === queryLower
    })
    detail = exact || found[0] || null
  }

  if (!detail) {
    throw new Error('Repositório não encontrado')
  }

  const full = await getProjectFull(String(detail.id))
  const languages = await getProjectLanguages(String(detail.id))

  project.value = full
  projectLanguages.value = languages
  projectBackTarget.value = user.value ? 'user' : 'query'
  screenMode.value = 'project'
}

async function submitQuery() {
  const value = query.value.trim()
  if (!value) return

  isLoading.value = true
  error.value = ''
  clearDashboards()

  const selectedMode = searchMode.value

  try {
    if (selectedMode === 'user') {
      await loadUserDashboard(value)
      saveRecentQuery(value, selectedMode)
      return
    }

    if (selectedMode === 'project') {
      await loadProjectDashboard(value)
      saveRecentQuery(value, selectedMode)
      return
    }

    try {
      await loadUserDashboard(value)
      saveRecentQuery(value, selectedMode)
    } catch {
      await loadProjectDashboard(value)
      saveRecentQuery(value, selectedMode)
    }
  } catch {
    error.value = 'Nenhum resultado encontrado. Tente um username GitLab ou caminho do repositório (grupo/projeto).'
    screenMode.value = 'query'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <MainLayout title="Home">
    <div class="space-y-6">
      <div v-if="screenMode === 'query'" class="mx-auto max-w-3xl pt-8 sm:pt-16">
        <Card class="p-5 sm:p-8">
          <div class="mb-6 space-y-3">
            <div class="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              <Activity class="h-3.5 w-3.5" />
              Consulta inteligente GitLab público
            </div>
            <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">
              Pesquise um usuário ou repositório e gere dashboards dinâmicos
            </h2>
            <p class="text-sm text-muted-foreground sm:text-base">
              Informe um username do GitLab ou um caminho de repositório no formato grupo/projeto.
            </p>
          </div>

          <div class="space-y-3">
            <Select v-model="searchMode" :options="modeOptions" />
            <div class="flex flex-col gap-3 sm:flex-row">
              <div class="relative flex-1">
                <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  v-model="query"
                  placeholder="Ex.: gitlab-org ou gitlab-org/gitlab"
                  class="h-11 pl-9"
                  @keyup.enter="submitQuery"
                />
              </div>
              <Button class="h-11 sm:px-6" :loading="isLoading" @click="submitQuery">
                Consultar
              </Button>
            </div>
            <p v-if="error" class="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {{ error }}
            </p>
          </div>

          <div v-if="recentQueries.length > 0" class="mt-6 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-semibold">Consultas recentes</h3>
              <Button variant="outline" size="sm" @click="clearRecentQueries">Limpar</Button>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="item in recentQueries"
                :key="`${item.mode}:${item.value}`"
                class="inline-flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs transition-colors hover:bg-muted/40"
                @click="applyRecentQuery(item)"
              >
                <span class="font-medium">{{ item.value }}</span>
                <Badge variant="outline">{{ item.mode }}</Badge>
                <span class="text-muted-foreground">{{ formatRelativeTime(item.timestamp) }}</span>
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div v-else-if="screenMode === 'user'" class="space-y-6">
        <div class="flex items-center justify-end">
          <Button variant="outline" size="sm" @click="goToHomeSearch">
            <ArrowLeft class="h-4 w-4" />
            Voltar para a página inicial
          </Button>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Repositórios públicos</div>
            <div class="mt-2 text-2xl font-bold">{{ formatNumber(userStats.projects) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Stars somadas</div>
            <div class="mt-2 text-2xl font-bold">{{ formatNumber(userStats.stars) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Forks somados</div>
            <div class="mt-2 text-2xl font-bold">{{ formatNumber(userStats.forks) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Issues abertas</div>
            <div class="mt-2 text-2xl font-bold">{{ formatNumber(userStats.openIssues) }}</div>
          </Card>
        </div>

        <Card class="p-4 sm:p-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <img
              v-if="user?.avatar_url"
              :src="String(user.avatar_url)"
              :alt="String(user.name || user.username || 'Usuário')"
              class="h-20 w-20 rounded-full border border-border"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl font-semibold sm:text-2xl">{{ user?.name || '-' }}</h2>
                <Badge variant="outline">@{{ user?.username || '-' }}</Badge>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">{{ user?.bio || 'Sem bio pública.' }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <Badge variant="muted">Criado em {{ formatDate(user?.created_at) }}</Badge>
                <Badge variant="muted">Último login {{ formatDate(user?.last_sign_in_at) }}</Badge>
                <a
                  v-if="user?.web_url"
                  :href="String(user.web_url)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex"
                >
                  <Badge variant="secondary">
                    Perfil público
                    <ExternalLink class="ml-1 h-3.5 w-3.5" />
                  </Badge>
                </a>
              </div>
            </div>
          </div>
        </Card>

        <div class="grid gap-6 xl:grid-cols-3">
          <Card class="p-4 xl:col-span-2">
            <div class="mb-4 flex items-center gap-2">
              <FolderGit2 class="h-4 w-4 text-primary" />
              <h3 class="font-semibold">Repositórios do usuário</h3>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="repo in userProjects"
                :key="String(repo.id)"
                class="rounded-lg border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
                @click="openProjectDashboard(repo)"
              >
                <p class="truncate font-medium">{{ repo.name }}</p>
                <p class="mt-1 text-xs text-muted-foreground">{{ repo.description || 'Sem descrição' }}</p>
                <div class="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span class="inline-flex items-center gap-1">
                    <Star class="h-3.5 w-3.5" /> {{ formatNumber(repo.star_count) }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <GitFork class="h-3.5 w-3.5" /> {{ formatNumber(repo.forks_count) }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <AlertCircle class="h-3.5 w-3.5" /> {{ formatNumber(repo.open_issues_count) }}
                  </span>
                </div>
              </button>
            </div>
            <p v-if="userProjects.length === 0" class="text-sm text-muted-foreground">Nenhum repositório público retornado.</p>
          </Card>

          <Card class="p-4">
            <h3 class="mb-3 font-semibold">Resumo avançado</h3>
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between"><span>MRs criados</span><strong>{{ formatNumber(userSummary?.mergeRequestsCount || 0) }}</strong></div>
                <div class="flex items-center justify-between"><span>MRs atribuídos</span><strong>{{ formatNumber(userSummary?.assignedMergeRequestsCount || 0) }}</strong></div>
                <div class="flex items-center justify-between"><span>Reviews pendentes</span><strong>{{ formatNumber(userSummary?.reviewRequestedMergeRequestsCount || 0) }}</strong></div>
                <div class="flex items-center justify-between"><span>Projetos contribuídos</span><strong>{{ formatNumber(userSummary?.contributedProjectsCount || 0) }}</strong></div>
                <div class="flex items-center justify-between"><span>Projetos estrelados</span><strong>{{ formatNumber(userSummary?.starredProjectsCount || 0) }}</strong></div>
              </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <Badge v-for="item in userLanguageStats" :key="item[0]" variant="outline">
                {{ item[0] }}: {{ item[1] }}
              </Badge>
            </div>
          </Card>
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
          <Card class="p-4">
            <div class="mb-3 flex items-center gap-2">
              <Clock3 class="h-4 w-4 text-primary" />
              <h3 class="font-semibold">Eventos recentes</h3>
            </div>
            <div class="space-y-2">
              <div v-for="event in userEvents" :key="String(event.id || event.created_at)">
                <div class="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                  <p class="font-medium">{{ event.action_name || 'atividade' }} {{ event.target_type || '' }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatDate(event.created_at) }}</p>
                </div>
              </div>
              <p v-if="userEvents.length === 0" class="text-sm text-muted-foreground">Sem eventos públicos recentes.</p>
            </div>
          </Card>
          <ApiDataExplorer :data="user" title="Todos os dados públicos do usuário" default-open />
        </div>
      </div>

      <div v-else-if="screenMode === 'project'" class="space-y-6">
        <div class="flex items-center justify-end">
          <Button variant="outline" size="sm" @click="goBackFromProject">
            <ArrowLeft class="h-4 w-4" />
            {{ projectBackTarget === 'user' ? 'Voltar para o perfil' : 'Voltar para a página inicial' }}
          </Button>
        </div>
        <Card class="p-4 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate text-xl font-semibold sm:text-2xl">{{ project?.name_with_namespace || project?.path_with_namespace || '-' }}</h2>
              <p class="mt-1 text-sm text-muted-foreground">{{ project?.description || 'Sem descrição pública.' }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{{ project?.visibility || 'unknown' }}</Badge>
                <Badge variant="outline">Branch padrão: {{ project?.default_branch || '-' }}</Badge>
                <Badge v-if="project?.archived" variant="warning">Arquivado</Badge>
                <a
                  v-if="project?.web_url"
                  :href="String(project.web_url)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex"
                >
                  <Badge variant="secondary">
                    Abrir no GitLab
                    <ExternalLink class="ml-1 h-3.5 w-3.5" />
                  </Badge>
                </a>
              </div>
            </div>
            <Button variant="outline" size="sm" :loading="isLoading" @click="openProjectDashboard(project || {})">
              <RefreshCw class="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </Card>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Stars</div>
            <div class="mt-2 text-2xl font-bold">{{ formatNumber(project?.star_count) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Forks</div>
            <div class="mt-2 text-2xl font-bold">{{ formatNumber(project?.forks_count) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Issues abertas</div>
            <div class="mt-2 text-2xl font-bold">{{ formatNumber(project?.open_issues_count) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Commits (estatística)</div>
            <div class="mt-2 text-2xl font-bold">{{ formatNumber(projectCommitCount) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Criado há</div>
            <div class="mt-2 text-lg font-bold">{{ formatRelativeTime(project?.created_at) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Última atividade</div>
            <div class="mt-2 text-lg font-bold">{{ formatRelativeTime(project?.last_activity_at) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Tamanho do repositório</div>
            <div class="mt-2 text-lg font-bold">{{ formatBytes(projectRepositorySize) }}</div>
          </Card>
          <Card class="p-4">
            <div class="text-sm text-muted-foreground">Storage total</div>
            <div class="mt-2 text-lg font-bold">{{ formatBytes(projectStorageSize) }}</div>
          </Card>
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
          <Card class="p-4">
            <h3 class="mb-3 font-semibold">Linguagens</h3>
            <div class="space-y-2">
              <div v-for="item in projectLanguagesSorted" :key="item[0]" class="space-y-1">
                <div class="flex items-center justify-between text-sm">
                  <span>{{ item[0] }}</span>
                  <span class="text-muted-foreground">{{ item[1].toFixed(2) }}%</span>
                </div>
                <div class="h-2 rounded-full bg-muted">
                  <div class="h-2 rounded-full bg-primary" :style="{ width: `${item[1]}%` }" />
                </div>
              </div>
              <p v-if="projectLanguagesSorted.length === 0" class="text-sm text-muted-foreground">Sem dados de linguagem para este projeto.</p>
            </div>
          </Card>

          <Card class="p-4">
            <h3 class="mb-3 font-semibold">Metadados</h3>
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Namespace</span><strong class="truncate">{{ projectNamespaceFullPath }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">ID do projeto</span><strong>{{ formatNumber(project?.id) }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Criado em</span><strong>{{ formatDate(project?.created_at) }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Atualizado em</span><strong>{{ formatDate(project?.updated_at) }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Última atividade</span><strong>{{ formatDate(project?.last_activity_at) }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Branch padrão</span><strong>{{ project?.default_branch || '-' }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Linguagem principal</span><strong>{{ project?.language || '-' }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Visibilidade</span><strong>{{ project?.visibility || '-' }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Licença</span><strong class="truncate">{{ projectLicenseName }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Dono</span><strong>@{{ projectOwnerUsername }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Importação</span><strong>{{ project?.import_status || '-' }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Tamanho repositório</span><strong>{{ formatBytes(projectRepositorySize) }}</strong></div>
              <div class="flex items-center justify-between gap-3"><span class="text-muted-foreground">Storage total</span><strong>{{ formatBytes(projectStorageSize) }}</strong></div>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <Badge v-for="topic in projectTopics" :key="topic" variant="muted">{{ topic }}</Badge>
            </div>
          </Card>
        </div>

        <ApiDataExplorer :data="project" title="Todos os dados públicos do repositório" default-open />
      </div>

      <div v-if="isLoading" class="fixed bottom-4 right-4 z-30">
        <Card class="flex items-center gap-2 px-3 py-2 text-sm">
          <Spinner size="sm" />
          Carregando dados da API...
        </Card>
      </div>
    </div>
  </MainLayout>
</template>
