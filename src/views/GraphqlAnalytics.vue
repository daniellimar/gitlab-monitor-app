<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Braces,
  Play,
  Filter,
  Database,
  GitMerge,
  Rocket,
  GitBranch,
} from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Select from '@/components/ui/Select.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'

import { useMetricsStore } from '@/stores/metrics'
import { useGraphqlAnalyticsStore } from '@/stores/graphqlAnalytics'

import {
  buildProjectAnalyticsQuery,
  getAvailableFragments,
} from '@/graphql/builder/queryBuilder'

import type { MetricKey } from '@/types/graphql'
import type { AnalyticsFilters } from '@/graphql/filters/engine'

const metricsStore = useMetricsStore()
const graphqlStore = useGraphqlAnalyticsStore()

const scope = ref<'group' | 'project'>('group')

const targetProjectPath = ref<string>('')
const first = ref<string>('50')

const periodFrom = ref<string>('')
const periodTo = ref<string>('')

const deploymentStatus = ref<string>('all')
const mergeRequestStatus = ref<string>('all')

const selectedMetrics = ref<MetricKey[]>([
  'mergeRequests',
  'pipelines',
])

const metricOptions: { value: MetricKey; label: string }[] = [
  { value: 'pipelines', label: 'Pipelines' },
  { value: 'mergeRequests', label: 'Merge Requests' },
  { value: 'commits', label: 'Commits' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'environments', label: 'Environments' },
]

const projectOptions = computed(() => [
  { value: '', label: 'Selecione um projeto' },
  ...metricsStore.projects.map((project) => ({
    value: project.path_with_namespace,
    label: project.path_with_namespace,
  })),
])

const groupPath = computed(
    () => metricsStore.group?.full_path || ''
)

const availableFragments = computed(() =>
    getAvailableFragments()
)

function toggleMetric(metric: MetricKey) {
  if (selectedMetrics.value.includes(metric)) {
    selectedMetrics.value = selectedMetrics.value.filter(
        (item) => item !== metric
    )

    return
  }

  selectedMetrics.value = [
    ...selectedMetrics.value,
    metric,
  ]
}

const resolvedFilters = computed<AnalyticsFilters>(() => ({
  period:
      periodFrom.value || periodTo.value
          ? {
            from: periodFrom.value || undefined,
            to: periodTo.value || undefined,
          }
          : undefined,

  deploymentStatus:
      deploymentStatus.value !== 'all'
          ? [deploymentStatus.value]
          : undefined,

  mergeRequestStatus:
      mergeRequestStatus.value !== 'all'
          ? [mergeRequestStatus.value]
          : undefined,
}))

/**
 * Remove métricas incompatíveis com Group
 */
const normalizedMetrics = computed<MetricKey[]>(() => {
  if (scope.value === 'project') {
    return selectedMetrics.value
  }

  /**
   * Group NÃO suporta diretamente:
   * - deployments
   * - mergeRequests
   * - jobs
   * - environments
   *
   * Isso precisa vir via projects.nodes[]
   */

  return selectedMetrics.value
})

const builtQueryPreview = computed(() => {
  if (normalizedMetrics.value.length === 0) {
    return {
      query: '',
      fragments: [] as string[],
    }
  }

  return buildProjectAnalyticsQuery({
    projectPath:
        scope.value === 'project'
            ? targetProjectPath.value
            : undefined,

    groupPath:
        scope.value === 'group'
            ? groupPath.value
            : undefined,

    filters: {
      pipelines: [],
      mergeRequests: [],
      commits: [],
    },

    metrics: normalizedMetrics.value,

    pagination: {
      first: Number(first.value) || 50,
      after: null,
    },
  })
})

async function runQueryBuilder() {
  if (normalizedMetrics.value.length === 0) {
    return
  }

  graphqlStore.clearFilters()

  graphqlStore.setFilters(
      resolvedFilters.value
  )

  await graphqlStore.loadDashboard({
    projectPath:
        scope.value === 'project'
            ? targetProjectPath.value
            : undefined,

    groupPath:
        scope.value === 'group'
            ? groupPath.value
            : undefined,

    metrics: normalizedMetrics.value,

    pagination: {
      first: Number(first.value) || 50,
      after: null,
    },
  })
}

/**
 * Payload raiz
 */
const rootData = computed<any>(() => {
  const payload =
      graphqlStore.dashboardData as any

  if (!payload) {
    return null
  }

  return (
      payload.projectData ||
      payload.groupData ||
      null
  )
})

/**
 * Detecta se payload é de GROUP
 */
