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
 *
 * SETTLED — DO NOT RE-EXPLORE: writing the `--color-base-0…1000` scale.
 *
 * The recurring idea is to stop writing individual rules and instead generate
 * Payload's whole neutral ramp from the brand color by interpolating in OKLCH,
 * letting Payload's own dark mode invert it for free. It was re-checked against
 * the stylesheets shipped by @payloadcms/ui 3.88.0 and it does not work. Three
 * facts, each sufficient on its own:
 *
 *  1. THE RAMP IS ALSO THE TEXT COLOR. `scss/app.scss:21` sets
 *     `--theme-text: var(--theme-elevation-800)` and `scss/colors.scss:183`
 *     aliases `--theme-elevation-800` to `--color-base-800`. Writing the scale
 *     therefore recolors every piece of body text in the panel — the exact
 *     failure mode the `.btn--style-*` local properties above exist to avoid.
 *  2. ONE STEP, TWO OPPOSITE ROLES. `--theme-elevation-800` is used 49 times in
 *     those stylesheets, as a FOREGROUND (`scss/type.scss:108`,
 *     `elements/Pill/index.scss:13`, `scss/toasts.scss:44`) AND as a SURFACE
 *     (`elements/Tooltip/index.scss:8`, whose own text is
 *     `--theme-elevation-0` at line 12; `elements/Drawer/index.scss:74`;
 *     `elements/Pill/index.scss:132`). A single generated value would have to
 *     be readable ON elevation-0 and readable UNDER elevation-0 at once.
 *     Payload's greyscale gets away with it because it is symmetric around the
 *     mid step; a ramp built from one brand hue is not.
 *  3. DARK MODE IS NOT AN INVERSION. `scss/colors.scss:189-212` is a hand-made
 *     mapping, not a mirror: `--theme-elevation-900`, `-950` and `-1000` ALL
 *     collapse onto `--color-base-0`, and `--theme-elevation-500` is not
 *     remapped at all. So in dark mode `--theme-text` (`app.scss:78`, elevation
 *     1000) resolves to `--color-base-0` — the very step that is the page
 *     BACKGROUND in light mode (`--theme-bg: var(--theme-elevation-0)`).
 *     One generated value, background in one theme and body text in the other:
 *     no interpolation can satisfy both.
 *
 * `--color-base-*` is consumed almost exclusively through the
 * `--theme-elevation-*` aliases (3 direct uses in the whole package:
 * `app.scss:84`, `:88`, `elements/Drawer/index.scss:132`), so there is no
 * halfway version of this either. The targeted rules below stay.
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
