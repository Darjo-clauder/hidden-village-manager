import { describe, it, expect } from 'vitest'
import {
  standingMultiplier, baseWage, demandedWage, wageStep, reviewWages, WAGE_REP_FLOOR,
  WAGE_REP_SOFT_CAP, STANDING_WAGE_MAX, WAGE_DRIFT_RATE,
} from '../shared/utils/wageDemands.js'
import { REP_SOFT_CAP } from '../shared/utils/economy.js'
import { SALARY_CAP } from '../shared/constants/salaryCap.js'

const shinobi = (over = {}) => ({ id: 's1', ri: 0, salary: 500, pers: { effect: {} }, ...over })

describe('standingMultiplier', () => {
  it('is ~1 for an unknown village', () => {
    expect(standingMultiplier(0)).toBeCloseTo(1, 2)
  })

  it('rises with reputation', () => {
    expect(standingMultiplier(100)).toBeGreaterThan(standingMultiplier(10))
    expect(standingMultiplier(200)).toBeGreaterThan(standingMultiplier(100))
  })

  it('reaches the intended multiple at the soft cap', () => {
    expect(standingMultiplier(WAGE_REP_SOFT_CAP)).toBeCloseTo(1 + STANDING_WAGE_MAX, 2)
  })

  it('bends past the soft cap rather than continuing to climb steeply', () => {
    const underSlope = standingMultiplier(200) - standingMultiplier(100)
    const overSlope = standingMultiplier(300) - standingMultiplier(200)
    expect(overSlope).toBeLessThan(underSlope)
  })

  it('bends where the REVENUE curve bends — that is the whole point', () => {
    expect(WAGE_REP_SOFT_CAP).toBe(REP_SOFT_CAP)
  })

  it('is safe on nonsense input', () => {
    expect(standingMultiplier(undefined)).toBeCloseTo(1, 2)
    expect(standingMultiplier(-50)).toBeCloseTo(1, 2)
  })
})

describe('baseWage', () => {
  it('follows the published rank scale', () => {
    expect(baseWage({ ri: 0 })).toBe(500)
    expect(baseWage({ ri: 1 })).toBe(900)
    expect(baseWage({ ri: 4 })).toBe(2100)
  })

  it('respects a personality wage modifier', () => {
    expect(baseWage({ ri: 0, pers: { effect: { salary: 0.2 } } })).toBe(600)
  })

  it('clamps a malformed rank instead of producing nonsense', () => {
    expect(baseWage({ ri: 99 })).toBe(2100)
    expect(baseWage({})).toBe(500)
    expect(baseWage(null)).toBe(500)
  })
})

describe('demandedWage', () => {
  it('is the base wage at zero standing', () => {
    expect(demandedWage(shinobi(), 0)).toBe(500)
  })

  it('scales a veteran harder than an initiate in absolute terms', () => {
    const initiate = demandedWage({ ri: 0 }, 200) - baseWage({ ri: 0 })
    const veteran = demandedWage({ ri: 4 }, 200) - baseWage({ ri: 4 })
    expect(veteran).toBeGreaterThan(initiate)
  })
})

describe('wageStep', () => {
  it('moves toward the demanded wage without overshooting', () => {
    const next = wageStep(500, 1600)
    expect(next).toBeGreaterThan(500)
    expect(next).toBeLessThanOrEqual(1600)
  })

  it('never cuts a wage when standing falls', () => {
    expect(wageStep(1600, 500)).toBe(1600)
    expect(wageStep(1000, 1000)).toBe(1000)
  })

  it('always makes progress, even on a tiny gap', () => {
    const next = wageStep(1000, 1010)
    expect(next).toBeGreaterThan(1000)
  })

  it('converges rather than stalling', () => {
    let w = 500
    for (let i = 0; i < 200; i++) w = wageStep(w, 1600)
    expect(w).toBe(1600)
  })
})

