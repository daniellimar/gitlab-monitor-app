import gitlabClient from '../gitlab'
import type { GitLabUser } from '@/types/gitlab'

export async function getUser(userId: string | number): Promise<GitLabUser> {
  const response = await gitlabClient.instance.get<GitLabUser>(`/users/${userId}`)
  return response.data
}

export async function getUserFull(userId: string | number): Promise<Record<string, unknown>> {
  const response = await gitlabClient.instance.get(`/users/${userId}`)
  return response.data as Record<string, unknown>
}
