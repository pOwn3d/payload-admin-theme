/**
 * Shared color utility functions for admin theme plugin.
 * Used by both server-side CSS generation and client-side theme injection.
 */

/**
 * Convert a hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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
 * Lighten a hex color by a given amount (0-1)
 */
export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount))
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount))
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Darken a hex color by a given amount (0-1)
 */
export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)))
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)))
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Relative luminance of a hex color, per WCAG 2.1.
 * Returns null when the color cannot be parsed.
 */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const channel = (value: number): number => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

/**
 * Contrast ratio between two relative luminances, per WCAG 2.1.
 */
export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Pick a readable foreground for a background color.
 *
 * The plugin paints Payload's primary button and (optionally) the nav with a
 * user-chosen color; leaving the foreground alone makes dark brand colors
 * unreadable. Black and white are compared on their real WCAG contrast ratio
 * against the background and the better of the two wins.
 *
 * The switch point that comes out of this is L ~= 0.179 — the root of
 * (L + 0.05)^2 = 1.05 * 0.05 — NOT L = 0.5. A 0.5 threshold sends every
 * mid-range brand color to white text: #0EA5E9 lands at 2.77:1 (black would
 * give 7.58:1), #16A34A at 3.30:1, #F59E0B at 2.15:1, all under the 4.5:1 of
 * WCAG AA. This function makes no promise beyond "the better of the two":
 * a background whose best option is still below AA (mid-greys around
 * L = 0.18 top out at ~3.1:1) cannot be fixed by the foreground alone.
 */
export function readableTextColor(hex: string): string {
  const luminance = relativeLuminance(hex)
  if (luminance === null) return '#FFFFFF'
  const onBlack = contrastRatio(luminance, 0)
  const onWhite = contrastRatio(luminance, 1)
  return onBlack >= onWhite ? '#000000' : '#FFFFFF'
}
