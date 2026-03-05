<script setup lang="ts">
import { markdownToHtml } from '~/utils/markdownToHtml'
import { renderLatexInHtml } from '~/utils/renderLatexInHtml'
import { formatDate } from '~/utils/formatDate'
import { useMermaidRender } from '~/composables/useMermaidRender'
import { useSyntaxHighlight } from '~/composables/useSyntaxHighlight'

const route = useRoute()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase
const { user } = useAuth()
const { renderMermaidInContainer } = useMermaidRender()
const { highlightCodeInContainer } = useSyntaxHighlight()

const articleContentRef = ref<HTMLElement | null>(null)

interface Article {
  id: string
  authorId: string
  authorName: string
  authorUserName: string
  authorProfileImage: string | null
  creationDate: string
  hasComment: boolean
  isMarkdown: boolean
  title: string
  coverImage: string | null
  originalPost: string | null
  tags: string[]
  description: string
  urlArticleContent: string
  likesCount: number
  dislikesCount: number
  savesCount: number
  commentsCount: number
  isLiked: boolean
  isDisliked: boolean
  isSaved: boolean
}

const article = ref<Article | null>(null)
const articleContent = ref<string>('')
const loading = ref(true)
const error = ref('')
const isLiked = ref(false)
const isDisliked = ref(false)
const isSaved = ref(false)
const likesCount = ref(0)
const dislikesCount = ref(0)
const savesCount = ref(0)
const commentsCount = ref(0)

const userName = computed(() => route.params.userName as string)
const slug = computed(() => route.params.slug as string)
const highlightCommentId = computed(() => route.query.commentId as string | undefined)

const fetchArticle = async () => {
  loading.value = true
  error.value = ''

  try {
    const data = await $fetch<Article>(`${apiBase}/article/${userName.value}/${slug.value}`, {
      credentials: 'include'
    })

    article.value = data
    isLiked.value = data.isLiked
    isDisliked.value = data.isDisliked
    isSaved.value = data.isSaved
    likesCount.value = data.likesCount
    dislikesCount.value = data.dislikesCount
    savesCount.value = data.savesCount
    commentsCount.value = data.commentsCount

    if (data.urlArticleContent) {
      const contentResponse = await fetch(data.urlArticleContent)
      const rawContent = await contentResponse.text()

      if (data.isMarkdown) {
        articleContent.value = markdownToHtml(rawContent)
      } else {
        articleContent.value = renderLatexInHtml(rawContent)
      }
    }
  } catch (e: any) {
    if (e?.statusCode === 404) {
      error.value = 'Artigo nao encontrado'
    } else {
      error.value = 'Erro ao carregar artigo'
    }
  } finally {
    loading.value = false
  }
}

