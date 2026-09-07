import { describe, expect, it } from 'vitest'
import { generateCSSVariables, generateThemeCSS } from '../utils/cssVariables.js'
import { relativeLuminance } from '../utils/colorUtils.js'

const DARK_SCOPE = '[data-theme="dark"]'

/**
 * Read a declaration value out of the generated stylesheet.
 * Anchored on a declaration start so `color` never matches `background-color`.
 */
function declaration(css: string, property: string): string | null {
  const match = new RegExp(`(?:^|[\\n;{])\\s*${property}\\s*:\\s*([^;\\n}]+)`).exec(css)
  return match ? match[1].trim() : null
}

/** Every selector line: what sits before a `{`, plus the comma-chained ones. */
function selectors(css: string): string[] {
  return css
    .split('\n')
    .filter((line) => line.includes('{') || line.trimEnd().endsWith(','))
    .map((line) => line.replace('{', '').replace(/,$/, '').trim())
    .filter(Boolean)
}

describe('generateThemeCSS — couleur primaire', () => {
  it('repeint le bouton primaire et habille le bouton secondaire', () => {
    const css = generateThemeCSS({ primaryColor: '#2563EB' })
    const secondary = css.slice(css.indexOf('.btn--style-secondary'))

    expect(css).toContain('.btn--style-primary')
    expect(declaration(css, '--bg-color')).toBe('#2563EB')
    expect(declaration(secondary, '--color')).toBe('#2563EB')
    expect(declaration(secondary, '--btn-border')).toBe('1px solid #2563EB')
  })

  it('assombrit la couleur pour l etat survole plutot que de la reutiliser telle quelle', () => {
    const css = generateThemeCSS({ primaryColor: '#2563EB' })
    const hover = declaration(css, '--hover-bg')

    expect(hover).toMatch(/^#[0-9a-f]{6}$/i)
    expect(hover).not.toBe('#2563EB')
    expect(relativeLuminance(hover!)!).toBeLessThan(relativeLuminance('#2563EB')!)
  })

  it('epargne les boutons desactives pour ne pas repeindre un Save grise', () => {
    // Le CSS du plugin est injecte hors @layer : sans :not(.btn--disabled) il
    // gagnerait sur la regle disabled de Payload, pourtant plus specifique.
    const css = generateThemeCSS({ primaryColor: '#2563EB' })
    const buttonSelectors = selectors(css).filter((sel) => sel.includes('.btn--style-'))

    expect(buttonSelectors.length).toBeGreaterThan(0)
    for (const sel of buttonSelectors) {
      expect(sel).toContain(':not(.btn--disabled)')
    }
  })

  it('ne touche jamais aux variables de texte globales de Payload', () => {
    // --theme-elevation-800 est alias de --theme-text : l ecrire recolorerait
    // tout le corps de texte de l admin, pas seulement les boutons.
    const css = generateThemeCSS({
      primaryColor: '#2563EB',
      accentColor: '#0EA5E9',
      sidebarColor: '#1E293B',
      borderRadius: 8,
    })

    expect(css).not.toContain('--theme-elevation-800')
    expect(css).not.toContain('--theme-text')
    expect(css).not.toContain('--theme-success')
  })
})

describe('generateThemeCSS — accent et barre laterale', () => {
  it('applique l accent au marqueur de nav actif et au focus clavier', () => {
    const css = generateThemeCSS({ accentColor: '#0EA5E9' })

    expect(css).toContain('.nav__link-indicator')
    expect(css).toContain(':focus-visible')
    expect(declaration(css, 'background-color')).toBe('#0EA5E9')
    expect(declaration(css, 'outline-color')).toBe('#0EA5E9')
  })

  it('peint le fond de la nav et force une couleur de texte lisible dessus', () => {
    const css = generateThemeCSS({ sidebarColor: '#1E293B' })
    const navBlock = css.slice(css.indexOf('.nav,'))

    expect(declaration(navBlock, 'background-color')).toBe('#1E293B')
    expect(declaration(navBlock, 'color')).toBe('#FFFFFF')
  })

  it('eclaircit le fond au survol et fait heriter le toggle des groupes', () => {
    // .nav-group__toggle epingle sa propre couleur et resterait gris illisible
    // sur une sidebar sombre.
    const css = generateThemeCSS({ sidebarColor: '#1E293B' })
    const hoverBg = declaration(css.slice(css.indexOf('.nav__link:hover')), 'background-color')
    const toggleBlock = css.slice(css.indexOf('.nav .nav-group__toggle {'))

    expect(hoverBg).toMatch(/^#[0-9a-f]{6}$/i)
    expect(relativeLuminance(hoverBg!)!).toBeGreaterThan(relativeLuminance('#1E293B')!)
    expect(declaration(toggleBlock, 'color')).toBe('inherit')
  })
})

describe('generateThemeCSS — rayon de bordure', () => {
  it('decline les trois paliers de rayon a partir d une seule valeur', () => {
    const css = generateThemeCSS({ borderRadius: 8 })

    expect(declaration(css, '--style-radius-s')).toBe('8px')
    expect(declaration(css, '--style-radius-m')).toBe('10px')
    expect(declaration(css, '--style-radius-l')).toBe('12px')
  })

  it('emet bien les angles droits quand le rayon vaut zero', () => {
    // 0 est falsy : une garde en truthiness ferait disparaitre le reglage
    // et rendrait le champ "Border Radius = 0" sans effet.
    const css = generateThemeCSS({ borderRadius: 0 })

    expect(declaration(css, '--style-radius-s')).toBe('0px')
    expect(declaration(css, '--style-radius-m')).toBe('2px')
    expect(declaration(css, '--style-radius-l')).toBe('4px')
  })

})

describe('generateThemeCSS — absence de valeurs', () => {
  it('ne produit rien du tout tant qu aucun reglage n est renseigne', () => {
    // Payload persiste '' plutot que null quand l utilisateur efface un champ :
    // les deux formes doivent rester sans effet.
    expect(generateThemeCSS({})).toBe('')
    expect(generateThemeCSS({ primaryColor: null, accentColor: null, sidebarColor: null })).toBe('')
    expect(generateThemeCSS({ primaryColor: '', accentColor: '', sidebarColor: '' })).toBe('')
    expect(generateThemeCSS({ borderRadius: null })).toBe('')
    expect(generateThemeCSS({ borderRadius: undefined })).toBe('')
  })

  it('n ecrit jamais une declaration vide ni un undefined dans la feuille', () => {
    const css = generateThemeCSS({ primaryColor: '#2563EB', sidebarColor: null })

    expect(css).not.toContain('undefined')
    expect(css).not.toContain('null')
    expect(css).not.toMatch(/:\s*;/)
  })

  it('n emet que les blocs des reglages renseignes', () => {
    const css = generateThemeCSS({ accentColor: '#0EA5E9' })

    expect(css).toContain('.nav__link-indicator')
    expect(css).not.toContain('.btn--style-primary')
    expect(css).not.toContain('--style-radius')
  })
})

describe('generateThemeCSS — portee mode sombre', () => {
  it('confine toutes les regles sombres au selecteur du mode sombre', () => {
    const css = generateThemeCSS(
      { primaryColor: '#A855F7', accentColor: '#EC4899', sidebarColor: '#0F0F0F' },
      { scope: DARK_SCOPE },
    )

    expect(selectors(css).length).toBeGreaterThan(0)
    for (const sel of selectors(css)) {
      expect(sel.startsWith(DARK_SCOPE)).toBe(true)
    }
  })

  it('pose les variables sombres sur le scope et non sur :root', () => {
    const css = generateThemeCSS({ borderRadius: 4 }, { scope: DARK_SCOPE })

    expect(css.startsWith(`${DARK_SCOPE} {`)).toBe(true)
    expect(css).not.toContain(':root')
  })

  it('n emet aucune surcharge sombre quand aucune couleur sombre n est definie', () => {
    // Regle metier : le mode sombre n est surcharge que s il a ete configure ;
    // sinon Payload garde ses propres couleurs sombres.
    expect(
      generateThemeCSS(
        { primaryColor: null, accentColor: '', sidebarColor: undefined },
        { scope: DARK_SCOPE },
      ),
    ).toBe('')
  })

  it('n emet que la surcharge sombre effectivement renseignee', () => {
    const css = generateThemeCSS(
      { primaryColor: '#A855F7', accentColor: null, sidebarColor: null },
      { scope: DARK_SCOPE },
    )

    expect(css).toContain('.btn--style-primary')
    expect(css).not.toContain('.nav__link-indicator')
    expect(css).not.toContain('.nav,')
  })
})

describe('generateCSSVariables', () => {
  it('cible le mode clair, sans jamais scoper au mode sombre', () => {
    const css = generateCSSVariables({ primaryColor: '#2563EB', borderRadius: 8 })

    expect(css.startsWith(':root {')).toBe(true)
    expect(css).not.toContain(DARK_SCOPE)
    expect(declaration(css, '--bg-color')).toBe('#2563EB')
  })

  it('reste vide quand le theme n est pas configure', () => {
    expect(generateCSSVariables({})).toBe('')
  })
})
