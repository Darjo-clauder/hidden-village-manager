import { describe, it, expect } from 'vitest'
import { calcChemistry } from '../client/js/synergy.js'

function makeSq(overrides = {}) {
  return { id: 'sq1', members: ['a', 'b'], cohesion: 0, ...overrides }
}
function makeShinobi(id, persName, bonds = []) {
  return { id, pers: { n: persName }, bonds }
}

describe('calcChemistry', () => {
  it('returns score 50 baseline for neutral personality pair', () => {
    const sq = makeSq()
    const shinobi = [makeShinobi('a', 'Methodical'), makeShinobi('b', 'Reserved')]
    const { score, tier } = calcChemistry(sq, shinobi)
    expect(score).toBe(50)
    expect(tier).toBe('Stable')
  })

  it('Loyal + Charismatic gets a positive chemistry bonus', () => {
    const sq = makeSq()
    const shinobi = [makeShinobi('a', 'Loyal'), makeShinobi('b', 'Charismatic')]
    const { score } = calcChemistry(sq, shinobi)
    expect(score).toBeGreaterThan(50)
  })

  it('Lone Wolf reduces chemistry', () => {
    const sq = makeSq()
    const shinobi = [makeShinobi('a', 'Lone Wolf'), makeShinobi('b', 'Loyal')]
    const { score } = calcChemistry(sq, shinobi)
    expect(score).toBeLessThan(50)
  })

  it('Mentor/Student bond adds points', () => {
    const sq = makeSq()
    const shinobi = [
      makeShinobi('a', 'Determined', [{ otherId: 'b', type: 'Mentor/Student' }]),
      makeShinobi('b', 'Determined'),
    ]
    const { score } = calcChemistry(sq, shinobi)
    expect(score).toBeGreaterThan(50)
  })

  it('cohesion 100 adds 20 points to score', () => {
    const sq = makeSq({ cohesion: 100 })
    const shinobi = [makeShinobi('a', 'Reserved'), makeShinobi('b', 'Reserved')]
    const { score } = calcChemistry(sq, shinobi)
    expect(score).toBe(70)
  })

  it('score is clamped to 0-100', () => {
    // Multiple positives on top of 50 baseline — should not exceed 100
    const sq = makeSq({ cohesion: 100 })
    const shinobi = [
      makeShinobi('a', 'Loyal', [{ otherId: 'b', type: 'Brothers-in-Arms' }, { otherId: 'b', type: 'Mentor/Student' }]),
      makeShinobi('b', 'Charismatic'),
    ]
    const { score } = calcChemistry(sq, shinobi)
    expect(score).toBeLessThanOrEqual(100)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('returns Exceptional tier at score >= 80', () => {
    const sq = makeSq({ cohesion: 100 })
    const shinobi = [
      makeShinobi('a', 'Loyal', [{ otherId: 'b', type: 'Brothers-in-Arms' }]),
      makeShinobi('b', 'Loyal'),
    ]
    const { tier } = calcChemistry(sq, shinobi)
    // 50 + 8 (two Loyals) + 8 (Loyal+Charismatic? no) + 4 (bond) + 20 (cohesion) = 82
    expect(tier).toBe('Exceptional')
  })

  it('empty squad returns score 0', () => {
    const sq = makeSq({ members: [] })
    const { score } = calcChemistry(sq, [])
    expect(score).toBe(0)
  })
})
