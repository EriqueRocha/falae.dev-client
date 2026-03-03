<script setup lang="ts">
const route = useRoute()
const { verifyEmail, user, isAuthenticated } = useAuth()

const status = ref<'loading' | 'success' | 'error' | 'already-verified'>('loading')
const errorMessage = ref('')
const userName = ref('')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    status.value = 'error'
    errorMessage.value = 'Token de verificacao nao encontrado'
    return
  }

  try {
    const response = await verifyEmail(token)
    userName.value = response.userName
    status.value = 'success'

    setTimeout(() => {
      navigateTo(`/autor/${response.userName}`)
    }, 3000)
  } catch (e: any) {
    if (e.statusCode === 422) {
      status.value = 'already-verified'
      if (isAuthenticated.value && user.value?.userName) {
        setTimeout(() => {
          navigateTo(`/autor/${user.value!.userName}`)
        }, 3000)
      }
    } else if (e.statusCode === 400) {
      status.value = 'error'
      errorMessage.value = 'Token invalido ou expirado. Solicite um novo email de verificacao.'
    } else {
      status.value = 'error'
      errorMessage.value = 'Erro ao verificar email. Tente novamente mais tarde.'
    }
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <div
        v-if="status === 'loading'"
        class="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center"
      >
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h1 class="text-xl font-bold text-white mb-2">Verificando email...</h1>
        <p class="text-slate-400">Aguarde enquanto verificamos seu email.</p>
      </div>

      <div
        v-else-if="status === 'success'"
        class="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center"
      >
        <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-white mb-2">Email verificado com sucesso!</h1>
        <p class="text-slate-400 mb-6">
          Seu email foi verificado. Agora voce pode criar artigos, topicos e comentarios.
        </p>
        <p class="text-slate-500 text-sm mb-4">Redirecionando para seu perfil...</p>
        <NuxtLink
          :to="`/autor/${userName}`"
          class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Ir para meu perfil
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </NuxtLink>
      </div>

      <div
        v-else-if="status === 'already-verified'"
        class="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center"
      >
        <div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-white mb-2">Email ja verificado</h1>
        <p class="text-slate-400 mb-6">
          Seu email ja foi verificado anteriormente.
        </p>
        <template v-if="isAuthenticated && user?.userName">
          <p class="text-slate-500 text-sm mb-4">Redirecionando para seu perfil...</p>
          <NuxtLink
            :to="`/autor/${user.userName}`"
            class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Ir para meu perfil
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink
            to="/login"
            class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Fazer login
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </template>
      </div>

      <div
        v-else-if="status === 'error'"
        class="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center"
      >
        <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-white mb-2">Erro na verificacao</h1>
        <p class="text-slate-400 mb-6">{{ errorMessage }}</p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <NuxtLink
            to="/login"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Fazer login
          </NuxtLink>
          <NuxtLink
            to="/"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Ir para o inicio
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
