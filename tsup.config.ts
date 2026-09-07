import { defineConfig, type Options } from 'tsup'
import { rmSync } from 'fs'

// Only the packages src/ actually imports (plus the self-references used by
// the documented override paths). @payloadcms/next, @payloadcms/translations
// and next used to be listed here and in peerDependencies while never being
// imported — see package.json.
const externals = [
  'payload',
  'payload/shared',
  '@payloadcms/ui',
  'react',
  'react-dom',
  'react/jsx-runtime',
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

// Entries of the client pass, and the exact files it emits.
// Kept as one literal list so the "use client" post-processing below and the
// build guard (scripts/check-build-artifacts.mjs) stay in sync.
const clientPassEntries = [
  'src/client.ts',
  'src/components/ThemeProvider.tsx',
  'src/components/AdminBranding.tsx',
  'src/components/ColorPickerField.tsx',
  'src/utils/colorUtils.ts',
  'src/utils/cssVariables.ts',
  'src/utils/presets.ts',
  'src/utils/themeCache.ts',
]

// Every entry above except the barrel (src/client.ts): the barrel must stay
// free of the directive for Next.js 16 + Turbopack.
const clientOutputFiles = clientPassEntries
  .filter((entry) => entry !== 'src/client.ts')
  .map((entry) => entry.replace(/^src\//, 'dist/').replace(/\.tsx?$/, '.js'))

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
      'src/components/LoginBranding.tsx',
    ],
  },
  // Client entry — individual component files (NOT bundled)
  // This allows webpack/Next.js RSC to resolve each component individually
  {
    ...sharedConfig,
    entry: clientPassEntries,
    onSuccess: async () => {
      // tsup strips the "use client" directive from the emitted files, so it is
      // re-prepended here. Only the files produced by THIS pass are touched:
      // walking dist/components would also hit the RSC pass output
      // (ThemeInjector, ThemeNavLink) and silently turn genuine server
      // components into client ones — and tsup runs the three configs
      // concurrently, so a directory walk is racy on top of being wrong.
      // The barrel (dist/client.js) is deliberately left without the directive:
      // adding it there pulls the whole barrel tree into the client graph and
      // breaks Next.js 16 + Turbopack.
      const { readFileSync, writeFileSync } = await import('fs')

      for (const file of clientOutputFiles) {
        const content = readFileSync(file, 'utf-8')
        if (!content.startsWith('"use client"')) {
          writeFileSync(file, '"use client";\n' + content)
        }
      }
      console.log(`Prepended "use client" to ${clientOutputFiles.length} client files (not the barrel, not the RSC pass)`)
    },
  },
])
