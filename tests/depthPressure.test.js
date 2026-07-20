import { describe, it, expect } from 'vitest'
import { opportunityBand, opportunityGrowthMod } from '../shared/utils/depthPressure.js'

describe('opportunityBand', () => {
  it('bench player is Rusty', () => {
    expect(opportunityBand(0).label).toBe('Rusty')
    expect(opportunityBand(14).label).toBe('Rusty')
  })
  it('healthy rotation is Match Sharp', () => {
    expect(opportunityBand(15).label).toBe('Match Sharp')
    expect(opportunityBand(50).label).toBe('Match Sharp')
    expect(opportunityBand(75).label).toBe('Match Sharp')
  })
  it('grinding starter is Overworked', () => {
    expect(opportunityBand(76).label).toBe('Overworked')
    expect(opportunityBand(100).label).toBe('Overworked')
  })
  it('clamps out-of-range input', () => {
    expect(opportunityBand(-5).label).toBe('Rusty')
    expect(opportunityBand(500).label).toBe('Overworked')
  })
  it('handles missing workload (no NaN)', () => {
    expect(opportunityBand(undefined).label).toBe('Rusty')
  })
})

describe('opportunityGrowthMod', () => {
  it('penalizes both bench rot and overwork relative to the healthy band', () => {
    const rusty = opportunityGrowthMod(5)
    const sharp = opportunityGrowthMod(40)
    const overworked = opportunityGrowthMod(90)
    expect(sharp).toBe(1.0)
    expect(rusty).toBeLessThan(sharp)
    expect(overworked).toBeLessThan(sharp)
  })
})
