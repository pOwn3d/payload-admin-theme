# Changelog

All notable changes to `@consilioweb/payload-admin-theme` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-07

Theming actually applies again — the component that writes the CSS was registered nowhere in the
0.2.x line — and it now targets selectors that exist in Payload 3.7x. Also hardens write access to
the global and the custom-CSS filter, and finally renders the login-page fields.

### Breaking

- **Your admin panel will change appearance on upgrade.** `ThemeInjectorClient` — the only component
  that writes the CSS variables, the custom CSS, the favicon, the branding-hiding rules and the
  document title — was registered by no code path up to 0.2.2. One part of a 0.2.x install did have
  a visible effect: setting `faviconUrl` registered `AdminBranding` / `AdminIcon` as
  `admin.components.graphics`, so the nav showed `logoUrl` (or `brandName` as text) — while the
  `faviconUrl` that triggered it was itself never applied. Everything else stored in the global was
  inert. `ThemeInjectorClient` is now registered as its own `afterNavLinks` entry
  (`@consilioweb/payload-admin-theme/client#ThemeInjectorClient`, overridable with the new
  `themeInjectorClientPath`), which means whatever is already stored in the `admin-theme` global
  starts repainting the panel. Review the global before deploying; `enabled: false` or
  `skipComponentInjection: true` reproduces the 0.2.x (inert) behaviour.
- **Colors are mapped onto different CSS targets.** `primaryColor` no longer writes
  `--theme-success-500/400/600` nor `--theme-text-link`, `accentColor` no longer writes
  `--theme-warning-500/400/600`, and `sidebarColor` no longer writes `--nav-color`. They now write
  rules on `.btn--style-primary:not(.btn--disabled)`, `.btn--style-secondary:not(.btn--disabled)`,
  `.nav__link-indicator`, `:focus-visible`, `.nav` / `.nav .nav__scroll`, `.nav .nav-group__toggle`
  (which also receives `color: inherit` and `opacity: 0.65`) and
  `.nav .nav__link:hover, .nav .nav-group__toggle:hover` (a lightened sidebar background).
  `--nav-color` and `--theme-text-link` do not exist in Payload 3 and were inert; `--theme-success-*`
  was real, so "Primary Color" used to recolor success banners. If your `customCSS` or SCSS relied
  on `--theme-success-*` carrying the brand color, restate it explicitly in `customCSS`. These rules
  are unlayered while Payload ships its own inside `@layer payload-default`, so they win over
  Payload's regardless of specificity; `customCSS` is appended to the same stylesheet, so a host
  override of the sidebar hover now needs at least the specificity of `.nav .nav__link:hover`.
  `borderRadius` is *unchanged* — it still writes `--style-radius-s/m/l` on `:root`, nothing to
  migrate there.
- **`generateCSSVariables()` no longer returns a single `:root { … }` block.** It returns a full
  stylesheet (custom properties plus element rules). Host code that parsed, wrapped or concatenated
  its output must be reviewed. Use the new `generateThemeCSS(values, { scope })` for the dark-mode
  half; the README endpoint example is updated.
- **Peer dependencies rewritten.** `react` and `react-dom` move from `^18.0.0 || ^19.0.0` to
  `^19.0.1` (React 18 is no longer supported: `@payloadcms/ui` 3.79+ requires React 19).
  `peerDependenciesMeta` is gone, so `@payloadcms/ui`, `react` and `react-dom` are now required peers
  instead of `optional: true` — a strict package manager that installed silently will now report the
  missing peer. `@payloadcms/next`, `@payloadcms/translations` and `next` are removed from the peers
  entirely (the plugin never imports them); if you relied on this package to pin those versions, pin
  them in your own `package.json`.
- **`engines.node` narrowed** from `>=18` to `^18.20.2 || >=20.9.0`, aligned on Payload's own range.
  Node 18.0–18.19 and the whole 19.x branch are no longer declared supported; installs under
  `engine-strict` will fail there.
