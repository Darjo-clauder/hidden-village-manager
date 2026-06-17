import { describe, it, expect } from 'vitest'
import { dynastyProgress, computeDynastyGrade, inheritedBonuses, DYNASTY_YEARS } from '../shared/utils/dynasty.js'

describe('dynastyProgress', () => {
  it('returns ~0 at year 1 (starting year)', () => {
    expect(dynastyProgress(1)).toBeCloseTo(1 / DYNASTY_YEARS)
  })

  it('returns 1 at DYNASTY_YEARS', () => {
    expect(dynastyProgress(DYNASTY_YEARS)).toBe(1)
  })

  it('caps at 1 beyond DYNASTY_YEARS', () => {
    expect(dynastyProgress(50)).toBe(1)
  })

  it('returns 0.5 at halfway', () => {
    expect(dynastyProgress(DYNASTY_YEARS / 2)).toBeCloseTo(0.5)
  })

  it('DYNASTY_YEARS is 30', () => {
    expect(DYNASTY_YEARS).toBe(30)
  })
})

describe('computeDynastyGrade', () => {
  it('returns D for empty state', () => {
    const G = {}
    const { grade, score } = computeDynastyGrade(G)
    expect(grade).toBe('D')
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('grade improves with more legend', () => {
    const G1 = { legend: 0 }
    const G2 = { legend: 600 }
    expect(computeDynastyGrade(G2).score).toBeGreaterThan(computeDynastyGrade(G1).score)
  })

  it('hall of legends contributes to score', () => {
    const G1 = { hallOfLegends: [] }
    const G2 = { hallOfLegends: Array(4).fill({ id: 'x' }) }
    expect(computeDynastyGrade(G2).breakdown.hall).toBeGreaterThan(computeDynastyGrade(G1).breakdown.hall)
  })

  it('S prestige tier adds 40 points', () => {
    const G = { prestigeTier: 'S' }
    expect(computeDynastyGrade(G).breakdown.prestige).toBe(40)
  })

  it('score breakdown sums to total score', () => {
    const G = { legend: 200, hallOfLegends: [{ id: 'x' }], prestigeTier: 'B', villages: [{ allied: true }] }
    const { score, breakdown } = computeDynastyGrade(G)
    const sum = Object.values(breakdown).reduce((a, b) => a + b, 0)
    expect(score).toBe(sum)
  })
})

describe('inheritedBonuses', () => {
  it('S grade gives highest bonuses', () => {
    const s = inheritedBonuses('S')
    const d = inheritedBonuses('D')
    const sRyo = s.find(b => b.id === 'ryo_start')?.value || 0
    const dRyo = d.find(b => b.id === 'ryo_start')?.value || 0
    expect(sRyo).toBeGreaterThan(dRyo)
  })

  it('D grade returns no ryo_start bonus', () => {
    const bonuses = inheritedBonuses('D')
    const ryoBonus = bonuses.find(b => b.id === 'ryo_start')
    expect(ryoBonus).toBeUndefined()
  })

  it('all bonus values are positive', () => {
    for (const grade of ['S', 'A', 'B', 'C']) {
      for (const b of inheritedBonuses(grade)) {
        expect(b.value).toBeGreaterThan(0)
      }
    }
  })

  it('bonuses have desc and id fields', () => {
    for (const b of inheritedBonuses('A')) {
      expect(b.id).toBeTruthy()
      expect(b.desc).toBeTruthy()
    }
  })
})
