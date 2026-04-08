/**
 * Payload CMS Admin Theme Plugin.
 *
 * Customize the Payload admin panel appearance:
 * - Brand name, logo, favicon
 * - Primary/accent/sidebar colors via CSS variables
 * - Border radius customization
 * - Custom CSS injection
 * - Hide Payload default branding
 * - All configurable from the admin panel via a global
 */

import type { Config, Plugin } from 'payload'
import type { AdminThemePluginConfig } from './types.js'
import { createAdminThemeGlobal } from './globals/AdminTheme.js'

export const adminThemePlugin =
  (pluginConfig: AdminThemePluginConfig = {}): Plugin =>
  (incomingConfig: Config): Config => {
    // Allow disabling the plugin
    if (pluginConfig.enabled === false) return incomingConfig

    const config = { ...incomingConfig }

    // 1. Add the AdminTheme global
    config.globals = [
      ...(config.globals || []),
      createAdminThemeGlobal(pluginConfig),
    ]

    // 2. Deep clone admin and admin.components to avoid mutating incoming config
    config.admin = { ...config.admin }
    config.admin.components = { ...config.admin.components }

    const globalSlug = pluginConfig.globalSlug ?? 'admin-theme'

    // 3. Inject ThemeInjector via afterNavLinks (renders on all admin pages)
    // Skip when using symlinked packages in dev (webpack RSC module bug)
    if (!pluginConfig.skipComponentInjection) {
      const themeInjectorPath =
        pluginConfig.themeInjectorPath ??
        '@consilioweb/payload-admin-theme/rsc#ThemeInjector'

      // Pass globalSlug as a client prop so the provider fetches the right global
      const themeInjectorComponent = {
        path: themeInjectorPath,
        clientProps: { globalSlug },
      }

      const existingNavLinks = config.admin.components.afterNavLinks || []
      config.admin.components.afterNavLinks = [
        themeInjectorComponent,
        ...(Array.isArray(existingNavLinks) ? existingNavLinks : [existingNavLinks]),
      ]

      // Inject custom branding components (Logo + Icon) if faviconUrl is set
      // These components fetch theme data via module-level cache (themeCache.ts)
      if (pluginConfig.faviconUrl) {
        if (!config.admin.components.graphics) {
          config.admin.components.graphics = {}
        }
        config.admin.components.graphics.Logo =
          '@consilioweb/payload-admin-theme/client#AdminBranding'
        config.admin.components.graphics.Icon =
          '@consilioweb/payload-admin-theme/client#AdminIcon'
      }
    }

    // 4. Inject ThemeNavLink in afterNavLinks (unless disabled)
    if (pluginConfig.addNavLink !== false) {
      const navLinkPath =
        pluginConfig.navLinkPath ??
        '@consilioweb/payload-admin-theme/rsc#ThemeNavLink'
      const existingNavLinks = config.admin.components.afterNavLinks || []
      config.admin.components.afterNavLinks = [
        ...(Array.isArray(existingNavLinks) ? existingNavLinks : [existingNavLinks]),
        navLinkPath,
      ]
    }

    return config
  }
