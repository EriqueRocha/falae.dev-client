<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import mermaid from 'mermaid'
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps<{
  node: {
    attrs: {
      content: string
    }
  }
  selected: boolean
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const hasError = ref(false)
const errorMessage = ref('')
const isInitialized = ref(false)

const renderDiagram = async () => {
  if (!containerRef.value || !props.node.attrs.content) return

  try {
    const id = `mermaid-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const { svg } = await mermaid.render(id, props.node.attrs.content)
    if (containerRef.value) {
      containerRef.value.innerHTML = svg
    }
    hasError.value = false
  } catch (error: any) {
    hasError.value = true
    errorMessage.value = error.message || 'Erro ao renderizar diagrama'
    if (containerRef.value) {
      containerRef.value.innerHTML = ''
    }
  }
}

onMounted(async () => {
  if (!isInitialized.value) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      suppressErrorRendering: true
    })
    isInitialized.value = true
  }
  await nextTick()
  renderDiagram()
})

watch(() => props.node.attrs.content, async () => {
  await nextTick()
  renderDiagram()
})
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="mermaid-wrapper"
    :class="{ 'is-selected': selected }"
  >
    <div
      ref="containerRef"
      class="mermaid-content"
      :title="node.attrs.content"
    />
    <div v-if="hasError" class="mermaid-error">
      {{ errorMessage }}
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.mermaid-wrapper {
  margin: 1rem 0;
  padding: 1rem;
  background-color: rgb(30 41 59);
  border-radius: 0.5rem;
  overflow-x: auto;
}

.mermaid-wrapper.is-selected {
  outline: 2px solid rgb(59 130 246);
}

.mermaid-content {
  display: flex;
  justify-content: center;
  min-height: 100px;
}

.mermaid-content :deep(svg) {
  max-width: 100%;
  height: auto;
}

.mermaid-error {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
  padding: 0.5rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
  text-align: center;
  margin-top: 0.5rem;
}
</style>
