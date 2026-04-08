# @consilioweb/payload-admin-theme

<p align="center">
  <a href="https://buymeacoffee.com/pown3d">
    <img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-☕-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy me a coffee" />
  </a>
</p>

> [!IMPORTANT]
> ## ⚠️ Next.js 16 + Turbopack — Known Issue
>
> If you're using **Next.js 16** with Turbopack (default bundler), you may encounter a `createContext is not a function` error during `next build`. This is a **known Payload CMS issue** ([#15429](https://github.com/payloadcms/payload/issues/15429), [#14330](https://github.com/payloadcms/payload/discussions/14330)) — not specific to this plugin.
>
> **Workaround** — Add this to your admin page (`src/app/(payload)/admin/[[...segments]]/page.tsx`):
> ```ts
> export const dynamic = 'force-dynamic'
> ```
>
> And ensure all `@consilioweb/*` packages are in `transpilePackages` in your `next.config.ts`:
> ```ts
> transpilePackages: ['@consilioweb/seo-analyzer', '@consilioweb/admin-nav', /* ...other @consilioweb packages */],
> ```
>
> ✅ **Next.js 15** works without any workaround.

Payload CMS 3 plugin to customize the admin panel appearance: colors, branding, logo, login page, and custom CSS — all configurable from the admin UI.

## Features

- **Color theming** with built-in color picker fields
- **Dark mode** — dedicated color fields for `[data-theme="dark"]` (v0.2.0)
- **4 theme presets** — Blue Professional, Dark Minimal, Green Nature, Purple Creative (v0.2.0)
- **Brand customization** — name, logo, favicon
- **Login page** — custom title, subtitle, and logo
- **CSS variable injection** — overrides Payload's default theme
- **Custom CSS** — inject additional styles from the admin panel (with injection validation)
- **Hide Payload branding** — remove default Payload logo
- **Nav link** — automatic "Admin Theme" link in the sidebar
- **Server-side rendering** — no client-side flicker
- **AdminThemeContext** — single fetch shared across all components (v0.2.0)
- **Security** — CSS injection validation, hex color validation, URL validation on logo/favicon (v0.2.0)

## Installation

```bash
pnpm add @consilioweb/payload-admin-theme
# or
npm install @consilioweb/payload-admin-theme
```

## Quick Start

```typescript
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

That's it! The plugin adds an **"Admin Theme"** global to your admin panel where you can change all settings live.

## Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable the plugin |
| `globalSlug` | `string` | `'admin-theme'` | Slug for the Payload global |
| `brandName` | `string` | — | Brand name displayed in admin header |
| `primaryColor` | `string` | `'#3B82F6'` | Primary color (hex) |
| `accentColor` | `string` | `'#10B981'` | Accent color (hex) |
| `sidebarColor` | `string` | — | Sidebar background color |
| `borderRadius` | `number` | `8` | Border radius for UI elements (px) |
| `hidePayloadBranding` | `boolean` | `false` | Hide default Payload branding |
| `faviconUrl` | `string` | — | Custom favicon URL |
| `customCSS` | `string` | — | Custom CSS injected into admin |
| `addNavLink` | `boolean` | `true` | Add "Theme" link in admin sidebar |
| `navLinkPath` | `string` | (built-in) | Override nav link component path |
| `skipComponentInjection` | `boolean` | `false` | Skip automatic component injection |
| `colorPickerComponent` | `string \| false` | (built-in) | Override or disable color picker |
| `access` | `function` | Admin-only | Custom access control function for the global |
| `presets` | `boolean` | `true` | Enable the 4 built-in theme presets |

### Dark Mode (v0.2.0)

The plugin supports dedicated dark mode colors. In the admin UI, a **Dark Mode** section lets you configure separate colors for `[data-theme="dark"]`:

```typescript
adminThemePlugin({
  primaryColor: '#3B82F6',      // Light mode primary
  accentColor: '#10B981',       // Light mode accent
  // Dark mode colors are configured from the admin UI
})
```

### Theme Presets (v0.2.0)

4 built-in presets can be applied with one click from the admin panel:

| Preset | Primary | Accent | Style |
|--------|---------|--------|-------|
| Blue Professional | `#3B82F6` | `#10B981` | Clean corporate |
| Dark Minimal | `#6366F1` | `#F59E0B` | Dark background |
| Green Nature | `#059669` | `#D97706` | Organic feel |
| Purple Creative | `#7C3AED` | `#EC4899` | Bold creative |

## Admin UI Configuration

The plugin adds an **"Admin Theme"** global (under **Settings** group) with these sections:

### General
- Brand name
- Primary, accent, and sidebar colors (with color picker)
- Border radius
- Logo and favicon URLs

### Login Page
- Login title (e.g. "Welcome")
- Login subtitle
- Login logo URL (overrides brand name badge)

### Advanced
- Hide Payload branding checkbox
- Custom CSS textarea

Changes are applied on the next page load.

## CSS Variables

The plugin maps theme colors to Payload CSS variables:

| Payload Variable | Source |
|-----------------|--------|
| `--theme-success-500` | `primaryColor` |
| `--theme-text-link` | `primaryColor` |
| `--theme-success-400/600` | `primaryColor` (lighter/darker) |
| `--theme-warning-500` | `accentColor` |
| `--theme-warning-400/600` | `accentColor` (lighter/darker) |
| `--nav-color` | `sidebarColor` |
| `--style-radius-s/m/l` | `borderRadius` |

## Server-Side CSS Endpoint

For projects where client-side injection doesn't work (e.g. symlinked packages in dev), you can use a server-side CSS endpoint:

1. Create an API route at `src/app/api/admin-theme-css/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  const payload = await getPayload({ config })
  const theme = await payload.findGlobal({ slug: 'admin-theme' })

  const vars: string[] = []
  if (theme.primaryColor) {
    vars.push(`--theme-success-500: ${theme.primaryColor}`)
    vars.push(`--theme-text-link: ${theme.primaryColor}`)
  }
  // ... add more variables as needed

  const css = vars.length > 0
    ? `html:root {\n  ${vars.join(';\n  ')};\n}\n`
    : '/* no theme */'

  return new NextResponse(css, {
    headers: { 'Content-Type': 'text/css; charset=utf-8' },
  })
}
```

2. Import it in your `custom.scss`:
```scss
@import url('/api/admin-theme-css');
```

## Dynamic Login & Branding Components

The plugin includes server components for dynamic branding. For projects using `skipComponentInjection: true`, create local server components that read from the `admin-theme` global:

```typescript
// src/components/AdminLogo/index.tsx
import { getPayload } from 'payload'
import config from '@payload-config'

const AdminLogo = async () => {
  const payload = await getPayload({ config })
  const theme = await payload.findGlobal({ slug: 'admin-theme' })

  return (
    <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--theme-text)' }}>
      {(theme.brandName as string)?.toUpperCase() || 'ADMIN'}
    </div>
  )
}
export default AdminLogo
```

Register in `payload.config.ts`:
```typescript
admin: {
  components: {
    graphics: {
      Logo: '@/components/AdminLogo',
      Icon: '@/components/AdminIcon',
    },
    beforeLogin: ['@/components/BeforeLogin'],
  },
}
```

## Compatibility

- **Payload CMS** 3.0+
- **Next.js** 14 or 15
- **React** 18 or 19

## ☕ Support

If this plugin saves you time, consider buying me a coffee!

<a href="https://buymeacoffee.com/pown3d">
  <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=pown3d&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" />
</a>

## License

MIT - [ConsilioWEB](https://consilioweb.fr)
