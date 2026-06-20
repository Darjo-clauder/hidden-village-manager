import { describe, it, expect } from 'vitest'
import {
  updateConfidence, confidenceMod, formGrudge, grudgePenalty, pairChemistryBonus,
  personalityBlurb, NARUTO_ARCHETYPES, ARCHETYPE_BY_ID,
} from '../shared/utils/personality.js'

function makeShinobi(overrides = {}) {
  return { id: 'a', confidence: 50, grudges: [], bonds: [], narrativeArchetype: null, ...overrides }
}

describe('updateConfidence', () => {
  it('decisive increases confidence', () => {
    const s = makeShinobi()
    updateConfidence(s, 'decisive')
    expect(s.confidence).toBeGreaterThan(50)
  })

  it('disaster decreases confidence', () => {
    const s = makeShinobi()
    updateConfidence(s, 'disaster')
    expect(s.confidence).toBeLessThan(50)
  })

  it('KIA option amplifies the penalty', () => {
    const base = makeShinobi(); updateConfidence(base, 'disaster')
    const withKIA = makeShinobi(); updateConfidence(withKIA, 'disaster', { hadKIA: true })
    expect(withKIA.confidence).toBeLessThan(base.confidence)
  })

  it('prodigy archetype doubles swing', () => {
    const normal = makeShinobi(); updateConfidence(normal, 'decisive')
    const prodigy = makeShinobi({ narrativeArchetype: 'prodigy' }); updateConfidence(prodigy, 'decisive')
    expect(prodigy.confidence).toBeGreaterThan(normal.confidence)
  })

  it('gentle_fist has a higher floor than default', () => {
    const s = makeShinobi({ narrativeArchetype: 'gentle_fist', confidence: 50 })
    for (let i = 0; i < 20; i++) updateConfidence(s, 'disaster')
    expect(s.confidence).toBeGreaterThanOrEqual(ARCHETYPE_BY_ID.gentle_fist.confidenceFloor)
  })

  it('sage_path is capped at 85', () => {
    const s = makeShinobi({ narrativeArchetype: 'sage_path', confidence: 50 })
    for (let i = 0; i < 20; i++) updateConfidence(s, 'decisive')
    expect(s.confidence).toBeLessThanOrEqual(85)
  })

  it('initialises confidence to 50 if missing', () => {
    const s = {}
    updateConfidence(s, 'narrow')
    expect(typeof s.confidence).toBe('number')
  })
})

describe('confidenceMod', () => {
  it('returns 0 at confidence 50', () => {
    expect(confidenceMod({ confidence: 50 })).toBe(0)
  })

  it('returns +0.05 at confidence 100', () => {
    expect(confidenceMod({ confidence: 100 })).toBe(0.05)
  })

  it('returns −0.05 at confidence 0', () => {
    expect(confidenceMod({ confidence: 0 })).toBe(-0.05)
  })

  it('stays within ±0.05 for all valid inputs', () => {
    for (let c = 0; c <= 100; c++) {
      const mod = confidenceMod({ confidence: c })
      expect(mod).toBeGreaterThanOrEqual(-0.05)
      expect(mod).toBeLessThanOrEqual(0.05)
    }
  })
})

