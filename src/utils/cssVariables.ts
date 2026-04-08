/**
 * Utility to generate CSS custom properties from admin theme config.
 * Maps plugin color values to Payload's internal CSS variables.
 */

import { lighten, darken } from './colorUtils.js'

export interface ThemeValues {
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
  borderRadius?: number | null
}

/**
 * Generate a CSS string with Payload admin CSS custom properties
 * mapped from the plugin theme values.
 */
export function generateCSSVariables(values: ThemeValues): string {
  const vars: string[] = []

  if (values.primaryColor) {
    const primary = values.primaryColor
    // Payload uses --theme-elevation-* for surface colors
    // and various color tokens for interactive elements
    vars.push(`--theme-success-500: ${primary}`)
    vars.push(`--theme-text-link: ${primary}`)

    // Generate lighter/darker variants
    vars.push(`--theme-success-400: ${lighten(primary, 0.15)}`)
    vars.push(`--theme-success-600: ${darken(primary, 0.15)}`)
  }

  if (values.accentColor) {
    vars.push(`--theme-warning-500: ${values.accentColor}`)
    vars.push(`--theme-warning-400: ${lighten(values.accentColor, 0.15)}`)
    vars.push(`--theme-warning-600: ${darken(values.accentColor, 0.15)}`)
  }

  if (values.sidebarColor) {
    vars.push(`--nav-color: ${values.sidebarColor}`)
  }

  if (values.borderRadius != null) {
    vars.push(`--style-radius-s: ${values.borderRadius}px`)
    vars.push(`--style-radius-m: ${values.borderRadius + 2}px`)
    vars.push(`--style-radius-l: ${values.borderRadius + 4}px`)
  }

  if (vars.length === 0) return ''

  return `:root {\n  ${vars.join(';\n  ')};\n}`
}
