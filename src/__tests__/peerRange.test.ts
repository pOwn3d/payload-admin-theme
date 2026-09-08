import { describe, expect, it } from 'vitest'
import pkgRaw from '../../package.json?raw'
import readme from '../../README.md?raw'

/**
 * La plage de peer dependency est une consigne d installation : `^3.0.0`
 * autorisait npm/pnpm a resoudre un `payload` d avant 3.79.1, vulnerable a une
 * prise de controle de compte pre-authentification (GHSA-hp5w-3hxx-vmwf) et a
 * une injection SQL. Elle etait de surcroit fausse — le plugin declare
 * `react@^19.0.1`, or `@payloadcms/ui` n est passe a React 19 qu en 3.79.
 */

const pkg = JSON.parse(pkgRaw) as {
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
}

/** Premiere version publiee a la fois corrigee et native React 19. */
const FLOOR = [3, 79, 1] as const

/** Plus petite version qu une plage `^x.y.z` laisse installer. */
function lowerBound(range: string): number[] {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(range)
  if (!match) throw new Error(`Plage illisible : "${range}"`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isAtLeastFloor(range: string): boolean {
  const [major, minor, patch] = lowerBound(range)
  if (major! !== FLOOR[0]) return major! > FLOOR[0]
  if (minor! !== FLOOR[1]) return minor! > FLOOR[1]
  return patch! >= FLOOR[2]
}

describe('peerDependencies — plancher Payload', () => {
  it.each(['payload', '@payloadcms/ui'])(
    'refuse une resolution de "%s" anterieure a 3.79.1',
    (name) => {
      const range = pkg.peerDependencies[name]

      expect(range, `peerDependencies.${name} est absent`).toBeDefined()
      expect(
        isAtLeastFloor(range!),
        `peerDependencies.${name} vaut "${range}" : un consommateur peut encore installer une version vulnerable`,
      ).toBe(true)
    },
  )

  it('reste une plage majeure 3, pas un pin', () => {
    // Le plugin n a rien qui casse en 3.x superieur : reduire le plancher ne
    // doit pas se payer d un plafond artificiel.
    expect(pkg.peerDependencies.payload).toMatch(/^\^3\./)
    expect(pkg.peerDependencies['@payloadcms/ui']).toMatch(/^\^3\./)
  })

  it('ne declare pas une plage que les devDependencies ne couvrent pas', () => {
    // La version reellement testee doit tomber dans la plage annoncee, sinon
    // le plancher n est verifie par rien.
    for (const name of ['payload', '@payloadcms/ui']) {
      const dev = lowerBound(pkg.devDependencies[name]!)
      const peer = lowerBound(pkg.peerDependencies[name]!)

      expect(dev[0]).toBe(peer[0])
      expect(dev[1]! * 1000 + dev[2]!).toBeGreaterThanOrEqual(peer[1]! * 1000 + peer[2]!)
    }
  })

  it('annonce la meme plage dans le tableau Requirements du README', () => {
    // Le README est la premiere chose que lit un integrateur : une plage qui
    // derive du package.json renvoie a la version vulnerable.
    const requirements = readme.slice(readme.indexOf('\n## Requirements\n'))

    expect(requirements).toContain(`\`${pkg.peerDependencies.payload}\``)
    expect(requirements).toContain(`\`${pkg.peerDependencies['@payloadcms/ui']}\``)
  })

  it('n installe pas une version vulnerable depuis la commande du README', () => {
    // La ligne la plus copiee-collee du fichier : `pnpm add payload@...`.
    // Resserrer le peer sans la corriger laisse la faille a portee de shell,
    // et pnpm/npm poseraient la version demandee sans discuter.
    const installed = [...readme.matchAll(/(payload|@payloadcms\/ui)@(\^?[\d.]+)/g)]

    expect(installed.length).toBeGreaterThan(0)

    for (const [, name, range] of installed) {
      expect(
        isAtLeastFloor(range!),
        `le README propose d installer ${name}@${range}`,
      ).toBe(true)
    }
  })
})
