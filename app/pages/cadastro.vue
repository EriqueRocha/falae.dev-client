<script setup lang="ts">
const { register, isAuthenticated } = useAuth()

const name = ref('')
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const showSuccessMessage = ref(false)

const handleGoogleError = (message: string) => {
  error.value = message
}

watchEffect(() => {
  if (isAuthenticated.value && !showSuccessMessage.value) {
    navigateTo('/')
  }
})

const handleSubmit = async () => {
  error.value = ''
  loading.value = true

  try {
    if (!name.value || !username.value || !email.value || !password.value || !confirmPassword.value) {
      error.value = 'Preencha todos os campos'
      return
    }

    if (password.value !== confirmPassword.value) {
      error.value = 'As senhas não coincidem'
      return
    }

    if (password.value.length < 6) {
      error.value = 'A senha deve ter pelo menos 6 caracteres'
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username.value)) {
      error.value = 'O nome de usuário pode conter apenas letras, números, _ e -'
      return
    }

    const success = await register(name.value, username.value, email.value, password.value)
    if (success) {
      showSuccessMessage.value = true
      setTimeout(() => {
        navigateTo('/')
      }, 3000)
    }
  } catch (e: any) {
    if (e?.statusCode === 409 || e?.status === 409) {
      error.value = 'Email ou usuário já cadastrado'
    } else {
      error.value = 'Erro ao cadastrar. Tente novamente.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
    <div v-if="showSuccessMessage" class="w-full max-w-md bg-slate-900 rounded-xl p-8 border border-slate-800 text-center">
      <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 class="text-xl font-bold text-white mb-2">Conta criada com sucesso!</h1>
      <p class="text-slate-400 mb-4">
        Enviamos um email de verificacao para <span class="text-white font-medium">{{ email }}</span>
      </p>
      <p class="text-slate-500 text-sm mb-6">
        Verifique sua caixa de entrada e clique no link para ativar sua conta.
      </p>
      <p class="text-slate-500 text-sm">Redirecionando...</p>
    </div>

    <div v-else class="w-full max-w-md bg-slate-900 rounded-xl p-8 border border-slate-800">
      <h1 class="text-2xl font-bold text-white text-center mb-8">Cadastrar</h1>

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
          v-model="name"
          type="text"
          placeholder="Nome"
          class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          v-model="username"
          type="text"
          placeholder="Nome de usuário ( letras min, numeros e - )"
          class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          v-model="email"
          type="email"
          placeholder="Email"
          class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          v-model="password"
          type="password"
          placeholder="Senha"
          class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          v-model="confirmPassword"
          type="password"
          placeholder="Confirmar senha"
          class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {{ loading ? 'Cadastrando...' : 'Cadastrar' }}
        </button>

        <div class="text-center">
          <span class="text-slate-400">Já tem uma conta? </span>
          <NuxtLink to="/login" class="text-blue-400 hover:text-blue-300 transition-colors">
            Entrar
          </NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>
