import { debounce } from '~/utils/debounce'

/**
 * Coalesces continuous text-field edits into a single history entry.
 * A commit happens either after a typing pause (`delay` ms of inactivity)
 * or immediately on blur - never on every keystroke.
 */
export function useCommitOnPause(commit: (value: string) => void, delay = 800) {
  const debounced = debounce((value: string) => commit(value), delay)

  function onInput(value: string): void {
    debounced(value)
  }

  function onBlur(value: string): void {
    debounced.cancel()
    commit(value)
  }

  function flush(): void {
    debounced.flush()
  }

  return { onInput, onBlur, flush }
}