- **`skipComponentInjection: true` now also skips the nav link.** That option exists to avoid the
  plugin's component import paths on symlinked installs, and injecting `ThemeNavLink` anyway kept the
  exact import it is meant to avoid. Set `skipComponentInjection: false` and use `addNavLink` if you
  wanted only the nav link, or register `@consilioweb/payload-admin-theme/rsc#ThemeNavLink` yourself.
- **A `graphics.Logo` / `graphics.Icon` declared by the host is no longer overwritten.** The plugin
  now assigns them with `??=`. If you declared your own Logo *and* set `faviconUrl`, the plugin used
  to win silently — now yours does. Remove your own `graphics` entry to get the plugin's branding
  back. The trigger is also decoupled: the new `replaceBranding` option controls it, defaulting to
  `true` when `faviconUrl` is set so existing setups keep their current branding.
- **`hidePayloadBranding` has a visible effect for the first time.** It targeted `.nav__brand`,
  `.payload-icon` and `[class*="NavBrand"]`, none of which exist in Payload 3; it now hides
  `.graphic-logo` and `.graphic-icon`. As a plugin option it additionally sets
  `admin.meta.titleSuffix` (to `- <brandName>`, or `''`), so admin browser tabs lose the
  `- Payload` suffix. A `titleSuffix` already set by the host is never overwritten.
- **A component is appended to `admin.components.beforeLogin`** for every consumer that does not set
  `skipComponentInjection`. It renders `null` while `loginTitle`, `loginSubtitle` and `loginLogoUrl`
  are all empty, but it is appended *after* the host's own `beforeLogin` components, which changes
  that array's length and order.

### Security

- **Write access to the theme global is no longer granted by a substring match.** The default
  `access.update` used `req.user.roles?.includes('admin')`; `roles` is a plain string when declared
  as a non-`hasMany` `select`, so `String.prototype.includes` accepted `admin-readonly`, `non-admin`
  and `administrator`. It now requires an exact `'admin'` (string form) or membership in the array
  form, and requires the user to belong to the collection named by `admin.user` — another auth
  collection with a `roles` field of its own no longer qualifies. Anyone holding that global's
  `update` right can inject CSS into every admin page, so users who lose access here were holding
  more than a styling permission. Restore a broader rule explicitly via the `access.update` option
  if you depended on it.
- **The custom-CSS blocklist is no longer bypassable with CSS escapes.** `@import` and `url()` could
  be smuggled past the filter written as `@\69 mport` / `u\72 l(…)`, which let a user with `update`
  access make every admin page load a remote resource — enough to exfiltrate what attribute
  selectors can observe. Values are now stripped of comments and un-escaped before scanning, and
  `image-set(` and `behavior:` were added to the blocklist. Custom CSS you saved before that used
  those constructs will be rejected on its next save. This filter is hardening, not a sandbox — the
  README now says so.

### Added

- Login page branding: `loginTitle`, `loginSubtitle` and `loginLogoUrl` are finally rendered, by a
  new `LoginBranding` server component exported from `@consilioweb/payload-admin-theme/rsc` and
  registered in `admin.components.beforeLogin`. Path overridable with `loginBrandingPath`.
- `replaceBranding` option — replace the admin Logo/Icon independently of `faviconUrl`.
- `themeInjectorClientPath` option — override the client injector path, needed for `link:` installs
  alongside the existing `themeInjectorPath`.
- `generateThemeCSS(values, options?)` and the `ThemeCSSOptions` type, exported from the package
  root. `options.scope` prefixes the generated rules, which is how the `[data-theme="dark"]` block
  is produced.
- Foreground colors are now computed from the background's WCAG relative luminance: primary button
  labels and sidebar text take whichever of black or white has the better contrast ratio, switching
  at L ≈ 0.179 rather than at the naive L = 0.5 (a fixed white label leaves `#0EA5E9` at 2.77:1
  where black gives 7.58:1). It is a best-of-two, not a promise of WCAG AA: a background whose
  better option is still under 4.5:1 cannot be fixed by the foreground alone.