const isGroupScopePayload = computed(() => {
  return Boolean(rootData.value?.projects?.nodes)
})

/**
 * Lista de projetos do grupo
 */
const groupProjects = computed<any[]>(() => {
  if (!isGroupScopePayload.value) {
    return []
  }

  return (
      rootData.value?.projects?.nodes || []
  )
})

/**
 * Pipelines
 */
const pipelines = computed<any[]>(() => {
  if (!rootData.value) {
    return []
  }

  /**
   * PROJECT
   */
  if (rootData.value?.pipelines?.nodes) {
    return rootData.value.pipelines.nodes
  }

  /**
   * GROUP
   */
  return groupProjects.value.flatMap(
      (project: any) =>
          project?.pipelines?.nodes || []
  )
})

/**
 * Deployments
 */
const deployments = computed<any[]>(() => {
  if (!rootData.value) {
    return []
  }

  /**
   * PROJECT
   */
  if (rootData.value?.deployments?.nodes) {
    return rootData.value.deployments.nodes
  }

  /**
   * GROUP
   */
  return groupProjects.value.flatMap(
      (project: any) =>
          project?.deployments?.nodes?.map(
              (deployment: any) => ({
                ...deployment,
                projectName: project.name,
              })
          ) || []
  )
})

/**
 * Merge Requests
 */
const mergeRequests = computed<any[]>(() => {
  if (!rootData.value) {
    return []
  }

  /**
   * PROJECT
   */
  if (rootData.value?.mergeRequests?.nodes) {
    return rootData.value.mergeRequests.nodes
  }

  /**
   * GROUP
   */
  return groupProjects.value.flatMap(
      (project: any) =>
          project?.mergeRequests?.nodes?.map(
              (mr: any) => ({
                ...mr,
                projectName: project.name,
              })
          ) || []
  )
})

/**
 * Jobs
 */
const jobs = computed<any[]>(() => {
  if (!rootData.value) {
    return []
  }

  if (rootData.value?.jobs?.nodes) {
    return rootData.value.jobs.nodes
  }

  return groupProjects.value.flatMap(
      (project: any) =>
          project?.jobs?.nodes || []
  )
})

/**
 * Environments
 */
const environments = computed<any[]>(() => {
  if (!rootData.value) {
    return []
  }

  if (rootData.value?.environments?.nodes) {
    return rootData.value.environments.nodes
  }

  return groupProjects.value.flatMap(
      (project: any) =>
          project?.environments?.nodes || []
  )
})

/**
 * Commit
 */
const commit = computed<any | null>(() => {
  return (
      rootData.value?.repository?.tree
          ?.lastCommit || null
  )
})

/**
 * Erros GraphQL amigáveis
 */
// const graphqlErrors = computed(() => {
//   const error = graphqlStore.error
//
//   if (!error) {
//     return []
//   }
//
//   if (Array.isArray(error)) {
//     return error
//   }
//
//   return [error]
// })
</script>

