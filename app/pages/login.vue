<script setup lang="ts">
const { login, isAuthenticated } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

const handleGoogleError = (message: string) => {
  error.value = message
}

watchEffect(() => {
  if (isAuthenticated.value) {
    navigateTo('/')
  }
})

const handleSubmit = async () => {
  error.value = ''
  loading.value = true

  try {
    if (!email.value || !password.value) {
      error.value = 'Preencha todos os campos'
      return
    }

    const success = await login(email.value, password.value)
    if (success) {
      navigateTo('/')
    }
  } catch (e: any) {
    if (e?.statusCode === 401 || e?.status === 401) {
      error.value = 'Email ou senha incorretos'
    } else {
      error.value = 'Erro ao fazer login. Tente novamente.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
    <div class="w-full max-w-md bg-slate-900 rounded-xl p-8 border border-slate-800">
      <h1 class="text-2xl font-bold text-white text-center mb-8">Entrar</h1>

      <div class="space-y-4 mb-6">
        <GoogleSignInButton @error="handleGoogleError" />
      </div>

      <div class="relative flex items-center mb-6">
        <div class="flex-grow border-t border-slate-700"></div>
        <span class="flex-shrink mx-4 text-slate-500 text-sm">ou</span>
        <div class="flex-grow border-t border-slate-700"></div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div v-if="error" class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
          {{ error }}
        </div>

        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Senha"
            class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            :title="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
          >
            <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>

        <div class="text-center">
          <NuxtLink to="/cadastro" class="text-blue-400 hover:text-blue-300 transition-colors">
            Cadastrar
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
