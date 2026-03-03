<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import katex from 'katex'
import { computed } from 'vue'

const props = defineProps<{
  node: {
    attrs: {
      content: string
    }
  }
  selected: boolean
}>()

const renderedLatex = computed(() => {
  try {
    return katex.renderToString(props.node.attrs.content, {
      throwOnError: false,
      displayMode: false,
    })
  } catch (error) {
    return `<span class="latex-error">${props.node.attrs.content}</span>`
  }
})
</script>

<template>
  <NodeViewWrapper
    as="span"
    class="latex-wrapper"
    :class="{ 'is-selected': selected }"
  >
    <span
      class="latex-content"
      v-html="renderedLatex"
      :title="node.attrs.content"
    />
  </NodeViewWrapper>
</template>

<style scoped>
.latex-wrapper {
  display: inline;
  cursor: pointer;
}

.latex-wrapper.is-selected .latex-content {
  background-color: rgba(59, 130, 246, 0.3);
  border-radius: 0.25rem;
}

.latex-content {
  display: inline;
  padding: 0 0.125rem;
}

.latex-content :deep(.katex) {
  font-size: 1.1em;
}

.latex-content :deep(.latex-error) {
  color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
}
</style>
