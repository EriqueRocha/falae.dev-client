<script setup lang="ts">
const config = useRuntimeConfig()
const { loginWithGoogle } = useAuth()

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const loading = ref(false)
const googleButtonRef = ref<HTMLElement | null>(null)

const handleCredentialResponse = async (response: { credential: string }) => {
  loading.value = true
  try {
    await loginWithGoogle(response.credential)
    emit('success')
    navigateTo('/')
  } catch (e: any) {
    if (e?.statusCode === 422 || e?.status === 422) {
      emit('error', 'Este email ja esta registrado com senha. Use o login tradicional.')
    } else if (e?.statusCode === 401 || e?.status === 401) {
      emit('error', 'Token do Google invalido ou email nao verificado.')
    } else {
      emit('error', 'Erro ao fazer login com Google. Tente novamente.')
    }
  } finally {
    loading.value = false
  }
}

const getElementWidth = (el: HTMLElement): Promise<number> => {
  return new Promise((resolve) => {
    const width = el.offsetWidth
    if (width > 0) {
      resolve(width)
      return
    }
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w > 0) {
        observer.disconnect()
        resolve(w)
      }
    })
    observer.observe(el)
  })
}

onMounted(async () => {
  try {
    if (!window.google?.accounts) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Falha ao carregar Google Sign-In'))
        document.head.appendChild(script)
      })
    }

    const width = await getElementWidth(googleButtonRef.value!)

    window.google.accounts.id.initialize({
      client_id: config.public.googleClientId,
      callback: handleCredentialResponse,
      auto_select: false,
    })

    window.google.accounts.id.renderButton(
      googleButtonRef.value!,
      {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width,
        locale: 'pt-BR',
      }
    )
  } catch (e) {
    emit('error', 'Erro ao inicializar Google Sign-In')
  }
})

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (callback?: (notification: any) => void) => void
          renderButton: (element: HTMLElement, config: any) => void
        }
      }
    }
  }
}
</script>

<template>
  <div class="w-full">
    <div
      v-if="loading"
      class="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium py-3 px-4 rounded-lg"
    >
      <div class="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin"></div>
      Entrando...
    </div>
    <div v-else ref="googleButtonRef" class="w-full flex justify-center"></div>
  </div>
</template>
