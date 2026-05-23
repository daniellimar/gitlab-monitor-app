<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { GitCommit, ExternalLink, User, Calendar, Loader2, Plus, Minus } from 'lucide-vue-next'
import { getCommit, getCommitFull, getCommitDiff } from '@/api/endpoints/commits'
import { useMetricsStore } from '@/stores/metrics'
import { useDetailClose } from '@/composables/useDetailClose'
import { mergeApiRecords } from '@/utils/apiDataDisplay'
import ApiDataExplorer from './ApiDataExplorer.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import type { GitLabCommit } from '@/types/gitlab'

const route = useRoute()
const metricsStore = useMetricsStore()
useDetailClose()

const projectId = computed(() => Number(route.params.projectId))
const sha = computed(() => String(route.params.sha))

const commit = ref<GitLabCommit | null>(null)
const apiPayload = ref<Record<string, unknown>>({})
const isLoading = ref(false)
const error = ref<string | null>(null)

const project = computed(() =>
  metricsStore.projects.find((p) => p.id === projectId.value) ?? null
)

const cached = computed(
  () =>
    metricsStore.commits.find((c) => c.id === sha.value || c.short_id === sha.value) ?? null
)

async function load() {
  if (!projectId.value || !sha.value) {
    error.value = 'Commit inválido'
    return
  }

  isLoading.value = true
  error.value = null
  commit.value = cached.value ? { ...cached.value, project_id: projectId.value } : null

  try {
    const [full, diff] = await Promise.all([
      getCommitFull(projectId.value, sha.value),
      getCommitDiff(projectId.value, sha.value).catch(() => []),
    ])
    commit.value = { ...(await getCommit(projectId.value, sha.value)), project_id: projectId.value }
    apiPayload.value = mergeApiRecords(full, {
      diff_files: diff,
      diff_file_count: diff.length,
    })
  } catch {
    if (!commit.value) {
      error.value = 'Não foi possível carregar o commit'
    } else {
      apiPayload.value = mergeApiRecords(
        commit.value as unknown as Record<string, unknown>
      )
    }
  } finally {
    isLoading.value = false
  }
}

function formatDate(date: string) {
  return format(parseISO(date), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
}

onMounted(load)
watch([projectId, sha], load)
</script>

<template>
  <div v-if="isLoading && !commit" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else-if="error && !commit" class="py-8 text-center text-destructive">
    {{ error }}
  </div>

  <div v-else-if="commit" class="space-y-6">
    <div>
      <Badge variant="outline" class="mb-2 font-mono">{{ commit.short_id }}</Badge>
      <h2 class="text-lg font-bold leading-snug text-foreground">
        {{ commit.title || 'Sem título' }}
      </h2>
      <p v-if="project" class="mt-1 text-sm text-muted-foreground">
        {{ project.path_with_namespace }}
      </p>
    </div>

    <a
      :href="commit.web_url"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
    >
      <ExternalLink class="h-4 w-4" />
      Ver no GitLab
    </a>

    <div class="space-y-3 text-sm">
      <div class="flex items-center gap-2 text-muted-foreground">
        <User class="h-4 w-4" />
        <span class="text-foreground">{{ commit.author_name }}</span>
        <span class="text-xs">({{ commit.author_email }})</span>
      </div>
      <div v-if="commit.committer_name !== commit.author_name" class="text-muted-foreground">
        Committer: {{ commit.committer_name }} ({{ commit.committer_email }})
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <Calendar class="h-4 w-4" />
        <span class="text-foreground">{{ formatDate(commit.committed_date) }}</span>
      </div>
      <div v-if="commit.authored_date !== commit.committed_date" class="text-xs text-muted-foreground">
        Autoria: {{ formatDate(commit.authored_date) }}
      </div>
    </div>

    <div v-if="commit.stats" class="grid grid-cols-3 gap-2">
      <Card class="p-3 text-center">
        <Plus class="mx-auto h-4 w-4 text-success" />
        <p class="mt-1 text-lg font-semibold text-success">+{{ commit.stats.additions }}</p>
        <p class="text-xs text-muted-foreground">adições</p>
      </Card>
      <Card class="p-3 text-center">
        <Minus class="mx-auto h-4 w-4 text-destructive" />
        <p class="mt-1 text-lg font-semibold text-destructive">-{{ commit.stats.deletions }}</p>
        <p class="text-xs text-muted-foreground">remoções</p>
      </Card>
      <Card class="p-3 text-center">
        <GitCommit class="mx-auto h-4 w-4 text-muted-foreground" />
        <p class="mt-1 text-lg font-semibold">{{ commit.stats.total }}</p>
        <p class="text-xs text-muted-foreground">total</p>
      </Card>
    </div>

    <section>
      <h3 class="mb-2 text-sm font-medium text-foreground">Mensagem completa</h3>
      <pre
        class="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed text-foreground"
      >{{ commit.message }}</pre>
    </section>

    <section v-if="commit.parent_ids?.length">
      <h3 class="mb-2 text-sm font-medium text-foreground">Pais</h3>
      <div class="flex flex-wrap gap-2">
        <Badge
          v-for="parent in commit.parent_ids"
          :key="parent"
          variant="outline"
          class="font-mono text-xs"
        >
          {{ parent }}
        </Badge>
      </div>
    </section>

    <ApiDataExplorer :data="apiPayload" />
  </div>
</template>
