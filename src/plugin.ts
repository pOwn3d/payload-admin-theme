/**
 * Payload CMS Admin Theme Plugin.
 *
 * Customize the Payload admin panel appearance:
 * - Brand name, logo, favicon
 * - Primary/accent/sidebar colors via CSS variables
 * - Border radius customization
 * - Custom CSS injection
 * - Hide Payload default branding
 * - Login page title, subtitle and logo
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

    // 2. Clone admin, admin.components and admin.components.graphics so the
    //    incoming config is never mutated (graphics was written in place before)
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

      // The RSC above only renders a hidden <div data-admin-theme-slug>. The
      // component that actually injects the CSS variables is a client one and
      // must be registered as its own importMap entry — importing it from the
      // RSC would pull client code into the server tree and break Turbopack.
      // Registered after the marker so it is in the DOM when the effect runs.
      const themeInjectorClientComponent = {
        path:
          pluginConfig.themeInjectorClientPath ??
          '@consilioweb/payload-admin-theme/client#ThemeInjectorClient',
        clientProps: { globalSlug },
      }

      const existingNavLinks = config.admin.components.afterNavLinks || []
      config.admin.components.afterNavLinks = [
        themeInjectorComponent,
        themeInjectorClientComponent,
        ...(Array.isArray(existingNavLinks) ? existingNavLinks : [existingNavLinks]),
      ]

      // Replace the admin Logo/Icon with the components that read logoUrl from
      // the global. Opt-in through `replaceBranding`; it used to be triggered
      // by `faviconUrl`, which had nothing to do with the logo — that legacy
      // trigger is kept as the default so existing setups keep their branding.
      const replaceBranding =
        pluginConfig.replaceBranding ?? Boolean(pluginConfig.faviconUrl)

      if (replaceBranding) {
        const graphics = { ...config.admin.components.graphics }
        // Never overwrite graphics the host declared itself.
        graphics.Logo ??= {
          path: '@consilioweb/payload-admin-theme/client#AdminBranding',
          clientProps: { globalSlug },
        }
        graphics.Icon ??= {
          path: '@consilioweb/payload-admin-theme/client#AdminIcon',
          clientProps: { globalSlug },
        }
        config.admin.components.graphics = graphics
      }

      // Render the login title/subtitle/logo stored in the global.
      // The component returns null when the three fields are empty, so hosts
      // that never fill them in see the stock login page.
      const existingBeforeLogin = config.admin.components.beforeLogin || []
      config.admin.components.beforeLogin = [
        ...(Array.isArray(existingBeforeLogin)
          ? existingBeforeLogin
          : [existingBeforeLogin]),
        {
          path:
            pluginConfig.loginBrandingPath ??
            '@consilioweb/payload-admin-theme/rsc#LoginBranding',
          clientProps: { globalSlug },
        },
      ]
    }

    // 4. Inject ThemeNavLink in afterNavLinks (unless disabled).
    //    Also honour skipComponentInjection: that option exists to work around
    //    RSC module resolution failing on symlinked packages, and its contract
    //    is "only the global is created". Injecting the nav link anyway kept
    //    the very import path the option is meant to avoid.
    if (pluginConfig.addNavLink !== false && !pluginConfig.skipComponentInjection) {
      const navLinkPath =
        pluginConfig.navLinkPath ??
        '@consilioweb/payload-admin-theme/rsc#ThemeNavLink'
      const existingNavLinks = config.admin.components.afterNavLinks || []
      config.admin.components.afterNavLinks = [
        ...(Array.isArray(existingNavLinks) ? existingNavLinks : [existingNavLinks]),
        // clientProps carries the slug so the link points at the right global
        { path: navLinkPath, clientProps: { globalSlug } },
      ]
    }

    // 5. Drop the "- Payload" title suffix when the host asked to hide the
    //    Payload branding. CSS can hide the logo, not the document title.
    if (pluginConfig.hidePayloadBranding) {
      config.admin.meta = { ...config.admin.meta }
      config.admin.meta.titleSuffix ??= pluginConfig.brandName
        ? `- ${pluginConfig.brandName}`
        : ''
    }

    return config
  }
