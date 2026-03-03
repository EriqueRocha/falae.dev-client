<script setup lang="ts">
import { formatDate } from '~/utils/formatDate'
import { markdownToHtml } from '~/utils/markdownToHtml'
import { useMermaidLazy } from '~/composables/useMermaidLazy'

const { renderMermaidDiagrams } = useMermaidLazy()

interface Topic {
  id: string
  title: string
  excerpt: string
  tags: string[]
  author: {
    name: string
    userName?: string
    avatar?: string
  }
  date: string
  likes?: number
  dislikes?: number
  comments?: number
  isLiked?: boolean
  isDisliked?: boolean
}

const props = defineProps<{
  topic: Topic
}>()

const contentRef = ref<HTMLElement | null>(null)

const renderedContent = computed(() => {
  if (!props.topic.excerpt) return ''
  return markdownToHtml(props.topic.excerpt)
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
  <article class="bg-slate-800 rounded-xl p-4 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer max-h-[450px] flex flex-col">
    <h3 class="text-white font-semibold text-base mb-2 line-clamp-2 flex-shrink-0">
      {{ topic.title }}
    </h3>

    <div class="flex flex-wrap gap-2 mb-2 flex-shrink-0">
      <span
        v-for="tag in topic.tags"
        :key="tag"
        class="text-blue-400 text-sm"
      >
        #{{ tag }}
      </span>
    </div>

    <div class="flex items-center gap-2 text-slate-400 text-sm mb-2 flex-shrink-0">
      <NuxtLink
        v-if="topic.author.userName"
        :to="`/autor/${topic.author.userName}`"
        class="flex items-center gap-2 hover:text-blue-400 transition-colors"
        @click.stop
      >
        <img
          v-if="topic.author.avatar"
          :src="topic.author.avatar"
          :alt="topic.author.name"
          class="w-5 h-5 rounded-full object-cover"
        />
        <div
          v-else
          class="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center"
        >
          <span class="text-slate-400 text-xs font-medium">
            {{ topic.author.name.charAt(0).toUpperCase() }}
          </span>
        </div>
        <span>{{ topic.author.name }}</span>
      </NuxtLink>
      <template v-else>
        <img
          v-if="topic.author.avatar"
          :src="topic.author.avatar"
          :alt="topic.author.name"
          class="w-5 h-5 rounded-full object-cover"
        />
        <div
          v-else
          class="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center"
        >
          <span class="text-slate-400 text-xs font-medium">
            {{ topic.author.name.charAt(0).toUpperCase() }}
          </span>
        </div>
        <span>{{ topic.author.name }}</span>
      </template>
      <span>{{ formatDate(topic.date) }}</span>
    </div>

    <div
      ref="contentRef"
      class="topic-card-content text-slate-400 text-sm flex-1 min-h-0 overflow-hidden"
      :class="{ 'line-clamp-3': !hasRichContent }"
      v-html="renderedContent"
    />

    <div class="flex items-center gap-4 text-sm flex-shrink-0 mt-auto pt-2">
      <span
        class="flex items-center gap-1 transition-colors"
        :class="topic.isLiked ? 'text-green-400' : 'text-slate-500'"
      >
        <svg class="w-4 h-4" :fill="topic.isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
        {{ topic.likes || 0 }}
      </span>

      <span
        class="flex items-center gap-1 transition-colors"
        :class="topic.isDisliked ? 'text-red-400' : 'text-slate-500'"
      >
        <svg class="w-4 h-4" :fill="topic.isDisliked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
        </svg>
        {{ topic.dislikes || 0 }}
      </span>

      <span class="flex items-center gap-1 text-slate-500">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {{ topic.comments || 0 }}
      </span>
    </div>
  </article>
</template>

<style scoped>
/* Markdown content styles for topic card preview */
.topic-card-content {
  overflow: hidden;
  word-break: break-word;
}

.topic-card-content :deep(p) {
  margin: 0;
  display: inline;
}

.topic-card-content :deep(a) {
  color: rgb(147 197 253);
  text-decoration: underline;
}

.topic-card-content :deep(strong) {
  font-weight: 600;
}

.topic-card-content :deep(code) {
  background-color: rgb(51 65 85);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

.topic-card-content :deep(pre) {
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

.topic-card-content :deep(pre code) {
  background: none;
  padding: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.topic-card-content :deep(blockquote) {
  border-left: 2px solid rgb(59 130 246);
  padding-left: 0.5rem;
  color: rgb(148 163 184);
  margin: 0.25rem 0;
  display: inline;
}

.topic-card-content :deep(ul),
.topic-card-content :deep(ol) {
  padding-left: 1rem;
  margin: 0.25rem 0;
}

.topic-card-content :deep(img) {
  max-width: 100%;
  max-height: 200px;
  border-radius: 0.375rem;
  margin: 0.25rem 0;
  object-fit: cover;
}

.topic-card-content :deep(a > img) {
  transition: opacity 0.15s;
}

.topic-card-content :deep(a > img:hover) {
  opacity: 0.8;
}

.topic-card-content :deep(.mermaid-diagram) {
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

.topic-card-content :deep(.mermaid-diagram.mermaid-rendered) {
  background-color: rgb(15 23 42);
  padding: 0.5rem;
  text-align: center;
  font-family: inherit;
  white-space: normal;
  color: inherit;
  max-height: none;
}

.topic-card-content :deep(.mermaid-diagram.mermaid-rendered svg) {
  max-width: 100%;
  max-height: 300px;
  height: auto;
}

.topic-card-content :deep(.mermaid-diagram.mermaid-error) {
  border: 1px solid rgb(239 68 68 / 0.5);
}

.topic-card-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.75rem;
  table-layout: fixed;
}

.topic-card-content :deep(th),
.topic-card-content :deep(td) {
  border: 1px solid rgb(71 85 105);
  padding: 0.25rem 0.375rem;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-card-content :deep(th) {
  background-color: rgb(51 65 85);
  font-weight: 600;
}

.topic-card-content :deep(h1) {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0.25rem 0;
  display: block;
  color: rgb(241 245 249);
}

.topic-card-content :deep(h2) {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0.25rem 0;
  display: block;
  color: rgb(241 245 249);
}

.topic-card-content :deep(h3) {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.25rem 0;
  display: block;
  color: rgb(226 232 240);
}

.topic-card-content :deep(h4) {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0.125rem 0;
  display: block;
  color: rgb(226 232 240);
}

.topic-card-content :deep(h5),
.topic-card-content :deep(h6) {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0.125rem 0;
  display: block;
  color: rgb(203 213 225);
}

.topic-card-content :deep(hr) {
  display: none;
}

/* Syntax Highlighting */
.topic-card-content :deep(.hljs-comment),
.topic-card-content :deep(.hljs-quote) {
  color: rgb(100 116 139);
}

.topic-card-content :deep(.hljs-keyword),
.topic-card-content :deep(.hljs-selector-tag) {
  color: rgb(249 115 22);
}

.topic-card-content :deep(.hljs-string),
.topic-card-content :deep(.hljs-addition) {
  color: rgb(74 222 128);
}

.topic-card-content :deep(.hljs-number),
.topic-card-content :deep(.hljs-literal) {
  color: rgb(251 146 60);
}

.topic-card-content :deep(.hljs-built_in),
.topic-card-content :deep(.hljs-builtin-name) {
  color: rgb(56 189 248);
}

.topic-card-content :deep(.hljs-type),
.topic-card-content :deep(.hljs-params) {
  color: rgb(251 191 36);
}

.topic-card-content :deep(.hljs-meta) {
  color: rgb(167 139 250);
}

.topic-card-content :deep(.hljs-function),
.topic-card-content :deep(.hljs-title) {
  color: rgb(96 165 250);
}

.topic-card-content :deep(.hljs-attr),
.topic-card-content :deep(.hljs-attribute) {
  color: rgb(34 211 238);
}

.topic-card-content :deep(.hljs-variable),
.topic-card-content :deep(.hljs-template-variable) {
  color: rgb(244 114 182);
}

.topic-card-content :deep(.hljs-regexp),
.topic-card-content :deep(.hljs-link) {
  color: rgb(248 113 113);
}

.topic-card-content :deep(.hljs-symbol),
.topic-card-content :deep(.hljs-bullet) {
  color: rgb(192 132 252);
}

.topic-card-content :deep(.hljs-name),
.topic-card-content :deep(.hljs-selector-id),
.topic-card-content :deep(.hljs-selector-class) {
  color: rgb(34 211 238);
}
</style>
