import { describe, it, expect } from 'vitest'
import {
  VILLAGE_IDENTITIES, MATCH_STYLES, identityFor, rollIntensity, applyIdentityBias, styleParams,
  identityStageAdv, nationTalent, elementAffinityFor,
} from '../shared/constants/villageIdentity.js'
import { MINOR_NATIONS } from '../shared/constants/minorNations.js'
import { simMatch } from '../shared/utils/season.js'
import { mulberry32 } from './helpers/rng.js'

const _ELEMENTS = ['Fire', 'Water', 'Wind', 'Earth', 'Lightning']

describe('nation talent variety', () => {
  it('every identity has a valid element affinity + signature archetypes', () => {
    Object.entries(VILLAGE_IDENTITIES).forEach(([name, idn]) => {
      expect(_ELEMENTS, `${name} element`).toContain(idn.element)
      expect(Array.isArray(idn.archetypes) && idn.archetypes.length >= 2, `${name} archetypes`).toBe(true)
    })
  })

  it('nationTalent leans on the village affinity without being uniform', () => {
    const idn = VILLAGE_IDENTITIES.Emberfall  // Fire
    const rng = mulberry32(7)
    let fire = 0, other = 0, archetyped = 0
    for (let i = 0; i < 400; i++) {
      const t = nationTalent(idn, rng)
      expect(_ELEMENTS).toContain(t.element)
      t.element === 'Fire' ? fire++ : other++
      if (t.archetype) { expect(idn.archetypes).toContain(t.archetype); archetyped++ }
    }
    expect(fire).toBeGreaterThan(other)          // affinity dominates
    expect(other).toBeGreaterThan(0)             // but never uniform
    expect(archetyped).toBeGreaterThan(0)        // some carry a signature title
    expect(archetyped).toBeLessThan(400)
  })

  it('falls back to a random element with no affinity, and never archetypes', () => {
    const t = nationTalent({}, mulberry32(1))
    expect(_ELEMENTS).toContain(t.element)
    expect(t.archetype).toBeNull()
  })

  it('every minor nation carries a valid element affinity', () => {
    MINOR_NATIONS.forEach(m => expect(_ELEMENTS, m.n).toContain(m.element))
  })

  it('elementAffinityFor resolves great villages, minor nations, and null otherwise', () => {
    expect(elementAffinityFor('Emberfall')).toBe('Fire')
    expect(elementAffinityFor('Galecrest')).toBe('Wind')     // minor nation
    expect(elementAffinityFor('Skylark')).toBe('Lightning')  // minor nation
    expect(elementAffinityFor('Kasumi Hollow')).toBeNull()   // custom player name
    expect(elementAffinityFor()).toBeNull()
  })
})

// The pool in client/js/constants.js — kept in lockstep so every drawable village
// has an identity. If a village is added to the pool, this list (and the identity
// table) must grow with it.
const POOL_NAMES = [
  'Dunehold', 'Tidefort', 'Stoneveil', 'Stormreach', 'Wellspring', 'Verdancross',
  'Frostmere', 'Starhaven', 'Cragmoor', 'Emberfall', 'Mistral', 'Thornveil',
]

describe('village identities — coverage & shape', () => {
  it('every pool village has an identity with a valid style and a two-stat bias', () => {
    POOL_NAMES.forEach(n => {
      const idn = VILLAGE_IDENTITIES[n]
      expect(idn, `${n} missing identity`).toBeTruthy()
      expect(MATCH_STYLES[idn.style], `${n} has invalid style ${idn.style}`).toBeTruthy()
      expect(Object.keys(idn.statBias).length).toBe(2)
      expect(idn.label.length).toBeGreaterThan(0)
      expect(idn.blurb.length).toBeGreaterThan(0)
    })
  })

  it('identities are pairwise distinct (no two villages share label or exact bias)', () => {
    const labels = new Set(), biases = new Set()
    POOL_NAMES.forEach(n => {
      const idn = VILLAGE_IDENTITIES[n]
      labels.add(idn.label)
      biases.add(JSON.stringify(Object.entries(idn.statBias).sort()))
    })
    expect(labels.size).toBe(POOL_NAMES.length)
    expect(biases.size).toBe(POOL_NAMES.length)
  })

  it('identityFor falls back to a safe default for unknown names', () => {
    const d = identityFor('Not A Village')
    expect(d.style).toBe('balanced')
    expect(Object.keys(d.statBias).length).toBe(0)
    expect(styleParams(d.style)).toBe(MATCH_STYLES.balanced)
  })
})

