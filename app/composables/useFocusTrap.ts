import { type Ref, watch, onBeforeUnmount } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

/**
 * Traps focus within `containerRef` while `isActive` is true, restores focus
 * to the previously focused element on deactivation, and invokes `onEscape`
 * when the user presses Escape.
 */
export function useFocusTrap(containerRef: Ref<HTMLElement | null>, isActive: Ref<boolean>, onEscape: () => void) {
  let previouslyFocused: HTMLElement | null = null

  function getFocusable(): HTMLElement[] {
    if (!containerRef.value) return []
    return Array.from(containerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    )
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!isActive.value) return

    if (event.key === 'Escape') {
      event.stopPropagation()
      onEscape()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = getFocusable()
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const active = document.activeElement as HTMLElement | null

    if (event.shiftKey) {
      if (active === first || !containerRef.value?.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last || !containerRef.value?.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(
    isActive,
    (active) => {
      if (active) {
        previouslyFocused = document.activeElement as HTMLElement | null
        document.addEventListener('keydown', handleKeydown, true)
        requestAnimationFrame(() => {
          const focusable = getFocusable()
          ;(focusable[0] ?? containerRef.value)?.focus()
        })
      } else {
        document.removeEventListener('keydown', handleKeydown, true)
        previouslyFocused?.focus()
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown, true)
  })
}
