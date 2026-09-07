import type { AdminThemeData } from '../types.js'

// Module-level cache to avoid multiple fetches across components.
// Keyed by slug: the plugin supports a custom `globalSlug`, and a single
// shared slot would hand the first global's data to every later caller.
const cachedThemes = new Map<string, AdminThemeData>()
const cachePromises = new Map<string, Promise<AdminThemeData | null>>()

/**
 * Fetch admin theme data with module-level caching.
 * Avoids createContext entirely — safe for Turbopack SSR bundling.
 */
export function fetchTheme(slug: string): Promise<AdminThemeData | null> {
  const cached = cachedThemes.get(slug)
  if (cached) return Promise.resolve(cached)

  const pending = cachePromises.get(slug)
  if (pending) return pending

  const promise = fetch(`/api/globals/${slug}`, { credentials: 'include' })
    .then((r) => {
      if (r.ok) return r.json()
      throw new Error(`HTTP ${r.status}`)
    })
    .then((data: AdminThemeData) => {
      cachedThemes.set(slug, data)
      return data
    })
    .catch((err) => {
      console.warn('[admin-theme] Failed to fetch theme data:', err)
      cachePromises.delete(slug) // Allow retry on next call
      return null
    })

  cachePromises.set(slug, promise)
  return promise
}

/**
 * Invalidate the module-level cache (useful for theme updates).
 * Without a slug, every cached global is dropped.
 */
export function invalidateThemeCache(slug?: string): void {
  if (slug) {
    cachedThemes.delete(slug)
    cachePromises.delete(slug)
    return
  }
  cachedThemes.clear()
  cachePromises.clear()
}
