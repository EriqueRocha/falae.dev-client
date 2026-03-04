<script setup lang="ts">
import { useThreadNavigation, type Comment } from '~/composables/useThreadNavigation'
import { markdownToHtml } from '~/utils/markdownToHtml'
import { useMermaidLazy } from '~/composables/useMermaidLazy'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { isAuthenticated } = useAuth()

const props = defineProps<{
  comment: Comment
  articleId?: string
  topicId?: string
  highlightPath?: string[]
  highlightCommentId?: string
  ancestorChain?: Comment[]
}>()

const { pushThread, currentDepthOffset } = useThreadNavigation()

const { renderMermaidDiagrams } = useMermaidLazy()
const contentRef = ref<HTMLElement | null>(null)

const emit = defineEmits<{
  'reply-added': []
}>()

const isLiked = ref(props.comment.isLiked)
const isDisliked = ref(props.comment.isDisliked)
const likesCount = ref(props.comment.likes)
const dislikesCount = ref(props.comment.dislikes)
const showReplyForm = ref(false)
const replyContent = ref('')
const replyTags = ref<string[]>([])
const showReplyTagInput = ref(false)
const sendingReply = ref(false)
const showReplies = ref(false)
const replies = ref<Comment[]>([])
const loadingReplies = ref(false)
const replyCount = ref(props.comment.replyCount)

const renderedContent = computed(() => {
  if (!props.comment.content) return ''
  return markdownToHtml(props.comment.content)
})

const isHighlightedTarget = computed(() => props.comment.id === props.highlightCommentId)

const isInHighlightPath = computed(() => props.highlightPath?.includes(props.comment.id) ?? false)

const childHighlightPath = computed(() => {
  if (!props.highlightPath) return undefined
  const currentIndex = props.highlightPath.indexOf(props.comment.id)
  if (currentIndex === -1 || currentIndex === props.highlightPath.length - 1) return undefined
  return props.highlightPath.slice(currentIndex + 1)
})

const shouldAutoExpand = computed(() => {
  if (!props.highlightPath) return false
  const currentIndex = props.highlightPath.indexOf(props.comment.id)
  return currentIndex !== -1 && currentIndex < props.highlightPath.length - 1
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  })
}

const toggleLike = async () => {
  if (!isAuthenticated.value) return

  const prevIsLiked = isLiked.value
  const prevIsDisliked = isDisliked.value
  const prevLikesCount = likesCount.value
  const prevDislikesCount = dislikesCount.value

  const newIsLiked = !isLiked.value
  isLiked.value = newIsLiked
  likesCount.value += newIsLiked ? 1 : -1
  if (newIsLiked && isDisliked.value) {
    isDisliked.value = false
    dislikesCount.value--
  }

  try {
    const response = await $fetch<{ isActive: boolean; message: string }>(
      `${apiBase}/api/comment/${props.comment.id}/like`,
      {
        method: 'POST',
        credentials: 'include'
      }
    )

    if (response.isActive !== isLiked.value) {
      isLiked.value = response.isActive
    }
  } catch (e) {
    isLiked.value = prevIsLiked
    isDisliked.value = prevIsDisliked
    likesCount.value = prevLikesCount
    dislikesCount.value = prevDislikesCount
    console.error('Erro ao curtir:', e)
  }
}

const toggleDislike = async () => {
  if (!isAuthenticated.value) return

  const prevIsLiked = isLiked.value
  const prevIsDisliked = isDisliked.value
  const prevLikesCount = likesCount.value
  const prevDislikesCount = dislikesCount.value

  const newIsDisliked = !isDisliked.value
  isDisliked.value = newIsDisliked
  dislikesCount.value += newIsDisliked ? 1 : -1
  if (newIsDisliked && isLiked.value) {
    isLiked.value = false
    likesCount.value--
  }

  try {
    const response = await $fetch<{ isActive: boolean; message: string }>(
      `${apiBase}/api/comment/${props.comment.id}/dislike`,
      {
        method: 'POST',
        credentials: 'include'
      }
    )

    if (response.isActive !== isDisliked.value) {
      isDisliked.value = response.isActive
    }
  } catch (e) {
    isLiked.value = prevIsLiked
    isDisliked.value = prevIsDisliked
    likesCount.value = prevLikesCount
    dislikesCount.value = prevDislikesCount
    console.error('Erro ao descurtir:', e)
  }
}

const loadReplies = async () => {
  if (loadingReplies.value) return

  loadingReplies.value = true
  try {
    const data = await $fetch<Comment[]>(
      `${apiBase}/api/comment/${props.comment.id}/replies`,
      { credentials: 'include' }
    )
    replies.value = data
    showReplies.value = true
  } catch (e) {
    console.error('Erro ao carregar respostas:', e)
  } finally {
    loadingReplies.value = false
  }
}

