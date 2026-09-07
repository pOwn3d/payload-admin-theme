/**
 * Utility to generate the CSS the plugin injects into the Payload admin panel.
 *
 * Every selector and custom property written here was checked against the
 * stylesheets actually shipped by @payloadcms/ui and @payloadcms/next (3.7x+):
 *
 *  - `.btn--style-primary` / `.btn--style-secondary` read the local
 *    `--bg-color`, `--hover-bg`, `--color`, `--hover-color` and `--btn-border`
 *    properties. Overriding those repaints the buttons WITHOUT touching
 *    `--theme-elevation-800`, which Payload also aliases to `--theme-text`
 *    (writing that variable would recolor every piece of body text).
 *  - The button rules MUST carry `:not(.btn--disabled)`. Payload expresses the
 *    disabled state through those very same local properties
 *    (`.btn--style-primary.btn--disabled { --bg-color: var(--theme-elevation-200); ... }`)
 *    and ships all of its CSS inside `@layer payload-default`. This stylesheet
 *    is injected unlayered, and in the cascade an unlayered normal declaration
 *    beats a layered one BEFORE specificity is even considered — so a bare
 *    `.btn--style-primary` here would override the more specific `.btn--disabled`
 *    variant and repaint disabled Save/Create/Publish buttons with the brand
 *    color, hover included. The `:not()` restricts us to the enabled state.
 *  - `.nav` carries no background of its own, it inherits `--theme-bg`, so the
 *    sidebar color has to be a real rule.
 *  - `--nav-color` and `--theme-text-link` do NOT exist anywhere in Payload's
 *    CSS. They were the previous targets of `sidebarColor` and `primaryColor`
 *    and were silently inert.
 *  - `--theme-success-*` / `--theme-warning-*` do exist but carry the
 *    success/warning semantics (banners, toasts), which is why "Primary Color"
 *    used to recolor success banners instead of the primary button.
 */

import { darken, lighten, readableTextColor } from './colorUtils.js'

export interface ThemeValues {
  primaryColor?: string | null
  accentColor?: string | null
  sidebarColor?: string | null
  borderRadius?: number | null
}

export interface ThemeCSSOptions {
  /**
   * Selector the generated rules are scoped to.
   * Empty string (default) targets light mode; `'[data-theme="dark"]'` targets
   * Payload's dark mode. Rules are prefixed rather than nested so the output
   * stays plain CSS (no CSS Nesting requirement).
   */
  scope?: string
}

/**
 * Generate the CSS block for one set of theme values.
 * Returns an empty string when nothing is configured.
 */
export function generateThemeCSS(values: ThemeValues, options: ThemeCSSOptions = {}): string {
  const scope = options.scope ?? ''
  // `:root` in light mode, the scope selector itself in dark mode.
  const rootSelector = scope === '' ? ':root' : scope
  // Descendant prefix for element rules.
  const prefix = scope === '' ? '' : `${scope} `

  const rootVars: string[] = []
  const rules: string[] = []

  if (values.borderRadius != null) {
    rootVars.push(`--style-radius-s: ${values.borderRadius}px`)
    rootVars.push(`--style-radius-m: ${values.borderRadius + 2}px`)
    rootVars.push(`--style-radius-l: ${values.borderRadius + 4}px`)
  }

  if (values.primaryColor) {
    const primary = values.primaryColor
    const primaryHover = darken(primary, 0.12)
    const onPrimary = readableTextColor(primary)

    rules.push(
      `${prefix}.btn--style-primary:not(.btn--disabled) {\n` +
        `  --bg-color: ${primary};\n` +
        `  --hover-bg: ${primaryHover};\n` +
        `  --color: ${onPrimary};\n` +
        `  --hover-color: ${onPrimary};\n` +
        `}`,
    )
    rules.push(
      `${prefix}.btn--style-secondary:not(.btn--disabled) {\n` +
        `  --color: ${primary};\n` +
        `  --btn-border: 1px solid ${primary};\n` +
        `  --hover-color: ${primaryHover};\n` +
        `  --hover-btn-border: 1px solid ${primaryHover};\n` +
        `}`,
    )
  }

  if (values.accentColor) {
    const accent = values.accentColor
    // `.nav__link-indicator` is the active-item marker of the sidebar and
    // `:focus-visible` outlines are the other place a highlight color reads as
    // an accent. Both exist in Payload's stylesheets.
    rules.push(`${prefix}.nav__link-indicator {\n  background-color: ${accent};\n}`)
    rules.push(`${prefix}:focus-visible {\n  outline-color: ${accent};\n}`)
  }

  if (values.sidebarColor) {
    const sidebar = values.sidebarColor
    // `.nav` has no background of its own; the text color has to follow or a
    // dark sidebar on a light theme becomes unreadable.
    rules.push(
      `${prefix}.nav,\n${prefix}.nav .nav__scroll {\n` +
        `  background-color: ${sidebar};\n` +
        `  color: ${readableTextColor(sidebar)};\n` +
        `}`,
    )
    // `.nav-group__toggle` pins its own `color: var(--theme-elevation-400)`,
    // so it does not inherit the rule above and stays grey on a dark sidebar.
    rules.push(
      `${prefix}.nav .nav-group__toggle {\n  color: inherit;\n  opacity: 0.65;\n}`,
    )
    rules.push(
      `${prefix}.nav .nav__link:hover,\n${prefix}.nav .nav-group__toggle:hover {\n` +
        `  background-color: ${lighten(sidebar, 0.1)};\n` +
        `  opacity: 1;\n` +
        `}`,
    )
  }

  const blocks: string[] = []
  if (rootVars.length > 0) {
    blocks.push(`${rootSelector} {\n  ${rootVars.join(';\n  ')};\n}`)
  }
  blocks.push(...rules)

  return blocks.join('\n\n')
}

/**
 * Generate a CSS string with the Payload admin custom properties mapped from
 * the plugin theme values (light mode).
 *
 * Kept for the server-side CSS endpoint documented in the README.
 * @see generateThemeCSS for the dark-mode variant.
 */
export function generateCSSVariables(values: ThemeValues): string {
  return generateThemeCSS(values)
}
