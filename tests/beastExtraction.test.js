import { describe, it, expect } from 'vitest'
import { EXTRACTION_STAGES, stageSuccessChance, warRiskOnFail, extractionCost, EXTRACTION_REL_HIT } from '../shared/utils/beastExtraction.js'

describe('beastExtraction — stages', () => {
  it('has three stages, hardest last', () => {
    expect(EXTRACTION_STAGES).toHaveLength(3)
    // equal strength: later stages have lower base odds
    expect(stageSuccessChance(0, 100, 100)).toBeGreaterThan(stageSuccessChance(2, 100, 100))
  })
})

describe('beastExtraction — stageSuccessChance', () => {
  it('rises with player strength advantage', () => {
    const weak = stageSuccessChance(1, 40, 160)
    const strong = stageSuccessChance(1, 160, 40)
    expect(strong).toBeGreaterThan(weak)
  })
  it('is clamped to [0.1, 0.92]', () => {
    expect(stageSuccessChance(0, 10000, 1)).toBeLessThanOrEqual(0.92)
    expect(stageSuccessChance(2, 1, 10000)).toBeGreaterThanOrEqual(0.1)
  })
  it('even strength sits near the stage base', () => {
    expect(stageSuccessChance(0, 100, 100)).toBeCloseTo(0.62)
  })
})

describe('beastExtraction — risk & cost', () => {
  it('war risk grows the deeper the failure', () => {
    expect(warRiskOnFail(0)).toBeLessThan(warRiskOnFail(1))
    expect(warRiskOnFail(1)).toBeLessThan(warRiskOnFail(2))
  })
  it('cost scales with holder strength', () => {
    expect(extractionCost(50)).toBe(7000)   // 4000 + 50*60
    expect(extractionCost(100)).toBeGreaterThan(extractionCost(50))
    expect(extractionCost(undefined)).toBe(7000)  // defaults to 50
  })
  it('relationship hit is defined', () => {
    expect(EXTRACTION_REL_HIT).toBeGreaterThan(0)
  })
})
