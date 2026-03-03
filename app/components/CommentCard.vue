<script setup lang="ts">
import { formatDate } from '~/utils/formatDate'
import { markdownToHtml } from '~/utils/markdownToHtml'
import { useMermaidLazy } from '~/composables/useMermaidLazy'

const { renderMermaidDiagrams } = useMermaidLazy()

interface Comment {
  id: string
  content: string
  author: {
    name: string
    userName?: string
    avatar?: string
  }
  date: string
  likes?: number
  dislikes?: number
  parentType?: 'ARTICLE' | 'TOPIC' | null
  parentTitle?: string | null
  isLiked?: boolean
  isDisliked?: boolean
  tags?: string[] | null
}

const props = defineProps<{
  comment: Comment
}>()

const contentRef = ref<HTMLElement | null>(null)

const renderedContent = computed(() => {
  if (!props.comment.content) return ''
  return markdownToHtml(props.comment.content)
})

const hasRichContent = computed(() => {
  return renderedContent.value.includes('mermaid-diagram') || renderedContent.value.includes('<img')
})

const hasMermaid = computed(() => {
  return renderedContent.value.includes('mermaid-diagram')
})

onMounted(() => {
  if (hasMermaid.value) {
    nextTick(() => renderMermaidDiagrams(contentRef.value))
  }
})
</script>

<template>
  <article class="bg-slate-800 rounded-lg p-3 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer max-h-[450px] overflow-hidden">
    <div v-if="comment.parentType && comment.parentTitle" class="mb-2 pb-2 border-b border-slate-700">
      <p class="text-xs text-slate-500 flex items-center gap-1">
        <svg v-if="comment.parentType === 'ARTICLE'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span class="text-slate-400 truncate">{{ comment.parentTitle }}</span>
      </p>
    </div>

    <div class="flex items-start gap-3">
      <NuxtLink
        v-if="comment.author.userName"
        :to="`/autor/${comment.author.userName}`"
        class="flex-shrink-0"
        @click.stop
      >
        <img
          v-if="comment.author.avatar"
          :src="comment.author.avatar"
          :alt="comment.author.name"
          class="w-8 h-8 rounded-full object-cover"
        />
        <div
          v-else
          class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors"
        >
          <span class="text-slate-400 text-sm font-medium">
            {{ comment.author.name.charAt(0).toUpperCase() }}
          </span>
        </div>
      </NuxtLink>
      <template v-else>
        <img
          v-if="comment.author.avatar"
          :src="comment.author.avatar"
          :alt="comment.author.name"
          class="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        <div
          v-else
          class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"
        >
          <span class="text-slate-400 text-sm font-medium">
            {{ comment.author.name.charAt(0).toUpperCase() }}
          </span>
        </div>
      </template>

      <div class="flex-1 min-w-0 flex flex-col">
        <div class="flex items-center gap-2 text-sm mb-1 flex-shrink-0">
          <NuxtLink
            v-if="comment.author.userName"
            :to="`/autor/${comment.author.userName}`"
            class="text-white font-medium hover:text-blue-400 transition-colors"
            @click.stop
          >
            {{ comment.author.name }}
          </NuxtLink>
          <span v-else class="text-white font-medium">{{ comment.author.name }}</span>
          <span class="text-slate-500">{{ formatDate(comment.date) }}</span>
        </div>

        <div v-if="comment.tags && comment.tags.length > 0" class="flex flex-wrap gap-1.5 mb-2 flex-shrink-0">
          <span
            v-for="tag in comment.tags"
            :key="tag"
            class="text-xs text-blue-400"
          >
            #{{ tag }}
          </span>
        </div>

        <div
          ref="contentRef"
          class="comment-card-content text-slate-300 text-sm mb-2 flex-1 overflow-hidden max-h-[280px]"
          :class="{ 'line-clamp-3': !hasRichContent }"
          v-html="renderedContent"
        />

        <div class="flex items-center gap-3 text-sm flex-shrink-0">
          <span
            class="flex items-center gap-1 transition-colors"
            :class="comment.isLiked ? 'text-green-400' : 'text-slate-500'"
          >
            <svg class="w-3.5 h-3.5" :fill="comment.isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            {{ comment.likes || 0 }}
          </span>
          <span
            class="flex items-center gap-1 transition-colors"
            :class="comment.isDisliked ? 'text-red-400' : 'text-slate-500'"
          >
            <svg class="w-3.5 h-3.5" :fill="comment.isDisliked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
            {{ comment.dislikes || 0 }}
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* Markdown content styles for comment card preview */
.comment-card-content {
  overflow: hidden;
  word-break: break-word;
}

.comment-card-content :deep(p) {
  margin: 0;
  display: inline;
}

.comment-card-content :deep(a) {
  color: rgb(147 197 253);
  text-decoration: underline;
}

.comment-card-content :deep(strong) {
  font-weight: 600;
}

