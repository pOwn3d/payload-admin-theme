import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminThemeData } from '../types.js'
import {
  fetchTheme,
  invalidateThemeCache,
  isTruncatedThemeResponse,
} from '../utils/themeCache.js'

const SLUG = 'admin-theme'

/**
 * Ce que `/api/globals/admin-theme` rend a un appel SANS session : les champs
 * marques `adminPanelOnly` dans le global portent une garde `access.read`, et
 * Payload les supprime purement et simplement de la reponse (afterRead ->
 * `delete siblingDoc[field.name]`, sans reinjection de `defaultValue`).
 */
const ANONYMOUS_PAYLOAD: AdminThemeData = {
  brandName: 'ACME',
  logoUrl: '/logo.svg',
  loginTitle: 'Bienvenue',
  loginSubtitle: null,
  loginLogoUrl: null,
}

/** Ce que le meme URL rend a un utilisateur du panneau admin. */
const AUTHENTICATED_PAYLOAD: AdminThemeData = {
  ...ANONYMOUS_PAYLOAD,
  preset: 'custom',
  primaryColor: '#3B82F6',
  accentColor: '#F59E0B',
  sidebarColor: '#111827',
  borderRadius: 8,
  faviconUrl: '/favicon.ico',
  hidePayloadBranding: true,
  darkMode: { primaryColor: '#60A5FA' },
  customCSS: '.collection-list--secret-slug { display: none }',
}

const originalFetch = globalThis.fetch

/** File d attente de reponses : une par appel reseau attendu. */
function mockFetchSequence(...payloads: (AdminThemeData | 'error')[]) {
  const queue = [...payloads]
  const spy = vi.fn((_url: string, _init?: RequestInit) => {
    const next = queue.length > 1 ? queue.shift()! : queue[0]
    if (next === 'error') {
      return Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({}) })
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(next) })
  })
  globalThis.fetch = spy as unknown as typeof fetch
  return spy
}

