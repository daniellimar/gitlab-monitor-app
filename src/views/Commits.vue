<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter, RouterView } from 'vue-router'
import { parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  GitCommit,
  User,
  ExternalLink,
  Filter,
  Calendar,
  Loader2,
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import { useMetricsStore } from '@/stores/metrics'
import { COMMIT_PERIOD_OPTIONS, parseCommitPeriodDays } from '@/constants/periods'
import DetailDrawer from '@/components/detail/DetailDrawer.vue'

const router = useRouter()
const metricsStore = useMetricsStore()

function openCommit(commit: { project_id?: number; id: string }) {
  if (!commit.project_id) return
  router.push({
    name: 'CommitDetail',
    params: { projectId: String(commit.project_id), sha: commit.id },
  })
}

const authorFilter = ref('all')
const projectFilter = ref('all')
const periodFilter = ref(String(metricsStore.commitPeriodDays))

watch(periodFilter, async (value) => {
  const days = parseCommitPeriodDays(value)
  if (days !== metricsStore.commitPeriodDays) {
    await metricsStore.setCommitPeriodDays(days)
  }
})

const authorOptions = computed(() => {
  const authors = new Set(metricsStore.commits.map((c) => c.author_name))
  return [
    { value: 'all', label: 'Todos os autores' },
    ...Array.from(authors).map((a) => ({ value: a, label: a })),
  ]
})

const projectOptions = computed(() => [
  { value: 'all', label: 'Todos os projetos' },
  ...metricsStore.projects.slice(0, 50).map((p) => ({
    value: String(p.id),
    label: p.name,
  })),
])

const filteredCommits = computed(() => {
  let list = metricsStore.commits

  if (authorFilter.value !== 'all') {
    list = list.filter((c) => c.author_name === authorFilter.value)
  }

  if (projectFilter.value !== 'all') {
    const projectId = parseInt(projectFilter.value, 10)
    list = list.filter((c) => c.project_id === projectId)
  }

  return [...list].sort(
    (a, b) => new Date(b.committed_date).getTime() - new Date(a.committed_date).getTime()
  )
})

const stats = computed(() => metricsStore.commitStats)
const periodLabel = computed(
  () => COMMIT_PERIOD_OPTIONS.find((o) => o.value === String(stats.value.periodDays))?.label ?? ''
)

function formatDate(date: string) {
  return format(parseISO(date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })
}

function truncateMessage(message: string, maxLength = 80) {
  const firstLine = message.split('\n')[0]
  if (firstLine.length <= maxLength) return firstLine
  return firstLine.substring(0, maxLength) + '...'
}
</script>

<template>
  <MainLayout title="Commits">
    <div class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Total no período</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.total }}</div>
          <p class="mt-1 text-xs text-muted-foreground">{{ periodLabel }}</p>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Commits hoje</div>
          <div class="mt-1 text-2xl font-bold text-success">{{ stats.todayCommits }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Contribuidores</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.uniqueAuthors }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Média por dia</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.avgPerDay }}</div>
        </Card>
      </div>

      <Card class="p-4">
        <h3 class="mb-4 text-sm font-medium text-foreground">Top contribuidores</h3>
        <div class="flex flex-wrap gap-4">
          <div
            v-for="(author, index) in stats.authors.slice(0, 8)"
            :key="author.name"
            class="flex items-center gap-3 rounded-lg bg-muted px-4 py-2"
          >
            <div
              :class="[
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                index === 0
                  ? 'bg-primary text-primary-foreground'
                  : index === 1
                    ? 'bg-chart-2 text-primary-foreground'
                    : index === 2
                      ? 'bg-chart-3 text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground',
              ]"
            >
              {{ author.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <p class="text-sm font-medium text-foreground">{{ author.name }}</p>
              <p class="text-xs text-muted-foreground">{{ author.count }} commits</p>
            </div>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex flex-wrap items-center gap-4">
          <Filter class="h-5 w-5 text-muted-foreground" />
          <div class="flex items-center gap-2">
            <Calendar class="h-4 w-4 text-muted-foreground" />
            <Select
              v-model="periodFilter"
              :options="[...COMMIT_PERIOD_OPTIONS]"
              class="w-44"
              :disabled="metricsStore.isLoadingCommits"
            />
          </div>
          <Select v-model="authorFilter" :options="authorOptions" class="w-56" />
          <Select v-model="projectFilter" :options="projectOptions" class="w-56" />
          <Loader2
            v-if="metricsStore.isLoadingCommits"
            class="h-4 w-4 animate-spin text-muted-foreground"
          />
        </div>
      </Card>

      <Card>
        <div class="divide-y divide-border">
          <div
            v-for="commit in filteredCommits"
            :key="commit.id"
            class="flex cursor-pointer items-start gap-4 p-4 hover:bg-muted/40"
            role="button"
            tabindex="0"
            @click="openCommit(commit)"
            @keydown.enter="openCommit(commit)"
          >
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted"
            >
              <GitCommit class="h-5 w-5 text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-foreground">
                    {{ truncateMessage(commit.title || commit.message) }}
                  </p>
                  <div class="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <User class="h-4 w-4" />
                      {{ commit.author_name }}
                    </span>
                    <span class="flex items-center gap-1">
                      <Calendar class="h-4 w-4" />
                      {{ formatDate(commit.committed_date) }}
                    </span>
                    <Badge variant="outline" class="font-mono text-xs">
                      {{ commit.short_id }}
                    </Badge>
                  </div>
                </div>
                <a
                  :href="commit.web_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex-shrink-0 text-muted-foreground hover:text-foreground"
                  @click.stop
                >
                  <ExternalLink class="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="filteredCommits.length === 0 && !metricsStore.isLoadingCommits"
          class="flex h-48 items-center justify-center text-muted-foreground"
        >
          <div class="text-center">
            <GitCommit class="mx-auto mb-2 h-8 w-8" />
            <p>Nenhum commit encontrado no período</p>
          </div>
        </div>

        <div
          v-if="metricsStore.isLoadingCommits"
          class="flex h-32 items-center justify-center text-muted-foreground"
        >
          <Loader2 class="mr-2 h-5 w-5 animate-spin" />
          Carregando commits...
        </div>
      </Card>
    </div>

    <RouterView v-slot="{ Component }">
      <DetailDrawer v-if="Component" @close="router.back()">
        <component :is="Component" />
      </DetailDrawer>
    </RouterView>
  </MainLayout>
</template>
