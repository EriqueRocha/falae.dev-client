<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  title: string
  itemType: 'artigo' | 'topico' | 'comentario'
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const countdown = ref(5)
const countdownInterval = ref<ReturnType<typeof setInterval> | null>(null)

const canDelete = computed(() => countdown.value === 0 && !props.loading)

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    countdown.value = 5
    startCountdown()
  } else {
    stopCountdown()
  }
})

const startCountdown = () => {
  stopCountdown()
  countdownInterval.value = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      stopCountdown()
    }
  }, 1000)
}

const stopCountdown = () => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }
}

const handleClose = () => {
  stopCountdown()
  emit('close')
}

const handleConfirm = () => {
  if (canDelete.value) {
    emit('confirm')
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}

onBeforeUnmount(() => {
  stopCountdown()
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

          <div class="modal-body">
            <div class="warning-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <p class="warning-text">
              Voce tem certeza que deseja deletar este {{ itemType }}?
            </p>

            <div class="alert-box">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Esta ação e <strong>irreversivel</strong>. O conteudo sera permanentemente removido.</span>
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="btn-cancel"
                @click="handleClose"
                :disabled="loading"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn-delete"
                :disabled="!canDelete"
                @click="handleConfirm"
              >
                <template v-if="loading">
                  <svg class="animate-spin w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deletando...
                </template>
                <template v-else-if="countdown > 0">
                  Aguarde ({{ countdown }}s)
                </template>
                <template v-else>
                  Deletar {{ itemType }}
                </template>
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
  padding: 1.5rem 1.25rem;
  text-align: center;
}

.warning-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
  color: rgb(239 68 68);
}

.warning-text {
  color: rgb(226 232 240);
  font-size: 1rem;
  margin-bottom: 1rem;
}

.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  color: rgb(252 165 165);
  font-size: 0.875rem;
  text-align: left;
  margin-bottom: 1.5rem;
}

.alert-box strong {
  color: rgb(248 113 113);
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.btn-cancel,
.btn-delete {
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-cancel {
  background-color: rgb(51 65 85);
  color: rgb(203 213 225);
}

.btn-cancel:hover:not(:disabled) {
  background-color: rgb(71 85 105);
  color: white;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  background-color: rgb(239 68 68);
  color: white;
  min-width: 140px;
}

.btn-delete:hover:not(:disabled) {
  background-color: rgb(220 38 38);
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: rgb(127 29 29);
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
