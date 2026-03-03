<script setup lang="ts">
interface ProfileData {
  name: string
  userName: string
  email: string
  gitHub: string
  bio: string
  profileImageUrl: string
}

interface SubmitData extends ProfileData {
  imageFile?: File
}

const props = defineProps<{
  isOpen: boolean
  initialData: ProfileData
  loading?: boolean
  serverError?: string
}>()

const emit = defineEmits<{
  close: []
  submit: [data: SubmitData]
}>()

const form = ref<ProfileData>({
  name: '',
  userName: '',
  email: '',
  gitHub: '',
  bio: '',
  profileImageUrl: ''
})

const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 600 * 1024 //600KB

const validationError = ref('')
const error = computed(() => props.serverError || validationError.value)

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    form.value = { ...props.initialData }
    validationError.value = ''
    imageFile.value = null
    imagePreview.value = null
  }
})

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    validationError.value = 'Formato invalido. Use JPG, PNG, GIF ou WEBP.'
    input.value = ''
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    validationError.value = `Imagem muito grande. Maximo 600KB (atual: ${Math.round(file.size / 1024)}KB)`
    input.value = ''
    return
  }

  validationError.value = ''
  imageFile.value = file

  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

const removeSelectedImage = () => {
  imageFile.value = null
  imagePreview.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleSubmit = () => {
  validationError.value = ''

  if (!form.value.name.trim()) {
    validationError.value = 'Nome e obrigatorio'
    return
  }

  if (!form.value.userName.trim()) {
    validationError.value = 'Nome de usuario e obrigatorio'
    return
  }

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(form.value.userName)) {
    validationError.value = 'Nome de usuario deve ter 3-30 caracteres (letras, numeros ou -)'
    return
  }

  if (!form.value.email.trim()) {
    validationError.value = 'Email e obrigatorio'
    return
  }

  if (form.value.bio && form.value.bio.length > 500) {
    validationError.value = 'Bio deve ter no maximo 500 caracteres'
    return
  }

  if (form.value.gitHub && !form.value.gitHub.match(/^https:\/\/github\.com\/[\w-]+$/)) {
    validationError.value = 'URL do GitHub invalida (ex: https://github.com/usuario)'
    return
  }

  const submitData: SubmitData = { ...form.value }
  if (imageFile.value) {
    submitData.imageFile = imageFile.value
  }
  emit('submit', submitData)
}

const handleClose = () => {
  emit('close')
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}

const bioCharCount = computed(() => form.value.bio?.length || 0)
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
            <h3 class="modal-title">Editar Perfil</h3>
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
            <div v-if="error" class="error-message">
              {{ error }}
            </div>

            <div class="form-group">
              <label for="name" class="form-label">Nome *</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                class="form-input"
                placeholder="Seu nome"
                required
              />
            </div>

            <div class="form-group">
              <label for="userName" class="form-label">Nome de usuario *</label>
              <input
                id="userName"
                v-model="form.userName"
                type="text"
                class="form-input"
                placeholder="seu-usuario"
                required
              />
              <p class="form-hint">3-30 caracteres, apenas letras, numeros ou -</p>
            </div>

            <div class="form-group">
              <label for="email" class="form-label">Email *</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="form-input"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div class="form-group">
              <label for="gitHub" class="form-label">GitHub</label>
              <input
                id="gitHub"
                v-model="form.gitHub"
                type="url"
                class="form-input"
                placeholder="https://github.com/usuario"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Foto de perfil</label>

              <div class="image-preview-container">
                <div v-if="imagePreview || form.profileImageUrl" class="image-preview">
                  <img
                    :src="imagePreview || form.profileImageUrl"
                    alt="Preview"
                    class="preview-img"
                  />
                  <button
                    v-if="imagePreview"
                    type="button"
                    class="remove-image-btn"
                    @click="removeSelectedImage"
                    title="Remover imagem selecionada"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div v-else class="image-placeholder">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>

              <input
                ref="fileInputRef"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                class="hidden"
                @change="handleFileSelect"
              />
              <button
                type="button"
                class="upload-btn"
                @click="triggerFileInput"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ imageFile ? 'Trocar imagem' : 'Enviar imagem' }}
              </button>
              <p class="form-hint">JPG, PNG, GIF ou WEBP. Maximo 600KB.</p>

              <div class="divider">
                <span>ou</span>
              </div>

              <input
                id="profileImageUrl"
                v-model="form.profileImageUrl"
                type="url"
                class="form-input"
                placeholder="https://exemplo.com/foto.jpg"
                :disabled="!!imageFile"
              />
              <p v-if="imageFile" class="form-hint text-yellow-400">
                URL desabilitada enquanto houver imagem selecionada para upload
              </p>
            </div>

            <div class="form-group">
              <label for="bio" class="form-label">Bio</label>
              <textarea
                id="bio"
                v-model="form.bio"
                class="form-input form-textarea"
                placeholder="Conte um pouco sobre voce..."
                rows="4"
              ></textarea>
              <p class="form-hint" :class="{ 'text-red-400': bioCharCount > 500 }">
                {{ bioCharCount }}/500 caracteres
              </p>
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
                type="submit"
                class="btn-submit"
                :disabled="props.loading"
              >
                {{ props.loading ? 'Salvando...' : 'Salvar' }}
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
  overflow-y: auto;
  padding: 1rem;
}

.modal-content {
  background-color: rgb(30 41 59);
  border: 1px solid rgb(51 65 85);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 32rem;
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
  position: sticky;
  top: 0;
  background-color: rgb(30 41 59);
  z-index: 1;
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

.error-message {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgb(239 68 68);
  color: rgb(248 113 113);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  color: rgb(203 213 225);
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-input {
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

.form-input::placeholder {
  color: rgb(100 116 139);
}

.form-input:focus {
  border-color: rgb(59 130 246);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-hint {
  color: rgb(100 116 139);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.image-preview-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.image-preview {
  position: relative;
  width: 120px;
  height: 120px;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid rgb(51 65 85);
}

.remove-image-btn {
  position: absolute;
  top: 0;
  right: 0;
  background-color: rgb(239 68 68);
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.15s;
}

.remove-image-btn:hover {
  background-color: rgb(220 38 38);
}

.image-placeholder {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: rgb(51 65 85);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px dashed rgb(71 85 105);
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 1rem;
  background-color: rgb(51 65 85);
  color: rgb(203 213 225);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
}

.upload-btn:hover {
  background-color: rgb(71 85 105);
  color: white;
}

.divider {
  display: flex;
  align-items: center;
  margin: 1rem 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgb(51 65 85);
}

.divider span {
  padding: 0 0.75rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
}

.hidden {
  display: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(51 65 85);
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
