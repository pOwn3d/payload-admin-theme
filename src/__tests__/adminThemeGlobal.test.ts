import { describe, expect, it } from 'vitest'
import type { GlobalConfig } from 'payload'
import { createAdminThemeGlobal } from '../globals/AdminTheme.js'
import type { AdminThemePluginConfig } from '../types.js'

type AccessArgs = Parameters<NonNullable<NonNullable<GlobalConfig['access']>['update']>>[0]

interface TestField {
  name?: string
  type?: string
  fields?: TestField[]
  validate?: unknown
  access?: { read?: FieldReadAccess }
  admin?: { components?: { Field?: unknown } }
}

type FieldReadAccess = (args: { req: unknown }) => boolean | Promise<boolean>

/** Reproduit la traversee que Payload fait lui-meme pour atteindre un champ. */
function findField(fields: unknown, name: string): TestField | undefined {
  for (const field of (fields ?? []) as TestField[]) {
    if (field.name === name && Array.isArray(field.fields) === false) return field
    const nested = findField(field.fields, name)
    if (nested) return nested
  }
  return undefined
}

function validatorOf(global: GlobalConfig, name: string): (value: unknown) => string | true {
  const field = findField(global.fields, name)
  if (!field?.validate) throw new Error(`Le champ "${name}" n a pas de validation`)
  return field.validate as (value: unknown) => string | true
}

function darkModeValidator(global: GlobalConfig, name: string) {
  const group = (global.fields as TestField[]).find((field) => field.name === 'darkMode')
  const field = findField(group?.fields, name)
  return field!.validate as (value: unknown) => string | true
}

/**
 * Mock Payload minimal : la regle d acces ne lit que `req.user` et le slug de
 * la collection admin declaree dans la config.
 */
function canUpdate(
  user: unknown,
  options: { adminUserSlug?: string | null; pluginConfig?: AdminThemePluginConfig } = {},
) {
  const global = createAdminThemeGlobal(options.pluginConfig ?? {})
  const adminUserSlug = options.adminUserSlug === undefined ? 'users' : options.adminUserSlug
  const req = {
    user,
    payload: { config: { admin: adminUserSlug ? { user: adminUserSlug } : {} } },
  }
  return global.access!.update!({ req } as unknown as AccessArgs)
}

const adminUser = (extra: Record<string, unknown>) => ({ collection: 'users', ...extra })

describe('AdminTheme — qui peut retheming l admin', () => {
  it('laisse passer un administrateur declare par le champ role', () => {
    expect(canUpdate(adminUser({ role: 'admin' }))).toBe(true)
  })

  it('laisse passer un administrateur declare dans une liste de roles', () => {
    expect(canUpdate(adminUser({ roles: ['editor', 'admin'] }))).toBe(true)
  })

  it('laisse passer un administrateur quand roles est un select simple', () => {
    expect(canUpdate(adminUser({ roles: 'admin' }))).toBe(true)
  })

  it('refuse un role dont "admin" n est qu un morceau du nom', () => {
    // Non-regression : includes() sur une chaine acceptait 'admin-readonly'
    // et 'non-admin' comme s ils etaient administrateurs.
    expect(canUpdate(adminUser({ roles: 'admin-readonly' }))).toBe(false)
    expect(canUpdate(adminUser({ roles: 'non-admin' }))).toBe(false)
    expect(canUpdate(adminUser({ roles: 'superadmin' }))).toBe(false)
    expect(canUpdate(adminUser({ role: 'admin-readonly' }))).toBe(false)
  })

  it('refuse les memes libelles trompeurs dans une liste de roles', () => {
    expect(canUpdate(adminUser({ roles: ['admin-readonly', 'non-admin'] }))).toBe(false)
  })

  it('refuse un utilisateur sans role administrateur', () => {
    expect(canUpdate(adminUser({ role: 'editor' }))).toBe(false)
    expect(canUpdate(adminUser({ roles: [] }))).toBe(false)
    expect(canUpdate(adminUser({}))).toBe(false)
  })

  it('refuse un visiteur non authentifie', () => {
    expect(canUpdate(null)).toBe(false)
    expect(canUpdate(undefined)).toBe(false)
  })

  it('refuse un admin venant d une autre collection authentifiee', () => {
    // Une collection tierce (clients, agents...) peut avoir son propre champ
    // roles : elle ne doit pas pouvoir repeindre le panneau admin.
    expect(canUpdate({ collection: 'support-clients', roles: ['admin'] })).toBe(false)
  })

  it('s en tient au role quand la config ne declare aucune collection admin', () => {
    expect(canUpdate({ roles: ['admin'] }, { adminUserSlug: null })).toBe(true)
    expect(canUpdate({ roles: ['editor'] }, { adminUserSlug: null })).toBe(false)
  })

  it('cede la place a la regle d acces fournie par l hote', () => {
    const pluginConfig: AdminThemePluginConfig = { access: { update: () => true } }

    expect(canUpdate(adminUser({ role: 'editor' }), { pluginConfig })).toBe(true)
    expect(canUpdate(null, { pluginConfig })).toBe(true)
  })

  it('laisse le theme lisible sans authentification', () => {
    // La page de login lit le global avant toute connexion : une lecture
    // fermee par defaut afficherait un login non brande.
    const global = createAdminThemeGlobal()

    expect(global.access!.read!({ req: { user: null } } as unknown as AccessArgs)).toBe(true)
  })
})