const toggleReplies = () => {
  if (showReplies.value) {
    showReplies.value = false
  } else {
    loadReplies()
  }
}

const submitReply = async () => {
  if (!replyContent.value.trim() || sendingReply.value) return

  sendingReply.value = true
  try {
    await $fetch(`${apiBase}/api/comment/save`, {
      method: 'POST',
      body: {
        message: replyContent.value,
        articleId: props.articleId || null,
        topicId: props.topicId || null,
        parentId: props.comment.id,
        tags: replyTags.value.length > 0 ? replyTags.value : null
      },
      credentials: 'include'
    })

    replyContent.value = ''
    replyTags.value = []
    showReplyTagInput.value = false
    showReplyForm.value = false
    replyCount.value++

    await loadReplies()

    emit('reply-added')
  } catch (e) {
    console.error('Erro ao enviar resposta:', e)
  } finally {
    sendingReply.value = false
  }
}

const isMobile = ref(false)

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 640
}

onMounted(() => {
  updateIsMobile()
  window.addEventListener('resize', updateIsMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile)
})

const maxDepth = computed(() => isMobile.value ? 2 : 4)
const maxVisualDepthMobile = 2

const displayDepth = computed(() => {
  return Math.max(0, props.comment.depth - currentDepthOffset.value)
})

const visualDepthMobile = computed(() => {
  return Math.min(displayDepth.value, maxVisualDepthMobile)
})

const canReply = true

const canContinueThread = computed(() => {
  return displayDepth.value >= maxDepth.value && replyCount.value > 0
})

const currentAncestorChain = computed(() => {
  const chain = props.ancestorChain ? [...props.ancestorChain] : []
  chain.push(props.comment)
  return chain
})

const handleContinueThread = () => {
  pushThread(props.comment, props.ancestorChain || [])
}

const tryAutoExpand = async () => {
  if (shouldAutoExpand.value && replyCount.value > 0 && !showReplies.value) {
    await loadReplies()
  }
}

onMounted(() => {
  tryAutoExpand()
  nextTick(() => renderMermaidDiagrams(contentRef.value))
})

watch(() => props.highlightPath, (newPath) => {
  if (newPath && newPath.length > 0) {
    tryAutoExpand()
  }
}, { immediate: false })
</script>

