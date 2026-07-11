import { watch, onBeforeUnmount, type WatchSource } from 'vue'

let openModalsCount = 0

export function useModalBehavior(isOpen: WatchSource<boolean>, onKeydown: (e: KeyboardEvent) => void) {
  let active = false

  const setOpen = (open: boolean) => {
    if (!import.meta.client || open === active) return
    active = open

    if (open) {
      document.addEventListener('keydown', onKeydown)
      openModalsCount++
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKeydown)
      openModalsCount = Math.max(0, openModalsCount - 1)
      if (openModalsCount === 0) {
        document.body.style.overflow = ''
      }
    }
  }

  watch(isOpen, setOpen, { immediate: true })
  onBeforeUnmount(() => setOpen(false))
}
