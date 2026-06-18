import { describe, it, expect } from 'vitest'
import { successCeiling } from '../shared/utils/missionOdds.js'

// B-RISK-1: per-rank success ceiling keeps elite missions tense.
describe('successCeiling', () => {
  it('caps S-rank at 0.85', () => expect(successCeiling('S')).toBe(0.85))
  it('caps A-rank at 0.90', () => expect(successCeiling('A')).toBe(0.90))
  it('leaves routine ranks at 0.97', () => {
    for (const r of ['B', 'C', 'D', undefined]) expect(successCeiling(r)).toBe(0.97)
  })
  it('S/A ceilings are below the routine ceiling (tension preserved)', () => {
    expect(successCeiling('S')).toBeLessThan(successCeiling('B'))
    expect(successCeiling('A')).toBeLessThan(successCeiling('B'))
  })
})
