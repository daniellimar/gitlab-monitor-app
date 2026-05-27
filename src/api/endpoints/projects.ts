import gitlabClient from '../gitlab'

export async function searchProjects(query: string): Promise<Record<string, unknown>[]> {
  const value = query.trim()
  if (!value) return []

  const response = await gitlabClient.instance.get<Record<string, unknown>[]>('/projects', {
    params: {
      search: value,
      order_by: 'last_activity_at',
      sort: 'desc',
      simple: false,
      statistics: true,
      per_page: 30,
    },
  })

  return response.data
}

export async function getProjectByPath(path: string) {
  const encodedPath = encodeURIComponent(path)
  const response = await gitlabClient.instance.get(`/projects/${encodedPath}`, {
    params: {
      statistics: true,
      with_custom_attributes: true,
      license: true,
    },
  })
  return response.data as Record<string, unknown>
}

/** Detalhes completos do projeto (todos os campos que a API retornar). */
export async function getProjectFull(projectId: string | number) {
  const response = await gitlabClient.instance.get(`/projects/${projectId}`, {
    params: {
      statistics: true,
      with_custom_attributes: true,
      license: true,
    },
  })
  return response.data as Record<string, unknown>
}

export async function getProjectLanguages(
  projectId: string | number
): Promise<Record<string, number>> {
  const response = await gitlabClient.instance.get<Record<string, number>>(
    `/projects/${projectId}/languages`
  )
  return response.data
}
