<script setup lang="ts">
import { computed, ref } from 'vue'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Gauge,
  Clock3,
  AlertTriangle,
  Wrench,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Rocket,
  ExternalLink,
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Select from '@/components/ui/Select.vue'
import { useMetricsStore } from '@/stores/metrics'
import { calculateDoraAnalytics } from '@/graphql/dora/analytics'

const metricsStore = useMetricsStore()

const periodFilter = ref<string>('30')
const projectFilter = ref<string>('all')

const periodOptions = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '14', label: 'Últimos 14 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 6 meses' },
]

const projectOptions = computed(() => [
  { value: 'all', label: 'Todos os projetos' },
  ...metricsStore.projects.slice(0, 50).map((project) => ({
    value: String(project.id),
    label: project.name,
  })),
])

const periodDays = computed(() => Number(periodFilter.value) || 30)

const cutoffDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() - periodDays.value)
  return date
})

const filteredDeployments = computed(() => {
  let list = metricsStore.deployments

  if (projectFilter.value !== 'all') {
    list = list.filter((deployment) => String(deployment.project_id) === projectFilter.value)
  }

  const cutoff = cutoffDate.value.getTime()
  return list.filter((deployment) => {
    const time = Date.parse(deployment.created_at)
    return !Number.isNaN(time) && time >= cutoff
  })
})

const filteredMergeRequests = computed(() => {
  let list = metricsStore.mergeRequests

  if (projectFilter.value !== 'all') {
    list = list.filter((mr) => String(mr.project_id) === projectFilter.value)
  }

  const cutoff = cutoffDate.value.getTime()
  return list.filter((mr) => {
    const time = Date.parse(mr.created_at)
    return !Number.isNaN(time) && time >= cutoff
  })
})

const filteredCommits = computed(() => {
  let list = metricsStore.commits

  if (projectFilter.value !== 'all') {
    const projectId = parseInt(projectFilter.value, 10)
    list = list.filter((commit) => commit.project_id === projectId)
  }

  return list
})

const doraResult = computed(() => {
  return calculateDoraAnalytics({
    deployments: filteredDeployments.value,
    commits: filteredCommits.value,
    mergeRequests: filteredMergeRequests.value,
    periodDays: periodDays.value,
  })
})

const dora = computed(() => doraResult.value.summary)
const trend = computed(() => doraResult.value.trend)

const recentTrend = computed(() => {
  const points = trend.value
  if (points.length < 4) return null
  const half = Math.floor(points.length / 2)
  const earlier = points.slice(0, half)
  const later = points.slice(half)

  const avgEarlier = earlier.reduce((sum, p) => sum + p.deploymentFrequency, 0) / earlier.length
  const avgLater = later.reduce((sum, p) => sum + p.deploymentFrequency, 0) / later.length

  if (avgLater > avgEarlier * 1.05) return 'up'
  if (avgLater < avgEarlier * 0.95) return 'down'
  return 'stable'
})

const chartDates = computed(() =>
  trend.value.map((p) => {
    try {
      return format(parseISO(p.date), 'dd/MM', { locale: ptBR })
    } catch {
      return p.date
    }
  })
)

const deploymentFrequencyData = computed(() => trend.value.map((p) => p.deploymentFrequency))
const leadTimeData = computed(() => trend.value.map((p) => Math.round(p.leadTimeForChangesSec / 3600)))
const changeFailureRateData = computed(() => trend.value.map((p) => p.changeFailureRate))

const deployFrequencyLevel = computed(() => {
  const v = dora.value.deploymentFrequency
  if (v >= 1) return { label: 'Elite', color: 'text-success', bg: 'bg-success/10' }
  if (v >= 1 / 7) return { label: 'Alto', color: 'text-chart-2', bg: 'bg-chart-2/10' }
  if (v >= 1 / 30) return { label: 'Médio', color: 'text-warning', bg: 'bg-warning/10' }
  return { label: 'Baixo', color: 'text-destructive', bg: 'bg-destructive/10' }
})

