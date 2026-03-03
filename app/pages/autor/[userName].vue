<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { user, isAuthenticated, updateProfile, resendVerificationEmail, setEmailVerified } = useAuth()

const userName = computed(() => route.params.userName as string)
const isOwnProfile = computed(() => isAuthenticated.value && user.value?.userName === userName.value)

const showEditModal = ref(false)
const editLoading = ref(false)
const editError = ref('')

const showDeleteModal = ref(false)
const deleteLoading = ref(false)
const deleteItemId = ref<string | null>(null)
const deleteItemType = ref<'artigo' | 'topico' | 'comentario'>('artigo')
const deleteItemTitle = ref('')

const resendingEmail = ref(false)
const resendSuccess = ref(false)
const resendError = ref('')

const showEmailNotVerifiedAlert = computed(() => {
  return isOwnProfile.value && profile.value && !profile.value.emailVerified
})

const handleResendVerification = async () => {
  if (!user.value?.email || resendingEmail.value) return

  resendingEmail.value = true
  resendError.value = ''
  resendSuccess.value = false

  try {
    await resendVerificationEmail(user.value.email)
    resendSuccess.value = true
  } catch (e: any) {
    if (e.statusCode === 422) {
      resendError.value = 'Email ja verificado ou conta Google'
      setEmailVerified(true)
      if (profile.value) profile.value.emailVerified = true
    } else if (e.statusCode === 404) {
      resendError.value = 'Email nao encontrado'
    } else {
      resendError.value = 'Erro ao reenviar email'
    }
  } finally {
    resendingEmail.value = false
  }
}

const editFormData = computed(() => ({
  name: profile.value?.name || '',
  userName: profile.value?.userName || '',
  email: user.value?.email || '',
  gitHub: profile.value?.gitHub || '',
  bio: profile.value?.bio || '',
  profileImageUrl: profile.value?.profileImageUrl || ''
}))