describe('reviewWages', () => {
  const roster = () => [
    shinobi({ id: 'a', ri: 0, salary: 500 }),
    shinobi({ id: 'b', ri: 2, salary: 1300 }),
    shinobi({ id: 'c', ri: 4, salary: 2100 }),
  ]

  it('does nothing at zero standing', () => {
    const r = reviewWages(roster(), 0)
    expect(r.changes).toEqual([])
    expect(r.delta).toBe(0)
  })

  it('raises payroll as standing rises', () => {
    const low = reviewWages(roster(), 20)
    const high = reviewWages(roster(), 200)
    expect(high.delta).toBeGreaterThan(low.delta)
  })

  it('does not mutate the roster it is given', () => {
    const r = roster()
    reviewWages(r, 200)
    expect(r.map(s => s.salary)).toEqual([500, 1300, 2100])
  })

  it('is safe on an empty or malformed roster', () => {
    expect(reviewWages([], 200).delta).toBe(0)
    expect(reviewWages(null, 200).delta).toBe(0)
  })

  it('reports every changed contract with its target', () => {
    const r = reviewWages(roster(), 200)
    for (const c of r.changes) {
      expect(c.to).toBeGreaterThan(c.from)
      expect(c.demanded).toBeGreaterThanOrEqual(c.to)
    }
  })
})

describe('calibration', () => {
  /**
   * An earlier version of this suite asserted that payroll must grow LESS than
   * revenue does — reasoning that wages overtaking income would make standing
   * not worth having. Measurement disproved it: sized that way (max 2.2) the
   * mechanism moved active-play wealth from 19.35x idle only to 16.94x, because
   * payroll starts from a far smaller base than revenue does and missions bring
   * direct payouts on top of reputation-driven revenue.
   *
   * The multiple is therefore tuned empirically (see the module header) and what
   * is asserted here is the SHAPE the measurement showed we need.
   */
  it('protects a village nobody has heard of — the regressive failure mode', () => {
    // Sized at the ceiling that fixes runaway play, an unfloored curve bankrupted
    // idle villages in 7 of 20 seeds. Below the floor there must be no pressure.
    expect(standingMultiplier(0)).toBe(1)
    expect(standingMultiplier(WAGE_REP_FLOOR)).toBe(1)
    expect(standingMultiplier(WAGE_REP_FLOOR - 1)).toBe(1)
    const roster = [shinobi({ ri: 2, salary: 1300 })]
    expect(reviewWages(roster, WAGE_REP_FLOOR).delta).toBe(0)
  })

  it('bites once the village is genuinely renowned', () => {
    expect(standingMultiplier(WAGE_REP_FLOOR + 1)).toBeGreaterThan(1)
    const roster = Array.from({ length: 22 }, (_, i) => shinobi({ id: 'x' + i, ri: i % 5, salary: 500 + (i % 5) * 400 }))
    const basePayroll = roster.reduce((a, s) => a + s.salary, 0)
    const converged = roster.reduce((a, s) => a + demandedWage(s, REP_SOFT_CAP), 0)
    // Must be a large multiple — a small one measurably does nothing.
    expect(converged / basePayroll).toBeGreaterThan(4)
  })

  it('pushes a renowned roster past the salary cap, so the luxury tax engages', () => {
    // This interaction is the point: the cap scales with PRESTIGE, wages with
    // REPUTATION, so renown outrunning prestige becomes a roster decision.
    const roster = Array.from({ length: 22 }, (_, i) => shinobi({ id: 'x' + i, ri: i % 5, salary: 500 + (i % 5) * 400 }))
    const converged = roster.reduce((a, s) => a + demandedWage(s, REP_SOFT_CAP), 0)
    expect(converged).toBeGreaterThan(SALARY_CAP.B)
  })

  it('converges within a few playable years at the drift rate', () => {
    let w = 500
    const target = demandedWage(shinobi(), 200)
    let months = 0
    while (w < target * 0.9 && months < 240) { w = wageStep(w, target, WAGE_DRIFT_RATE); months++ }
    expect(months).toBeLessThan(60)   // under five years to 90% of demand
    expect(months).toBeGreaterThan(6) // but not instant
  })
})
