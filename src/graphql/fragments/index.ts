import type { GraphQLFragment } from '@/types/graphql'

export const PipelineFragment: GraphQLFragment = {
    name: 'PipelineFragment',

    body: `
fragment PipelineFragment on Pipeline {
  id
  iid

  status
  detailedStatus {
    text
    group
  }

  ref
  sha
  source

  createdAt
  updatedAt
  finishedAt

  duration
  queuedDuration

  coverage

  user {
    ...UserFragment
  }

  commit {
    shortId
    title
    authoredDate
  }

  stages {
    nodes {
      id
      name
      status
    }
  }
}`,
}

export const UserFragment: GraphQLFragment = {
  name: 'UserFragment',
  body: `fragment UserFragment on UserCore {
    id
    username
    name
    webUrl
    avatarUrl
  }`,
}

export const MergeRequestFragment: GraphQLFragment = {
    name: 'MergeRequestFragment',

    body: `
fragment MergeRequestFragment on MergeRequest {
  id
  iid

  title
  description

  state
  mergeStatus

  webUrl

  createdAt
  updatedAt
  mergedAt
  closedAt

  draft

  sourceBranch
  targetBranch

  approved
  approvalsLeft

  upvotes
  downvotes

  diffStats {
    additions
    deletions
  }

  commits(first: 1) {
    nodes {
      id
    }
  }

  author {
    id
    username
    name
    webUrl
    avatarUrl
  }

  assignees {
    nodes {
      id
      username
      name
      webUrl
      avatarUrl
    }
  }

  pipelines(first: 1) {
    nodes {
      ...PipelineFragment
    }
  }
}`,
}

export const CommitFragment: GraphQLFragment = {
    name: 'CommitFragment',

    body: `
fragment CommitFragment on Commit {
  id

  sha
  shortId

  title
  message

  authoredDate
  committedDate

  authorName
  authorEmail

  webPath

  pipelines(first: 1) {
    nodes {
      ...PipelineFragment
    }
  }

  signature {
    verificationStatus
  }
}`,
}

export const DoraMetricsFragment: GraphQLFragment = {
    name: 'DoraMetricsFragment',

    body: `
fragment DoraMetricsFragment on Project {
  dora {
    metrics(
      startDate: $startDate
      endDate: $endDate
      interval: DAILY
    ) {
      date

      deploymentFrequency

      leadTimeForChanges

      changeFailureRate

      timeToRestoreService
    }
  }
}`,
}

export const fragmentRegistry = {
  PipelineFragment,
  UserFragment,
  MergeRequestFragment,
  CommitFragment,
  DoraMetricsFragment,
}

export const allFragments = Object.values(fragmentRegistry)
