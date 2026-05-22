<script setup lang="ts">
import { RouterView } from 'vue-router'
import { usePwaInstall } from '@/composables/usePwaInstall'

const { canInstall, install } = usePwaInstall()
</script>

<template>
  <button v-if="canInstall" @click="install" class="pwa-install-btn">
    📲 Instalar App
  </button>

  <RouterView />
</template>
