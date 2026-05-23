<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ChevronRight, Copy, Check, Search } from 'lucide-vue-next'
import { flattenApiObject } from '@/utils/apiDataDisplay'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'

interface Props {
  data: unknown
  title?: string
  defaultOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Todos os dados da API',
  defaultOpen: false,
})

const isOpen = ref(props.defaultOpen)
const search = ref('')
const copied = ref(false)

const rows = computed(() => flattenApiObject(props.data))

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(
    (r) => r.key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q)
  )
})

const jsonPreview = computed(() => JSON.stringify(props.data, null, 2))

async function copyJson() {
  await navigator.clipboard.writeText(jsonPreview.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <section class="rounded-lg border border-border">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30"
      @click="isOpen = !isOpen"
    >
      <span class="flex items-center gap-2 text-sm font-medium text-foreground">
        <component :is="isOpen ? ChevronDown : ChevronRight" class="h-4 w-4" />
        {{ title }}
        <span class="font-normal text-muted-foreground">({{ rows.length }} campos)</span>
      </span>
      <Button
        v-if="isOpen"
        variant="ghost"
        size="sm"
        class="shrink-0"
        @click.stop="copyJson"
      >
        <Check v-if="copied" class="h-4 w-4 text-success" />
        <Copy v-else class="h-4 w-4" />
        JSON
      </Button>
    </button>

    <div v-if="isOpen" class="border-t border-border px-4 pb-4 pt-3">
      <div class="relative mb-3">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input v-model="search" placeholder="Filtrar campos..." class="pl-9" />
      </div>

      <div class="max-h-80 overflow-auto rounded-md border border-border">
        <table class="w-full text-left text-xs">
          <thead class="sticky top-0 bg-muted">
            <tr>
              <th class="px-3 py-2 font-medium text-muted-foreground">Campo</th>
              <th class="px-3 py-2 font-medium text-muted-foreground">Valor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="row in filteredRows"
              :key="row.key"
              class="hover:bg-muted/20"
            >
              <td class="px-3 py-2 align-top font-mono text-primary">{{ row.key }}</td>
              <td class="break-all px-3 py-2 text-foreground">{{ row.value }}</td>
            </tr>
          </tbody>
        </table>
        <p
          v-if="filteredRows.length === 0"
          class="py-6 text-center text-sm text-muted-foreground"
        >
          Nenhum campo corresponde ao filtro
        </p>
      </div>

      <details class="mt-3">
        <summary class="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Ver JSON bruto
        </summary>
        <pre
          class="mt-2 max-h-48 overflow-auto rounded-md bg-muted/40 p-3 text-[10px] leading-relaxed text-foreground"
        >{{ jsonPreview }}</pre>
      </details>
    </div>
  </section>
</template>
