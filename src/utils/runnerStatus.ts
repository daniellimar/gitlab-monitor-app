import type { Component } from 'vue'
import { Wifi, WifiOff, Pause } from 'lucide-vue-next'
import type { GitLabRunner } from '@/types/gitlab'
import type { BadgeVariant } from './gitlabStatus'

export function getRunnerStatusIcon(runner: GitLabRunner): Component {
  if (runner.paused) return Pause
  if (runner.status === 'online') return Wifi
  return WifiOff
}

export function getRunnerStatusVariant(runner: GitLabRunner): BadgeVariant {
  if (runner.paused) return 'warning'
  if (runner.status === 'online') return 'success'
  return 'destructive'
}

export function getRunnerStatusLabel(runner: GitLabRunner): string {
  if (runner.paused) return 'Pausado'
  if (runner.status === 'online') return 'Online'
  if (runner.status === 'offline') return 'Offline'
  return runner.status
}

export function getRunnerTags(runner: GitLabRunner): string[] {
  return runner.tag_list ?? []
}

export function getRunnerTypeLabel(type: string): string {
  switch (type) {
    case 'instance_type':
      return 'Shared'
    case 'group_type':
      return 'Group'
    case 'project_type':
      return 'Project'
    default:
      return type
  }
}