describe('AdminTheme — validation des champs', () => {
  const global = createAdminThemeGlobal()

  it('n accepte comme couleur qu un hexadecimal a 3 ou 6 chiffres', () => {
    const validate = validatorOf(global, 'primaryColor')

    expect(validate('#FFF')).toBe(true)
    expect(validate('#3b82f6')).toBe(true)
    expect(validate('')).toBe(true)
    expect(validate(null)).toBe(true)

    expect(validate('red')).toBeTypeOf('string')
    expect(validate('#GGGGGG')).toBeTypeOf('string')
    expect(validate('3B82F6')).toBeTypeOf('string')
    expect(validate('#3B82F')).toBeTypeOf('string')
    expect(validate('rgb(0,0,0)')).toBeTypeOf('string')
  })

  it('valide aussi les couleurs du mode sombre', () => {
    expect(darkModeValidator(global, 'primaryColor')('#A855F7')).toBe(true)
    expect(darkModeValidator(global, 'sidebarColor')('nope')).toBeTypeOf('string')
  })

  it('n accepte que des URL locales, https ou data:image pour les visuels', () => {
    const validate = validatorOf(global, 'logoUrl')

    expect(validate('/logo.svg')).toBe(true)
    expect(validate('https://cdn.example.com/logo.png')).toBe(true)
    expect(validate('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(true)
    expect(validate('javascript:alert(1)')).toBeTypeOf('string')
    expect(validate('http://cdn.example.com/logo.png')).toBeTypeOf('string')
  })

  it('laisse passer le CSS inoffensif mais refuse ressources distantes et code', () => {
    const validate = validatorOf(global, 'customCSS')

    expect(validate('.nav { border-right: 1px solid #eee; }')).toBe(true)
    expect(validate('/* juste un commentaire */')).toBe(true)
    expect(validate('')).toBe(true)

    expect(validate('@import url("https://evil.test/x.css");')).toBeTypeOf('string')
    expect(validate('.a { background: url(https://evil.test/pixel.png); }')).toBeTypeOf('string')
    expect(validate('.a { background: image-set("a.png" 1x); }')).toBeTypeOf('string')
    expect(validate('.a { behavior: url(x.htc); }')).toBeTypeOf('string')
    expect(validate('.a { width: expression(alert(1)); }')).toBeTypeOf('string')
    expect(validate('.a { background: javascript:alert(1); }')).toBeTypeOf('string')
    expect(validate('</style><script>alert(1)</script>')).toBeTypeOf('string')
  })

  it('voit a travers les echappements et les commentaires qui cachent un mot interdit', () => {
    // Non-regression : `@\\69 mport`, `u\\72 l(...)` et `ur/**/l(...)` sont du
    // CSS valide et passaient intacts devant les motifs interdits.
    const validate = validatorOf(global, 'customCSS')

    expect(validate('@\\69 mport "https://evil.test/x.css";')).toBeTypeOf('string')
    expect(validate('.a { background: u\\72 l(https://evil.test/p.png); }')).toBeTypeOf('string')
    expect(validate('.a { background: \\75 rl(https://evil.test/p.png); }')).toBeTypeOf('string')
    expect(validate('.a { background: ur/**/l(https://evil.test/p.png); }')).toBeTypeOf('string')
    expect(validate('@im/**/port "https://evil.test/x.css";')).toBeTypeOf('string')
  })
})

describe('AdminTheme — structure du global', () => {
  it('utilise le slug demande par l hote', () => {
    expect(createAdminThemeGlobal().slug).toBe('admin-theme')
    expect(createAdminThemeGlobal({ globalSlug: 'branding' }).slug).toBe('branding')
  })

  it('reprend les valeurs par defaut fournies a la configuration du plugin', () => {
    const global = createAdminThemeGlobal({
      brandName: 'Acme',
      primaryColor: '#123456',
      borderRadius: 0,
    })

    expect(findField(global.fields, 'brandName')).toMatchObject({ defaultValue: 'Acme' })
    expect(findField(global.fields, 'primaryColor')).toMatchObject({ defaultValue: '#123456' })
    expect(findField(global.fields, 'borderRadius')).toMatchObject({ defaultValue: 0 })
  })

  it('branche le selecteur de couleur, celui du plugin ou celui de l hote', () => {
    const byDefault = createAdminThemeGlobal()
    const custom = createAdminThemeGlobal({
      colorPickerComponent: '@/components/admin/MyPicker#MyPicker',
    })

    expect(findField(byDefault.fields, 'accentColor')?.admin?.components?.Field).toBe(
      '@consilioweb/payload-admin-theme/client#ColorPickerField',
    )
    expect(findField(custom.fields, 'primaryColor')?.admin?.components?.Field).toBe(
      '@/components/admin/MyPicker#MyPicker',
    )
  })

  it('retire completement le selecteur de couleur quand l hote le desactive', () => {
    // Echappatoire documentee pour les packages symlinkes en dev.
    const global = createAdminThemeGlobal({ colorPickerComponent: false })

    expect(findField(global.fields, 'accentColor')?.admin?.components).toBeUndefined()
  })
})


/**
 * Les groupes (`darkMode`) sont ignores par `findField`, qui ne rend que les
 * feuilles : on retombe sur une recherche au premier niveau.
 */
function readAccessOf(global: GlobalConfig, name: string): FieldReadAccess | undefined {
  const leaf = findField(global.fields, name)
  const group = (global.fields as TestField[]).find((field) => field.name === name)
  return (leaf ?? group)?.access?.read
}

/** Rejoue la garde de lecture d un champ avec le meme `req` que Payload. */
function canReadField(
  name: string,
  user: unknown,
  adminUserSlug: string | null = 'users',
) {
  const read = readAccessOf(createAdminThemeGlobal(), name)
  if (!read) throw new Error(`Le champ "${name}" n a aucune garde de lecture`)
  const req = {
    user,
    payload: { config: { admin: adminUserSlug ? { user: adminUserSlug } : {} } },
  }
  return read({ req })
}

/**
 * Champs qu aucun rendu anonyme ne consomme : seul `ThemeInjectorClient`,
 * monte dans `afterNavLinks`, les lit — donc dans une session admin ouverte.
 */
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
] as const

describe('AdminTheme — ce qu une requete anonyme rapporte', () => {
  it.each(ADMIN_ONLY_FIELDS)('refuse "%s" a un appel sans session', (name) => {
    // Non-regression : `curl /api/globals/admin-theme` rendait le document
    // complet, customCSS compris (feuille de style ecrite par un developpeur,
    // qui nomme couramment des slugs internes et des URL de staging).
    expect(canReadField(name, null)).toBe(false)
    expect(canReadField(name, undefined)).toBe(false)
  })

  it.each(ADMIN_ONLY_FIELDS)(
    'rend "%s" a un utilisateur du panneau admin, meme sans role admin',
    (name) => {
      // Un editeur doit voir son admin theme, et quiconque peut `update` le
      // global doit pouvoir relire les champs qu il reecrit.
      expect(canReadField(name, { collection: 'users', role: 'editor' })).toBe(true)
      expect(canReadField(name, { collection: 'users', roles: ['admin'] })).toBe(true)
    },
  )

  it.each(ADMIN_ONLY_FIELDS)(
    'refuse "%s" a un authentifie d une autre collection',
    (name) => {
      // Non-regression : `!!req.user` aurait suffi a un client front-office
      // ou a un agent support pour recuperer le CSS de l admin.
      expect(canReadField(name, { collection: 'support-clients', roles: ['admin'] })).toBe(
        false,
      )
      expect(canReadField(name, { collection: 'customers' })).toBe(false)
    },
  )

  it('laisse brandName et logoUrl publics : la page de login les lit sans session', () => {
    // AdminBranding / AdminIcon sont montes dans `admin.components.graphics`,
    // rendus sur la page de login, et fetchent /api/globals/<slug> depuis le
    // navigateur avant toute authentification. Les fermer casse le branding.
    const global = createAdminThemeGlobal()

    expect(findField(global.fields, 'brandName')?.access).toBeUndefined()
    expect(findField(global.fields, 'logoUrl')?.access).toBeUndefined()
    expect(global.access!.read!({ req: { user: null } } as unknown as AccessArgs)).toBe(true)
  })

  it('laisse le bloc Login Page public : il est deja affiche aux anonymes', () => {
    const global = createAdminThemeGlobal()

    for (const name of ['loginTitle', 'loginSubtitle', 'loginLogoUrl']) {
      expect(findField(global.fields, name)?.access).toBeUndefined()
    }
  })

  it('se rabat sur "authentifie" quand la config ne declare pas de collection admin', () => {
    expect(canReadField('customCSS', { collection: 'users' }, null)).toBe(true)
    expect(canReadField('customCSS', null, null)).toBe(false)
  })
})


/**
 * Deuxieme couche de la garde : la fonction `access.admin` que l hote declare
 * sur la collection d authentification, c est-a-dire la regle que Payload
 * lui-meme applique pour ouvrir le panneau (`utilities/canAccessAdmin`).
 */
type AdminAccessFn = (args: { req: unknown }) => boolean | Promise<boolean>

function reqWith(
  user: unknown,
  options: {
    adminUserSlug?: string | null
    adminAccess?: Record<string, AdminAccessFn>
  } = {},
) {
  const adminUserSlug = options.adminUserSlug === undefined ? 'users' : options.adminUserSlug
  const collections = Object.fromEntries(
    Object.entries(options.adminAccess ?? {}).map(([slug, admin]) => [
      slug,
      { config: { access: { admin } } },
    ]),
  )
  return {
    user,
    payload: {
      config: { admin: adminUserSlug ? { user: adminUserSlug } : {} },
      collections,
    },
  }
}

function readField(name: string, req: unknown) {
  const read = readAccessOf(createAdminThemeGlobal(), name)
  if (!read) throw new Error(`Le champ "${name}" n a aucune garde de lecture`)
  return read({ req })
}

function updateWith(req: unknown) {
  return createAdminThemeGlobal().access!.update!({ req } as unknown as AccessArgs)
}

/** Compte les appels sans dependre d une API de mock. */
function spy(result: boolean | Promise<boolean> | (() => never)) {
  const calls: unknown[] = []
  const fn: AdminAccessFn = (args) => {
    calls.push(args)
    if (typeof result === 'function') return result()
    return result
  }
  return { fn, calls }
}

describe('AdminTheme — access.admin de la collection fait foi', () => {
  it.each(ADMIN_ONLY_FIELDS)(
    'refuse "%s" a un compte front-office de la collection admin recale par access.admin',
    async (name) => {
      // Non-regression : la garde ne comparait que `user.collection` a
      // `config.admin.user`. Sur le montage le plus courant de Payload 3 — une
      // seule collection `users` pour le site public et l admin, separes par
      // `access.admin` — tout compte client inscrit repartait avec le customCSS.
      const req = reqWith(
        { collection: 'users', role: 'customer' },
        { adminAccess: { users: ({ req: r }) => (r as { user: { role: string } }).user.role !== 'customer' } },
      )

      expect(await readField(name, req)).toBe(false)
    },
  )

  it('laisse passer un editeur que access.admin accepte', async () => {
    const req = reqWith(
      { collection: 'users', role: 'editor' },
      { adminAccess: { users: () => true } },
    )

    expect(await readField('customCSS', req)).toBe(true)
  })

  it('passe a access.admin le req complet, pas un objet reconstruit', async () => {
    const seen = spy(true)
    const req = reqWith({ collection: 'users' }, { adminAccess: { users: seen.fn } })

    await readField('customCSS', req)

    expect(seen.calls).toEqual([{ req }])
  })

  it('accepte une fonction access.admin asynchrone', async () => {
    const allow = reqWith(
      { collection: 'users' },
      { adminAccess: { users: () => Promise.resolve(true) } },
    )
    const deny = reqWith(
      { collection: 'users' },
      { adminAccess: { users: () => Promise.resolve(false) } },
    )

    expect(await readField('customCSS', allow)).toBe(true)
    expect(await readField('customCSS', deny)).toBe(false)
  })

  it('refuse quand access.admin echoue, synchrone ou en promesse', async () => {
    // Fail closed : un hote dont `access.admin` casse verrouille deja ce
    // compte hors du panneau, la feuille de style suit.
    const thrown = reqWith(
      { collection: 'users' },
      { adminAccess: { users: () => { throw new Error('db down') } } },
    )
    const rejected = reqWith(
      { collection: 'users' },
      { adminAccess: { users: () => Promise.reject(new Error('db down')) } },
    )

    expect(await readField('customCSS', thrown)).toBe(false)
    expect(await readField('customCSS', rejected)).toBe(false)
  })

  it('n appelle jamais access.admin pour un anonyme', async () => {
    // La fonction de Payload retombe sur un `payload.find()` quand il n y a pas
    // d utilisateur : l appeler une fois par champ garde ferait de
    // `curl /api/globals/admin-theme` une rafale de lectures en base.
    const seen = spy(true)
    const req = reqWith(null, { adminAccess: { users: seen.fn } })

    expect(await readField('customCSS', req)).toBe(false)
    expect(seen.calls).toHaveLength(0)
  })

  it('n interroge pas le access.admin d une autre collection', async () => {
    // La garde d appartenance passe en premier : un `access.admin` permissif
    // pose sur `customers` ne doit pas ouvrir le theme a ses comptes.
    const seen = spy(true)
    const req = reqWith(
      { collection: 'customers', roles: ['admin'] },
      { adminAccess: { customers: seen.fn } },
    )

    expect(await readField('customCSS', req)).toBe(false)
    expect(seen.calls).toHaveLength(0)
  })

  it('applique la meme regle a l ecriture du global', async () => {
    // Une seule source de verite : ce que la lecture refuse, l ecriture le
    // refuse aussi, sinon la faille se rouvre par le verbe oppose.
    const denied = reqWith(
      { collection: 'users', roles: ['admin'] },
      { adminAccess: { users: () => false } },
    )
    const allowed = reqWith(
      { collection: 'users', roles: ['admin'] },
      { adminAccess: { users: () => true } },
    )

    expect(await updateWith(denied)).toBe(false)
    expect(await updateWith(allowed)).toBe(true)
  })

  it('n interroge pas access.admin pour un compte sans role admin', async () => {
    const seen = spy(true)
    const req = reqWith({ collection: 'users', role: 'editor' }, { adminAccess: { users: seen.fn } })

    expect(await updateWith(req)).toBe(false)
    expect(seen.calls).toHaveLength(0)
  })
})
