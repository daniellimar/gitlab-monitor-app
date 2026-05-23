<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ExternalLink, Loader2, Play } from 'lucide-vue-next'
import { getPipeline, getPipelineFull } from '@/api/endpoints/pipelines'
import { getPipelineJobs } from '@/api/endpoints/jobs'
import { useMetricsStore } from '@/stores/metrics'
import { useDetailClose } from '@/composables/useDetailClose'
import { getCiStatusIcon, getCiStatusVariant } from '@/utils/gitlabStatus'
import { mergeApiRecords } from '@/utils/apiDataDisplay'
import ApiDataExplorer from './ApiDataExplorer.vue'
import Badge from '@/components/ui/Badge.vue'

const route = useRoute()
const router = useRouter()
const metricsStore = useMetricsStore()
useDetailClose()

const projectId = computed(() => Number(route.params.projectId))
const pipelineId = computed(() => Number(route.params.pipelineId))

const pipeline = ref<Awaited<ReturnType<typeof getPipeline>> | null>(null)
const apiPayload = ref<Record<string, unknown>>({})
const jobs = ref<Record<string, unknown>[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const project = computed(() =>
  metricsStore.projects.find((p) => p.id === projectId.value) ?? null
)

async function load() {
  if (!projectId.value || !pipelineId.value) {
    error.value = 'Pipeline inválida'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    const [full, jobList] = await Promise.all([
      getPipelineFull(projectId.value, pipelineId.value),
      getPipelineJobs(projectId.value, pipelineId.value, { perPage: 50 }).catch(() => ({
        data: [],
      })),
    ])
    pipeline.value = await getPipeline(projectId.value, pipelineId.value)
    jobs.value = jobList.data as unknown as Record<string, unknown>[]
    apiPayload.value = mergeApiRecords(full, {
      jobs: jobList.data,
      jobs_count: jobList.data.length,
    })
  } catch {
    error.value = 'Não foi possível carregar a pipeline'
  } finally {
    isLoading.value = false
  }
}

function openJob(job: { id: number }) {
  router.push({
    name: 'JobDetail',
    params: { projectId: String(projectId.value), jobId: String(job.id) },
  })
}

function formatDuration(seconds?: number) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

onMounted(load)
watch([projectId, pipelineId], load)
</script>

<template>
  <div v-if="isLoading" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else-if="error" class="py-8 text-center text-destructive">{{ error }}</div>

  <div v-else-if="pipeline" class="space-y-6">
    <div class="flex items-center gap-3">
      <component :is="getCiStatusIcon(pipeline.status)" class="h-8 w-8" />
      <div>
        <h2 class="text-xl font-bold">Pipeline #{{ pipeline.iid }}</h2>
        <p class="text-sm text-muted-foreground">
          {{ project?.name }} · {{ pipeline.ref }}
        </p>
      </div>
      <Badge :variant="getCiStatusVariant(pipeline.status)" class="ml-auto">
        {{ pipeline.status }}
      </Badge>
    </div>

    <a
      :href="pipeline.web_url"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
    >
      <ExternalLink class="h-4 w-4" />
      Abrir no GitLab
    </a>

    <div class="grid grid-cols-2 gap-2 text-sm">
      <div class="rounded-lg border border-border p-3">
        <span class="text-muted-foreground">SHA</span>
        <p class="mt-1 truncate font-mono text-xs">{{ pipeline.sha }}</p>
      </div>
      <div class="rounded-lg border border-border p-3">
        <span class="text-muted-foreground">Duração</span>
        <p class="mt-1 font-medium">{{ formatDuration(pipeline.duration) }}</p>
      </div>
      <div class="rounded-lg border border-border p-3">
        <span class="text-muted-foreground">Fonte</span>
        <p class="mt-1 font-medium">{{ pipeline.source }}</p>
      </div>
      <div v-if="pipeline.coverage" class="rounded-lg border border-border p-3">
        <span class="text-muted-foreground">Coverage</span>
        <p class="mt-1 font-medium">{{ pipeline.coverage }}</p>
      </div>
    </div>

    <p class="text-xs text-muted-foreground">
      Criada {{ format(parseISO(pipeline.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) }}
      · Atualizada
      {{ format(parseISO(pipeline.updated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) }}
    </p>

    <section v-if="jobs.length">
      <h3 class="mb-2 flex items-center gap-2 text-sm font-medium">
        <Play class="h-4 w-4" />
        Jobs ({{ jobs.length }})
      </h3>
      <div class="max-h-48 space-y-1 overflow-auto">
        <button
          v-for="job in jobs"
          :key="String(job.id)"
          type="button"
          class="flex w-full items-center justify-between rounded border border-border px-3 py-2 text-left text-sm hover:bg-muted/40"
          @click="openJob(job as { id: number })"
        >
          <span class="truncate">{{ job.name }}</span>
          <Badge variant="outline">{{ job.status }}</Badge>
        </button>
      </div>
    </section>

    <ApiDataExplorer :data="apiPayload" />
  </div>
</template>
