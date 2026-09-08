#!/usr/bin/env node
/**
 * Does this release owe the host a database migration?
 *
 * The question comes back at every release and gets re-guessed every time.
 * This script answers it mechanically so the answer is reproducible instead of
 * argued: it extracts the schema-bearing literals declared under
 * `src/{collections,globals,modules}` at two git refs and set-diffs them.
 *
 *   node scripts/schema-diff.mjs                 # every consecutive tag, then HEAD
 *   node scripts/schema-diff.mjs v0.3.0 HEAD     # two refs
 *
 * Exit code 0 when nothing moved, 1 when the schema differs — so it can gate a
 * release check. Report the SHA it prints alongside any claim of "no schema
 * change"; that is what makes the claim checkable later.
 *
 * WHAT COUNTS AS SCHEMA. Field and entity identity (`name`, `slug`, `type`,
 * `relationTo`) plus the flags that change a column or an index (`unique`,
 * `index`, `required`, `hasMany`, `virtual`). Deliberately NOT: `access`,
 * `hooks`, `validate`, `admin.description`, labels. Payload stores none of
 * those, so changing them owes nobody a migration — that distinction is the
 * whole point of the script.
 *
 * WHY COMMENTS ARE STRIPPED FIRST. Docblocks in this repo quote field names
 * between backticks (`` `name: 'x'` ``) and a naive grep counts them as
 * declarations, which produces a phantom diff on a release that only touched
 * documentation.
 */
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 })

/** Directories a Payload entity can be declared in, across these plugins. */
const SCHEMA_DIRS = ['src/collections', 'src/globals', 'src/modules']

const IDENTITY_KEYS = ['name', 'slug', 'type', 'relationTo']
const SCHEMA_FLAGS = ['unique', 'index', 'required', 'hasMany', 'virtual']

/** Remove block and line comments — see the docblock note above. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

/** The schema-bearing literals of one file, as a flat list of tokens. */
function tokens(source) {
  const code = stripComments(source)
  const out = []

  for (const key of IDENTITY_KEYS) {
    const pattern = new RegExp(`\\b${key}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`, 'g')
    for (const match of code.matchAll(pattern)) out.push(`${key}=${match[1]}`)
  }

  for (const flag of SCHEMA_FLAGS) {
    const pattern = new RegExp(`\\b${flag}\\s*:\\s*(true|false)`, 'g')
    for (const match of code.matchAll(pattern)) out.push(`${flag}=${match[1]}`)
  }

  return out
}

/** Multiset of tokens for a ref: token -> occurrences. */
function schemaAt(ref) {
  const files = git('ls-tree', '-r', '--name-only', ref)
    .split('\n')
    .filter((file) => SCHEMA_DIRS.some((dir) => file.startsWith(`${dir}/`)))
    .filter((file) => /\.tsx?$/.test(file))

  const counts = new Map()
  for (const file of files) {
    for (const token of tokens(git('show', `${ref}:${file}`))) {
      counts.set(token, (counts.get(token) ?? 0) + 1)
    }
  }
  return counts
}

/** Lines describing what moved between two multisets. */
function diff(before, after) {
  const lines = []
  for (const [token, count] of after) {
    const previous = before.get(token) ?? 0
    if (count !== previous) lines.push(`  + ${token} (${previous} -> ${count})`)
  }
  for (const [token, count] of before) {
    if (!after.has(token)) lines.push(`  - ${token} (${count} -> 0)`)
  }
  return lines.sort()
}

function sha(ref) {
  return git('rev-parse', '--short', ref).trim()
}

function compare(from, to) {
  const lines = diff(schemaAt(from), schemaAt(to))
  const label = `${from} (${sha(from)}) -> ${to} (${sha(to)})`
  if (lines.length === 0) {
    console.log(`OK  ${label}: no schema change`)
    return true
  }
  console.log(`DIFF ${label}:`)
  for (const line of lines) console.log(line)
  return false
}

const [from, to] = process.argv.slice(2)
let clean = true

if (from && to) {
  clean = compare(from, to)
} else {
  const tags = git('tag', '--sort=v:refname').split('\n').filter(Boolean)
  const refs = [...tags, 'HEAD']
  for (let i = 1; i < refs.length; i += 1) {
    clean = compare(refs[i - 1], refs[i]) && clean
  }
}

process.exit(clean ? 0 : 1)
