import { defineConfig, type Options } from 'tsup'
import { rmSync } from 'fs'

const externals = [
  'payload',
  'payload/shared',
  '@payloadcms/ui',
  '@payloadcms/translations',
  '@payloadcms/next',
  '@payloadcms/next/templates',
  'react',
  'react-dom',
  'react/jsx-runtime',
  'next',
  'next/navigation',
  'next/link',
  'next/server',
  'next/headers',
  '@consilioweb/payload-admin-theme',
  '@consilioweb/payload-admin-theme/client',
  '@consilioweb/payload-admin-theme/rsc',
]

// Clean dist once before build
rmSync('dist', { recursive: true, force: true })

const sharedConfig: Partial<Options> = {
  format: ['esm'],
  dts: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  external: externals,
  clean: false,
  // Keep individual modules instead of bundling into one file
  bundle: false,
}

export default defineConfig([
  // Server entry — plugin + types + globals
  {
    ...sharedConfig,
    entry: { index: 'src/index.ts' },
    bundle: true,
    format: ['esm', 'cjs'],
  },
  // RSC entry — server components (NO 'use client' directive)
  // These are registered in Payload's importMap and serialised through the RSC stream
  {
    ...sharedConfig,
    entry: [
      'src/rsc.ts',
      'src/components/ThemeInjector.tsx',
      'src/components/ThemeNavLink.tsx',
    ],
  },
  // Client entry — individual component files (NOT bundled)
  // This allows webpack/Next.js RSC to resolve each component individually
  {
    ...sharedConfig,
    entry: [
      'src/client.ts',
      'src/components/ThemeProvider.tsx',
      'src/components/AdminBranding.tsx',
      'src/components/ColorPickerField.tsx',
      'src/utils/colorUtils.ts',
      'src/utils/presets.ts',
      'src/utils/themeCache.ts',
    ],
    onSuccess: async () => {
      // Prepend "use client" to individual component files (NOT the barrel client.js)
      // This is required for Next.js 16 Turbopack compatibility
      const { readdirSync, readFileSync, writeFileSync, statSync } = await import('fs')
      const { join } = await import('path')

      function addUseClient(dir: string) {
        for (const file of readdirSync(dir)) {
          const path = join(dir, file)
          if (statSync(path).isDirectory()) { addUseClient(path); continue }
          if (!file.endsWith('.js')) continue
          const content = readFileSync(path, 'utf-8')
          if (!content.startsWith('"use client"')) {
            writeFileSync(path, '"use client";\n' + content)
          }
        }
      }
      addUseClient('dist/components')
      addUseClient('dist/utils')
      console.log('Prepended "use client" to individual component/util files (not barrel)')
    },
  },
])
