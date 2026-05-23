import type { Component } from 'vue'
import { CheckCircle2, XCircle, Clock, Play } from 'lucide-vue-next'
import type { JobStatus, PipelineStatus } from '@/types/gitlab'

export type BadgeVariant = 'success' | 'destructive' | 'warning' | 'muted' | 'default'

export function getCiStatusIcon(status: PipelineStatus | JobStatus): Component {
  switch (status) {
    case 'success':
      return CheckCircle2
    case 'failed':
      return XCircle
    case 'running':
      return Play
    default:
      return Clock
  }
}

export function getCiStatusVariant(status: PipelineStatus | JobStatus): BadgeVariant {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
      return 'destructive'
    case 'running':
      return 'default'
    case 'pending':
    case 'manual':
      return 'warning'
    default:
      return 'muted'
  }
}
