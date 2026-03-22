<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  node: {
    attrs: {
      src: string
      alt?: string
      title?: string
      width: number
    }
  }
  updateAttributes: (attrs: Record<string, any>) => void
  selected: boolean
}>()

const imageContainerRef = ref<HTMLElement | null>(null)
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)
const containerWidth = ref(0)

const imageStyle = computed(() => ({
  width: `${props.node.attrs.width}%`,
  maxWidth: '100%',
}))

const getContainerWidth = () => {
  if (imageContainerRef.value) {
    const parent = imageContainerRef.value.closest('.tiptap') as HTMLElement
    if (parent) {
      containerWidth.value = parent.clientWidth
    }
  }
}

const startResize = (e: MouseEvent | TouchEvent) => {
  e.preventDefault()
  e.stopPropagation()

  isResizing.value = true
  getContainerWidth()

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  startX.value = clientX
  startWidth.value = props.node.attrs.width

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.addEventListener('touchmove', onResize, { passive: false })
  document.addEventListener('touchend', stopResize)
}

const onResize = (e: MouseEvent | TouchEvent) => {
  if (!isResizing.value || containerWidth.value === 0) return

  e.preventDefault()

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const deltaX = clientX - startX.value
  const deltaPercent = (deltaX / containerWidth.value) * 100

  let newWidth = startWidth.value + deltaPercent
  newWidth = Math.max(20, Math.min(100, newWidth))

  props.updateAttributes({ width: Math.round(newWidth) })
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', onResize)
  document.removeEventListener('touchend', stopResize)
}

onMounted(() => {
  getContainerWidth()
  window.addEventListener('resize', getContainerWidth)
})

onBeforeUnmount(() => {
  stopResize()
  window.removeEventListener('resize', getContainerWidth)
})
</script>

<template>
  <NodeViewWrapper class="resizable-image-wrapper">
    <div
      ref="imageContainerRef"
      class="resizable-image-container"
      :class="{ 'is-selected': selected, 'is-resizing': isResizing }"
      :style="imageStyle"
    >
      <img
        :src="node.attrs.src"
        :alt="node.attrs.alt || ''"
        :title="node.attrs.title || ''"
        draggable="false"
      />
      <div
        v-if="selected"
        class="resize-handle resize-handle-right"
        @mousedown="startResize"
        @touchstart="startResize"
      >
        <div class="resize-handle-inner"></div>
      </div>
      <div v-if="selected" class="size-indicator">
        {{ node.attrs.width }}%
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.resizable-image-wrapper {
  display: block;
  margin: 1rem 0;
}

.resizable-image-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
}

.resizable-image-container img {
  width: 100%;
  height: auto;
  border-radius: 0.375rem;
  display: block;
}

.resizable-image-container.is-selected {
  outline: 3px solid rgb(59 130 246);
  outline-offset: 2px;
  border-radius: 0.5rem;
}

.resizable-image-container.is-resizing {
  outline-color: rgb(34 197 94);
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -6px;
  width: 16px;
  height: 100%;
  cursor: ew-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.resize-handle-inner {
  width: 4px;
  height: 40px;
  max-height: 60%;
  background: rgb(59 130 246);
  border-radius: 2px;
  transition: background-color 0.15s, transform 0.15s;
}

.resize-handle:hover .resize-handle-inner,
.is-resizing .resize-handle-inner {
  background: rgb(34 197 94);
  transform: scaleY(1.1);
}

.size-indicator {
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgb(30 41 59);
  color: rgb(148 163 184);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
}

/* Mobile: imagens sempre 100%, sem resize */
@media (max-width: 640px) {
  .resizable-image-container {
    width: 100% !important;
  }

  .resize-handle,
  .size-indicator {
    display: none;
  }
}

/* Tablets com touch: handles maiores para facilitar uso */
@media (pointer: coarse) and (min-width: 641px) {
  .resize-handle {
    width: 32px;
    right: -14px;
  }

  .resize-handle-inner {
    width: 8px;
    height: 60px;
    background: rgb(59 130 246 / 0.8);
  }
}
</style>
