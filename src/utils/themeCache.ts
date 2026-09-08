import type { AdminThemeData } from '../types.js'

/**
 * What a caller needs out of the global.
 *
 * - `branding` — `brandName` / `logoUrl` only. That is all `AdminBranding` and
 *   `AdminIcon` (`admin.components.graphics`) read, and they render on the
 *   LOGIN page, i.e. without a session.
 * - `full` — every field, including the admin-only ones the injector applies.
 *   Only reachable from an authenticated admin session.
 *
 * The two are cached under separate keys on purpose. The fields backing `full`
 * carry a field-level `read` guard (see `globals/AdminTheme.ts`), so the very
 * same URL answers a stripped-down document to an anonymous caller. Sharing one
 * cache slot meant the anonymous login-page fetch memoised that stripped
 * document, and Payload's login redirect is a client-side navigation: no
 * document reload, the module graph and this Map both survive it, so the
 * injector mounted right after the redirect was served the anonymous leftovers
 * and the admin stayed unthemed until a hard refresh.
 */
export type ThemeScope = 'branding' | 'full'

const THEME_SCOPES: readonly ThemeScope[] = ['branding', 'full']

// Module-level cache to avoid multiple fetches across components.
// Keyed by scope + slug: the plugin supports a custom `globalSlug`, and a
// single shared slot would hand the first global's data — or the anonymous
// truncated read — to every later caller.
const cachedThemes = new Map<string, AdminThemeData>()
const cachePromises = new Map<string, Promise<AdminThemeData | null>>()

function cacheKey(slug: string, scope: ThemeScope): string {
  return `${scope}:${slug}`
}

/**
 * Fields Payload deletes from the response when the reader is not an admin
 * panel user. Their absence is the signature of an anonymous read.
 */
const ADMIN_ONLY_KEYS = [
  'preset',
  'primaryColor',
  'accentColor',
  'sidebarColor',
  'borderRadius',
  'faviconUrl',
  'darkMode',
  'hidePayloadBranding',
  'customCSS',
] as const

/**
 * Does this payload look like the anonymous, field-stripped version?
 *
 * Second line of defence behind the scoped keys: a caller that forgets to ask
 * for the `branding` scope must still never poison the slot the injector reads.
 * An authenticated read always carries at least `preset`, which has a
 * `defaultValue`; an anonymous one carries none of these keys at all.
 */
export function isTruncatedThemeResponse(data: unknown): boolean {
  if (!data || typeof data !== 'object') return true
  return !ADMIN_ONLY_KEYS.some((key) => key in (data as Record<string, unknown>))
}

/**
 * Fetch admin theme data with module-level caching.
 * Avoids createContext entirely — safe for Turbopack SSR bundling.
 *
 * `scope` defaults to `full`, the conservative side: an unlabelled caller gets
 * truncation detection rather than a silently incomplete cache hit.
 */
export function fetchTheme(
  slug: string,
  scope: ThemeScope = 'full',
): Promise<AdminThemeData | null> {
  const key = cacheKey(slug, scope)

  const cached = cachedThemes.get(key)
  if (cached) return Promise.resolve(cached)

  const pending = cachePromises.get(key)
  if (pending) return pending

  const promise = fetch(`/api/globals/${slug}`, { credentials: 'include' })
    .then((r) => {
      if (r.ok) return r.json()
      throw new Error(`HTTP ${r.status}`)
    })
    .then((data: AdminThemeData) => {
      // Hand the answer to the current caller, but do not memoise a document
      // that came back stripped: the next caller may well be authenticated.
      if (scope === 'full' && isTruncatedThemeResponse(data)) {
        cachePromises.delete(key) // Allow a real read once a session exists
        return data
      }
      cachedThemes.set(key, data)
      return data
    })
    .catch((err) => {
      console.warn('[admin-theme] Failed to fetch theme data:', err)
      cachePromises.delete(key) // Allow retry on next call
      return null
    })

  cachePromises.set(key, promise)
  return promise
}

/**
 * Invalidate the module-level cache (useful for theme updates).
 * Without a slug, every cached global is dropped; with one, both of its scopes.
 */
export function invalidateThemeCache(slug?: string): void {
  if (slug) {
    for (const scope of THEME_SCOPES) {
      const key = cacheKey(slug, scope)
      cachedThemes.delete(key)
      cachePromises.delete(key)
    }
    return
  }
  cachedThemes.clear()
  cachePromises.clear()
}
