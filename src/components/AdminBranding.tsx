'use client'

import React, { useEffect, useState } from 'react'
import { AdminThemeErrorBoundary } from './ErrorBoundary.js'
import { fetchTheme } from '../utils/themeCache.js'
import type { AdminThemeData } from '../types.js'

/**
 * AdminBranding — replaces the default Payload logo/icon
 * with the configured custom branding.
 *
 * Fetches theme data via module-level cache (no React Context / createContext).
 *
 * The exported symbol is the boundary-wrapped wrapper, not this component:
 * Payload mounts `graphics.Logo` from the import map, on the login page
 * included, so the plugin has no chance to place an ancestor around it. See
 * ErrorBoundary.tsx.
 */
const AdminBrandingInner: React.FC<{ globalSlug?: string }> = ({
  globalSlug = 'admin-theme',
}) => {
  const [theme, setTheme] = useState<AdminThemeData | null>(null)

  useEffect(() => {
    // 'branding' scope: these two render on the LOGIN page, without a
    // session, and only need the publicly readable brandName / logoUrl.
    // Their own cache slot, so this anonymous read never lands in the one
    // the themed admin session reads afterwards.
    fetchTheme(globalSlug, 'branding').then((data) => {
      if (data) setTheme(data)
    })
  }, [globalSlug])

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

export const AdminBranding: React.FC<{ globalSlug?: string }> = (props) => (
  // `fallback={null}`: no logo is a cosmetic loss, a thrown error on the login
  // page is a lockout.
  <AdminThemeErrorBoundary fallback={null} slotName="graphics.Logo (AdminBranding)">
    <AdminBrandingInner {...props} />
  </AdminThemeErrorBoundary>
)

/**
 * AdminIcon — smaller version for nav/tab icon usage.
 *
 * Fetches theme data via module-level cache (no React Context / createContext).
 */
const AdminIconInner: React.FC<{ globalSlug?: string }> = ({
  globalSlug = 'admin-theme',
}) => {
  const [theme, setTheme] = useState<AdminThemeData | null>(null)

  useEffect(() => {
    // 'branding' scope: these two render on the LOGIN page, without a
    // session, and only need the publicly readable brandName / logoUrl.
    // Their own cache slot, so this anonymous read never lands in the one
    // the themed admin session reads afterwards.
    fetchTheme(globalSlug, 'branding').then((data) => {
      if (data) setTheme(data)
    })
  }, [globalSlug])

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

export const AdminIcon: React.FC<{ globalSlug?: string }> = (props) => (
  <AdminThemeErrorBoundary fallback={null} slotName="graphics.Icon (AdminIcon)">
    <AdminIconInner {...props} />
  </AdminThemeErrorBoundary>
)
