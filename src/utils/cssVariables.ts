/**
 * Utility to generate CSS custom properties from admin theme config.
 * Maps plugin color values to Payload's internal CSS variables.
 */

export interface ThemeValues {
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
  borderRadius?: number | null
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

/**
 * Lighten a hex color by a given amount (0–1)
 */
function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount))
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount))
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount))

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Darken a hex color by a given amount (0–1)
 */
function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const r = Math.max(0, Math.round(rgb.r * (1 - amount)))
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)))
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)))

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
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
