<script setup lang="ts">
const { isAuthenticated } = useAuth()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const title = ref('')
const topicContent = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const error = ref('')
const isPublishing = ref(false)

watchEffect(() => {
  if (!isAuthenticated.value) {
    navigateTo('/login')
  }
})

const MAX_TAGS = 10
const MAX_TAG_LENGTH = 50
const MIN_CONTENT_LENGTH = 2000

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

const handleSubmit = async () => {
  error.value = ''

  if (!title.value.trim()) {
    error.value = 'O titulo e obrigatorio'
    return
  }

  if (!topicContent.value.trim()) {
    error.value = 'O conteudo do topico e obrigatorio'
    return
  }

  if (topicContent.value.trim().length < MIN_CONTENT_LENGTH) {
    error.value = `O conteúdo do tópico deve ter no mínimo ${MIN_CONTENT_LENGTH} caracteres.`
    return
  }

  isPublishing.value = true

  try {
    const response = await $fetch<{ id: string; title: string }>(
      `${apiBase}/api/topic/saveNew`,
      {
        method: 'POST',
        credentials: 'include',
        body: {
          title: title.value,
          topicContent: topicContent.value,
          tags: tags.value.length > 0 ? tags.value : null
        }
      }
    )

    navigateTo('/')
  } catch (e) {
    error.value = 'Erro ao publicar topico. Tente novamente.'
  } finally {
    isPublishing.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-0 sm:px-6 py-0 sm:py-8">
    <div class="bg-slate-900 sm:rounded-xl p-4 sm:p-6 md:p-8 sm:border border-slate-800">
      <h1 class="text-xl sm:text-2xl font-bold text-white mb-6 sm:mb-8">Criar Topico</h1>

      <form @submit.prevent="handleSubmit" class="space-y-4 sm:space-y-6">
        <div v-if="error" class="bg-red-500/10 border border-red-500 text-red-500 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
          {{ error }}
        </div>

        <div>
          <label class="block text-slate-300 text-sm font-medium mb-2">Titulo*</label>
          <input
            v-model="title"
            type="text"
            placeholder="Digite o titulo do topico"
            class="w-full bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label class="block text-slate-300 text-sm font-medium mb-2">Conteudo*</label>
          <MarkdownEditor
            v-model="topicContent"
            placeholder="Escreva o conteúdo do seu tópico em Markdown..."
            :rows="10"
          />
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
            {{ isPublishing ? 'Publicando...' : 'Publicar Topico' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
