import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  readableTextColor,
  relativeLuminance,
} from '../utils/colorUtils.js'
import { generateThemeCSS } from '../utils/cssVariables.js'

/**
 * Le point de bascule reel de la regle "noir ou blanc sur ce fond" est la
 * racine de (L + 0.05)^2 = 1.05 * 0.05, soit L ~= 0.1791 — et non L = 0.5.
 * Recalcule ici a partir de la formule WCAG, jamais copie du code teste.
 */
const THRESHOLD = Math.sqrt(1.05 * 0.05) - 0.05

/** Les deux gris 8 bits qui encadrent immediatement le seuil. */
const JUST_BELOW = '#757575'
const JUST_ABOVE = '#767676'

function labelOf(css: string): string | null {
  const match = /\n\s+--color:\s*([^;\n]+)/.exec(css)
  return match ? match[1].trim() : null
}

describe('Libelle des boutons — cote du seuil', () => {
  it('ecrit en noir sur un fond clair et en blanc sur un fond sombre', () => {
    expect(readableTextColor('#FFFFFF')).toBe('#000000')
    expect(readableTextColor('#000000')).toBe('#FFFFFF')
  })

  it('ecrit en noir sur les couleurs de marque de luminance moyenne', () => {
    // Un seuil naif a L = 0.5 renverrait du blanc sur ces trois fonds, sous les
    // 4.5:1 de WCAG AA alors que le noir y depasse 6:1.
    expect(readableTextColor('#0EA5E9')).toBe('#000000')
    expect(readableTextColor('#16A34A')).toBe('#000000')
    expect(readableTextColor('#F59E0B')).toBe('#000000')
  })

  it('garde le blanc sur les bleus et les gris fonces', () => {
    expect(readableTextColor('#2563EB')).toBe('#FFFFFF')
    expect(readableTextColor('#1E293B')).toBe('#FFFFFF')
  })

  it('bascule exactement au seuil de luminance, pas avant, pas apres', () => {
    expect(relativeLuminance(JUST_BELOW)!).toBeLessThan(THRESHOLD)
    expect(relativeLuminance(JUST_ABOVE)!).toBeGreaterThan(THRESHOLD)

    expect(readableTextColor(JUST_BELOW)).toBe('#FFFFFF')
    expect(readableTextColor(JUST_ABOVE)).toBe('#000000')
  })

  it('place le seuil pile la ou les deux contrastes s egalisent', () => {
    // Au seuil, noir et blanc offrent le meme ratio (~4.58:1) : c est ce qui
    // definit le point de bascule, et aucune couleur 8 bits ne se glisse entre
    // les deux gris testes ci-dessus.
    expect(contrastRatio(THRESHOLD, 0)).toBeCloseTo(contrastRatio(THRESHOLD, 1), 12)
    expect(relativeLuminance(JUST_ABOVE)! - relativeLuminance(JUST_BELOW)!).toBeLessThan(0.005)
  })

  it('choisit toujours celui des deux qui contraste le mieux', () => {
    const samples = [
      '#FFFFFF', '#000000', '#0EA5E9', '#16A34A', '#F59E0B', '#2563EB',
      '#8B5CF6', '#A855F7', '#EC4899', '#84CC16', '#1E293B', '#0F0F0F',
      JUST_BELOW, JUST_ABOVE,
    ]

    for (const hex of samples) {
      const luminance = relativeLuminance(hex)!
      const chosen = readableTextColor(hex)
      const chosenRatio = contrastRatio(luminance, chosen === '#000000' ? 0 : 1)
      const rejectedRatio = contrastRatio(luminance, chosen === '#000000' ? 1 : 0)

      expect(chosenRatio).toBeGreaterThanOrEqual(rejectedRatio)
    }
  })

  it('retombe sur le blanc quand la couleur est illisible', () => {
    expect(readableTextColor('pas-une-couleur')).toBe('#FFFFFF')
    expect(readableTextColor('')).toBe('#FFFFFF')
  })
})

describe('Libelle des boutons — dans le CSS genere', () => {
  it('accorde le libelle du bouton primaire au fond choisi par l utilisateur', () => {
    expect(labelOf(generateThemeCSS({ primaryColor: '#0EA5E9' }))).toBe('#000000')
    expect(labelOf(generateThemeCSS({ primaryColor: '#2563EB' }))).toBe('#FFFFFF')
  })

  it('garde le meme libelle au survol pour ne pas le faire disparaitre', () => {
    const css = generateThemeCSS({ primaryColor: '#0EA5E9' })
    const primary = css.slice(0, css.indexOf('.btn--style-secondary'))

    expect(/--color:\s*#000000/.test(primary)).toBe(true)
    expect(/--hover-color:\s*#000000/.test(primary)).toBe(true)
  })

  it('accorde aussi le texte de la barre laterale a sa couleur de fond', () => {
    const light = generateThemeCSS({ sidebarColor: '#F1F5F9' })
    const dark = generateThemeCSS({ sidebarColor: '#0F0F0F' })

    expect(light.slice(light.indexOf('.nav,'))).toContain('color: #000000')
    expect(dark.slice(dark.indexOf('.nav,'))).toContain('color: #FFFFFF')
  })
})
