import { describe, expect, it } from 'vitest'
import type { Config } from 'payload'
import { adminThemePlugin } from '../plugin.js'
import type { AdminThemePluginConfig } from '../types.js'

const MARKER = '@consilioweb/payload-admin-theme/rsc#ThemeInjector'
const CLIENT = '@consilioweb/payload-admin-theme/client#ThemeInjectorClient'
const NAV_LINK = '@consilioweb/payload-admin-theme/rsc#ThemeNavLink'
const LOGIN = '@consilioweb/payload-admin-theme/rsc#LoginBranding'

interface Entry {
  path?: string
  clientProps?: Record<string, unknown>
}

/** Payload accepte une entree sous forme de chaine ou d objet : normalise. */
function entry(value: unknown): Entry {
  return typeof value === 'string' ? { path: value } : ((value ?? {}) as Entry)
}

function apply(pluginConfig: AdminThemePluginConfig = {}, incoming: Partial<Config> = {}): Config {
  const base = { collections: [], ...incoming } as unknown as Config
  return adminThemePlugin(pluginConfig)(base) as Config
}

function navLinkPaths(config: Config): (string | undefined)[] {
  const links = config.admin?.components?.afterNavLinks ?? []
  return (Array.isArray(links) ? links : [links]).map((item) => entry(item).path)
}

describe('adminThemePlugin — injection des composants', () => {
  it('enregistre le marqueur serveur puis le composant client qui pose le CSS', () => {
    // Deux entrees distinctes et dans cet ordre : le client lit le marqueur
    // deja present dans le DOM, et importer l un depuis l autre casserait
    // Turbopack (code client tire dans l arbre serveur).
    const paths = navLinkPaths(apply())

    expect(paths.indexOf(MARKER)).toBe(0)
    expect(paths.indexOf(CLIENT)).toBe(1)
  })

  it('transmet le slug du global aux deux injecteurs', () => {
    const links = apply({ globalSlug: 'branding' }).admin!.components!.afterNavLinks!

    for (const item of links.slice(0, 2)) {
      expect(entry(item).clientProps).toEqual({ globalSlug: 'branding' })
    }
  })

  it('ajoute le lien "Theme" apres les injecteurs, pointe sur le bon global', () => {
    const config = apply({ globalSlug: 'branding' })
    const links = config.admin!.components!.afterNavLinks!
    const last = entry(links[links.length - 1])

    expect(last.path).toBe(NAV_LINK)
    expect(last.clientProps).toEqual({ globalSlug: 'branding' })
  })

  it('n ajoute pas le lien de nav quand l hote n en veut pas', () => {
    expect(navLinkPaths(apply({ addNavLink: false }))).not.toContain(NAV_LINK)
  })

  it('retire les deux injecteurs quand l hote coupe l injection automatique', () => {
    // Echappatoire des packages symlinkes en dev : l hote monte lui-meme
    // ThemeInjectorClient.
    const paths = navLinkPaths(apply({ skipComponentInjection: true }))

    expect(paths).not.toContain(MARKER)
    expect(paths).not.toContain(CLIENT)
    expect(apply({ skipComponentInjection: true }).admin?.components?.beforeLogin).toBeUndefined()
  })

  // BUG CONNU (non corrige ici) : `skipComponentInjection` est documente comme
  // "seul le global est cree", et il existe pour contourner l echec de
  // resolution RSC des packages symlinkes. Or ThemeNavLink, servi par ce meme
  // package, continue d etre injecte : le contournement ne contourne rien tant
  // que l hote ne pense pas a ajouter aussi `addNavLink: false`.
  it('n injecte plus aucun composant du package quand l injection est coupee', () => {
    expect(navLinkPaths(apply({ skipComponentInjection: true }))).toEqual([])
  })

  it('respecte les chemins de composants surcharges par l hote', () => {
    const config = apply({
      themeInjectorPath: '@/admin/Marker#Marker',
      themeInjectorClientPath: '@/admin/Injector#Injector',
      navLinkPath: '@/admin/NavLink#NavLink',
      loginBrandingPath: '@/admin/Login#Login',
    })

    expect(navLinkPaths(config)).toEqual([
      '@/admin/Marker#Marker',
      '@/admin/Injector#Injector',
      '@/admin/NavLink#NavLink',
    ])
    expect(entry(config.admin!.components!.beforeLogin![0]).path).toBe('@/admin/Login#Login')
  })

  it('conserve les entrees afterNavLinks deja declarees par l hote', () => {
    const hostEntry = { path: '@/admin/HostLink#HostLink' }
    const paths = navLinkPaths(
      apply({}, { admin: { components: { afterNavLinks: [hostEntry] } } } as Partial<Config>),
    )

    expect(paths).toContain('@/admin/HostLink#HostLink')
    expect(paths).toContain(MARKER)
    expect(paths).toContain(NAV_LINK)
  })

  it('accepte une entree afterNavLinks unique non encapsulee dans un tableau', () => {
    const paths = navLinkPaths(
      apply(
        {},
        { admin: { components: { afterNavLinks: '@/admin/HostLink#HostLink' } } } as unknown as Partial<Config>,
      ),
    )

    expect(paths).toContain('@/admin/HostLink#HostLink')
    expect(paths).toContain(MARKER)
  })

  it('ajoute le branding de login apres ce que l hote affiche deja', () => {
    const config = apply(
      {},
      { admin: { components: { beforeLogin: ['@/admin/Notice#Notice'] } } } as unknown as Partial<Config>,
    )
    const beforeLogin = config.admin!.components!.beforeLogin!

    expect(entry(beforeLogin[0]).path).toBe('@/admin/Notice#Notice')
    expect(entry(beforeLogin[beforeLogin.length - 1]).path).toBe(LOGIN)
  })
})

