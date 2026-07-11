<script setup lang="ts">
useSeoMeta({
  title: 'Meu perfil · Falae.dev',
  description: 'Gerencie seu perfil no Falae.dev.',
})

const { user, isAuthenticated } = useAuth()

watchEffect(() => {
  if (!isAuthenticated.value) {
    navigateTo('/login', { replace: true })
  } else if (user.value?.userName) {
    navigateTo(`/autor/${user.value.userName}`, { replace: true })
  }
})
</script>

<template>
  <div class="flex justify-center py-20">
    <div class="animate-spin rounded-full h-12 w-12 border-2 border-slate-700 border-t-blue-500"></div>
  </div>
</template>
