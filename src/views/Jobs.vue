<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterView } from 'vue-router'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { GitBranch, ExternalLink, Filter, Server } from 'lucide-vue-next'
import { getCiStatusIcon, getCiStatusVariant } from '@/utils/gitlabStatus'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import { useMetricsStore } from '@/stores/metrics'
import DetailDrawer from '@/components/detail/DetailDrawer.vue'

const router = useRouter()
const metricsStore = useMetricsStore()

function openJob(job: { id: number; pipeline?: { project_id: number } }) {
  const projectId = job.pipeline?.project_id
  if (!projectId) return
  router.push({
    name: 'JobDetail',
    params: { projectId: String(projectId), jobId: String(job.id) },
  })
}

const statusFilter = ref<string>('all')
const stageFilter = ref<string>('all')
const pipelineFilter = ref<string>('all')
const runnerFilter = ref<string>('all')
const CI_COST_PER_MINUTE_USD = Number(import.meta.env.VITE_CI_COST_PER_MINUTE_USD || '0.008')

const statusOptions = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'success', label: 'Sucesso' },
  { value: 'failed', label: 'Falha' },
  { value: 'running', label: 'Em Execução' },
  { value: 'pending', label: 'Pendente' },
  { value: 'canceled', label: 'Cancelado' },
]

const stageOptions = computed(() => {
  const stages = new Set(metricsStore.jobs.map((j) => j.stage))
  return [
    { value: 'all', label: 'Todos os Stages' },
    ...Array.from(stages).map((s) => ({ value: s, label: s })),
  ]
})

const pipelineOptions = computed(() => {
  const pipelineMap = new Map<string, string>()
  for (const job of metricsStore.jobs) {
    const projectId = job.pipeline?.project_id
    const pipelineId = job.pipeline?.id
    if (!projectId || !pipelineId) continue
    const key = `${projectId}:${pipelineId}`
    if (!pipelineMap.has(key)) {
      pipelineMap.set(key, `#${pipelineId} - Projeto ${projectId}`)
    }
  }

  return [
    { value: 'all', label: 'Todas as Pipelines' },
    ...Array.from(pipelineMap.entries()).map(([value, label]) => ({ value, label })),
  ]
})

const runnerOptions = computed(() => {
  const runnerMap = new Map<string, string>()
  for (const job of metricsStore.jobs) {
    if (!job.runner?.id) continue
    const value = String(job.runner.id)
    if (!runnerMap.has(value)) {
      runnerMap.set(value, job.runner.description || `Runner #${job.runner.id}`)
    }
  }

  return [
    { value: 'all', label: 'Todos os Runners' },
    ...Array.from(runnerMap.entries()).map(([value, label]) => ({ value, label })),
  ]
})

const filteredJobs = computed(() => {
  let jobs = metricsStore.jobs

  if (statusFilter.value !== 'all') {
    jobs = jobs.filter((j) => j.status === statusFilter.value)
  }

  if (stageFilter.value !== 'all') {
    jobs = jobs.filter((j) => j.stage === stageFilter.value)
  }

  if (pipelineFilter.value !== 'all') {
    jobs = jobs.filter(
      (j) => `${j.pipeline?.project_id || ''}:${j.pipeline?.id || ''}` === pipelineFilter.value
    )
  }

  if (runnerFilter.value !== 'all') {
    jobs = jobs.filter((j) => String(j.runner?.id || '') === runnerFilter.value)
  }

  return jobs
})

const enrichedJobs = computed(() => {
  return filteredJobs.value.map((job) => {
    const totalDurationSec = (job.duration || 0) + (job.queued_duration || 0)
    const ciMinutes = Math.round(totalDurationSec / 60)
    const estimatedCost = Number((ciMinutes * CI_COST_PER_MINUTE_USD).toFixed(2))

    return {
      ...job,
      metrics: {
        totalDurationSec,
        ciMinutes,
        estimatedCost,
      },
    }
  })
})

