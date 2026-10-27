'use client'

import { useCallback, useSyncExternalStore } from 'react'

export function useResumePageSize(breakpoint: number) {
  const query = `(max-width: ${breakpoint}px)`
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])
  const isNarrow = useSyncExternalStore(subscribe, getSnapshot, () => false)
  return isNarrow ? 1 : 2
}
