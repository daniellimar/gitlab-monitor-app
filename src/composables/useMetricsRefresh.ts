import { onMounted, onUnmounted, watch } from 'vue'
import { useMetricsStore } from '@/stores/metrics'
import { useAuthStore } from '@/stores/auth'

/**
 * Carrega métricas ao montar e mantém refresh automático conforme o intervalo do store.
 */
export function useMetricsRefresh(options: { autoRefresh?: boolean } = {}) {
  const { autoRefresh = true } = options
  const metricsStore = useMetricsStore()
  const authStore = useAuthStore()

  let intervalId: ReturnType<typeof setInterval> | null = null

  function clearRefreshInterval() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function setupRefreshInterval() {
    clearRefreshInterval()
    if (!autoRefresh || !authStore.isAuthenticated) return

    intervalId = setInterval(() => {
      metricsStore.refreshMetrics()
    }, metricsStore.refreshInterval)
  }

  async function ensureMetricsLoaded() {
    if (!authStore.isAuthenticated) return
    if (!metricsStore.lastUpdated && !metricsStore.isLoading) {
      await metricsStore.loadAllMetrics()
    }
  }

  onMounted(async () => {
    await ensureMetricsLoaded()
    setupRefreshInterval()
  })

  watch(
    () => metricsStore.refreshInterval,
    () => setupRefreshInterval()
  )

  onUnmounted(clearRefreshInterval)

  return {
    ensureMetricsLoaded,
    refreshMetrics: () => metricsStore.refreshMetrics(),
  }
}