const leadTimeLevel = computed(() => {
  const hours = dora.value.leadTimeForChangesSec / 3600
  if (hours < 24) return { label: 'Elite', color: 'text-success', bg: 'bg-success/10' }
  if (hours < 24 * 7) return { label: 'Alto', color: 'text-chart-2', bg: 'bg-chart-2/10' }
  if (hours < 24 * 30) return { label: 'Médio', color: 'text-warning', bg: 'bg-warning/10' }
  return { label: 'Baixo', color: 'text-destructive', bg: 'bg-destructive/10' }
})

const failureRateLevel = computed(() => {
  const v = dora.value.changeFailureRate
  if (v <= 5) return { label: 'Elite', color: 'text-success', bg: 'bg-success/10' }
  if (v <= 10) return { label: 'Alto', color: 'text-chart-2', bg: 'bg-chart-2/10' }
  if (v <= 15) return { label: 'Médio', color: 'text-warning', bg: 'bg-warning/10' }
  return { label: 'Baixo', color: 'text-destructive', bg: 'bg-destructive/10' }
})

const mttrLevel = computed(() => {
  const hours = dora.value.mttrSec / 3600
  if (hours < 1) return { label: 'Elite', color: 'text-success', bg: 'bg-success/10' }
  if (hours < 24) return { label: 'Alto', color: 'text-chart-2', bg: 'bg-chart-2/10' }
  if (hours < 24 * 7) return { label: 'Médio', color: 'text-warning', bg: 'bg-warning/10' }
  return { label: 'Baixo', color: 'text-destructive', bg: 'bg-destructive/10' }
})

function formatDuration(seconds: number): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (minutes < 60) return `${minutes}m ${remaining}s`
  const hours = Math.floor(minutes / 60)
  const remainingMin = minutes % 60
  if (hours < 24) return `${hours}h ${remainingMin}m`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
}

function buildSparklinePath(values: number[], width = 200, height = 40): string {
  if (!values.length) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1 || 1)) * width
    const y = height - ((value - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })
  return `M ${points.join(' L ')}`
}

const statsByProject = computed(() => {
  const groups = new Map<string, { id: string; name: string; deployments: number; failed: number; mergeRequests: number }>()

  filteredDeployments.value.forEach((deployment) => {
    const key = String(deployment.project_id || 'unknown')
    const project = metricsStore.projects.find((p) => String(p.id) === key)
    const name = project?.name || `Projeto #${key}`

    const current = groups.get(key) || { id: key, name, deployments: 0, failed: 0, mergeRequests: 0 }
    current.deployments += 1
    if (deployment.status === 'failed') {
      current.failed += 1
    }
    groups.set(key, current)
  })

  filteredMergeRequests.value.forEach((mr) => {
    const key = String(mr.project_id || 'unknown')
    const current = groups.get(key)
    if (current) {
      current.mergeRequests += 1
      groups.set(key, current)
    }
  })

  return Array.from(groups.values())
    .sort((a, b) => b.deployments - a.deployments)
    .slice(0, 10)
})

const totalDeployments = computed(() => filteredDeployments.value.length)
const totalMergedMRs = computed(() => filteredMergeRequests.value.filter((mr) => mr.state === 'merged').length)

type DetailMode = 'deploymentFrequency' | 'leadTime' | 'changeFailureRate' | 'mttr'
const detailMode = ref<DetailMode>('deploymentFrequency')

const detailTitle = computed(() => {
  if (detailMode.value === 'deploymentFrequency') return 'Detalhamento: Deployment Frequency'
  if (detailMode.value === 'leadTime') return 'Detalhamento: Lead Time for Changes'
  if (detailMode.value === 'changeFailureRate') return 'Detalhamento: Change Failure Rate'
  return 'Detalhamento: Mean Time To Recovery'
})

