import { describe, it, expect } from 'vitest'
import { COACHING_PHILOSOPHIES, PHILOSOPHY_BY_ID, getPhilosophyMods } from '../shared/constants/coachingPhilosophy.js'

describe('COACHING_PHILOSOPHIES', () => {
  it('all philosophies have required fields', () => {
    for (const p of COACHING_PHILOSOPHIES) {
      expect(typeof p.id).toBe('string')
      expect(typeof p.n).toBe('string')
      expect(typeof p.mods).toBe('object')
      expect(typeof p.mods.missionSuccess).toBe('number')
      expect(typeof p.mods.kiaRisk).toBe('number')
    }
  })

  it('PHILOSOPHY_BY_ID indexes all entries', () => {
    for (const p of COACHING_PHILOSOPHIES) {
      expect(PHILOSOPHY_BY_ID[p.id]).toBe(p)
    }
  })

  it('balanced has zero modifiers', () => {
    const m = PHILOSOPHY_BY_ID.balanced.mods
    expect(m.missionSuccess).toBe(0)
    expect(m.kiaRisk).toBe(0)
    expect(m.morale).toBe(0)
    expect(m.prospectGrowth).toBe(0)
  })

  it('aggressive has positive mission success and positive kia risk', () => {
    const m = PHILOSOPHY_BY_ID.aggressive.mods
    expect(m.missionSuccess).toBeGreaterThan(0)
    expect(m.kiaRisk).toBeGreaterThan(0)
  })

  it('defensive has negative kia risk', () => {
    const m = PHILOSOPHY_BY_ID.defensive.mods
    expect(m.kiaRisk).toBeLessThan(0)
  })

  it('youth_focus has positive prospect growth and reduced academy cost', () => {
    const m = PHILOSOPHY_BY_ID.youth_focus.mods
    expect(m.prospectGrowth).toBeGreaterThan(0)
    expect(m.academyCostMult).toBeLessThan(1)
  })
})

describe('getPhilosophyMods', () => {
  it('returns balanced mods for unknown id', () => {
    const m = getPhilosophyMods({ coachingPhilosophy: 'nonexistent' })
    expect(m).toEqual(PHILOSOPHY_BY_ID.balanced.mods)
  })

  it('returns balanced mods when no coachingPhilosophy set', () => {
    const m = getPhilosophyMods({})
    expect(m).toEqual(PHILOSOPHY_BY_ID.balanced.mods)
  })

  it('returns aggressive mods for aggressive id', () => {
    const m = getPhilosophyMods({ coachingPhilosophy: 'aggressive' })
    expect(m).toEqual(PHILOSOPHY_BY_ID.aggressive.mods)
  })
})
