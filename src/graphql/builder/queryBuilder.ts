import type {
    BuiltQuery,
    MetricKey,
    QueryBuilderInput,
} from '@/types/graphql'

import {
    allFragments,
    fragmentRegistry,
} from '@/graphql/fragments'

function buildPaginationArgs(
    input: QueryBuilderInput
): string {
    const first =
        input.pagination?.first ?? 50

    const after =
        input.pagination?.after

    const pageArgs = [
        `first: ${first}`,
    ]

    if (after) {
        pageArgs.push(
            `after: "${after}"`
        )
    }

    return pageArgs.join(', ')
}

/**
 * Detecta escopo
 */
function isGroupScope(
    input: QueryBuilderInput
): boolean {
    return Boolean(
        input.groupPath &&
        !input.projectPath
    )
}

/**
 * Campos simples PROJECT
 */
function buildProjectMetricSelection(
    metric: MetricKey,
    paginationArgs: string,
    metricFilters: Partial<
        Record<MetricKey, string[]>
    >
): string {
    const filters =
        metricFilters[metric]?.length
            ? `, ${metricFilters[
                metric
                ]?.join(', ')}`
            : ''

    /**
     * Pipelines
     */
    if (metric === 'pipelines') {
        return `
      pipelines(${paginationArgs}${filters}) {
        nodes {
          ...PipelineFragment
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    `
    }

    /**
     * Merge Requests
     */
    if (metric === 'mergeRequests') {
        return `
      mergeRequests(${paginationArgs}${filters}) {
        nodes {
          ...MergeRequestFragment
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    `
    }

    /**
     * Commits
     */
    if (metric === 'commits') {
        return `
      repository {
        tree {
          lastCommit {
            ...CommitFragment
          }
        }
      }
    `
    }

    /**
     * Jobs
     */
    if (metric === 'jobs') {
        return `
      jobs(${paginationArgs}${filters}) {
        nodes {
          id
          name
          status
          duration
          createdAt
          startedAt
          finishedAt

          stage {
            name
          }
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    `
    }

    /**
     * Environments
     */
    if (metric === 'environments') {
        return `
      environments(${paginationArgs}${filters}) {
        nodes {
          id
          name
          state
          tier
          updatedAt
        }

        pageInfo {
          hasNextPage
          endCursor
        }
      }
    `
    }

    return ''
}

/**
 * GROUP precisa navegar via projects.nodes[]
 */
function buildGroupMetricSelection(
    metric: MetricKey,
    paginationArgs: string,
    metricFilters: Partial<
        Record<MetricKey, string[]>
    >
): string {
    const selection =
        buildProjectMetricSelection(
            metric,
            paginationArgs,
            metricFilters
        )

    /**
     * Commits não suportam
     * diretamente no group
     */
    if (metric === 'commits') {
        return `
      projects(${paginationArgs}) {
        nodes {
          id
          name

          repository {
            tree {
              lastCommit {
                ...CommitFragment
              }
            }
          }
        }
      }
    `
    }

    return `
    projects(${paginationArgs}) {
      nodes {
        id
        name
        fullPath

        ${selection}
      }
    }
  `
}

/**
 * Seleção principal
 */
function metricSelection(
    metric: MetricKey,
    paginationArgs: string,
    metricFilters: Partial<
        Record<MetricKey, string[]>
    >,
    input: QueryBuilderInput
): string {
    /**
     * GROUP
     */
    if (isGroupScope(input)) {
        return buildGroupMetricSelection(
            metric,
            paginationArgs,
            metricFilters
        )
    }

    /**
     * PROJECT
     */
    return buildProjectMetricSelection(
        metric,
        paginationArgs,
        metricFilters
    )
}

/**
 * Fragments utilizados
 */
