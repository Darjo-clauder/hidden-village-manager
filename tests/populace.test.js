import { describe, it, expect } from 'vitest'
import { supportDelta, supportTier, revenueMult, applySupport, FESTIVAL_THRESH, UNREST_THRESH } from '../shared/utils/populace.js'

describe('populace — supportDelta', () => {
  it('rewards wins and titles, punishes slumps and deficits', () => {
    expect(supportDelta({ wonThisMonth: true })).toBe(2)
    expect(supportDelta({ title: true })).toBe(10)
    expect(supportDelta({ derbyWin: true })).toBe(4)
    expect(supportDelta({ derbyLoss: true })).toBe(-4)
    expect(supportDelta({ lostBadly: true, treasuryDeficit: true })).toBe(-3)
    expect(supportDelta({ treasurySurplus: true })).toBe(1)
    expect(supportDelta({})).toBe(0)
  })
})

describe('populace — tiers & revenue', () => {
  it('maps support to tiers', () => {
    expect(supportTier(90).id).toBe('adoring')
    expect(supportTier(60).id).toBe('content')
    expect(supportTier(40).id).toBe('uneasy')
    expect(supportTier(10).id).toBe('discontent')
    expect(supportTier(undefined).id).toBe('content')  // default 60
  })
  it('revenue multiplier spans 0.90..1.15', () => {
    expect(revenueMult(0)).toBe(0.9)
    expect(revenueMult(100)).toBe(1.15)
    expect(revenueMult(60)).toBeCloseTo(1.05)
  })
})

describe('populace — applySupport', () => {
  it('clamps to [0,100] with a 60 default', () => {
    expect(applySupport(98, 10)).toBe(100)
    expect(applySupport(3, -10)).toBe(0)
    expect(applySupport(undefined, 5)).toBe(65)
  })
  it('event thresholds are sane', () => {
    expect(FESTIVAL_THRESH).toBeGreaterThan(UNREST_THRESH)
    expect(FESTIVAL_THRESH).toBeGreaterThanOrEqual(80)
    expect(UNREST_THRESH).toBeLessThanOrEqual(25)
  })
})
