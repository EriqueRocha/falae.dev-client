<script setup lang="ts">
const { isAuthenticated } = useAuth()
const { addLocalImage, publish, isPublishing, publishProgress, clearPendingImages } = useArticlePublish()

const editorRef = shallowRef<{
  getIsMarkdownMode: () => boolean
  isEmpty: () => boolean
  getContent: () => string
} | null>(null)

const title = ref('')
const description = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const originalPost = ref('')
const editorContent = ref('')
const error = ref('')

const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)

watchEffect(() => {
  if (!isAuthenticated.value) {
    navigateTo('/login')
  }
})

const MAX_TAGS = 10
const MAX_TAG_LENGTH = 50
const MIN_CONTENT_LENGTH = 4500

const addTag = () => {
  let tag = tagInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!tag) return

  tag = tag.slice(0, MAX_TAG_LENGTH)

  if (tags.value.includes(tag)) {
    tagInput.value = ''
    return
  }

  if (tags.value.length >= MAX_TAGS) return

  tags.value.push(tag)
  tagInput.value = ''
}

const removeTag = (index: number) => {
  tags.value.splice(index, 1)
}

const handleTagKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag()
  }
}

//filtra caracteres enquanto digita
const onTagInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  let value = input.value.toLowerCase().replace(/[^a-z0-9]/g, '')
  value = value.slice(0, MAX_TAG_LENGTH)
  input.value = value
  tagInput.value = value
}

const handleImageUpload = (file: File): string => {
  return addLocalImage(file)
}

const MAX_IMAGE_SIZE = 600 * 1024

const handleCoverChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeKB = Math.round(file.size / 1024)
      error.value = `Imagem da capa muito grande (${sizeKB}KB). Tamanho máximo: 600KB`
      target.value = ''
      return
    }
    coverFile.value = file
    coverPreview.value = URL.createObjectURL(file)
  }
}

const removeCover = () => {
  if (coverPreview.value) {
    URL.revokeObjectURL(coverPreview.value)
  }
  coverFile.value = null
  coverPreview.value = null
}

const handleSubmit = async () => {
  error.value = ''

  if (!title.value.trim()) {
    error.value = 'O título é obrigatório'
    return
  }

  if (!description.value.trim()) {
    error.value = 'A descrição é obrigatória'
    return
  }

  if (tags.value.length === 0) {
    error.value = 'Adicione pelo menos uma tag'
    return
  }

  if (tags.value.length > MAX_TAGS) {
    error.value = `O artigo pode ter no máximo ${MAX_TAGS} tags`
    return
  }

  if (!editorContent.value.trim() || editorRef.value?.isEmpty()) {
    error.value = 'O conteúdo do artigo é obrigatório'
    return
  }

  const contentToValidate = editorRef.value?.getContent() ?? editorContent.value
  const textContent = contentToValidate.replace(/<[^>]*>/g, '').trim()
  if (textContent.length < MIN_CONTENT_LENGTH) {
    error.value = `O conteúdo do artigo deve ter no mínimo ${MIN_CONTENT_LENGTH} caracteres.`
    return
  }

  const isMarkdown = editorRef.value?.getIsMarkdownMode() ?? false
  const contentToPublish = editorRef.value?.getContent() ?? editorContent.value

  const result = await publish(
    {
      title: title.value,
      description: description.value,
      tags: tags.value,
      originalPost: originalPost.value || undefined
    },
    contentToPublish,
    isMarkdown,
    coverFile.value || undefined
  )

  if (result.success) {
    navigateTo('/')
  } else {
    error.value = result.error || 'Erro ao publicar artigo. Tente novamente.'
  }
}

onBeforeUnmount(() => {
  clearPendingImages()
  if (coverPreview.value) {
    URL.revokeObjectURL(coverPreview.value)
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-0 sm:px-6 py-0 sm:py-8">
    <div class="bg-slate-900 sm:rounded-xl p-4 sm:p-6 md:p-8 sm:border border-slate-800">
      <h1 class="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">Criar Artigo</h1>

      <div>
        <label class="block text-slate-300 text-sm font-medium mb-2">Capa do artigo (opcional)</label>
        <div v-if="coverPreview" class="relative mb-3">
          <img
              :src="coverPreview"
              alt="Preview da capa"
              class="w-full max-h-48 sm:max-h-64 object-cover rounded-lg"
          />
          <button
              type="button"
              @click="removeCover"
              class="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <label
            v-else
            class="flex flex-col items-center justify-center w-full h-24 sm:h-32 bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 sm:w-8 sm:h-8 text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="text-slate-500 text-xs sm:text-sm">Clique para adicionar uma capa</span>
          <input
              type="file"
              accept="image/*"
              @change="handleCoverChange"
              class="hidden"
          />
        </label>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4 sm:space-y-6">
        <div>
          <label class="block text-slate-300 text-sm font-medium mt-4 mb-2">Título*</label>
          <input
            v-model="title"
            type="text"
            placeholder="Digite o título do artigo"
            class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-slate-300 text-sm font-medium mb-2">Descrição*</label>
          <textarea
            v-model="description"
            rows="3"
            placeholder="Uma breve descrição do artigo"
            class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label class="block text-slate-300 text-sm font-medium mb-2">Tags*</label>
          <div class="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
            <span
              v-for="(tag, index) in tags"
              :key="index"
              class="inline-flex items-center gap-1 bg-blue-600/20 text-blue-400 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm"
            >
              #{{ tag }}
              <button
                type="button"
                @click="removeTag(index)"
                class="hover:text-blue-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
          <div v-if="tags.length < MAX_TAGS" class="flex flex-col sm:flex-row gap-2">
            <input
              :value="tagInput"
              type="text"
              placeholder="Adicione e pressione Enter"
              @input="onTagInput"
              @keydown="handleTagKeydown"
              class="flex-1 bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              @click="addTag"
              class="px-4 py-2.5 sm:py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm sm:text-base rounded-lg transition-colors"
            >
              Adicionar
            </button>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            {{ tags.length }}/{{ MAX_TAGS }} tags (máx. {{ MAX_TAG_LENGTH }} caracteres cada)
          </p>
        </div>

        <div>
          <label class="block text-slate-300 text-sm font-medium mb-2">URL do post original</label>
          <input
              v-model="originalPost"
              type="text"
              placeholder="https://www.meuartigo.com"
              class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-slate-300 text-sm font-medium mb-2">Conteúdo*</label>
          <TiptapEditor
            ref="editorRef"
            v-model="editorContent"
            :on-image-upload="handleImageUpload"
          />
        </div>
        <div v-if="error" class="bg-red-500/10 border border-red-500 text-red-500 mt-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
          {{ error }}
        </div>
        <div class="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-4">
          <NuxtLink
            to="/"
            class="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm sm:text-base text-center rounded-lg transition-colors"
          >
            Cancelar
          </NuxtLink>
          <button
            type="submit"
            :disabled="isPublishing"
            class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium py-2.5 sm:py-3 text-sm sm:text-base rounded-lg transition-colors"
          >
            {{ isPublishing ? publishProgress : 'Publicar Artigo' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
