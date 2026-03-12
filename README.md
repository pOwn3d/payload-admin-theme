# @consilioweb/payload-admin-theme

Payload CMS 3 plugin to customize the admin panel appearance: colors, branding, logo, login page, and custom CSS — all configurable from the admin UI.

## Features

- **Color theming** with built-in color picker fields
- **Brand customization** — name, logo, favicon
- **Login page** — custom title, subtitle, and logo
- **CSS variable injection** — overrides Payload's default theme
- **Custom CSS** — inject additional styles from the admin panel
- **Hide Payload branding** — remove default Payload logo
- **Nav link** — automatic "Admin Theme" link in the sidebar
- **Server-side rendering** — no client-side flicker

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

## License

MIT - [ConsilioWEB](https://consilioweb.fr)
