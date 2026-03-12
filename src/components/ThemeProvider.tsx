'use client'

import { useEffect, useState } from 'react'

interface AdminThemeData {
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
  borderRadius?: number | null
  customCSS?: string | null
  hidePayloadBranding?: boolean | null
  brandName?: string | null
  logoUrl?: string | null
  faviconUrl?: string | null
}

/**
 * Convert a hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6 && clean.length !== 3) return null

  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean

  const num = parseInt(full, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount))
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount))
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)))
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)))
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * ThemeInjector — fetches admin theme settings and injects CSS variables
 * into the Payload admin panel. Renders as an invisible component (no wrapping).
 */
export const ThemeInjectorClient: React.FC = () => {
  const [theme, setTheme] = useState<AdminThemeData | null>(null)

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const res = await fetch('/api/globals/admin-theme', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setTheme(data)
        }
      } catch {
        // Silently fail — use defaults
      }
    }

    fetchTheme()
  }, [])

  useEffect(() => {
    if (!theme) return

    const styleId = 'admin-theme-variables'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null

    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    // Build CSS variables
    const vars: string[] = []

    if (theme.primaryColor) {
      const primary = theme.primaryColor
      vars.push(`--theme-success-500: ${primary}`)
      vars.push(`--theme-text-link: ${primary}`)
      vars.push(`--theme-success-400: ${lighten(primary, 0.15)}`)
      vars.push(`--theme-success-600: ${darken(primary, 0.15)}`)
    }

    if (theme.accentColor) {
      vars.push(`--theme-warning-500: ${theme.accentColor}`)
      vars.push(`--theme-warning-400: ${lighten(theme.accentColor, 0.15)}`)
      vars.push(`--theme-warning-600: ${darken(theme.accentColor, 0.15)}`)
    }

    if (theme.sidebarColor) {
      vars.push(`--nav-color: ${theme.sidebarColor}`)
    }

    if (theme.borderRadius != null) {
      vars.push(`--style-radius-s: ${theme.borderRadius}px`)
      vars.push(`--style-radius-m: ${theme.borderRadius + 2}px`)
      vars.push(`--style-radius-l: ${theme.borderRadius + 4}px`)
    }

    let css = ''

    if (vars.length > 0) {
      css += `:root {\n  ${vars.join(';\n  ')};\n}\n`
    }

    // Inject custom CSS from the global
    if (theme.customCSS) {
      css += `\n/* Custom CSS */\n${theme.customCSS}\n`
    }

    // Hide Payload branding if configured
    if (theme.hidePayloadBranding) {
      css += `
/* Hide Payload branding */
.nav__brand .payload-icon,
.nav__brand svg[class*="payload"],
[class*="NavBrand"] svg {
  display: none !important;
}
`
    }

    // Update favicon if configured
    if (theme.faviconUrl) {
      let faviconLink = document.querySelector(
        'link[rel="icon"]',
      ) as HTMLLinkElement | null
      if (!faviconLink) {
        faviconLink = document.createElement('link')
        faviconLink.rel = 'icon'
        document.head.appendChild(faviconLink)
      }
      faviconLink.href = theme.faviconUrl
    }

    // Update document title with brand name
    if (theme.brandName) {
      const currentTitle = document.title
      // Only prepend if not already present
      if (!currentTitle.includes(theme.brandName)) {
        document.title = `${theme.brandName} — ${currentTitle}`
      }
    }

    styleEl.textContent = css

    // Cleanup on unmount
    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [theme])

  return null
}
