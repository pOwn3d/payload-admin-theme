# Changelog

All notable changes to `@consilioweb/payload-admin-theme` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/pOwn3d/payload-admin-theme/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pOwn3d/payload-admin-theme/releases/tag/v0.1.0
