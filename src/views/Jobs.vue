<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  GitBranch,
  ExternalLink,
  Filter,
  Server,
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import { useMetricsStore } from '@/stores/metrics'
import type { JobStatus } from '@/types/gitlab'

const metricsStore = useMetricsStore()

const statusFilter = ref<string>('all')
const stageFilter = ref<string>('all')

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

const filteredJobs = computed(() => {
  let jobs = metricsStore.jobs

  if (statusFilter.value !== 'all') {
    jobs = jobs.filter((j) => j.status === statusFilter.value)
  }

  if (stageFilter.value !== 'all') {
    jobs = jobs.filter((j) => j.stage === stageFilter.value)
  }

  return jobs
})

const stats = computed(() => metricsStore.jobStats)

function getStatusIcon(status: JobStatus) {
  switch (status) {
    case 'success':
      return CheckCircle2
    case 'failed':
      return XCircle
    case 'running':
      return Play
    default:
      return Clock
  }
}

function getStatusVariant(status: JobStatus): 'success' | 'destructive' | 'warning' | 'muted' | 'default' {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
      return 'destructive'
    case 'running':
      return 'default'
    case 'pending':
    case 'manual':
      return 'warning'
    default:
      return 'muted'
  }
}

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

function formatTime(date: string | null) {
  if (!date) return '-'
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR })
}
</script>

<template>
  <MainLayout title="Jobs">
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
          <div class="text-sm text-muted-foreground">Pendente</div>
          <div class="mt-1 text-2xl font-bold text-warning">{{ stats.pending }}</div>
        </Card>
      </div>

      <!-- Stages Overview -->
      <Card class="p-4">
        <h3 class="mb-4 text-sm font-medium text-foreground">Jobs por Stage</h3>
        <div class="flex flex-wrap gap-3">
          <div
            v-for="stage in stats.stages"
            :key="stage.stage"
            class="rounded-lg bg-muted px-4 py-2"
          >
            <div class="text-sm font-medium text-foreground">{{ stage.stage }}</div>
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{{ stage.count }} jobs</span>
              <span>-</span>
              <span>{{ formatDuration(stage.avgDuration) }} avg</span>
            </div>
          </div>
        </div>
      </Card>

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
            v-model="stageFilter"
            :options="stageOptions"
            class="w-48"
          />
        </div>
      </Card>

      <!-- Jobs Table -->
      <Card>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Stage</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Branch</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Runner</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Duração</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Iniciado</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="job in filteredJobs"
                :key="job.id"
                class="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <component
                      :is="getStatusIcon(job.status)"
                      :class="[
                        'h-5 w-5',
                        job.status === 'success' ? 'text-success' :
                        job.status === 'failed' ? 'text-destructive' :
                        job.status === 'running' ? 'text-primary animate-pulse' :
                        'text-muted-foreground',
                      ]"
                    />
                    <Badge :variant="getStatusVariant(job.status)">
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
                  {{ formatTime(job.started_at) }}
                </td>
                <td class="px-4 py-3">
                  <a
                    :href="job.web_url"
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
          v-if="filteredJobs.length === 0"
          class="flex h-48 items-center justify-center text-muted-foreground"
        >
          Nenhum job encontrado
        </div>
      </Card>
    </div>
  </MainLayout>
</template>
