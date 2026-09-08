'use client'

import React, { useEffect, useState } from 'react'
import { AdminThemeErrorBoundary } from './ErrorBoundary.js'
import { generateThemeCSS } from '../utils/cssVariables.js'
import { getPresetColors } from '../utils/presets.js'
import { fetchTheme } from '../utils/themeCache.js'
import type { AdminThemeData } from '../types.js'

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
 * and injects CSS into the Payload admin panel.
 *
 * Supports:
 * - Theme presets (override individual color fields)
 * - Dark mode color overrides via [data-theme="dark"] selector
 * - Custom CSS injection
 * - Favicon and brand name customization
 *
 * The exported symbol is the boundary-wrapped wrapper below, not this
 * component: Payload mounts it from the import map into `afterNavLinks`, which
 * renders on EVERY admin page, so the plugin cannot place an ancestor around
 * it. See ErrorBoundary.tsx.
 */
const ThemeInjectorClientInner: React.FC<{ globalSlug?: string }> = ({
  globalSlug,
}) => {
  const [theme, setTheme] = useState<AdminThemeData | null>(null)

  useEffect(() => {
    // The slug comes from clientProps when the plugin registers this component.
    // The [data-admin-theme-slug] marker rendered by the RSC wrapper is the
    // fallback for hosts that mount this component themselves.
    let slug = globalSlug ?? 'admin-theme'
    if (!globalSlug) {
      const el = document.querySelector('[data-admin-theme-slug]')
      const fromDom = el?.getAttribute('data-admin-theme-slug')
      if (fromDom) slug = fromDom
    }

    // 'full' scope: this component only ever mounts inside an authenticated
    // admin session (afterNavLinks), and it needs the fields the anonymous
    // read is stripped of — customCSS, colors, borderRadius, faviconUrl.
    fetchTheme(slug, 'full').then((data) => {
      if (data) setTheme(data)
    })
  }, [globalSlug])

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

    const blocks: string[] = []

    const lightCSS = generateThemeCSS({
      primaryColor,
      accentColor,
      sidebarColor,
      borderRadius: theme.borderRadius,
    })
    if (lightCSS) blocks.push(lightCSS)

    // Dark mode overrides, only when at least one dark color is set
    const dark = theme.darkMode
    if (dark && (dark.primaryColor || dark.accentColor || dark.sidebarColor)) {
      const darkCSS = generateThemeCSS(
        {
          primaryColor: dark.primaryColor,
          accentColor: dark.accentColor,
          sidebarColor: dark.sidebarColor,
        },
        { scope: '[data-theme="dark"]' },
      )
      if (darkCSS) blocks.push(darkCSS)
    }

    // Inject custom CSS from the global
    if (theme.customCSS) {
      blocks.push(`/* Custom CSS */\n${theme.customCSS}`)
    }

    // Hide Payload branding if configured.
    // `.graphic-logo` and `.graphic-icon` are the classes carried by Payload's
    // own PayloadLogo / PayloadIcon SVGs. The previously targeted
    // `.nav__brand` and `.payload-icon` do not exist in Payload 3.
    if (theme.hidePayloadBranding) {
      blocks.push(
        '/* Hide Payload branding */\n' +
          '.graphic-logo,\n.graphic-icon {\n  display: none !important;\n}',
      )
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

    styleEl.textContent = blocks.join('\n\n')

    // Cleanup on unmount
    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [theme])

  return null
}

export const ThemeInjectorClient: React.FC<{ globalSlug?: string }> = (props) => (
  // `fallback={null}`: this component renders nothing anyway, and an error
  // panel wedged into the sidebar of every admin page would be worse than an
  // unthemed admin.
  <AdminThemeErrorBoundary
    fallback={null}
    slotName="afterNavLinks (ThemeInjectorClient)"
  >
    <ThemeInjectorClientInner {...props} />
  </AdminThemeErrorBoundary>
)
