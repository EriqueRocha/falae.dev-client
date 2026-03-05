<script setup lang="ts">
import { markdownToHtml } from '~/utils/markdownToHtml'
import { formatDate } from '~/utils/formatDate'
import { useMermaidRender } from '~/composables/useMermaidRender'
import { useSyntaxHighlight } from '~/composables/useSyntaxHighlight'

const route = useRoute()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { user } = useAuth()
const { renderMermaidInContainer } = useMermaidRender()
const { highlightCodeInContainer } = useSyntaxHighlight()

const topicContentRef = ref<HTMLElement | null>(null)

interface Topic {
  id: string
  authorId: string
  authorName: string
  authorUserName: string
  authorProfileImage: string | null
  creationDate: string
  title: string
  topicContent: string
  tags: string[]
  likesCount: number
  dislikesCount: number
  commentsCount: number
  isLiked: boolean
  isDisliked: boolean
}

const topic = ref<Topic | null>(null)
const loading = ref(true)
const error = ref('')
const isLiked = ref(false)
const isDisliked = ref(false)
const likesCount = ref(0)
const dislikesCount = ref(0)
const commentsCount = ref(0)

const userName = computed(() => route.params.userName as string)
const slug = computed(() => route.params.slug as string)
const highlightCommentId = computed(() => route.query.commentId as string | undefined)

const fetchTopic = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await $fetch<Topic>(`${apiBase}/api/topic/${userName.value}/${slug.value}`, {
      credentials: 'include'
    })

    topic.value = data
    isLiked.value = data.isLiked
    isDisliked.value = data.isDisliked
    likesCount.value = data.likesCount
    dislikesCount.value = data.dislikesCount
    commentsCount.value = data.commentsCount
  } catch (e: any) {
    if (e?.statusCode === 404) {
      error.value = 'Topico nao encontrado'
    } else {
      error.value = 'Erro ao carregar topico'
    }
  } finally {
    loading.value = false
  }
}

