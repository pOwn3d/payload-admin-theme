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
  admin?: { components?: { Field?: unknown } }
}

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
