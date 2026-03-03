<script setup lang="ts">
const config = useRuntimeConfig()
const { loginWithGoogle } = useAuth()

const emit = defineEmits<{
  success: []
  error: [message: string]
}>()

const loading = ref(false)
const scriptLoaded = ref(false)

const loadGoogleScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (scriptLoaded.value || window.google?.accounts) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      scriptLoaded.value = true
      resolve()
    }
    script.onerror = () => reject(new Error('Falha ao carregar Google Sign-In'))
    document.head.appendChild(script)
  })
}

const initializeGoogle = async () => {
  await loadGoogleScript()

  window.google.accounts.id.initialize({
    client_id: config.public.googleClientId,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true
  })
}

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

const handleClick = async () => {
  if (loading.value) return

  try {
    await initializeGoogle()
    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-fallback')!,
          {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: 300
          }
        )
        document.getElementById('google-signin-fallback')?.querySelector('div')?.click()
      }
    })
  } catch (e) {
    emit('error', 'Erro ao inicializar Google Sign-In')
  }
}

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

onMounted(() => {
  loadGoogleScript().catch(() => {})
})
</script>

<template>
  <div>
    <button
      type="button"
      :disabled="loading"
      @click="handleClick"
      class="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
    >
      <svg v-if="!loading" class="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <div v-else class="w-5 h-5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin"></div>
      {{ loading ? 'Entrando...' : 'Continuar com Google' }}
    </button>
    <div id="google-signin-fallback" class="hidden"></div>
  </div>
</template>
