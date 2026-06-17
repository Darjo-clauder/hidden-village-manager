import { describe, it, expect } from 'vitest'
import {
  BLACK_MARKET_MISSIONS,
  BM_MISSION_BY_ID,
  UNDERWORLD_TIERS,
  getUnderworldTier,
  discoveryChance,
} from '../shared/constants/blackMarket.js'

describe('BLACK_MARKET_MISSIONS', () => {
  it('has 5 missions', () => {
    expect(BLACK_MARKET_MISSIONS).toHaveLength(5)
  })
  it('all missions have required fields', () => {
    for (const m of BLACK_MARKET_MISSIONS) {
      expect(m.id).toBeTruthy()
      expect(m.ryo).toBeGreaterThan(0)
      expect(m.discoveryChance).toBeGreaterThan(0)
      expect(typeof m.reqRi).toBe('number')
    }
  })
  it('BM_MISSION_BY_ID indexes all missions', () => {
    for (const m of BLACK_MARKET_MISSIONS) {
      expect(BM_MISSION_BY_ID[m.id]).toBe(m)
    }
  })
  it('bm_bounty is S-rank with highest payout', () => {
    const bounty = BM_MISSION_BY_ID['bm_bounty']
    expect(bounty.rk).toBe('S')
    expect(bounty.ryo).toBe(Math.max(...BLACK_MARKET_MISSIONS.map(m => m.ryo)))
  })
  it('bm_bounty requires ANBU', () => {
    expect(BM_MISSION_BY_ID['bm_bounty'].reqAnbu).toBe(true)
  })
})

describe('UNDERWORLD_TIERS', () => {
  it('has 5 tiers', () => {
    expect(UNDERWORLD_TIERS).toHaveLength(5)
  })
  it('first tier starts at rep 0', () => {
    expect(UNDERWORLD_TIERS[0].minRep).toBe(0)
  })
  it('Phantom tier has passiveRyo', () => {
    const phantom = UNDERWORLD_TIERS.find(t => t.id === 'phantom')
    expect(phantom.passiveRyo).toBeGreaterThan(0)
  })
})

describe('getUnderworldTier', () => {
  it('returns Unknown at rep 0', () => {
    expect(getUnderworldTier(0).id).toBe('unknown')
  })
  it('returns Contractor at rep 10', () => {
    expect(getUnderworldTier(10).id).toBe('contractor')
  })
  it('returns Operative at rep 25', () => {
    expect(getUnderworldTier(25).id).toBe('operative')
  })
  it('returns Shadow Agent at rep 50', () => {
    expect(getUnderworldTier(50).id).toBe('shadow')
  })
  it('returns Phantom at rep 100', () => {
    expect(getUnderworldTier(100).id).toBe('phantom')
  })
  it('returns Phantom above rep 100', () => {
    expect(getUnderworldTier(200).id).toBe('phantom')
  })
  it('handles undefined rep gracefully', () => {
    expect(getUnderworldTier(undefined).id).toBe('unknown')
  })
})

describe('discoveryChance', () => {
  const assassination = BM_MISSION_BY_ID['bm_assassination']

  it('returns base chance at rep 0', () => {
    expect(discoveryChance(assassination, 0)).toBeCloseTo(assassination.discoveryChance)
  })
  it('reduces discovery chance at higher rep', () => {
    const low = discoveryChance(assassination, 0)
    const high = discoveryChance(assassination, 100)
    expect(high).toBeLessThan(low)
  })
  it('never goes below 0.02', () => {
    expect(discoveryChance(assassination, 9999)).toBeGreaterThanOrEqual(0.02)
  })
  it('bm_bounty has lowest base discovery chance', () => {
    const bounty = BM_MISSION_BY_ID['bm_bounty']
    expect(bounty.discoveryChance).toBeLessThan(assassination.discoveryChance)
  })
})
