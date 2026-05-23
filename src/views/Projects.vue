<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  FolderGit2,
  ExternalLink,
  Filter,
  Search,
  Star,
  GitFork,
  CircleDot,
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import Input from '@/components/ui/Input.vue'
import { useMetricsStore } from '@/stores/metrics'

const metricsStore = useMetricsStore()

const searchQuery = ref('')
const sortBy = ref('last_activity_at')

const sortOptions = [
  { value: 'last_activity_at', label: 'Última atividade' },
  { value: 'name', label: 'Nome (A–Z)' },
  { value: 'stars', label: 'Mais estrelas' },
  { value: 'commits', label: 'Mais commits' },
]

const filteredProjects = computed(() => {
  let list = [...metricsStore.projects]
  const q = searchQuery.value.trim().toLowerCase()

  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.path_with_namespace.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
    )
  }

  list.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'stars':
        return b.star_count - a.star_count
      case 'commits':
        return (b.statistics?.commit_count ?? 0) - (a.statistics?.commit_count ?? 0)
      case 'last_activity_at':
      default:
        return (
          new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
        )
    }
  })

  return list
})

const stats = computed(() => ({
  total: metricsStore.projects.length,
  withCi: metricsStore.projects.filter((p) => p.statistics?.commit_count).length,
  totalStars: metricsStore.projects.reduce((s, p) => s + p.star_count, 0),
  openIssues: metricsStore.projects.reduce((s, p) => s + p.open_issues_count, 0),
}))

function formatActivity(date: string) {
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR })
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
</script>

<template>
  <MainLayout title="Projetos">
    <div class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Total de projetos</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.total }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Com estatísticas</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.withCi }}</div>
        </Card>
        <Card class="p-4">
          <div class="flex items-center gap-1 text-sm text-muted-foreground">
            <Star class="h-4 w-4" />
            Estrelas
          </div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.totalStars }}</div>
        </Card>
        <Card class="p-4">
          <div class="flex items-center gap-1 text-sm text-muted-foreground">
            <CircleDot class="h-4 w-4" />
            Issues abertas
          </div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.openIssues }}</div>
        </Card>
      </div>

      <Card class="p-4">
        <div class="flex flex-wrap items-center gap-4">
          <Filter class="h-5 w-5 text-muted-foreground" />
          <div class="relative min-w-[200px] flex-1">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input v-model="searchQuery" placeholder="Buscar projeto..." class="pl-9" />
          </div>
          <Select v-model="sortBy" :options="sortOptions" class="w-48" />
        </div>
      </Card>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card
          v-for="project in filteredProjects"
          :key="project.id"
          class="p-4 transition-colors hover:bg-muted/20"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-1 items-start gap-3">
              <div
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10"
              >
                <img
                  v-if="project.avatar_url"
                  :src="project.avatar_url"
                  :alt="project.name"
                  class="h-10 w-10 rounded-lg object-cover"
                />
                <FolderGit2 v-else class="h-5 w-5 text-primary" />
              </div>
              <div class="min-w-0">
                <h3 class="truncate font-semibold text-foreground">{{ project.name }}</h3>
                <p class="truncate text-xs text-muted-foreground">
                  {{ project.path_with_namespace }}
                </p>
              </div>
            </div>
            <a
              :href="project.web_url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink class="h-4 w-4" />
            </a>
          </div>

          <p
            v-if="project.description"
            class="mt-3 line-clamp-2 text-sm text-muted-foreground"
          >
            {{ project.description }}
          </p>

          <div class="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span class="flex items-center gap-1">
              <Star class="h-3.5 w-3.5" />
              {{ project.star_count }}
            </span>
            <span class="flex items-center gap-1">
              <GitFork class="h-3.5 w-3.5" />
              {{ project.forks_count }}
            </span>
            <Badge variant="outline">{{ project.default_branch }}</Badge>
          </div>

          <div class="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            <div class="flex justify-between">
              <span>Última atividade</span>
              <span class="text-foreground">{{ formatActivity(project.last_activity_at) }}</span>
            </div>
            <div v-if="project.statistics" class="flex justify-between">
              <span>Commits</span>
              <span class="text-foreground">{{ project.statistics.commit_count }}</span>
            </div>
            <div v-if="project.statistics?.repository_size" class="flex justify-between">
              <span>Repositório</span>
              <span class="text-foreground">
                {{ formatBytes(project.statistics.repository_size) }}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card
        v-if="filteredProjects.length === 0"
        class="flex h-48 items-center justify-center text-muted-foreground"
      >
        <div class="text-center">
          <FolderGit2 class="mx-auto mb-2 h-8 w-8" />
          <p>Nenhum projeto encontrado</p>
        </div>
      </Card>
    </div>
  </MainLayout>
</template>
