<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { GitMerge, ExternalLink, Filter, User, GitBranch } from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import { useMetricsStore } from '@/stores/metrics'

const metricsStore = useMetricsStore()

const stateFilter = ref<string>('all')
const projectFilter = ref<string>('all')
const authorFilter = ref<string>('all')
const periodFilter = ref<string>('30')

const stateOptions = [
  { value: 'all', label: 'Todos os status' },
  { value: 'opened', label: 'Abertas' },
  { value: 'merged', label: 'Mergeadas' },
  { value: 'closed', label: 'Fechadas' },
  { value: 'locked', label: 'Bloqueadas' },
]

const periodOptions = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '15', label: 'Últimos 15 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo período' },
]

const projectOptions = computed(() => [
  { value: 'all', label: 'Todos os projetos' },
  ...metricsStore.projects.slice(0, 50).map((project) => ({
    value: String(project.id),
    label: project.name,
  })),
])

const authorOptions = computed(() => {
  const map = new Map<number, string>()
  metricsStore.mergeRequests.forEach((mr) => {
    if (mr.author?.id) {
      map.set(mr.author.id, mr.author.name)
    }
  })

  return [
    { value: 'all', label: 'Todos os autores' },
    ...Array.from(map.entries()).map(([id, name]) => ({
      value: String(id),
      label: name,
    })),
  ]
})

const periodCutoffDate = computed(() => {
  if (periodFilter.value === 'all') return null
  const days = Number(periodFilter.value)
  if (Number.isNaN(days)) return null
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return cutoff
})

const filteredMergeRequests = computed(() => {
  let mergeRequests = metricsStore.mergeRequests

  if (stateFilter.value !== 'all') {
    mergeRequests = mergeRequests.filter((mr) => mr.state === stateFilter.value)
  }

  if (projectFilter.value !== 'all') {
    mergeRequests = mergeRequests.filter((mr) => String(mr.project_id) === projectFilter.value)
  }

  if (authorFilter.value !== 'all') {
    mergeRequests = mergeRequests.filter((mr) => String(mr.author?.id || '') === authorFilter.value)
  }

  if (periodCutoffDate.value) {
    const cutoffTime = periodCutoffDate.value.getTime()
    mergeRequests = mergeRequests.filter((mr) => {
      const createdAt = Date.parse(mr.created_at)
      return !Number.isNaN(createdAt) && createdAt >= cutoffTime
    })
  }

  return [...mergeRequests].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
})

const stats = computed(() => {
  const list = filteredMergeRequests.value
  const total = list.length
  const opened = list.filter((mr) => mr.state === 'opened').length
  const merged = list.filter((mr) => mr.state === 'merged').length
  const closed = list.filter((mr) => mr.state === 'closed' || mr.state === 'locked').length
  const draft = list.filter((mr) => mr.draft).length
  const mergeRate = total > 0 ? Math.round((merged / total) * 100) : 0

  const leadTimes = list
    .filter((mr) => mr.merged_at)
    .map((mr) => {
      const created = new Date(mr.created_at).getTime()
      const mergedAt = new Date(mr.merged_at || '').getTime()
      if (Number.isNaN(created) || Number.isNaN(mergedAt)) return 0
      return Math.max(0, Math.round((mergedAt - created) / 1000))
    })
    .filter((value) => value > 0)

  const avgLeadTimeSec =
    leadTimes.length > 0 ? Math.round(leadTimes.reduce((acc, value) => acc + value, 0) / leadTimes.length) : 0

  return {
    total,
    opened,
    merged,
    closed,
    draft,
    mergeRate,
    avgLeadTimeSec,
  }
})

function getProjectName(projectId: number) {
  const project = metricsStore.projects.find((item) => item.id === projectId)
  return project?.name || `Projeto #${projectId}`
}

function formatTime(date: string) {
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR })
}

function formatDuration(seconds: number) {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function getStateVariant(state: string) {
  if (state === 'merged') return 'success'
  if (state === 'opened') return 'warning'
  if (state === 'closed') return 'destructive'
  return 'outline'
}
</script>

<template>
  <MainLayout title="Merge Requests">
    <div class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Total</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.total }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Abertas</div>
          <div class="mt-1 text-2xl font-bold text-warning">{{ stats.opened }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Mergeadas</div>
          <div class="mt-1 text-2xl font-bold text-success">{{ stats.merged }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Fechadas</div>
          <div class="mt-1 text-2xl font-bold text-destructive">{{ stats.closed }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Drafts</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.draft }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Taxa de merge</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.mergeRate }}%</div>
        </Card>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Lead time médio</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ formatDuration(stats.avgLeadTimeSec) }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Projetos com MRs</div>
          <div class="mt-1 text-2xl font-bold text-foreground">
            {{ new Set(filteredMergeRequests.map((mr) => mr.project_id)).size }}
          </div>
        </Card>
      </div>

      <Card class="p-4">
        <div class="flex flex-wrap items-center gap-4">
          <Filter class="h-5 w-5 text-muted-foreground" />
          <Select v-model="stateFilter" :options="stateOptions" class="w-52" />
          <Select v-model="projectFilter" :options="projectOptions" class="w-64" />
          <Select v-model="authorFilter" :options="authorOptions" class="w-64" />
          <Select v-model="periodFilter" :options="periodOptions" class="w-56" />
        </div>
      </Card>

      <Card>
        <div v-if="metricsStore.isLoading" class="space-y-3 p-4">
          <div v-for="i in 8" :key="i" class="h-14 animate-pulse rounded-lg bg-muted" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">MR</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Projeto</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Autor</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Branches</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Atualizada</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="mr in filteredMergeRequests"
                :key="mr.id"
                class="border-b border-border last:border-0 hover:bg-muted/40"
              >
                <td class="px-4 py-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-foreground">
                      !{{ mr.iid }} - {{ mr.title }}
                    </p>
                    <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <GitMerge class="h-3.5 w-3.5" />
                      {{ mr.draft ? 'Draft' : 'Pronta para merge' }}
                    </p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="getStateVariant(mr.state)">
                    {{ mr.state }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-sm text-foreground">
                  {{ getProjectName(mr.project_id) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  <span class="inline-flex items-center gap-1">
                    <User class="h-4 w-4" />
                    {{ mr.author?.name || '—' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  <div class="flex flex-col gap-1">
                    <span class="inline-flex items-center gap-1">
                      <GitBranch class="h-3.5 w-3.5" />
                      {{ mr.source_branch }}
                    </span>
                    <span class="inline-flex items-center gap-1 text-xs">
                      <GitBranch class="h-3.5 w-3.5" />
                      {{ mr.target_branch }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatTime(mr.updated_at) }}
                </td>
                <td class="px-4 py-3">
                  <a
                    :href="mr.web_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink class="h-4 w-4" />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="!metricsStore.isLoading && filteredMergeRequests.length === 0"
          class="flex h-48 items-center justify-center text-muted-foreground"
        >
          Nenhuma merge request encontrada
        </div>
      </Card>
    </div>
  </MainLayout>
</template>
