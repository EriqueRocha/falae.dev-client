<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex flex-col">
    <Navbar />
    <main class="flex-1">
      <slot />
    </main>
    <Footer />
  </div>
</template>
