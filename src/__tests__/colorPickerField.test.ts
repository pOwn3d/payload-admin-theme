import { describe, expect, it, vi } from 'vitest'
import React from 'react'

/**
 * ColorPickerField est le seul composant de champ du plugin (monte sur les six
 * champs couleur du global, globals/AdminTheme.ts) et sa seule dette
 * d accessibilite. Deux defauts corriges ici :
 *
 *  - le `<label className="field-label">` n avait pas de `htmlFor` et l input
 *    texte pas d `id` : le champ n avait donc aucun nom accessible, et cliquer
 *    le libelle ne donnait pas le focus ;
 *  - l `<input type="color">`, superpose en absolu, n avait strictement aucun
 *    nom. Les deux controles pilotent la meme valeur mais sont deux noeuds
 *    distincts de l arbre d accessibilite.
 *
 * Le paquet n a ni jsdom ni testing-library : le composant est appele comme
 * une fonction et l arbre React retourne est parcouru. `useId` / `useCallback`
 * sont neutralises, un hook hors rendu levant.
 */

vi.mock('@payloadcms/ui', () => ({
  useField: () => ({ value: '#3B82F6', setValue: () => {} }),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    default: actual,
    useId: () => 'field-generated-id',
    useCallback: <T,>(fn: T) => fn,
  }
})

const { ColorPickerField } = await import('../components/ColorPickerField.js')

type Element = React.ReactElement<Record<string, unknown>>

/** Aplatit l arbre retourne, enfants compris. */
function flatten(node: unknown, out: Element[] = []): Element[] {
  if (Array.isArray(node)) {
    for (const child of node) flatten(child, out)
    return out
  }
  if (!React.isValidElement(node)) return out
  const element = node as Element
  out.push(element)
  return flatten(element.props.children, out)
}

function render(field: unknown): Element[] {
  const output = (ColorPickerField as unknown as (p: unknown) => Element)({
    path: 'primaryColor',
    field,
  })
  return flatten(output)
}

const byType = (nodes: Element[], type: string) => nodes.filter((n) => n.type === type)

const FIELD = {
  name: 'primaryColor',
  type: 'text',
  label: { en: 'Primary Color', fr: 'Couleur principale' },
  admin: { description: { en: 'Hex color code', fr: 'Code couleur hexadecimal' } },
}

describe('ColorPickerField — nom accessible du champ texte', () => {
  it('associe le label a l input par htmlFor / id', () => {
    const nodes = render(FIELD)
    const label = byType(nodes, 'label')[0]!
    const text = byType(nodes, 'input').find((n) => n.props.type === 'text')!

    expect(label.props.htmlFor).toBe('field-generated-id')
    expect(text.props.id).toBe('field-generated-id')
    expect(label.props.htmlFor).toBe(text.props.id)
  })

  it('rattache la description au champ via aria-describedby', () => {
    const nodes = render(FIELD)
    const text = byType(nodes, 'input').find((n) => n.props.type === 'text')!
    const description = byType(nodes, 'div').find(
      (n) => n.props.className === 'field-description',
    )!

    expect(text.props['aria-describedby']).toBe(description.props.id)
    expect(description.props.id).toBeTruthy()
  })

  it('n emet pas d aria-describedby quand il n y a pas de description', () => {
    const nodes = render({ ...FIELD, admin: {} })
    const text = byType(nodes, 'input').find((n) => n.props.type === 'text')!

    // Un aria-describedby pointant dans le vide est une non-conformite a lui
    // seul : le lecteur d ecran annonce une description absente.
    expect(text.props['aria-describedby']).toBeUndefined()
  })
})

describe('ColorPickerField — nom accessible de la pastille', () => {
  it('donne a l input color un nom, distinct de celui du champ texte', () => {
    const nodes = render(FIELD)
    const color = byType(nodes, 'input').find((n) => n.props.type === 'color')!
    const label = byType(nodes, 'label')[0]!

    expect(color.props['aria-label']).toBe('Couleur principale — selecteur de couleur')
    expect(color.props['aria-label']).not.toBe(label.props.children)
  })

  it('ne vole pas l association du label : un <label> ne nomme qu un controle', () => {
    const nodes = render(FIELD)
    const color = byType(nodes, 'input').find((n) => n.props.type === 'color')!

    expect(color.props.id).toBeUndefined()
  })

  it('reste nomme quand le champ ne declare aucun label', () => {
    const nodes = render({ name: 'primaryColor', type: 'text' })
    const color = byType(nodes, 'input').find((n) => n.props.type === 'color')!

    expect(byType(nodes, 'label')).toHaveLength(0)
    expect(color.props['aria-label']).toBe('Color picker')
  })
})
