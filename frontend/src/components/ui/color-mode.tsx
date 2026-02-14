'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'

export type ColorMode = 'light' | 'dark'

interface ColorModeContextValue {
  colorMode: ColorMode
  toggleColorMode: () => void
  setColorMode: (mode: ColorMode) => void
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null)

const STORAGE_KEY = 'slb-color-mode'

function getInitialColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage unavailable (SSR, test environments, etc.)
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Provides color mode (light/dark) to the application.
 *
 * Syncs the active mode to:
 * - `data-theme` attribute on `<html>` (consumed by Chakra _dark conditions)
 * - `color-scheme` CSS property (tells browser about native element colors)
 * - `localStorage` for persistence across sessions
 */
export function ColorModeProvider({ children }: PropsWithChildren) {
  const [colorMode, setColorModeState] = useState<ColorMode>(getInitialColorMode)

  useEffect(() => {
    try {
      const root = document.documentElement
      // Chakra v3 conditions: dark → ".dark &", light → ":root &, .light &"
      root.classList.toggle('dark', colorMode === 'dark')
      root.classList.toggle('light', colorMode === 'light')
      root.style.colorScheme = colorMode
      localStorage.setItem(STORAGE_KEY, colorMode)
    } catch {
      // Silently fail in test environments
    }
  }, [colorMode])

  const toggleColorMode = useCallback(() => {
    setColorModeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode)
  }, [])

  const value = useMemo(
    () => ({ colorMode, toggleColorMode, setColorMode }),
    [colorMode, toggleColorMode, setColorMode],
  )

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  )
}

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext)
  if (!ctx) throw new Error('useColorMode must be used within a ColorModeProvider')
  return ctx
}
