<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterView } from 'vue-router'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Server, Filter, Tag } from 'lucide-vue-next'
import {
  getRunnerStatusIcon,
  getRunnerStatusVariant,
  getRunnerStatusLabel,
  getRunnerTypeLabel,
  getRunnerTags,
} from '@/utils/runnerStatus'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import { useMetricsStore } from '@/stores/metrics'
import DetailDrawer from '@/components/detail/DetailDrawer.vue'

const router = useRouter()
const metricsStore = useMetricsStore()

function openRunner(id: number) {
  router.push({ name: 'RunnerDetail', params: { runnerId: String(id) } })
}

const statusFilter = ref<string>('all')
const typeFilter = ref<string>('all')

const statusOptions = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'paused', label: 'Pausado' },
]

const typeOptions = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'instance_type', label: 'Shared' },
  { value: 'group_type', label: 'Group' },
  { value: 'project_type', label: 'Project' },
]

const filteredRunners = computed(() => {
  let runners = metricsStore.runners

  if (statusFilter.value === 'online') {
    runners = runners.filter((r) => r.status === 'online' && !r.paused)
  } else if (statusFilter.value === 'offline') {
    runners = runners.filter((r) => r.status === 'offline')
  } else if (statusFilter.value === 'paused') {
    runners = runners.filter((r) => r.paused)
  }

  if (typeFilter.value !== 'all') {
    runners = runners.filter((r) => r.runner_type === typeFilter.value)
  }

  return runners
})

const stats = computed(() => metricsStore.runnerStats)

function formatTime(date: string | null) {
  if (!date) return 'Nunca'
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR })
}
</script>

<template>
  <MainLayout title="Runners">
    <div class="space-y-6">
      <!-- Stats Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Total</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.total }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Online</div>
          <div class="mt-1 text-2xl font-bold text-success">{{ stats.online }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Offline</div>
          <div class="mt-1 text-2xl font-bold text-destructive">{{ stats.offline }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Pausado</div>
          <div class="mt-1 text-2xl font-bold text-warning">{{ stats.paused }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Shared</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.shared }}</div>
        </Card>
      </div>

      <!-- Top Tags -->
      <Card class="p-4">
        <h3 class="mb-4 text-sm font-medium text-foreground">Tags Mais Usadas</h3>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="tag in stats.tags.slice(0, 10)"
            :key="tag.tag"
            class="flex items-center gap-2 rounded-full bg-muted px-3 py-1"
          >
            <Tag class="h-3 w-3 text-muted-foreground" />
            <span class="text-sm text-foreground">{{ tag.tag }}</span>
            <span class="text-xs text-muted-foreground">({{ tag.count }})</span>
          </div>
        </div>
      </Card>

      <!-- Filters -->
      <Card class="p-4">
        <div class="flex flex-wrap items-center gap-4">
          <Filter class="h-5 w-5 text-muted-foreground" />
          <Select
            v-model="statusFilter"
            :options="statusOptions"
            class="w-48"
          />
          <Select
            v-model="typeFilter"
            :options="typeOptions"
            class="w-48"
          />
        </div>
      </Card>

      <!-- Runners Grid -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="runner in filteredRunners"
          :key="runner.id"
          class="cursor-pointer p-4 transition-colors hover:bg-muted/40"
          role="button"
          tabindex="0"
          @click="openRunner(runner.id)"
          @keydown.enter="openRunner(runner.id)"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'flex h-12 w-12 items-center justify-center rounded-lg',
                  runner.status === 'online' && !runner.paused ? 'bg-success/10' : 'bg-muted',
                ]"
              >
                <component
                  :is="getRunnerStatusIcon(runner)"
                  :class="[
                    'h-6 w-6',
                    runner.status === 'online' && !runner.paused
                      ? 'text-success'
                      : runner.paused
                        ? 'text-warning'
                        : 'text-destructive',
                  ]"
                />
              </div>
              <div>
                <h4 class="font-medium text-foreground">
                  {{ runner.description || `Runner #${runner.id}` }}
                </h4>
                <p class="text-sm text-muted-foreground">
                  {{ getRunnerTypeLabel(runner.runner_type) }}
                </p>
              </div>
            </div>
            <Badge :variant="getRunnerStatusVariant(runner)">
              {{ getRunnerStatusLabel(runner) }}
            </Badge>
          </div>

          <div class="mt-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">ID</span>
              <span class="font-mono text-foreground">#{{ runner.id }}</span>
            </div>
            <div v-if="runner.version" class="flex justify-between">
              <span class="text-muted-foreground">Versão</span>
              <span class="text-foreground">{{ runner.version }}</span>
            </div>
            <div v-if="runner.platform" class="flex justify-between">
              <span class="text-muted-foreground">Plataforma</span>
              <span class="text-foreground">{{ runner.platform }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Último contato</span>
              <span class="text-foreground">{{ formatTime(runner.contacted_at) }}</span>
            </div>
          </div>

          <div v-if="getRunnerTags(runner).length > 0" class="mt-4">
            <div class="flex flex-wrap gap-1">
              <Badge
                v-for="tag in getRunnerTags(runner).slice(0, 4)"
                :key="tag"
                variant="outline"
                class="text-xs"
              >
                {{ tag }}
              </Badge>
              <Badge
                v-if="getRunnerTags(runner).length > 4"
                variant="muted"
                class="text-xs"
              >
                +{{ getRunnerTags(runner).length - 4 }}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <div
        v-if="filteredRunners.length === 0"
        class="flex h-48 items-center justify-center text-muted-foreground"
      >
        <div class="text-center">
          <Server class="mx-auto mb-2 h-8 w-8" />
          <p>Nenhum runner encontrado</p>
        </div>
      </div>
    </div>

    <RouterView v-slot="{ Component }">
      <DetailDrawer v-if="Component" @close="router.back()">
        <component :is="Component" />
      </DetailDrawer>
    </RouterView>
  </MainLayout>
</template>
