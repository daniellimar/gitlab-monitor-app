<script setup lang="ts">
import { computed } from 'vue'
import { RefreshCw, Bell, Search } from 'lucide-vue-next'
import { useMetricsStore } from '@/stores/metrics'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Dashboard',
})

const metricsStore = useMetricsStore()

const lastUpdatedFormatted = computed(() => {
  if (!metricsStore.lastUpdated) return 'Nunca atualizado'
  return format(metricsStore.lastUpdated, "HH:mm:ss", { locale: ptBR })
})

async function handleRefresh() {
  await metricsStore.refreshMetrics()
}
</script>

<template>
  <header class="flex h-16 items-center justify-between border-b border-border bg-card px-6">
    <div class="flex items-center gap-4">
      <h1 class="text-xl font-semibold text-foreground">{{ title }}</h1>
    </div>

    <div class="flex items-center gap-4">
      <!-- Search -->
      <div class="relative hidden md:block">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          class="w-64 pl-9"
        />
      </div>

      <!-- Last Updated -->
      <div class="hidden text-sm text-muted-foreground lg:block">
        Atualizado: {{ lastUpdatedFormatted }}
      </div>

      <!-- Refresh Button -->
      <Button
        variant="outline"
        size="icon"
        :loading="metricsStore.isLoading"
        @click="handleRefresh"
      >
        <RefreshCw class="h-4 w-4" />
        <span class="sr-only">Atualizar métricas</span>
      </Button>

      <!-- Notifications -->
      <Button variant="ghost" size="icon">
        <Bell class="h-4 w-4" />
        <span class="sr-only">Notificações</span>
      </Button>
    </div>
  </header>
</template>
