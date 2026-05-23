<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, ExternalLink, GitCommit, Loader2, Mail } from 'lucide-vue-next'
import { getUserFull } from '@/api/endpoints/users'
import { getGroupMember } from '@/api/endpoints/members'
import { useMetricsStore } from '@/stores/metrics'
import { useDetailClose } from '@/composables/useDetailClose'
import { getAccessLevelLabel } from '@/utils/gitlabAccess'
import { mergeApiRecords } from '@/utils/apiDataDisplay'
import ApiDataExplorer from './ApiDataExplorer.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'

const route = useRoute()
const router = useRouter()
const metricsStore = useMetricsStore()
useDetailClose()

const userId = computed(() => Number(route.params.userId))

const member = computed(() =>
  metricsStore.members.find((m) => m.id === userId.value) ?? null
)

const apiPayload = ref<Record<string, unknown>>({})
const isLoading = ref(false)

const displayName = computed(() => {
  const n = apiPayload.value.name ?? member.value?.name
  return typeof n === 'string' ? n : 'Usuário'
})

const authorCommits = computed(() => {
  const name = displayName.value
  return metricsStore.commits.filter((c) => c.author_name === name).slice(0, 12)
})

async function load() {
  if (!userId.value || Number.isNaN(userId.value)) return

  isLoading.value = true
  try {
    const [userFull, groupMember] = await Promise.all([
      getUserFull(userId.value).catch(() => ({})),
      metricsStore.groupId
        ? getGroupMember(metricsStore.groupId, userId.value).catch(() => null)
        : Promise.resolve(null),
    ])

    apiPayload.value = mergeApiRecords(
      member.value as Record<string, unknown> | undefined,
      userFull,
      groupMember ? { group_membership: groupMember } : undefined
    )
  } finally {
    isLoading.value = false
  }
}

function formatJoined(date: string) {
  return format(parseISO(date), "dd MMM yyyy", { locale: ptBR })
}

function openCommit(commit: { project_id?: number; id: string }) {
  if (!commit.project_id) return
  router.push({
    name: 'CommitDetail',
    params: { projectId: String(commit.project_id), sha: commit.id },
  })
}

onMounted(load)
watch(userId, load)
</script>

<template>
  <div v-if="isLoading && !Object.keys(apiPayload).length" class="flex justify-center py-12">
    <Loader2 class="h-8 w-8 animate-spin text-primary" />
  </div>

  <div v-else-if="!member && !apiPayload.id" class="py-8 text-center text-muted-foreground">
    <Users class="mx-auto mb-2 h-8 w-8" />
    <p>Usuário não encontrado</p>
  </div>

  <div v-else class="space-y-6">
    <div class="flex items-center gap-4">
      <img
        v-if="typeof apiPayload.avatar_url === 'string'"
        :src="apiPayload.avatar_url"
        :alt="displayName"
        class="h-16 w-16 rounded-full"
      />
      <div
        v-else
        class="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-medium"
      >
        {{ displayName.charAt(0).toUpperCase() }}
      </div>
      <div>
        <h2 class="text-xl font-bold text-foreground">{{ displayName }}</h2>
        <p class="text-muted-foreground">@{{ apiPayload.username ?? member?.username }}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <Badge v-if="member || apiPayload.access_level" variant="default">
        {{ getAccessLevelLabel(Number(apiPayload.access_level ?? member?.access_level ?? 0)) }}
      </Badge>
      <Badge
        :variant="(apiPayload.state ?? member?.state) === 'active' ? 'success' : 'destructive'"
      >
        {{ apiPayload.state ?? member?.state }}
      </Badge>
    </div>

    <a
      v-if="typeof (apiPayload.web_url ?? member?.web_url) === 'string'"
      :href="(apiPayload.web_url ?? member?.web_url) as string"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
    >
      <ExternalLink class="h-4 w-4" />
      Perfil no GitLab
    </a>

    <div v-if="member?.created_at || apiPayload.created_at" class="space-y-2 text-sm">
      <div class="flex justify-between text-muted-foreground">
        <span>Membro desde</span>
        <span class="text-foreground">
          {{ formatJoined(String(member?.created_at ?? apiPayload.created_at)) }}
        </span>
      </div>
    </div>

    <Card class="p-4">
      <div class="text-sm text-muted-foreground">Commits no período</div>
      <div class="mt-1 text-2xl font-bold text-foreground">{{ authorCommits.length }}</div>
      <p class="mt-1 text-xs text-muted-foreground">
        Últimos {{ metricsStore.commitPeriodDays }} dias
      </p>
    </Card>

    <section v-if="authorCommits.length">
      <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <GitCommit class="h-4 w-4" />
        Commits recentes
      </h3>
      <div class="space-y-2">
        <button
          v-for="commit in authorCommits"
          :key="commit.id"
          type="button"
          class="w-full rounded-lg border border-border p-3 text-left hover:bg-muted/40"
          @click="openCommit(commit)"
        >
          <p class="truncate text-sm font-medium">{{ commit.title || commit.message }}</p>
          <p class="text-xs text-muted-foreground">
            {{ commit.short_id }}
            ·
            {{ format(parseISO(commit.committed_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) }}
          </p>
        </button>
      </div>
    </section>

    <p v-else class="flex items-center gap-2 text-sm text-muted-foreground">
      <Mail class="h-4 w-4" />
      Nenhum commit deste autor no período carregado.
    </p>

    <ApiDataExplorer :data="apiPayload" />
  </div>
</template>
