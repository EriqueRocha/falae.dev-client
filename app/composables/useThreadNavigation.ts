import type { InjectionKey, ComputedRef } from 'vue'

export interface Comment {
  id: string
  content: string
  authorName: string
  authorUserName?: string
  authorProfileImage?: string | null
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
  tags?: string[] | null
}

export interface ThreadContext {
  rootComment: Comment
  ancestorChain: Comment[]
}

export interface ThreadNavigation {
  pushThread: (comment: Comment, ancestorChain: Comment[]) => void
  popThread: () => void
  isInThreadView: ComputedRef<boolean>
  currentDepthOffset: ComputedRef<number>
  currentThreadContext: ComputedRef<ThreadContext | null>
}

export const ThreadNavigationKey: InjectionKey<ThreadNavigation> = Symbol('ThreadNavigation')

export function useThreadNavigationProvider() {
  const threadStack = ref<ThreadContext[]>([])

  const isInThreadView = computed(() => threadStack.value.length > 0)

  const currentThreadContext = computed(() => {
    if (threadStack.value.length === 0) return null
    return threadStack.value[threadStack.value.length - 1]
  })

  const currentDepthOffset = computed(() => {
    if (!currentThreadContext.value) return 0
    return currentThreadContext.value.rootComment.depth
  })

  const pushThread = (comment: Comment, ancestorChain: Comment[]) => {
    threadStack.value.push({
      rootComment: comment,
      ancestorChain
    })
  }

  const popThread = () => {
    if (threadStack.value.length > 0) {
      threadStack.value.pop()
    }
  }

  const navigation: ThreadNavigation = {
    pushThread,
    popThread,
    isInThreadView,
    currentDepthOffset,
    currentThreadContext
  }

  provide(ThreadNavigationKey, navigation)

  return navigation
}

export function useThreadNavigation(): ThreadNavigation {
  const injected = inject(ThreadNavigationKey)

  if (injected) {
    return injected
  }

  //fallback no-op implementation for when not in a provider context
  return {
    pushThread: () => {},
    popThread: () => {},
    isInThreadView: computed(() => false),
    currentDepthOffset: computed(() => 0),
    currentThreadContext: computed(() => null)
  }
}