<template>
  <MainLayout title="GraphQL Analytics">
    <div class="space-y-6">
      <Card class="p-4">
        <div class="grid gap-4 lg:grid-cols-6">
          <div class="lg:col-span-1">
            <p class="mb-2 text-sm text-muted-foreground">Escopo</p>
            <Select
              v-model="scope"
              :options="[
                { value: 'group', label: 'Grupo' },
                { value: 'project', label: 'Projeto' },
              ]"
            />
          </div>

          <div class="lg:col-span-3">
            <p class="mb-2 text-sm text-muted-foreground">Projeto alvo</p>
            <Select v-model="targetProjectPath" :options="projectOptions" :disabled="scope === 'group'" />
          </div>

          <div>
            <p class="mb-2 text-sm text-muted-foreground">First</p>
            <Input v-model="first" type="number" placeholder="50" />
          </div>

          <div class="flex items-end">
            <Button class="w-full" :loading="graphqlStore.isLoading" @click="runQueryBuilder">
              <Play class="h-4 w-4" />
              Executar Query Builder
            </Button>
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter class="h-4 w-4" />
          Filtros GraphQL
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p class="mb-2 text-sm text-muted-foreground">Período inicial</p>
            <Input v-model="periodFrom" type="date" />
          </div>
          <div>
            <p class="mb-2 text-sm text-muted-foreground">Período final</p>
            <Input v-model="periodTo" type="date" />
          </div>
          <div>
            <p class="mb-2 text-sm text-muted-foreground">Status deployment</p>
            <Select
              v-model="deploymentStatus"
              :options="[
                { value: 'all', label: 'Todos' },
                { value: 'success', label: 'success' },
                { value: 'failed', label: 'failed' },
                { value: 'running', label: 'running' },
              ]"
            />
          </div>
          <div>
            <p class="mb-2 text-sm text-muted-foreground">Status MR</p>
            <Select
              v-model="mergeRequestStatus"
              :options="[
                { value: 'all', label: 'Todos' },
                { value: 'opened', label: 'opened' },
                { value: 'merged', label: 'merged' },
                { value: 'closed', label: 'closed' },
              ]"
            />
          </div>
        </div>
      </Card>

      <Card class="p-4">
        <div class="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <Braces class="h-4 w-4" />
          Métricas para montar a query
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="metric in metricOptions"
            :key="metric.value"
            class="rounded-md border px-3 py-1.5 text-sm"
            :class="selectedMetrics.includes(metric.value) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'"
            @click="toggleMetric(metric.value)"
          >
            {{ metric.label }}
          </button>
        </div>
      </Card>

      <div class="grid gap-4 lg:grid-cols-3">
        <Card class="p-4 lg:col-span-2">
          <div class="mb-2 text-sm font-semibold text-foreground">Query gerada</div>
          <pre class="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">{{ builtQueryPreview.query }}</pre>
        </Card>

        <Card class="p-4">
          <div class="mb-2 text-sm font-semibold text-foreground">Fragments</div>
          <div class="space-y-2 text-sm">
            <div
              v-for="name in availableFragments"
              :key="name"
              class="rounded border border-border px-2 py-1"
              :class="builtQueryPreview.fragments?.includes(name) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'"
            >
              {{ name }}
            </div>
          </div>
        </Card>
      </div>

      <Card class="p-4">
        <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Database class="h-4 w-4" />
          Resultado GraphQL
        </div>
        <div v-if="graphqlStore.error" class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {{ graphqlStore.error }}
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div class="rounded-lg border border-border p-3">
            <div class="text-xs text-muted-foreground">Pipelines</div>
            <div class="text-2xl font-semibold text-foreground">{{ pipelines.length }}</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-xs text-muted-foreground">Deployments</div>
            <div class="text-2xl font-semibold text-foreground">{{ deployments.length }}</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-xs text-muted-foreground">Merge Requests</div>
            <div class="text-2xl font-semibold text-foreground">{{ mergeRequests.length }}</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-xs text-muted-foreground">Jobs</div>
            <div class="text-2xl font-semibold text-foreground">{{ jobs.length }}</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-xs text-muted-foreground">Environments</div>
            <div class="text-2xl font-semibold text-foreground">{{ environments.length }}</div>
          </div>
          <div class="rounded-lg border border-border p-3">
            <div class="text-xs text-muted-foreground">Commit</div>
            <div class="truncate text-sm font-semibold text-foreground">{{ commit?.shortId || '-' }}</div>
          </div>
        </div>
      </Card>

      <div class="grid gap-4 lg:grid-cols-2">
        <Card class="p-4">
          <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Rocket class="h-4 w-4" />
            Deployments
          </div>
          <div class="max-h-72 overflow-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 text-left text-muted-foreground">ID</th>
                  <th class="py-2 text-left text-muted-foreground">Status</th>
                  <th class="py-2 text-left text-muted-foreground">Ref</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in deployments.slice(0, 20)" :key="item.id" class="border-b border-border/50">
                  <td class="py-2 text-foreground">{{ item.id }}</td>
                  <td class="py-2 text-muted-foreground">{{ item.status }}</td>
                  <td class="py-2 text-muted-foreground">{{ item.ref }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card class="p-4">
          <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <GitMerge class="h-4 w-4" />
            Merge Requests
          </div>
          <div class="max-h-72 overflow-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="py-2 text-left text-muted-foreground">IID</th>
                  <th class="py-2 text-left text-muted-foreground">Estado</th>
                  <th class="py-2 text-left text-muted-foreground">Título</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in mergeRequests.slice(0, 20)" :key="item.id" class="border-b border-border/50">
                  <td class="py-2 text-foreground">{{ item.iid }}</td>
                  <td class="py-2 text-muted-foreground">{{ item.state }}</td>
                  <td class="truncate py-2 text-muted-foreground">{{ item.title }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card class="p-4">
        <div class="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <GitBranch class="h-4 w-4" />
          Payload bruto
        </div>
        <pre class="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">{{ JSON.stringify(graphqlStore.dashboardData, null, 2) }}</pre>
      </Card>
    </div>
  </MainLayout>
</template>
