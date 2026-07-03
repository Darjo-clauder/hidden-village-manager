import { describe, it, expect } from 'vitest'
import {
  JOURNALISTS,
  JOURNALIST_BY_ID,
  getJournalistRel,
  adjustJournalistRel,
  pickJournalist,
  toneRelDelta,
  journalistTier,
} from '../shared/constants/journalists.js'
import { mulberry32 } from './helpers/rng.js'

describe('JOURNALISTS roster', () => {
  it('has exactly 3 entries with unique ids and required fields', () => {
    expect(JOURNALISTS).toHaveLength(3)
    const ids = JOURNALISTS.map(j => j.id)
    expect(new Set(ids).size).toBe(3)
    for (const j of JOURNALISTS) {
      expect(typeof j.name).toBe('string')
      expect(typeof j.persona).toBe('string')
      expect(typeof j.outlet).toBe('string')
    }
  })

  it('covers sympathetic, cynical, and sensationalist personas', () => {
    const personas = JOURNALISTS.map(j => j.persona).sort()
    expect(personas).toEqual(['cynical', 'sensationalist', 'sympathetic'])
  })

  it('JOURNALIST_BY_ID maps every journalist by id', () => {
    for (const j of JOURNALISTS) {
      expect(JOURNALIST_BY_ID[j.id]).toBe(j)
    }
    expect(Object.keys(JOURNALIST_BY_ID)).toHaveLength(3)
  })
})

describe('journalist relationship helpers', () => {
  it('getJournalistRel defaults to 50 when missing or null-ish', () => {
    expect(getJournalistRel({}, 'loyal')).toBe(50)
    expect(getJournalistRel({ loyal: null }, 'loyal')).toBe(50)
    expect(getJournalistRel(null, 'loyal')).toBe(50)
    expect(getJournalistRel(undefined, 'loyal')).toBe(50)
    expect(getJournalistRel({ loyal: 30 }, 'loyal')).toBe(30)
  })

  it('adjustJournalistRel clamps at 0 and 100, and mutates the rels object', () => {
    const rels = { loyal: 5 }
    expect(adjustJournalistRel(rels, 'loyal', -20)).toBe(0)
    expect(rels.loyal).toBe(0)

    const rels2 = { cynic: 95 }
    expect(adjustJournalistRel(rels2, 'cynic', 20)).toBe(100)
    expect(rels2.cynic).toBe(100)

    const rels3 = {}
    expect(adjustJournalistRel(rels3, 'sensat', 10)).toBe(60)
    expect(rels3.sensat).toBe(60)
  })
})

describe('pickJournalist', () => {
  it('always returns a member of JOURNALISTS across many seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = mulberry32(seed)
      const j = pickJournalist(rng)
      expect(JOURNALISTS).toContain(j)
    }
  })

  it('can return each of the 3 journalists given enough seeds', () => {
    const seen = new Set()
    for (let seed = 0; seed < 200; seed++) {
      const rng = mulberry32(seed)
      seen.add(pickJournalist(rng).id)
    }
    expect(seen.size).toBe(3)
  })
})

describe('toneRelDelta', () => {
  const personas = ['sympathetic', 'cynical', 'sensationalist']

  it('humble is positive for all personas', () => {
    for (const persona of personas) {
      expect(toneRelDelta(persona, 'humble')).toBeGreaterThan(0)
    }
  })

  it('humble beats confident/callout for personas without a sensationalist bonus', () => {
    for (const persona of ['sympathetic', 'cynical']) {
      const humble = toneRelDelta(persona, 'humble')
      const confident = toneRelDelta(persona, 'confident')
      const callout = toneRelDelta(persona, 'callout')
      expect(humble).toBeGreaterThanOrEqual(confident)
      expect(humble).toBeGreaterThanOrEqual(callout)
    }
  })

  it('dismissive is negative for all personas, and the cynic takes it hardest', () => {
    const sympathetic = toneRelDelta('sympathetic', 'dismissive')
    const cynical = toneRelDelta('cynical', 'dismissive')
    const sensationalist = toneRelDelta('sensationalist', 'dismissive')

    expect(sympathetic).toBeLessThan(0)
    expect(cynical).toBeLessThan(0)
    expect(sensationalist).toBeLessThan(0)

    expect(cynical).toBeLessThan(sympathetic)
    expect(cynical).toBeLessThan(sensationalist)
  })

  it('sensationalist rewards confident and callout tones', () => {
    expect(toneRelDelta('sensationalist', 'confident')).toBeGreaterThan(0)
    expect(toneRelDelta('sensationalist', 'callout')).toBeGreaterThan(0)
    // bigger than the plain base for other personas
    expect(toneRelDelta('sensationalist', 'confident')).toBeGreaterThan(toneRelDelta('sympathetic', 'confident'))
    expect(toneRelDelta('sensationalist', 'callout')).toBeGreaterThan(toneRelDelta('sympathetic', 'callout'))
  })

  it('unknown tone yields a 0 base for any persona', () => {
    expect(toneRelDelta('sympathetic', 'mystery')).toBe(0)
    expect(toneRelDelta('cynical', 'mystery')).toBe(0)
    expect(toneRelDelta('sensationalist', 'mystery')).toBe(0)
  })

  it('matches known exact values', () => {
    expect(toneRelDelta('cynical', 'dismissive')).toBe(-9)
    expect(toneRelDelta('cynical', 'humble')).toBe(6)
    expect(toneRelDelta('sensationalist', 'confident')).toBe(5)
    expect(toneRelDelta('sensationalist', 'callout')).toBe(2)
    expect(toneRelDelta('sympathetic', 'dismissive')).toBe(-3)
  })
})

describe('journalistTier', () => {
  it('is friendly at and above 70', () => {
    expect(journalistTier(70).id).toBe('friendly')
    expect(journalistTier(100).id).toBe('friendly')
  })

  it('is neutral between 40 and 69', () => {
    expect(journalistTier(69).id).toBe('neutral')
    expect(journalistTier(40).id).toBe('neutral')
  })

  it('is hostile below 40', () => {
    expect(journalistTier(39).id).toBe('hostile')
    expect(journalistTier(0).id).toBe('hostile')
  })

  it('returns a full descriptor with id, label, and color', () => {
    const tier = journalistTier(80)
    expect(tier).toEqual({ id: 'friendly', label: 'Friendly', color: expect.any(String) })
  })
})
