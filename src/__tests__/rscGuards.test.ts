import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import type { Payload } from 'payload'
import { ThemeInjector } from '../components/ThemeInjector.js'
import { ThemeNavLink } from '../components/ThemeNavLink.js'
import { LoginBranding } from '../components/LoginBranding.js'

/**
 * Ces trois composants n ont PAS de directive `'use client'` : ce sont des
 * composants serveur que Payload monte depuis l import map. Aucune
 * ErrorBoundary cliente ne peut donc leur servir d ancetre — le plugin n a
 * nulle part ou en poser une. Leur filet est un try/catch dans le corps du
 * composant, et ce fichier verifie qu il est TOTAL : il doit couvrir jusqu a
 * la lecture des props, qui, destructurees dans la signature, s executeraient
 * avant le try.
 *
 * Les trois sont montes sur des surfaces globales (`afterNavLinks` sur chaque
 * page admin, `beforeLogin` sur la page de connexion NON authentifiee), la ou
 * une exception ne degrade pas un ecran mais verrouille l acces a l admin.
 */

/** Un jeu de props dont la lecture de `globalSlug` leve. */
function hostileProps(): { globalSlug?: string } {
  return Object.defineProperty({}, 'globalSlug', {
    get() {
      throw new Error('prop illisible')
    },
    enumerable: true,
  }) as { globalSlug?: string }
}

describe('ThemeInjector — composant serveur, garde par try/catch', () => {
  it('rend le marqueur de slug en fonctionnement normal', () => {
    const output = ThemeInjector({ globalSlug: 'ma-charte' }) as React.ReactElement
    const props = output.props as Record<string, unknown>

    expect(props['data-admin-theme-slug']).toBe('ma-charte')
  })

  it('retourne null au lieu de propager quand la lecture des props leve', () => {
    expect(ThemeInjector(hostileProps())).toBeNull()
  })
})

describe('ThemeNavLink — composant serveur, garde par try/catch', () => {
  it('pointe sur le global en fonctionnement normal', () => {
    const output = ThemeNavLink({ globalSlug: 'ma-charte' }) as React.ReactElement

    expect((output.props as { href: string }).href).toBe('/admin/globals/ma-charte')
  })

  it('retourne null au lieu de propager quand la lecture des props leve', () => {
    expect(ThemeNavLink(hostileProps())).toBeNull()
  })
})

describe('LoginBranding — page de connexion non authentifiee', () => {
  /** Payload minimal : findGlobal renvoie ce qu on lui donne. */
  function payloadReturning(doc: unknown, warn = vi.fn()): Payload {
    return {
      findGlobal: async () => doc,
      logger: { warn },
    } as unknown as Payload
  }

  it('rend le titre de connexion en fonctionnement normal', async () => {
    const payload = payloadReturning({ loginTitle: 'Espace client' })
    const output = (await LoginBranding({ payload })) as React.ReactElement

    expect(React.isValidElement(output)).toBe(true)
  })

  it('rend null, et journalise, quand le global est illisible', async () => {
    const warn = vi.fn()
    const payload = {
      findGlobal: async () => {
        throw new Error('global absent')
      },
      logger: { warn },
    } as unknown as Payload

    expect(await LoginBranding({ payload })).toBeNull()
    expect(warn).toHaveBeenCalledOnce()
  })

  it('rend null quand le document lu fait lever le rendu', async () => {
    // Le try/catch existant ne couvrait que findGlobal : un document que la
    // base rend mais que le composant ne sait pas lire passait au travers et
    // emportait la page de connexion avec lui.
    const warn = vi.fn()
    const hostileDoc = Object.defineProperty({}, 'loginTitle', {
      get() {
        throw new Error('champ illisible')
      },
      enumerable: true,
    })

    expect(await LoginBranding({ payload: payloadReturning(hostileDoc, warn) })).toBeNull()
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0]![0])).toContain('admin-theme')
  })

  it('rend null sans payload, comme avant', async () => {
    expect(await LoginBranding({})).toBeNull()
  })
})
