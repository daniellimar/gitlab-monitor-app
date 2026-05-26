<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterView } from 'vue-router'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { GitBranch, ExternalLink, Filter } from 'lucide-vue-next'
import { getCiStatusIcon, getCiStatusVariant } from '@/utils/gitlabStatus'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import { useMetricsStore } from '@/stores/metrics'
import DetailDrawer from '@/components/detail/DetailDrawer.vue'

const router = useRouter()
const metricsStore = useMetricsStore()

function openPipeline(pipeline: { project_id: number; id: number }) {
  router.push({
    name: 'PipelineDetail',
    params: { projectId: String(pipeline.project_id), pipelineId: String(pipeline.id) },
  })
}

const statusFilter = ref<string>('all')
const projectFilter = ref<string>('all')
const CI_COST_PER_MINUTE_USD = Number(import.meta.env.VITE_CI_COST_PER_MINUTE_USD || '0.008')

const statusOptions = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'success', label: 'Sucesso' },
  { value: 'failed', label: 'Falha' },
  { value: 'running', label: 'Em Execução' },
  { value: 'pending', label: 'Pendente' },
  { value: 'canceled', label: 'Cancelado' },
]

const projectOptions = computed(() => [
  { value: 'all', label: 'Todos os Projetos' },
  ...metricsStore.projects.slice(0, 20).map((p) => ({
    value: String(p.id),
    label: p.name,
  })),
])

const filteredPipelines = computed(() => {
  let pipelines = metricsStore.pipelines

  if (statusFilter.value !== 'all') {
    pipelines = pipelines.filter((p) => p.status === statusFilter.value)
  }

  if (projectFilter.value !== 'all') {
    pipelines = pipelines.filter((p) => String(p.project_id) === projectFilter.value)
  }

  return pipelines
})

