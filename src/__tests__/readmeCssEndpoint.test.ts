import { describe, expect, it } from 'vitest'
import readme from '../../README.md?raw'

/**
 * Le README est ici du code : la section « Server-Side CSS Endpoint » est
 * copiee telle quelle dans les projets hotes. Publiee sans garde, elle
 * republie `customCSS` et tous les champs restreints a un anonyme et annule,
 * chez ceux qui suivent la doc, la garde `access.read` posee au niveau champ.
 */

/** Extrait une section `## Titre` jusqu au prochain titre de meme niveau. */
function section(title: string): string {
  const start = readme.indexOf(`\n## ${title}\n`)
  if (start === -1) throw new Error(`Section "${title}" absente du README`)
  const body = readme.slice(start + 1)
  const end = body.indexOf('\n## ', 1)
  return end === -1 ? body : body.slice(0, end)
}

/** Tous les blocs de code TypeScript du README. */
function tsCodeBlocks(): string[] {
  return readme.split('```ts').slice(1).map((block) => block.split('```')[0]!)
}

const endpoint = section('Server-Side CSS Endpoint')

/** Le handler lui-meme, sans la prose qui l entoure. */
const route = endpoint.split('```ts')[1]!.split('```')[0]!

describe('README — la route CSS documentee ne rouvre pas la fuite anonyme', () => {
  it('exige une session avant de servir la feuille', () => {
    expect(route).toContain('payload.auth(')
    expect(route).toMatch(/status:\s*401/)
  })

  it('place le controle AVANT la lecture du global', () => {
    // `payload.findGlobal()` tourne en `overrideAccess: true` : une fois la
    // valeur lue, plus aucune garde de champ ne s applique.
    const gate = route.indexOf('payload.auth(')
    const read = route.indexOf('payload.findGlobal(')

    expect(gate).toBeGreaterThan(-1)
    expect(read).toBeGreaterThan(gate)
  })

  it('rappelle pourquoi la garde de champ ne couvre pas cette route', () => {
    expect(endpoint).toContain('overrideAccess: true')
    expect(endpoint).toContain('#which-fields-an-anonymous-request-gets-back')
  })

  it('donne une alternative publique qui conserve la garde de champ', () => {
    // Rendre la route publique reste possible, mais en repassant par le
    // controle d acces plutot qu en retirant le gate.
    expect(endpoint).toContain('overrideAccess: false')
  })

  it('n expose aucun autre exemple lisant le global sans garde', () => {
    // Invariant global : le jour ou un nouvel extrait lira le global, il
    // devra porter sa propre garde.
    const ungated = tsCodeBlocks().filter(
      (block) => block.includes('payload.findGlobal(') && !block.includes('payload.auth('),
    )

    expect(ungated).toEqual([])
  })

  it('renvoie depuis la section des champs restreints vers cette route', () => {
    expect(section('The `admin-theme` Global')).toContain('#server-side-css-endpoint')
  })
})
