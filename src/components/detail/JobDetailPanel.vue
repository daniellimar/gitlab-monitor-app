<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ExternalLink, Loader2 } from 'lucide-vue-next'
import { getJob, getJobFull } from '@/api/endpoints/jobs'
import { useMetricsStore } from '@/stores/metrics'
import { useDetailClose } from '@/composables/useDetailClose'
import { getCiStatusVariant } from '@/utils/gitlabStatus'
import { mergeApiRecords } from '@/utils/apiDataDisplay'
import ApiDataExplorer from './ApiDataExplorer.vue'
import Badge from '@/components/ui/Badge.vue'

const route = useRoute()
const metricsStore = useMetricsStore()
useDetailClose()

const projectId = computed(() => Number(route.params.projectId))
const jobId = computed(() => Number(route.params.jobId))

const job = ref<Awaited<ReturnType<typeof getJob>> | null>(null)
const apiPayload = ref<Record<string, unknown>>({})
const isLoading = ref(false)
const error = ref<string | null>(null)

const project = computed(() =>
  metricsStore.projects.find((p) => p.id === projectId.value) ?? null
)

async function load() {
  if (!projectId.value || !jobId.value) {
    error.value = 'Job inválido'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    const full = await getJobFull(projectId.value, jobId.value)
    job.value = await getJob(projectId.value, jobId.value)
    apiPayload.value = mergeApiRecords(full)
  } catch {
    error.value = 'Não foi possível carregar o job'
  } finally {
    isLoading.value = false
  }
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

onMounted(load)
watch([projectId, jobId], load)
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else-if="error" class="py-8 text-center text-destructive">{{ error }}</div>

  <div v-else-if="job" class="space-y-6">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h2 class="text-lg font-bold text-foreground">{{ job.name }}</h2>
        <p class="text-sm text-muted-foreground">
          {{ project?.name }} · stage {{ job.stage }}
        </p>
      </div>
      <Badge :variant="getCiStatusVariant(job.status)">{{ job.status }}</Badge>
    </div>

    <a
      :href="job.web_url"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
    >
      <ExternalLink class="h-4 w-4" />
      Abrir no GitLab
    </a>

    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-muted-foreground">Ref</span>
        <span class="font-mono">{{ job.ref }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Duração</span>
        <span>{{ formatDuration(job.duration) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Fila</span>
        <span>{{ formatDuration(job.queued_duration) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Tag</span>
        <span>{{ job.tag ? 'sim' : 'não' }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Allow failure</span>
        <span>{{ job.allow_failure ? 'sim' : 'não' }}</span>
      </div>
      <div v-if="job.started_at" class="flex justify-between">
        <span class="text-muted-foreground">Início</span>
        <span>{{ format(parseISO(job.started_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) }}</span>
      </div>
      <div v-if="job.finished_at" class="flex justify-between">
        <span class="text-muted-foreground">Fim</span>
        <span>{{ format(parseISO(job.finished_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) }}</span>
      </div>
      <div v-if="job.runner" class="rounded-lg border border-border p-3">
        <p class="mb-1 text-xs font-medium text-muted-foreground">Runner</p>
        <p class="text-sm">{{ job.runner.description || job.runner.name }}</p>
        <p class="text-xs text-muted-foreground">{{ job.runner.runner_type }}</p>
      </div>
      <div v-if="job.user" class="rounded-lg border border-border p-3">
        <p class="mb-1 text-xs font-medium text-muted-foreground">Usuário</p>
        <p class="text-sm">{{ job.user.name }} (@{{ job.user.username }})</p>
      </div>
    </div>

    <ApiDataExplorer :data="apiPayload" />
  </div>
</template>
