<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const decodeSearchQuery = (q: string | null) => {
  if (!q) return ''
  //restaurar # que foi substituído por __TAG__
  return q.replace(/__TAG__/g, '#')
}

const getQueryFromUrl = () => {
  const q = route.query.q as string
  return decodeSearchQuery(q)
}

const searchQuery = ref(getQueryFromUrl())
const isSearching = ref(false)

interface SearchResult {
  id: string
  title: string
  slug: string
  authorName: string
  authorUserName: string
  authorProfileImage?: string | null
  creationDate?: string
  description?: string
  topicContent?: string
  likesCount?: number
  commentsCount?: number
  tags?: string[]
  coverImage?: string | null
}

interface TagSearchResult {
  id: string
  type: 'ARTICLE' | 'TOPIC' | 'COMMENT'
  title: string | null
  slug: string | null
  content: string
  authorName: string
  authorUserName: string
  authorProfileImage?: string | null
  createdAt?: string
  likesCount?: number
  tags?: string[]
  coverImage?: string | null
  parentType?: 'ARTICLE' | 'TOPIC' | null
  parentAuthorUserName?: string | null
  parentSlug?: string | null
}

const articleResults = ref<SearchResult[]>([])
const topicResults = ref<SearchResult[]>([])
const tagResults = ref<TagSearchResult[]>([])

const articlePage = ref(0)
const topicPage = ref(0)
const tagPage = ref(0)
const articleHasMore = ref(false)
const topicHasMore = ref(false)
const tagHasMore = ref(false)
const loadingMore = ref<'article' | 'topic' | 'tag' | null>(null)

const activeTab = ref<'all' | 'articles' | 'topics' | 'tags'>('all')

const parseSearchQuery = (query: string) => {
  const words = query.split(/\s+/)
  const tags: string[] = []
  const titleWords: string[] = []

  for (const word of words) {
    if (word.startsWith('#') && word.length > 1) {
      tags.push(word.slice(1))
    } else if (word.trim()) {
      titleWords.push(word)
    }
  }

  return {
    titleQuery: titleWords.join(' ').trim(),
    tags
  }
}

const parsedQuery = computed(() => parseSearchQuery(searchQuery.value))

const hasResults = computed(() => {
  return articleResults.value.length > 0 || topicResults.value.length > 0 || tagResults.value.length > 0
})

const performSearch = async (resetPages = true) => {
  if (!searchQuery.value.trim()) {
    articleResults.value = []
    topicResults.value = []
    tagResults.value = []
    return
  }

  if (resetPages) {
    articlePage.value = 0
    topicPage.value = 0
    tagPage.value = 0
    articleResults.value = []
    topicResults.value = []
    tagResults.value = []
  }

  isSearching.value = true
  const { titleQuery, tags } = parsedQuery.value

  try {
    const promises: Promise<void>[] = []

    if (titleQuery) {
      promises.push(
        $fetch<{ articles: SearchResult[]; hasNext: boolean }>(`${apiBase}/article/search`, {
          params: { title: titleQuery, size: 10, page: articlePage.value }
        }).then(data => {
          articleResults.value = resetPages ? data.articles : [...articleResults.value, ...data.articles]
          articleHasMore.value = data.hasNext
        }).catch(() => {
          if (resetPages) articleResults.value = []
        })
      )

      promises.push(
        $fetch<{ topics: SearchResult[]; hasNext: boolean }>(`${apiBase}/api/topic/search`, {
          params: { title: titleQuery, size: 10, page: topicPage.value }
        }).then(data => {
          topicResults.value = resetPages ? data.topics : [...topicResults.value, ...data.topics]
          topicHasMore.value = data.hasNext
        }).catch(() => {
          if (resetPages) topicResults.value = []
        })
      )
    } else {
      articleResults.value = []
      topicResults.value = []
    }

    if (tags.length > 0) {
      promises.push(
        $fetch<{ items: TagSearchResult[]; hasNext: boolean }>(`${apiBase}/api/search/tags`, {
          params: { tags: tags.join(','), size: 10, page: tagPage.value }
        }).then(data => {
          tagResults.value = resetPages ? data.items : [...tagResults.value, ...data.items]
          tagHasMore.value = data.hasNext
        }).catch(() => {
          if (resetPages) tagResults.value = []
        })
      )
    } else {
      tagResults.value = []
    }

    await Promise.all(promises)
  } catch (e) {
    console.error('Erro na busca:', e)
  } finally {
    isSearching.value = false
  }
}

