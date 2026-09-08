import { describe, expect, it } from 'vitest'
import readme from '../../README.md?raw'
import { generateThemeCSS } from '../utils/cssVariables.js'
import { getPresetColors } from '../utils/presets.js'

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

// ---------------------------------------------------------------------------
// Le handler du README, execute pour de vrai
// ---------------------------------------------------------------------------

/**
 * Les assertions textuelles ci-dessus ne prouvent que la PRESENCE d un gate.
 * Elles ont laisse passer une route qui ne testait que `!user` : le cookie
 * `payload-token` est le meme pour toutes les collections d auth (Payload
 * boucle sur toutes les strategies sans filtrer de collection), donc un simple
 * compte client front-office franchissait le controle et recevait `customCSS`.
 *
 * Ce qui suit compile le bloc du README et l execute contre un `payload`
 * simule, pour verifier la DECISION plutot que la syntaxe.
 */

const SECRET_CSS = '/* staging.interne.test — collection slug: contrats-prives */'

/** Le document que `payload.findGlobal()` rend en `overrideAccess: true`. */
const FULL_THEME: Record<string, unknown> = {
  preset: 'custom',
  brandName: 'Acme',
  logoUrl: '/logo.svg',
  primaryColor: '#123456',
  accentColor: '#654321',
  sidebarColor: '#abcdef',
  borderRadius: 12,
  faviconUrl: '/favicon.ico',
  darkMode: { primaryColor: '#0a0a0a' },
  hidePayloadBranding: true,
  customCSS: SECRET_CSS,
}

/** Les champs que `readableByAdminPanelUsers` retire hors du panneau admin. */
const ADMIN_ONLY_FIELDS = [
  'preset',
  'primaryColor',
  'accentColor',
  'sidebarColor',
  'borderRadius',
  'faviconUrl',
  'darkMode',
  'hidePayloadBranding',
  'customCSS',
]

/** La collection que `config.admin.user` designe dans le montage simule. */
const ADMIN_COLLECTION = 'users'

type FakeUser = { collection: string; id: number } | null

type RouteResponse = { body: string; headers: unknown; status: number }

class FakeNextResponse {
  body: string
  headers: unknown
  status: number

  constructor(body: string, init?: { headers?: unknown; status?: number }) {
    this.body = body
    this.headers = init?.headers
    this.status = init?.status ?? 200
  }
}

/**
 * Compile le bloc du README en fonction appelable.
 *
 * Seules les lignes `import` sont retirees — leurs bindings sont injectes en
 * parametres. Tout le reste est execute tel que l hote le collerait.
 */
function compileDocumentedRoute(source: string): (...deps: unknown[]) => Promise<RouteResponse> {
  const body = source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('import '))
    .join('\n')
    .replace('export async function GET', 'async function GET')

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = new Function(
    'nextHeaders',
    'NextResponse',
    'getPayload',
    'config',
    'generateThemeCSS',
    'getPresetColors',
    `${body}\nreturn GET`,
  ) as (...deps: unknown[]) => (...args: unknown[]) => Promise<RouteResponse>

  return (...deps: unknown[]) => factory(...deps)() as Promise<RouteResponse>
}

const documentedRoute = compileDocumentedRoute(route)

/**
 * Rejoue la route pour un appelant donne.
 *
 * `permissions` reproduit `payload.auth()` : `canAccessAdmin` n est vrai que
 * pour un membre de `config.admin.user` accepte par son `access.admin`, et
 * Payload SUPPRIME la cle quand elle est fausse (sanitizePermissions), d ou
 * l objet vide plutot qu un `false` explicite.
 *
 * `findGlobal` reproduit les deux modes documentes : `overrideAccess: true`
 * (defaut de l API locale) rend le document entier, `overrideAccess: false`
 * applique la garde de champ. Le test valide donc l issue — pas de fuite —
 * quelle que soit celle des deux corrections que le README retient.
 */
async function callRoute(caller: {
  canAccessAdmin?: boolean
  user: FakeUser
}): Promise<RouteResponse> {
  const payload = {
    auth: async () => ({
      permissions: caller.canAccessAdmin ? { canAccessAdmin: true } : {},
      user: caller.user,
    }),
    findGlobal: async (args: { overrideAccess?: boolean; user?: FakeUser } = {} as never) => {
      const readsAsAdminPanelUser =
        args.overrideAccess !== false || args.user?.collection === ADMIN_COLLECTION

      if (readsAsAdminPanelUser) return { ...FULL_THEME }

      const filtered = { ...FULL_THEME }
      for (const field of ADMIN_ONLY_FIELDS) delete filtered[field]
      return filtered
    },
  }

  return documentedRoute(
    async () => new Map(),
    FakeNextResponse,
    async () => payload,
    {},
    generateThemeCSS,
    getPresetColors,
  )
}

describe('README — la route CSS executee, appelant par appelant', () => {
  it('sert la feuille complete a un utilisateur du panneau admin', async () => {
    // Garde-fou anti-sur-correction : la fonctionnalite doit survivre au
    // correctif. C est cet appelant que `@import url(/api/admin-theme-css)`
    // depuis `custom.scss` produit.
    const res = await callRoute({
      canAccessAdmin: true,
      user: { collection: ADMIN_COLLECTION, id: 1 },
    })

    expect(res.status).toBe(200)
    expect(res.body).toContain(SECRET_CSS)
    expect(res.body).toContain('#123456')
  })

  it('ne sert rien a un anonyme', async () => {
    const res = await callRoute({ user: null })

    expect(res.status).toBe(401)
    expect(res.body).not.toContain(SECRET_CSS)
  })

  it('ne sert pas customCSS a un compte d une autre collection d auth', async () => {
    // Non-regression : le cookie `payload-token` est partage par toutes les
    // collections d auth, donc une inscription publique sur `customers`
    // produisait un `user` non nul et franchissait un gate en `!user`.
    const res = await callRoute({ user: { collection: 'customers', id: 2 } })

    expect(res.status).not.toBe(200)
    expect(res.body).not.toContain(SECRET_CSS)
  })

  it('ne sert pas customCSS a un compte que `access.admin` refuse', async () => {
    // Montage « une seule collection users pour le site public et l admin » :
    // l appartenance a la collection ne suffit pas, `canAccessAdmin` integre
    // le `access.admin` de la collection — comme `canOpenAdminPanel` cote
    // plugin (adminThemeGlobal.test.ts).
    const res = await callRoute({ user: { collection: ADMIN_COLLECTION, id: 3 } })

    expect(res.status).not.toBe(200)
    expect(res.body).not.toContain(SECRET_CSS)
  })

  it('ne fuit aucun champ reserve au panneau admin, pas seulement customCSS', async () => {
    const res = await callRoute({ user: { collection: 'customers', id: 2 } })

    // Les couleurs, le radius et les surcharges dark sont dans la meme colonne
    // restreinte que customCSS.
    expect(res.body).not.toContain('#123456')
    expect(res.body).not.toContain('#654321')
    expect(res.body).not.toContain('#abcdef')
    expect(res.body).not.toContain('#0a0a0a')
    expect(res.body).not.toContain('graphic-logo')
  })
})
