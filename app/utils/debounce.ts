export interface Debounced<A extends unknown[]> {
  (...args: A): void
  flush: () => void
  cancel: () => void
}

/**
 * Creates a debounced wrapper around `fn`.
 * `flush()` immediately invokes any pending call.
 * `cancel()` discards any pending call without invoking it.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: A | null = null

  const invoke = () => {
    if (lastArgs) {
      const args = lastArgs
      lastArgs = null
      fn(...args)
    }
  }

  const debounced = ((...args: A) => {
    lastArgs = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      invoke()
    }, wait)
  }) as Debounced<A>

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    invoke()
  }

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    lastArgs = null
  }

  return debounced
}
