<script setup lang="ts">
import { computed } from 'vue'
import type { LucideIcon } from 'lucide-vue-next'
import Card from '@/components/ui/Card.vue'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})

const iconColorClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'destructive':
      return 'text-destructive'
    default:
      return 'text-primary'
  }
})

const iconBgClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-success/10'
    case 'warning':
      return 'bg-warning/10'
    case 'destructive':
      return 'bg-destructive/10'
    default:
      return 'bg-primary/10'
  }
})
</script>

<template>
  <Card class="p-6">
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <p class="text-sm font-medium text-muted-foreground">{{ title }}</p>
        <p class="mt-2 text-3xl font-bold text-foreground">{{ value }}</p>
        <div v-if="subtitle || trend" class="mt-2 flex items-center gap-2">
          <span v-if="subtitle" class="text-sm text-muted-foreground">
            {{ subtitle }}
          </span>
          <span
            v-if="trend"
            :class="[
              'flex items-center text-xs font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive',
            ]"
          >
            <svg
              :class="['h-3 w-3', !trend.isPositive && 'rotate-180']"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            {{ Math.abs(trend.value) }}%
          </span>
        </div>
      </div>
      <div :class="['flex h-12 w-12 items-center justify-center rounded-lg', iconBgClass]">
        <component :is="icon" :class="['h-6 w-6', iconColorClass]" />
      </div>
    </div>
  </Card>
</template>