describe('formGrudge', () => {
  it('creates a grudge entry', () => {
    const s = makeShinobi()
    formGrudge(s, 'b', 'Bob', 'blame_loss', { year: 1, month: 3 })
    expect(s.grudges).toHaveLength(1)
    expect(s.grudges[0].targetId).toBe('b')
    expect(s.grudges[0].reasonLabel).toBe('Mission Blame')
  })

  it('intensifies an existing grudge instead of adding a duplicate', () => {
    const s = makeShinobi()
    formGrudge(s, 'b', 'Bob', 'blame_loss', { year: 1, month: 1 })
    const firstIntensity = s.grudges[0].intensity
    formGrudge(s, 'b', 'Bob', 'blame_loss', { year: 1, month: 2 })
    expect(s.grudges).toHaveLength(1)
    expect(s.grudges[0].intensity).toBeGreaterThanOrEqual(firstIntensity)
  })

  it('caps intensity at 3', () => {
    const s = makeShinobi()
    for (let i = 0; i < 10; i++) formGrudge(s, 'b', 'Bob', 'kia_partner', { year: 1, month: i })
    expect(s.grudges[0].intensity).toBeLessThanOrEqual(3)
  })

  it('avenger archetype amplifies grudge intensity', () => {
    const normal  = makeShinobi()
    const avenger = makeShinobi({ narrativeArchetype: 'avenger' })
    formGrudge(normal,  'x', 'X', 'harsh_training', { year: 1, month: 1 })
    formGrudge(avenger, 'x', 'X', 'harsh_training', { year: 1, month: 1 })
    expect(avenger.grudges[0].intensity).toBeGreaterThanOrEqual(normal.grudges[0].intensity)
  })

  it('caps grudge list at 5 entries', () => {
    const s = makeShinobi()
    for (let i = 0; i < 8; i++) formGrudge(s, `target_${i}`, `T${i}`, 'rival_village', { year: 1, month: i })
    expect(s.grudges.length).toBeLessThanOrEqual(5)
  })
})

describe('grudgePenalty', () => {
  it('returns 0 when no grudge exists', () => {
    const a = makeShinobi({ id: 'a' })
    const b = makeShinobi({ id: 'b' })
    expect(grudgePenalty(a, b)).toBe(0)
  })

  it('returns negative penalty proportional to intensity', () => {
    const a = makeShinobi({ id: 'a' })
    const b = makeShinobi({ id: 'b' })
    formGrudge(a, 'b', 'B', 'kia_partner', { year: 1, month: 1 }) // intensity 3
    const p = grudgePenalty(a, b)
    expect(p).toBeLessThan(0)
    expect(p).toBe(-15) // 3 * −5
  })
})

describe('pairChemistryBonus', () => {
  it('returns 0 for two strangers with no missions', () => {
    const a = makeShinobi({ id: 'a' })
    const b = makeShinobi({ id: 'b' })
    expect(pairChemistryBonus(a, b, {})).toBe(0)
  })

  it('grants 1 bonus per 5 shared missions, capped at 10', () => {
    const a = makeShinobi({ id: 'a' })
    const b = makeShinobi({ id: 'b' })
    const log = { 'a_b': 25 }
    expect(pairChemistryBonus(a, b, log)).toBe(5)
  })

  it('Brothers-in-Arms bond adds 8', () => {
    const a = makeShinobi({ id: 'a', bonds: [{ otherId: 'b', type: 'Brothers-in-Arms' }] })
    const b = makeShinobi({ id: 'b' })
    expect(pairChemistryBonus(a, b, {})).toBe(8)
  })

  it('will_of_fire archetype adds chemBonus', () => {
    const a = makeShinobi({ id: 'a', narrativeArchetype: 'will_of_fire' })
    const b = makeShinobi({ id: 'b' })
    expect(pairChemistryBonus(a, b, {})).toBe(ARCHETYPE_BY_ID.will_of_fire.chemBonus)
  })
})

describe('personalityBlurb', () => {
  it('returns a non-empty string', () => {
    const s = makeShinobi({ narrativeArchetype: 'prodigy' })
    expect(typeof personalityBlurb(s)).toBe('string')
    expect(personalityBlurb(s).length).toBeGreaterThan(0)
  })

  it('returns high-confidence blurb at 80+', () => {
    const s = makeShinobi({ confidence: 90 })
    expect(personalityBlurb(s)).toMatch(/riding high/)
  })

  it('returns shattered blurb at ≤20', () => {
    const s = makeShinobi({ confidence: 10 })
    expect(personalityBlurb(s)).toMatch(/shattered/)
  })
})

describe('NARUTO_ARCHETYPES', () => {
  it('has 9 archetypes', () => {
    expect(NARUTO_ARCHETYPES).toHaveLength(9)
  })

  it('each archetype has id, label, desc', () => {
    NARUTO_ARCHETYPES.forEach(a => {
      expect(typeof a.id).toBe('string')
      expect(typeof a.label).toBe('string')
      expect(typeof a.desc).toBe('string')
    })
  })
})
