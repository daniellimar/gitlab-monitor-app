<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Spinner from '@/components/ui/Spinner.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const status = ref<'processing' | 'success' | 'error'>('processing')
const errorMessage = ref('')

onMounted(async () => {
  const code = route.query.code as string
  const state = route.query.state as string
  const error = route.query.error as string

  if (error) {
    status.value = 'error'
    errorMessage.value = route.query.error_description as string || 'Autorização negada'
    return
  }

  if (!code || !state) {
    status.value = 'error'
    errorMessage.value = 'Parâmetros de callback inválidos'
    return
  }

  const success = await authStore.handleOAuthCallback(code, state)
  
  if (success) {
    status.value = 'success'
    setTimeout(() => {
      router.push('/')
    }, 1500)
  } else {
    status.value = 'error'
    errorMessage.value = authStore.error || 'Falha na autenticação'
  }
})

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <div class="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
      <!-- Processing -->
      <template v-if="status === 'processing'">
        <Spinner size="xl" class="mx-auto mb-4 text-primary" />
        <h2 class="text-lg font-semibold text-foreground">Processando autenticação...</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Aguarde enquanto validamos suas credenciais
        </p>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
          <svg
            class="h-8 w-8 text-success"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-foreground">Autenticação bem-sucedida!</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Redirecionando para o dashboard...
        </p>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
          <svg
            class="h-8 w-8 text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-foreground">Falha na autenticação</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ errorMessage }}
        </p>
        <button
          class="mt-4 text-sm font-medium text-primary hover:underline"
          @click="goToLogin"
        >
          Voltar para login
        </button>
      </template>
    </div>
  </div>
</template>
