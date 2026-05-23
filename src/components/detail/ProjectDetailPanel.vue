<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  FolderGit2,
  ExternalLink,
  Star,
  GitFork,
  GitBranch,
  GitCommit,
  Play,
  Loader2,
} from 'lucide-vue-next'
import { getProject } from '@/api/endpoints/groups'
import { getProjectFull, getProjectLanguages } from '@/api/endpoints/projects'
import { useMetricsStore } from '@/stores/metrics'
import { useDetailClose } from '@/composables/useDetailClose'
import { getCiStatusIcon, getCiStatusVariant } from '@/utils/gitlabStatus'
import { mergeApiRecords } from '@/utils/apiDataDisplay'
import ApiDataExplorer from './ApiDataExplorer.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import type { GitLabProject } from '@/types/gitlab'

const route = useRoute()
const router = useRouter()
const metricsStore = useMetricsStore()
const { close } = useDetailClose()

const projectId = computed(() => Number(route.params.projectId))
const project = ref<GitLabProject | null>(null)
const apiPayload = ref<Record<string, unknown>>({})
const isLoading = ref(false)
const error = ref<string | null>(null)

const cached = computed(() =>
  metricsStore.projects.find((p) => p.id === projectId.value) ?? null
)

const recentPipelines = computed(() =>
  metricsStore.pipelines.filter((p) => p.project_id === projectId.value).slice(0, 6)
)

const recentCommits = computed(() =>
  metricsStore.commits.filter((c) => c.project_id === projectId.value).slice(0, 6)
)

const recentJobs = computed(() =>
  metricsStore.jobs.filter((j) => j.pipeline?.project_id === projectId.value).slice(0, 6)
)

async function load() {
  if (!projectId.value || Number.isNaN(projectId.value)) {
    error.value = 'Projeto inválido'
    return
  }

  isLoading.value = true
  error.value = null
  project.value = cached.value

  try {
    const [full, languages] = await Promise.all([
      getProjectFull(projectId.value),
      getProjectLanguages(projectId.value).catch(() => null),
    ])
    project.value = (await getProject(projectId.value)) as GitLabProject
    apiPayload.value = mergeApiRecords(
      cached.value as Record<string, unknown> | undefined,
      full,
      languages ? { languages } : undefined
    )
  } catch {
    if (!project.value) {
      error.value = 'Não foi possível carregar o projeto'
    } else {
      apiPayload.value = mergeApiRecords(
        cached.value as Record<string, unknown> | undefined,
        project.value as unknown as Record<string, unknown>
      )
    }
  } finally {
    isLoading.value = false
  }
}

function formatActivity(date: string) {
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR })
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function openCommit(commit: { project_id?: number; id: string }) {
  if (!commit.project_id) return
  router.push({
    name: 'ProjectCommitDetail',
    params: { projectId: String(commit.project_id), sha: commit.id },
  })
}

function openPipeline(pipe: { project_id: number; id: number }) {
  router.push({
    name: 'PipelineDetail',
    params: { projectId: String(pipe.project_id), pipelineId: String(pipe.id) },
  })
}

function openJob(job: { pipeline?: { project_id: number }; id: number }) {
  const pid = job.pipeline?.project_id ?? projectId.value
  router.push({
    name: 'JobDetail',
    params: { projectId: String(pid), jobId: String(job.id) },
  })
}

onMounted(load)
watch(projectId, load)
</script>

