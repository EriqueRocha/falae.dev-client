<script setup lang="ts">
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
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
</template>
