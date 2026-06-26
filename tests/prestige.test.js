import { describe, it, expect } from 'vitest'
import { PRESTIGE_TIERS, prestigeFromLegend } from '../shared/constants/prestige.js'

describe('prestigeFromLegend — single source of truth for prestige', () => {
  it('maps legend totals to the right tier at every threshold', () => {
    expect(prestigeFromLegend(0)).toBe('D')
    expect(prestigeFromLegend(49)).toBe('D')
    expect(prestigeFromLegend(50)).toBe('C')
    expect(prestigeFromLegend(149)).toBe('C')
    expect(prestigeFromLegend(150)).toBe('B')
    expect(prestigeFromLegend(299)).toBe('B')
    expect(prestigeFromLegend(300)).toBe('A')
    expect(prestigeFromLegend(499)).toBe('A')
    expect(prestigeFromLegend(500)).toBe('S')
    expect(prestigeFromLegend(99999)).toBe('S')
  })

  it('defaults safely', () => {
    expect(prestigeFromLegend()).toBe('D')
    expect(prestigeFromLegend(undefined)).toBe('D')
    expect(prestigeFromLegend(-10)).toBe('D')
  })

  it('thresholds ascend monotonically', () => {
    for (let i = 1; i < PRESTIGE_TIERS.length; i++) {
      expect(PRESTIGE_TIERS[i].min).toBeGreaterThan(PRESTIGE_TIERS[i - 1].min)
    }
  })
})
