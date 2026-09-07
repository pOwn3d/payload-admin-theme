#!/usr/bin/env node
/**
 * Build guard — runs right after `tsup` (see the `build` script).
 *
 * Two things have shipped broken in the past and are cheap to assert here:
 *  1. the "use client" directive landing on the RSC-pass output, which turns
 *     genuine server components into client ones and defeats the point of
 *     the ./rsc entrypoint;
 *  2. a package.json `exports` subpath pointing at a file tsup never emitted.
 *
 * Exits non-zero with a readable message so a bad artifact never reaches npm.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Files that MUST start with the "use client" directive. */
const mustBeClient = [
  'dist/components/ThemeProvider.js',
  'dist/components/AdminBranding.js',
  'dist/components/ColorPickerField.js',
  'dist/utils/colorUtils.js',
  'dist/utils/cssVariables.js',
  'dist/utils/presets.js',
  'dist/utils/themeCache.js',
]

/**
 * Files that MUST NOT start with it: the RSC pass output, and the client
 * barrel (a directive there breaks Next.js 16 + Turbopack).
 */
const mustNotBeClient = [
  'dist/client.js',
  'dist/rsc.js',
  'dist/components/ThemeInjector.js',
  'dist/components/ThemeNavLink.js',
  'dist/components/LoginBranding.js',
]

const errors = []

const startsWithUseClient = (relativePath) => {
  const absolute = join(root, relativePath)
  if (!existsSync(absolute)) {
    errors.push(`missing build artifact: ${relativePath}`)
    return null
  }
  return readFileSync(absolute, 'utf-8').startsWith('"use client"')
}

for (const file of mustBeClient) {
  if (startsWithUseClient(file) === false) {
    errors.push(`${file} must start with "use client" (client pass output)`)
  }
}

for (const file of mustNotBeClient) {
  if (startsWithUseClient(file) === true) {
    errors.push(`${file} must NOT start with "use client" (server component or barrel)`)
  }
}

// Every file referenced by package.json `exports` / `main` / `module` / `types`
// has to exist, otherwise the published package 404s on import.
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
const collectTargets = (node, out = []) => {
  if (typeof node === 'string') {
    if (node.startsWith('./dist/')) out.push(node.slice(2))
  } else if (node && typeof node === 'object') {
    for (const value of Object.values(node)) collectTargets(value, out)
  }
  return out
}

const targets = new Set([
  ...collectTargets(pkg.exports ?? {}),
  ...[pkg.main, pkg.module, pkg.types]
    .filter((value) => typeof value === 'string' && value.startsWith('./dist/'))
    .map((value) => value.slice(2)),
])

for (const target of targets) {
  if (!existsSync(join(root, target))) {
    errors.push(`package.json exports points at a missing file: ./${target}`)
  }
}

if (errors.length > 0) {
  console.error('\nBuild artifact check FAILED:')
  for (const error of errors) console.error(`  - ${error}`)
  console.error('')
  process.exit(1)
}

console.log(`Build artifact check OK (${mustBeClient.length} client files, ${mustNotBeClient.length} server files, ${targets.size} export targets)`)
