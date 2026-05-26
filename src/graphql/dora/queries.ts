import gitlabGraphqlClient from '@/graphql/client'
import { buildFilterArguments, type AnalyticsFilters } from '@/graphql/filters/engine'
import type { GitLabDeployment, GitLabMergeRequest } from '@/types/gitlab'

interface GraphqlUser {
  id: string | number
  username: string
  name: string
  webUrl: string
}

interface GraphqlEnvironment {
  id: string | number
  name: string
  state: string
  tier?: string
}

interface GraphqlDeployment {
  id: string | number
  iid: string | number
  status: string
  ref: string
  sha: string
  createdAt: string
  updatedAt: string
  finishedAt: string | null
  environment?: GraphqlEnvironment
  user?: GraphqlUser
}

interface GraphqlMergeRequest {
  id: string | number
  iid: string | number
  title: string
  description: string | null
  state: 'opened' | 'closed' | 'locked' | 'merged'
  createdAt: string
  updatedAt: string
  mergedAt: string | null
  closedAt: string | null
  draft: boolean
  sourceBranch: string
  targetBranch: string
  webUrl: string
  author?: GraphqlUser
}

interface ProjectDoraPayload {
  project?: {
    deployments: {
      nodes: GraphqlDeployment[]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
    mergeRequests: {
      nodes: GraphqlMergeRequest[]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }
}

function mapDeployment(
    payload: GraphqlDeployment
): GitLabDeployment {
    return {
        id: parseGitlabGlobalId(payload.id),

        /**
         * iid no GraphQL é STRING
         */
        iid: Number(payload.iid),

        status: payload.status,
        ref: payload.ref,
        sha: payload.sha,

        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
        finished_at: payload.finishedAt,

        environment: mapEnvironment(
            payload.environment
        ),

        user: mapUser(payload.user),
    }
}

function mapMergeRequest(
    payload: GraphqlMergeRequest
): GitLabMergeRequest {
    return {
        id: parseGitlabGlobalId(payload.id),

        iid: Number(payload.iid),

        /**
         * Ideal:
         * retornar projectId do query
         */
        project_id: 0,

        title: payload.title,
        description: payload.description,

        state: payload.state,

        web_url: payload.webUrl,

        created_at: payload.createdAt,
        updated_at: payload.updatedAt,

        merged_at: payload.mergedAt,
        closed_at: payload.closedAt,

        draft: payload.draft,

        source_branch: payload.sourceBranch,
        target_branch: payload.targetBranch,

        author: mapUser(payload.author),
    }
}

function parseGitlabGlobalId(id: string | number): number {
    if (typeof id === 'number') {
        return id
    }

    const match = String(id).match(/\/(\d+)$/)

    return match ? Number(match[1]) : 0
}

function mapUser(user?: GraphqlUser) {
    if (!user) {
        return undefined
    }

    return {
        id: parseGitlabGlobalId(user.id),
        username: user.username,
        name: user.name,
        state: 'active',
        avatar_url: '',
        web_url: user.webUrl,
    }
}

function mapEnvironment(environment?: GraphqlEnvironment) {
    if (!environment) {
        return undefined
    }

    return {
        id: parseGitlabGlobalId(environment.id),
        name: environment.name,
        tier: environment.tier,
    }
}

function buildDoraProjectQuery(filters: AnalyticsFilters): string {
  const deploymentArgs = buildFilterArguments(filters, 'deployments').join(', ')
  const mergeRequestArgs = buildFilterArguments(filters, 'mergeRequests').join(', ')

  return `query DoraProject($projectPath: ID!, $first: Int!, $afterDeployments: String, $afterMergeRequests: String) {
  project(fullPath: $projectPath) {
    deployments(first: $first, after: $afterDeployments${deploymentArgs ? `, ${deploymentArgs}` : ''}) {
      nodes {
        id
        iid
        status
        ref
        sha
        createdAt
        updatedAt
        finishedAt
        environment {
          id
          name
          state
          tier
        }
        user {
          id
          username
          name
          webUrl
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    mergeRequests(first: $first, after: $afterMergeRequests${mergeRequestArgs ? `, ${mergeRequestArgs}` : ''}) {
      nodes {
        id
        iid
        title
        description
        state
        createdAt
        updatedAt
        mergedAt
        closedAt
        draft
        sourceBranch
        targetBranch
        webUrl
        author {
          id
          username
          name
          webUrl
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}`
}

export async function fetchProjectDoraData(
  projectPath: string,
  filters: AnalyticsFilters,
  pageSize = 50
): Promise<{ deployments: GitLabDeployment[]; mergeRequests: GitLabMergeRequest[] }> {
  const deployments: GitLabDeployment[] = []
  const mergeRequests: GitLabMergeRequest[] = []

  let hasNextDeployments = true
  let hasNextMergeRequests = true
  let deploymentsCursor: string | null = null
  let mergeRequestsCursor: string | null = null

  while (hasNextDeployments || hasNextMergeRequests) {
    const query = buildDoraProjectQuery(filters)
    const response = await gitlabGraphqlClient.request<ProjectDoraPayload>(
      {
        query,
        operationName: 'DoraProject',
        variables: {
          projectPath,
          first: pageSize,
          afterDeployments: hasNextDeployments ? deploymentsCursor : null,
          afterMergeRequests: hasNextMergeRequests ? mergeRequestsCursor : null,
        },
      },
      {
        debugLabel: 'dora-project',
        batchable: true,
      }
    )

    const deploymentConnection: any = response.project?.deployments
    const mergeRequestConnection: any = response.project?.mergeRequests

    if (deploymentConnection?.nodes?.length) {
      deployments.push(...deploymentConnection.nodes.map((item: any) => mapDeployment(item)))
    }

    if (mergeRequestConnection?.nodes?.length) {
      mergeRequests.push(...mergeRequestConnection.nodes.map((item: any) => mapMergeRequest(item)))
    }

    hasNextDeployments = Boolean(deploymentConnection?.pageInfo.hasNextPage)
    hasNextMergeRequests = Boolean(mergeRequestConnection?.pageInfo.hasNextPage)

    deploymentsCursor = deploymentConnection?.pageInfo.endCursor || null
    mergeRequestsCursor = mergeRequestConnection?.pageInfo.endCursor || null

    if (!hasNextDeployments && !hasNextMergeRequests) {
      break
    }
  }

  return {
    deployments,
    mergeRequests,
  }
}

export async function fetchGroupDoraData(
  projectPaths: string[],
  filters: AnalyticsFilters,
  pageSize = 50
): Promise<{ deployments: GitLabDeployment[]; mergeRequests: GitLabMergeRequest[] }> {
  const responses = await Promise.all(
    projectPaths.map((projectPath) => fetchProjectDoraData(projectPath, filters, pageSize))
  )

  return {
    deployments: responses.flatMap((item) => item.deployments),
    mergeRequests: responses.flatMap((item) => item.mergeRequests),
  }
}
