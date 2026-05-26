// GitLab API Types

export interface GitLabGroup {
  id: number
  name: string
  path: string
  full_name: string
  full_path: string
  description: string
  avatar_url: string | null
  web_url: string
  projects_count?: number
}

export interface GitLabProject {
  id: number
  name: string
  name_with_namespace: string
  path: string
  path_with_namespace: string
  description: string | null
  avatar_url: string | null
  web_url: string
  default_branch: string
  star_count: number
  forks_count: number
  open_issues_count: number
  last_activity_at: string
  created_at: string
  statistics?: {
    commit_count: number
    storage_size: number
    repository_size: number
    wiki_size: number
    lfs_objects_size: number
    job_artifacts_size: number
    packages_size: number
  }
}

export interface GitLabPipeline {
  id: number
  iid: number
  project_id: number
  sha: string
  ref: string
  status: PipelineStatus
  source: string
  created_at: string
  updated_at: string
  web_url: string
  duration?: number
  queued_duration?: number
  coverage?: string
  user?: GitLabUser
}

export type PipelineStatus = 
  | 'created'
  | 'waiting_for_resource'
  | 'preparing'
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'canceled'
  | 'skipped'
  | 'manual'
  | 'scheduled'

export interface GitLabJob {
  id: number
  name: string
  stage: string
  status: JobStatus
  ref: string
  tag: boolean
  allow_failure: boolean
  created_at: string
  started_at: string | null
  finished_at: string | null
  duration: number | null
  queued_duration: number | null
  web_url: string
  pipeline: {
    id: number
    project_id: number
    ref: string
    sha: string
    status: PipelineStatus
  }
  runner?: {
    id: number
    description: string
    active: boolean
    is_shared: boolean
    runner_type: string
    name: string | null
  }
  user?: GitLabUser
  project?: {
    ci_job_token_scope_enabled: boolean
  }
}

export type JobStatus =
  | 'created'
  | 'pending'
  | 'running'
  | 'failed'
  | 'success'
  | 'canceled'
  | 'skipped'
  | 'manual'

export interface GitLabRunner {
  id: number
  description: string
  ip_address: string | null
  active: boolean
  paused: boolean
  is_shared: boolean
  runner_type: 'instance_type' | 'group_type' | 'project_type'
  name: string | null
  online: boolean
  status: 'online' | 'offline' | 'stale' | 'never_contacted'
  tag_list?: string[]
  contacted_at: string | null
  architecture: string | null
  platform: string | null
  version: string | null
  revision: string | null
  projects?: GitLabProject[]
  jobs_count?: number
}

export interface GitLabCommit {
  id: string
  short_id: string
  title: string
  message: string
  author_name: string
  author_email: string
  authored_date: string
  committer_name: string
  committer_email: string
  committed_date: string
  web_url: string
  parent_ids: string[]
  /** Preenchido ao agregar commits de vários projetos */
  project_id?: number
  stats?: {
    additions: number
    deletions: number
    total: number
  }
}

export interface GitLabUser {
  id: number
  username: string
  name: string
  state: string
  avatar_url: string
  web_url: string
}

export interface GitLabGroupMember extends GitLabUser {
  access_level: number
  created_at: string
  expires_at: string | null
}

// Auth Types
export interface AuthState {
  isAuthenticated: boolean
  authMethod: 'pat' | 'oauth' | null
  token: string | null
  user: GitLabUser | null
  expiresAt: number | null
}

export interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  created_at: number
  scope: string
}

// Metrics Types
export interface DashboardMetrics {
  totalPipelines: number
  successRate: number
  failedPipelines: number
  runningPipelines: number
  totalJobs: number
  runnersOnline: number
  runnersOffline: number
  totalCommitsToday: number
  totalProjects: number
  avgPipelineDurationSec: number
  avgPipelineQueueDurationSec: number
  avgJobDurationSec: number
  totalCiMinutes: number
  estimatedCiCost: number
}

export interface PipelineChartData {
  date: string
  success: number
  failed: number
  canceled: number
  running: number
}

export interface JobsByStage {
  stage: string
  count: number
  avgDuration: number
}

export interface CommitActivity {
  date: string
  count: number
  authors: string[]
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface ApiError {
  message: string
  status: number
  details?: Record<string, unknown>
}
