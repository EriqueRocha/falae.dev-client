export interface Interaction {
  id: string
  actorAuthorId: string
  actorName: string
  actorUserName: string
  actorProfileImageUrl: string | null
  interactionType: 'COMMENT_ON_ARTICLE' | 'COMMENT_ON_TOPIC' | 'REPLY_TO_COMMENT' | 'LIKE_ARTICLE' | 'LIKE_TOPIC' | 'LIKE_COMMENT' | 'SAVE_ARTICLE'
  targetType: 'ARTICLE' | 'TOPIC' | 'COMMENT'
  targetId: string
  targetTitle: string | null
  targetSlug: string | null
  commentId: string | null
  parentContentType: 'ARTICLE' | 'TOPIC' | null
  isRead: boolean
  createdAt: string
}

interface InteractionPageResponse {
  interactions: Interaction[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}

interface UnreadCountResponse {
  count: number
}

export function useNotifications() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const { isAuthenticated } = useAuth()

  const notifications = useState<Interaction[]>('notifications', () => [])
  const unreadCount = useState<number>('unread_count', () => 0)
  const isLoading = ref(false)
  const hasNext = ref(false)
  const currentPage = ref(0)

  const fetchUnreadCount = async () => {
    if (!isAuthenticated.value) {
      unreadCount.value = 0
      return
    }

    try {
      const response = await $fetch<UnreadCountResponse>(`${apiBase}/api/authors/me/interactions/unread-count`, {
        credentials: 'include'
      })
      unreadCount.value = response.count
    } catch (e) {
      console.error('Erro ao buscar contagem de notificacoes:', e)
    }
  }

  const fetchNotifications = async (page = 0, append = false) => {
    if (!isAuthenticated.value) {
      notifications.value = []
      return
    }

    isLoading.value = true
    try {
      const response = await $fetch<InteractionPageResponse>(`${apiBase}/api/authors/me/interactions`, {
        params: { page, size: 10 },
        credentials: 'include'
      })

      if (append) {
        notifications.value = [...notifications.value, ...response.interactions]
      } else {
        notifications.value = response.interactions
      }
      hasNext.value = response.hasNext
      currentPage.value = page
    } catch (e) {
      console.error('Erro ao buscar notificacoes:', e)
    } finally {
      isLoading.value = false
    }
  }

  const loadMore = async () => {
    if (hasNext.value && !isLoading.value) {
      await fetchNotifications(currentPage.value + 1, true)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await $fetch(`${apiBase}/api/authors/me/interactions/${id}/read`, {
        method: 'PATCH',
        credentials: 'include'
      })

      const notification = notifications.value.find(n => n.id === id)
      if (notification && !notification.isRead) {
        notification.isRead = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (e) {
      console.error('Erro ao marcar notificacao como lida:', e)
    }
  }

  const markAllAsRead = async () => {
    try {
      await $fetch(`${apiBase}/api/authors/me/interactions/read-all`, {
        method: 'PATCH',
        credentials: 'include'
      })

      notifications.value.forEach(n => n.isRead = true)
      unreadCount.value = 0
    } catch (e) {
      console.error('Erro ao marcar todas notificacoes como lidas:', e)
    }
  }

  const getNotificationMessage = (interaction: Interaction): string => {
    const typeMessages: Record<Interaction['interactionType'], string> = {
      'COMMENT_ON_ARTICLE': 'comentou no seu artigo',
      'COMMENT_ON_TOPIC': 'comentou no seu topico',
      'REPLY_TO_COMMENT': 'respondeu seu comentario',
      'LIKE_ARTICLE': 'curtiu seu artigo',
      'LIKE_TOPIC': 'curtiu seu topico',
      'LIKE_COMMENT': 'curtiu seu comentario',
      'SAVE_ARTICLE': 'salvou seu artigo'
    }
    return typeMessages[interaction.interactionType]
  }

  const getNotificationIcon = (interactionType: Interaction['interactionType']): string => {
    if (interactionType.startsWith('LIKE_')) return 'like'
    if (interactionType.startsWith('COMMENT_') || interactionType === 'REPLY_TO_COMMENT') return 'comment'
    if (interactionType === 'SAVE_ARTICLE') return 'save'
    return 'default'
  }

  const getNotificationLink = (interaction: Interaction): string => {
    const { targetType, targetSlug, actorUserName } = interaction

    if (targetType === 'ARTICLE' && targetSlug) {
      return `/artigo/${actorUserName}/${targetSlug}`
    }
    if (targetType === 'TOPIC' && targetSlug) {
      return `/topico/${actorUserName}/${targetSlug}`
    }
    return '/'
  }

  const formatTimeAgo = (dateString: string): string => {
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
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const refreshNotifications = async () => {
    await Promise.all([
      fetchUnreadCount(),
      fetchNotifications(0, false)
    ])
  }

  return {
    notifications,
    unreadCount,
    isLoading,
    hasNext,
    fetchUnreadCount,
    fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
    getNotificationMessage,
    getNotificationIcon,
    getNotificationLink,
    formatTimeAgo,
    refreshNotifications
  }
}
