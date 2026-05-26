import type {GitLabCommit, GitLabProject} from '@/types/gitlab.ts'
import gitlabClient from "@/api/gitlab.ts";

type Options = {
    since?: string
    until?: string
    perPage?: number
}

export async function getUserCommitsByEmail(
    projects: GitLabProject[],
    email: string,
    options: Options = {}
): Promise<GitLabCommit[]> {
    const result: GitLabCommit[] = []

    const { since, until, perPage = 100 } = options

    const requests = projects.map(async (project) => {
        try {
            const commits = await gitlabClient.instance.get<any[]>(
                `/projects/${project.id}/repository/commits`,
                {
                    params: {
                        since,
                        until,
                        per_page: perPage,
                    },
                }
            )

            const filtered = commits.data.filter(
                (c: GitLabCommit) =>
                    (c.author_email || '').toLowerCase() === email.toLowerCase()
            )

            return filtered
        } catch {
            return []
        }
    })

    const all = await Promise.all(requests)

    all.forEach((c: any) => result.push(...c))

    return result
}
