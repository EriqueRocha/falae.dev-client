<script setup lang="ts">
import { formatDate } from '~/utils/formatDate'

interface Article {
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
  comments?: number
  saves?: number
  gradient?: string
  coverImage?: string | null
  dislikes?: number
  isLiked?: boolean
  isDisliked?: boolean
  isSaved?: boolean
}

defineProps<{
  article: Article
}>()

const gradientStyles: Record<string, string> = {
  'from-pink-500 via-purple-500 to-orange-400': 'linear-gradient(to bottom right, #ec4899, #a855f7, #fb923c)',
  'from-pink-500 via-red-500 to-orange-400': 'linear-gradient(to bottom right, #ec4899, #ef4444, #fb923c)',
  'from-blue-500 via-purple-500 to-pink-500': 'linear-gradient(to bottom right, #3b82f6, #a855f7, #ec4899)',
  'from-green-400 via-cyan-500 to-blue-500': 'linear-gradient(to bottom right, #4ade80, #06b6d4, #3b82f6)',
  'from-orange-400 via-red-500 to-pink-500': 'linear-gradient(to bottom right, #fb923c, #ef4444, #ec4899)'
}

const defaultGradients = Object.keys(gradientStyles)

const getGradientStyle = (gradient?: string): string => {
  const key = gradient ?? defaultGradients[Math.floor(Math.random() * defaultGradients.length)]
  return gradientStyles[key] ?? gradientStyles[defaultGradients[0]]
}
</script>

<template>
  <article class="bg-slate-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer max-h-[450px]">
    <img
      v-if="article.coverImage"
      :src="article.coverImage"
      :alt="article.title"
      class="w-full h-32 object-cover"
    />
    <div
      v-else
      class="h-32 relative p-6 flex flex-col justify-between"
      :style="{ background: getGradientStyle(article.gradient) }"
    >
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0 pr-3">
          <NuxtLink
            v-if="article.author.userName"
            :to="`/autor/${article.author.userName}`"
            class="text-white/80 text-sm hover:text-white transition-colors"
            @click.stop
          >
            <h3 class="text-white font-semibold text-lg leading-tight line-clamp-2">
              > {{ article.author.name }}
            </h3>
          </NuxtLink>
          <span v-else class="text-white/80 text-sm">{{ article.author.name }}/</span>
          <h3 class="text-white font-semibold text-xl leading-tight line-clamp-2">
            {{ article.title }}
          </h3>
        </div>
        <NuxtLink
          v-if="article.author.userName"
          :to="`/autor/${article.author.userName}`"
          class="flex-shrink-0"
          @click.stop
        >
          <img
            v-if="article.author.avatar"
            :src="article.author.avatar"
            :alt="article.author.name"
            class="w-16 h-16 rounded-full object-cover ring-2 ring-white/30"
          />
          <div
            v-else
            class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30"
          >
            <span class="text-white text-lg font-medium">
              {{ article.author.name.charAt(0).toUpperCase() }}
            </span>
          </div>
        </NuxtLink>
        <template v-else>
          <img
            v-if="article.author.avatar"
            :src="article.author.avatar"
            :alt="article.author.name"
            class="w-12 h-12 rounded-full object-cover ring-2 ring-white/30 flex-shrink-0"
          />
          <div
            v-else
            class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30 flex-shrink-0"
          >
            <span class="text-white text-lg font-medium">
              {{ article.author.name.charAt(0).toUpperCase() }}
            </span>
          </div>
        </template>
      </div>
    </div>

    <div class="p-4">
      <h3 v-if="article.coverImage" class="text-white font-semibold text-lg mb-2 line-clamp-2">
        {{ article.title }}
      </h3>

      <div class="flex flex-wrap gap-2 mb-3">
        <span
          v-for="tag in article.tags"
          :key="tag"
          class="text-blue-400 text-sm"
        >
          #{{ tag }}
        </span>
      </div>

      <div v-if="article.coverImage" class="flex items-center gap-2 text-slate-400 text-sm mb-3">
        <NuxtLink
          v-if="article.author.userName"
          :to="`/autor/${article.author.userName}`"
          class="flex items-center gap-2 hover:text-blue-400 transition-colors"
          @click.stop
        >
          <img
            v-if="article.author.avatar"
            :src="article.author.avatar"
            :alt="article.author.name"
            class="w-6 h-6 rounded-full object-cover"
          />
          <div
            v-else
            class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center"
          >
            <span class="text-slate-400 text-xs font-medium">
              {{ article.author.name.charAt(0).toUpperCase() }}
            </span>
          </div>
          <span>{{ article.author.name }}</span>
        </NuxtLink>
        <template v-else>
          <img
            v-if="article.author.avatar"
            :src="article.author.avatar"
            :alt="article.author.name"
            class="w-6 h-6 rounded-full object-cover"
          />
          <div
            v-else
            class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center"
          >
            <span class="text-slate-400 text-xs font-medium">
              {{ article.author.name.charAt(0).toUpperCase() }}
            </span>
          </div>
          <span>{{ article.author.name }}</span>
        </template>
        <span>{{ formatDate(article.date) }}</span>
      </div>
      <div v-else class="text-slate-400 text-sm mb-3">
        <span>{{ formatDate(article.date) }}</span>
      </div>

      <p class="text-slate-400 text-sm line-clamp-3">
        {{ article.excerpt }}
      </p>

      <div class="flex items-center gap-4 mt-4 text-sm">
        <span
          class="flex items-center gap-1 transition-colors"
          :class="article.isLiked ? 'text-green-400' : 'text-slate-500'"
        >
          <svg class="w-4 h-4" :fill="article.isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          {{ article.likes || 0 }}
        </span>

        <span
          class="flex items-center gap-1 transition-colors"
          :class="article.isDisliked ? 'text-red-400' : 'text-slate-500'"
        >
          <svg class="w-4 h-4" :fill="article.isDisliked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
          </svg>
          {{ article.dislikes || 0 }}
        </span>

        <span class="flex items-center gap-1 text-slate-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {{ article.comments || 0 }}
        </span>

        <span
          class="flex items-center gap-1 transition-colors"
          :class="article.isSaved ? 'text-yellow-400' : 'text-slate-500'"
        >
          <svg class="w-4 h-4" :fill="article.isSaved ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {{ article.saves || 0 }}
        </span>
      </div>
    </div>
  </article>
</template>
