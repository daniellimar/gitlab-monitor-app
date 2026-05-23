import gitlabClient from '../gitlab'

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
