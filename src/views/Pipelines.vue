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
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import { useMetricsStore } from '@/stores/metrics'
import type { PipelineStatus } from '@/types/gitlab'

const metricsStore = useMetricsStore()

const statusFilter = ref<string>('all')
const projectFilter = ref<string>('all')

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

const stats = computed(() => metricsStore.pipelineStats)

function getStatusIcon(status: PipelineStatus) {
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

function getStatusVariant(status: PipelineStatus): 'success' | 'destructive' | 'warning' | 'muted' | 'default' {
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
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Criado</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="pipeline in filteredPipelines"
                :key="pipeline.id"
                class="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <component
                      :is="getStatusIcon(pipeline.status)"
                      :class="[
                        'h-5 w-5',
                        pipeline.status === 'success' ? 'text-success' :
                        pipeline.status === 'failed' ? 'text-destructive' :
                        pipeline.status === 'running' ? 'text-primary animate-pulse' :
                        'text-muted-foreground',
                      ]"
                    />
                    <Badge :variant="getStatusVariant(pipeline.status)">
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
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatTime(pipeline.created_at) }}
                </td>
                <td class="px-4 py-3">
                  <a
                    :href="pipeline.web_url"
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
          v-if="filteredPipelines.length === 0"
          class="flex h-48 items-center justify-center text-muted-foreground"
        >
          Nenhuma pipeline encontrada
        </div>
      </Card>
    </div>
  </MainLayout>
</template>
