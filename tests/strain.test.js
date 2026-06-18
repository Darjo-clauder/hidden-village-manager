import { describe, it, expect } from 'vitest'
import { computeStrain, strainBand } from '../shared/utils/strain.js'

describe('computeStrain', () => {
  it('healthy shinobi is low strain', () => {
    // commit 70, morale 70, workload 0, no trauma -> 30*.4 + 30*.3 = 21
    expect(computeStrain({ commitment: 70, indMorale: 70 })).toBe(21)
  })
  it('stressed shinobi is high strain', () => {
    // commit 20, morale 40, workload 60, 3 trauma -> 32 + 18 + 12 + 2.4 = 64.4 -> 64
    expect(computeStrain({ commitment: 20, indMorale: 40, workload: 60, traumaHistory: [1, 2, 3] })).toBe(64)
  })
  it('is bounded 0..100', () => {
    expect(computeStrain({ commitment: 0, indMorale: 0, workload: 999, traumaHistory: Array(99).fill(1) })).toBeLessThanOrEqual(100)
    expect(computeStrain({ commitment: 100, indMorale: 100, workload: 0 })).toBeGreaterThanOrEqual(0)
  })
  it('uses sane defaults for missing fields (no NaN)', () => {
    expect(Number.isFinite(computeStrain({}))).toBe(true)
  })
})

describe('strainBand thresholds', () => {
  it('maps score to band', () => {
    expect(strainBand(10).label).toBe('Calm')
    expect(strainBand(30).label).toBe('Strained')
    expect(strainBand(60).label).toBe('At Risk')
    expect(strainBand(80).label).toBe('Breaking')
  })
})
