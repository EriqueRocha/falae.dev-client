<script setup lang="ts">
import { useThreadNavigationProvider, type Comment } from '~/composables/useThreadNavigation'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { isAuthenticated } = useAuth()

interface CommentPageResponse {
  comments: Comment[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

const props = defineProps<{
  articleId: string
  highlightCommentId?: string | null
  initialCommentsCount?: number
}>()

const comments = ref<Comment[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')
const currentPage = ref(0)
const hasMore = ref(false)
const totalComments = ref(props.initialCommentsCount ?? 0)

const newComment = ref('')
const newCommentTags = ref<string[]>([])
const sendingComment = ref(false)
const showTagInput = ref(false)

const highlightPath = ref<string[]>([])
const rootAncestor = ref<Comment | null>(null)

const threadNavigation = useThreadNavigationProvider()
const { isInThreadView, currentThreadContext, popThread, pushThread } = threadNavigation

const maxDepth = 4

const threadReplies = ref<Comment[]>([])
const loadingThreadReplies = ref(false)

const loadThreadReplies = async () => {
  if (!currentThreadContext.value) return

  loadingThreadReplies.value = true
  try {
    const data = await $fetch<Comment[]>(
      `${apiBase}/api/comment/${currentThreadContext.value.rootComment.id}/replies`,
      { credentials: 'include' }
    )
    threadReplies.value = data
  } catch (e) {
    console.error('Erro ao carregar respostas da thread:', e)
  } finally {
    loadingThreadReplies.value = false
  }
}

watch(currentThreadContext, async (newContext) => {
  if (newContext) {
    await loadThreadReplies()
  } else {
    threadReplies.value = []
  }
})

const fetchComments = async (page = 0, reset = false) => {
  try {
    const data = await $fetch<CommentPageResponse>(
      `${apiBase}/api/comment/article/${props.articleId}`,
      {
        params: { page, size: 10 },
        credentials: 'include'
      }
    )

    if (reset) {
      comments.value = data.comments
    } else {
      comments.value.push(...data.comments)
    }

    currentPage.value = data.page
    hasMore.value = data.hasNext
  } catch (e) {
    error.value = 'Erro ao carregar comentarios'
  }
}

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value) return

  loadingMore.value = true
  try {
    await fetchComments(currentPage.value + 1)
  } finally {
    loadingMore.value = false
  }
}

const submitComment = async () => {
  if (!newComment.value.trim() || sendingComment.value) return

  sendingComment.value = true
  try {
    await $fetch(`${apiBase}/api/comment/save`, {
      method: 'POST',
      body: {
        message: newComment.value,
        articleId: props.articleId,
        topicId: null,
        parentId: null,
        tags: newCommentTags.value.length > 0 ? newCommentTags.value : null
      },
      credentials: 'include'
    })

    newComment.value = ''
    newCommentTags.value = []
    showTagInput.value = false
    await fetchComments(0, true)
  } catch (e) {
    console.error('Erro ao enviar comentario:', e)
  } finally {
    sendingComment.value = false
  }
}

const onReplyAdded = async () => {
  totalComments.value++
  if (isInThreadView.value) {
    await loadThreadReplies()
  }
}

const fetchComment = async (commentId: string): Promise<Comment | null> => {
  try {
    return await $fetch<Comment>(`${apiBase}/api/comment/${commentId}`, {
      credentials: 'include'
    })
  } catch (e) {
    return null
  }
}

const buildCommentChain = async (commentId: string): Promise<Comment[]> => {
  const chain: Comment[] = []
  let currentId: string | null = commentId

  while (currentId) {
    const comment = await fetchComment(currentId)
    if (!comment) break

    chain.unshift(comment)
    currentId = comment.parentId
  }

  return chain
}

const scrollToHighlightedComment = () => {
  const scrollToComment = () => {
    const element = document.getElementById(`comment-${props.highlightCommentId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      element.classList.add('highlight-pulse')
      setTimeout(() => element.classList.remove('highlight-pulse'), 2000)
      return true
    }
    return false
  }

  if (!scrollToComment()) {
    let attempts = 0
    const maxAttempts = 15
    const interval = setInterval(() => {
      attempts++
      if (scrollToComment() || attempts >= maxAttempts) {
        clearInterval(interval)
      }
    }, 200)
  }
}

const loadHighlightedComment = async () => {
  if (!props.highlightCommentId) return

  try {
    const chain = await buildCommentChain(props.highlightCommentId)
    if (chain.length === 0) return

    const targetComment = chain[chain.length - 1]

    if (targetComment.depth >= maxDepth) {ew
      const targetDisplayDepth = 2
      const breakpointDepth = Math.max(0, targetComment.depth - targetDisplayDepth)

      const breakpointIndex = chain.findIndex(c => c.depth >= breakpointDepth)

      if (breakpointIndex >= 0 && breakpointIndex < chain.length - 1) {
        const threadRoot = chain[breakpointIndex]
        const ancestorChain = chain.slice(0, breakpointIndex)

        highlightPath.value = chain.slice(breakpointIndex).map(c => c.id)

        pushThread(threadRoot, ancestorChain)

        await nextTick()
        scrollToHighlightedComment()
        return
      }
    }

    highlightPath.value = chain.map(c => c.id)
    rootAncestor.value = chain[0]

    await nextTick()
    scrollToHighlightedComment()
  } catch (e) {
    console.error('Erro ao carregar comentario destacado:', e)
  }
}

const normalDisplayComments = computed(() => {
  if (!rootAncestor.value) {
    return comments.value
  }

  const rootInList = comments.value.some(c => c.id === rootAncestor.value?.id)

  if (rootInList) {
    return comments.value
  }

  return [rootAncestor.value, ...comments.value]
})

onMounted(async () => {
  try {
    await fetchComments(0, true)
    if (props.highlightCommentId) {
      await loadHighlightedComment()
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-slate-800">
    <h2 class="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      Comentarios
      <span class="text-slate-500 text-sm sm:text-base font-normal">({{ totalComments }})</span>
    </h2>

    <div v-if="isAuthenticated" class="mb-6 sm:mb-8">
      <MarkdownEditor
        v-model="newComment"
        placeholder="Escreva um comentário em Markdown..."
        :rows="4"
      />

      <div class="mt-2 sm:mt-3">
        <button
          v-if="!showTagInput"
          @click="showTagInput = true"
          class="text-xs sm:text-sm text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors"
        >
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span class="hidden sm:inline">Adicionar tags para encontrarem seu comentário</span>
          <span class="sm:hidden">Adicionar tags</span>
        </button>

        <div v-else class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm text-slate-400">Tags</span>
            <button
              @click="showTagInput = false; newCommentTags = []"
              class="text-xs text-slate-500 hover:text-slate-400"
            >
              Remover
            </button>
          </div>
          <TagInput v-model="newCommentTags" placeholder="java, vue, tutorial..." :max-tags="10" :max-tag-length="50" />
        </div>
      </div>

      <div class="flex justify-end mt-2 sm:mt-3">
        <button
          @click="submitComment"
          :disabled="!newComment.trim() || sendingComment"
          class="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
        >
          {{ sendingComment ? 'Enviando...' : 'Comentar' }}
        </button>
      </div>
    </div>

    <div v-else class="mb-8 p-4 bg-slate-800/50 rounded-lg text-center">
      <p class="text-slate-400 mb-2">Faca login para comentar</p>
      <NuxtLink
        to="/login"
        class="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
      >
        Entrar
      </NuxtLink>
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <div v-else-if="!isInThreadView && normalDisplayComments.length === 0" class="text-center py-8">
      <p class="text-slate-500">Nenhum comentario ainda. Seja o primeiro a comentar!</p>
    </div>

    <div v-if="isInThreadView && currentThreadContext" class="mb-4 p-3 bg-slate-800/50 rounded-lg">
      <button
        @click="popThread"
        class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Ver anteriores
      </button>
      <div v-if="currentThreadContext.ancestorChain.length > 0" class="text-sm text-slate-500 mt-2 flex items-center gap-1 flex-wrap">
        <span v-for="(ancestor, index) in currentThreadContext.ancestorChain" :key="ancestor.id" class="flex items-center gap-1">
          <span>{{ ancestor.authorName }}</span>
          <svg v-if="index < currentThreadContext.ancestorChain.length - 1" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </span>
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-slate-400">{{ currentThreadContext.rootComment.authorName }}</span>
      </div>
    </div>

    <div v-if="isInThreadView && loadingThreadReplies" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <div v-else-if="isInThreadView && threadReplies.length === 0 && !loadingThreadReplies" class="text-center py-8">
      <p class="text-slate-500">Nenhuma resposta ainda.</p>
    </div>

    <div v-if="isInThreadView && threadReplies.length > 0" class="space-y-6">
      <CommentItem
        v-for="comment in threadReplies"
        :key="'thread-' + comment.id"
        :comment="comment"
        :article-id="articleId"
        :highlight-path="highlightPath"
        :highlight-comment-id="highlightCommentId || undefined"
        @reply-added="onReplyAdded"
      />
    </div>

    <div v-show="!isInThreadView" v-if="normalDisplayComments.length > 0" class="space-y-6">
      <CommentItem
        v-for="comment in normalDisplayComments"
        :key="comment.id"
        :comment="comment"
        :article-id="articleId"
        :highlight-path="highlightPath"
        :highlight-comment-id="highlightCommentId || undefined"
        @reply-added="onReplyAdded"
      />

      <div v-if="hasMore" class="flex justify-center pt-4">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
        >
          {{ loadingMore ? 'Carregando...' : 'Carregar mais comentarios' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.highlight-pulse {
  animation: pulse-highlight 2s ease-in-out;
}

@keyframes pulse-highlight {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
  }
}
</style>
