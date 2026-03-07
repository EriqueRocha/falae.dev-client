<script setup lang="ts">
import mermaid from 'mermaid'

const props = defineProps<{
  isOpen: boolean
  initialContent?: string
  isEditMode?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [mermaidCode: string]
}>()

const mermaidInput = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLDivElement | null>(null)
const hasError = ref(false)
const errorMessage = ref('')
const isRendering = ref(false)
const isInitialized = ref(false)

const examples = [
  {
    label: 'Fluxograma',
    value: `graph TD
  A[Inicio] --> B{Decisao}
  B -->|Sim| C[Resultado 1]
  B -->|Nao| D[Resultado 2]`
  },
  {
    label: 'Sequencia',
    value: `sequenceDiagram
  participant U as Usuario
  participant S as Sistema
  U->>S: Requisicao
  S-->>U: Resposta`
  },
  {
    label: 'Classe',
    value: `classDiagram
  class Animal {
    +String nome
    +comer()
  }
  class Cachorro {
    +latir()
  }
  Animal <|-- Cachorro`
  },
  {
    label: 'Estado',
    value: `stateDiagram-v2
  [*] --> Inativo
  Inativo --> Ativo: iniciar
  Ativo --> Inativo: parar
  Ativo --> [*]`
  },
  {
    label: 'ER',
    value: `erDiagram
  CLIENTE ||--o{ PEDIDO : faz
  PEDIDO ||--|{ ITEM : contem
  PRODUTO ||--o{ ITEM : possui`
  },
  {
    label: 'Gantt',
    value: `gantt
  title Cronograma
  dateFormat YYYY-MM-DD
  section Fase 1
  Tarefa 1: 2024-01-01, 30d
  Tarefa 2: 2024-02-01, 20d`
  }
]

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const renderPreview = async () => {
  if (!previewRef.value) return

  if (!mermaidInput.value.trim()) {
    previewRef.value.innerHTML = '<span class="placeholder">Preview do diagrama</span>'
    hasError.value = false
    return
  }

  isRendering.value = true

  try {
    const id = `mermaid-preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const { svg } = await mermaid.render(id, mermaidInput.value)
    if (previewRef.value) {
      previewRef.value.innerHTML = svg
    }
    hasError.value = false
    errorMessage.value = ''
  } catch (error: any) {
    hasError.value = true
    errorMessage.value = error.message || 'Erro de sintaxe no diagrama'
    if (previewRef.value) {
      previewRef.value.innerHTML = `<span class="error">${errorMessage.value}</span>`
    }
  } finally {
    isRendering.value = false
  }
}

const debouncedRenderPreview = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(renderPreview, 300)
}

watch(mermaidInput, debouncedRenderPreview)

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    if (!isInitialized.value) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        suppressErrorRendering: true
      })
      isInitialized.value = true
    }

    mermaidInput.value = props.initialContent || ''
    hasError.value = false
    errorMessage.value = ''

    await nextTick()
    inputRef.value?.focus()

    if (props.initialContent) {
      renderPreview()
    } else if (previewRef.value) {
      previewRef.value.innerHTML = '<span class="placeholder">Preview do diagrama</span>'
    }
  }
})

const insertExample = (value: string) => {
  mermaidInput.value = value
  inputRef.value?.focus()
}

const handleSubmit = () => {
  if (mermaidInput.value.trim() && !hasError.value) {
    emit('submit', mermaidInput.value.trim())
    mermaidInput.value = ''
  }
}

const handleClose = () => {
  mermaidInput.value = ''
  hasError.value = false
  errorMessage.value = ''
  emit('close')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    handleSubmit()
  }
}

onBeforeUnmount(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})
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
            <h3 class="modal-title">{{ isEditMode ? 'Editar' : 'Inserir' }} Diagrama Mermaid</h3>
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

            <div class="split-layout">
              <div class="editor-panel">
                <label class="panel-label">Codigo Mermaid</label>
                <textarea
                  ref="inputRef"
                  v-model="mermaidInput"
                  placeholder="graph TD&#10;  A[Inicio] --> B[Fim]"
                  class="mermaid-input"
                  :class="{ 'has-error': hasError }"
                  rows="12"
                />
                <span class="input-hint">Pressione Ctrl+Enter para inserir</span>
              </div>

              <div class="preview-panel">
                <label class="panel-label">
                  Preview
                  <span v-if="isRendering" class="rendering-indicator">Renderizando...</span>
                </label>
                <div
                  ref="previewRef"
                  class="preview-content"
                  :class="{ 'has-error': hasError }"
                >
                  <span class="placeholder">Preview do diagrama</span>
                </div>
              </div>
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
                :disabled="!mermaidInput.trim() || hasError"
                @click="handleSubmit"
              >
                {{ isEditMode ? 'Salvar Alterações' : 'Inserir Diagrama' }}
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
  max-width: 64rem;
  margin: 1rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  max-height: 90vh;
  overflow-y: auto;
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

.split-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .split-layout {
    grid-template-columns: 1fr;
  }
}

.editor-panel,
.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.panel-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(203 213 225);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rendering-indicator {
  font-size: 0.75rem;
  color: rgb(100 116 139);
  font-weight: normal;
}

.mermaid-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: rgb(51 65 85);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.5rem;
  color: white;
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  outline: none;
  resize: none;
  transition: border-color 0.15s;
  line-height: 1.5;
}

.mermaid-input::placeholder {
  color: rgb(100 116 139);
}

.mermaid-input:focus {
  border-color: rgb(59 130 246);
}

.mermaid-input.has-error {
  border-color: rgb(239 68 68);
}

.input-hint {
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.preview-content {
  min-height: 280px;
  padding: 1rem;
  background-color: rgb(15 23 42);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  overflow: auto;
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
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-content :deep(svg) {
  max-width: 100%;
  height: auto;
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