const toggleLike = async () => {
  if (!topic.value) return

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
      `${apiBase}/api/topic/${topic.value.id}/like`,
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
  if (!topic.value) return

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
      `${apiBase}/api/topic/${topic.value.id}/dislike`,
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

const isOwner = computed(() => {
  return user.value && topic.value && user.value.userName === topic.value.authorUserName
})

const renderedContent = computed(() => {
  if (!topic.value?.topicContent) return ''
  return markdownToHtml(topic.value.topicContent)
})

onMounted(() => {
  fetchTopic()
})

watch(renderedContent, async () => {
  await nextTick()
  highlightCodeInContainer(topicContentRef.value)
  renderMermaidInContainer(topicContentRef.value)
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-0 sm:px-6 py-0 sm:py-8">
    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <div v-else-if="error" class="text-center py-20 px-4">
      <p class="text-red-500 text-lg mb-4">{{ error }}</p>
      <NuxtLink to="/" class="text-blue-400 hover:text-blue-300">
        Voltar para o inicio
      </NuxtLink>
    </div>

    <article v-else-if="topic" class="bg-slate-900 sm:rounded-xl overflow-hidden sm:border border-slate-800">
      <div class="p-4 sm:p-6 md:p-8">
        <header class="mb-8">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-6">
            {{ topic.title }}
          </h1>

          <div class="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <NuxtLink
              :to="`/autor/${topic.authorUserName}`"
              class="flex items-center gap-2 hover:text-blue-400 transition-colors"
            >
              <img
                v-if="topic.authorProfileImage"
                :src="topic.authorProfileImage"
                :alt="topic.authorName"
                class="w-10 h-10 rounded-full object-cover"
              />
              <div
                v-else
                class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold"
              >
                {{ topic.authorName.charAt(0).toUpperCase() }}
              </div>
              <span class="font-medium text-white">{{ topic.authorName }}</span>
            </NuxtLink>

            <span class="text-slate-600">|</span>

            <time :datetime="topic.creationDate">
              {{ formatDate(topic.creationDate) }}
            </time>
          </div>

          <div v-if="topic.tags && topic.tags.length > 0" class="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            <NuxtLink
              v-for="tag in topic.tags"
              :key="tag"
              :to="`/busca?q=__TAG__${tag}`"
              class="px-2 py-0.5 sm:px-3 sm:py-1 bg-purple-600/20 text-purple-400 rounded-full text-xs sm:text-sm hover:bg-purple-600/30 transition-colors"
            >
              #{{ tag }}
            </NuxtLink>
          </div>
        </header>

        <div class="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-slate-800">
          <button
            @click="toggleLike"
            class="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm sm:text-base"
            :class="isLiked
              ? 'bg-green-600/20 text-green-400'
              : 'bg-slate-800 text-slate-400 hover:text-green-400'"
          >
            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            {{ likesCount }}
          </button>

          <button
            @click="toggleDislike"
            class="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm sm:text-base"
            :class="isDisliked
              ? 'bg-red-600/20 text-red-400'
              : 'bg-slate-800 text-slate-400 hover:text-red-400'"
          >
            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
            {{ dislikesCount }}
          </button>

          <NuxtLink
            v-if="isOwner"
            :to="`/topico/editar/${topic.id}`"
            class="sm:ml-auto flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors text-sm sm:text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </NuxtLink>
        </div>

        <div
          ref="topicContentRef"
          class="prose prose-invert prose-lg max-w-none topic-content"
          v-html="renderedContent"
        />

        <TopicComments :topic-id="topic.id" :highlight-comment-id="highlightCommentId" :initial-comments-count="commentsCount" />
      </div>
    </article>
  </div>
</template>

<style scoped>
.topic-content :deep(h1) {
  @apply text-2xl font-bold text-white mt-8 mb-4;
}

.topic-content :deep(h2) {
  @apply text-xl font-semibold text-white mt-6 mb-3;
}

.topic-content :deep(h3) {
  @apply text-lg font-semibold text-white mt-5 mb-2;
}

.topic-content :deep(h4) {
  @apply text-base font-semibold text-white mt-4 mb-2;
}

.topic-content :deep(h5) {
  @apply text-sm font-semibold text-white mt-4 mb-2;
}

.topic-content :deep(h6) {
  @apply text-sm font-medium text-slate-200 mt-4 mb-2;
}

.topic-content :deep(p) {
  @apply text-slate-300 leading-relaxed mb-4;
}

.topic-content :deep(a) {
  @apply text-blue-400 hover:text-blue-300 underline;
}

.topic-content :deep(ul),
.topic-content :deep(ol) {
  @apply text-slate-300 mb-4 pl-6;
}

.topic-content :deep(ul) {
  @apply list-disc;
}

.topic-content :deep(ol) {
  @apply list-decimal;
}

.topic-content :deep(li) {
  @apply mb-2;
}

/* Task List / Checklist - TipTap format */
.topic-content :deep(ul[data-type="taskList"]) {
  @apply list-none pl-0;
}

.topic-content :deep(li[data-type="taskItem"]) {
  @apply flex items-start gap-2 mb-2;
}

.topic-content :deep(li[data-type="taskItem"]) > label {
  @apply flex items-center gap-2 cursor-pointer;
}

.topic-content :deep(li[data-type="taskItem"]) input[type="checkbox"] {
  @apply w-4 h-4 mt-1 rounded border-slate-600 bg-slate-800 text-blue-500 cursor-pointer;
  accent-color: #3b82f6;
}

.topic-content :deep(li[data-type="taskItem"][data-checked="true"]) > div {
  @apply text-slate-500 line-through;
}

/* Task List / Checklist - GFM format (li with checkbox) */
.topic-content :deep(li:has(> input[type="checkbox"])) {
  @apply list-none flex items-start gap-2;
}

.topic-content :deep(li > input[type="checkbox"]) {
  @apply w-4 h-4 mt-1 rounded border-slate-600 bg-slate-800 flex-shrink-0;
  accent-color: #3b82f6;
}

.topic-content :deep(ul:has(> li > input[type="checkbox"])) {
  @apply list-none pl-2;
}

.topic-content :deep(blockquote) {
  @apply border-l-4 border-blue-500 pl-4 italic text-slate-400 my-4 bg-slate-800/50 py-2 rounded-r;
}

.topic-content :deep(code) {
  @apply bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono;
}

.topic-content :deep(pre) {
  @apply bg-slate-950 p-4 rounded-lg overflow-x-auto my-4;
}

.topic-content :deep(pre code) {
  @apply bg-transparent p-0;
}

.topic-content :deep(img) {
  @apply rounded-lg my-4 max-w-full h-auto;
}

/* Video embeds (iframe, video, embed, object) */
.topic-content :deep(iframe),
.topic-content :deep(video),
.topic-content :deep(embed),
.topic-content :deep(object) {
  @apply my-4 rounded-lg;
  max-width: 100%;
  height: auto;
}

.topic-content :deep(iframe) {
  aspect-ratio: 16 / 9;
}

.topic-content :deep(table) {
  @apply border-collapse my-4;
  display: block;
  overflow-x: auto;
}

.topic-content :deep(th),
.topic-content :deep(td) {
  @apply border border-slate-700 px-4 py-2 text-left text-slate-300;
  min-width: 120px;
  max-width: 300px;
  white-space: normal;
  word-wrap: break-word;
}

.topic-content :deep(th) {
  @apply bg-slate-800 font-semibold text-white;
}

.topic-content :deep(td) {
  @apply bg-slate-900/50;
}

.topic-content :deep(hr) {
  @apply border-slate-700 my-8;
}

.topic-content :deep(mark) {
  @apply bg-yellow-500/30 text-yellow-200 px-1 rounded;
}

/* LaTeX / KaTeX */
.topic-content :deep(.katex) {
  font-size: 1.1em;
  color: white;
}

.topic-content :deep(.katex-display) {
  @apply my-4 overflow-x-auto;
}

.topic-content :deep(.latex-error) {
  @apply text-red-400 bg-red-900/30 px-2 py-1 rounded font-mono text-sm;
}

.topic-content :deep(.latex-node) {
  display: inline;
}

/* Mermaid Diagrams */
.topic-content :deep(.mermaid-diagram),
.topic-content :deep(.mermaid-node),
.topic-content :deep([data-type="mermaid"]) {
  @apply my-6 p-4 bg-slate-800/50 rounded-lg overflow-x-auto;
  display: flex;
  justify-content: center;
}

.topic-content :deep(.mermaid-rendered) {
  @apply bg-slate-800/50;
}

.topic-content :deep(.mermaid-diagram svg),
.topic-content :deep(.mermaid-node svg),
.topic-content :deep([data-type="mermaid"] svg) {
  max-width: 100%;
  height: auto;
}

.topic-content :deep(.mermaid-error-container) {
  @apply bg-red-900/20 border border-red-500/30;
}

.topic-content :deep(.mermaid-error) {
  @apply text-center;
}

.topic-content :deep(.mermaid-error-title) {
  @apply text-red-400 font-medium block mb-2;
}

.topic-content :deep(.mermaid-error-code) {
  @apply text-slate-400 text-sm font-mono bg-slate-900/50 p-2 rounded text-left overflow-x-auto;
}

/* Syntax Highlighting (lowlight/highlight.js) */
.topic-content :deep(.hljs-comment),
.topic-content :deep(.hljs-quote) {
  color: #6a737d;
  font-style: italic;
}

.topic-content :deep(.hljs-keyword),
.topic-content :deep(.hljs-selector-tag) {
  color: #ff7b72;
}

.topic-content :deep(.hljs-string),
.topic-content :deep(.hljs-addition) {
  color: #a5d6ff;
}

.topic-content :deep(.hljs-number),
.topic-content :deep(.hljs-literal) {
  color: #79c0ff;
}

.topic-content :deep(.hljs-built_in),
.topic-content :deep(.hljs-builtin-name) {
  color: #ffa657;
}

.topic-content :deep(.hljs-type),
.topic-content :deep(.hljs-params) {
  color: #ffa657;
}

.topic-content :deep(.hljs-meta),
.topic-content :deep(.hljs-meta .hljs-keyword) {
  color: #79c0ff;
}

.topic-content :deep(.hljs-function),
.topic-content :deep(.hljs-title) {
  color: #d2a8ff;
}

.topic-content :deep(.hljs-attr),
.topic-content :deep(.hljs-attribute) {
  color: #79c0ff;
}

.topic-content :deep(.hljs-variable),
.topic-content :deep(.hljs-template-variable) {
  color: #ffa657;
}

.topic-content :deep(.hljs-regexp),
.topic-content :deep(.hljs-link) {
  color: #a5d6ff;
}

.topic-content :deep(.hljs-symbol),
.topic-content :deep(.hljs-bullet) {
  color: #7ee787;
}

.topic-content :deep(.hljs-section) {
  color: #d2a8ff;
  font-weight: bold;
}

.topic-content :deep(.hljs-name),
.topic-content :deep(.hljs-selector-id),
.topic-content :deep(.hljs-selector-class) {
  color: #7ee787;
}

.topic-content :deep(.hljs-deletion) {
  color: #ffa198;
  background-color: rgba(255, 129, 130, 0.15);
}

.topic-content :deep(.hljs-addition) {
  background-color: rgba(63, 185, 80, 0.15);
}

.topic-content :deep(.hljs-emphasis) {
  font-style: italic;
}

.topic-content :deep(.hljs-strong) {
  font-weight: bold;
}
</style>
