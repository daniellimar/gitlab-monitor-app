<script setup lang="ts">
import { computed } from 'vue'
import {
  GitMerge,
  Rocket,
  Gauge,
  AlertTriangle,
  Wrench,
  Clock3,
  DollarSign,
  Layers,
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import MetricCard from '@/components/metrics/MetricCard.vue'
import PipelineChart from '@/components/metrics/PipelineChart.vue'
import RunnersStatus from '@/components/metrics/RunnersStatus.vue'
import RecentJobs from '@/components/metrics/RecentJobs.vue'
import CommitActivity from '@/components/metrics/CommitActivity.vue'
import Spinner from '@/components/ui/Spinner.vue'
import Card from '@/components/ui/Card.vue'
import Select from '@/components/ui/Select.vue'
import { useMetricsStore } from '@/stores/metrics'

const metricsStore = useMetricsStore()

const doraPeriodFilter = computed({
  get: () => String(metricsStore.commitPeriodDays),
  set: async (value: string) => {
    const days = Number(value) as 7 | 30 | 60 | 90 | 180 | 365
    if (Number.isNaN(days)) return
    await metricsStore.setCommitPeriodDays(days)
    await metricsStore.refreshMetrics({ bypassCache: true })
  },
})

const periodOptions = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 180 dias' },
  { value: '365', label: 'Últimos 365 dias' },
]

const environmentsByState = computed(() => {
  return metricsStore.environments.reduce(
    (acc, env) => {
      const key = env.state || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
})

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}
</script>

<template>
  <MainLayout title="Dashboard">
    <div
      v-if="metricsStore.isLoading && !metricsStore.lastUpdated"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div v-for="i in 8" :key="i" class="h-32 animate-pulse rounded-xl bg-muted" />
    </div>

    <div
      v-else-if="metricsStore.error && !metricsStore.lastUpdated"
      class="flex h-96 items-center justify-center"
    >
      <div class="text-center">
        <Spinner size="xl" class="mx-auto mb-4 text-primary" />
        <h3 class="mb-2 text-lg font-semibold text-foreground">Erro ao carregar métricas</h3>
        <p class="mb-4 text-muted-foreground">{{ metricsStore.error }}</p>
        <button class="text-primary hover:underline" @click="metricsStore.loadAllMetrics({ bypassCache: true })">
          Tentar novamente
        </button>
      </div>
    </div>

    <div v-else class="space-y-6">
      <Card class="border-white/10 bg-card/70 p-4 backdrop-blur-md">
        <div class="flex flex-wrap items-center gap-3">
          <div class="text-sm font-medium text-muted-foreground">Período DORA</div>
          <Select v-model="doraPeriodFilter" :options="periodOptions" class="w-56" />
        </div>
      </Card>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Deployment Frequency"
          :value="metricsStore.dashboardMetrics.deploymentFrequencyPerDay"
          subtitle="deploys/dia"
          :icon="Gauge"
          variant="success"
        />
        <MetricCard
          title="Lead Time for Changes"
          :value="formatDuration(metricsStore.dashboardMetrics.leadTimeForChangesSec)"
          :icon="Clock3"
        />
        <MetricCard
          title="Change Failure Rate"
          :value="`${metricsStore.dashboardMetrics.changeFailureRate}%`"
          :icon="AlertTriangle"
          variant="warning"
        />
        <MetricCard
          title="Mean Time To Recovery"
          :value="formatDuration(metricsStore.dashboardMetrics.meanTimeToRecoverySec)"
          :icon="Wrench"
          variant="destructive"
        />
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Merge Requests"
          :value="metricsStore.dashboardMetrics.totalMergeRequests"
          :subtitle="`Merged: ${metricsStore.dashboardMetrics.mergedMergeRequests}`"
          :icon="GitMerge"
        />
        <MetricCard
          title="Deployments"
          :value="metricsStore.dashboardMetrics.totalDeployments"
          subtitle="No período"
          :icon="Rocket"
          variant="success"
        />
        <MetricCard
          title="Minutos CI"
          :value="metricsStore.dashboardMetrics.totalCiMinutes"
          subtitle="Execução + fila"
          :icon="Layers"
          variant="warning"
        />
        <MetricCard
          title="Custo Estimado CI"
          :value="formatCurrency(metricsStore.dashboardMetrics.estimatedCiCost)"
          subtitle="Estimativa USD"
          :icon="DollarSign"
          variant="destructive"
        />
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <PipelineChart />
        <RunnersStatus />
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <RecentJobs />
        <CommitActivity />
      </div>

      <Card class="p-4">
        <h3 class="mb-3 text-sm font-semibold text-foreground">Ambientes</h3>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="(count, state) in environmentsByState"
            :key="state"
            class="rounded-lg border border-border bg-muted/40 p-3"
          >
            <div class="text-xs uppercase text-muted-foreground">{{ state }}</div>
            <div class="mt-1 text-xl font-semibold text-foreground">{{ count }}</div>
          </div>
          <div v-if="Object.keys(environmentsByState).length === 0" class="text-sm text-muted-foreground">
            Sem ambientes carregados
          </div>
        </div>
      </Card>
    </div>
  </MainLayout>
</template>
