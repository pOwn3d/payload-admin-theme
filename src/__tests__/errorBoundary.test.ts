import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { AdminThemeErrorBoundary } from '../components/ErrorBoundary.js'
import { AdminBranding, AdminIcon } from '../components/AdminBranding.js'
import { ThemeInjectorClient } from '../components/ThemeProvider.js'

/**
 * Le paquet n embarque ni jsdom ni testing-library : la classe est donc
 * instanciee et ses methodes appelees directement. C est suffisant, parce que
 * tout ce que React fait d une ErrorBoundary passe par ces trois points de
 * contact — `getDerivedStateFromError`, `getDerivedStateFromProps` et
 * `render` — et c est exactement la ou sont les pieges corriges ici.
 */

type Props = ConstructorParameters<typeof AdminThemeErrorBoundary>[0]
type State = AdminThemeErrorBoundary['state']

/** Une instance dont l etat est celui d apres une erreur de rendu. */
function crashed(props: Props): AdminThemeErrorBoundary {
  const boundary = new AdminThemeErrorBoundary(props)
  boundary.state = {
    ...boundary.state,
    ...AdminThemeErrorBoundary.getDerivedStateFromError(),
  }
  return boundary
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AdminThemeErrorBoundary — capture', () => {
  it('bascule en erreur des que le rendu leve', () => {
    expect(AdminThemeErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true })
  })

  it('rend les enfants tant que rien n a leve', () => {
    const boundary = new AdminThemeErrorBoundary({ children: 'contenu' })
    const output = boundary.render() as React.ReactElement

    expect(React.isValidElement(output)).toBe(true)
    expect((output.props as { children: unknown }).children).toBe('contenu')
  })

  it('envoie le message et la pile dans la console, jamais a l ecran', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const boundary = crashed({ children: null, slotName: 'graphics.Logo' })

    boundary.componentDidCatch(new Error('secret interne'), {
      componentStack: '\n    at Quelque part',
    } as React.ErrorInfo)

    expect(spy).toHaveBeenCalledOnce()
    // Le nom du slot doit permettre d identifier le point de montage.
    expect(String(spy.mock.calls[0]![0])).toContain('graphics.Logo')
    // Le message d origine est un argument distinct : il part a la console,
    // pas dans une chaine rendue.
    expect(spy.mock.calls[0]![1]).toBeInstanceOf(Error)
  })
})

describe('AdminThemeErrorBoundary — `fallback={null}` n est pas « pas de fallback »', () => {
  it('rend exactement rien quand fallback vaut null', () => {
    // Le piege : `this.props.fallback ?? <Panneau/>` transforme un `null`
    // explicite en panneau visible. C est la faute exacte de SafeProvider dans
    // payload-admin-ui-pro, et elle poserait ici un pave d erreur en travers
    // de la barre laterale de CHAQUE page admin.
    expect(crashed({ children: null, fallback: null }).render()).toBeNull()
  })

  it('rend le panneau role="alert" quand aucun fallback n est fourni', () => {
    const output = crashed({ children: null }).render() as React.ReactElement
    const props = output.props as { role?: string; children?: unknown }

    expect(props.role).toBe('alert')
    expect(String(props.children)).not.toContain('Error')
  })

  it('le panneau par defaut n affiche aucun detail technique', () => {
    const boundary = crashed({ children: null })
    const output = boundary.render() as React.ReactElement
    const text = String((output.props as { children?: unknown }).children)

    // Rendu sur la page de connexion non authentifiee dans le cas graphics :
    // un message d erreur y serait de la reconnaissance offerte.
    expect(text).not.toMatch(/stack|at |\.tsx/i)
  })

  it('honore un fallback fourni', () => {
    expect(crashed({ children: null, fallback: 'repli' }).render()).toBe('repli')
  })
})

describe('AdminThemeErrorBoundary — resetKeys', () => {
  const derive = AdminThemeErrorBoundary.getDerivedStateFromProps

  it('ne touche a rien tant que les cles sont identiques', () => {
    const state: State = { hasError: true, keySnapshot: ['a', 1], generation: 3 }
    expect(derive({ children: null, resetKeys: ['a', 1] }, state)).toBeNull()
  })

  it('efface l erreur et remonte le sous-arbre quand une cle change', () => {
    const state: State = { hasError: true, keySnapshot: ['a'], generation: 3 }
    const next = derive({ children: null, resetKeys: ['b'] }, state)

    expect(next).toEqual({ hasError: false, keySnapshot: ['b'], generation: 4 })
  })

  it('enregistre les nouvelles cles sans remonter quand rien n a leve', () => {
    const state: State = { hasError: false, keySnapshot: ['a'], generation: 0 }
    const next = derive({ children: null, resetKeys: ['b'] }, state)

    // generation inchangee : remonter un sous-arbre sain perdrait son etat
    // pour rien.
    expect(next).toEqual({ keySnapshot: ['b'] })
  })

  it('compare les cles par identite et par position, comme un tableau de deps', () => {
    const state: State = { hasError: false, keySnapshot: ['a', 'b'], generation: 0 }

    expect(derive({ children: null, resetKeys: ['b', 'a'] }, state)).not.toBeNull()
    expect(derive({ children: null, resetKeys: ['a'] }, state)).not.toBeNull()
    expect(derive({ children: null, resetKeys: ['a', 'b'] }, state)).toBeNull()
  })

  it('la remontee passe par la cle React des enfants', () => {
    const boundary = new AdminThemeErrorBoundary({ children: 'x' })
    const first = boundary.render() as React.ReactElement

    boundary.state = { ...boundary.state, generation: 1 }
    const second = boundary.render() as React.ReactElement

    // Une cle differente = React demonte puis remonte, au lieu de reprendre
    // l etat qui vient de faire planter le composant.
    expect(first.key).not.toBe(second.key)
  })
})

describe('les slots globaux du plugin exportent bien le wrapper, pas le composant nu', () => {
  // Payload monte ces trois-la depuis l import map : le plugin n a aucun
  // moyen de leur poser un ancetre, la boundary doit donc etre a l interieur
  // du module. `graphics.Logo` rend sur la page de CONNEXION, non
  // authentifiee : une exception non capturee y verrouille tout le monde
  // hors de l admin.
  const slots = [
    ['AdminBranding (graphics.Logo)', AdminBranding],
    ['AdminIcon (graphics.Icon)', AdminIcon],
    ['ThemeInjectorClient (afterNavLinks)', ThemeInjectorClient],
  ] as const

  for (const [name, Component] of slots) {
    it(`${name} est enveloppe, avec un repli silencieux`, () => {
      const output = (Component as (p: object) => React.ReactElement)({
        globalSlug: 'admin-theme',
      })

      expect(output.type).toBe(AdminThemeErrorBoundary)
      // `null` et pas « rien » : le repli doit etre explicite, sinon le
      // panneau visible s afficherait sur toutes les pages admin.
      expect((output.props as Props).fallback).toBeNull()
      expect('fallback' in (output.props as object)).toBe(true)
      expect((output.props as Props).slotName).toBeTruthy()
    })
  }
})
