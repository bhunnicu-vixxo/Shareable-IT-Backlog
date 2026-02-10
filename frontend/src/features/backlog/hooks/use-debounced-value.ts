import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of the provided value.
 *
 * The returned value only updates after the caller stops changing the
 * input for `delay` milliseconds. Cleans up the internal timer on
 * value change and unmount to prevent stale updates.
 *
 * @param value - The value to debounce.
 * @param delay - Debounce delay in milliseconds (default 300).
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
