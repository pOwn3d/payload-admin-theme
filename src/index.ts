// Server-side exports — plugin, types, globals, utils
export { adminThemePlugin } from './plugin.js'
export { createAdminThemeGlobal } from './globals/AdminTheme.js'
export { generateCSSVariables, generateThemeCSS } from './utils/cssVariables.js'
export { getPresetColors } from './utils/presets.js'

// Types
export type { AdminThemePluginConfig, AdminThemeData, ThemePreset, DarkModeColors } from './types.js'
export type { ThemeValues, ThemeCSSOptions } from './utils/cssVariables.js'
