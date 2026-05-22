<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { GitlabIcon, Key, ExternalLink } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'

const router = useRouter()
const authStore = useAuthStore()

const patToken = ref('')
const isPatMode = ref(true)

async function handlePatLogin() {
  if (!patToken.value.trim()) return
  authStore.setPatToken(patToken.value.trim())
  router.push('/')
}

async function handleOAuthLogin() {
  await authStore.startOAuthFlow()
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md p-8">
      <!-- Logo -->
      <div class="mb-8 flex flex-col items-center">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <GitlabIcon class="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 class="text-2xl font-bold text-foreground">GitLab Metrics</h1>
        <p class="mt-2 text-center text-sm text-muted-foreground">
          Conecte-se ao GitLab para visualizar suas métricas
        </p>
      </div>

      <!-- Error Message -->
      <div
        v-if="authStore.error"
        class="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
      >
        {{ authStore.error }}
      </div>

      <!-- Auth Mode Tabs -->
      <div class="mb-6 flex rounded-lg bg-muted p-1">
        <button
          :class="[
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            isPatMode
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="isPatMode = true"
        >
          Personal Token
        </button>
        <button
          :class="[
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            !isPatMode
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="isPatMode = false"
        >
          OAuth2
        </button>
      </div>

      <!-- PAT Login Form -->
      <div v-if="isPatMode" class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-foreground">
            Personal Access Token
          </label>
          <div class="relative">
            <Key class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="patToken"
              type="password"
              placeholder="glpat-xxxxxxxxxxxx"
              class="pl-10"
              @keyup.enter="handlePatLogin"
            />
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            Crie um token em GitLab &gt; Settings &gt; Access Tokens com escopo
            <code class="rounded bg-muted px-1">read_api</code>
          </p>
        </div>

        <Button
          class="w-full"
          :loading="authStore.isLoading"
          :disabled="!patToken.trim()"
          @click="handlePatLogin"
        >
          Conectar com Token
        </Button>
      </div>

      <!-- OAuth Login -->
      <div v-else class="space-y-4">
        <div class="rounded-lg border border-border bg-muted/50 p-4">
          <h3 class="mb-2 font-medium text-foreground">OAuth2 com PKCE</h3>
          <p class="text-sm text-muted-foreground">
            Login seguro via GitLab. Você será redirecionado para autorizar o acesso.
          </p>
        </div>

        <Button
          class="w-full"
          :loading="authStore.isLoading"
          @click="handleOAuthLogin"
        >
          <ExternalLink class="h-4 w-4" />
          Entrar com GitLab
        </Button>

        <p class="text-center text-xs text-muted-foreground">
          Requer configuração de OAuth Application no GitLab
        </p>
      </div>

      <!-- Divider -->
      <div class="my-6 flex items-center gap-4">
        <div class="h-px flex-1 bg-border" />
        <span class="text-xs text-muted-foreground">ou</span>
        <div class="h-px flex-1 bg-border" />
      </div>

      <!-- Environment Config Info -->
      <div class="rounded-lg border border-border bg-muted/30 p-4">
        <h4 class="mb-2 text-sm font-medium text-foreground">
          Configuração via Ambiente
        </h4>
        <p class="text-xs text-muted-foreground">
          Configure <code class="rounded bg-muted px-1">VITE_GITLAB_TOKEN</code> para
          autenticação automática via variáveis de ambiente.
        </p>
      </div>
    </Card>
  </div>
</template>
