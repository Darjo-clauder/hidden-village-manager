import { describe, it, expect } from 'vitest'
import { withSeed } from './helpers/rng.js'
import {
  effectiveBloodlineBonus, canActivate, activeBloodlineBonus, netBloodlineMod,
  MAX_BLOODLINE_BONUS, ACTIVATION_COST, ACTIVATION_MIN_STAGE, BLOODLINE_MULTIPLIER, DEBUFF_PCT,
} from '../shared/utils/bloodline.js'

// Deterministic tests for the proposed active-bloodline reference model (docs v2 §3).
// Matches the sweep numbers in scripts/bloodlineSweep.mjs.

describe('effectiveBloodlineBonus — softcap + clamp (I-BL-1)', () => {
  it('zero/negative raw -> 0', () => {
    expect(effectiveBloodlineBonus(0)).toBe(0)
    expect(effectiveBloodlineBonus(-1)).toBe(0)
  })
  it('single activation 0.25 -> ~0.167 (diminishing returns)', () => {
    expect(effectiveBloodlineBonus(0.25)).toBeCloseTo(0.25 / (1 + 0.25 / 0.5), 5)
  })
  it('two jinchuriki @0.5 (raw 1.0) -> 0.333, under the 0.35 clamp', () => {
    expect(effectiveBloodlineBonus(1.0)).toBeCloseTo(0.3333, 3)
    expect(effectiveBloodlineBonus(1.0)).toBeLessThan(MAX_BLOODLINE_BONUS)
  })
  it('runaway raw is hard-clamped at MAX_BLOODLINE_BONUS', () => {
    expect(effectiveBloodlineBonus(2.0)).toBe(MAX_BLOODLINE_BONUS) // soft 0.4 -> clamp 0.35
    expect(effectiveBloodlineBonus(50)).toBe(MAX_BLOODLINE_BONUS)
  })
  it('never exceeds the clamp across a wide sweep', () => {
    for (let r = 0; r <= 5; r += 0.05) expect(effectiveBloodlineBonus(r)).toBeLessThanOrEqual(MAX_BLOODLINE_BONUS)
  })
})

describe('activeBloodlineBonus — squad resolution term', () => {
  it('no active beasts -> 0 (this is the flag-off value in adv.js)', () => {
    expect(activeBloodlineBonus([])).toBe(0)
  })
  it('one active beast -> softcapped single-beast bonus', () => {
    expect(activeBloodlineBonus([{ multiplier: BLOODLINE_MULTIPLIER }]))
      .toBeCloseTo(effectiveBloodlineBonus(BLOODLINE_MULTIPLIER), 6)
  })
  it('two active beasts stay under the global clamp (I-BL-1)', () => {
    const v = activeBloodlineBonus([{ multiplier: 0.5 }, { multiplier: 0.5 }])
    expect(v).toBeCloseTo(0.3333, 3)
    expect(v).toBeLessThan(MAX_BLOODLINE_BONUS)
  })
})

describe('netBloodlineMod — active bonus minus post-use debuff', () => {
  it('no active, no debuff -> 0', () => {
    expect(netBloodlineMod([], false)).toBe(0)
  })
  it('debuff only -> negative penalty', () => {
    expect(netBloodlineMod([], true)).toBeCloseTo(-DEBUFF_PCT, 6)
  })
  it('active minus debuff nets correctly', () => {
    const active = [{ multiplier: BLOODLINE_MULTIPLIER }]
    expect(netBloodlineMod(active, true)).toBeCloseTo(activeBloodlineBonus(active) - DEBUFF_PCT, 6)
  })
  it('debuffed squad can go net-negative (real tradeoff)', () => {
    expect(netBloodlineMod([], true)).toBeLessThan(0)
  })
})

describe('canActivate — guardrails (I-BL-2/3, rate limit)', () => {
  const ok = { stage: 4, ryo: 10000, cooldownUntil: null, month: 5, squadActivations: 0 }
  it('passes when all conditions met', () => {
    expect(canActivate(ok)).toEqual({ ok: true, reason: null })
  })
  it('fails below sync stage', () => {
    expect(canActivate({ ...ok, stage: ACTIVATION_MIN_STAGE - 1 }).reason).toBe('not_synced')
  })
  it('fails during cooldown', () => {
    expect(canActivate({ ...ok, cooldownUntil: 8, month: 5 }).reason).toBe('cooldown')
  })
  it('fails when ryo below cost (resource sink enforced)', () => {
    expect(canActivate({ ...ok, ryo: ACTIVATION_COST - 1 }).reason).toBe('insufficient_ryo')
  })
  it('fails on second activation in a squad (1/squad/mission)', () => {
    expect(canActivate({ ...ok, squadActivations: 1 }).reason).toBe('rate_limit')
  })
})

describe('deterministic resolution snapshot', () => {
  // base 0.55, single 0.25 bloodline -> adjusted = 0.55*(1+eff); fixed seed -> fixed outcome
  it('same seed reproduces the same win/lose decision', () => {
    const eff = effectiveBloodlineBonus(0.25)
    const adjusted = 0.55 * (1 + eff)
    const decide = () => withSeed(42, () => Math.random() < adjusted)
    expect(decide()).toBe(decide())
  })
})
