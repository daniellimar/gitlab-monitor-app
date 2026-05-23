<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Server, Loader2 } from 'lucide-vue-next'
import { getRunner, getRunnerFull } from '@/api/endpoints/runners'
import { useMetricsStore } from '@/stores/metrics'
import { useDetailClose } from '@/composables/useDetailClose'
import {
  getRunnerStatusLabel,
  getRunnerStatusVariant,
  getRunnerTags,
  getRunnerTypeLabel,
} from '@/utils/runnerStatus'
import { mergeApiRecords } from '@/utils/apiDataDisplay'
import ApiDataExplorer from './ApiDataExplorer.vue'
import Badge from '@/components/ui/Badge.vue'
import type { GitLabRunner } from '@/types/gitlab'

const route = useRoute()
const metricsStore = useMetricsStore()
useDetailClose()

const runnerId = computed(() => Number(route.params.runnerId))

const runner = ref<GitLabRunner | null>(null)
const apiPayload = ref<Record<string, unknown>>({})
const isLoading = ref(false)
const error = ref<string | null>(null)

const cached = computed(() =>
  metricsStore.runners.find((r) => r.id === runnerId.value) ?? null
)

async function load() {
  if (!runnerId.value) {
    error.value = 'Runner inválido'
    return
  }

  isLoading.value = true
  error.value = null
  runner.value = cached.value

  try {
    const full = await getRunnerFull(runnerId.value)
    runner.value = await getRunner(runnerId.value)
    apiPayload.value = mergeApiRecords(
      cached.value as Record<string, unknown> | undefined,
      full
    )
  } catch {
    if (!runner.value) error.value = 'Não foi possível carregar o runner'
    else apiPayload.value = mergeApiRecords(runner.value as unknown as Record<string, unknown>)
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
watch(runnerId, load)
</script>

<template>
  <div v-if="isLoading && !runner" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else-if="error && !runner" class="py-8 text-center text-destructive">{{ error }}</div>

  <div v-else-if="runner" class="space-y-6">
    <div class="flex items-center gap-3">
      <Server class="h-8 w-8 text-primary" />
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-lg font-bold">
          {{ runner.description || runner.name || `Runner #${runner.id}` }}
        </h2>
        <p class="text-sm text-muted-foreground">{{ getRunnerTypeLabel(runner.runner_type) }}</p>
      </div>
      <Badge :variant="getRunnerStatusVariant(runner)">
        {{ getRunnerStatusLabel(runner) }}
      </Badge>
    </div>

    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-muted-foreground">IP</span>
        <span>{{ runner.ip_address || '—' }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Plataforma</span>
        <span>{{ runner.platform || '—' }} {{ runner.architecture || '' }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Versão</span>
        <span>{{ runner.version || '—' }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Shared</span>
        <span>{{ runner.is_shared ? 'sim' : 'não' }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Ativo / Pausado</span>
        <span>{{ runner.active ? 'ativo' : 'inativo' }} / {{ runner.paused ? 'pausado' : 'ok' }}</span>
      </div>
      <div v-if="runner.contacted_at" class="flex justify-between">
        <span class="text-muted-foreground">Último contato</span>
        <span>{{ format(parseISO(runner.contacted_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) }}</span>
      </div>
    </div>

    <div v-if="getRunnerTags(runner).length" class="flex flex-wrap gap-1">
      <Badge v-for="tag in getRunnerTags(runner)" :key="tag" variant="outline">{{ tag }}</Badge>
    </div>

    <ApiDataExplorer :data="apiPayload" />
  </div>
</template>
