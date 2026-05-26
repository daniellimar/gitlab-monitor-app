<script setup lang="ts">
import {
  GitBranch,
  XCircle,
  Play,
  Server,
  GitCommit,
  FolderGit2,
  TrendingUp,
  Clock3,
  DollarSign,
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import MetricCard from '@/components/metrics/MetricCard.vue'
import PipelineChart from '@/components/metrics/PipelineChart.vue'
import RunnersStatus from '@/components/metrics/RunnersStatus.vue'
import RecentJobs from '@/components/metrics/RecentJobs.vue'
import CommitActivity from '@/components/metrics/CommitActivity.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { useMetricsStore } from '@/stores/metrics'

const metricsStore = useMetricsStore()

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
    <!-- Loading State -->
    <div
      v-if="metricsStore.isLoading && !metricsStore.lastUpdated"
      class="flex h-96 items-center justify-center"
    >
      <div class="text-center">
        <Spinner size="xl" class="mx-auto mb-4 text-primary" />
        <p class="text-muted-foreground">Carregando métricas...</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="metricsStore.error && !metricsStore.lastUpdated"
      class="flex h-96 items-center justify-center"
    >
      <div class="text-center">
        <XCircle class="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h3 class="mb-2 text-lg font-semibold text-foreground">Erro ao carregar métricas</h3>
        <p class="mb-4 text-muted-foreground">{{ metricsStore.error }}</p>
        <button
          class="text-primary hover:underline"
          @click="metricsStore.loadAllMetrics"
        >
          Tentar novamente
        </button>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="space-y-6">
      <!-- Metric Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Pipelines"
          :value="metricsStore.dashboardMetrics.totalPipelines"
          subtitle="Últimos 7 dias"
          :icon="GitBranch"
        />
        <MetricCard
          title="Taxa de Sucesso"
          :value="`${metricsStore.dashboardMetrics.successRate}%`"
          subtitle="Pipelines bem-sucedidas"
          :icon="TrendingUp"
          variant="success"
        />
        <MetricCard
          title="Pipelines com Falha"
          :value="metricsStore.dashboardMetrics.failedPipelines"
          subtitle="Últimos 7 dias"
          :icon="XCircle"
          variant="destructive"
        />
        <MetricCard
          title="Em Execução"
          :value="metricsStore.dashboardMetrics.runningPipelines"
          subtitle="Agora"
          :icon="Play"
          variant="warning"
        />
      </div>

      <!-- Second Row -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Jobs"
          :value="metricsStore.dashboardMetrics.totalJobs"
          :icon="Play"
        />
        <MetricCard
          title="Runners Online"
          :value="metricsStore.dashboardMetrics.runnersOnline"
          :subtitle="`${metricsStore.dashboardMetrics.runnersOffline} offline`"
          :icon="Server"
          variant="success"
        />
        <MetricCard
          title="Commits Hoje"
          :value="metricsStore.dashboardMetrics.totalCommitsToday"
          :icon="GitCommit"
        />
        <MetricCard
          title="Projetos"
          :value="metricsStore.dashboardMetrics.totalProjects"
          :icon="FolderGit2"
        />
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tempo Médio Pipeline"
          :value="formatDuration(metricsStore.dashboardMetrics.avgPipelineDurationSec)"
          :subtitle="`Fila média: ${formatDuration(metricsStore.dashboardMetrics.avgPipelineQueueDurationSec)}`"
          :icon="Clock3"
        />
        <MetricCard
          title="Tempo Médio Job"
          :value="formatDuration(metricsStore.dashboardMetrics.avgJobDurationSec)"
          :icon="Clock3"
        />
        <MetricCard
          title="Minutos CI"
          :value="metricsStore.dashboardMetrics.totalCiMinutes"
          subtitle="Execução + fila"
          :icon="Play"
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

      <!-- Charts Row -->
      <div class="grid gap-6 lg:grid-cols-2">
        <PipelineChart />
        <RunnersStatus />
      </div>

      <!-- Bottom Row -->
      <div class="grid gap-6 lg:grid-cols-2">
        <RecentJobs />
        <CommitActivity />
      </div>
    </div>
  </MainLayout>
</template>