const loadMore = async (type: 'article' | 'topic' | 'tag') => {
  loadingMore.value = type
  const { titleQuery, tags } = parsedQuery.value

  try {
    if (type === 'article' && titleQuery) {
      articlePage.value++
      const data = await $fetch<{ articles: SearchResult[]; hasNext: boolean }>(`${apiBase}/article/search`, {
        params: { title: titleQuery, size: 10, page: articlePage.value }
      })
      articleResults.value = [...articleResults.value, ...data.articles]
      articleHasMore.value = data.hasNext
    } else if (type === 'topic' && titleQuery) {
      topicPage.value++
      const data = await $fetch<{ topics: SearchResult[]; hasNext: boolean }>(`${apiBase}/api/topic/search`, {
        params: { title: titleQuery, size: 10, page: topicPage.value }
      })
      topicResults.value = [...topicResults.value, ...data.topics]
      topicHasMore.value = data.hasNext
    } else if (type === 'tag' && tags.length > 0) {
      tagPage.value++
      const data = await $fetch<{ items: TagSearchResult[]; hasNext: boolean }>(`${apiBase}/api/search/tags`, {
        params: { tags: tags.join(','), size: 10, page: tagPage.value }
      })
      tagResults.value = [...tagResults.value, ...data.items]
      tagHasMore.value = data.hasNext
    }
  } catch (e) {
    console.error('Erro ao carregar mais:', e)
  } finally {
    loadingMore.value = null
  }
}

