import { describe, it, expect } from 'vitest'
import { medQuality, recoveryStep, reinjuryChance, returningForm, effectivePlan, REHAB_PLANS, PLAN_BY_ID } from '../shared/utils/medical.js'

describe('medical — medQuality', () => {
  it('rises with staff + infirmary, caps at 1', () => {
    expect(medQuality(0, 0)).toBe(0)
    expect(medQuality(2, 1)).toBeCloseTo(0.58)
    expect(medQuality(5, 5)).toBe(1)
  })
})

describe('medical — recovery speed', () => {
  it('rush heals twice as fast', () => {
    expect(recoveryStep('rush')).toBe(2)
    expect(recoveryStep('standard')).toBe(1)
    expect(recoveryStep('careful')).toBe(1)
  })
})

describe('medical — reinjury risk', () => {
  it('only rushing carries risk, softened by medic quality', () => {
    expect(reinjuryChance('standard', 0)).toBe(0)
    expect(reinjuryChance('careful', 1)).toBe(0)
    expect(reinjuryChance('rush', 0)).toBe(0.28)
    expect(reinjuryChance('rush', 1)).toBe(0.08)     // 0.28 - 0.20
    expect(reinjuryChance('rush', 5)).toBe(0.04)     // floored
  })
})

describe('medical — returning form', () => {
  it('careful returns sharp, rush returns rusty', () => {
    expect(returningForm('careful')).toBeGreaterThan(returningForm('standard'))
    expect(returningForm('rush')).toBeLessThan(returningForm('standard'))
  })
})

describe('medical — effectivePlan', () => {
  it('careful falls back to standard without a medic', () => {
    expect(effectivePlan('careful', false)).toBe('standard')
    expect(effectivePlan('careful', true)).toBe('careful')
    expect(effectivePlan('rush', false)).toBe('rush')
    expect(effectivePlan(undefined, true)).toBe('standard')
  })
  it('exposes three plans', () => {
    expect(REHAB_PLANS.map(p => p.id)).toEqual(['rush', 'standard', 'careful'])
    expect(PLAN_BY_ID.rush.label).toBe('Rush Back')
  })
})
