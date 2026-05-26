// graphql/registry/index.ts

import type {
    MetricKey,
} from '@/types/graphql'

import {
    buildProjectAnalyticsQuery,
} from '@/graphql/builder/queryBuilder'

import {
    fetchGroupDoraData,
    fetchProjectDoraData,
} from '@/graphql/dora/queries'

import {
    calculateDoraAnalytics,
} from '@/graphql/dora/analytics'

import {
    combineFilters,
    buildFilterArguments,
    type AnalyticsFilters,
} from '@/graphql/filters/engine'

import gitlabGraphqlClient from '@/graphql/client'

import type {
    GitLabCommit,
} from '@/types/gitlab'

export interface AnalyticsRegistryRequest {
    projectPath?: string
    groupPath?: string
    metrics: MetricKey[]
    filters?: AnalyticsFilters
    pagination?: {
        first?: number
        after?: string | null
    }
}

export interface DoraRegistryRequest {
    projectPath?: string
    projectPaths?: string[]
    commits: GitLabCommit[]
    filters?: AnalyticsFilters
    periodDays: number
}

/**
 * Query dinâmica
 */
async function runDynamicQuery(
    request: AnalyticsRegistryRequest
) {
    const resolvedFilters =
        combineFilters(
            request.filters || {}
        )

    const built =
        buildProjectAnalyticsQuery(
            {
                projectPath:
                request.projectPath,

                groupPath:
                request.groupPath,

                filters: {
                    pipelines:
                        buildFilterArguments(resolvedFilters, 'pipelines'),

                    mergeRequests:
                        buildFilterArguments(resolvedFilters, 'mergeRequests'),

                    jobs:
                        buildFilterArguments(
                            resolvedFilters,
                            'jobs'
                        ),

                    environments:
                        buildFilterArguments(resolvedFilters, 'environments'),
                },

                metrics:
                request.metrics,

                pagination:
                request.pagination,
            }
        )

    const response =
        await gitlabGraphqlClient.request<
            Record<string, unknown>
        >(
            {
                query:
                built.query,

                operationName:
                    'ProjectAnalytics',

                variables:
                built.variables,
            },
            {
                debugLabel:
                    'analytics-registry',

                batchable: true,
            }
        )

    return {
        ...response,

        __query:
        built.query,

        __variables:
        built.variables,

        __fragments:
        built.fragments,
    }
}

function splitMetrics(
    metrics: MetricKey[],
    chunkSize = 2
): MetricKey[][] {
    const chunks: MetricKey[][] = []

    for (let i = 0; i < metrics.length; i += chunkSize) {
        chunks.push(metrics.slice(i, i + chunkSize))
    }

    return chunks
}

function mergeProjectNodes(
    current: any[] = [],
    incoming: any[] = []
): any[] {
    const byId = new Map<string, any>()

    current.forEach((item) => {
        const key = String(item?.id || item?.fullPath || item?.name || '')
        if (key) {
            byId.set(key, item)
        }
    })

    incoming.forEach((item) => {
        const key = String(item?.id || item?.fullPath || item?.name || '')
        if (!key) {
            return
        }

        const existing = byId.get(key)
        byId.set(key, existing ? {...existing, ...item} : item)
    })

    return Array.from(byId.values())
}

function mergeDashboardResponses(
    responses: Record<string, unknown>[]
): Record<string, unknown> {
    const merged: Record<string, unknown> = {}

    responses.forEach((item) => {
        const current = item as any
        const rootKey = current.projectData ? 'projectData' : current.groupData ? 'groupData' : null

        Object.keys(current).forEach((key) => {
            if (key.startsWith('__')) {
                return
            }
            if (key !== rootKey) {
                merged[key] = current[key]
            }
        })

        if (!rootKey) {
            return
        }

        const incomingRoot = current[rootKey] || {}
        const existingRoot = (merged[rootKey] as any) || {}

        if (incomingRoot?.projects?.nodes || existingRoot?.projects?.nodes) {
            const mergedNodes = mergeProjectNodes(
                existingRoot?.projects?.nodes || [],
                incomingRoot?.projects?.nodes || []
            )
            merged[rootKey] = {
                ...existingRoot,
                ...incomingRoot,
                projects: {
                    ...(existingRoot?.projects || {}),
                    ...(incomingRoot?.projects || {}),
                    nodes: mergedNodes,
                },
            }
            return
        }

        merged[rootKey] = {
            ...existingRoot,
            ...incomingRoot,
        }
    })

    return merged
}

async function runDashboardQueryWithFallback(
    request: AnalyticsRegistryRequest
): Promise<Record<string, unknown>> {
    try {
        return await runDynamicQuery(request)
    } catch (error: any) {
        const message = String(error?.message || '')
        if (!message.includes('exceeds max complexity') || request.metrics.length <= 1) {
            throw error
        }

        const chunks = splitMetrics(request.metrics)
        const responses = await Promise.all(
            chunks.map((metrics) =>
                runDynamicQuery({
                    ...request,
                    metrics,
                })
            )
        )

        const merged = mergeDashboardResponses(responses)

        return {
            ...merged,
            __query: responses.map((item: any) => item.__query).filter(Boolean).join('\n\n'),
            __variables: responses[0]?.__variables || {},
            __fragments: Array.from(new Set(responses.flatMap((item: any) => item.__fragments || []))),
        }
    }
}

export const analyticsRegistry =
    {
        pipelines: async (
            request: AnalyticsRegistryRequest
        ) =>
            runDynamicQuery({
                ...request,
                metrics: [
                    'pipelines',
                ],
            }),

        deployments: async (
            request: AnalyticsRegistryRequest
        ) =>
            runDynamicQuery({
                ...request,
                metrics: [
                ],
            }),

        mergeRequests: async (
            request: AnalyticsRegistryRequest
        ) =>
            runDynamicQuery({
                ...request,
                metrics: [
                    'mergeRequests',
                ],
            }),

        commits: async (
            request: AnalyticsRegistryRequest
        ) =>
            runDynamicQuery({
                ...request,
                metrics: [
                    'commits',
                ],
            }),

        dashboards: async (
            request: AnalyticsRegistryRequest
        ) =>
            runDashboardQueryWithFallback(
                request
            ),

        /**
         * DORA
         */
        dora: async (
            request: DoraRegistryRequest
        ) => {
            const filters =
                combineFilters(
                    request.filters ||
                    {}
                )

            /**
             * PROJECT
             */
            const source =
                request.projectPath
                    ? await fetchProjectDoraData(
                        request.projectPath,
                        filters
                    )

                    : await fetchGroupDoraData(
                        request.projectPaths ||
                        [],
                        filters
                    )

            return calculateDoraAnalytics(
                {
                    deployments:
                    source.deployments,

                    mergeRequests:
                    source.mergeRequests,

                    commits:
                    request.commits,

                    filters,

                    periodDays:
                    request.periodDays,

                    groupBy:
                        request.projectPath
                            ? 'project'
                            : 'group',
                }
            )
        },
    }

export default analyticsRegistry