.comment-card-content :deep(code) {
  background-color: rgb(51 65 85);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

.comment-card-content :deep(pre) {
  background-color: rgb(15 23 42);
  padding: 0.5rem;
  border-radius: 0.25rem;
  overflow: hidden;
  margin: 0.25rem 0;
  font-size: 0.75rem;
  max-width: 100%;
  white-space: pre-wrap;
  border: 1px solid rgb(51 65 85);
}

.comment-card-content :deep(pre code) {
  background: none;
  padding: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.comment-card-content :deep(blockquote) {
  border-left: 2px solid rgb(59 130 246);
  padding-left: 0.5rem;
  color: rgb(148 163 184);
  margin: 0.25rem 0;
  display: inline;
}

.comment-card-content :deep(ul),
.comment-card-content :deep(ol) {
  padding-left: 1rem;
  margin: 0.25rem 0;
}

.comment-card-content :deep(img) {
  max-width: 100%;
  max-height: 200px;
  border-radius: 0.375rem;
  margin: 0.25rem 0;
  object-fit: cover;
}

.comment-card-content :deep(a > img) {
  transition: opacity 0.15s;
}

.comment-card-content :deep(a > img:hover) {
  opacity: 0.8;
}

.comment-card-content :deep(.mermaid-diagram) {
  background-color: rgb(15 23 42);
  border-radius: 0.375rem;
  padding: 0.5rem;
  margin: 0.25rem 0;
  overflow: hidden;
  font-family: ui-monospace, monospace;
  font-size: 0.7rem;
  color: rgb(148 163 184);
  white-space: pre-wrap;
  max-height: 200px;
}

.comment-card-content :deep(.mermaid-diagram.mermaid-rendered) {
  background-color: rgb(15 23 42);
  padding: 0.5rem;
  text-align: center;
  font-family: inherit;
  white-space: normal;
  color: inherit;
  max-height: none;
}

.comment-card-content :deep(.mermaid-diagram.mermaid-rendered svg) {
  max-width: 100%;
  max-height: 300px;
  height: auto;
}

.comment-card-content :deep(.mermaid-diagram.mermaid-error) {
  border: 1px solid rgb(239 68 68 / 0.5);
}

.comment-card-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.75rem;
  table-layout: fixed;
}

.comment-card-content :deep(th),
.comment-card-content :deep(td) {
  border: 1px solid rgb(71 85 105);
  padding: 0.25rem 0.375rem;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-card-content :deep(th) {
  background-color: rgb(51 65 85);
  font-weight: 600;
}

.comment-card-content :deep(h1),
.comment-card-content :deep(h2),
.comment-card-content :deep(h3),
.comment-card-content :deep(h4),
.comment-card-content :deep(h5),
.comment-card-content :deep(h6) {
  font-size: inherit;
  font-weight: 600;
  margin: 0;
  display: inline;
}

.comment-card-content :deep(hr) {
  display: none;
}

/* Syntax Highlighting */
.comment-card-content :deep(.hljs-comment),
.comment-card-content :deep(.hljs-quote) {
  color: rgb(100 116 139);
}

.comment-card-content :deep(.hljs-keyword),
.comment-card-content :deep(.hljs-selector-tag) {
  color: rgb(249 115 22);
}

.comment-card-content :deep(.hljs-string),
.comment-card-content :deep(.hljs-addition) {
  color: rgb(74 222 128);
}

.comment-card-content :deep(.hljs-number),
.comment-card-content :deep(.hljs-literal) {
  color: rgb(251 146 60);
}

.comment-card-content :deep(.hljs-built_in),
.comment-card-content :deep(.hljs-builtin-name) {
  color: rgb(56 189 248);
}

.comment-card-content :deep(.hljs-type),
.comment-card-content :deep(.hljs-params) {
  color: rgb(251 191 36);
}

.comment-card-content :deep(.hljs-meta) {
  color: rgb(167 139 250);
}

.comment-card-content :deep(.hljs-function),
.comment-card-content :deep(.hljs-title) {
  color: rgb(96 165 250);
}

.comment-card-content :deep(.hljs-attr),
.comment-card-content :deep(.hljs-attribute) {
  color: rgb(34 211 238);
}

.comment-card-content :deep(.hljs-variable),
.comment-card-content :deep(.hljs-template-variable) {
  color: rgb(244 114 182);
}

.comment-card-content :deep(.hljs-regexp),
.comment-card-content :deep(.hljs-link) {
  color: rgb(248 113 113);
}

.comment-card-content :deep(.hljs-symbol),
.comment-card-content :deep(.hljs-bullet) {
  color: rgb(192 132 252);
}

.comment-card-content :deep(.hljs-name),
.comment-card-content :deep(.hljs-selector-id),
.comment-card-content :deep(.hljs-selector-class) {
  color: rgb(34 211 238);
}
</style>