<template>
  <div v-if="isLoading && !project" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else-if="error && !project" class="py-8 text-center text-destructive">
    {{ error }}
    <Button variant="outline" class="mt-4" @click="close">Voltar</Button>
  </div>

  <div v-else-if="project" class="space-y-6">
    <div class="flex items-start gap-4">
      <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
        <img
          v-if="project.avatar_url"
          :src="project.avatar_url"
          :alt="project.name"
          class="h-14 w-14 rounded-xl object-cover"
        />
        <FolderGit2 v-else class="h-7 w-7 text-primary" />
      </div>
      <div class="min-w-0 flex-1">
        <h2 class="text-xl font-bold text-foreground">{{ project.name }}</h2>
        <p class="text-sm text-muted-foreground">{{ project.path_with_namespace }}</p>
        <p v-if="apiPayload.id" class="mt-1 font-mono text-xs text-muted-foreground">
          ID {{ apiPayload.id }}
        </p>
      </div>
    </div>

    <a
      :href="project.web_url"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
    >
      <ExternalLink class="h-4 w-4" />
      Abrir no GitLab
    </a>

    <p v-if="project.description" class="text-sm leading-relaxed text-foreground">
      {{ project.description }}
    </p>

    <div class="grid grid-cols-2 gap-3">
      <Card class="p-3">
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <Star class="h-3.5 w-3.5" />
          Estrelas
        </div>
        <p class="mt-1 text-lg font-semibold">{{ project.star_count }}</p>
      </Card>
      <Card class="p-3">
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <GitFork class="h-3.5 w-3.5" />
          Forks
        </div>
        <p class="mt-1 text-lg font-semibold">{{ project.forks_count }}</p>
      </Card>
      <Card class="p-3">
        <div class="text-xs text-muted-foreground">Issues abertas</div>
        <p class="mt-1 text-lg font-semibold">{{ project.open_issues_count }}</p>
      </Card>
      <Card class="p-3">
        <div class="text-xs text-muted-foreground">Branch padrão</div>
        <p class="mt-1 truncate text-sm font-semibold">{{ project.default_branch }}</p>
      </Card>
    </div>

    <div v-if="project.statistics" class="space-y-2 text-sm">
      <h3 class="font-medium text-foreground">Estatísticas</h3>
      <div
        v-for="(val, key) in project.statistics"
        :key="key"
        class="flex justify-between text-muted-foreground"
      >
        <span>{{ key.replace(/_/g, ' ') }}</span>
        <span class="text-foreground">
          {{ typeof val === 'number' && key.includes('size') ? formatBytes(val) : val }}
        </span>
      </div>
    </div>

    <div class="text-sm text-muted-foreground">
      Criado em {{ format(parseISO(project.created_at), "dd MMM yyyy", { locale: ptBR }) }}
      · Última atividade {{ formatActivity(project.last_activity_at) }}
    </div>

    <section v-if="recentPipelines.length">
      <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <GitBranch class="h-4 w-4" />
        Pipelines recentes
      </h3>
      <div class="space-y-2">
        <button
          v-for="pipe in recentPipelines"
          :key="pipe.id"
          type="button"
          class="flex w-full items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/40"
          @click="openPipeline(pipe)"
        >
          <div class="flex items-center gap-2">
            <component :is="getCiStatusIcon(pipe.status)" class="h-4 w-4" />
            <span class="text-sm">#{{ pipe.iid }} · {{ pipe.ref }}</span>
          </div>
          <Badge :variant="getCiStatusVariant(pipe.status)">{{ pipe.status }}</Badge>
        </button>
      </div>
    </section>

    <section v-if="recentCommits.length">
      <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <GitCommit class="h-4 w-4" />
        Commits recentes
      </h3>
      <div class="space-y-2">
        <button
          v-for="commit in recentCommits"
          :key="commit.id"
          type="button"
          class="w-full rounded-lg border border-border p-3 text-left hover:bg-muted/40"
          @click="openCommit(commit)"
        >
          <p class="truncate text-sm font-medium">{{ commit.title }}</p>
          <p class="text-xs text-muted-foreground">{{ commit.short_id }} · {{ commit.author_name }}</p>
        </button>
      </div>
    </section>

    <section v-if="recentJobs.length">
      <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Play class="h-4 w-4" />
        Jobs recentes
      </h3>
      <div class="space-y-2">
        <button
          v-for="job in recentJobs"
          :key="job.id"
          type="button"
          class="flex w-full items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/40"
          @click="openJob(job)"
        >
          <span class="truncate text-sm">{{ job.name }}</span>
          <Badge :variant="getCiStatusVariant(job.status)">{{ job.status }}</Badge>
        </button>
      </div>
    </section>

    <ApiDataExplorer :data="apiPayload" />
  </div>
</template>