<template>
  <div
    :id="`comment-${comment.id}`"
    class="comment-item transition-all duration-300"
    :class="[
      displayDepth > 0 ? 'border-l-2 border-slate-700 comment-indent' : '',
      isHighlightedTarget ? 'bg-blue-500/10 p-2 sm:p-3 -mx-2 sm:-mx-3 ring-1 ring-blue-500/30' : ''
    ]"
    :style="displayDepth > 0 ? { '--depth': displayDepth, '--depth-mobile': visualDepthMobile } : undefined"
  >
    <div class="flex gap-2 sm:gap-3">
      <template v-if="!comment.deleted">
        <NuxtLink
          v-if="comment.authorUserName"
          :to="`/autor/${comment.authorUserName}`"
          class="flex-shrink-0"
        >
          <img
            v-if="comment.authorProfileImage"
            :src="comment.authorProfileImage"
            :alt="comment.authorName"
            class="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
          />
          <div
            v-else
            class="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold"
          >
            {{ comment.authorName?.charAt(0).toUpperCase() }}
          </div>
        </NuxtLink>
        <div v-else class="flex-shrink-0">
          <img
            v-if="comment.authorProfileImage"
            :src="comment.authorProfileImage"
            :alt="comment.authorName"
            class="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
          />
          <div
            v-else
            class="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold"
          >
            {{ comment.authorName?.charAt(0).toUpperCase() }}
          </div>
        </div>
      </template>
      <div v-else class="flex-shrink-0">
        <div class="w-6 h-6 sm:w-8 sm:h-8 bg-slate-700 rounded-full flex items-center justify-center text-slate-500 text-xs sm:text-sm">
          <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <template v-if="!comment.deleted">
            <NuxtLink
              v-if="comment.authorUserName"
              :to="`/autor/${comment.authorUserName}`"
              class="font-medium text-white hover:text-blue-400 transition-colors text-sm"
            >
              {{ comment.authorName }}
            </NuxtLink>
            <span v-else class="font-medium text-white text-sm">
              {{ comment.authorName }}
            </span>
          </template>
          <span v-else class="font-medium text-slate-500 text-sm italic">
            [Removido]
          </span>
          <span class="text-slate-500 text-xs">{{ formatDate(comment.createdAt) }}</span>
        </div>

        <div
          v-if="!comment.deleted"
          ref="contentRef"
          class="comment-content text-slate-300 text-sm mb-2"
          v-html="renderedContent"
        />
        <p v-else class="text-slate-500 text-sm italic mb-2">
          [Comentário deletado]
        </p>

        <div v-if="comment.tags && comment.tags.length > 0" class="flex flex-wrap gap-1.5 mb-2">
          <span
            v-for="tag in comment.tags"
            :key="tag"
            class="text-xs text-blue-400"
          >
            #{{ tag }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
          <button
            @click="toggleLike"
            class="flex items-center gap-1 transition-colors"
            :class="isLiked ? 'text-green-400' : 'text-slate-500 hover:text-green-400'"
            :disabled="!isAuthenticated"
          >
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            {{ likesCount }}
          </button>

          <button
            @click="toggleDislike"
            class="flex items-center gap-1 transition-colors"
            :class="isDisliked ? 'text-red-400' : 'text-slate-500 hover:text-red-400'"
            :disabled="!isAuthenticated"
          >
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
            {{ dislikesCount }}
          </button>

          <button
            v-if="canReply && isAuthenticated && !comment.deleted"
            @click="showReplyForm = !showReplyForm"
            class="text-slate-500 hover:text-blue-400 transition-colors"
          >
            Responder
          </button>

          <button
            v-if="replyCount > 0 && !canContinueThread"
            @click="toggleReplies"
            class="text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            <svg
              class="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform"
              :class="{ 'rotate-180': showReplies }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            <span class="hidden sm:inline">{{ replyCount }} {{ replyCount === 1 ? 'resposta' : 'respostas' }}</span>
            <span class="sm:hidden">{{ replyCount }}</span>
          </button>

          <button
            v-if="canContinueThread"
            @click="handleContinueThread"
            class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span class="hidden sm:inline">Continuar thread ({{ replyCount }})</span>
            <span class="sm:hidden">+{{ replyCount }}</span>
          </button>
        </div>

        <div v-if="showReplyForm" class="mt-2 sm:mt-3">
          <MarkdownEditor
            v-model="replyContent"
            placeholder="Escreva sua resposta em Markdown..."
            :rows="3"
          />

          <div class="mt-1.5 sm:mt-2">
            <button
              v-if="!showReplyTagInput"
              @click="showReplyTagInput = true"
              class="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1 transition-colors"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span class="hidden sm:inline">Adicionar tags para encontrarem seu comentário</span>
              <span class="sm:hidden">Adicionar tags</span>
            </button>

            <div v-else class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-500">Tags</span>
                <button
                  @click="showReplyTagInput = false; replyTags = []"
                  class="text-xs text-slate-600 hover:text-slate-500"
                >
                  Remover
                </button>
              </div>
              <TagInput v-model="replyTags" placeholder="java, vue..." :max-tags="3" />
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-2">
            <button
              @click="showReplyForm = false; replyTags = []; showReplyTagInput = false"
              class="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              @click="submitReply"
              :disabled="!replyContent.trim() || sendingReply"
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm rounded-lg transition-colors"
            >
              {{ sendingReply ? 'Enviando...' : 'Responder' }}
            </button>
          </div>
        </div>

        <div v-if="loadingReplies" class="mt-3 flex items-center gap-2 text-slate-500 text-sm">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          Carregando respostas...
        </div>

        <div v-if="showReplies && replies.length > 0" class="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          <CommentItem
            v-for="reply in replies"
            :key="reply.id"
            :comment="reply"
            :article-id="articleId"
            :topic-id="topicId"
            :highlight-path="childHighlightPath"
            :highlight-comment-id="highlightCommentId"
            :ancestor-chain="currentAncestorChain"
            @reply-added="loadReplies"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Indentação responsiva para comentários aninhados */
.comment-indent {
  padding-left: calc(var(--depth-mobile, 1) * 0.5rem);
}

@media (min-width: 640px) {
  .comment-indent {
    padding-left: calc(var(--depth, 1) * 1rem);
  }
}

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

/* Estilos para conteúdo Markdown nos comentários */
.comment-content :deep(p) {
  margin: 0.25rem 0;
}

.comment-content :deep(p:first-child) {
  margin-top: 0;
}

.comment-content :deep(p:last-child) {
  margin-bottom: 0;
}

.comment-content :deep(a) {
  color: rgb(147 197 253);
  text-decoration: underline;
}

.comment-content :deep(strong) {
  font-weight: 600;
}

.comment-content :deep(code) {
  background-color: rgb(51 65 85);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-family: ui-monospace, monospace;
}

.comment-content :deep(pre) {
  background-color: rgb(30 41 59);
  padding: 0.75rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  margin: 0.5rem 0;
  border: 1px solid rgb(51 65 85);
}

.comment-content :deep(pre code) {
  background: none;
  padding: 0;
}

.comment-content :deep(blockquote) {
  border-left: 2px solid rgb(59 130 246);
  padding-left: 0.75rem;
  color: rgb(148 163 184);
  margin: 0.5rem 0;
}

