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
 * The ThemeInjectorClient (injected separately via afterNavLinks) reads this
 * attribute to know which global to fetch. This avoids importing client
 * components (createContext) in an RSC, which breaks Turbopack.
 */
export const ThemeInjector: React.FC<{ globalSlug?: string }> = ({
  globalSlug = 'admin-theme',
}) => {
  return <div data-admin-theme-slug={globalSlug} style={{ display: 'none' }} />
}