const stats = computed(() => {
  const jobs = enrichedJobs.value
  const total = jobs.length
  const success = jobs.filter((j) => j.status === 'success').length
  const failed = jobs.filter((j) => j.status === 'failed').length
  const running = jobs.filter((j) => j.status === 'running').length
  const pending = jobs.filter((j) => j.status === 'pending').length

  const totalDurationSec = jobs.reduce((acc, j) => acc + (j.duration || 0), 0)
  const totalQueueSec = jobs.reduce((acc, j) => acc + (j.queued_duration || 0), 0)
  const totalCiMinutes = jobs.reduce((acc, j) => acc + j.metrics.ciMinutes, 0)
  const estimatedCost = Number(jobs.reduce((acc, j) => acc + j.metrics.estimatedCost, 0).toFixed(2))

  const avgDurationSec = total > 0 ? Math.round(totalDurationSec / total) : 0
  const avgQueueSec = total > 0 ? Math.round(totalQueueSec / total) : 0

  const stagesMap = jobs.reduce(
    (acc, job) => {
      const stage = job.stage || 'unknown'
      if (!acc[stage]) {
        acc[stage] = { count: 0, totalDuration: 0, totalCost: 0 }
      }
      acc[stage].count++
      acc[stage].totalDuration += job.metrics.totalDurationSec
      acc[stage].totalCost += job.metrics.estimatedCost
      return acc
    },
    {} as Record<string, { count: number; totalDuration: number; totalCost: number }>
  )

  const stages = Object.entries(stagesMap)
    .map(([stage, data]) => ({
      stage,
      count: data.count,
      avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
      estimatedCost: Number(data.totalCost.toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count)

  return {
    total,
    success,
    failed,
    running,
    pending,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    totalDurationSec,
    totalQueueSec,
    avgDurationSec,
    avgQueueSec,
    totalCiMinutes,
    estimatedCost,
    stages,
  }
})

const jobsByPipeline = computed(() => {
  const grouped = enrichedJobs.value.reduce(
    (acc, job) => {
      const key = `${job.pipeline.project_id}:${job.pipeline.id}`
      if (!acc[key]) {
        acc[key] = {
          key,
          projectId: job.pipeline.project_id,
          pipelineId: job.pipeline.id,
          totalJobs: 0,
          totalDurationSec: 0,
          totalCiMinutes: 0,
          estimatedCost: 0,
        }
      }

      acc[key].totalJobs++
      acc[key].totalDurationSec += job.metrics.totalDurationSec
      acc[key].totalCiMinutes += job.metrics.ciMinutes
      acc[key].estimatedCost += job.metrics.estimatedCost
      return acc
    },
    {} as Record<string, {
      key: string
      projectId: number
      pipelineId: number
      totalJobs: number
      totalDurationSec: number
      totalCiMinutes: number
      estimatedCost: number
    }>
  )

  return Object.values(grouped)
    .map((item) => ({ ...item, estimatedCost: Number(item.estimatedCost.toFixed(2)) }))
    .sort((a, b) => b.totalCiMinutes - a.totalCiMinutes)
})

const jobsByRunner = computed(() => {
  const grouped = enrichedJobs.value.reduce(
    (acc, job) => {
      const runnerId = job.runner?.id || 0
      const runnerName = job.runner?.description || (runnerId ? `Runner #${runnerId}` : 'Sem runner')
      const key = String(runnerId)

      if (!acc[key]) {
        acc[key] = { key, runnerName, totalJobs: 0, totalCiMinutes: 0, estimatedCost: 0 }
      }

      acc[key].totalJobs++
      acc[key].totalCiMinutes += job.metrics.ciMinutes
      acc[key].estimatedCost += job.metrics.estimatedCost
      return acc
    },
    {} as Record<string, { key: string; runnerName: string; totalJobs: number; totalCiMinutes: number; estimatedCost: number }>
  )

  return Object.values(grouped)
    .map((item) => ({ ...item, estimatedCost: Number(item.estimatedCost.toFixed(2)) }))
    .sort((a, b) => b.totalCiMinutes - a.totalCiMinutes)
})

function formatDuration(seconds: number | null) {
  if (!seconds) return '-'
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

function formatTime(date: string | null) {
  if (!date) return '-'
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR })
}
</script>

<template>
  <MainLayout title="Jobs">
    <div class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Total</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.total }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Sucesso</div>
          <div class="mt-1 text-2xl font-bold text-success">{{ stats.success }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Falha</div>
          <div class="mt-1 text-2xl font-bold text-destructive">{{ stats.failed }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Em Execução</div>
          <div class="mt-1 text-2xl font-bold text-primary">{{ stats.running }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Pendente</div>
          <div class="mt-1 text-2xl font-bold text-warning">{{ stats.pending }}</div>
        </Card>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Tempo CI total</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ formatDuration(stats.totalDurationSec + stats.totalQueueSec) }}</div>
          <div class="mt-1 text-xs text-muted-foreground">Execução: {{ formatDuration(stats.totalDurationSec) }} | Fila: {{ formatDuration(stats.totalQueueSec) }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Tempo médio por job</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ formatDuration(stats.avgDurationSec) }}</div>
          <div class="mt-1 text-xs text-muted-foreground">Fila média: {{ formatDuration(stats.avgQueueSec) }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Minutos de CI</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.totalCiMinutes }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Custo estimado</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ formatCurrency(stats.estimatedCost) }}</div>
          <div class="mt-1 text-xs text-muted-foreground">Taxa de {{ formatCurrency(CI_COST_PER_MINUTE_USD) }}/min</div>
        </Card>
      </div>

      <Card class="p-4">
        <div class="flex flex-wrap items-center gap-4">
          <Filter class="h-5 w-5 text-muted-foreground" />
          <Select
            v-model="statusFilter"
            :options="statusOptions"
            class="w-56"
          />
          <Select
            v-model="stageFilter"
            :options="stageOptions"
            class="w-56"
          />
          <Select
            v-model="pipelineFilter"
            :options="pipelineOptions"
            class="w-56"
          />
          <Select
            v-model="runnerFilter"
            :options="runnerOptions"
            class="w-56"
          />
        </div>
      </Card>

      <div class="grid gap-6 lg:grid-cols-2">
        <Card class="p-4">
          <h3 class="mb-4 text-sm font-medium text-foreground">Top pipelines por consumo de CI</h3>
          <div v-if="jobsByPipeline.length > 0" class="space-y-3">
            <div
              v-for="item in jobsByPipeline.slice(0, 5)"
              :key="item.key"
              class="rounded-lg border border-border p-3"
            >
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-foreground">Pipeline #{{ item.pipelineId }} · Projeto {{ item.projectId }}</div>
                <div class="text-sm text-muted-foreground">{{ item.totalJobs }} jobs</div>
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{{ item.totalCiMinutes }} min</span>
                <span>{{ formatDuration(item.totalDurationSec) }}</span>
                <span>{{ formatCurrency(item.estimatedCost) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">Sem dados para pipelines no filtro atual.</div>
        </Card>

        <Card class="p-4">
          <h3 class="mb-4 text-sm font-medium text-foreground">Top runners por consumo de CI</h3>
          <div v-if="jobsByRunner.length > 0" class="space-y-3">
            <div
              v-for="item in jobsByRunner.slice(0, 5)"
              :key="item.key"
              class="rounded-lg border border-border p-3"
            >
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-foreground">{{ item.runnerName }}</div>
                <div class="text-sm text-muted-foreground">{{ item.totalJobs }} jobs</div>
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{{ item.totalCiMinutes }} min</span>
                <span>{{ formatCurrency(item.estimatedCost) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">Sem dados para runners no filtro atual.</div>
        </Card>
      </div>

      <Card class="p-4">
        <h3 class="mb-4 text-sm font-medium text-foreground">Jobs por Stage</h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Stage</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Jobs</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tempo médio</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Custo estimado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stage in stats.stages" :key="stage.stage" class="border-b border-border last:border-0">
                <td class="px-4 py-3 text-sm font-medium text-foreground">{{ stage.stage }}</td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ stage.count }}</td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ formatDuration(stage.avgDuration) }}</td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ formatCurrency(stage.estimatedCost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Stage</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Pipeline</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Branch</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Runner</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Execução</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fila</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tempo CI</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Custo</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Iniciado</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="job in enrichedJobs"
                :key="job.id"
                class="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                @click="openJob(job)"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <component
                      :is="getCiStatusIcon(job.status)"
                      :class="[
                        'h-5 w-5',
                        job.status === 'success' ? 'text-success' :
                        job.status === 'failed' ? 'text-destructive' :
                        job.status === 'running' ? 'text-primary animate-pulse' :
                        'text-muted-foreground',
                      ]"
                    />
                    <Badge :variant="getCiStatusVariant(job.status)">
                      {{ job.status }}
                    </Badge>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm font-medium text-foreground">{{ job.name }}</span>
                </td>
                <td class="px-4 py-3">
                  <Badge variant="outline">{{ job.stage }}</Badge>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  <span v-if="job.pipeline">#{{ job.pipeline.id }} · P{{ job.pipeline.project_id }}</span>
                  <span v-else>-</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1 text-sm text-muted-foreground">
                    <GitBranch class="h-4 w-4" />
                    {{ job.ref }}
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div v-if="job.runner" class="flex items-center gap-1 text-sm text-muted-foreground">
                    <Server class="h-4 w-4" />
                    {{ job.runner.description || `#${job.runner.id}` }}
                  </div>
                  <span v-else class="text-sm text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatDuration(job.duration) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatDuration(job.queued_duration) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatDuration(job.metrics.totalDurationSec) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatCurrency(job.metrics.estimatedCost) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatTime(job.started_at) }}
                </td>
                <td class="px-4 py-3">
                  <a
                    :href="job.web_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-muted-foreground hover:text-foreground"
                    @click.stop
                  >
                    <ExternalLink class="h-4 w-4" />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="enrichedJobs.length === 0"
          class="flex h-48 items-center justify-center text-muted-foreground"
        >
          Nenhum job encontrado
        </div>
      </Card>
    </div>

    <RouterView v-slot="{ Component }">
      <DetailDrawer v-if="Component" @close="router.back()">
        <component :is="Component" />
      </DetailDrawer>
    </RouterView>
  </MainLayout>
</template>
