import React from 'react'

/**
 * ThemeInjector — RSC wrapper for the client-side theme injection.
 *
 * Payload registers this component in its importMap. Because afterNavLinks
 * entries are serialised through the RSC stream, they MUST be server
 * components (no 'use client' at top level). The actual client logic
 * lives in ThemeProvider.tsx (ThemeInjectorClient).
 *
 * We render a simple wrapper div with a data attribute carrying the globalSlug.
 * ThemeInjectorClient is registered as its own afterNavLinks entry by the
 * plugin (with the slug in clientProps) and falls back to reading this
 * attribute when a host mounts it by hand. Importing the client component from
 * here instead would pull createContext into the server tree and break
 * Turbopack — hence the two separate importMap entries.
 *
 * RESILIENCE — try/catch, not an ErrorBoundary. This component has no
 * `'use client'` directive on purpose (see above) and Payload mounts it from
 * the import map, so a client boundary can never be its ancestor: the plugin
 * has nowhere to put one. Adding `'use client'` to make a boundary possible is
 * exactly what the paragraph above forbids. Returning `null` on failure costs
 * the slug marker — which ThemeInjectorClient already receives through
 * `clientProps` — and keeps the admin page rendering.
 *
 * The props are destructured INSIDE the try on purpose: destructuring in the
 * parameter list runs before the body, so a prop access that throws would slip
 * past the guard entirely.
 */
export const ThemeInjector: React.FC<{ globalSlug?: string }> = (props) => {
  try {
    const { globalSlug = 'admin-theme' } = props
    return <div data-admin-theme-slug={globalSlug} style={{ display: 'none' }} />
  } catch {
    return null
  }
}
