import type { GitLabRunner } from '@/types/gitlab'

/** Normaliza campos opcionais da API (GitLab.com vs self-hosted). */
export function normalizeRunner(runner: GitLabRunner): GitLabRunner {
  const status =
    runner.status ??
    (runner.online === true ? 'online' : runner.online === false ? 'offline' : 'offline')

  return {
    ...runner,
    tag_list: Array.isArray(runner.tag_list) ? runner.tag_list : [],
    paused: runner.paused ?? false,
    is_shared: runner.is_shared ?? false,
    active: runner.active ?? true,
    status,
    description: runner.description || runner.name || `Runner #${runner.id}`,
    runner_type: runner.runner_type ?? 'project_type',
  }
}

export function normalizeRunners(runners: GitLabRunner[]): GitLabRunner[] {
  return runners.map(normalizeRunner)
}
