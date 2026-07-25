import { describe, it, expect } from 'vitest'
import {
  BUDGET_KEYS, DEFAULT_ALLOCATION, RAMP_STEP,
  normalizeAllocation, rampToward, monthsToConverge, allocationEffects, trackBand,
} from '../shared/utils/budgetRamp.js'

const sum = a => BUDGET_KEYS.reduce((t, k) => t + a[k], 0)

describe('normalizeAllocation', () => {
  it('always returns a zero-sum 100 split', () => {
    expect(sum(normalizeAllocation({ training: 100, warPrep: 100, infra: 100 }))).toBe(100)
    expect(sum(normalizeAllocation({ training: 10, warPrep: 3, infra: 7 }))).toBe(100)
    expect(sum(normalizeAllocation(DEFAULT_ALLOCATION))).toBe(100)
  })
  it('closes the all-maxed exploit — funding everything funds nothing extra', () => {
    const maxed = normalizeAllocation({ training: 100, warPrep: 100, infra: 100 })
    BUDGET_KEYS.forEach(k => expect(maxed[k]).toBeLessThan(40))
  })
  it('preserves relative weight', () => {
    const a = normalizeAllocation({ training: 60, warPrep: 20, infra: 20 })
    expect(a.training).toBeGreaterThan(a.warPrep)
    expect(a.warPrep).toBe(a.infra)
  })
  it('falls back to the default on empty or zero input', () => {
    expect(normalizeAllocation({})).toEqual(DEFAULT_ALLOCATION)
    expect(normalizeAllocation({ training: 0, warPrep: 0, infra: 0 })).toEqual(DEFAULT_ALLOCATION)
  })
})

describe('rampToward', () => {
  it('moves gradually rather than snapping', () => {
    const eff = { training: 33, warPrep: 33, infra: 34 }
    const tgt = { training: 100, warPrep: 0, infra: 0 }
    const next = rampToward(eff, tgt)
    expect(next.training).toBeGreaterThan(eff.training)
    expect(next.training).toBeLessThan(90)
  })
  it('converges exactly onto the target and then holds', () => {
    let eff = { training: 33, warPrep: 33, infra: 34 }
    const tgt = { training: 60, warPrep: 20, infra: 20 }
    for (let i = 0; i < 40; i++) eff = rampToward(eff, tgt)
    expect(eff).toEqual(normalizeAllocation(tgt))
    expect(rampToward(eff, tgt)).toEqual(eff)
  })
  it('keeps the effective split legal at every step', () => {
    let eff = { training: 33, warPrep: 33, infra: 34 }
    const tgt = { training: 90, warPrep: 5, infra: 5 }
    for (let i = 0; i < 12; i++) { eff = rampToward(eff, tgt); expect(sum(eff)).toBe(100) }
  })
})

describe('monthsToConverge', () => {
  it('is zero when already on target', () => {
    const a = { training: 40, warPrep: 30, infra: 30 }
    expect(monthsToConverge(a, a)).toBe(0)
  })
  it('reports a multi-month wait for a big swing', () => {
    expect(monthsToConverge({ training: 33, warPrep: 33, infra: 34 }, { training: 100, warPrep: 0, infra: 0 }))
      .toBeGreaterThan(1)
  })
  it('matches how many ramp steps it actually takes', () => {
    const eff = { training: 33, warPrep: 33, infra: 34 }
    const tgt = { training: 70, warPrep: 15, infra: 15 }
    const predicted = monthsToConverge(eff, tgt)
    let cur = eff
    for (let i = 0; i < predicted; i++) cur = rampToward(cur, tgt)
    expect(cur).toEqual(normalizeAllocation(tgt))
  })
})

describe('allocationEffects', () => {
  it('a neutral split is roughly no-op on dev and war', () => {
    const e = allocationEffects(DEFAULT_ALLOCATION)
    expect(e.devMult).toBeCloseTo(1, 1)
    expect(e.warMult).toBeCloseTo(1, 1)
  })
  it('prioritising a track raises its multiplier and starving it lowers it', () => {
    expect(allocationEffects({ training: 80, warPrep: 10, infra: 10 }).devMult)
      .toBeGreaterThan(allocationEffects(DEFAULT_ALLOCATION).devMult)
    expect(allocationEffects({ training: 5, warPrep: 50, infra: 45 }).devMult)
      .toBeLessThan(allocationEffects(DEFAULT_ALLOCATION).devMult)
  })
  it('infra always reduces maintenance', () => {
    expect(allocationEffects({ training: 10, warPrep: 10, infra: 80 }).maintMult)
      .toBeLessThan(allocationEffects({ training: 45, warPrep: 45, infra: 10 }).maintMult)
  })
  it('normalises before computing, so an illegal split cannot buy extra', () => {
    expect(allocationEffects({ training: 100, warPrep: 100, infra: 100 }))
      .toEqual(allocationEffects(normalizeAllocation({ training: 100, warPrep: 100, infra: 100 })))
  })
})

describe('trackBand', () => {
  it('bands a track by distance from neutral', () => {
    expect(trackBand(70).label).toBe('Prioritised')
    expect(trackBand(33).label).toBe('Balanced')
    expect(trackBand(10).label).toBe('Starved')
  })
  it('handles missing input', () => {
    expect(trackBand(undefined).label).toBe('Balanced')
  })
})
