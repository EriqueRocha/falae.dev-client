<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  title: string
  placeholder?: string
  submitLabel?: string
}>()

const emit = defineEmits<{
  close: []
  submit: [url: string]
}>()

const url = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    url.value = ''
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
})

const handleSubmit = () => {
  if (url.value.trim()) {
    emit('submit', url.value.trim())
    url.value = ''
  }
}

const handleClose = () => {
  url.value = ''
  emit('close')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
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
            <h3 class="modal-title">{{ title }}</h3>
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

          <form @submit.prevent="handleSubmit" class="modal-body">
            <input
              ref="inputRef"
              v-model="url"
              type="url"
              :placeholder="placeholder || 'https://...'"
              class="url-input"
              required
            />

            <div class="modal-actions">
              <button
                type="button"
                class="btn-cancel"
                @click="handleClose"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="btn-submit"
                :disabled="!url.trim()"
              >
                {{ submitLabel || 'Inserir' }}
              </button>
            </div>
          </form>
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
  max-width: 28rem;
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
}

.url-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: rgb(51 65 85);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.5rem;
  color: white;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
}

.url-input::placeholder {
  color: rgb(100 116 139);
}

.url-input:focus {
  border-color: rgb(59 130 246);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
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
