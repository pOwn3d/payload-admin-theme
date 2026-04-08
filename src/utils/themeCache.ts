import type { AdminThemeData } from '../types.js'

// Module-level cache to avoid multiple fetches across components
let cachedTheme: AdminThemeData | null = null
let cachePromise: Promise<AdminThemeData | null> | null = null

/**
 * Fetch admin theme data with module-level caching.
 * Avoids createContext entirely — safe for Turbopack SSR bundling.
 */
export function fetchTheme(slug: string): Promise<AdminThemeData | null> {
  if (cachedTheme) return Promise.resolve(cachedTheme)
  if (cachePromise) return cachePromise

  cachePromise = fetch(`/api/globals/${slug}`, { credentials: 'include' })
    .then((r) => {
      if (r.ok) return r.json()
      throw new Error(`HTTP ${r.status}`)
    })
    .then((data: AdminThemeData) => {
      cachedTheme = data
      return data
    })
    .catch((err) => {
      console.warn('[admin-theme] Failed to fetch theme data:', err)
      cachePromise = null // Allow retry on next call
      return null
    })

  return cachePromise
}

/**
 * Invalidate the module-level cache (useful for theme updates).
 */
export function invalidateThemeCache(): void {
  cachedTheme = null
  cachePromise = null
}