describe('adminThemePlugin — remplacement du logo', () => {
  it('laisse le logo de Payload en place par defaut', () => {
    expect(apply().admin?.components?.graphics).toBeUndefined()
  })

  it('remplace logo et icone des que l hote configure un favicon (compat)', () => {
    const graphics = apply({ faviconUrl: '/favicon.ico' }).admin!.components!.graphics!

    expect(entry(graphics.Logo).path).toBe('@consilioweb/payload-admin-theme/client#AdminBranding')
    expect(entry(graphics.Icon).path).toBe('@consilioweb/payload-admin-theme/client#AdminIcon')
  })

  it('obeit a replaceBranding quand l hote le declare explicitement', () => {
    expect(apply({ replaceBranding: true }).admin!.components!.graphics!.Logo).toBeDefined()
    expect(
      apply({ replaceBranding: false, faviconUrl: '/favicon.ico' }).admin?.components?.graphics,
    ).toBeUndefined()
  })

  it('n ecrase jamais un logo que l hote a declare lui-meme', () => {
    const config = apply(
      { replaceBranding: true },
      {
        admin: { components: { graphics: { Logo: '@/admin/HostLogo#HostLogo' } } },
      } as unknown as Partial<Config>,
    )
    const graphics = config.admin!.components!.graphics!

    expect(entry(graphics.Logo).path).toBe('@/admin/HostLogo#HostLogo')
    expect(entry(graphics.Icon).path).toBe('@consilioweb/payload-admin-theme/client#AdminIcon')
  })
})

describe('adminThemePlugin — global et titre de page', () => {
  it('cree le global du theme avec le slug demande, sans deloger ceux de l hote', () => {
    const hostGlobal = { slug: 'settings', fields: [] }

    expect(apply().globals?.map((global) => global.slug)).toEqual(['admin-theme'])
    expect(apply({ globalSlug: 'branding' }).globals?.map((global) => global.slug)).toEqual([
      'branding',
    ])
    expect(
      apply({}, { globals: [hostGlobal] } as unknown as Partial<Config>).globals?.map(
        (global) => global.slug,
      ),
    ).toEqual(['settings', 'admin-theme'])
  })

  it('retire le suffixe "- Payload" du titre quand le branding est masque', () => {
    // Le CSS peut cacher le logo, pas le titre du document.
    expect(apply({ hidePayloadBranding: true }).admin?.meta?.titleSuffix).toBe('')
    expect(apply({ hidePayloadBranding: true, brandName: 'Acme' }).admin?.meta?.titleSuffix).toBe(
      '- Acme',
    )
  })

  it('ne touche pas a un suffixe de titre que l hote a deja choisi', () => {
    const config = apply(
      { hidePayloadBranding: true, brandName: 'Acme' },
      { admin: { meta: { titleSuffix: '- Maison' } } } as unknown as Partial<Config>,
    )

    expect(config.admin?.meta?.titleSuffix).toBe('- Maison')
    // Et sans hidePayloadBranding, le titre n est pas touche du tout.
    expect(apply({ brandName: 'Acme' }).admin?.meta?.titleSuffix).toBeUndefined()
  })
})

describe('adminThemePlugin — desactivation et immutabilite', () => {
  it('ne touche a rien quand le plugin est desactive', () => {
    const config = apply({ enabled: false, faviconUrl: '/favicon.ico' })

    expect(config.globals).toBeUndefined()
    expect(config.admin).toBeUndefined()
  })

  it('ne modifie pas la configuration recue par l hote', () => {
    const incoming = {
      collections: [],
      globals: [],
      admin: { components: { afterNavLinks: [], graphics: {} }, meta: {} },
    } as unknown as Config
    const snapshot = JSON.parse(JSON.stringify(incoming))

    adminThemePlugin({ faviconUrl: '/favicon.ico', hidePayloadBranding: true })(incoming)

    expect(JSON.parse(JSON.stringify(incoming))).toEqual(snapshot)
  })
})