const jobsByPipeline = computed(() => {
  return metricsStore.jobs.reduce(
    (acc, job) => {
      const key = `${job.pipeline.project_id}:${job.pipeline.id}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(job)
      return acc
    },
    {} as Record<string, typeof metricsStore.jobs>
  )
})

const enrichedPipelines = computed(() => {
  return filteredPipelines.value.map((pipeline) => {
    const key = `${pipeline.project_id}:${pipeline.id}`
    const pipelineJobs = jobsByPipeline.value[key] || []

    const totalJobs = pipelineJobs.length
    const successJobs = pipelineJobs.filter((j) => j.status === 'success').length
    const failedJobs = pipelineJobs.filter((j) => j.status === 'failed').length
    const runningJobs = pipelineJobs.filter((j) => j.status === 'running').length
    const pendingJobs = pipelineJobs.filter((j) => j.status === 'pending').length

    const totalJobDuration = pipelineJobs.reduce((acc, job) => acc + (job.duration || 0), 0)
    const totalQueueDuration =
      (pipeline.queued_duration || 0) +
      pipelineJobs.reduce((acc, job) => acc + (job.queued_duration || 0), 0)

    const ciMinutes = Math.round((totalJobDuration + totalQueueDuration) / 60)
    const estimatedCost = Number((ciMinutes * CI_COST_PER_MINUTE_USD).toFixed(2))

    return {
      ...pipeline,
      metrics: {
        totalJobs,
        successJobs,
        failedJobs,
        runningJobs,
        pendingJobs,
        totalJobDuration,
        totalQueueDuration,
        ciMinutes,
        estimatedCost,
      },
    }
  })
})

const aggregatedStats = computed(() => {
  const pipelines = enrichedPipelines.value
  const totalPipelines = pipelines.length

  const totalJobs = pipelines.reduce((acc, p) => acc + p.metrics.totalJobs, 0)
  const totalCiMinutes = pipelines.reduce((acc, p) => acc + p.metrics.ciMinutes, 0)
  const estimatedCost = Number(
    pipelines.reduce((acc, p) => acc + p.metrics.estimatedCost, 0).toFixed(2)
  )

  const avgJobsPerPipeline = totalPipelines > 0 ? Math.round(totalJobs / totalPipelines) : 0
  const avgCiMinutesPerPipeline =
    totalPipelines > 0 ? Math.round(totalCiMinutes / totalPipelines) : 0

  const withDuration = pipelines.filter((p) => typeof p.duration === 'number')
  const avgPipelineDuration =
    withDuration.length > 0
      ? Math.round(withDuration.reduce((acc, p) => acc + (p.duration || 0), 0) / withDuration.length)
      : 0

  return {
    totalPipelines,
    totalJobs,
    totalCiMinutes,
    estimatedCost,
    avgJobsPerPipeline,
    avgCiMinutesPerPipeline,
    avgPipelineDuration,
  }
})

const stats = computed(() => {
  const pipelines = enrichedPipelines.value
  const total = pipelines.length
  const success = pipelines.filter((p) => p.status === 'success').length
  const failed = pipelines.filter((p) => p.status === 'failed').length
  const running = pipelines.filter((p) => p.status === 'running').length
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0

  return {
    total,
    success,
    failed,
    running,
    successRate,
  }
})


function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function formatTime(date: string) {
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function getProjectName(projectId: number) {
  const project = metricsStore.projects.find((p) => p.id === projectId)
  return project?.name || `Projeto #${projectId}`
}
</script>

<template>
  <MainLayout title="Pipelines">
    <div class="space-y-6">
      <!-- Stats Cards -->
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
          <div class="text-sm text-muted-foreground">Taxa de Sucesso</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.successRate }}%</div>
        </Card>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Jobs (pipelines filtradas)</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ aggregatedStats.totalJobs }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Jobs médios/pipeline</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ aggregatedStats.avgJobsPerPipeline }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Tempo médio pipeline</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ formatDuration(aggregatedStats.avgPipelineDuration) }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Tempo médio CI/pipeline</div>
          <div class="mt-1 text-2xl font-bold text-warning">{{ formatDuration(aggregatedStats.avgCiMinutesPerPipeline * 60) }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Custo estimado (USD)</div>
          <div class="mt-1 text-2xl font-bold text-destructive">{{ formatCurrency(aggregatedStats.estimatedCost) }}</div>
        </Card>
      </div>

      <!-- Filters -->
      <Card class="p-4">
        <div class="flex flex-wrap items-center gap-4">
          <Filter class="h-5 w-5 text-muted-foreground" />
          <Select
            v-model="statusFilter"
            :options="statusOptions"
            class="w-48"
          />
          <Select
            v-model="projectFilter"
            :options="projectOptions"
            class="w-64"
          />
        </div>
      </Card>

      <Card class="p-4">
        <h3 class="mb-4 text-sm font-medium text-foreground">Pipelines com maior consumo de CI</h3>
        <div class="space-y-2">
          <div
            v-for="pipeline in enrichedPipelines
              .filter((p) => p.metrics.totalJobs > 0)
              .sort((a, b) => b.metrics.ciMinutes - a.metrics.ciMinutes)
              .slice(0, 5)"
            :key="`top-${pipeline.project_id}-${pipeline.id}`"
            class="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-foreground">
                #{{ pipeline.iid }} - {{ getProjectName(pipeline.project_id) }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ pipeline.metrics.totalJobs }} jobs - {{ formatDuration((pipeline.metrics.ciMinutes || 0) * 60) }}
              </p>
            </div>
            <p class="text-sm font-semibold text-destructive">
              {{ formatCurrency(pipeline.metrics.estimatedCost) }}
            </p>
          </div>
          <div
            v-if="!enrichedPipelines.some((p) => p.metrics.totalJobs > 0)"
            class="text-sm text-muted-foreground"
          >
            Sem jobs vinculados às pipelines filtradas
          </div>
        </div>
      </Card>

      <!-- Pipelines Table -->
      <Card>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Pipeline</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Projeto</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Branch</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Duração</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Jobs</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tempo CI</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Custo Est.</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Criado</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="pipeline in enrichedPipelines"
                :key="pipeline.id"
                class="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                @click="openPipeline(pipeline)"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <component
                      :is="getCiStatusIcon(pipeline.status)"
                      :class="[
                        'h-5 w-5',
                        pipeline.status === 'success' ? 'text-success' :
                        pipeline.status === 'failed' ? 'text-destructive' :
                        pipeline.status === 'running' ? 'text-primary animate-pulse' :
                        'text-muted-foreground',
                      ]"
                    />
                    <Badge :variant="getCiStatusVariant(pipeline.status)">
                      {{ pipeline.status }}
                    </Badge>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="font-mono text-sm text-foreground">#{{ pipeline.iid }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-sm text-foreground">{{ getProjectName(pipeline.project_id) }}</span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1 text-sm text-muted-foreground">
                    <GitBranch class="h-4 w-4" />
                    {{ pipeline.ref }}
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatDuration(pipeline.duration) }}
                </td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{{ pipeline.metrics.totalJobs }} total</Badge>
                    <Badge v-if="pipeline.metrics.successJobs" variant="success">{{ pipeline.metrics.successJobs }} ok</Badge>
                    <Badge v-if="pipeline.metrics.failedJobs" variant="destructive">{{ pipeline.metrics.failedJobs }} falha</Badge>
                    <Badge v-if="pipeline.metrics.runningJobs" variant="warning">{{ pipeline.metrics.runningJobs }} exec</Badge>
                    <Badge v-if="pipeline.metrics.pendingJobs" variant="outline">{{ pipeline.metrics.pendingJobs }} pend</Badge>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatDuration((pipeline.metrics.ciMinutes || 0) * 60) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatCurrency(pipeline.metrics.estimatedCost) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatTime(pipeline.created_at) }}
                </td>
                <td class="px-4 py-3">
                  <a
                    :href="pipeline.web_url"
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
          v-if="filteredPipelines.length === 0"
          class="flex h-48 items-center justify-center text-muted-foreground"
        >
          Nenhuma pipeline encontrada
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
