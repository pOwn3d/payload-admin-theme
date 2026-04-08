'use client'

import React, { useEffect, useState } from 'react'
import { fetchTheme } from '../utils/themeCache.js'
import type { AdminThemeData } from '../types.js'

/**
 * AdminBranding — replaces the default Payload logo/icon
 * with the configured custom branding.
 *
 * Fetches theme data via module-level cache (no React Context / createContext).
 */
export const AdminBranding: React.FC = () => {
  const [theme, setTheme] = useState<AdminThemeData | null>(null)

  useEffect(() => {
    fetchTheme('admin-theme').then((data) => {
      if (data) setTheme(data)
    })
  }, [])

  if (!theme?.logoUrl) {
    // Render brand name as text fallback
    if (theme?.brandName) {
      return (
        <span
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {theme.brandName}
        </span>
      )
    }
    return null
  }

  return (
    <img
      src={theme.logoUrl}
      alt={theme.brandName || 'Admin Logo'}
      style={{
        maxHeight: '28px',
        width: 'auto',
        objectFit: 'contain',
      }}
    />
  )
}

/**
 * AdminIcon — smaller version for nav/tab icon usage.
 *
 * Fetches theme data via module-level cache (no React Context / createContext).
 */
export const AdminIcon: React.FC = () => {
  const [theme, setTheme] = useState<AdminThemeData | null>(null)

  useEffect(() => {
    fetchTheme('admin-theme').then((data) => {
      if (data) setTheme(data)
    })
  }, [])

  if (!theme?.logoUrl) return null

  return (
    <img
      src={theme.logoUrl}
      alt={theme.brandName || 'Icon'}
      style={{
        maxHeight: '20px',
        width: 'auto',
        objectFit: 'contain',
      }}
    />
  )
}
