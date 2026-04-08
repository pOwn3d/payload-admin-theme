import type { ThemePreset } from '../types.js'

interface PresetColors {
  primaryColor: string
  accentColor: string
  sidebarColor: string
}

/**
 * Built-in theme presets with curated color combinations.
 * When preset is not 'custom', these colors override individual field values.
 */
const PRESETS: Record<Exclude<ThemePreset, 'custom'>, PresetColors> = {
  'blue-professional': {
    primaryColor: '#2563EB',
    accentColor: '#0EA5E9',
    sidebarColor: '#1E293B',
  },
  'dark-minimal': {
    primaryColor: '#A855F7',
    accentColor: '#EC4899',
    sidebarColor: '#0F0F0F',
  },
  'green-nature': {
    primaryColor: '#16A34A',
    accentColor: '#84CC16',
    sidebarColor: '#1A2E1A',
  },
  'purple-creative': {
    primaryColor: '#8B5CF6',
    accentColor: '#F59E0B',
    sidebarColor: '#1E1B3A',
  },
}

/**
 * Get colors for a given preset.
 * Returns null for 'custom' or unknown presets (use individual field values instead).
 */
export function getPresetColors(preset: ThemePreset | null | undefined): PresetColors | null {
  if (!preset || preset === 'custom') return null
  return PRESETS[preset] ?? null
}
