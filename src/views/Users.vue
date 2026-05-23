<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterView } from 'vue-router'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, ExternalLink, Filter, Search, Shield } from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import Input from '@/components/ui/Input.vue'
import { useMetricsStore } from '@/stores/metrics'
import { ACCESS_LEVEL_OPTIONS, getAccessLevelLabel } from '@/utils/gitlabAccess'
import DetailDrawer from '@/components/detail/DetailDrawer.vue'

const router = useRouter()
const metricsStore = useMetricsStore()

function openUser(id: number) {
  router.push({ name: 'UserDetail', params: { userId: String(id) } })
}

const searchQuery = ref('')
const roleFilter = ref('all')
const stateFilter = ref('all')

const stateOptions = [
  { value: 'all', label: 'Todos os estados' },
  { value: 'active', label: 'Ativos' },
  { value: 'blocked', label: 'Bloqueados' },
]

const filteredMembers = computed(() => {
  let list = [...metricsStore.members]
  const q = searchQuery.value.trim().toLowerCase()

  if (q) {
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q)
    )
  }

  if (roleFilter.value !== 'all') {
    const level = parseInt(roleFilter.value, 10)
    list = list.filter((m) => m.access_level === level)
  }

  if (stateFilter.value !== 'all') {
    list = list.filter((m) => m.state === stateFilter.value)
  }

  return list.sort((a, b) => b.access_level - a.access_level || a.name.localeCompare(b.name))
})

const stats = computed(() => {
  const byRole = metricsStore.members.reduce(
    (acc, m) => {
      const label = getAccessLevelLabel(m.access_level)
      acc[label] = (acc[label] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    total: metricsStore.members.length,
    active: metricsStore.members.filter((m) => m.state === 'active').length,
    byRole,
  }
})

function roleBadgeVariant(level: number): 'default' | 'success' | 'secondary' | 'warning' {
  if (level >= 50) return 'default'
  if (level >= 40) return 'success'
  if (level >= 30) return 'secondary'
  return 'warning'
}

function formatJoined(date: string) {
  return format(parseISO(date), "dd MMM yyyy", { locale: ptBR })
}
</script>

<template>
  <MainLayout title="Usuários">
    <div class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Membros do grupo</div>
          <div class="mt-1 text-2xl font-bold text-foreground">{{ stats.total }}</div>
        </Card>
        <Card class="p-4">
          <div class="text-sm text-muted-foreground">Ativos</div>
          <div class="mt-1 text-2xl font-bold text-success">{{ stats.active }}</div>
        </Card>
        <Card class="p-4">
          <div class="flex items-center gap-1 text-sm text-muted-foreground">
            <Shield class="h-4 w-4" />
            Maintainers+
          </div>
          <div class="mt-1 text-2xl font-bold text-foreground">
            {{
              (stats.byRole.Maintainer || 0) +
              (stats.byRole.Owner || 0)
            }}
          </div>
        </Card>
      </div>

      <Card v-if="Object.keys(stats.byRole).length" class="p-4">
        <h3 class="mb-3 text-sm font-medium text-foreground">Por papel</h3>
        <div class="flex flex-wrap gap-2">
          <Badge
            v-for="(count, role) in stats.byRole"
            :key="role"
            variant="outline"
          >
            {{ role }}: {{ count }}
          </Badge>
        </div>
      </Card>

      <Card class="p-4">
        <div class="flex flex-wrap items-center gap-4">
          <Filter class="h-5 w-5 text-muted-foreground" />
          <div class="relative min-w-[200px] flex-1">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input v-model="searchQuery" placeholder="Buscar usuário..." class="pl-9" />
          </div>
          <Select v-model="roleFilter" :options="ACCESS_LEVEL_OPTIONS" class="w-44" />
          <Select v-model="stateFilter" :options="stateOptions" class="w-40" />
        </div>
      </Card>

      <Card>
        <div class="divide-y divide-border">
          <div
            v-for="member in filteredMembers"
            :key="member.id"
            class="flex cursor-pointer items-center gap-4 p-4 hover:bg-muted/40"
            role="button"
            tabindex="0"
            @click="openUser(member.id)"
            @keydown.enter="openUser(member.id)"
          >
            <img
              v-if="member.avatar_url"
              :src="member.avatar_url"
              :alt="member.name"
              class="h-11 w-11 rounded-full"
            />
            <div
              v-else
              class="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-medium"
            >
              {{ member.name.charAt(0).toUpperCase() }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-foreground">{{ member.name }}</p>
                <Badge :variant="roleBadgeVariant(member.access_level)">
                  {{ getAccessLevelLabel(member.access_level) }}
                </Badge>
                <Badge v-if="member.state !== 'active'" variant="destructive">
                  {{ member.state }}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground">@{{ member.username }}</p>
              <p class="text-xs text-muted-foreground">
                Membro desde {{ formatJoined(member.created_at) }}
              </p>
            </div>

            <a
              :href="member.web_url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground"
              @click.stop
            >
              <ExternalLink class="h-4 w-4" />
            </a>
          </div>
        </div>

        <div
          v-if="filteredMembers.length === 0"
          class="flex h-48 items-center justify-center text-muted-foreground"
        >
          <div class="text-center">
            <Users class="mx-auto mb-2 h-8 w-8" />
            <p>Nenhum usuário encontrado</p>
          </div>
        </div>
      </Card>
    </div>

    <RouterView v-slot="{ Component }">
      <DetailDrawer v-if="Component" @close="router.back()">
        <component :is="Component" />
      </DetailDrawer>
    </RouterView>
  </MainLayout>
</template>
