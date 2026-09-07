import { describe, expect, it } from 'vitest'
import { getPresetColors } from '../utils/presets.js'
import { generateThemeCSS } from '../utils/cssVariables.js'
import type { ThemePreset } from '../types.js'

const KNOWN_PRESETS: ThemePreset[] = [
  'blue-professional',
  'dark-minimal',
  'green-nature',
  'purple-creative',
]

describe('getPresetColors', () => {
  it('rend les trois couleurs annoncees par un preset connu', () => {
    expect(getPresetColors('blue-professional')).toEqual({
      primaryColor: '#2563EB',
      accentColor: '#0EA5E9',
      sidebarColor: '#1E293B',
    })
  })

  it('rend un triplet complet et valide pour chacun des presets livres', () => {
    for (const preset of KNOWN_PRESETS) {
      const colors = getPresetColors(preset)

      expect(colors, preset).not.toBeNull()
      expect(colors!.primaryColor, preset).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(colors!.accentColor, preset).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(colors!.sidebarColor, preset).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('rend la main aux champs individuels sur "custom" comme sur un global vide', () => {
    // Le global peut ne rien contenir (premier boot) ou avoir ete efface.
    expect(getPresetColors('custom')).toBeNull()
    expect(getPresetColors(null)).toBeNull()
    expect(getPresetColors(undefined)).toBeNull()
    expect(getPresetColors('' as ThemePreset)).toBeNull()
  })

  it('ne casse pas sur un preset inconnu et retombe sur les champs individuels', () => {
    // Cas reel : un preset supprime d une version a l autre reste en base.
    expect(() => getPresetColors('neon-retro' as ThemePreset)).not.toThrow()
    expect(getPresetColors('neon-retro' as ThemePreset)).toBeNull()
  })

  // BUG CONNU (non corrige ici) : la table des presets est interrogee sans
  // garde d appartenance, donc les proprietes heritees d Object.prototype
  // repondent. 'toString' rend une fonction au lieu de null : l appelant la
  // prend pour un preset, lit des couleurs undefined et n injecte plus rien.
  // Un Object.hasOwn, une Map ou un objet a prototype nul ferme le trou.
  it('ne confond pas une propriete heritee d Object avec un preset', () => {
    expect(getPresetColors('toString' as ThemePreset)).toBeNull()
    expect(getPresetColors('constructor' as ThemePreset)).toBeNull()
  })

  it('couvre les trois couleurs, donc ne laisse aucun champ individuel transparaitre', () => {
    // C est la garantie du "le preset prend le pas" : un preset actif fournit
    // les trois couleurs, il n en reste aucune a aller chercher ailleurs.
    const individualFields = {
      primaryColor: '#FF0000',
      accentColor: '#00FF00',
      sidebarColor: '#0000FF',
    }
    const preset = getPresetColors('green-nature')!
    const effective = { ...individualFields, ...preset }
    const css = generateThemeCSS(effective)

    expect(css).toContain(preset.primaryColor)
    expect(css).toContain(preset.accentColor)
    expect(css).toContain(preset.sidebarColor)
    expect(css).not.toContain('#FF0000')
    expect(css).not.toContain('#00FF00')
    expect(css).not.toContain('#0000FF')
  })

  // BUG CONNU (non corrige ici) : getPresetColors rend la reference de l objet
  // interne. Un hote qui modifie le retour de cette fonction exportee empoisonne
  // le preset pour tout le processus. Le test reste rouge tant que la fonction
  // ne rend pas une copie.
  it('protege ses presets d une mutation faite par l appelant', () => {
    const first = getPresetColors('blue-professional')!
    const original = first.primaryColor
    first.primaryColor = '#000000'

    try {
      expect(getPresetColors('blue-professional')!.primaryColor).toBe('#2563EB')
    } finally {
      // Remet la table en etat : ce test ne doit pas dependre de l ordre ni
      // contaminer les suivants tant que le bug n est pas corrige.
      getPresetColors('blue-professional')!.primaryColor = original
    }
  })
})
