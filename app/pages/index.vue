<script setup lang="ts">
useSeoMeta({
  title: 'Falae.dev — Comunidade dev',
  description: 'Feed de artigos, tópicos e discussões da comunidade dev.',
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

type FeedItemType = 'ARTICLE' | 'TOPIC' | 'COMMENT'
type FeedSortType = 'RECENT' | 'OLDEST' | 'LIKES'

interface FeedItem {
  id: string
  type: FeedItemType
  title: string
  slug: string | null
  content: string
  authorId: string
  authorName: string
  authorUserName: string
  authorProfileImage: string | null
  createdAt: string
  likesCount: number
  dislikesCount: number
  commentsCount: number
  savesCount: number
  isLiked: boolean
  isDisliked: boolean
  isSaved: boolean
  isOwner: boolean
  coverImage: string | null
  tags: string[] | null
  parentType: 'ARTICLE' | 'TOPIC' | null
  parentAuthorUserName: string | null
  parentTitle: string | null
  parentSlug: string | null
}

interface FeedResponse {
  items: FeedItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

const feed = ref<FeedItem[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const currentPage = ref(0)
const hasMore = ref(false)
const currentSort = ref<FeedSortType>('RECENT')
const currentFilter = ref<FeedItemType | null>(null)

const fetchFeed = async (page = 0, reset = false) => {
  const params: Record<string, string | number> = {
    page,
    size: 20,
    sort: currentSort.value
  }

  if (currentFilter.value) {
    params.type = currentFilter.value
  }

  const data = await $fetch<FeedResponse>(`${apiBase}/api/feed`, {
    params,
    credentials: 'include'
  })

  if (reset) {
    feed.value = data.items
  } else {
    feed.value.push(...data.items)
  }
  currentPage.value = data.page
  hasMore.value = data.hasNext
}

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  try {
    await fetchFeed(currentPage.value + 1)
  } finally {
    loadingMore.value = false
  }
}

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

watch(sentinel, (el) => {
  if (el && observer) {
    observer.observe(el)
  }
})

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !loadingMore.value && !loading.value) {
        loadMore()
      }
    },
    { threshold: 0.1 }
  )

  if (sentinel.value) {
    observer.observe(sentinel.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})

const changeSort = async (sort: FeedSortType) => {
  currentSort.value = sort
  loading.value = true
  try {
    await fetchFeed(0, true)
  } finally {
    loading.value = false
  }
}

const changeFilter = async (filter: FeedItemType | null) => {
  currentFilter.value = filter
  loading.value = true
  try {
    await fetchFeed(0, true)
  } finally {
    loading.value = false
  }
}

const sortOptions = [
  { value: 'RECENT' as FeedSortType, label: 'Recentes' },
  { value: 'OLDEST' as FeedSortType, label: 'Antigos' },
  { value: 'LIKES' as FeedSortType, label: 'Mais curtidos' }
]

const filterOptions = [
  { value: null, label: 'Todos' },
  { value: 'ARTICLE' as FeedItemType, label: 'Artigos' },
  { value: 'TOPIC' as FeedItemType, label: 'Topicos' },
  { value: 'COMMENT' as FeedItemType, label: 'Comentarios' }
]

//preservear a ordem na tela de celular
const isSingleColumn = useIsMobile(768)
const columns = computed(() => {
  if (isSingleColumn.value) return [feed.value]
  return [
    feed.value.filter((_, i) => i % 2 === 0),
    feed.value.filter((_, i) => i % 2 === 1)
  ]
})

const getCommentUrl = (item: FeedItem): string => {
  const basePath = item.parentType === 'ARTICLE' ? 'artigo' : 'topico'
  return `/${basePath}/${item.parentAuthorUserName}/${item.parentSlug}?commentId=${item.id}`
}

