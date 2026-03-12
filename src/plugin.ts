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

    // 2. Ensure admin.components exists
    if (!config.admin) config.admin = {}
    if (!config.admin.components) config.admin.components = {}

    // 3. Inject ThemeInjector via afterNavLinks (renders on all admin pages)
    // Skip when using symlinked packages in dev (webpack RSC module bug)
    if (!pluginConfig.skipComponentInjection) {
      const themeInjectorPath =
        pluginConfig.themeInjectorPath ??
        '@consilioweb/payload-admin-theme/rsc#ThemeInjector'
      const existingNavLinks = config.admin.components.afterNavLinks || []
      config.admin.components.afterNavLinks = [
        themeInjectorPath,
        ...(Array.isArray(existingNavLinks) ? existingNavLinks : [existingNavLinks]),
      ]

      // Inject custom branding components (Logo + Icon) if faviconUrl is set
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
