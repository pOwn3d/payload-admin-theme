import { describe, expect, it } from 'vitest'
import readme from '../../README.md?raw'
import { createAdminThemeGlobal } from '../globals/AdminTheme.js'

/**
 * Le README de ce paquet est traite comme du code (voir readmeCssEndpoint) :
 * les sections ajoutees ici disent a un lecteur ce qu il doit taper dans SA
 * base de donnees. Une table mal nommee dans une doc de desinstallation est
 * une commande destructrice qui rate — ou pire, qui vise autre chose.
 */

/**
 * Titres de niveau 2 SITUES APRES le sommaire — c est le perimetre qu il
 * annonce couvrir. `About`, qui le precede, n en fait deliberement pas partie.
 */
const headings = readme
  .slice(readme.indexOf('\n## Table of Contents\n') + 1)
  .split('\n')
  .filter((line) => line.startsWith('## '))
  .map((line) => line.slice(3).trim())

/** Ancre GitHub d un titre : minuscules, ponctuation retiree, espaces en tirets. */
function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function section(title: string): string {
  const start = readme.indexOf(`\n## ${title}\n`)
  if (start === -1) throw new Error(`Section "${title}" absente du README`)
  const body = readme.slice(start + 1)
  const end = body.indexOf('\n## ', 1)
  return end === -1 ? body : body.slice(0, end)
}

describe('README — table des matieres', () => {
  const tocLinks = [...section('Table of Contents').matchAll(/\]\(#([^)]+)\)/g)].map(
    (match) => match[1]!,
  )

  it('liste toutes les sections de niveau 2, dans l ordre du document', () => {
    // Le sommaire n est utile que s il est exhaustif : une section ajoutee
    // sans entree est une section que personne ne trouve.
    const expected = headings.filter((h) => h !== 'Table of Contents').map(anchor)
    expect(tocLinks).toEqual(expected)
  })

  it('ne pointe sur aucune ancre inexistante', () => {
    const known = new Set(headings.map(anchor))
    for (const link of tocLinks) expect(known).toContain(link)
  })
})

describe('README — Uninstall', () => {
  const uninstall = section('Uninstall')
  const slug = createAdminThemeGlobal().slug
  /** Nom de table des adaptateurs SQL : `toSnakeCase(slug)`. */
  const table = slug.replace(/-/g, '_')

  it('nomme la table SQL telle que les adaptateurs la creent', () => {
    // `@payloadcms/drizzle` nomme la table d un global `toSnakeCase(slug)` :
    // c est `admin_theme`, pas `admin-theme`. Une doc qui se trompe fait
    // echouer la commande — et un DROP approximatif est pire qu absent.
    expect(table).toBe('admin_theme')
    expect(uninstall).toContain(`DROP TABLE IF EXISTS ${table};`)
    expect(uninstall).toContain(`DROP TABLE IF EXISTS "${table}" CASCADE;`)
  })

  it('vise le bon document cote MongoDB, ou le slug reste tel quel', () => {
    expect(uninstall).toContain(`db.globals.deleteOne({ globalType: '${slug}' })`)
  })

  it('rappelle de regenerer l importmap', () => {
    // Sans cette etape l admin ne build plus : l importmap continue de
    // pointer sur un paquet desinstalle.
    expect(uninstall).toContain('generate:importmap')
  })

  it('donne les trois adaptateurs, pas seulement SQLite', () => {
    for (const adapter of ['SQLite', 'PostgreSQL', 'MongoDB']) {
      expect(uninstall).toContain(adapter)
    }
  })
})

describe('README — Database and updates', () => {
  const db = section('Database and updates')

  it('dit ou vivent les migrations et laquelle des deux commandes utiliser', () => {
    expect(db).toContain('payload migrate:create')
    expect(db).toContain('payload migrate')
    expect(db).toContain('push')
  })

  it('dit que le plugin ne peut pas livrer de migration', () => {
    expect(db).toMatch(/does not let a plugin ship migrations/i)
  })
})

describe('README — Upgrading from 0.3.x', () => {
  const upgrade = section('Upgrading from 0.3.x')

  it('ouvre sur l absence de changement de schema', () => {
    expect(upgrade.split('\n').slice(0, 4).join(' ')).toMatch(/no schema change/i)
  })

  it('nomme les seuls champs restes lisibles sans session', () => {
    // La consequence observable de 0.4.0 : tout le reste demande une session.
    // Le test lit la verite dans le global, pas dans le README.
    const fields = createAdminThemeGlobal().fields as Array<Record<string, unknown>>
    const publicNames = fields
      .filter((field) => typeof field.name === 'string' && !field.access)
      .map((field) => field.name as string)

    expect(publicNames).toEqual(['brandName', 'logoUrl'])
    for (const name of publicNames) expect(upgrade).toContain(`\`${name}\``)
  })

  it('dit ce qu un consommateur externe doit faire', () => {
    expect(upgrade).toMatch(/must now\s+authenticate/i)
  })
})

describe('README — portee multi-tenant', () => {
  it('annonce l incompatibilite avec plugin-multi-tenant la ou le global est decrit', () => {
    expect(section('The `admin-theme` Global')).toContain(
      '@payloadcms/plugin-multi-tenant',
    )
  })
})
