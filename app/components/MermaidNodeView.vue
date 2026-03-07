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
  updateAttributes: (attrs: Record<string, any>) => void
}>()

const emit = defineEmits<{
  edit: [content: string]
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

const handleEdit = () => {
  // Dispara evento customizado que será capturado pelo TiptapEditor
  const event = new CustomEvent('mermaid-edit', {
    detail: {
      content: props.node.attrs.content,
      updateContent: (newContent: string) => {
        props.updateAttributes({ content: newContent })
      }
    },
    bubbles: true
  })
  containerRef.value?.dispatchEvent(event)
}

const handleDoubleClick = () => {
  handleEdit()
}
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="mermaid-wrapper"
    :class="{ 'is-selected': selected }"
    @dblclick="handleDoubleClick"
  >
    <button
      type="button"
      class="edit-btn"
      @click.stop="handleEdit"
      title="Editar diagrama"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
    <div
      ref="containerRef"
      class="mermaid-content"
      :title="node.attrs.content"
    />
    <div v-if="hasError" class="mermaid-error">
      {{ errorMessage }}
    </div>
    <div class="edit-hint">Duplo clique para editar</div>
  </NodeViewWrapper>
</template>

<style scoped>
.mermaid-wrapper {
  position: relative;
  margin: 1rem 0;
  padding: 1rem;
  background-color: rgb(30 41 59);
  border-radius: 0.5rem;
  overflow-x: auto;
  cursor: pointer;
  transition: background-color 0.15s;
}

.mermaid-wrapper:hover {
  background-color: rgb(51 65 85);
}

.mermaid-wrapper.is-selected {
  outline: 2px solid rgb(59 130 246);
}

.edit-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.5rem;
  background-color: rgb(59 130 246);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background-color 0.15s;
  z-index: 10;
}

.mermaid-wrapper:hover .edit-btn,
.mermaid-wrapper.is-selected .edit-btn {
  opacity: 1;
}

.edit-btn:hover {
  background-color: rgb(37 99 235);
}

.edit-hint {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: rgb(148 163 184);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

.mermaid-wrapper:hover .edit-hint {
  opacity: 1;
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