const detailRows: any = computed(() => {
  if (detailMode.value === 'deploymentFrequency') {
    return filteredDeployments.value
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 100)
      .map((deployment) => ({
        id: `dep-${deployment.id}`,
        primary: `Deployment #${deployment.iid || deployment.id}`,
        secondary: deployment.ref || '-',
        value: deployment.status,
        time: deployment.created_at,
      }))
  }

  if (detailMode.value === 'leadTime') {
    return filteredMergeRequests.value
      .filter((mr) => mr.merged_at)
      .slice()
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
      .slice(0, 100)
      .map((mr) => {
        const created = Date.parse(mr.created_at)
        const merged = Date.parse(mr.merged_at || '')
        const seconds = !Number.isNaN(created) && !Number.isNaN(merged) && merged >= created
          ? Math.round((merged - created) / 1000)
          : 0

        return {
          id: `mr-lead-${mr.id}`,
          primary: `!${mr.iid} ${mr.title}`,
          secondary: mr.author?.name || '-',
          value: seconds > 0 ? formatDuration(seconds) : '-',
          time: mr.merged_at || mr.updated_at,
          url: mr.web_url,
        }
      })
  }

  if (detailMode.value === 'changeFailureRate') {
    return filteredDeployments.value
      .slice()
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 100)
      .map((deployment) => ({
        id: `dep-fail-${deployment.id}`,
        primary: `Deployment #${deployment.iid || deployment.id}`,
        secondary: deployment.ref || '-',
        value: deployment.status === 'failed' ? 'failed' : 'success',
        time: deployment.created_at,
      }))
  }

  const failures = filteredDeployments.value
    .filter((deployment) => deployment.status === 'failed')
    .slice()
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 60)

  return failures.map((failed) => {
    const failedAt = Date.parse(failed.created_at)
    const recovery = filteredDeployments.value
      .filter((candidate) => candidate.project_id === failed.project_id && candidate.status === 'success')
      .find((candidate) => Date.parse(candidate.created_at) > failedAt)

    const recoveryAt = recovery ? Date.parse(recovery.created_at) : NaN
    const mttr = !Number.isNaN(failedAt) && !Number.isNaN(recoveryAt)
      ? Math.round((recoveryAt - failedAt) / 1000)
      : 0

    return {
      id: `mttr-${failed.id}`,
      primary: `Falha #${failed.iid || failed.id}`,
      secondary: failed.ref || '-',
      value: mttr > 0 ? formatDuration(mttr) : 'sem recuperação',
      time: failed.created_at,
    }
  })
})

function openDetail(mode: DetailMode) {
  detailMode.value = mode
}
</script>