const toggleLike = async () => {
  if (!article.value) return

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
      `${apiBase}/article/${article.value.id}/like`,
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
  if (!article.value) return

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
      `${apiBase}/article/${article.value.id}/dislike`,
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

const toggleSave = async () => {
  if (!article.value) return

  const prevIsSaved = isSaved.value
  const prevSavesCount = savesCount.value

  const newIsSaved = !isSaved.value
  isSaved.value = newIsSaved
  savesCount.value += newIsSaved ? 1 : -1

  try {
    const response = await $fetch<{ isActive: boolean; message: string }>(
      `${apiBase}/article/${article.value.id}/save`,
      {
        method: 'POST',
        credentials: 'include'
      }
    )

    if (response.isActive !== isSaved.value) {
      isSaved.value = response.isActive
    }
  } catch (e) {
    isSaved.value = prevIsSaved
    savesCount.value = prevSavesCount
    console.error('Erro ao salvar:', e)
  }
}

const isOwner = computed(() => {
  return user.value && article.value && user.value.userName === article.value.authorUserName
})

onMounted(() => {
  fetchArticle()
})

watch(articleContent, async () => {
  await nextTick()
  highlightCodeInContainer(articleContentRef.value)
  renderMermaidInContainer(articleContentRef.value)
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

    <article v-else-if="article" class="bg-slate-900 sm:rounded-xl overflow-hidden sm:border border-slate-800">
      <div v-if="article.coverImage" class="w-full h-64 md:h-80">
        <img
          :src="article.coverImage"
          :alt="article.title"
          class="w-full h-full object-cover"
        />
      </div>

      <div class="p-4 sm:p-6 md:p-8">
        <header class="mb-8">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">
            {{ article.title }}
          </h1>

          <p class="text-slate-400 text-lg mb-6">
            {{ article.description }}
          </p>

          <div class="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <NuxtLink
              :to="`/autor/${article.authorUserName}`"
              class="flex items-center gap-2 hover:text-blue-400 transition-colors"
            >
              <img
                v-if="article.authorProfileImage"
                :src="article.authorProfileImage"
                :alt="article.authorName"
                class="w-10 h-10 rounded-full object-cover"
              />
              <div
                v-else
                class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold"
              >
                {{ article.authorName.charAt(0).toUpperCase() }}
              </div>
              <span class="font-medium text-white">{{ article.authorName }}</span>
            </NuxtLink>

            <span class="text-slate-600">|</span>

            <time :datetime="article.creationDate">
              {{ formatDate(article.creationDate) }}
            </time>

            <span v-if="article.originalPost" class="text-slate-600">|</span>

            <a
              v-if="article.originalPost"
              :href="article.originalPost"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Post original
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <div v-if="article.tags && article.tags.length > 0" class="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            <NuxtLink
              v-for="tag in article.tags"
              :key="tag"
              :to="`/busca?tag=${tag}`"
              class="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs sm:text-sm hover:bg-blue-600/30 transition-colors"
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

          <button
            @click="toggleSave"
            class="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm sm:text-base"
            :class="isSaved
              ? 'bg-yellow-600/20 text-yellow-400'
              : 'bg-slate-800 text-slate-400 hover:text-yellow-400'"
          >
            <svg class="w-4 h-4 sm:w-5 sm:h-5" :fill="isSaved ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {{ savesCount }}
          </button>

          <NuxtLink
            v-if="isOwner"
            :to="`/artigo/editar/${article.id}`"
            class="sm:ml-auto flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-colors text-sm sm:text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </NuxtLink>
        </div>

        <div
          ref="articleContentRef"
          class="prose prose-invert prose-lg max-w-none article-content"
          v-html="articleContent"
        />

        <ArticleComments :article-id="article.id" :highlight-comment-id="highlightCommentId" :initial-comments-count="commentsCount" />
      </div>
    </article>
  </div>
</template>

<style scoped>
.article-content :deep(h1) {
  @apply text-2xl font-bold text-white mt-8 mb-4;
}

.article-content :deep(h2) {
  @apply text-xl font-semibold text-white mt-6 mb-3;
}

.article-content :deep(h3) {
  @apply text-lg font-semibold text-white mt-5 mb-2;
}

.article-content :deep(h4) {
  @apply text-base font-semibold text-white mt-4 mb-2;
}

.article-content :deep(h5) {
  @apply text-sm font-semibold text-white mt-4 mb-2;
}

.article-content :deep(h6) {
  @apply text-sm font-medium text-slate-200 mt-4 mb-2;
}

.article-content :deep(p) {
  @apply text-slate-300 leading-relaxed mb-4;
}

.article-content :deep(a) {
  @apply text-blue-400 hover:text-blue-300 underline;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  @apply text-slate-300 mb-4 pl-6;
}

.article-content :deep(ul) {
  @apply list-disc;
}

.article-content :deep(ol) {
  @apply list-decimal;
}

.article-content :deep(li) {
  @apply mb-2;
}

/* Task List / Checklist - TipTap format */
.article-content :deep(ul[data-type="taskList"]) {
  @apply list-none pl-0;
}

.article-content :deep(li[data-type="taskItem"]) {
  @apply flex items-start gap-2 mb-2;
}

.article-content :deep(li[data-type="taskItem"]) > label {
  @apply flex items-center gap-2 cursor-pointer;
}

.article-content :deep(li[data-type="taskItem"]) input[type="checkbox"] {
  @apply w-4 h-4 mt-1 rounded border-slate-600 bg-slate-800 text-blue-500 cursor-pointer;
  accent-color: #3b82f6;
}

.article-content :deep(li[data-type="taskItem"][data-checked="true"]) > div {
  @apply text-slate-500 line-through;
}

/* Task List / Checklist - GFM format (li with checkbox) */
.article-content :deep(li:has(> input[type="checkbox"])) {
  @apply list-none flex items-start gap-2;
}

.article-content :deep(li > input[type="checkbox"]) {
  @apply w-4 h-4 mt-1 rounded border-slate-600 bg-slate-800 flex-shrink-0;
  accent-color: #3b82f6;
}

.article-content :deep(ul:has(> li > input[type="checkbox"])) {
  @apply list-none pl-2;
}

.article-content :deep(blockquote) {
  @apply border-l-4 border-blue-500 pl-4 italic text-slate-400 my-4 bg-slate-800/50 py-2 rounded-r;
}

.article-content :deep(code) {
  @apply bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono;
}

.article-content :deep(pre) {
  @apply bg-slate-950 p-4 rounded-lg overflow-x-auto my-4;
}

.article-content :deep(pre code) {
  @apply bg-transparent p-0;
}

.article-content :deep(img) {
  @apply rounded-lg my-4 max-w-full h-auto;
}

/* Video embeds (iframe, video, embed, object) */
.article-content :deep(iframe),
.article-content :deep(video),
.article-content :deep(embed),
.article-content :deep(object) {
  @apply my-4 rounded-lg;
  max-width: 100%;
  height: auto;
}

.article-content :deep(iframe) {
  aspect-ratio: 16 / 9;
}

.article-content :deep(table) {
  @apply border-collapse my-4;
  display: block;
  overflow-x: auto;
}

.article-content :deep(th),
.article-content :deep(td) {
  @apply border border-slate-700 px-4 py-2 text-left text-slate-300;
  min-width: 120px;
  max-width: 300px;
  white-space: normal;
  word-wrap: break-word;
}

.article-content :deep(th) {
  @apply bg-slate-800 font-semibold text-white;
}

.article-content :deep(td) {
  @apply bg-slate-900/50;
}

.article-content :deep(hr) {
  @apply border-slate-700 my-8;
}

.article-content :deep(mark) {
  @apply bg-yellow-500/30 text-yellow-200 px-1 rounded;
}

/* LaTeX / KaTeX */
.article-content :deep(.katex) {
  font-size: 1.1em;
  color: white;
}

.article-content :deep(.katex-display) {
  @apply my-4 overflow-x-auto;
}

.article-content :deep(.latex-error) {
  @apply text-red-400 bg-red-900/30 px-2 py-1 rounded font-mono text-sm;
}

.article-content :deep(.latex-node) {
  display: inline;
}

/* Mermaid Diagrams */
.article-content :deep(.mermaid-diagram),
.article-content :deep(.mermaid-node),
.article-content :deep([data-type="mermaid"]) {
  @apply my-6 p-4 bg-slate-800/50 rounded-lg overflow-x-auto;
  display: flex;
  justify-content: center;
}

.article-content :deep(.mermaid-rendered) {
  @apply bg-slate-800/50;
}

.article-content :deep(.mermaid-diagram svg),
.article-content :deep(.mermaid-node svg),
.article-content :deep([data-type="mermaid"] svg) {
  max-width: 100%;
  height: auto;
}

.article-content :deep(.mermaid-error-container) {
  @apply bg-red-900/20 border border-red-500/30;
}

.article-content :deep(.mermaid-error) {
  @apply text-center;
}

.article-content :deep(.mermaid-error-title) {
  @apply text-red-400 font-medium block mb-2;
}

.article-content :deep(.mermaid-error-code) {
  @apply text-slate-400 text-sm font-mono bg-slate-900/50 p-2 rounded text-left overflow-x-auto;
}

/* Syntax Highlighting (lowlight/highlight.js) */
.article-content :deep(.hljs-comment),
.article-content :deep(.hljs-quote) {
  color: #6a737d;
  font-style: italic;
}

.article-content :deep(.hljs-keyword),
.article-content :deep(.hljs-selector-tag) {
  color: #ff7b72;
}

.article-content :deep(.hljs-string),
.article-content :deep(.hljs-addition) {
  color: #a5d6ff;
}

.article-content :deep(.hljs-number),
.article-content :deep(.hljs-literal) {
  color: #79c0ff;
}

.article-content :deep(.hljs-built_in),
.article-content :deep(.hljs-builtin-name) {
  color: #ffa657;
}

.article-content :deep(.hljs-type),
.article-content :deep(.hljs-params) {
  color: #ffa657;
}

.article-content :deep(.hljs-meta),
.article-content :deep(.hljs-meta .hljs-keyword) {
  color: #79c0ff;
}

.article-content :deep(.hljs-function),
.article-content :deep(.hljs-title) {
  color: #d2a8ff;
}

.article-content :deep(.hljs-attr),
.article-content :deep(.hljs-attribute) {
  color: #79c0ff;
}

.article-content :deep(.hljs-variable),
.article-content :deep(.hljs-template-variable) {
  color: #ffa657;
}

.article-content :deep(.hljs-regexp),
.article-content :deep(.hljs-link) {
  color: #a5d6ff;
}

.article-content :deep(.hljs-symbol),
.article-content :deep(.hljs-bullet) {
  color: #7ee787;
}

.article-content :deep(.hljs-section) {
  color: #d2a8ff;
  font-weight: bold;
}

.article-content :deep(.hljs-name),
.article-content :deep(.hljs-selector-id),
.article-content :deep(.hljs-selector-class) {
  color: #7ee787;
}

.article-content :deep(.hljs-deletion) {
  color: #ffa198;
  background-color: rgba(255, 129, 130, 0.15);
}

.article-content :deep(.hljs-addition) {
  background-color: rgba(63, 185, 80, 0.15);
}

.article-content :deep(.hljs-emphasis) {
  font-style: italic;
}

.article-content :deep(.hljs-strong) {
  font-weight: bold;
}
</style>
