<script setup lang="ts">
import { markdownToHtml } from '~/utils/markdownToHtml'

interface Article {
  id: string
  authorId: string
  authorName: string
  authorUserName: string
  creationDate: string
  isMarkdown: boolean
  title: string
  slug: string
  coverImage: string | null
  originalPost: string | null
  tags: string[]
  description: string
  urlArticleContent: string
}

interface PendingImage {
  objectUrl: string
  file: File
}

const route = useRoute()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { isAuthenticated, user } = useAuth()

const editorRef = shallowRef<{
  getIsMarkdownMode: () => boolean
  isEmpty: () => boolean
  getContent: () => string
  editor: { value: { commands: { setContent: (content: string) => void } } | null }
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
const originalCoverUrl = ref<string | null>(null)

const articleId = computed(() => route.params.id as string)
const article = ref<Article | null>(null)
const originalIsMarkdown = ref(false)
const originalContent = ref('')
const originalImageUrls = ref<string[]>([])

const loading = ref(true)
const isSaving = ref(false)
const saveProgress = ref('')

const pendingImages = ref<PendingImage[]>([])

watchEffect(() => {
  if (!isAuthenticated.value) {
    navigateTo('/login')
  }
})

const extractImageUrls = (html: string): string[] => {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi
  const urls: string[] = []
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1]
    if (url.includes('s3.') || url.includes('amazonaws.com') || url.includes('api.falae.dev')) {
      urls.push(url)
    }
  }
  return urls
}

//extract S3 path from URL
//format: https://....s3....amazonaws.com/{uuid}/{uuid}/{filename}
const extractS3Path = (url: string): string | null => {
  const match = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[^?]+)/i)
  return match?.[1] ?? null
}

const getDeletedImagePaths = (currentHtml: string): string[] => {
  const currentUrls = extractImageUrls(currentHtml)
  const deletedUrls = originalImageUrls.value.filter(url => !currentUrls.includes(url))

  return deletedUrls
    .map(url => extractS3Path(url))
    .filter((path): path is string => path !== null)
}

const addLocalImage = (file: File): string => {
  const objectUrl = URL.createObjectURL(file)
  pendingImages.value.push({ objectUrl, file })
  return objectUrl
}

const handleImageUpload = (file: File): string => {
  return addLocalImage(file)
}

const clearPendingImages = () => {
  pendingImages.value.forEach(img => URL.revokeObjectURL(img.objectUrl))
  pendingImages.value = []
}

const uploadImage = async (articleId: string, file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('articleId', articleId)

  return await $fetch<string>(`${apiBase}/article/saveArticleImage`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  })
}

const uploadCover = async (articleId: string, file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('articleId', articleId)

  return await $fetch<string>(`${apiBase}/article/saveArticleCover`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  })
}

const saveContent = async (articleId: string, content: string, isMarkdown: boolean): Promise<string> => {
  const extension = isMarkdown ? 'md' : 'html'
  const mimeType = isMarkdown ? 'text/markdown' : 'text/html'
  const blob = new Blob([content], { type: mimeType })
  const file = new File([blob], `content.${extension}`, { type: mimeType })

  const formData = new FormData()
  formData.append('file', file)
  formData.append('articleId', articleId)

  return await $fetch<string>(`${apiBase}/article/saveArticleContent`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  })
}

const fetchArticle = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await $fetch<Article>(`${apiBase}/article/${articleId.value}`, {
      credentials: 'include'
    })

    if (user.value?.userName !== data.authorUserName) {
      error.value = 'Você não tem permissão para editar este artigo'
      loading.value = false
      return
    }

    article.value = data
    originalIsMarkdown.value = data.isMarkdown

    title.value = data.title
    description.value = data.description
    tags.value = data.tags || []
    originalPost.value = data.originalPost || ''

    if (data.coverImage) {
      originalCoverUrl.value = data.coverImage
      coverPreview.value = data.coverImage
    }

    if (data.urlArticleContent) {
      const contentResponse = await fetch(data.urlArticleContent)
      const rawContent = await contentResponse.text()

      let htmlContent: string
      if (data.isMarkdown) {
        htmlContent = markdownToHtml(rawContent)
      } else {
        htmlContent = rawContent
      }

      originalContent.value = htmlContent
      originalImageUrls.value = extractImageUrls(htmlContent)

      editorContent.value = htmlContent
    }
  } catch (e: any) {
    if (e?.statusCode === 404) {
      error.value = 'Artigo não encontrado'
    } else if (e?.statusCode === 403) {
      error.value = 'Você não tem permissão para editar este artigo'
    } else {
      error.value = 'Erro ao carregar artigo'
    }
  } finally {
    loading.value = false
  }
}

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

const onTagInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  let value = input.value.toLowerCase().replace(/[^a-z0-9]/g, '')
  value = value.slice(0, MAX_TAG_LENGTH)
  input.value = value
  tagInput.value = value
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
  if (coverPreview.value && coverPreview.value.startsWith('blob:')) {
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
    error.value = `O conteúdo do artigo deve ter no mínimo ${MIN_CONTENT_LENGTH} caracteres. Atualmente: ${textContent.length}`
    return
  }

  isSaving.value = true

  try {
    const isMarkdown = editorRef.value?.getIsMarkdownMode() ?? false
    let processedContent = editorRef.value?.getContent() ?? editorContent.value

    const imagesToUpload = pendingImages.value.filter(img =>
      processedContent.includes(img.objectUrl)
    )

    pendingImages.value
      .filter(img => !processedContent.includes(img.objectUrl))
      .forEach(img => URL.revokeObjectURL(img.objectUrl))

    if (imagesToUpload.length > 0) {
      saveProgress.value = `Enviando imagens (0/${imagesToUpload.length})...`

      for (let i = 0; i < imagesToUpload.length; i++) {
        const pending = imagesToUpload[i]!
        saveProgress.value = `Enviando imagens (${i + 1}/${imagesToUpload.length})...`

        const imagePath = await uploadImage(articleId.value, pending.file)
        processedContent = processedContent.replaceAll(pending.objectUrl, imagePath)
        URL.revokeObjectURL(pending.objectUrl)
      }
    }
    pendingImages.value = []

    const contentForComparison = isMarkdown ? markdownToHtml(processedContent) : processedContent
    const deletedImagePaths = getDeletedImagePaths(contentForComparison)

    const coverWasRemoved = originalCoverUrl.value && !coverPreview.value
    const coverWasReplaced = originalCoverUrl.value && coverFile.value

    if ((coverWasRemoved || coverWasReplaced) && originalCoverUrl.value) {
      const coverPath = extractS3Path(originalCoverUrl.value)
      if (coverPath) {
        deletedImagePaths.push(coverPath)
      }
    }

    saveProgress.value = 'Atualizando artigo...'
    await $fetch(`${apiBase}/article/edit`, {
      method: 'PUT',
      body: {
        articleId: articleId.value,
        title: title.value,
        description: description.value,
        tags: tags.value,
        originalPost: originalPost.value || null,
        deletedImagePaths: deletedImagePaths.length > 0 ? deletedImagePaths : null
      },
      credentials: 'include'
    })

    saveProgress.value = 'Salvando conteúdo...'
    await saveContent(articleId.value, processedContent, isMarkdown)

    if (coverFile.value) {
      saveProgress.value = 'Enviando capa...'
      await uploadCover(articleId.value, coverFile.value)
    }

    saveProgress.value = 'Salvo!'

    navigateTo(`/artigo/${article.value?.authorUserName}/${article.value?.slug}`)
  } catch (e: any) {
    console.error('Erro ao salvar:', e)
    error.value = e?.data?.message || e?.message || 'Erro ao salvar artigo'
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  fetchArticle()
})

onBeforeUnmount(() => {
  clearPendingImages()
  if (coverPreview.value && coverPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(coverPreview.value)
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-0 sm:px-6 py-0 sm:py-8">
    <div class="bg-slate-900 sm:rounded-xl p-4 sm:p-6 md:p-8 sm:border border-slate-800">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-slate-400">Carregando artigo...</span>
      </div>

      <div v-else-if="error && !article" class="text-center py-12">
        <div class="text-red-500 mb-4">{{ error }}</div>
        <NuxtLink to="/" class="text-blue-500 hover:text-blue-400">
          Voltar para o início
        </NuxtLink>
      </div>

      <template v-else>
        <h1 class="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">Editar Artigo</h1>

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
              :initial-mode="originalIsMarkdown ? 'markdown' : 'html'"
            />
          </div>

          <div v-if="error" class="bg-red-500/10 border border-red-500 text-red-500 mt-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
            {{ error }}
          </div>

          <div class="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-4">
            <NuxtLink
              :to="article ? `/artigo/${article.authorUserName}/${article.slug}` : '/'"
              class="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm sm:text-base text-center rounded-lg transition-colors"
            >
              Cancelar
            </NuxtLink>
            <button
              type="submit"
              :disabled="isSaving"
              class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium py-2.5 sm:py-3 text-sm sm:text-base rounded-lg transition-colors"
            >
              {{ isSaving ? saveProgress : 'Salvar Alterações' }}
            </button>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>
