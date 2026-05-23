<script setup lang="ts">
import { computed } from 'vue'
import { GitBranch } from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import { useMetricsStore } from '@/stores/metrics'
import { getCiStatusIcon, getCiStatusVariant } from '@/utils/gitlabStatus'

const metricsStore = useMetricsStore()

const recentJobs = computed(() => metricsStore.jobs.slice(0, 8))

function formatDuration(seconds: number | null) {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}
</script>

<template>
  <Card class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-foreground">Jobs Recentes</h3>
      <RouterLink
          to="/jobs"
          class="text-sm text-primary hover:underline"
      >
        Ver todos
      </RouterLink>
    </div>

    <div v-if="recentJobs.length === 0" class="flex h-48 items-center justify-center">
      <div class="text-center text-muted-foreground">
        <Play class="mx-auto mb-2 h-8 w-8" />
        <p>Nenhum job encontrado</p>
      </div>
    </div>

    <div v-else class="space-y-2">
      <div
          v-for="job in recentJobs"
          :key="job.id"
          class="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
      >
        <component
            :is="getCiStatusIcon(job.status)"
            :class="[
            'h-5 w-5 flex-shrink-0',
            job.status === 'success' ? 'text-success' :
            job.status === 'failed' ? 'text-destructive' :
            job.status === 'running' ? 'text-primary animate-pulse' :
            'text-muted-foreground',
          ]"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-foreground">{{ job.name }}</p>
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <span class="flex items-center gap-1">
              <GitBranch class="h-3 w-3" />
              {{ job.ref }}
            </span>
            <span>{{ job.stage }}</span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1">
          <Badge :variant="getCiStatusVariant(job.status)" class="text-xs">
            {{ job.status }}
          </Badge>
          <span class="text-xs text-muted-foreground">
            {{ formatDuration(job.duration) }}
          </span>
        </div>
      </div>
    </div>
  </Card>
</template>
