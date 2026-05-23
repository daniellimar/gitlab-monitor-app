<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Key,
  Clock,
  LogOut,
  Save,
  Globe,
  Users,
} from 'lucide-vue-next'
import MainLayout from '@/components/layout/MainLayout.vue'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import { useAuthStore } from '@/stores/auth'
import { useMetricsStore } from '@/stores/metrics'
import { getGitlabWebUrl } from '@/config/gitlab'
import { getGroupFull } from '@/api/endpoints/groups'
import ApiDataExplorer from '@/components/detail/ApiDataExplorer.vue'
import { mergeApiRecords } from '@/utils/apiDataDisplay'

const router = useRouter()
const authStore = useAuthStore()
const metricsStore = useMetricsStore()

const gitlabUrl = ref(getGitlabWebUrl())
const groupId = ref(metricsStore.groupId)
const refreshInterval = ref(String(metricsStore.refreshInterval / 1000))

const refreshOptions = [
  { value: '30', label: '30 segundos' },
  { value: '60', label: '1 minuto' },
  { value: '120', label: '2 minutos' },
  { value: '300', label: '5 minutos' },
  { value: '600', label: '10 minutos' },
]

const isSaving = ref(false)
const groupApiData = ref<Record<string, unknown>>({})

const sessionApiData = computed(() =>
  mergeApiRecords(
    groupApiData.value,
    authStore.user ? { current_user: authStore.user as unknown as Record<string, unknown> } : undefined,
    metricsStore.group ? { group_summary: metricsStore.group as unknown as Record<string, unknown> } : undefined
  )
)

onMounted(async () => {
  if (metricsStore.groupId) {
    try {
      groupApiData.value = await getGroupFull(metricsStore.groupId)
    } catch {
      if (metricsStore.group) {
        groupApiData.value = metricsStore.group as unknown as Record<string, unknown>
      }
    }
  }
})

async function saveSettings() {
  isSaving.value = true
  
  try {
    metricsStore.setGroupId(groupId.value)
    metricsStore.setRefreshInterval(parseInt(refreshInterval.value) * 1000)
    await metricsStore.loadAllMetrics()
  } finally {
    isSaving.value = false
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

const authMethodLabel = computed(() => {
  if (authStore.authMethod === 'pat') return 'Personal Access Token'
  if (authStore.authMethod === 'oauth') return 'OAuth2'
  return 'Não autenticado'
})
</script>

<template>
  <MainLayout title="Configurações">
    <div class="mx-auto max-w-3xl space-y-6">
      <!-- GitLab Connection -->
      <Card class="p-6">
        <div class="mb-4 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Globe class="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 class="font-semibold text-foreground">Conexão GitLab</h3>
            <p class="text-sm text-muted-foreground">Configure a URL e grupo do GitLab</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-foreground">
              URL do GitLab
            </label>
            <Input
              v-model="gitlabUrl"
              placeholder="https://gitlab.com"
              disabled
            />
            <p class="mt-1 text-xs text-muted-foreground">
              Definido via variável de ambiente VITE_GITLAB_URL
            </p>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-foreground">
              ID do Grupo
            </label>
            <Input
              v-model="groupId"
              placeholder="seu-grupo-id"
            />
            <p class="mt-1 text-xs text-muted-foreground">
              ID ou path do grupo para buscar métricas
            </p>
          </div>
        </div>
      </Card>

      <!-- Auth Info -->
      <Card class="p-6">
        <div class="mb-4 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Key class="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 class="font-semibold text-foreground">Autenticação</h3>
            <p class="text-sm text-muted-foreground">Informações da sessão atual</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-lg bg-muted p-4">
            <div>
              <p class="text-sm font-medium text-foreground">Método de Autenticação</p>
              <p class="text-sm text-muted-foreground">{{ authMethodLabel }}</p>
            </div>
            <div
              :class="[
                'h-3 w-3 rounded-full',
                authStore.isAuthenticated ? 'bg-success' : 'bg-destructive',
              ]"
            />
          </div>

          <div v-if="authStore.user" class="flex items-center gap-4 rounded-lg bg-muted p-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <img
                v-if="authStore.user.avatar_url"
                :src="authStore.user.avatar_url"
                :alt="authStore.user.name"
                class="h-12 w-12 rounded-full"
              />
              <Users v-else class="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p class="font-medium text-foreground">{{ authStore.user.name }}</p>
              <p class="text-sm text-muted-foreground">@{{ authStore.user.username }}</p>
            </div>
          </div>

          <Button
            variant="destructive"
            class="w-full"
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4" />
            Sair
          </Button>
        </div>
      </Card>

      <!-- Refresh Settings -->
      <Card class="p-6">
        <div class="mb-4 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Clock class="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 class="font-semibold text-foreground">Atualização Automática</h3>
            <p class="text-sm text-muted-foreground">Configure o intervalo de refresh</p>
          </div>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-foreground">
            Intervalo de Atualização
          </label>
          <Select
            v-model="refreshInterval"
            :options="refreshOptions"
          />
        </div>
      </Card>

      <ApiDataExplorer
        v-if="Object.keys(sessionApiData).length"
        :data="sessionApiData"
        title="Dados da API (grupo e sessão)"
      />

      <!-- Save Button -->
      <div class="flex justify-end">
        <Button :loading="isSaving" @click="saveSettings">
          <Save class="h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  </MainLayout>
</template>
