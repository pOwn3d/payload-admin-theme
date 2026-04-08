'use client'

import React, { useEffect, useState } from 'react'
import { lighten, darken } from '../utils/colorUtils.js'
import { getPresetColors } from '../utils/presets.js'
import { fetchTheme } from '../utils/themeCache.js'
import type { AdminThemeData } from '../types.js'

/**
 * Build CSS variable declarations from a set of theme colors.
 * Shared between light and dark mode generation.
 */
function buildColorVars(
  primaryColor?: string | null,
  accentColor?: string | null,
  sidebarColor?: string | null,
): string[] {
  const vars: string[] = []

  if (primaryColor) {
    vars.push(`--theme-success-500: ${primaryColor}`)
    vars.push(`--theme-text-link: ${primaryColor}`)
    vars.push(`--theme-success-400: ${lighten(primaryColor, 0.15)}`)
    vars.push(`--theme-success-600: ${darken(primaryColor, 0.15)}`)
  }

  if (accentColor) {
    vars.push(`--theme-warning-500: ${accentColor}`)
    vars.push(`--theme-warning-400: ${lighten(accentColor, 0.15)}`)
    vars.push(`--theme-warning-600: ${darken(accentColor, 0.15)}`)
  }

  if (sidebarColor) {
    vars.push(`--nav-color: ${sidebarColor}`)
  }

  return vars
}

/**
 * Resolve effective colors: preset overrides individual fields when not 'custom'.
 */
function resolveColors(theme: AdminThemeData) {
  const presetColors = getPresetColors(theme.preset)
  if (presetColors) {
    return {
      primaryColor: presetColors.primaryColor,
      accentColor: presetColors.accentColor,
      sidebarColor: presetColors.sidebarColor,
    }
  }
  return {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    sidebarColor: theme.sidebarColor,
  }
}

/**
 * ThemeInjectorClient — self-contained client component.
 * Fetches theme data via module-level cache (no React Context / createContext)
 * and injects CSS variables into the Payload admin panel.
 *
 * Supports:
 * - Theme presets (override individual color fields)
 * - Dark mode color overrides via [data-theme="dark"] selector
 * - Custom CSS injection
 * - Favicon and brand name customization
 */
export const ThemeInjectorClient: React.FC = () => {
  const [theme, setTheme] = useState<AdminThemeData | null>(null)

  useEffect(() => {
    // Read globalSlug from the RSC-injected data attribute
    let slug = 'admin-theme'
    const el = document.querySelector('[data-admin-theme-slug]')
    if (el) {
      const s = el.getAttribute('data-admin-theme-slug')
      if (s) slug = s
    }

    fetchTheme(slug).then((data) => {
      if (data) setTheme(data)
    })
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

    // Resolve colors (preset takes priority over individual fields)
    const { primaryColor, accentColor, sidebarColor } = resolveColors(theme)

    // Build light mode variables
    const lightVars = buildColorVars(primaryColor, accentColor, sidebarColor)

    if (theme.borderRadius != null) {
      lightVars.push(`--style-radius-s: ${theme.borderRadius}px`)
      lightVars.push(`--style-radius-m: ${theme.borderRadius + 2}px`)
      lightVars.push(`--style-radius-l: ${theme.borderRadius + 4}px`)
    }

    let css = ''

    if (lightVars.length > 0) {
      css += `:root {\n  ${lightVars.join(';\n  ')};\n}\n`
    }

    // Build dark mode overrides if any dark colors are set
    const dark = theme.darkMode
    if (dark && (dark.primaryColor || dark.accentColor || dark.sidebarColor)) {
      const darkVars = buildColorVars(dark.primaryColor, dark.accentColor, dark.sidebarColor)
      if (darkVars.length > 0) {
        css += `\n[data-theme="dark"] {\n  ${darkVars.join(';\n  ')};\n}\n`
      }
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