beforeEach(() => {
  invalidateThemeCache()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('fetchTheme — la lecture anonyme ne doit pas empoisonner la session', () => {
  it('ne ressert pas au theme la reponse tronquee lue sur la page de login', async () => {
    // NON-REGRESSION du bug introduit par le durcissement : la page de login
    // rend AdminBranding, qui fetch le global SANS session ; Payload renvoie
    // alors un document ampute de customCSS/couleurs/borderRadius. Le login de
    // Payload est une navigation client-side (router.push), donc ce cache
    // module survit a la redirection : si ThemeInjectorClient relit la meme
    // entree, l admin reste aux couleurs Payload jusqu a un F5.
    const spy = mockFetchSequence(ANONYMOUS_PAYLOAD, AUTHENTICATED_PAYLOAD)

    const beforeLogin = await fetchTheme(SLUG, 'branding')
    expect(beforeLogin?.brandName).toBe('ACME')
    expect(beforeLogin?.customCSS).toBeUndefined()

    const afterLogin = await fetchTheme(SLUG, 'full')

    expect(spy).toHaveBeenCalledTimes(2)
    expect(afterLogin?.customCSS).toBe(AUTHENTICATED_PAYLOAD.customCSS)
    expect(afterLogin?.primaryColor).toBe('#3B82F6')
    expect(afterLogin?.borderRadius).toBe(8)
    expect(afterLogin?.faviconUrl).toBe('/favicon.ico')
    expect(afterLogin?.hidePayloadBranding).toBe(true)
    expect(afterLogin?.darkMode?.primaryColor).toBe('#60A5FA')
  })

  it('ne memorise pas une reponse "full" tronquee, meme sans indication de scope', async () => {
    // Defense en profondeur : un appelant qui oublie de demander le scope
    // 'branding' retombe sur 'full'. La detection de charge tronquee doit
    // alors empecher la memorisation, sinon le bug revient par cette porte.
    const spy = mockFetchSequence(ANONYMOUS_PAYLOAD, AUTHENTICATED_PAYLOAD)

    const first = await fetchTheme(SLUG)
    expect(first?.customCSS).toBeUndefined()

    const second = await fetchTheme(SLUG)

    expect(spy).toHaveBeenCalledTimes(2)
    expect(second?.customCSS).toBe(AUTHENTICATED_PAYLOAD.customCSS)
  })

  it('garde le cache utile : une reponse complete n est fetchee qu une fois', async () => {
    const spy = mockFetchSequence(AUTHENTICATED_PAYLOAD)

    await fetchTheme(SLUG, 'full')
    const second = await fetchTheme(SLUG, 'full')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(second?.customCSS).toBe(AUTHENTICATED_PAYLOAD.customCSS)
  })

  it('mutualise toujours l appel entre AdminBranding et AdminIcon', async () => {
    const spy = mockFetchSequence(ANONYMOUS_PAYLOAD)

    const [logo, icon] = await Promise.all([
      fetchTheme(SLUG, 'branding'),
      fetchTheme(SLUG, 'branding'),
    ])

    expect(spy).toHaveBeenCalledTimes(1)
    expect(logo?.logoUrl).toBe('/logo.svg')
    expect(icon?.logoUrl).toBe('/logo.svg')
  })

  it('ne melange pas deux globalSlug differents', async () => {
    const spy = mockFetchSequence(AUTHENTICATED_PAYLOAD)

    await fetchTheme('theme-a', 'full')
    await fetchTheme('theme-b', 'full')

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[0][0]).toBe('/api/globals/theme-a')
    expect(spy.mock.calls[1][0]).toBe('/api/globals/theme-b')
  })

  it('envoie les cookies de session', async () => {
    const spy = mockFetchSequence(AUTHENTICATED_PAYLOAD)

    await fetchTheme(SLUG, 'full')

    expect(spy.mock.calls[0][1]).toMatchObject({ credentials: 'include' })
  })

  it('rend null sur echec et autorise un nouvel essai', async () => {
    const spy = mockFetchSequence('error', AUTHENTICATED_PAYLOAD)

    expect(await fetchTheme(SLUG, 'full')).toBeNull()
    const retry = await fetchTheme(SLUG, 'full')

    expect(spy).toHaveBeenCalledTimes(2)
    expect(retry?.customCSS).toBe(AUTHENTICATED_PAYLOAD.customCSS)
  })
})

describe('invalidateThemeCache', () => {
  it('vide les deux scopes d un slug', async () => {
    const spy = mockFetchSequence(AUTHENTICATED_PAYLOAD)

    await fetchTheme(SLUG, 'branding')
    await fetchTheme(SLUG, 'full')
    expect(spy).toHaveBeenCalledTimes(2)

    invalidateThemeCache(SLUG)

    await fetchTheme(SLUG, 'branding')
    await fetchTheme(SLUG, 'full')
    expect(spy).toHaveBeenCalledTimes(4)
  })

  it('laisse les autres slugs intacts', async () => {
    const spy = mockFetchSequence(AUTHENTICATED_PAYLOAD)

    await fetchTheme('theme-a', 'full')
    await fetchTheme('theme-b', 'full')

    invalidateThemeCache('theme-a')

    await fetchTheme('theme-b', 'full')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

describe('isTruncatedThemeResponse', () => {
  it('reconnait la reponse anonyme', () => {
    expect(isTruncatedThemeResponse(ANONYMOUS_PAYLOAD)).toBe(true)
    expect(isTruncatedThemeResponse({})).toBe(true)
    expect(isTruncatedThemeResponse(null)).toBe(true)
  })

  it('accepte une reponse authentifiee, meme avec des champs vides', () => {
    expect(isTruncatedThemeResponse(AUTHENTICATED_PAYLOAD)).toBe(false)
    // `preset` porte un defaultValue : Payload le reinjecte des que la garde
    // de lecture passe, donc il est present meme sur un global jamais sauve.
    expect(isTruncatedThemeResponse({ preset: 'custom' })).toBe(false)
    // Et une valeur nulle reste une cle presente.
    expect(isTruncatedThemeResponse({ customCSS: null })).toBe(false)
  })
})
