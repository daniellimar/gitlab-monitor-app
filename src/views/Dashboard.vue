<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import {
  GitBranch,
  XCircle,
  Play,
  Server,
  GitCommit,
  FolderGit2,
  TrendingUp,
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import MetricCard from '@/components/metrics/MetricCard.vue'
import PipelineChart from '@/components/metrics/PipelineChart.vue'
import RunnersStatus from '@/components/metrics/RunnersStatus.vue'
import RecentJobs from '@/components/metrics/RecentJobs.vue'
import CommitActivity from '@/components/metrics/CommitActivity.vue'
import Spinner from '@/components/ui/Spinner.vue'
import { useMetricsStore } from '@/stores/metrics'
import { useAuthStore } from '@/stores/auth'

const metricsStore = useMetricsStore()
const authStore = useAuthStore()

let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await metricsStore.loadAllMetrics()
    
    // Set up auto-refresh
    refreshInterval = setInterval(() => {
      metricsStore.refreshMetrics()
    }, metricsStore.refreshInterval)
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
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