onMounted(async () => {
  try {
    await fetchFeed(0, true)
  } catch (e) {
    error.value = 'Erro ao carregar feed'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-8">
    <div class="flex gap-2 sm:gap-4 mb-8">
      <NuxtLink
        to="/topico/novo"
        class="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 text-sm sm:text-base bg-slate-800 border border-slate-700 rounded-lg text-slate-200 hover:bg-slate-700 hover:border-blue-500 active:scale-[0.98] transition-all duration-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Criar Topico
      </NuxtLink>
      <NuxtLink
        to="/artigo/novo"
        class="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 text-sm sm:text-base bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-[0.98] transition-all duration-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Criar Artigo
      </NuxtLink>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in filterOptions"
          :key="option.value ?? 'all'"
          @click="changeFilter(option.value)"
          class="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-full font-medium transition-all duration-200"
          :class="currentFilter === option.value
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
            : 'bg-slate-800 text-slate-400 border border-slate-700/60 hover:text-white hover:bg-slate-700 hover:border-slate-600'"
        >
          {{ option.label }}
        </button>
      </div>

      <select
        :value="currentSort"
        @change="changeSort(($event.target as HTMLSelectElement).value as FeedSortType)"
        class="bg-slate-800 text-slate-300 border border-slate-700/60 rounded-lg px-4 py-2 cursor-pointer hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option v-for="option in sortOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-2 border-slate-700 border-t-blue-500"></div>
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <div v-else-if="feed.length === 0" class="flex flex-col items-center text-center py-20">
      <div class="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p class="text-slate-300 font-medium mb-1">Nada por aqui ainda</p>
      <p class="text-slate-500 text-sm">Nenhum conteúdo encontrado com esses filtros.</p>
    </div>

    <div v-else class="flex flex-col md:flex-row gap-6">
      <div v-for="(column, columnIndex) in columns" :key="columnIndex" class="flex-1 min-w-0 space-y-6">
        <template v-for="item in column" :key="`${item.type}-${item.id}`">
          <NuxtLink
            v-if="item.type === 'ARTICLE'"
            :to="`/artigo/${item.authorUserName}/${item.slug}`"
            class="block"
          >
            <ArticleCard
              :article="{
                id: item.id,
                title: item.title,
                excerpt: item.content,
                tags: item.tags || [],
                author: { name: item.authorName, userName: item.authorUserName, avatar: item.authorProfileImage || undefined },
                date: item.createdAt,
                likes: item.likesCount,
                dislikes: item.dislikesCount,
                comments: item.commentsCount,
                saves: item.savesCount,
                coverImage: item.coverImage,
                isLiked: item.isLiked,
                isDisliked: item.isDisliked,
                isSaved: item.isSaved
              }"
            />
          </NuxtLink>

          <NuxtLink
            v-else-if="item.type === 'TOPIC'"
            :to="`/topico/${item.authorUserName}/${item.slug}`"
            class="block"
          >
            <TopicCard
              :topic="{
                id: item.id,
                title: item.title,
                excerpt: item.content,
                tags: item.tags || [],
                author: { name: item.authorName, userName: item.authorUserName, avatar: item.authorProfileImage || undefined },
                date: item.createdAt,
                likes: item.likesCount,
                dislikes: item.dislikesCount,
                comments: item.commentsCount,
                isLiked: item.isLiked,
                isDisliked: item.isDisliked
              }"
            />
          </NuxtLink>

          <NuxtLink
            v-else-if="item.type === 'COMMENT'"
            :to="getCommentUrl(item)"
            class="block"
          >
            <CommentCard
              :comment="{
                id: item.id,
                content: item.content,
                author: { name: item.authorName, userName: item.authorUserName, avatar: item.authorProfileImage || undefined },
                date: item.createdAt,
                likes: item.likesCount,
                dislikes: item.dislikesCount,
                parentType: item.parentType,
                parentTitle: item.parentTitle,
                isLiked: item.isLiked,
                isDisliked: item.isDisliked,
                tags: item.tags
              }"
            />
          </NuxtLink>
        </template>
      </div>
    </div>

    <div ref="sentinel" class="h-4"></div>

    <div v-if="loadingMore" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-700 border-t-blue-500"></div>
    </div>
  </div>
</template>
