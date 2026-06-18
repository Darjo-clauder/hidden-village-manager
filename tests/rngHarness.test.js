import { describe, it, expect, afterEach } from 'vitest'
import { mulberry32, stubRandom, withSeed, stubSequence } from './helpers/rng.js'
import { resolveRaid } from '../server/combat.js'

// Validates the deterministic RNG harness itself, then demonstrates it driving a
// real engine function (resolveRaid) to a fully reproducible outcome. This is the
// foundation for every stochastic deterministic test (mission resolution, etc.).

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42), b = mulberry32(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })
  it('produces values in [0,1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) }
  })
  it('different seeds diverge', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
})

describe('Math.random stubbing', () => {
  afterEach(() => { /* withSeed/stubX restore themselves; guard against leaks */ })

  it('withSeed restores Math.random afterwards', () => {
    const orig = Math.random
    withSeed(123, () => { expect(Math.random).not.toBe(orig) })
    expect(Math.random).toBe(orig)
  })

  it('stubSequence yields exact controlled values', () => {
    const restore = stubSequence([0.1, 0.9])
    try {
      expect(Math.random()).toBe(0.1)
      expect(Math.random()).toBe(0.9)
      expect(Math.random()).toBe(0.1) // wraps
    } finally { restore() }
  })
})

describe('deterministic resolveRaid (real engine code, server/combat.js)', () => {
  // atkRoll = attacker.power + floor(r1*25); defRoll = defender.power + floor(r2*25)
  it('reproduces an exact attacker win', () => {
    const restore = stubSequence([0.99, 0.0]) // r1->24, r2->0
    try {
      const atk = { power: 50, ryo: 0 }
      const def = { power: 60, ryo: 10000 }
      const res = resolveRaid(atk, def)
      expect(res.atkRoll).toBe(50 + 24) // 74
      expect(res.defRoll).toBe(60 + 0)  // 60
      expect(res.attackerWins).toBe(true)
      expect(res.ryoStolen).toBe(Math.max(500, Math.floor(10000 * 0.12))) // 1200
    } finally { restore() }
  })

  it('reproduces an exact attacker loss (no ryo stolen)', () => {
    const restore = stubSequence([0.0, 0.99]) // r1->0, r2->24
    try {
      const res = resolveRaid({ power: 50, ryo: 0 }, { power: 50, ryo: 10000 })
      expect(res.atkRoll).toBe(50)
      expect(res.defRoll).toBe(74)
      expect(res.attackerWins).toBe(false)
      expect(res.ryoStolen).toBe(0)
    } finally { restore() }
  })

  it('same seed → identical raid result (full reproducibility)', () => {
    const run = () => withSeed(2026, () => resolveRaid({ power: 55, ryo: 0 }, { power: 55, ryo: 8000 }))
    expect(run()).toEqual(run())
  })
})
