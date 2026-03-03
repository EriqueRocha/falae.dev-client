<script setup lang="ts">
import katex from 'katex'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [latex: string]
}>()

const latexInput = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)

const renderedPreview = computed(() => {
  if (!latexInput.value.trim()) {
    return '<span class="placeholder">Preview da formula</span>'
  }

  try {
    return katex.renderToString(latexInput.value, {
      throwOnError: false,
      displayMode: true,
    })
  } catch (error: any) {
    return `<span class="error">Erro: ${error.message}</span>`
  }
})

const hasError = computed(() => {
  if (!latexInput.value.trim()) return false

  try {
    katex.renderToString(latexInput.value, { throwOnError: true })
    return false
  } catch {
    return true
  }
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    latexInput.value = ''
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

const handleSubmit = () => {
  if (latexInput.value.trim() && !hasError.value) {
    emit('submit', latexInput.value.trim())
    latexInput.value = ''
  }
}

const handleClose = () => {
  latexInput.value = ''
  emit('close')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
  //Ctrl/Cmd + Enter para submeter
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    handleSubmit()
  }
}

const examples = [
  { label: 'Fracao', value: '\\frac{a}{b}' },
  { label: 'Raiz', value: '\\sqrt{x}' },
  { label: 'Potencia', value: 'x^{2}' },
  { label: 'Indice', value: 'x_{i}' },
  { label: 'Soma', value: '\\sum_{i=1}^{n} x_i' },
  { label: 'Integral', value: '\\int_{a}^{b} f(x) dx' },
]

const insertExample = (value: string) => {
  latexInput.value = value
  inputRef.value?.focus()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click.self="handleClose"
        @keydown="handleKeydown"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Inserir Formula LaTeX</h3>
            <button
              type="button"
              class="close-btn"
              @click="handleClose"
              aria-label="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="examples">
              <span class="examples-label">Exemplos:</span>
              <div class="examples-list">
                <button
                  v-for="example in examples"
                  :key="example.label"
                  type="button"
                  class="example-btn"
                  @click="insertExample(example.value)"
                >
                  {{ example.label }}
                </button>
              </div>
            </div>

            <div class="input-group">
              <label class="input-label">Expressao LaTeX</label>
              <textarea
                ref="inputRef"
                v-model="latexInput"
                placeholder="Ex: \frac{a}{b}, \sqrt{x}, x^{2}"
                class="latex-input"
                :class="{ 'has-error': hasError }"
                rows="3"
              />
              <span class="input-hint">Pressione Ctrl+Enter para inserir</span>
            </div>

            <div class="preview-group">
              <label class="preview-label">Preview</label>
              <div
                class="preview-content"
                :class="{ 'has-error': hasError }"
                v-html="renderedPreview"
              />
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="btn-cancel"
                @click="handleClose"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn-submit"
                :disabled="!latexInput.trim() || hasError"
                @click="handleSubmit"
              >
                Inserir Formula
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.modal-content {
  background-color: rgb(30 41 59);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 32rem;
  margin: 1rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgb(51 65 85);
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgb(148 163 184);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.375rem;
  transition: all 0.15s;
}

.close-btn:hover {
  color: white;
  background-color: rgb(51 65 85);
}

.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.examples {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.examples-label {
  font-size: 0.75rem;
  color: rgb(148 163 184);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.examples-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.example-btn {
  padding: 0.375rem 0.75rem;
  background-color: rgb(51 65 85);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.375rem;
  color: rgb(203 213 225);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.example-btn:hover {
  background-color: rgb(71 85 105);
  color: white;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.input-label,
.preview-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(203 213 225);
}

.latex-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: rgb(51 65 85);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.5rem;
  color: white;
  font-family: ui-monospace, monospace;
  font-size: 0.95rem;
  outline: none;
  resize: none;
  transition: border-color 0.15s;
}

.latex-input::placeholder {
  color: rgb(100 116 139);
}

.latex-input:focus {
  border-color: rgb(59 130 246);
}

.latex-input.has-error {
  border-color: rgb(239 68 68);
}

.input-hint {
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.preview-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.preview-content {
  min-height: 4rem;
  padding: 1rem;
  background-color: rgb(15 23 42);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  overflow-x: auto;
}

.preview-content.has-error {
  border-color: rgb(239 68 68);
}

.preview-content :deep(.placeholder) {
  color: rgb(100 116 139);
  font-style: italic;
}

.preview-content :deep(.error) {
  color: rgb(239 68 68);
  font-size: 0.875rem;
}

.preview-content :deep(.katex) {
  font-size: 1.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.btn-cancel,
.btn-submit {
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.btn-cancel {
  background-color: rgb(51 65 85);
  color: rgb(203 213 225);
}

.btn-cancel:hover {
  background-color: rgb(71 85 105);
  color: white;
}

.btn-submit {
  background-color: rgb(59 130 246);
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background-color: rgb(37 99 235);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
