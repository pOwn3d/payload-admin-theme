export interface AdminThemePluginConfig {
  /** Enable/disable the plugin (default: true) */
  enabled?: boolean

  /** Global slug (default: 'admin-theme') */
  globalSlug?: string

  /** Default brand name shown in admin */
  brandName?: string

  /** Default primary color (hex) */
  primaryColor?: string

  /** Default accent color (hex) */
  accentColor?: string

  /** Default background color for sidebar */
  sidebarColor?: string

  /** Custom CSS to inject in admin */
  customCSS?: string

  /** Hide the Payload branding in admin */
  hidePayloadBranding?: boolean

  /** Custom admin favicon URL */
  faviconUrl?: string

  /** Border radius for UI elements (px) */
  borderRadius?: number

  /**
   * Override the ThemeInjector component path.
   * Required for symlinked/local development (link: in package.json).
   * Set to a local project path like '@/components/admin/ThemeInjector#ThemeInjector'
   * that re-exports from '@consilioweb/payload-admin-theme/client'.
   *
   * When installed from npm (not symlinked), the default path works fine.
   * Default: '@consilioweb/payload-admin-theme/rsc#ThemeInjector'
   */
  themeInjectorPath?: string

  /**
   * Override the ThemeInjectorClient component path.
   * This is the client component that actually writes the CSS variables,
   * customCSS, favicon and brand name — the RSC ThemeInjector only renders
   * the hidden marker carrying the global slug.
   *
   * Required for symlinked/local development (link: in package.json), same
   * caveat as themeInjectorPath.
   * Default: '@consilioweb/payload-admin-theme/client#ThemeInjectorClient'
   */
  themeInjectorClientPath?: string

  /**
   * Replace the admin Logo/Icon with the plugin components that read
   * `logoUrl` / `brandName` from the global.
   *
   * Graphics already declared by the host are never overwritten.
   * Default: `true` when `faviconUrl` is set (legacy trigger), `false` otherwise.
   */
  replaceBranding?: boolean

  /**
   * Override the LoginBranding component path.
   * Server component rendered in `admin.components.beforeLogin`, displaying the
   * `loginTitle` / `loginSubtitle` / `loginLogoUrl` fields of the global.
   *
   * Required for symlinked/local development (link: in package.json), same
   * caveat as themeInjectorPath.
   * Default: '@consilioweb/payload-admin-theme/rsc#LoginBranding'
   */
  loginBrandingPath?: string

  /**
   * Skip automatic component injection into afterNavLinks.
   * When true, only the global is created — you must manually
   * render ThemeInjectorClient from an existing component.
   * Useful when webpack RSC module registration fails with
   * symlinked packages in dev mode.
   */
  skipComponentInjection?: boolean

  /**
   * Add a "Theme" nav link in the admin sidebar.
   * Default: true
   */
  addNavLink?: boolean

  /**
   * Path to a custom ColorPicker field component for color fields.
   * Set to false to disable the color picker.
   * e.g. '@/components/admin/ColorPickerField'
   */
  colorPickerComponent?: string | false

  /**
   * Custom access control for the AdminTheme global.
   * Allows overriding the default update access (admin role only).
   */
  access?: {
    read?: (args: { req: any }) => boolean | Promise<boolean>
    update?: (args: { req: any }) => boolean | Promise<boolean>
  }

  /**
   * Override the ThemeNavLink component path.
   * Required for symlinked/local development (link: in package.json).
   * Default: '@consilioweb/payload-admin-theme/rsc#ThemeNavLink'
   */
  navLinkPath?: string
}

/** Available theme presets */
export type ThemePreset =
  | 'custom'
  | 'blue-professional'
  | 'dark-minimal'
  | 'green-nature'
  | 'purple-creative'

/** Dark mode color overrides */
export interface DarkModeColors {
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
}

/** Theme data returned by the AdminTheme global */
export interface AdminThemeData {
  preset?: ThemePreset | null
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
  borderRadius?: number | null
  customCSS?: string | null
  hidePayloadBranding?: boolean | null
  brandName?: string | null
  logoUrl?: string | null
  faviconUrl?: string | null
  loginTitle?: string | null
  loginSubtitle?: string | null
  loginLogoUrl?: string | null
  darkMode?: DarkModeColors | null
}
