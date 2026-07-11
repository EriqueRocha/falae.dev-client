<script setup lang="ts">
useSeoMeta({
  title: 'Criar conta · Falae.dev',
  description: 'Crie sua conta no Falae.dev e participe da comunidade.',
})

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

    <div v-else class="w-full max-w-md bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl shadow-black/40">
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
        <div v-if="error" role="alert" class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
          {{ error }}
        </div>

        <div>
          <label for="signup-name" class="sr-only">Nome</label>
          <input
            id="signup-name"
            v-model="name"
            type="text"
            name="name"
            autocomplete="name"
            placeholder="Nome"
            class="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700/60 rounded-lg px-4 py-3 transition-colors focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label for="signup-username" class="sr-only">Nome de usuário</label>
          <input
            id="signup-username"
            v-model="username"
            type="text"
            name="username"
            autocomplete="username"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            placeholder="Nome de usuário ( letras min, numeros e - )"
            class="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700/60 rounded-lg px-4 py-3 transition-colors focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label for="signup-email" class="sr-only">Email</label>
          <input
            id="signup-email"
            v-model="email"
            type="email"
            name="email"
            autocomplete="email"
            inputmode="email"
            placeholder="Email"
            class="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700/60 rounded-lg px-4 py-3 transition-colors focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label for="signup-password" class="sr-only">Senha</label>
          <input
            id="signup-password"
            v-model="password"
            type="password"
            name="new-password"
            autocomplete="new-password"
            placeholder="Senha"
            class="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700/60 rounded-lg px-4 py-3 transition-colors focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label for="signup-confirm-password" class="sr-only">Confirmar senha</label>
          <input
            id="signup-confirm-password"
            v-model="confirmPassword"
            type="password"
            name="confirm-password"
            autocomplete="new-password"
            placeholder="Confirmar senha"
            class="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700/60 rounded-lg px-4 py-3 transition-colors focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium py-3 rounded-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.99] transition-all"
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
