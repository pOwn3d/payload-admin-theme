# @consilioweb/payload-admin-theme

> Payload CMS 3 plugin that restyles the admin panel — colors, branding, logo, login page and custom CSS — from a global edited in the admin UI.

[![npm](https://img.shields.io/npm/v/@consilioweb/payload-admin-theme.svg)](https://www.npmjs.com/package/@consilioweb/payload-admin-theme)
[![license](https://img.shields.io/npm/l/@consilioweb/payload-admin-theme.svg)](./LICENSE)
[![Payload](https://img.shields.io/badge/Payload-3.x-000000.svg)](https://payloadcms.com)

> [!IMPORTANT]
> **Next.js 16 + Turbopack — known Payload issue**
>
> With **Next.js 16** and Turbopack (the default bundler), `next build` can fail with `createContext is not a function`. This is a [known Payload CMS issue](https://github.com/payloadcms/payload/issues/15429) ([discussion](https://github.com/payloadcms/payload/discussions/14330)), not specific to this plugin.
>
> Workaround — in your admin page (`src/app/(payload)/admin/[[...segments]]/page.tsx`):
> ```ts
> export const dynamic = 'force-dynamic'
> ```
>
> And list your `@consilioweb/*` packages in `transpilePackages` in `next.config.ts`:
> ```ts
> transpilePackages: ['@consilioweb/payload-admin-theme' /* ...other @consilioweb packages */]
> ```
>
> Next.js 15 works without any workaround.

## About

Payload 3 offers no supported way to recolor the admin panel short of writing SCSS and rebuilding.
This plugin adds an `admin-theme` global whose fields — colors, border radius, logo, favicon, login
copy, custom CSS — are compiled into a single `<style>` element injected on every admin page, with no
rebuild. The generated rules target selectors that `@payloadcms/ui` / `@payloadcms/next` 3.7x actually
ship, and writing the global is admin-only by default, because custom CSS is a developer-level
capability rather than a sandbox.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Theme Presets](#theme-presets)
- [The `admin-theme` Global](#the-admin-theme-global)
- [Custom CSS](#custom-css)
- [What Gets Repainted](#what-gets-repainted)
- [Package Exports](#package-exports)
- [Manual Registration](#manual-registration)
- [Server-Side CSS Endpoint](#server-side-css-endpoint)
- [Requirements](#requirements)
- [Upgrading from 0.2.x](#upgrading-from-02x)
- [Support](#support)
- [License](#license)

## Features

- **Colors** — primary, accent and sidebar colors, with a built-in color picker field
- **Dark mode** — three optional colors emitted under `[data-theme="dark"]`
- **4 presets** — Blue Professional, Dark Minimal, Green Nature, Purple Creative
- **Readable foregrounds** — primary button labels and sidebar text are the better of black/white by WCAG relative luminance, not a fixed white
- **Branding** — brand name, logo and favicon; optionally hides Payload's own logo and the `- Payload` title suffix
- **Login page** — title, subtitle and logo rendered above the login form
- **Custom CSS** — extra rules written from the admin panel, filtered by a blocklist
- **Nav link** — a sidebar link to the theme global (label hardcoded as `Thème`)
- **Single fetch** — one request per global slug and per read scope, shared by every component through a module-level cache (no React Context, Turbopack-safe)
- **Validation** — hex format on every color field, URL scheme on the logo/favicon/login-logo fields, blocklist on custom CSS

## Installation

```bash
pnpm add @consilioweb/payload-admin-theme
# or
npm install @consilioweb/payload-admin-theme
```

All four peer dependencies are required (none is optional since 0.3.0); a Payload 3 project already
has them:

```bash
pnpm add payload@^3.79.1 @payloadcms/ui@^3.79.1 react@^19.0.1 react-dom@^19.0.1
```

3.79.1 is a hard floor, not a preference: earlier Payload 3 releases are vulnerable to
GHSA-hp5w-3hxx-vmwf (pre-auth account takeover) and to the SQL injection fixed in the same round. See
[Requirements](#requirements).

## Quick Start

```ts
import { buildConfig } from 'payload'
import { adminThemePlugin } from '@consilioweb/payload-admin-theme'

export default buildConfig({
  plugins: [
    adminThemePlugin({
      brandName: 'My Company',
      primaryColor: '#3B82F6',
      accentColor: '#10B981',
    }),
  ],
})
```

The plugin adds an **Admin Theme** global (group **Settings**) where every setting can then be changed
live. The colors passed above are the *default values* of that global's fields — once the global has
been saved, the stored values are what gets applied.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | `false` returns the incoming config untouched — no global, no component |
| `globalSlug` | `string` | `'admin-theme'` | Slug of the global the plugin creates and every component reads |
| `brandName` | `string` | `''` | Default value of the global's Brand Name field; also used for the title suffix when `hidePayloadBranding` is set |
| `primaryColor` | `string` | `'#3B82F6'` | Default value of the Primary Color field |
| `accentColor` | `string` | `'#10B981'` | Default value of the Accent Color field |
| `sidebarColor` | `string` | `''` | Default value of the Sidebar Color field |
| `borderRadius` | `number` | `8` | Default value of the Border Radius field (0–50) |
| `faviconUrl` | `string` | `''` | Default value of the Favicon URL field; also the legacy trigger for `replaceBranding` |
| `customCSS` | `string` | `''` | Default value of the Custom CSS field |
| `hidePayloadBranding` | `boolean` | `false` | Default value of the checkbox; as a plugin option it also sets `admin.meta.titleSuffix` (to `- <brandName>`, or `''`), never overwriting one the host already set |
| `addNavLink` | `boolean` | `true` | Append the nav link to `afterNavLinks`. Its label is hardcoded in French (`Thème`); override `navLinkPath` to change it |
| `replaceBranding` | `boolean` | `true` when `faviconUrl` is set | Assign `admin.components.graphics.Logo` / `.Icon` to the components that read `logoUrl` from the global. Graphics already declared by the host are never overwritten |
| `skipComponentInjection` | `boolean` | `false` | Create the global only — no `afterNavLinks`, no nav link, no `beforeLogin`, no `graphics`. See [Manual Registration](#manual-registration) |
| `colorPickerComponent` | `string \| false` | `'@consilioweb/payload-admin-theme/client#ColorPickerField'` | Custom Field component for the color fields; `false` leaves them as plain text inputs |
| `access` | `{ read?, update? }` | read: everyone, update: admin-only | Document-level access control for the global. Each is `(args: { req }) => boolean \| Promise<boolean>`. The field-level `read` guard described in [The `admin-theme` Global](#the-admin-theme-global) applies on top of `read` and is not overridable |
| `themeInjectorPath` | `string` | `'@consilioweb/payload-admin-theme/rsc#ThemeInjector'` | Override the RSC marker component path (needed with `link:` packages) |
| `themeInjectorClientPath` | `string` | `'@consilioweb/payload-admin-theme/client#ThemeInjectorClient'` | Override the client injector path (needed with `link:` packages) |
| `loginBrandingPath` | `string` | `'@consilioweb/payload-admin-theme/rsc#LoginBranding'` | Override the login branding component path (needed with `link:` packages) |
| `navLinkPath` | `string` | `'@consilioweb/payload-admin-theme/rsc#ThemeNavLink'` | Override the nav link component path (needed with `link:` packages) |

There is no `presets` option: the four presets are always available and are picked from the **Theme
Preset** select in the admin UI.

### Dark mode

The global carries a **Dark Mode Overrides** group with its own primary, accent and sidebar colors.
When at least one of them is filled in, the same rules are emitted a second time prefixed with
`[data-theme="dark"]`. Border radius is not part of that block — it is written once on `:root` and
applies to both themes. Dark mode colors are edited in the admin UI only; there is no plugin option
for them.

## Theme Presets

Four built-in presets, applied with one click from the **Theme Preset** select:

| Preset | Primary | Accent | Sidebar |
|--------|---------|--------|---------|
| Blue Professional | `#2563EB` | `#0EA5E9` | `#1E293B` |
| Dark Minimal | `#A855F7` | `#EC4899` | `#0F0F0F` |
| Green Nature | `#16A34A` | `#84CC16` | `#1A2E1A` |
| Purple Creative | `#8B5CF6` | `#F59E0B` | `#1E1B3A` |

Selecting anything other than **Custom** makes the preset colors win over the three individual color
fields. That resolution lives in the client injector and covers the light-mode trio only: the **Dark
Mode Overrides** are always read from their own fields, and `generateThemeCSS()` performs none of it
— it expects colors that are already resolved (see
[Server-Side CSS Endpoint](#server-side-css-endpoint)). `getPresetColors(preset)` is exported from the
package root and returns a copy of those values, or `null` for `'custom'` and unknown presets.

## The `admin-theme` Global

| Slug | Role | Read | Update |
|------|------|------|--------|
| `admin-theme` (`globalSlug`) | Holds every theme value; label **Admin Theme**, group **Settings** | Everyone, by default — but most **fields** are restricted, see below | Logged-in users of the admin panel's own collection holding an `admin` role — exact rule below |

The default `update` rule accepts a logged-in user whose `role` is exactly `'admin'`, or whose
`roles` is exactly `'admin'` (string field) or contains `'admin'` (array field) — and, when the config
exposes `admin.user`, who belongs to that collection. A user collection carrying neither a `role` nor
a `roles` field never satisfies it: pass your own `access.update` there, or nobody will be able to
save the global.

Both rules are replaceable through the `access` option.

### Which fields an anonymous request gets back

The document is readable without a session because `AdminBranding` / `AdminIcon`
(`admin.components.graphics`) fetch `/api/globals/<slug>` from the browser **while the login page is
displayed**. Only what that unauthenticated render needs is left in the anonymous response:

| Readable by anyone | Readable by admin-panel users only |
|---|---|
| `brandName`, `logoUrl` — the login-page logo | `preset`, `primaryColor`, `accentColor`, `sidebarColor`, `borderRadius`, `faviconUrl`, `darkMode`, `hidePayloadBranding`, **`customCSS`** |
| `loginTitle`, `loginSubtitle`, `loginLogoUrl` — already printed above the login form | |

The restricted column carries a field-level `access.read` that accepts a logged-in user **belonging
to the collection Payload uses for the admin panel** (`config.admin.user`) — not merely any
authenticated user, since a host may run other auth collections (front-office customers, support
agents) that have no business reading the admin's stylesheet. No role is required: an editor still
gets their admin themed, and anyone who can `update` the global can read every field it writes back.
When the config declares no `admin.user`, any authenticated user passes.

`customCSS` is the reason this matters: it is a developer-written stylesheet, and it routinely names
internal collection slugs, unreleased `data-*` hooks or staging URLs in its comments.

The field guard is not removed by passing your own `access.read`: that option widens or narrows the
**document** rule, the per-field rule always applies on top of it. Server-side readers are
unaffected — `payload.findGlobal()` from the local API runs with `overrideAccess: true` and still
sees the whole document, which is how `LoginBranding` renders.

That last point is the one to keep in mind if you build your own route on top of the global: the
field guard protects `/api/globals/<slug>`, not a route of yours that re-publishes what the local
API handed it. See [Server-Side CSS Endpoint](#server-side-css-endpoint), whose example gates the
route on a session for exactly that reason.

The guard accepts a user who could actually open the panel, not merely one stored in the right
collection: when the admin collection declares an `access.admin` function — the usual way to run one
`users` collection for both the public site and the admin — that function is evaluated too, so a
front-office account it turns away is turned away here as well. The default `update` rule applies the
same two layers on top of its role check.

| Field | Type | Effect |
|-------|------|--------|
| `preset` | select | `custom` (default) or one of the four presets; a preset overrides the three color fields |
| `brandName` | text | Prepended to `document.title`; rendered as text when `logoUrl` is empty and the plugin owns the admin graphics |
| `primaryColor` | text (hex) | Primary and secondary buttons |
| `accentColor` | text (hex) | Active nav marker and focus outlines |
| `sidebarColor` | text (hex) | Sidebar background, text and hover state |
| `borderRadius` | number (0–50) | `--style-radius-s/m/l` |
| `logoUrl` | text (URL) | Admin logo and icon, when the plugin owns `admin.components.graphics`. Left empty, the logo falls back to `brandName` as text while the icon renders nothing |
| `faviconUrl` | text (URL) | `href` of `link[rel="icon"]` |
| `loginTitle`, `loginSubtitle`, `loginLogoUrl` | text (collapsible **Login Page**) | Rendered above the login form; nothing is added when all three are empty |
| `darkMode.primaryColor`, `.accentColor`, `.sidebarColor` | group **Dark Mode Overrides** | Same rules, scoped to `[data-theme="dark"]` |
| `hidePayloadBranding` | checkbox | Hides `.graphic-logo` and `.graphic-icon` |
| `customCSS` | textarea | Appended verbatim to the injected stylesheet |

URL fields only accept a value starting with `/`, `https://` or `data:image/`. Color fields only
accept `#RGB` or `#RRGGBB`.

The theme is fetched once per full page load and kept in a module-level cache for the rest of that
browsing session, so soft navigations reuse it: changes saved in the global appear after a hard
reload. When that request fails — network error, or a `read` rule that denies the logged-in user —
nothing is applied and the browser console carries `[admin-theme] Failed to fetch theme data:`; the
failed request is dropped from the cache, so the next component mount retries it.

That cache is keyed by slug **and by read scope**, because the login page and the themed admin do
not get the same document back from the same URL. `AdminBranding` / `AdminIcon` ask for the
`branding` scope and are answered without a session — the field guard above strips the rest.
`ThemeInjectorClient` asks for the `full` scope from inside the admin. Payload's login is a
client-side navigation, so nothing reloads the JS module graph: with a single slot, the stripped
anonymous document read on the login page would have been handed straight to the injector and the
admin would have stayed unthemed until a manual refresh. A `full` payload that comes back stripped
anyway is returned to its caller but never memoised, so the next mount re-reads it.

## Custom CSS

The **Custom CSS** textarea is injected verbatim into the `<style>` element the plugin adds to every
admin page. Treat it as a developer-level capability, not as a sandbox:

- writing it requires the `update` access of the global, which is **admin-only by default** — see
  [The `admin-theme` Global](#the-admin-theme-global) for exactly what that rule accepts;
- a blocklist rejects the constructs that fetch remote resources or execute code — `@import`,
  `url()`, `image-set()`, `expression()`, `javascript:`, `-moz-binding`, `behavior:`, `</style`,
  `<script` — after CSS comments and `\`-escape sequences have been resolved, so `@\69 mport` and
  `u\72 l(…)` are caught too;
- it does **not** stop everything CSS can do. A full-page `position: fixed` overlay is valid CSS and
  is accepted. Only give the `admin` role to people you would give a deploy key to.

Set a stricter guard with the `access` option if that is not the trade-off you want:

```ts
adminThemePlugin({
  access: {
    update: ({ req }) => req.user?.email === 'owner@example.com',
  },
})
```

## What Gets Repainted

The plugin writes a single `<style id="admin-theme-variables">` element into `<head>` on every admin
page. Every selector below exists in the stylesheets shipped by `@payloadcms/ui` / `@payloadcms/next`
3.7x.

| Setting | Target | Declarations |
|---------|--------|--------------|
| `primaryColor` | `.btn--style-primary:not(.btn--disabled)` | `--bg-color`, `--hover-bg` (12% darker), `--color`, `--hover-color` |
| `primaryColor` | `.btn--style-secondary:not(.btn--disabled)` | `--color`, `--btn-border`, `--hover-color`, `--hover-btn-border` |
| `accentColor` | `.nav__link-indicator` | `background-color` |
| `accentColor` | `:focus-visible` | `outline-color` |
| `sidebarColor` | `.nav`, `.nav .nav__scroll` | `background-color` plus a contrast-picked `color` |
| `sidebarColor` | `.nav .nav-group__toggle` | `color: inherit`, `opacity: 0.65` |
| `sidebarColor` | `.nav .nav__link:hover`, `.nav .nav-group__toggle:hover` | `background-color` 10% lighter, `opacity: 1` |
| `borderRadius` | `:root` | `--style-radius-s`, `-m` (+2px), `-l` (+4px) |
| `hidePayloadBranding` | `.graphic-logo`, `.graphic-icon` | `display: none !important` |
| `customCSS` | — | appended verbatim to the same stylesheet |
| `faviconUrl` | — | sets `href` on `link[rel="icon"]` |
| `brandName` | — | prepends `<brandName> — ` to `document.title` |

The button rules are scoped with `:not(.btn--disabled)` on purpose. Payload encodes the disabled state
through the same local custom properties, inside `@layer payload-default`; this stylesheet is
unlayered, and an unlayered declaration wins over a layered one regardless of specificity. Without the
`:not()`, disabled Save/Create/Publish buttons would keep the brand color and an active-looking hover.

The primary color drives the button's own local custom properties rather than `--theme-elevation-800`:
Payload aliases that variable to `--theme-text`, so writing it would recolor every piece of body text
in the admin.

## Package Exports

| Subpath | Exposes | Environment |
|---------|---------|-------------|
| `@consilioweb/payload-admin-theme` | `adminThemePlugin`, `createAdminThemeGlobal`, `generateThemeCSS`, `generateCSSVariables`, `getPresetColors`, and the `AdminThemePluginConfig` / `AdminThemeData` / `ThemePreset` / `DarkModeColors` / `ThemeValues` / `ThemeCSSOptions` types | Server, ESM + CJS |
| `@consilioweb/payload-admin-theme/client` | `ThemeInjectorClient`, `AdminBranding`, `AdminIcon`, `ColorPickerField` | Client components (`"use client"`), ESM only |
| `@consilioweb/payload-admin-theme/rsc` | `ThemeInjector`, `ThemeNavLink`, `LoginBranding` | React Server Components, ESM only |

## Manual Registration

`skipComponentInjection: true` creates the global and nothing else — useful when webpack RSC module
resolution fails on symlinked (`link:`) packages. Register what you need yourself, passing the slug
through `clientProps`:

```ts
admin: {
  components: {
    afterNavLinks: [
      {
        path: '@consilioweb/payload-admin-theme/client#ThemeInjectorClient',
        clientProps: { globalSlug: 'admin-theme' },
      },
      {
        path: '@consilioweb/payload-admin-theme/rsc#ThemeNavLink',
        clientProps: { globalSlug: 'admin-theme' },
      },
    ],
    beforeLogin: [
      {
        path: '@consilioweb/payload-admin-theme/rsc#LoginBranding',
        clientProps: { globalSlug: 'admin-theme' },
      },
    ],
    graphics: {
      Logo: {
        path: '@consilioweb/payload-admin-theme/client#AdminBranding',
        clientProps: { globalSlug: 'admin-theme' },
      },
      Icon: {
        path: '@consilioweb/payload-admin-theme/client#AdminIcon',
        clientProps: { globalSlug: 'admin-theme' },
      },
    },
  },
}
```

`ThemeInjectorClient` is the component that writes the stylesheet; the RSC `ThemeInjector` only renders
a hidden `[data-admin-theme-slug]` marker, which the client component reads as a fallback when it is
mounted without `clientProps`. With a `link:` install, point the `*Path` options at local re-exports
instead of using `skipComponentInjection`.

## Server-Side CSS Endpoint

The plugin registers no endpoint of its own. When client-side injection is not an option, rebuild the
stylesheet from your own route. `generateThemeCSS()` only emits the color and radius rules for the
values it is handed: it resolves no preset, and the `customCSS` and `hidePayloadBranding` parts of the
injected stylesheet are yours to append.

**Gate the route on an admin-panel session — not merely on a session.** It reads the global through
the *local* API, and `payload.findGlobal()` runs with `overrideAccess: true`: the field-level guard
described in [Which fields an anonymous request gets back](#which-fields-an-anonymous-request-gets-back)
does **not** apply there. An ungated route republishes `customCSS` and every restricted value to
`curl /api/admin-theme-css`, which undoes that guard on your install.

An `if (!user)` gate is not enough, and that is the whole point of the check below. Payload issues one
`payload-token` cookie for *every* auth collection and resolves it without filtering on one, so a
front-office `customers` account — or a `users` account your `access.admin` turns away — reaches the
handler with a perfectly valid, non-null `user`. Match the plugin's own guard instead:
`permissions.canAccessAdmin`, which `payload.auth()` already computed.

```ts
// src/app/api/admin-theme-css/route.ts
import { headers as nextHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateThemeCSS, getPresetColors } from '@consilioweb/payload-admin-theme'

const CSS_HEADERS = { 'Content-Type': 'text/css; charset=utf-8' }

export async function GET() {
  const payload = await getPayload({ config })

  // The local API below bypasses access control (`overrideAccess: true`), so this
  // route — and nothing else — decides who gets the stylesheet. Without the check,
  // customCSS is public.
  //
  // `!user` is NOT the check to make. One `payload-token` cookie is shared by every
  // auth collection, so a front-office `customers` account is a non-null `user` here
  // and would walk straight through. `canAccessAdmin` is the rule the plugin's own
  // field guard applies: the caller belongs to `config.admin.user` AND that
  // collection's `access.admin`, when declared, lets them in. Payload deletes the
  // key when it is false, so test it for truthiness — never `=== false`.
  const { permissions } = await payload.auth({ headers: await nextHeaders() })
  if (!permissions?.canAccessAdmin) {
    return new NextResponse('/* unauthorized */', { status: 401, headers: CSS_HEADERS })
  }

  const theme = await payload.findGlobal({ slug: 'admin-theme' })

  // The client injector resolves the preset before generating anything — do the same,
  // or a saved preset is ignored and the individual color fields win.
  const preset = getPresetColors(theme.preset)
  const light = preset ? { ...preset, borderRadius: theme.borderRadius } : theme

  const css = [
    generateThemeCSS(light),
    generateThemeCSS(theme.darkMode ?? {}, { scope: '[data-theme="dark"]' }),
    theme.customCSS,
    theme.hidePayloadBranding
      ? '.graphic-logo,\n.graphic-icon {\n  display: none !important;\n}'
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  return new NextResponse(css || '/* no theme */', { headers: CSS_HEADERS })
}
```

Then import it from your `custom.scss`:

```scss
@import url('/api/admin-theme-css');
```

That `@import` is a same-origin request from an admin page, so the `payload-token` cookie travels with
it and a logged-in admin still receives the sheet; anonymous callers, users of another auth collection
and accounts refused by `access.admin` all get the same 401, and the login page keeps rendering its own
branding through `LoginBranding` / `AdminBranding` (both read the global server-side, so they are
unaffected).

If you would rather keep the route public, do not drop the check: also destructure `user` from
`payload.auth()` and replace the read with
`payload.findGlobal({ slug: 'admin-theme', overrideAccess: false, user })`. The field guard then
applies to the endpoint too, and a response for anyone outside the admin panel — anonymous or not —
simply comes back without `customCSS`, the colors, the radius and the dark-mode overrides.

`generateThemeCSS(values, options?)` returns a full stylesheet — custom properties *and* element
rules — for the values it is handed. `generateCSSVariables(values)` is its light-mode-only alias, kept
for compatibility. The favicon and the `document.title` prefix stay out of reach: they are DOM writes
performed by the client injector, not CSS a stylesheet can carry.

## Requirements

| Package | Range | Notes |
|---------|-------|-------|
| `payload` | `^3.79.1` | Required peer. 3.79.1 is the first release patched against GHSA-hp5w-3hxx-vmwf (pre-auth account takeover) and the SQL injection of the same round; it is also the first one this plugin can honestly claim to run on, since the React 19 peer below rules out everything under 3.79. Developed and tested against 3.88 |
| `@payloadcms/ui` | `^3.79.1` | Required peer — the color picker field imports `useField` from it. Kept in lockstep with `payload`, which is how Payload ships them |
| `react`, `react-dom` | `^19.0.1` | Required peers; React 18 is not supported (`@payloadcms/ui` 3.79+ needs React 19) |
| Node | `^18.20.2 \|\| >=20.9.0` | Aligned on Payload's own `engines` |
| Next.js | not a peer | The plugin never imports `next`; use whatever your Payload version supports (15 and 16 for Payload 3.7x+) |

## Upgrading from 0.2.x

0.3.0 is a behavioural break — see [CHANGELOG.md](./CHANGELOG.md) for the full list. The short version:

- **The theme now applies.** `ThemeInjectorClient` — the component that writes the stylesheet, the
  favicon and the document title — was registered by no code path up to 0.2.2, so those parts of the
  global were inert. One exception: with `faviconUrl` set, 0.2.x already registered the branding
  graphics, so `logoUrl` (or `brandName` as text) was showing in the nav. Review the global before
  deploying.
- **Colors hit different targets.** `primaryColor` no longer writes `--theme-success-*` or
  `--theme-text-link`, `accentColor` no longer writes `--theme-warning-*`, `sidebarColor` no longer
  writes `--nav-color`. The last two never existed in Payload 3; the success/warning ones did, which
  is why "Primary Color" used to recolor success banners.
- **`generateCSSVariables()` returns a full stylesheet**, not a single `:root { … }` block.
- **Peers and engines narrowed** — React 19 only, `@payloadcms/next` / `@payloadcms/translations` /
  `next` dropped from the peers, Node `^18.20.2 || >=20.9.0`.
- **`update` access is stricter** — an exact `'admin'` on the string form of `role` / `roles`,
  membership for the array form, and the user must belong to the admin panel's collection. The
  previous substring match accepted `admin-readonly` or `non-admin`.
- **`skipComponentInjection: true` now also skips the nav link**, and a `graphics.Logo` / `.Icon`
  declared by the host is no longer overwritten.

## Support

If this plugin saves you time, consider buying me a coffee.

<a href="https://buymeacoffee.com/pown3d">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" />
</a>

Bugs and feature requests: [github.com/pOwn3d/payload-admin-theme/issues](https://github.com/pOwn3d/payload-admin-theme/issues)

## License

MIT — [ConsilioWEB](https://consilioweb.fr)