describe('identity bias & intensity', () => {
  it('applyIdentityBias adds the signature stats scaled by intensity, clamped to 1..99', () => {
    const idn = identityFor('Stormreach') // speed +6, ninjutsu +3
    const stats = { speed: 40, ninjutsu: 40, taijutsu: 40 }
    applyIdentityBias(stats, idn, 1)
    expect(stats.speed).toBe(46)
    expect(stats.ninjutsu).toBe(43)
    expect(stats.taijutsu).toBe(40)      // untouched
    const hi = { speed: 97, ninjutsu: 98 }
    applyIdentityBias(hi, idn, 1.25)
    expect(hi.speed).toBe(99)            // clamped
  })

  it('rollIntensity stays within 0.75–1.25', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 200; i++) {
      const v = rollIntensity(rng)
      expect(v).toBeGreaterThanOrEqual(0.75)
      expect(v).toBeLessThanOrEqual(1.25)
    }
  })
})

describe('simMatch style effects', () => {
  // Legacy regression: with no styles, results must match the pre-identity engine.
  it('default (no styles) reproduces legacy behavior exactly', () => {
    const legacy = (aStr, bStr, rng) => {
      const sa = (aStr || 1) * (0.7 + rng() * 0.6)
      const sb = (bStr || 1) * (0.7 + rng() * 0.6)
      const diff = sa - sb
      if (Math.abs(diff) < Math.max(aStr, bStr, 1) * 0.05) return 'draw'
      return diff > 0 ? 'a' : 'b'
    }
    for (let seed = 1; seed <= 50; seed++) {
      const r1 = mulberry32(seed), r2 = mulberry32(seed)
      expect(simMatch(70, 60, r1).winner).toBe(legacy(70, 60, r2))
    }
  })

  it('fortress widens the draw band', () => {
    // Equal strengths, small swing → legacy narrowly decisive, fortress draws.
    const seq = vals => { let i = 0; return () => vals[i++ % vals.length] }
    // rolls: a=0.5→1.0x, b=0.62→1.072x on 60 vs 60: sa=60, sb=64.3 → diff 4.3; band legacy=3, fortress-band=5.4
    const legacyRes = simMatch(60, 60, seq([0.5, 0.62]))
    const fortRes = simMatch(60, 60, seq([0.5, 0.62]), 'fortress', 'balanced')
    expect(legacyRes.winner).toBe('b')
    expect(fortRes.winner).toBe('draw')
  })

  it('blitz produces fewer draws and more extreme swings than fortress over many matches', () => {
    const count = style => {
      const rng = mulberry32(7)
      let draws = 0
      for (let i = 0; i < 600; i++) if (simMatch(60, 60, rng, style, style).winner === 'draw') draws++
      return draws
    }
    expect(count('blitz')).toBeLessThan(count('fortress'))
  })

  it('identityStageAdv: signature arcs hold and magnitudes stay under the player posture swing', () => {
    // Blitz starts hot and fades; opportunist peaks late; fortress owns attrition.
    expect(identityStageAdv('blitz', 'early')).toBeGreaterThan(0)
    expect(identityStageAdv('blitz', 'late')).toBeLessThan(0)
    expect(identityStageAdv('opportunist', 'late')).toBeGreaterThan(0)
    expect(identityStageAdv('fortress', 'endurance')).toBeGreaterThan(0)
    expect(identityStageAdv('grinder', 'early')).toBeGreaterThan(0)
    // Balanced and unknowns are inert; player posture (±0.10) must dominate all nudges.
    const kinds = ['early', 'endurance', 'late']
    kinds.forEach(k => {
      expect(identityStageAdv('balanced', k)).toBe(0)
      expect(identityStageAdv('no-such-style', k)).toBe(0)
      Object.keys(MATCH_STYLES).forEach(s => expect(Math.abs(identityStageAdv(s, k))).toBeLessThan(0.10))
    })
    expect(identityStageAdv('blitz', 'no-such-kind')).toBe(0)
  })

  it('opportunist gains an edge only as the underdog; grinder only as the favorite', () => {
    const winRate = (aStr, bStr, aStyle) => {
      const rng = mulberry32(11)
      let w = 0
      for (let i = 0; i < 800; i++) if (simMatch(aStr, bStr, rng, aStyle, 'balanced').winner === 'a') w++
      return w
    }
    // Underdog (55 vs 70): opportunist should beat balanced baseline.
    expect(winRate(55, 70, 'opportunist')).toBeGreaterThan(winRate(55, 70, 'balanced'))
    // Favorite (70 vs 55): grinder should beat balanced baseline.
    expect(winRate(70, 55, 'grinder')).toBeGreaterThan(winRate(70, 55, 'balanced'))
    // And each is inert on the wrong side of the matchup (same params as balanced).
    expect(winRate(70, 55, 'opportunist')).toBe(winRate(70, 55, 'balanced'))
    expect(winRate(55, 70, 'grinder')).toBe(winRate(55, 70, 'balanced'))
  })
})
