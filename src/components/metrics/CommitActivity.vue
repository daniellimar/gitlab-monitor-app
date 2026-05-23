<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { HeatmapChart } from 'echarts/charts'
import {
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
} from 'echarts/components'
import Card from '@/components/ui/Card.vue'
import { useMetricsStore } from '@/stores/metrics'
import { parseISO, getDay } from 'date-fns'
import { COMMIT_PERIOD_OPTIONS } from '@/constants/periods'

use([
  CanvasRenderer,
  HeatmapChart,
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
])

const metricsStore = useMetricsStore()

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const stats = computed(() => metricsStore.commitStats)

const periodLabel = computed(
  () =>
    COMMIT_PERIOD_OPTIONS.find((o) => o.value === String(stats.value.periodDays))?.label ??
    `${stats.value.periodDays} dias`
)

const chartData = computed(() => {
  return stats.value.activity.map((day, i) => [
    Math.floor(i / 7),
    getDay(parseISO(day.date)),
    day.count,
  ])
})

const weekLabels = computed(() => {
  const weeks = Math.max(1, Math.ceil(stats.value.periodDays / 7))
  return Array.from({ length: weeks }, (_, i) => `Sem ${i + 1}`)
})

const maxCommits = computed(() => {
  return Math.max(...chartData.value.map((d) => d[2] as number), 1)
})

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    position: 'top',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textStyle: { color: '#fff' },
    formatter: (params: { data: number[] }) => `${params.data[2]} commits`,
  },
  grid: {
    left: '10%',
    right: '5%',
    top: '10%',
    bottom: '10%',
  },
  xAxis: {
    type: 'category',
    data: weekLabels.value,
    splitArea: { show: true },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#888', fontSize: 10 },
  },
  yAxis: {
    type: 'category',
    data: weekDays,
    splitArea: { show: true },
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#888', fontSize: 10 },
  },
  visualMap: {
    show: false,
    min: 0,
    max: maxCommits.value,
    inRange: {
      color: ['#1a1a2e', '#2dd4bf'],
    },
  },
  series: [
    {
      type: 'heatmap',
      data: chartData.value,
      label: { show: false },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
    },
  ],
}))
</script>

<template>
  <Card class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-foreground">Atividade de commits</h3>
      <div class="text-sm text-muted-foreground">
        {{ stats.total }} commits ({{ periodLabel }})
      </div>
    </div>

    <VChart :option="chartOption" autoresize style="height: 200px" />

    <div class="mt-4 border-t border-border pt-4">
      <h4 class="mb-3 text-sm font-medium text-foreground">Top contribuidores</h4>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="(author, index) in stats.authors.slice(0, 5)"
          :key="author.name"
          class="flex items-center gap-2 rounded-full bg-muted px-3 py-1"
        >
          <div
            :class="[
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
              index === 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground',
            ]"
          >
            {{ author.name.charAt(0).toUpperCase() }}
          </div>
          <span class="text-sm text-foreground">{{ author.name.split(' ')[0] }}</span>
          <span class="text-xs text-muted-foreground">{{ author.count }}</span>
        </div>
      </div>
    </div>
  </Card>
</template>
