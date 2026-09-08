/**
 * Resolving the localized strings Payload hands to a custom field component.
 *
 * `field.label` and `field.admin.description` are either a plain string or a
 * `{ en, fr }` record (that is how this plugin declares them in
 * globals/AdminTheme.ts). ColorPickerField needs more than the text: to name
 * the color swatch for a screen reader it has to append a word of its own, and
 * that word has to be in the same language as the label it sits next to.
 * Returning the locale that was picked is what makes that possible without
 * reaching for a translation provider.
 */

export type LocalizedValue = unknown

/** The locales this plugin declares labels in, in resolution order. */
export const SUPPORTED_LOCALES = ['fr', 'en'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export interface ResolvedLabel {
  /** The text to display. Empty string when there is nothing to show. */
  text: string
  /**
   * Which key of the record the text came from, or `null` for a plain string
   * (and for an empty result), where the language is unknown.
   */
  locale: SupportedLocale | null
}

const EMPTY: ResolvedLabel = { text: '', locale: null }

/**
 * Resolve a Payload label/description value to a string plus its locale.
 *
 * Records are read `fr` first then `en`, which is the order the previous
 * inline expression used; keeping it avoids changing what is on screen today.
 * Anything that is not a string or a record of strings resolves to empty
 * rather than to `String(value)` — a `[object Object]` in a `<label>` is worse
 * than no label at all.
 */
export function resolveLabel(value: LocalizedValue): ResolvedLabel {
  if (typeof value === 'string') {
    return value ? { text: value, locale: null } : EMPTY
  }

  if (!value || typeof value !== 'object') return EMPTY

  const record = value as Record<string, unknown>
  for (const locale of SUPPORTED_LOCALES) {
    const candidate = record[locale]
    if (typeof candidate === 'string' && candidate) {
      return { text: candidate, locale }
    }
  }

  return EMPTY
}

/**
 * Suffix appended to a field label to name a color swatch.
 *
 * ColorPickerField paints two controls over the same value — a text input and
 * an `<input type="color">` — and they are two separate nodes in the
 * accessibility tree. Giving them the same name makes a screen reader announce
 * "Primary Color, edit text" twice with no way to tell them apart, so the
 * swatch gets a name of its own, in the language the label resolved to.
 */
const COLOR_PICKER_SUFFIX: Record<SupportedLocale, string> = {
  en: 'color picker',
  fr: 'selecteur de couleur',
}

/**
 * Accessible name for the color swatch: the field label plus the suffix, or
 * the suffix alone (capitalised) when the field declares no label.
 */
export function colorPickerLabel(label: string, locale: SupportedLocale | null): string {
  const suffix = COLOR_PICKER_SUFFIX[locale ?? 'en']
  if (!label) return suffix.charAt(0).toUpperCase() + suffix.slice(1)
  return `${label} \u2014 ${suffix}`
}
