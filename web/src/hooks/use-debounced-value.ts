import { useDebounce } from 'use-debounce'

/** Default delay for search-as-you-type across every list page. */
export const DEFAULT_DEBOUNCE_MS = 300

export interface DebouncedValue<T> {
  /** The delayed copy — safe to put straight into a TanStack Query key. */
  value: T
  /** True while the debounced value is still catching up with the source. */
  isPending: boolean
  /** Applies the latest value immediately, skipping the remaining delay. */
  flush: () => void
  /** Drops the pending update, leaving the debounced value as it is. */
  cancel: () => void
}

/**
 * Delays a rapidly changing value so it can drive a query key without firing a
 * request per keystroke. Thin wrapper over `use-debounce` so the delay default
 * and the library choice live in one place.
 */
export function useDebouncedValue<T>(source: T, delay = DEFAULT_DEBOUNCE_MS): DebouncedValue<T> {
  const [value, control] = useDebounce(source, delay)

  return {
    value,
    isPending: control.isPending(),
    flush: () => void control.flush(),
    cancel: control.cancel,
  }
}
