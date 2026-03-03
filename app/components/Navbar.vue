<script setup lang="ts">
const { user, isAuthenticated, logout, validateToken } = useAuth()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const router = useRouter()

const mobileMenuOpen = ref(false)
const searchQuery = ref('')

interface SearchResult {
  id: string
  title: string
  slug: string
  authorName: string
  authorUserName: string
}

interface TagSearchResult {
  id: string
  type: 'ARTICLE' | 'TOPIC' | 'COMMENT'
  title: string | null
  slug: string | null
  content: string
  authorName: string
  authorUserName: string
  parentType?: 'ARTICLE' | 'TOPIC' | null
  parentAuthorUserName?: string | null
  parentSlug?: string | null
}

const articleResults = ref<SearchResult[]>([])
const topicResults = ref<SearchResult[]>([])
const tagResults = ref<TagSearchResult[]>([])
const isSearching = ref(false)
const showResults = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
const mobileSearchInputRef = ref<HTMLInputElement | null>(null)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

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

const hasResults = computed(() => {
  return articleResults.value.length > 0 || topicResults.value.length > 0 || tagResults.value.length > 0
})

const performSearch = async () => {
  if (!searchQuery.value.trim()) {
    articleResults.value = []
    topicResults.value = []
    tagResults.value = []
    showResults.value = false
    return
  }

  isSearching.value = true
  const { titleQuery, tags } = parseSearchQuery(searchQuery.value)

  try {
    const promises: Promise<void>[] = []

    //busca por título em artigos e tópicos
    if (titleQuery) {
      promises.push(
        $fetch<{ articles: SearchResult[] }>(`${apiBase}/article/search`, {
          params: { title: titleQuery, size: 5 }
        }).then(data => {
          articleResults.value = data.articles
        }).catch(() => {
          articleResults.value = []
        })
      )

      promises.push(
        $fetch<{ topics: Array<{ id: string; title: string; slug: string; authorName: string; authorUserName: string }> }>(`${apiBase}/api/topic/search`, {
          params: { title: titleQuery, size: 5 }
        }).then(data => {
          topicResults.value = data.topics
        }).catch(() => {
          topicResults.value = []
        })
      )
    } else {
      articleResults.value = []
      topicResults.value = []
    }

    //busca por tags
    if (tags.length > 0) {
      promises.push(
        $fetch<{ items: TagSearchResult[] }>(`${apiBase}/api/search/tags`, {
          params: { tags: tags.join(','), size: 10 }
        }).then(data => {
          tagResults.value = data.items
        }).catch(() => {
          tagResults.value = []
        })
      )
    } else {
      tagResults.value = []
    }

    await Promise.all(promises)
    showResults.value = true
  } catch (e) {
    console.error('Erro na busca:', e)
    articleResults.value = []
    topicResults.value = []
    tagResults.value = []
  } finally {
    isSearching.value = false
  }
}

const debouncedSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    performSearch()
  }, 300)
}

const goToArticle = (authorUserName: string, slug: string) => {
  router.push(`/artigo/${authorUserName}/${slug}`)
  clearSearch()
}

const goToTopic = (authorUserName: string, slug: string) => {
  router.push(`/topico/${authorUserName}/${slug}`)
  clearSearch()
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
  clearSearch()
}

const clearSearch = () => {
  searchQuery.value = ''
  articleResults.value = []
  topicResults.value = []
  tagResults.value = []
  showResults.value = false
  mobileMenuOpen.value = false
}

