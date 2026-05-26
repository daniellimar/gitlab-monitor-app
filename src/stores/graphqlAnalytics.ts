// stores/graphqlAnalytics.ts

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import analyticsRegistry from '@/graphql/registry'

import {
    combineFilters,
    loadPersistedFilters,
    persistFilters,
    type AnalyticsFilters,
} from '@/graphql/filters/engine'

import type {
    DoraAnalyticsResult,
    MetricKey,
} from '@/types/graphql'

import type {
    GitLabCommit,
} from '@/types/gitlab'

export const useGraphqlAnalyticsStore =
    defineStore(
        'graphql-analytics',
        () => {
            /**
             * Filters
             */
            const filters =
                ref<AnalyticsFilters>(
                    loadPersistedFilters()
                )

            /**
             * Loading
             */
            const isLoading =
                ref(false)

            /**
             * Error
             */
            const error =
                ref<string | null>(null)

            /**
             * Last update
             */
            const lastUpdated =
                ref<Date | null>(null)

            /**
             * Raw payload GraphQL
             */
            const dashboardData =
                ref<
                    Record<
                        string,
                        unknown
                    > | null
                >(null)

            /**
             * DORA payload
             */
            const doraData =
                ref<DoraAnalyticsResult | null>(
                    null
                )

            /**
             * Query metadata
             */
            const lastQuery =
                ref<string>('')

            const lastVariables =
                ref<
                    Record<
                        string,
                        unknown
                    >
                >({})

            /**
             * Complexity
             */
            const estimatedComplexity =
                ref(0)

            /**
             * Scope
             */
            const currentScope =
                ref<
                    'project' | 'group'
                >('project')

            /**
             * Errors GraphQL detalhados
             */
            const graphqlErrors =
                ref<any[]>([])

            /**
             * Filters ativos
             */
            const hasFilters =
                computed(
                    () =>
                        Object.keys(
                            filters.value
                        ).length > 0
                )

            /**
             * Payload normalizado
             */
            const rootData =
                computed<any>(() => {
                    if (
                        !dashboardData.value
                    ) {
                        return null
                    }

                    return (
                        (
                            dashboardData.value as any
                        )?.projectData ||
                        (
                            dashboardData.value as any
                        )?.groupData ||
                        null
                    )
                })

            /**
             * GROUP payload?
             */
            const isGroupScopePayload =
                computed(() =>
                    Boolean(
                        rootData.value
                            ?.projects?.nodes
                    )
                )

            /**
             * Projetos do group
             */
            const groupProjects =
                computed<any[]>(() => {
                    if (
                        !isGroupScopePayload.value
                    ) {
                        return []
                    }

                    return (
                        rootData.value
                            ?.projects?.nodes ||
                        []
                    )
                })

            /**
             * Deployments normalizados
             */
            const deployments =
                computed<any[]>(() => {
                    if (
                        !rootData.value
                    ) {
                        return []
                    }

                    /**
                     * PROJECT
                     */
                    if (
                        rootData.value
                            ?.deployments
                            ?.nodes
                    ) {
                        return (
                            rootData.value
                                .deployments
                                .nodes || []
                        )
                    }

                    /**
                     * GROUP
                     */
                    return groupProjects.value.flatMap(
                        (
                            project: any
                        ) =>
                            project?.deployments?.nodes?.map(
                                (
                                    deployment: any
                                ) => ({
                                    ...deployment,
                                    projectName:
                                    project.name,
                                    projectPath:
                                    project.fullPath,
                                })
                            ) || []
                    )
                })

            /**
             * Merge requests normalizados
             */
            const mergeRequests =
                computed<any[]>(() => {
                    if (
                        !rootData.value
                    ) {
                        return []
                    }

                    /**
                     * PROJECT
                     */
                    if (
                        rootData.value
                            ?.mergeRequests
                            ?.nodes
                    ) {
                        return (
                            rootData.value
                                .mergeRequests
                                .nodes || []
                        )
                    }

                    /**
                     * GROUP
                     */
                    return groupProjects.value.flatMap(
                        (
                            project: any
                        ) =>
                            project?.mergeRequests?.nodes?.map(
                                (mr: any) => ({
                                    ...mr,
                                    projectName:
                                    project.name,
                                    projectPath:
                                    project.fullPath,
                                })
                            ) || []
                    )
                })

            /**
             * Pipelines normalizados
             */
            const pipelines =
                computed<any[]>(() => {
                    if (
                        !rootData.value
                    ) {
                        return []
                    }

                    if (
                        rootData.value
                            ?.pipelines
                            ?.nodes
                    ) {
                        return (
                            rootData.value
                                .pipelines
                                .nodes || []
                        )
                    }

                    return groupProjects.value.flatMap(
                        (
                            project: any
                        ) =>
                            project?.pipelines?.nodes?.map(
                                (
                                    pipeline: any
                                ) => ({
                                    ...pipeline,
                                    projectName:
                                    project.name,
                                    projectPath:
                                    project.fullPath,
                                })
                            ) || []
                    )
                })

            /**
             * Environments
             */
            const environments =
                computed<any[]>(() => {
                    if (
                        !rootData.value
                    ) {
                        return []
                    }

                    if (
                        rootData.value
                            ?.environments
                            ?.nodes
                    ) {
                        return (
                            rootData.value
                                .environments
                                .nodes || []
                        )
                    }

                    return groupProjects.value.flatMap(
                        (
                            project: any
                        ) =>
                            project?.environments?.nodes?.map(
                                (
                                    env: any
                                ) => ({
                                    ...env,
                                    projectName:
                                    project.name,
                                    projectPath:
                                    project.fullPath,
                                })
                            ) || []
                    )
                })

            /**
             * Jobs
             */
            const jobs =
                computed<any[]>(() => {
                    if (
                        !rootData.value
                    ) {
                        return []
                    }

                    if (
                        rootData.value
                            ?.jobs?.nodes
                    ) {
                        return (
                            rootData.value
                                .jobs.nodes || []
                        )
                    }

                    return groupProjects.value.flatMap(
                        (
                            project: any
                        ) =>
                            project?.jobs?.nodes?.map(
                                (job: any) => ({
                                    ...job,
                                    projectName:
                                    project.name,
                                    projectPath:
                                    project.fullPath,
                                })
                            ) || []
                    )
                })

            /**
             * Commit
             */
            const commit =
                computed<any | null>(
                    () => {
                        return (
                            rootData.value
                                ?.repository
                                ?.tree
                                ?.lastCommit ||
                            null
                        )
                    }
                )

            /**
             * Set filters
             */
            function setFilters(
                next: AnalyticsFilters
            ) {
                filters.value =
                    combineFilters(
                        filters.value,
                        next
                    )

                persistFilters(
                    filters.value
                )
            }

            /**
             * Clear filters
             */
            function clearFilters() {
                filters.value = {}

                persistFilters(
                    filters.value
                )
            }

            /**
             * Complexity estimation
             */
            function estimateComplexity(
                metrics: MetricKey[]
            ) {
                const weights: Partial<Record<MetricKey, number>> = {
                    pipelines: 15,
                    mergeRequests: 25,
                    commits: 10,
                    jobs: 30,
                    environments: 10,
                }

                estimatedComplexity.value =
                    metrics.reduce(
                        (
                            acc,
                            metric
                        ) =>
                            acc +
                            (weights[
                                metric
                                ] || 5),
                        0
                    )
            }

            /**
             * Dashboard
             */
            async function loadDashboard(
                payload: {
                    projectPath?: string
                    groupPath?: string
                    metrics: MetricKey[]
                    pagination?: {
                        first?: number
                        after?: string | null
                    }
                }
            ) {
                isLoading.value = true

                error.value = null

                graphqlErrors.value =
                    []

                estimateComplexity(
                    payload.metrics
                )

                /**
                 * Evita queries absurdas
                 */
                if (
                    estimatedComplexity.value >
                    220
                ) {
                    error.value =
                        'Query GraphQL muito complexa'

                    isLoading.value = false

                    return
                }

                currentScope.value =
                    payload.projectPath
                        ? 'project'
                        : 'group'

                try {
                    const response =
                        await analyticsRegistry.dashboards(
                            {
                                ...payload,
                                filters:
                                filters.value,
                            }
                        )

                    dashboardData.value =
                        response

                    /**
                     * Metadata debug
                     */
                    lastQuery.value =
                        (
                            response as any
                        )?.__query || ''

                    lastVariables.value =
                        (
                            response as any
                        )?.__variables ||
                        {}

                    graphqlErrors.value =
                        (
                            response as any
                        )?.errors || []

                    lastUpdated.value =
                        new Date()
                } catch (err: any) {
                    console.error(err)

                    /**
                     * GraphQL errors
                     */
                    if (
                        err?.response
                            ?.errors
                    ) {
                        graphqlErrors.value =
                            err.response.errors

                        error.value =
                            err.response.errors
                                ?.map(
                                    (
                                        e: any
                                    ) => e.message
                                )
                                .join('\n')
                    } else {
                        error.value =
                            'Falha ao carregar analytics via GraphQL'
                    }
                } finally {
                    isLoading.value =
                        false
                }
            }

            /**
             * DORA
             */
            async function loadDora(
                payload: {
                    projectPath?: string
                    projectPaths?: string[]
                    commits: GitLabCommit[]
                    periodDays: number
                }
            ) {
                isLoading.value = true

                error.value = null

                try {
                    doraData.value =
                        await analyticsRegistry.dora(
                            {
                                ...payload,
                                filters:
                                filters.value,
                            }
                        )

                    lastUpdated.value =
                        new Date()
                } catch (err) {
                    error.value =
                        'Falha ao carregar métricas DORA via GraphQL'

                    console.error(err)
                } finally {
                    isLoading.value =
                        false
                }
            }

            return {
                /**
                 * State
                 */
                filters,
                isLoading,
                error,
                lastUpdated,
                dashboardData,
                doraData,
                graphqlErrors,

                /**
                 * Metadata
                 */
                lastQuery,
                lastVariables,
                estimatedComplexity,
                currentScope,

                /**
                 * Flags
                 */
                hasFilters,
                isGroupScopePayload,

                /**
                 * Normalized payloads
                 */
                rootData,
                groupProjects,
                deployments,
                mergeRequests,
                pipelines,
                environments,
                jobs,
                commit,

                /**
                 * Actions
                 */
                setFilters,
                clearFilters,
                loadDashboard,
                loadDora,
            }
        }
    )