<template>
  <MainLayout title="Métricas DORA">
    <div class="space-y-6">
      <Card class="p-4">
        <div class="flex flex-wrap items-center gap-4">
          <Filter class="h-5 w-5 text-muted-foreground" />
          <Select v-model="periodFilter" :options="periodOptions" class="w-56" />
          <Select v-model="projectFilter" :options="projectOptions" class="w-64" />
          <div class="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span>{{ totalDeployments }} deploys · {{ totalMergedMRs }} MRs mergeadas</span>
          </div>
        </div>
      </Card>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card class="p-5" hover @click="openDetail('deploymentFrequency')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Deployment Frequency</p>
              <p class="mt-2 text-3xl font-bold text-foreground">
                {{ dora.deploymentFrequency }}
              </p>
              <p class="text-sm text-muted-foreground">deploys/dia</p>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Gauge class="h-6 w-6 text-primary" />
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between">
            <span
              :class="['inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', deployFrequencyLevel.bg, deployFrequencyLevel.color]"
            >
              Nível: {{ deployFrequencyLevel.label }}
            </span>
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp v-if="recentTrend === 'up'" class="h-4 w-4 text-success" />
              <TrendingDown v-else-if="recentTrend === 'down'" class="h-4 w-4 text-destructive" />
              <Minus v-else class="h-4 w-4" />
              <span>tendência</span>
            </div>
          </div>
          <svg class="mt-3 h-10 w-full" viewBox="0 0 200 40" preserveAspectRatio="none">
            <path
              :d="buildSparklinePath(deploymentFrequencyData)"
              fill="none"
              stroke="hsl(var(--primary))"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Card>

        <Card class="p-5" hover @click="openDetail('leadTime')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Lead Time for Changes</p>
              <p class="mt-2 text-3xl font-bold text-foreground">
                {{ formatDuration(dora.leadTimeForChangesSec) }}
              </p>
              <p class="text-sm text-muted-foreground">da criação ao deploy</p>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/10">
              <Clock3 class="h-6 w-6 text-chart-2" />
            </div>
          </div>
          <div class="mt-4">
            <span
              :class="['inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', leadTimeLevel.bg, leadTimeLevel.color]"
            >
              Nível: {{ leadTimeLevel.label }}
            </span>
          </div>
          <svg class="mt-3 h-10 w-full" viewBox="0 0 200 40" preserveAspectRatio="none">
            <path
              :d="buildSparklinePath(leadTimeData)"
              fill="none"
              stroke="hsl(var(--chart-2))"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Card>

        <Card class="p-5" hover @click="openDetail('changeFailureRate')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Change Failure Rate</p>
              <p class="mt-2 text-3xl font-bold text-foreground">
                {{ dora.changeFailureRate }}%
              </p>
              <p class="text-sm text-muted-foreground">deploys com falha</p>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
              <AlertTriangle class="h-6 w-6 text-warning" />
            </div>
          </div>
          <div class="mt-4">
            <span
              :class="['inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', failureRateLevel.bg, failureRateLevel.color]"
            >
              Nível: {{ failureRateLevel.label }}
            </span>
          </div>
          <svg class="mt-3 h-10 w-full" viewBox="0 0 200 40" preserveAspectRatio="none">
            <path
              :d="buildSparklinePath(changeFailureRateData)"
              fill="none"
              stroke="hsl(var(--warning))"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Card>

        <Card class="p-5" hover @click="openDetail('mttr')">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Mean Time To Recovery</p>
              <p class="mt-2 text-3xl font-bold text-foreground">
                {{ formatDuration(dora.mttrSec) }}
              </p>
              <p class="text-sm text-muted-foreground">tempo médio de recuperação</p>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <Wrench class="h-6 w-6 text-destructive" />
            </div>
          </div>
          <div class="mt-4">
            <span
              :class="['inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', mttrLevel.bg, mttrLevel.color]"
            >
              Nível: {{ mttrLevel.label }}
            </span>
          </div>
        </Card>
      </div>

      <Card class="p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-foreground">{{ detailTitle }}</h3>
          <div class="text-xs text-muted-foreground">Clique nos cards DORA para trocar o detalhamento</div>
        </div>
        <div v-if="detailRows.length === 0" class="flex h-24 items-center justify-center text-sm text-muted-foreground">
          Sem itens para detalhamento
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="py-2 pr-4 text-left font-medium text-muted-foreground">Item</th>
                <th class="py-2 px-4 text-left font-medium text-muted-foreground">Contexto</th>
                <th class="py-2 px-4 text-left font-medium text-muted-foreground">Valor</th>
                <th class="py-2 pl-4 text-left font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="row in detailRows" :key="row.id" class="hover:bg-muted/40">
                <td class="py-2 pr-4 text-foreground">
                  <a
                    v-if="row?.url"
                    :href="row?.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 hover:underline"
                  >
                    {{ row.primary }}
                    <ExternalLink class="h-3.5 w-3.5" />
                  </a>
                  <span v-else>{{ row.primary }}</span>
                </td>
                <td class="py-2 px-4 text-muted-foreground">{{ row.secondary }}</td>
                <td class="py-2 px-4 text-muted-foreground">{{ row.value }}</td>
                <td class="py-2 pl-4 text-muted-foreground">{{ row.time }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card class="p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-foreground">{{ detailTitle }}</h3>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <span v-if="detailMode === 'deploymentFrequency'">últimos deployments</span>
            <span v-else-if="detailMode === 'leadTime'">MRs com lead time</span>
            <span v-else-if="detailMode === 'changeFailureRate'">status dos deployments</span>
            <span v-else>falha → recuperação</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="py-2 pr-4 text-left font-medium text-muted-foreground">Item</th>
                <th class="py-2 px-4 text-left font-medium text-muted-foreground">Contexto</th>
                <th class="py-2 px-4 text-left font-medium text-muted-foreground">Valor</th>
                <th class="py-2 pl-4 text-left font-medium text-muted-foreground">Data</th>
                <th class="py-2 pl-4 text-right font-medium text-muted-foreground">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="row in detailRows" :key="row.id" class="hover:bg-muted/40">
                <td class="py-2 pr-4 text-foreground">{{ row.primary }}</td>
                <td class="py-2 px-4 text-muted-foreground">{{ row.secondary }}</td>
                <td class="py-2 px-4">
                  <span
                    :class="[
                      row.value === 'failed' ? 'text-destructive' :
                      row.value === 'success' ? 'text-success' :
                      'text-foreground'
                    ]"
                  >
                    {{ row.value }}
                  </span>
                </td>
                <td class="py-2 pl-4 text-muted-foreground">
                  {{ row.time ? format(parseISO(row.time), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-' }}
                </td>
                <td class="py-2 pl-4 text-right">
                  <a
                    v-if="row?.url"
                    :href="row?.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    abrir
                    <ExternalLink class="h-3.5 w-3.5" />
                  </a>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card class="p-4">
        <h3 class="mb-3 text-sm font-semibold text-foreground">Referência de Classificação DORA</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="py-2 pr-4 text-left font-medium text-muted-foreground">Métrica</th>
                <th class="py-2 px-4 text-left font-medium text-success">Elite</th>
                <th class="py-2 px-4 text-left font-medium text-chart-2">Alto</th>
                <th class="py-2 px-4 text-left font-medium text-warning">Médio</th>
                <th class="py-2 pl-4 text-left font-medium text-destructive">Baixo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr>
                <td class="py-2 pr-4 text-muted-foreground">Deployment Frequency</td>
                <td class="py-2 px-4 text-success">Múltiplos/dia</td>
                <td class="py-2 px-4 text-chart-2">1/semana a 1/dia</td>
                <td class="py-2 px-4 text-warning">1/mês a 1/semana</td>
                <td class="py-2 pl-4 text-destructive">&lt; 1/mês</td>
              </tr>
              <tr>
                <td class="py-2 pr-4 text-muted-foreground">Lead Time for Changes</td>
                <td class="py-2 px-4 text-success">&lt; 1 hora</td>
                <td class="py-2 px-4 text-chart-2">1 hora a 1 dia</td>
                <td class="py-2 px-4 text-warning">1 dia a 1 semana</td>
                <td class="py-2 pl-4 text-destructive">&gt; 1 semana</td>
              </tr>
              <tr>
                <td class="py-2 pr-4 text-muted-foreground">Change Failure Rate</td>
                <td class="py-2 px-4 text-success">0-5%</td>
                <td class="py-2 px-4 text-chart-2">5-10%</td>
                <td class="py-2 px-4 text-warning">10-15%</td>
                <td class="py-2 pl-4 text-destructive">&gt; 15%</td>
              </tr>
              <tr>
                <td class="py-2 pr-4 text-muted-foreground">Mean Time To Recovery</td>
                <td class="py-2 px-4 text-success">&lt; 1 hora</td>
                <td class="py-2 px-4 text-chart-2">1 hora a 1 dia</td>
                <td class="py-2 px-4 text-warning">1 dia a 1 semana</td>
                <td class="py-2 pl-4 text-destructive">&gt; 1 semana</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card class="p-4">
        <h3 class="mb-3 text-sm font-semibold text-foreground">Tendência diária no período</h3>
        <div v-if="trend.length === 0" class="flex h-24 items-center justify-center text-sm text-muted-foreground">
          Sem dados para o período selecionado
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="py-2 pr-4 text-left font-medium text-muted-foreground">Data</th>
                <th class="py-2 px-4 text-right font-medium text-muted-foreground">Deploys</th>
                <th class="py-2 px-4 text-right font-medium text-muted-foreground">Lead Time</th>
                <th class="py-2 pl-4 text-right font-medium text-muted-foreground">Failure Rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="(point, index) in [...trend].reverse().slice(0, 30)"
                :key="point.date"
                class="hover:bg-muted/40"
              >
                <td class="py-2 pr-4 text-muted-foreground">
                  {{ chartDates[[...trend].length - 1 - index] || point.date }}
                </td>
                <td class="py-2 px-4 text-right font-medium text-foreground">
                  {{ point.deploymentFrequency }}
                </td>
                <td class="py-2 px-4 text-right text-muted-foreground">
                  {{ point.leadTimeForChangesSec ? formatDuration(point.leadTimeForChangesSec) : '-' }}
                </td>
                <td class="py-2 pl-4 text-right">
                  <span
                    :class="[
                      point.changeFailureRate > 15 ? 'text-destructive' :
                      point.changeFailureRate > 10 ? 'text-warning' :
                      point.changeFailureRate > 0 ? 'text-chart-2' : 'text-muted-foreground'
                    ]"
                  >
                    {{ point.deploymentFrequency > 0 ? `${point.changeFailureRate}%` : '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card class="p-4">
        <h3 class="mb-3 text-sm font-semibold text-foreground">Breakdown por projeto</h3>
        <div v-if="statsByProject.length === 0" class="flex h-24 items-center justify-center text-sm text-muted-foreground">
          Sem dados de deployment no período selecionado
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="project in statsByProject"
            :key="project.name"
            class="rounded-lg border border-border bg-muted/30 p-3"
          >
            <div class="flex items-start justify-between">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-foreground">{{ project.name }}</p>
                <div class="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span class="inline-flex items-center gap-1">
                    <Rocket class="h-3.5 w-3.5" />
                    {{ project.deployments }} deploys
                  </span>
                  <span
                    :class="['inline-flex items-center gap-1', project.failed > 0 ? 'text-destructive' : 'text-success']"
                  >
                    <AlertTriangle class="h-3.5 w-3.5" />
                    {{ project.failed }} falhas
                    <span v-if="project.deployments > 0">
                      ({{ ((project.failed / project.deployments) * 100).toFixed(1) }}%)
                    </span>
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <TrendingUp class="h-3.5 w-3.5" />
                    {{ project.mergeRequests }} MRs
                  </span>
                </div>
              </div>
              <div class="ml-4 w-32 flex-shrink-0">
                <div class="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full bg-primary transition-all"
                    :style="{
                      width: `${Math.min(100, (project.deployments / (statsByProject[0]?.deployments || 1)) * 100)}%`,
                    }"
                  />
                </div>
                <div v-if="project.failed > 0" class="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full bg-destructive transition-all"
                    :style="{
                      width: `${Math.min(100, (project.failed / project.deployments) * 100)}%`,
                    }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div
        v-if="metricsStore.deployments.length === 0 && !metricsStore.isLoading"
        class="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground"
      >
        <Gauge class="mx-auto mb-3 h-12 w-12 opacity-30" />
        <p class="text-base font-medium">Sem dados de deployment</p>
        <p class="mt-1 text-sm">
          As métricas DORA são calculadas a partir dos deployments GitLab. Configure os deployments nos seus projetos.
        </p>
      </div>
    </div>
  </MainLayout>
</template>
