interface PendingImage {
  objectUrl: string
  file: File
}

interface ArticleData {
  title: string
  description: string
  tags: string[]
  originalPost?: string
}

interface SaveNewResponse {
  message: string
  id: string
  title: string
}

interface ImageUploadResponse {
  url: string
}

export function useArticlePublish() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const pendingImages = ref<PendingImage[]>([])
  const isPublishing = ref(false)
  const publishProgress = ref<string>('')

  const addLocalImage = (file: File): string => {
    const objectUrl = URL.createObjectURL(file)
    pendingImages.value.push({ objectUrl, file })
    return objectUrl
  }

  const removeLocalImage = (objectUrl: string) => {
    const index = pendingImages.value.findIndex(img => img.objectUrl === objectUrl)
    if (index !== -1) {
      URL.revokeObjectURL(objectUrl)
      pendingImages.value.splice(index, 1)
    }
  }

  const clearPendingImages = () => {
    pendingImages.value.forEach(img => URL.revokeObjectURL(img.objectUrl))
    pendingImages.value = []
  }

  const uploadImage = async (articleId: string, file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('articleId', articleId)

    const response = await $fetch<string>(`${apiBase}/article/saveArticleImage`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    return response
  }

  const uploadCover = async (articleId: string, file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('articleId', articleId)

    const response = await $fetch<string>(`${apiBase}/article/saveArticleCover`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    return response
  }

  const saveContent = async (articleId: string, content: string, isMarkdown: boolean): Promise<string> => {
    const extension = isMarkdown ? 'md' : 'html'
    const mimeType = isMarkdown ? 'text/markdown' : 'text/html'
    const blob = new Blob([content], { type: mimeType })
    const file = new File([blob], `content.${extension}`, { type: mimeType })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('articleId', articleId)

    const response = await $fetch<string>(`${apiBase}/article/saveArticleContent`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    return response
  }

  const publish = async (
    articleData: ArticleData,
    content: string,
    isMarkdown: boolean,
    coverFile?: File
  ): Promise<{ success: boolean; articleId?: string; error?: string }> => {
    isPublishing.value = true

    try {
      //1 criar o artigo e obter o ID
      publishProgress.value = 'Criando artigo...'
      const saveNewResponse = await $fetch<SaveNewResponse>(`${apiBase}/article/saveNew`, {
        method: 'POST',
        body: articleData,
        credentials: 'include'
      })

      const articleId = saveNewResponse.id

      //2 upload das imagens pendentes e substituir Object URLs pelos paths
      let processedContent = content

      if (pendingImages.value.length > 0) {
        publishProgress.value = `Enviando imagens (0/${pendingImages.value.length})...`

        for (let i = 0; i < pendingImages.value.length; i++) {
          const pending = pendingImages.value[i]
          publishProgress.value = `Enviando imagens (${i + 1}/${pendingImages.value.length})...`

          const imagePath = await uploadImage(articleId, pending.file)

          //substituir o Object URL pelo path retornado
          processedContent = processedContent.replaceAll(pending.objectUrl, imagePath)

          //liberar o Object URL
          URL.revokeObjectURL(pending.objectUrl)
        }

        pendingImages.value = []
      }

      //3 salvar o conteúdo com os paths corretos
      publishProgress.value = 'Salvando conteúdo...'
      await saveContent(articleId, processedContent, isMarkdown)

      //4 upload da capa (opcional)
      if (coverFile) {
        publishProgress.value = 'Enviando capa...'
        await uploadCover(articleId, coverFile)
      }

      publishProgress.value = 'Publicado!'

      return { success: true, articleId }
    } catch (error: any) {
      console.error('Erro ao publicar:', error)
      return {
        success: false,
        error: error?.data?.message || error?.message || 'Erro ao publicar artigo'
      }
    } finally {
      isPublishing.value = false
    }
  }

  //cleanup ao desmontar o componente
  onUnmounted(() => {
    clearPendingImages()
  })

  return {
    pendingImages: readonly(pendingImages),
    isPublishing: readonly(isPublishing),
    publishProgress: readonly(publishProgress),
    addLocalImage,
    removeLocalImage,
    clearPendingImages,
    publish
  }
}
