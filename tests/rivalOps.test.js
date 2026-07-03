import { describe, it, expect } from 'vitest'
import { RIVAL_OP_COST, opSuccessChance, opEffect } from '../shared/utils/rivalOps.js'
import { mulberry32 } from './helpers/rng.js'

describe('RIVAL_OP_COST', () => {
  it('is 3000', () => {
    expect(RIVAL_OP_COST).toBe(3000)
  })
})

describe('opSuccessChance', () => {
  it('equal strengths + balanced style + no bonus → 0.5', () => {
    expect(opSuccessChance(100, 100, 'balanced')).toBeCloseTo(0.5)
  })

  it('a stronger player raises the chance', () => {
    expect(opSuccessChance(120, 100, 'balanced')).toBeGreaterThan(0.5)
  })

  it('a weaker player lowers the chance', () => {
    expect(opSuccessChance(80, 100, 'balanced')).toBeLessThan(0.5)
  })

  it('clamps at 0.1 for a huge disadvantage', () => {
    expect(opSuccessChance(10, 200, 'fortress')).toBe(0.1)
  })

  it('clamps at 0.9 for a huge advantage', () => {
    expect(opSuccessChance(200, 10, 'blitz')).toBe(0.9)
  })

  it('orders style resistance: fortress < grinder < balanced < opportunist < blitz', () => {
    const fortress = opSuccessChance(100, 100, 'fortress')
    const grinder = opSuccessChance(100, 100, 'grinder')
    const balanced = opSuccessChance(100, 100, 'balanced')
    const opportunist = opSuccessChance(100, 100, 'opportunist')
    const blitz = opSuccessChance(100, 100, 'blitz')
    expect(fortress).toBeLessThan(grinder)
    expect(grinder).toBeLessThan(balanced)
    expect(balanced).toBeLessThan(opportunist)
    expect(opportunist).toBeLessThan(blitz)
  })

  it('espionageBonus raises the chance additively', () => {
    const base = opSuccessChance(100, 100, 'balanced')
    const boosted = opSuccessChance(100, 100, 'balanced', 0.15)
    expect(boosted).toBeCloseTo(base + 0.15)
  })
})

describe('opEffect', () => {
  it('success: strengthDelta in [-10,-5], relDelta -8, threatDelta 6', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 20; i++) {
      const effect = opEffect(true, rng)
      expect(effect.strengthDelta).toBeGreaterThanOrEqual(-10)
      expect(effect.strengthDelta).toBeLessThanOrEqual(-5)
      expect(effect.relDelta).toBe(-8)
      expect(effect.threatDelta).toBe(6)
    }
  })

  it('failure: strengthDelta 0, relDelta -14, threatDelta 10', () => {
    const rng = mulberry32(7)
    const effect = opEffect(false, rng)
    expect(effect.strengthDelta).toBe(0)
    expect(effect.relDelta).toBe(-14)
    expect(effect.threatDelta).toBe(10)
  })
})
