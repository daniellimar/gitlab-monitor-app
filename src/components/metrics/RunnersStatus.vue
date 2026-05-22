<script setup lang="ts">
import { computed } from 'vue'
import { Server, Wifi, WifiOff, Pause } from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import { useMetricsStore } from '@/stores/metrics'

const metricsStore = useMetricsStore()

const runners = computed(() => metricsStore.runners.slice(0, 6))
const stats = computed(() => metricsStore.runnerStats)

function getStatusIcon(runner: typeof runners.value[0]) {
  if (runner.paused) return Pause
  if (runner.status === 'online') return Wifi
  return WifiOff
}

function getStatusVariant(runner: typeof runners.value[0]): 'success' | 'destructive' | 'warning' | 'muted' {
  if (runner.paused) return 'warning'
  if (runner.status === 'online') return 'success'
  return 'destructive'
}

function getStatusLabel(runner: typeof runners.value[0]) {
  if (runner.paused) return 'Pausado'
  if (runner.status === 'online') return 'Online'
  if (runner.status === 'offline') return 'Offline'
  return runner.status
}
</script>

<template>
  <Card class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-foreground">Status dos Runners</h3>
      <div class="flex items-center gap-4 text-sm">
        <span class="flex items-center gap-1 text-success">
          <span class="h-2 w-2 rounded-full bg-success" />
          {{ stats.online }} online
        </span>
        <span class="flex items-center gap-1 text-destructive">
          <span class="h-2 w-2 rounded-full bg-destructive" />
          {{ stats.offline }} offline
        </span>
      </div>
    </div>

    <div v-if="runners.length === 0" class="flex h-48 items-center justify-center">
      <div class="text-center text-muted-foreground">
        <Server class="mx-auto mb-2 h-8 w-8" />
        <p>Nenhum runner encontrado</p>
      </div>
    </div>

    <div v-else class="grid gap-3">
      <div
        v-for="runner in runners"
        :key="runner.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3"
      >
        <div
          :class="[
            'flex h-10 w-10 items-center justify-center rounded-lg',
            runner.status === 'online' && !runner.paused ? 'bg-success/10' : 'bg-muted',
          ]"
        >
          <component
            :is="getStatusIcon(runner)"
            :class="[
              'h-5 w-5',
              runner.status === 'online' && !runner.paused
                ? 'text-success'
                : runner.paused
                  ? 'text-warning'
                  : 'text-destructive',
            ]"
          />
        </div>
        <div class="flex-1 overflow-hidden">
          <p class="truncate text-sm font-medium text-foreground">
            {{ runner.description || `Runner #${runner.id}` }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ runner.runner_type === 'instance_type' ? 'Shared' : runner.runner_type === 'group_type' ? 'Group' : 'Project' }}
            <span v-if="runner.tag_list.length > 0">
              - {{ runner.tag_list.slice(0, 2).join(', ') }}
              <span v-if="runner.tag_list.length > 2">+{{ runner.tag_list.length - 2 }}</span>
            </span>
          </p>
        </div>
        <Badge :variant="getStatusVariant(runner)">
          {{ getStatusLabel(runner) }}
        </Badge>
      </div>
    </div>
  </Card>
</template>