.comment-content :deep(ul),
.comment-content :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}

.comment-content :deep(ul) {
  list-style-type: disc;
}

.comment-content :deep(ol) {
  list-style-type: decimal;
}

.comment-content :deep(li) {
  margin: 0.125rem 0;
}

.comment-content :deep(h1),
.comment-content :deep(h2),
.comment-content :deep(h3),
.comment-content :deep(h4),
.comment-content :deep(h5),
.comment-content :deep(h6) {
  font-weight: 600;
  margin: 0.5rem 0 0.25rem;
}

.comment-content :deep(h1) { font-size: 1.125rem; }
.comment-content :deep(h2) { font-size: 1rem; }
.comment-content :deep(h3) { font-size: 0.9375rem; }

.comment-content :deep(hr) {
  border: none;
  border-top: 1px solid rgb(71 85 105);
  margin: 0.5rem 0;
}

.comment-content :deep(img) {
  max-width: 100%;
  border-radius: 0.375rem;
  margin: 0.5rem 0;
}

.comment-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
  font-size: 0.8125rem;
}

.comment-content :deep(th),
.comment-content :deep(td) {
  border: 1px solid rgb(71 85 105);
  padding: 0.375rem 0.5rem;
  text-align: left;
}

.comment-content :deep(th) {
  background-color: rgb(51 65 85);
  font-weight: 600;
}

.comment-content :deep(.katex) {
  font-size: 0.9em;
}

/* Syntax Highlighting (lowlight/highlight.js) */
.comment-content :deep(.hljs-comment),
.comment-content :deep(.hljs-quote) {
  color: rgb(100 116 139);
  font-style: italic;
}

.comment-content :deep(.hljs-keyword),
.comment-content :deep(.hljs-selector-tag) {
  color: rgb(249 115 22);
}

.comment-content :deep(.hljs-string),
.comment-content :deep(.hljs-addition) {
  color: rgb(74 222 128);
}

.comment-content :deep(.hljs-number),
.comment-content :deep(.hljs-literal) {
  color: rgb(251 146 60);
}

.comment-content :deep(.hljs-built_in),
.comment-content :deep(.hljs-builtin-name) {
  color: rgb(56 189 248);
}

.comment-content :deep(.hljs-type),
.comment-content :deep(.hljs-params) {
  color: rgb(251 191 36);
}

.comment-content :deep(.hljs-meta) {
  color: rgb(167 139 250);
}

.comment-content :deep(.hljs-function),
.comment-content :deep(.hljs-title) {
  color: rgb(96 165 250);
}

.comment-content :deep(.hljs-attr),
.comment-content :deep(.hljs-attribute) {
  color: rgb(34 211 238);
}

.comment-content :deep(.hljs-variable),
.comment-content :deep(.hljs-template-variable) {
  color: rgb(244 114 182);
}

.comment-content :deep(.hljs-regexp),
.comment-content :deep(.hljs-link) {
  color: rgb(248 113 113);
}

.comment-content :deep(.hljs-symbol),
.comment-content :deep(.hljs-bullet) {
  color: rgb(192 132 252);
}

.comment-content :deep(.hljs-section) {
  color: rgb(96 165 250);
  font-weight: 700;
}

.comment-content :deep(.hljs-name),
.comment-content :deep(.hljs-selector-id),
.comment-content :deep(.hljs-selector-class) {
  color: rgb(34 211 238);
}

.comment-content :deep(.hljs-deletion) {
  color: rgb(248 113 113);
  background-color: rgb(127 29 29 / 0.3);
}

.comment-content :deep(.hljs-addition) {
  background-color: rgb(20 83 45 / 0.3);
}

.comment-content :deep(.hljs-emphasis) {
  font-style: italic;
}

.comment-content :deep(.hljs-strong) {
  font-weight: 700;
}

/* Mermaid diagrams */
.comment-content :deep(.mermaid-diagram) {
  background-color: rgb(30 41 59);
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin: 0.5rem 0;
  overflow-x: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  color: rgb(148 163 184);
  white-space: pre-wrap;
}

.comment-content :deep(.mermaid-diagram.mermaid-rendered) {
  background-color: rgb(15 23 42);
  padding: 1rem;
  text-align: center;
  font-family: inherit;
  white-space: normal;
  color: inherit;
}

.comment-content :deep(.mermaid-diagram.mermaid-rendered svg) {
  max-width: 100%;
  height: auto;
}

.comment-content :deep(.mermaid-diagram.mermaid-error) {
  border: 1px solid rgb(239 68 68 / 0.5);
}

.comment-content :deep(.mermaid-error-content) {
  margin: 0;
  background: transparent;
  padding: 0;
}

.comment-content :deep(.mermaid-error-content code) {
  background: transparent;
  padding: 0;
}
</style>