const goToSearchPage = () => {
  if (searchQuery.value.trim()) {
    const safeQuery = searchQuery.value.replace(/#/g, '__TAG__')
    clearSearch()
    router.push({ path: '/busca', query: { q: safeQuery } })
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.search-container')) {
    showResults.value = false
  }
}

onMounted(() => {
  validateToken()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>

<template>
  <nav class="bg-slate-900 border-b border-slate-800 px-4 md:px-6">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center">
        <img src="~/assets/logo/1000pxwh.png" alt="Falae.dev" class="h-16" />
      </NuxtLink>

      <div class="hidden md:flex items-center gap-4">
        <div class="relative search-container">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Pesquisar... #tags"
            class="bg-slate-800 text-slate-300 placeholder-slate-500 rounded-full px-4 py-2 pl-10 w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @input="debouncedSearch"
            @focus="searchQuery.trim() && hasResults && (showResults = true)"
            @keydown.enter="goToSearchPage"
          />
          <div class="absolute left-3 top-0 bottom-0 flex items-center">
            <svg
              v-if="!isSearching"
              class="w-4 h-4 text-slate-500"
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
              class="w-4 h-4 border-2 border-slate-500 border-t-blue-500 rounded-full animate-spin"
            />
          </div>

          <div
            v-if="showResults && searchQuery.trim()"
            class="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden z-50 max-h-96 overflow-y-auto"
          >
            <button
              @click="goToSearchPage"
              class="w-full px-4 py-3 text-left bg-blue-600/10 hover:bg-blue-600/20 border-b border-slate-700 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span class="text-blue-400 text-sm font-medium">Busca detalhada</span>
              <span class="text-slate-500 text-xs ml-auto">Enter</span>
            </button>

            <div v-if="!hasResults && !isSearching" class="px-4 py-3 text-slate-400 text-sm">
              Nenhum resultado encontrado
            </div>

            <div v-if="articleResults.length > 0">
              <div class="px-4 py-2 bg-slate-700/50 text-slate-300 text-xs font-semibold uppercase tracking-wide">
                Artigos
              </div>
              <button
                v-for="result in articleResults"
                :key="result.id"
                class="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50"
                @click="goToArticle(result.authorUserName, result.slug)"
              >
                <p class="text-white text-sm font-medium line-clamp-1">{{ result.title }}</p>
                <p class="text-slate-400 text-xs">por {{ result.authorName }}</p>
              </button>
            </div>

            <div v-if="topicResults.length > 0">
              <div class="px-4 py-2 bg-slate-700/50 text-slate-300 text-xs font-semibold uppercase tracking-wide">
                Tópicos
              </div>
              <button
                v-for="result in topicResults"
                :key="result.id"
                class="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50"
                @click="goToTopic(result.authorUserName, result.slug)"
              >
                <p class="text-white text-sm font-medium line-clamp-1">{{ result.title }}</p>
                <p class="text-slate-400 text-xs">por {{ result.authorName }}</p>
              </button>
            </div>

            <div v-if="tagResults.length > 0">
              <div class="px-4 py-2 bg-slate-700/50 text-slate-300 text-xs font-semibold uppercase tracking-wide">
                Por Tags
              </div>
              <button
                v-for="result in tagResults"
                :key="result.id"
                class="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50"
                @click="goToTagResult(result)"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="px-1.5 py-0.5 text-xs rounded"
                    :class="{
                      'bg-blue-500/20 text-blue-400': result.type === 'ARTICLE',
                      'bg-purple-500/20 text-purple-400': result.type === 'TOPIC',
                      'bg-green-500/20 text-green-400': result.type === 'COMMENT'
                    }"
                  >
                    {{ result.type === 'ARTICLE' ? 'Artigo' : result.type === 'TOPIC' ? 'Tópico' : 'Comentário' }}
                  </span>
                  <p class="text-white text-sm font-medium line-clamp-1 flex-1">{{ result.title || result.content }}</p>
                </div>
                <p class="text-slate-400 text-xs mt-1">por {{ result.authorName }}</p>
              </button>
            </div>
          </div>
        </div>
        <template v-if="isAuthenticated">
          <div class="relative group">
            <NuxtLink to="/perfil">
              <img
                v-if="user?.profileImageUrl"
                :src="user.profileImageUrl"
                :alt="user?.name"
                class="w-10 h-10 rounded-full object-cover cursor-pointer ring-2 ring-transparent hover:ring-blue-500 transition-all"
              />
              <div
                v-else
                class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer ring-2 ring-transparent hover:ring-blue-500 transition-all"
              >
                <span class="text-white font-semibold">
                  {{ user?.name?.charAt(0).toUpperCase() }}
                </span>
              </div>
            </NuxtLink>
            <div class="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <NuxtLink
                to="/perfil"
                class="block px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-t-lg"
              >
                Meu Perfil
              </NuxtLink>
              <button
                @click="logout"
                class="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-b-lg"
              >
                Sair
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <NuxtLink
            to="/login"
            class="text-slate-300 hover:text-white transition-colors"
          >
            Login
          </NuxtLink>
          <NuxtLink
            to="/cadastro"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Cadastrar
          </NuxtLink>
        </template>
      </div>

      <button
        @click="mobileMenuOpen = !mobileMenuOpen"
        class="md:hidden text-slate-300 hover:text-white p-2"
      >
        <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div v-if="mobileMenuOpen" class="md:hidden mt-4 space-y-4">
      <div class="relative search-container">
        <input
          ref="mobileSearchInputRef"
          v-model="searchQuery"
          type="text"
          placeholder="Pesquisar... #tags"
          class="w-full bg-slate-800 text-slate-300 placeholder-slate-500 rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @input="debouncedSearch"
          @focus="searchQuery.trim() && hasResults && (showResults = true)"
          @keydown.enter="goToSearchPage"
        />
        <div class="absolute left-3 top-0 bottom-0 flex items-center">
          <svg
            v-if="!isSearching"
            class="w-4 h-4 text-slate-500"
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
            class="w-4 h-4 border-2 border-slate-500 border-t-blue-500 rounded-full animate-spin"
          />
        </div>

        <div
          v-if="showResults && searchQuery.trim()"
          class="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden z-50 max-h-80 overflow-y-auto"
        >

          <button
            @click="goToSearchPage"
            class="w-full px-4 py-3 text-left bg-blue-600/10 hover:bg-blue-600/20 border-b border-slate-700 transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span class="text-blue-400 text-sm font-medium">Busca detalhada</span>
          </button>

          <div v-if="!hasResults && !isSearching" class="px-4 py-3 text-slate-400 text-sm">
            Nenhum resultado encontrado
          </div>

          <div v-if="articleResults.length > 0">
            <div class="px-4 py-2 bg-slate-700/50 text-slate-300 text-xs font-semibold uppercase tracking-wide">
              Artigos
            </div>
            <button
              v-for="result in articleResults"
              :key="result.id"
              class="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50"
              @click="goToArticle(result.authorUserName, result.slug)"
            >
              <p class="text-white text-sm font-medium line-clamp-1">{{ result.title }}</p>
              <p class="text-slate-400 text-xs">por {{ result.authorName }}</p>
            </button>
          </div>

          <div v-if="topicResults.length > 0">
            <div class="px-4 py-2 bg-slate-700/50 text-slate-300 text-xs font-semibold uppercase tracking-wide">
              Tópicos
            </div>
            <button
              v-for="result in topicResults"
              :key="result.id"
              class="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50"
              @click="goToTopic(result.authorUserName, result.slug)"
            >
              <p class="text-white text-sm font-medium line-clamp-1">{{ result.title }}</p>
              <p class="text-slate-400 text-xs">por {{ result.authorName }}</p>
            </button>
          </div>

          <div v-if="tagResults.length > 0">
            <div class="px-4 py-2 bg-slate-700/50 text-slate-300 text-xs font-semibold uppercase tracking-wide">
              Por Tags
            </div>
            <button
              v-for="result in tagResults"
              :key="result.id"
              class="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700/50"
              @click="goToTagResult(result)"
            >
              <div class="flex items-center gap-2">
                <span
                  class="px-1.5 py-0.5 text-xs rounded"
                  :class="{
                    'bg-blue-500/20 text-blue-400': result.type === 'ARTICLE',
                    'bg-purple-500/20 text-purple-400': result.type === 'TOPIC',
                    'bg-green-500/20 text-green-400': result.type === 'COMMENT'
                  }"
                >
                  {{ result.type === 'ARTICLE' ? 'Artigo' : result.type === 'TOPIC' ? 'Tópico' : 'Comentário' }}
                </span>
                <p class="text-white text-sm font-medium line-clamp-1 flex-1">{{ result.title || result.content }}</p>
              </div>
              <p class="text-slate-400 text-xs mt-1">por {{ result.authorName }}</p>
            </button>
          </div>
        </div>
      </div>

      <template v-if="isAuthenticated">
        <NuxtLink
          to="/perfil"
          class="flex items-center gap-3 text-slate-300 hover:text-white transition-colors"
          @click="mobileMenuOpen = false"
        >
          <img
            v-if="user?.profileImageUrl"
            :src="user.profileImageUrl"
            :alt="user?.name"
            class="w-8 h-8 rounded-full object-cover"
          />
          <div
            v-else
            class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
          >
            <span class="text-white font-semibold text-sm">
              {{ user?.name?.charAt(0).toUpperCase() }}
            </span>
          </div>
          <span>Meu Perfil</span>
        </NuxtLink>
        <button
          @click="logout(); mobileMenuOpen = false"
          class="w-full text-left text-slate-300 hover:text-white transition-colors"
        >
          Sair
        </button>
      </template>

      <template v-else>
        <div class="flex gap-4">
          <NuxtLink
            to="/login"
            class="flex-1 text-center text-slate-300 hover:text-white transition-colors py-2"
            @click="mobileMenuOpen = false"
          >
            Login
          </NuxtLink>
          <NuxtLink
            to="/cadastro"
            class="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            @click="mobileMenuOpen = false"
          >
            Cadastrar
          </NuxtLink>
        </div>
      </template>
    </div>
  </nav>
</template>
