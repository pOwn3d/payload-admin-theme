import { describe, expect, it } from 'vitest'
import { colorPickerLabel, resolveLabel } from '../utils/labels.js'

describe('resolveLabel', () => {
  it('accepte une chaine simple, sans langue connue', () => {
    expect(resolveLabel('Primary Color')).toEqual({ text: 'Primary Color', locale: null })
  })

  it('lit le francais en premier, comme le faisait l expression inline', () => {
    expect(resolveLabel({ en: 'Primary Color', fr: 'Couleur principale' })).toEqual({
      text: 'Couleur principale',
      locale: 'fr',
    })
  })

  it('retombe sur l anglais quand le francais manque ou est vide', () => {
    expect(resolveLabel({ en: 'Primary Color' })).toEqual({
      text: 'Primary Color',
      locale: 'en',
    })
    expect(resolveLabel({ en: 'Primary Color', fr: '' })).toEqual({
      text: 'Primary Color',
      locale: 'en',
    })
  })

  it('ne fabrique jamais de texte a partir d une valeur non textuelle', () => {
    // `String({})` donnerait « [object Object] » dans un <label> : pire que
    // pas de label du tout.
    for (const value of [undefined, null, 42, {}, { de: 'Primarfarbe' }, [], () => 'x']) {
      expect(resolveLabel(value)).toEqual({ text: '', locale: null })
    }
  })
})

describe('colorPickerLabel — nom accessible de la pastille de couleur', () => {
  it('se distingue du nom du champ texte', () => {
    // Les deux controles pilotent la MEME valeur mais sont deux noeuds
    // distincts de l arbre d accessibilite : deux noms identiques rendent la
    // pastille impossible a identifier au lecteur d ecran.
    const fieldName = 'Couleur principale'
    const pickerName = colorPickerLabel(fieldName, 'fr')

    expect(pickerName).not.toBe(fieldName)
    expect(pickerName).toContain(fieldName)
  })

  it('suit la langue dans laquelle le label a ete resolu', () => {
    expect(colorPickerLabel('Couleur principale', 'fr')).toBe(
      'Couleur principale — selecteur de couleur',
    )
    expect(colorPickerLabel('Primary Color', 'en')).toBe('Primary Color — color picker')
  })

  it('reste un nom complet quand le champ ne declare aucun label', () => {
    expect(colorPickerLabel('', 'fr')).toBe('Selecteur de couleur')
    expect(colorPickerLabel('', null)).toBe('Color picker')
  })

  it('boucle avec resolveLabel sur les labels reels du global', () => {
    const { text, locale } = resolveLabel({ en: 'Accent Color', fr: 'Couleur d accentuation' })

    expect(colorPickerLabel(text, locale)).toBe(
      'Couleur d accentuation — selecteur de couleur',
    )
  })
})
