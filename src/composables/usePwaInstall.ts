import { ref } from 'vue'

const deferredPrompt = ref<any>(null)
const canInstall = ref(false)

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    canInstall.value = true
})

export function usePwaInstall() {
    const install = async () => {
        if (!deferredPrompt.value) return

        deferredPrompt.value.prompt()

        const choice = await deferredPrompt.value.userChoice

        if (choice.outcome === 'accepted') {
            console.log('App instalado')
        }

        deferredPrompt.value = null
        canInstall.value = false
    }

    return {
        canInstall,
        install
    }
}