const handleSearch = () => {
  //substituir # por __TAG__ para evitar problemas com hash na URL
  const safeQuery = searchQuery.value.replace(/#/g, '__TAG__')
  router.replace({ path: '/busca', query: { q: safeQuery } })
  performSearch()
}

const goToArticle = (authorUserName: string, slug: string) => {
  router.push(`/artigo/${authorUserName}/${slug}`)
}

const goToTopic = (authorUserName: string, slug: string) => {
  router.push(`/topico/${authorUserName}/${slug}`)
}

const goToTagResult = (result: TagSearchResult) => {
  if (result.type === 'ARTICLE' && result.slug) {
    router.push(`/artigo/${result.authorUserName}/${result.slug}`)
  } else if (result.type === 'TOPIC' && result.slug) {
    router.push(`/topico/${result.authorUserName}/${result.slug}`)
  } else if (result.type === 'COMMENT' && result.parentType && result.parentAuthorUserName && result.parentSlug) {
    const basePath = result.parentType === 'ARTICLE' ? 'artigo' : 'topico'
    router.push(`/${basePath}/${result.parentAuthorUserName}/${result.parentSlug}?commentId=${result.id}`)
  }
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

watch(() => route.query.q, (newQuery) => {
  const decoded = decodeSearchQuery(newQuery as string)
  searchQuery.value = decoded
  if (decoded) {
    performSearch()
  }
})

onMounted(() => {
  if (searchQuery.value) {
    performSearch()
  }
})

useHead({
  title: searchQuery.value ? `Busca: ${searchQuery.value}` : 'Busca'
})
</script>

<template>
  <div class="min-h-screen bg-slate-950">
    <div class="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div class="max-w-5xl mx-auto px-4 py-4">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Pesquisar artigos, tópicos ou use #tags para buscar por tags..."
            class="w-full bg-slate-800 text-slate-200 placeholder-slate-500 rounded-xl px-5 py-4 pl-12 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keydown.enter="handleSearch"
          />
          <div class="absolute left-4 top-0 bottom-0 flex items-center">
            <svg
              v-if="!isSearching"
              class="w-5 h-5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <div
              v-else
              class="w-5 h-5 border-2 border-slate-500 border-t-blue-500 rounded-full animate-spin"
            />
          </div>
          <button
            v-if="searchQuery"
            @click="searchQuery = ''; handleSearch()"
            class="absolute right-4 top-0 bottom-0 flex items-center text-slate-500 hover:text-slate-300"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="searchQuery.trim()" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-slate-400">Buscando:</span>
          <span v-if="parsedQuery.titleQuery" class="bg-slate-800 text-slate-300 px-2 py-1 rounded">
            "{{ parsedQuery.titleQuery }}"
          </span>
          <span
            v-for="tag in parsedQuery.tags"
            :key="tag"
            class="bg-blue-500/20 text-blue-400 px-2 py-1 rounded"
          >
            #{{ tag }}
          </span>
        </div>
      </div>
    </div>

    <div class="bg-slate-900/50 border-b border-slate-800">
      <div class="max-w-5xl mx-auto px-4">
        <div class="flex gap-1">
          <button
            @click="activeTab = 'all'"
            class="px-4 py-3 text-sm font-medium transition-colors border-b-2"
            :class="activeTab === 'all'
              ? 'text-blue-400 border-blue-400'
              : 'text-slate-400 border-transparent hover:text-slate-300'"
          >
            Todos
            <span v-if="hasResults" class="ml-1 text-xs opacity-70">
              ({{ articleResults.length + topicResults.length + tagResults.length }})
            </span>
          </button>
          <button
            v-if="parsedQuery.titleQuery"
            @click="activeTab = 'articles'"
            class="px-4 py-3 text-sm font-medium transition-colors border-b-2"
            :class="activeTab === 'articles'
              ? 'text-blue-400 border-blue-400'
              : 'text-slate-400 border-transparent hover:text-slate-300'"
          >
            Artigos
            <span v-if="articleResults.length" class="ml-1 text-xs opacity-70">({{ articleResults.length }})</span>
          </button>
          <button
            v-if="parsedQuery.titleQuery"
            @click="activeTab = 'topics'"
            class="px-4 py-3 text-sm font-medium transition-colors border-b-2"
            :class="activeTab === 'topics'
              ? 'text-purple-400 border-purple-400'
              : 'text-slate-400 border-transparent hover:text-slate-300'"
          >
            Tópicos
            <span v-if="topicResults.length" class="ml-1 text-xs opacity-70">({{ topicResults.length }})</span>
          </button>
          <button
            v-if="parsedQuery.tags.length > 0"
            @click="activeTab = 'tags'"
            class="px-4 py-3 text-sm font-medium transition-colors border-b-2"
            :class="activeTab === 'tags'
              ? 'text-green-400 border-green-400'
              : 'text-slate-400 border-transparent hover:text-slate-300'"
          >
            Por Tags
            <span v-if="tagResults.length" class="ml-1 text-xs opacity-70">({{ tagResults.length }})</span>
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 py-6">
      <div v-if="isSearching && !hasResults" class="flex justify-center py-12">
        <div class="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
      </div>

      <div v-else-if="!searchQuery.trim()" class="text-center py-12">
        <svg class="w-16 h-16 text-slate-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h2 class="text-xl text-slate-400 mb-2">Digite algo para buscar</h2>
        <p class="text-slate-500">Use #tags para buscar por tags específicas</p>
      </div>

      <div v-else-if="!hasResults && !isSearching" class="text-center py-12">
        <svg class="w-16 h-16 text-slate-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="text-xl text-slate-400 mb-2">Nenhum resultado encontrado</h2>
        <p class="text-slate-500">Tente usar outros termos ou tags</p>
      </div>

      <div v-else class="space-y-8">
        <section v-if="(activeTab === 'all' || activeTab === 'articles') && articleResults.length > 0">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-1 h-6 bg-blue-500 rounded" />
            <h2 class="text-lg font-semibold text-slate-200">Artigos</h2>
            <span class="text-sm text-slate-500">({{ articleResults.length }})</span>
          </div>
          <div class="space-y-3">
            <button
              v-for="result in articleResults"
              :key="result.id"
              @click="goToArticle(result.authorUserName, result.slug)"
              class="w-full text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all group"
              :class="result.coverImage ? 'p-0' : 'p-4'"
            >
              <img
                v-if="result.coverImage"
                :src="result.coverImage"
                :alt="result.title"
                class="w-full h-32 object-cover"
              />
              <div :class="result.coverImage ? 'p-4' : ''">
                <h3 class="text-white font-medium group-hover:text-blue-400 transition-colors line-clamp-2">
                  {{ result.title }}
                </h3>
                <p v-if="result.description" class="text-slate-400 text-sm mt-2 line-clamp-2">
                  {{ result.description }}
                </p>
              <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span class="flex items-center gap-1">
                  <img
                    v-if="result.authorProfileImage"
                    :src="result.authorProfileImage"
                    class="w-4 h-4 rounded-full"
                  />
                  {{ result.authorName }}
                </span>
                <span v-if="result.creationDate">{{ formatDate(result.creationDate) }}</span>
                <span v-if="result.likesCount" class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                  {{ result.likesCount }}
                </span>
                <span v-if="result.commentsCount" class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                  </svg>
                  {{ result.commentsCount }}
                </span>
              </div>
              <div v-if="result.tags && result.tags.length > 0" class="flex flex-wrap gap-1 mt-3">
                <span
                  v-for="tag in result.tags.slice(0, 5)"
                  :key="tag"
                  class="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded"
                >
                  {{ tag }}
                </span>
              </div>
              </div>
            </button>
          </div>
          <button
            v-if="articleHasMore"
            @click="loadMore('article')"
            :disabled="loadingMore === 'article'"
            class="w-full mt-4 py-3 text-sm text-blue-400 hover:text-blue-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <span v-if="loadingMore === 'article'">Carregando...</span>
            <span v-else>Carregar mais artigos</span>
          </button>
        </section>

        <section v-if="(activeTab === 'all' || activeTab === 'topics') && topicResults.length > 0">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-1 h-6 bg-purple-500 rounded" />
            <h2 class="text-lg font-semibold text-slate-200">Tópicos</h2>
            <span class="text-sm text-slate-500">({{ topicResults.length }})</span>
          </div>
          <div class="space-y-3">
            <button
              v-for="result in topicResults"
              :key="result.id"
              @click="goToTopic(result.authorUserName, result.slug)"
              class="w-full text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all group"
            >
              <h3 class="text-white font-medium group-hover:text-purple-400 transition-colors line-clamp-2">
                {{ result.title }}
              </h3>
              <p v-if="result.topicContent" class="text-slate-400 text-sm mt-2 line-clamp-2">
                {{ result.topicContent }}
              </p>
              <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span class="flex items-center gap-1">
                  <img
                    v-if="result.authorProfileImage"
                    :src="result.authorProfileImage"
                    class="w-4 h-4 rounded-full"
                  />
                  {{ result.authorName }}
                </span>
                <span v-if="result.creationDate">{{ formatDate(result.creationDate) }}</span>
                <span v-if="result.likesCount" class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                  {{ result.likesCount }}
                </span>
                <span v-if="result.commentsCount" class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                  </svg>
                  {{ result.commentsCount }}
                </span>
              </div>
            </button>
          </div>
          <button
            v-if="topicHasMore"
            @click="loadMore('topic')"
            :disabled="loadingMore === 'topic'"
            class="w-full mt-4 py-3 text-sm text-purple-400 hover:text-purple-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <span v-if="loadingMore === 'topic'">Carregando...</span>
            <span v-else>Carregar mais tópicos</span>
          </button>
        </section>

        <section v-if="(activeTab === 'all' || activeTab === 'tags') && tagResults.length > 0">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-1 h-6 bg-green-500 rounded" />
            <h2 class="text-lg font-semibold text-slate-200">Resultados por Tags</h2>
            <span class="text-sm text-slate-500">({{ tagResults.length }})</span>
          </div>
          <div class="space-y-3">
            <button
              v-for="result in tagResults"
              :key="result.id"
              @click="goToTagResult(result)"
              class="w-full text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all group"
              :class="result.coverImage ? 'p-0' : 'p-4'"
            >
              <img
                v-if="result.coverImage"
                :src="result.coverImage"
                :alt="result.title || 'Capa'"
                class="w-full h-32 object-cover"
              />
              <div :class="result.coverImage ? 'p-4' : ''">
                <div class="flex items-center gap-2 mb-2">
                  <span
                    class="px-2 py-0.5 text-xs font-medium rounded"
                    :class="{
                      'bg-blue-500/20 text-blue-400': result.type === 'ARTICLE',
                      'bg-purple-500/20 text-purple-400': result.type === 'TOPIC',
                      'bg-green-500/20 text-green-400': result.type === 'COMMENT'
                    }"
                  >
                    {{ result.type === 'ARTICLE' ? 'Artigo' : result.type === 'TOPIC' ? 'Tópico' : 'Comentário' }}
                  </span>
                </div>
                <h3
                  class="text-white font-medium transition-colors line-clamp-2"
                  :class="{
                    'group-hover:text-blue-400': result.type === 'ARTICLE',
                    'group-hover:text-purple-400': result.type === 'TOPIC',
                    'group-hover:text-green-400': result.type === 'COMMENT'
                  }"
                >
                  {{ result.title || result.content }}
                </h3>
                <p v-if="result.title && result.content" class="text-slate-400 text-sm mt-2 line-clamp-2">
                  {{ result.content }}
                </p>
              <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
                <span class="flex items-center gap-1">
                  <img
                    v-if="result.authorProfileImage"
                    :src="result.authorProfileImage"
                    class="w-4 h-4 rounded-full"
                  />
                  {{ result.authorName }}
                </span>
                <span v-if="result.createdAt">{{ formatDate(result.createdAt) }}</span>
                <span v-if="result.likesCount" class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                  {{ result.likesCount }}
                </span>
              </div>
              <div v-if="result.tags && result.tags.length > 0" class="flex flex-wrap gap-1 mt-3">
                <span
                  v-for="tag in result.tags.slice(0, 5)"
                  :key="tag"
                  class="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded"
                  :class="{ 'ring-1 ring-green-500/50': parsedQuery.tags.includes(tag) }"
                >
                  #{{ tag }}
                </span>
              </div>
              </div>
            </button>
          </div>
          <button
            v-if="tagHasMore"
            @click="loadMore('tag')"
            :disabled="loadingMore === 'tag'"
            class="w-full mt-4 py-3 text-sm text-green-400 hover:text-green-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <span v-if="loadingMore === 'tag'">Carregando...</span>
            <span v-else>Carregar mais resultados</span>
          </button>
        </section>
      </div>
    </div>
  </div>
</template>
