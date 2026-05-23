import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

/** Fecha o drawer (volta na história do browser). */
export function useDetailClose() {
  const router = useRouter()

  function close() {
    router.back()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') close()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  return { close }
}
