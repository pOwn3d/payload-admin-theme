import React from 'react'
import { ThemeInjectorClient } from './ThemeProvider.js'

/**
 * ThemeInjector — RSC wrapper for ThemeInjectorClient.
 *
 * Payload registers this component in its importMap. Because afterNavLinks
 * entries are serialised through the RSC stream, they MUST be server
 * components (no 'use client' at top level). The actual client logic
 * lives in ThemeProvider.tsx (ThemeInjectorClient).
 */
export const ThemeInjector: React.FC = () => {
  return <ThemeInjectorClient />
}
