<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

interface Props {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Dashboard',
})

const sidebarCollapsed = ref(false)
</script>

<template>
  <div class="flex h-screen bg-background">
    <Sidebar v-model:collapsed="sidebarCollapsed" />
    
    <div class="flex flex-1 flex-col overflow-hidden">
      <Header :title="title" />
      
      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
