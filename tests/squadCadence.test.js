import { describe, it, expect } from 'vitest'
import { tickCadence, idleCohesionDecay, grindMod, grindCohesionPenalty } from '../shared/utils/squadCadence.js'

describe('tickCadence', () => {
  it('deployed squad accumulates consecutive months and clears idle', () => {
    expect(tickCadence({ deployedThisMonth: true, consecutiveDeployMonths: 2, idleMonths: 5 }))
      .toEqual({ consecutiveDeployMonths: 3, idleMonths: 0 })
  })
  it('idle squad accumulates idle months and clears consecutive', () => {
    expect(tickCadence({ deployedThisMonth: false, consecutiveDeployMonths: 4, idleMonths: 1 }))
      .toEqual({ consecutiveDeployMonths: 0, idleMonths: 2 })
  })
  it('handles missing fields', () => {
    expect(tickCadence({})).toEqual({ consecutiveDeployMonths: 0, idleMonths: 1 })
  })
})

describe('idleCohesionDecay', () => {
  it('grants a 1-month grace period', () => {
    expect(idleCohesionDecay(0)).toBe(0)
    expect(idleCohesionDecay(1)).toBe(0)
  })
  it('ramps after the grace period', () => {
    expect(idleCohesionDecay(2)).toBe(2)
    expect(idleCohesionDecay(3)).toBe(4)
  })
  it('caps at 15', () => {
    expect(idleCohesionDecay(50)).toBe(15)
  })
})

describe('grindMod', () => {
  it('no penalty for the first two consecutive months', () => {
    expect(grindMod(0)).toBe(0)
    expect(grindMod(2)).toBe(0)
  })
  it('ramps negative after the grace period', () => {
    expect(grindMod(3)).toBeCloseTo(-0.03)
    expect(grindMod(4)).toBeCloseTo(-0.06)
  })
  it('caps at -0.15', () => {
    expect(grindMod(50)).toBe(-0.15)
  })
})

describe('grindCohesionPenalty', () => {
  it('no penalty for the first two consecutive months', () => {
    expect(grindCohesionPenalty(2)).toBe(0)
  })
  it('ramps and caps at 10', () => {
    expect(grindCohesionPenalty(3)).toBe(2)
    expect(grindCohesionPenalty(50)).toBe(10)
  })
})