- A Vitest suite (74 tests across `plugin`, `cssVariables`, `presets`, `adminThemeGlobal` and button
  contrast) plus `scripts/check-build-artifacts.mjs`, run by `pnpm build`, which fails the build when
  a `"use client"` directive lands on the wrong artifact or an `exports` subpath points at a file
  tsup never emitted.
- GitHub Actions: `ci.yml` runs typecheck, tests and build on Node 20 and 22 for every push and pull
  request; `publish.yml` publishes on a `v*` tag with `--provenance`, so releases from 0.3.0 on carry
  an npm provenance attestation.

### Changed

- `invalidateThemeCache(slug?)` now takes an optional slug; without an argument it clears every
  cached global as before.

### Fixed

- `globalSlug` is now honoured end to end. `AdminBranding` and `AdminIcon` called
  `fetchTheme('admin-theme')` literally, and `ThemeNavLink` — which does accept a `globalSlug` prop —
  was registered by the plugin as a bare path string with no `clientProps`, so its `'admin-theme'`
  default applied. A custom `globalSlug` therefore produced a nav link pointing at a non-existent
  `/admin/globals/admin-theme` and a logo that never loaded. Every component entry is now registered
  with `clientProps: { globalSlug }`, `ThemeInjectorClient` included — it used to read the slug from
  the `[data-admin-theme-slug]` marker rendered by the RSC, which is kept as the fallback for hosts
  that mount it by hand.
- The theme cache held a single slot for all slugs, so with more than one global the first response
  was served to every later caller. It is now keyed by slug.
- `getPresetColors()` answered for inherited object keys — `getPresetColors('toString')` returned
  `Object.prototype.toString` as if it were a preset — and handed back the internal preset object, so
  a caller mutating it poisoned that preset for the whole process. It now checks own properties and
  returns a copy.
- The plugin wrote `admin.components.graphics` in place on the incoming config; `graphics` and
  `admin.meta` are now cloned, so the config object you pass in is left untouched.
- Build artifacts: `"use client"` was prepended to every `.js` under `dist/components/`, including
  the output of the RSC pass, turning `ThemeInjector` and `ThemeNavLink` into client components and
  defeating the point of the `./rsc` entrypoint. The directive is now applied to an explicit file
  list — the directory walk was also racy, since tsup runs the three passes concurrently.
- README corrections: it documented a `presets` option that does not exist in
  `AdminThemePluginConfig`, listed preset hex values none of the four presets ever used (Blue
  Professional is `#2563EB` / `#0EA5E9`, not `#3B82F6` / `#10B981`), advertised "server-side
  rendering — no client-side flicker" and an `AdminThemeContext` that the code does not implement,
  and announced React 18 and Next.js 14 support.

## [0.2.0] - 2026-04-08

### Added
- Dark mode support with dedicated color fields (`[data-theme="dark"]`)
- 4 theme presets (Blue Professional, Dark Minimal, Green Nature, Purple Creative)
- `AdminThemeContext` — single fetch shared across all components (eliminates triple fetch)
- Dynamic `globalSlug` propagation (no more hardcoded 'admin-theme')
- CSS injection validation (rejects @import, url(), expression(), javascript:, script tags)
- Hex color validation on all color fields
- URL validation on logo/favicon fields (only /, https://, data:image/)
- Configurable access control with admin-only default
- `colorUtils.ts` — deduplicated hexToRgb/lighten/darken functions
- `AdminThemeData` type exported from types.ts

### Changed
- Deep clone of config in plugin.ts (prevents mutation of original config)
- Catch blocks now log warnings instead of silently failing

## [0.1.0] - 2026-03-10

### Added
- Initial release
- Color theming with built-in color picker fields
- Brand customization (name, logo, favicon)
- Login page customization (title, subtitle, logo)
- CSS variable injection overriding Payload's default theme
- Custom CSS injection from admin panel
- Hide Payload branding option
- Nav link in admin sidebar
- Server-side rendering (no client-side flicker)

[0.3.0]: https://github.com/pOwn3d/payload-admin-theme/compare/v0.2.2...v0.3.0
[0.2.0]: https://github.com/pOwn3d/payload-admin-theme/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pOwn3d/payload-admin-theme/releases/tag/v0.1.0
