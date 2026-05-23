/** Limite de projetos consultados em paralelo (evita rate limit da API). */
export const DEFAULT_PROJECT_BATCH = 20

export function parseTotalHeader(headers: Record<string, unknown>): number {
  const total = headers['x-total']
  return parseInt(String(total ?? '0'), 10)
}

export async function fetchAcrossProjects<T>(
  projects: { id: number }[],
  fetcher: (projectId: number) => Promise<{ data: T[] }>,
  options: { limit?: number } = {}
): Promise<T[]> {
  const { limit = DEFAULT_PROJECT_BATCH } = options

  const results = await Promise.all(
    projects.slice(0, limit).map((project) =>
      fetcher(project.id).catch(() => ({ data: [] as T[] }))
    )
  )

  return results.flatMap((r) => r.data)
}
