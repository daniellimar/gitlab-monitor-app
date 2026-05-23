<script setup lang="ts">
import { X } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

interface Props {
  title?: string
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      @click="onBackdropClick"
    >
      <aside
        class="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-xl"
        @click.stop
      >
        <header class="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 class="truncate pr-4 text-lg font-semibold text-foreground">
            {{ title || 'Detalhes' }}
          </h2>
          <Button variant="ghost" size="icon" @click="emit('close')">
            <X class="h-5 w-5" />
            <span class="sr-only">Fechar</span>
          </Button>
        </header>

        <div class="flex-1 overflow-y-auto px-6 py-4">
          <slot />
        </div>
      </aside>
    </div>
  </Teleport>
</template>
