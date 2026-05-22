<script setup lang="ts">
import { RouterView } from 'vue-router'
import { usePwaInstall } from '@/composables/usePwaInstall'

const { canInstall, install } = usePwaInstall()
</script>

<template>
  <button v-if="canInstall" @click="install">
    Instalar App
  </button>

  <RouterView />
</template>
