import { ref, type Ref } from 'vue'

const listenersByQuery = new Map<string, Ref<boolean>>()

export function useIsMobile(maxWidth = 640): Ref<boolean> {
  const query = `(max-width: ${maxWidth - 1}px)`

  const existing = listenersByQuery.get(query)
  if (existing) return existing

  const isMobile = ref(false)
  listenersByQuery.set(query, isMobile)

  if (import.meta.client) {
    const mediaQuery = window.matchMedia(query)
    isMobile.value = mediaQuery.matches
    mediaQuery.addEventListener('change', (event) => {
      isMobile.value = event.matches
    })
  }

  return isMobile
}
