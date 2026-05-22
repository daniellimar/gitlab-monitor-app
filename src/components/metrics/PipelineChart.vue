<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components'
import Card from '@/components/ui/Card.vue'
import { useMetricsStore } from '@/stores/metrics'
import { format, subDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
])

const metricsStore = useMetricsStore()
const chartType = ref<'line' | 'bar'>('line')

const chartData = computed(() => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    return format(date, 'yyyy-MM-dd')
  })

  const pipelinesByDate = metricsStore.pipelines.reduce(
    (acc, pipeline) => {
      const date = format(parseISO(pipeline.created_at), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = { success: 0, failed: 0, canceled: 0, running: 0 }
      }
      if (pipeline.status === 'success') acc[date].success++
      else if (pipeline.status === 'failed') acc[date].failed++
      else if (pipeline.status === 'canceled') acc[date].canceled++
      else if (pipeline.status === 'running') acc[date].running++
      return acc
    },
    {} as Record<string, { success: number; failed: number; canceled: number; running: number }>
  )

  return last7Days.map((date) => ({
    date,
    label: format(parseISO(date), 'EEE', { locale: ptBR }),
    ...pipelinesByDate[date] || { success: 0, failed: 0, canceled: 0, running: 0 },
  }))
})

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textStyle: { color: '#fff' },
  },
  legend: {
    data: ['Sucesso', 'Falha', 'Cancelado'],
    textStyle: { color: '#888' },
    bottom: 0,
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '15%',
    top: '10%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    boundaryGap: chartType.value === 'bar',
    data: chartData.value.map((d) => d.label),
    axisLine: { lineStyle: { color: '#333' } },
    axisLabel: { color: '#888' },
  },
  yAxis: {
    type: 'value',
    axisLine: { lineStyle: { color: '#333' } },
    axisLabel: { color: '#888' },
    splitLine: { lineStyle: { color: '#222' } },
  },
  series: [
    {
      name: 'Sucesso',
      type: chartType.value,
      smooth: true,
      data: chartData.value.map((d) => d.success),
      itemStyle: { color: '#4ade80' },
      areaStyle: chartType.value === 'line' ? { opacity: 0.1 } : undefined,
    },
    {
      name: 'Falha',
      type: chartType.value,
      smooth: true,
      data: chartData.value.map((d) => d.failed),
      itemStyle: { color: '#f87171' },
      areaStyle: chartType.value === 'line' ? { opacity: 0.1 } : undefined,
    },
    {
      name: 'Cancelado',
      type: chartType.value,
      smooth: true,
      data: chartData.value.map((d) => d.canceled),
      itemStyle: { color: '#fbbf24' },
      areaStyle: chartType.value === 'line' ? { opacity: 0.1 } : undefined,
    },
  ],
}))
</script>

<template>
  <Card class="p-6">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-foreground">Pipelines - Últimos 7 dias</h3>
      <div class="flex rounded-lg bg-muted p-1">
        <button
          :class="[
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            chartType === 'line'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="chartType = 'line'"
        >
          Linha
        </button>
        <button
          :class="[
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            chartType === 'bar'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="chartType = 'bar'"
        >
          Barra
        </button>
      </div>
    </div>
    <VChart :option="chartOption" autoresize style="height: 300px" />
  </Card>
</template>