function collectFragments(
    metrics: MetricKey[]
): string[] {
    const selected = new Set<string>()

    const addWithDependencies = (
        fragmentName: string
    ) => {
        if (selected.has(fragmentName)) {
            return
        }

        selected.add(fragmentName)

        if (fragmentName === 'PipelineFragment') {
            addWithDependencies('UserFragment')
        }

        if (fragmentName === 'MergeRequestFragment') {
            addWithDependencies('UserFragment')
            addWithDependencies('PipelineFragment')
        }

        if (fragmentName === 'CommitFragment') {
            addWithDependencies('PipelineFragment')
        }
    }

    metrics.forEach((metric) => {
        if (metric === 'pipelines') {
            addWithDependencies('PipelineFragment')
        }

        if (
            metric === 'mergeRequests'
        ) {
            addWithDependencies('MergeRequestFragment')
        }

        if (metric === 'commits') {
            addWithDependencies('CommitFragment')
        }
    })

    return Array.from(selected)
}

/**
 * Resolve root
 */
function resolveScope(
    input: QueryBuilderInput
): {
    rootAlias: string
    rootField: string
    variableName: string
} {
    if (input.projectPath) {
        return {
            rootAlias: 'projectData',

            rootField:
                'project(fullPath: $targetPath)',

            variableName:
                '$targetPath: ID!',
        }
    }

    return {
        rootAlias: 'groupData',

        rootField:
            'group(fullPath: $targetPath)',

        variableName:
            '$targetPath: ID!',
    }
}

/**
 * Remove duplicação de projects
 */
function mergeGroupSelections(
    selections: string[]
): string {
    const projectSelections =
        selections
            .filter((s) =>
                s.includes('projects(')
            )
            .map((s) =>
                s
                    .replace(
                        /projects\([^)]+\)\s*\{\s*nodes\s*\{/,
                        ''
                    )
                    .replace(/\}\s*\}\s*$/, '')
            )

    const nonProjectSelections =
        selections.filter(
            (s) =>
                !s.includes('projects(')
        )

    if (
        projectSelections.length === 0
    ) {
        return nonProjectSelections.join(
            '\n'
        )
    }

    return `
    projects(${buildPaginationArgs({
        pagination: {first: 50},
    } as QueryBuilderInput)}) {
      nodes {
        id
        name
        fullPath

        ${projectSelections.join(
        '\n'
    )}
      }
    }

    ${nonProjectSelections.join(
        '\n'
    )}
  `
}

/**
 * Query principal
 */
export function buildProjectAnalyticsQuery(
    input: QueryBuilderInput
): BuiltQuery {
    const paginationArgs =
        buildPaginationArgs(input)

    const rawSelections =
        input.metrics.map((metric) =>
            metricSelection(
                metric,
                paginationArgs,
                input.filters,
                input
            )
        )

    const selections =
        isGroupScope(input)
            ? mergeGroupSelections(
                rawSelections
            )
            : rawSelections.join('\n')

    const scope =
        resolveScope(input)

    const usedFragmentNames =
        collectFragments(
            input.metrics
        )

    const usedFragmentBodies =
        usedFragmentNames
            .map(
                (name) =>
                    fragmentRegistry[
                        name as keyof typeof fragmentRegistry
                        ]?.body
            )
            .filter(
                (
                    value
                ): value is string =>
                    Boolean(value)
            )

    const query = `
query ProjectAnalytics(${scope.variableName}) {
  ${scope.rootAlias}: ${scope.rootField} {
    ${selections}
  }
}

${usedFragmentBodies.join(
        '\n\n'
    )}
  `.trim()

    return {
        query,

        variables: {
            targetPath:
                input.projectPath ||
                input.groupPath ||
                '',

            first:
                input.pagination?.first ??
                50,

            after:
                input.pagination?.after ??
                null,
        },

        fragments:
        usedFragmentNames,
    }
}

/**
 * Lista fragments
 */
export function getAvailableFragments(): string[] {
    return allFragments.map(
        (fragment) =>
            fragment.name
    )
}
