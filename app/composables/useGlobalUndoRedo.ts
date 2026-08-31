import { onBeforeUnmount, onMounted } from 'vue'

function isTextEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

/**
 * Registers page-wide Ctrl+Z / Ctrl+Shift+Z handlers.
 * While focus is inside a text input/textarea, the browser's own native
 * undo/redo for that field takes precedence and our handlers stand down,
 * so the two mechanisms never fight over the same keystroke.
 */
export function useGlobalUndoRedo(undo: () => void, redo: () => void) {
  function handleKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase()
    if (key !== 'z' || !(event.ctrlKey || event.metaKey)) return
    if (isTextEditable(event.target)) return

    event.preventDefault()
    if (event.shiftKey) {
      redo()
    } else {
      undo()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