const handleEditSubmit = async (data: { name: string, userName: string, email: string, gitHub: string, bio: string, profileImageUrl: string, imageFile?: File }) => {
  editLoading.value = true
  editError.value = ''

  try {
    let newProfileImageUrl = data.profileImageUrl

    if (data.imageFile) {
      const formData = new FormData()
      formData.append('file', data.imageFile)

      newProfileImageUrl = await $fetch<string>(`${apiBase}/api/authors/profile-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })
    }

    const payload: Record<string, string | null> = {}

    if (data.name !== profile.value?.name) payload.name = data.name
    if (data.userName !== profile.value?.userName) payload.userName = data.userName
    if (data.email !== user.value?.email) payload.email = data.email
    if (data.gitHub !== (profile.value?.gitHub || '')) payload.gitHub = data.gitHub || null
    if (data.bio !== (profile.value?.bio || '')) payload.bio = data.bio || null
    if (newProfileImageUrl !== (profile.value?.profileImageUrl || '')) payload.profileImageUrl = newProfileImageUrl || null

    if (Object.keys(payload).length === 0) {
      showEditModal.value = false
      return
    }

    await updateProfile(payload)

    if (payload.userName) {
      showEditModal.value = false
      navigateTo(`/autor/${payload.userName}`)
      return
    }

    await fetchProfile()
    showEditModal.value = false
  } catch (e: any) {
    if (e.statusCode === 409) {
      editError.value = 'Email ou nome de usuario ja existe'
    } else if (e.statusCode === 400) {
      editError.value = e.data?.message || 'Arquivo invalido. Verifique o formato e tamanho.'
    } else {
      editError.value = e.data?.message || 'Erro ao atualizar perfil'
    }
  } finally {
    editLoading.value = false
  }
}

interface AuthorProfile {
  id: string
  name: string
  userName: string
  gitHub: string
  profileImageUrl: string
  bio: string
  bugCoins: number
  title: string
  articleCount: number
  topicCount: number
  commentCount: number
  emailVerified: boolean
}

interface Article {
  id: string
  authorId: string
  authorName: string
  authorUserName: string
  creationDate: string
  hasComment: boolean
  isMarkdown: boolean
  title: string
  slug: string
  coverImage: string
  originalPost: string
  tags: string[]
  imagePaths: string[]
  description: string
  urlArticleContent: string
  likesCount: number
  dislikesCount: number
  commentsCount: number
  savesCount: number
  isLiked: boolean
  isDisliked: boolean
  isSaved: boolean
}

interface Topic {
  id: string
  authorId: string
  authorName: string
  authorUserName: string
  creationDate: string
  title: string
  slug: string
  topicContent: string
  tags?: string[]
  likesCount: number
  dislikesCount: number
  commentsCount: number
  isLiked: boolean
  isDisliked: boolean
}

interface Comment {
  id: string
  content: string
  authorName: string
  authorId: string
  createdAt: string
  likes: number
  dislikes: number
  isLiked: boolean
  isDisliked: boolean
  depth: number
  replyCount: number
  parentId: string | null
  articleId: string | null
  topicId: string | null
  deleted: boolean
  parentAuthorUserName: string | null
  parentTitle: string | null
  parentSlug: string | null
  tags?: string[] | null
}

interface PageResponse<T> {
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

interface ArticlePageResponse extends PageResponse<Article> {
  articles: Article[]
}

interface TopicPageResponse extends PageResponse<Topic> {
  topics: Topic[]
}

interface CommentPageResponse extends PageResponse<Comment> {
  comments: Comment[]
}

type FilterType = 'artigos' | 'topicos' | 'comentarios'
type SortType = 'RECENT' | 'OLDEST' | 'LIKES' | 'SAVES' | 'COMMENTS'

const activeFilter = ref<FilterType>('artigos')
const currentSort = ref<SortType>('RECENT')
const loading = ref(true)
const error = ref('')

const profile = ref<AuthorProfile | null>(null)
const articles = ref<Article[]>([])
const topics = ref<Topic[]>([])
const comments = ref<Comment[]>([])

const articlesPage = ref(0)
const topicsPage = ref(0)
const commentsPage = ref(0)
const hasMoreArticles = ref(false)
const hasMoreTopics = ref(false)
const hasMoreComments = ref(false)

const fetchProfile = async () => {
  const data = await $fetch<AuthorProfile>(`${apiBase}/api/authors/${userName.value}`, {
    credentials: 'include'
  })
  profile.value = data
}

const fetchArticles = async (page = 0, reset = false) => {
  const data = await $fetch<ArticlePageResponse>(
    `${apiBase}/api/authors/${userName.value}/articles`,
    {
      params: { page, size: 10, sort: currentSort.value },
      credentials: 'include'
    }
  )
  if (reset) {
    articles.value = data.articles
  } else {
    articles.value.push(...data.articles)
  }
  articlesPage.value = data.page
  hasMoreArticles.value = data.hasNext
}

const fetchTopics = async (page = 0, reset = false) => {
  const data = await $fetch<TopicPageResponse>(
    `${apiBase}/api/authors/${userName.value}/topics`,
    {
      params: { page, size: 10, sort: currentSort.value },
      credentials: 'include'
    }
  )
  if (reset) {
    topics.value = data.topics
  } else {
    topics.value.push(...data.topics)
  }
  topicsPage.value = data.page
  hasMoreTopics.value = data.hasNext
}

const fetchComments = async (page = 0, reset = false) => {
  const data = await $fetch<CommentPageResponse>(
    `${apiBase}/api/authors/${userName.value}/comments`,
    {
      params: { page, size: 10, sort: currentSort.value },
      credentials: 'include'
    }
  )
  if (reset) {
    comments.value = data.comments
  } else {
    comments.value.push(...data.comments)
  }
  commentsPage.value = data.page
  hasMoreComments.value = data.hasNext
}

const loadMore = async () => {
  if (activeFilter.value === 'artigos' && hasMoreArticles.value) {
    await fetchArticles(articlesPage.value + 1)
  } else if (activeFilter.value === 'topicos' && hasMoreTopics.value) {
    await fetchTopics(topicsPage.value + 1)
  } else if (activeFilter.value === 'comentarios' && hasMoreComments.value) {
    await fetchComments(commentsPage.value + 1)
  }
}

const changeFilter = async (filter: FilterType) => {
  activeFilter.value = filter
  if (filter === 'artigos' && articles.value.length === 0) {
    await fetchArticles(0, true)
  } else if (filter === 'topicos' && topics.value.length === 0) {
    await fetchTopics(0, true)
  } else if (filter === 'comentarios' && comments.value.length === 0) {
    await fetchComments(0, true)
  }
}

const changeSort = async (sort: SortType) => {
  currentSort.value = sort
  if (activeFilter.value === 'artigos') {
    await fetchArticles(0, true)
  } else if (activeFilter.value === 'topicos') {
    await fetchTopics(0, true)
  } else if (activeFilter.value === 'comentarios') {
    await fetchComments(0, true)
  }
}

const hasMore = computed(() => {
  if (activeFilter.value === 'artigos') return hasMoreArticles.value
  if (activeFilter.value === 'topicos') return hasMoreTopics.value
  if (activeFilter.value === 'comentarios') return hasMoreComments.value
  return false
})

const loadingMore = ref(false)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const loadMoreWithLoading = async () => {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  try {
    await loadMore()
  } finally {
    loadingMore.value = false
  }
}

watch(sentinel, (el) => {
  if (el && observer) {
    observer.observe(el)
  }
})

const filters = [
  { key: 'artigos' as FilterType, label: 'Artigos' },
  { key: 'topicos' as FilterType, label: 'Topicos' },
  { key: 'comentarios' as FilterType, label: 'Comentarios' }
]

const articlesLeft = computed(() => articles.value.filter((_, i) => i % 2 === 0))
const articlesRight = computed(() => articles.value.filter((_, i) => i % 2 === 1))
const topicsLeft = computed(() => topics.value.filter((_, i) => i % 2 === 0))
const topicsRight = computed(() => topics.value.filter((_, i) => i % 2 === 1))
const commentsLeft = computed(() => comments.value.filter((_, i) => i % 2 === 0))
const commentsRight = computed(() => comments.value.filter((_, i) => i % 2 === 1))

const sortOptions = [
  { value: 'RECENT' as SortType, label: 'Recentes' },
  { value: 'OLDEST' as SortType, label: 'Antigos' },
  { value: 'LIKES' as SortType, label: 'Mais curtidos' }
]

const getCommentUrl = (comment: Comment): string => {
  const basePath = comment.articleId ? 'artigo' : 'topico'
  return `/${basePath}/${comment.parentAuthorUserName}/${comment.parentSlug}?commentId=${comment.id}`
}

const openDeleteModal = (id: string, type: 'artigo' | 'topico' | 'comentario', title: string) => {
  deleteItemId.value = id
  deleteItemType.value = type
  deleteItemTitle.value = title
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deleteItemId.value = null
  deleteItemTitle.value = ''
}

const handleDelete = async () => {
  if (!deleteItemId.value) return

  deleteLoading.value = true

  try {
    let endpoint = ''
    switch (deleteItemType.value) {
      case 'artigo':
        endpoint = `${apiBase}/article/delete/${deleteItemId.value}`
        break
      case 'topico':
        endpoint = `${apiBase}/api/topic/delete/${deleteItemId.value}`
        break
      case 'comentario':
        endpoint = `${apiBase}/api/comment/delete/${deleteItemId.value}`
        break
    }

    await $fetch(endpoint, {
      method: 'DELETE',
      credentials: 'include'
    })

    switch (deleteItemType.value) {
      case 'artigo':
        articles.value = articles.value.filter(a => a.id !== deleteItemId.value)
        if (profile.value) profile.value.articleCount--
        break
      case 'topico':
        topics.value = topics.value.filter(t => t.id !== deleteItemId.value)
        if (profile.value) profile.value.topicCount--
        break
      case 'comentario':
        comments.value = comments.value.filter(c => c.id !== deleteItemId.value)
        if (profile.value) profile.value.commentCount--
        break
    }

    closeDeleteModal()
  } catch (e: any) {
    console.error('Erro ao deletar:', e)
  } finally {
    deleteLoading.value = false
  }
}

onMounted(async () => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !loadingMore.value && !loading.value) {
        loadMoreWithLoading()
      }
    },
    { threshold: 0.1 }
  )

  if (sentinel.value) {
    observer.observe(sentinel.value)
  }

  try {
    await fetchProfile()
    await fetchArticles(0, true)
  } catch (e) {
    error.value = 'Erro ao carregar perfil'
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-8">
    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <div v-else-if="profile" class="flex flex-col lg:flex-row gap-8">
      <div
        v-if="showEmailNotVerifiedAlert"
        class="lg:hidden mb-4 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-xl"
      >
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div class="flex-1">
            <p class="text-yellow-200 font-medium">Email nao verificado</p>
            <p class="text-yellow-300/70 text-sm mt-1">
              Verifique seu email para desbloquear todas as funcionalidades.
            </p>
            <div class="mt-3">
              <button
                v-if="!resendSuccess"
                @click="handleResendVerification"
                :disabled="resendingEmail"
                class="text-sm px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white rounded-lg transition-colors"
              >
                <span v-if="resendingEmail">Enviando...</span>
                <span v-else>Reenviar email de verificacao</span>
              </button>
              <p v-else class="text-green-400 text-sm">Email enviado com sucesso!</p>
              <p v-if="resendError" class="text-red-400 text-sm mt-1">{{ resendError }}</p>
            </div>
          </div>
        </div>
      </div>

      <aside class="lg:w-72 flex-shrink-0">
        <div class="bg-slate-900 rounded-xl p-6 border border-slate-800 lg:sticky lg:top-6">
          <div class="flex flex-col items-center text-center mb-6">
            <img
              v-if="profile.profileImageUrl"
              :src="profile.profileImageUrl"
              :alt="profile.name"
              class="w-32 h-32 rounded-full object-cover mb-4 ring-4 ring-slate-800"
            />
            <div
              v-else
              class="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 ring-4 ring-slate-800"
            >
              <span class="text-4xl font-bold text-white">
                {{ profile.name.charAt(0).toUpperCase() }}
              </span>
            </div>
            <h1 class="text-xl font-bold text-white">{{ profile.name }}</h1>
            <p class="text-slate-400">@{{ profile.userName }}</p>
            <p v-if="profile.title" class="text-blue-400 text-sm mt-1">{{ profile.title }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="text-center">
              <p class="text-2xl font-bold text-white">{{ profile.articleCount }}</p>
              <p class="text-slate-400 text-sm">Artigos</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-white">{{ profile.topicCount }}</p>
              <p class="text-slate-400 text-sm">Topicos</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-white">{{ profile.commentCount }}</p>
              <p class="text-slate-400 text-sm">Comentarios</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-yellow-400">{{ profile.bugCoins }}</p>
              <p class="text-slate-400 text-sm">BugCoins</p>
            </div>
          </div>

          <a
            v-if="profile.gitHub"
            :href="`https://github.com/${profile.gitHub}`"
            target="_blank"
            class="flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
            </svg>
          </a>

          <button
            v-if="isOwnProfile"
            @click="showEditModal = true"
            class="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar Perfil
          </button>

          <div
            v-if="showEmailNotVerifiedAlert"
            class="hidden lg:block mt-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg"
          >
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="flex-1">
                <p class="text-yellow-200 text-sm font-medium">Email nao verificado</p>
                <p class="text-yellow-300/70 text-xs mt-1">
                  Verifique seu email para desbloquear todas as funcionalidades.
                </p>
                <div class="mt-2">
                  <button
                    v-if="!resendSuccess"
                    @click="handleResendVerification"
                    :disabled="resendingEmail"
                    class="text-xs px-2 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white rounded transition-colors"
                  >
                    <span v-if="resendingEmail">Enviando...</span>
                    <span v-else>Reenviar email</span>
                  </button>
                  <p v-else class="text-green-400 text-xs">Email enviado!</p>
                  <p v-if="resendError" class="text-red-400 text-xs mt-1">{{ resendError }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main class="flex-1">
        <section v-if="profile.bio" class="mb-8">
          <h2 class="text-xl font-bold text-white mb-4">Sobre</h2>
          <p class="text-slate-400 leading-relaxed">{{ profile.bio }}</p>
        </section>

        <section>
          <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div class="flex gap-2">
              <button
                v-for="filter in filters"
                :key="filter.key"
                @click="changeFilter(filter.key)"
                class="px-4 py-2 rounded-lg font-medium transition-colors"
                :class="activeFilter === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
              >
                {{ filter.label }}
              </button>
            </div>

            <select
              :value="currentSort"
              @change="changeSort(($event.target as HTMLSelectElement).value as SortType)"
              class="bg-slate-800 text-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <template v-if="activeFilter === 'artigos'">
            <div v-if="articles.length === 0" class="text-center py-12 text-slate-400">
              Nenhum artigo publicado ainda.
            </div>
            <div v-else class="flex flex-col md:flex-row gap-6">
              <div class="flex-1 space-y-6">
                <div v-for="article in articlesLeft" :key="article.id" class="relative group">
                  <button
                    v-if="isOwnProfile"
                    type="button"
                    @click.prevent.stop="openDeleteModal(article.id, 'artigo', article.title)"
                    class="absolute top-3 right-3 z-10 p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Deletar artigo"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <NuxtLink :to="`/artigo/${userName}/${article.slug}`" class="block">
                    <ArticleCard
                      :article="{
                        id: article.id,
                        title: article.title,
                        excerpt: article.description,
                        tags: article.tags || [],
                        author: { name: article.authorName, userName: article.authorUserName, avatar: profile?.profileImageUrl || undefined },
                        date: article.creationDate,
                        likes: article.likesCount,
                        dislikes: article.dislikesCount,
                        comments: article.commentsCount,
                        saves: article.savesCount,
                        coverImage: article.coverImage,
                        isLiked: article.isLiked,
                        isDisliked: article.isDisliked,
                        isSaved: article.isSaved
                      }"
                    />
                  </NuxtLink>
                </div>
              </div>
              <div class="flex-1 space-y-6">
                <div v-for="article in articlesRight" :key="article.id" class="relative group">
                  <button
                    v-if="isOwnProfile"
                    type="button"
                    @click.prevent.stop="openDeleteModal(article.id, 'artigo', article.title)"
                    class="absolute top-3 right-3 z-10 p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Deletar artigo"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <NuxtLink :to="`/artigo/${userName}/${article.slug}`" class="block">
                    <ArticleCard
                      :article="{
                        id: article.id,
                        title: article.title,
                        excerpt: article.description,
                        tags: article.tags || [],
                        author: { name: article.authorName, userName: article.authorUserName, avatar: profile?.profileImageUrl || undefined },
                        date: article.creationDate,
                        likes: article.likesCount,
                        dislikes: article.dislikesCount,
                        comments: article.commentsCount,
                        saves: article.savesCount,
                        coverImage: article.coverImage,
                        isLiked: article.isLiked,
                        isDisliked: article.isDisliked,
                        isSaved: article.isSaved
                      }"
                    />
                  </NuxtLink>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeFilter === 'topicos'">
            <div v-if="topics.length === 0" class="text-center py-12 text-slate-400">
              Nenhum topico criado ainda.
            </div>
            <div v-else class="flex flex-col md:flex-row gap-6">
              <div class="flex-1 space-y-6">
                <div v-for="topic in topicsLeft" :key="topic.id" class="relative group">
                  <button
                    v-if="isOwnProfile"
                    type="button"
                    @click.prevent.stop="openDeleteModal(topic.id, 'topico', topic.title)"
                    class="absolute top-3 right-3 z-10 p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Deletar topico"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <NuxtLink :to="`/topico/${userName}/${topic.slug}`" class="block">
                    <TopicCard
                      :topic="{
                        id: topic.id,
                        title: topic.title,
                        excerpt: topic.topicContent,
                        tags: topic.tags || [],
                        author: { name: topic.authorName, userName: topic.authorUserName, avatar: profile?.profileImageUrl || undefined },
                        date: topic.creationDate,
                        likes: topic.likesCount,
                        dislikes: topic.dislikesCount,
                        comments: topic.commentsCount,
                        isLiked: topic.isLiked,
                        isDisliked: topic.isDisliked
                      }"
                    />
                  </NuxtLink>
                </div>
              </div>
              <div class="flex-1 space-y-6">
                <div v-for="topic in topicsRight" :key="topic.id" class="relative group">
                  <button
                    v-if="isOwnProfile"
                    type="button"
                    @click.prevent.stop="openDeleteModal(topic.id, 'topico', topic.title)"
                    class="absolute top-3 right-3 z-10 p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Deletar topico"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <NuxtLink :to="`/topico/${userName}/${topic.slug}`" class="block">
                    <TopicCard
                      :topic="{
                        id: topic.id,
                        title: topic.title,
                        excerpt: topic.topicContent,
                        tags: topic.tags || [],
                        author: { name: topic.authorName, userName: topic.authorUserName, avatar: profile?.profileImageUrl || undefined },
                        date: topic.creationDate,
                        likes: topic.likesCount,
                        dislikes: topic.dislikesCount,
                        comments: topic.commentsCount,
                        isLiked: topic.isLiked,
                        isDisliked: topic.isDisliked
                      }"
                    />
                  </NuxtLink>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeFilter === 'comentarios'">
            <div v-if="comments.length === 0" class="text-center py-12 text-slate-400">
              Nenhum comentario feito ainda.
            </div>
            <div v-else class="flex flex-col md:flex-row gap-6">
              <div class="flex-1 space-y-6">
                <div v-for="comment in commentsLeft" :key="comment.id" class="relative group">
                  <button
                    v-if="isOwnProfile"
                    type="button"
                    @click.prevent.stop="openDeleteModal(comment.id, 'comentario', comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : ''))"
                    class="absolute top-3 right-3 z-10 p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Deletar comentario"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <NuxtLink :to="getCommentUrl(comment)" class="block">
                    <CommentCard
                      :comment="{
                        id: comment.id,
                        content: comment.content,
                        author: { name: comment.authorName, userName: userName as string, avatar: profile?.profileImageUrl || undefined },
                        date: comment.createdAt,
                        likes: comment.likes,
                        dislikes: comment.dislikes,
                        parentType: comment.articleId ? 'ARTICLE' : 'TOPIC',
                        parentTitle: comment.parentTitle,
                        isLiked: comment.isLiked,
                        isDisliked: comment.isDisliked,
                        tags: comment.tags
                      }"
                    />
                  </NuxtLink>
                </div>
              </div>
              <div class="flex-1 space-y-6">
                <div v-for="comment in commentsRight" :key="comment.id" class="relative group">
                  <button
                    v-if="isOwnProfile"
                    type="button"
                    @click.prevent.stop="openDeleteModal(comment.id, 'comentario', comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : ''))"
                    class="absolute top-3 right-3 z-10 p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Deletar comentario"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <NuxtLink :to="getCommentUrl(comment)" class="block">
                    <CommentCard
                      :comment="{
                        id: comment.id,
                        content: comment.content,
                        author: { name: comment.authorName, userName: userName as string, avatar: profile?.profileImageUrl || undefined },
                        date: comment.createdAt,
                        likes: comment.likes,
                        dislikes: comment.dislikes,
                        parentType: comment.articleId ? 'ARTICLE' : 'TOPIC',
                        parentTitle: comment.parentTitle,
                        isLiked: comment.isLiked,
                        isDisliked: comment.isDisliked,
                        tags: comment.tags
                      }"
                    />
                  </NuxtLink>
                </div>
              </div>
            </div>
          </template>

          <div ref="sentinel" class="h-4"></div>

          <div v-if="loadingMore" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </section>
      </main>
    </div>

    <ProfileEditModal
      v-if="isOwnProfile"
      :is-open="showEditModal"
      :initial-data="editFormData"
      :loading="editLoading"
      :server-error="editError"
      @close="showEditModal = false"
      @submit="handleEditSubmit"
    />

    <DeleteConfirmModal
      v-if="isOwnProfile"
      :is-open="showDeleteModal"
      :title="`Deletar ${deleteItemType}`"
      :item-type="deleteItemType"
      :loading="deleteLoading"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
