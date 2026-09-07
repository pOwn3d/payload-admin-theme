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
 */
export const ThemeInjector: React.FC<{ globalSlug?: string }> = ({
  globalSlug = 'admin-theme',
}) => {
  return <div data-admin-theme-slug={globalSlug} style={{ display: 'none' }} />
}
