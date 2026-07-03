import { describe, it, expect } from 'vitest'
import { isHostEligible, minHostBid, hostRevenue, genRivalHostBids, hostBidResolve, PRESTIGE_HOST_WEIGHT } from '../shared/utils/hostBidding.js'

describe('hostBidding — eligibility & scaling', () => {
  it('only C+ prestige can host', () => {
    expect(isHostEligible('D')).toBe(false)
    expect(['C', 'B', 'A', 'S'].every(isHostEligible)).toBe(true)
  })
  it('min bid and revenue scale with prestige', () => {
    expect(minHostBid('C')).toBeLessThan(minHostBid('S'))
    expect(hostRevenue('C')).toBeLessThan(hostRevenue('S'))
    expect(minHostBid('D')).toBe(5000)   // fallback
  })
})

describe('hostBidding — rival bids', () => {
  it('scale with village strength (deterministic roll)', () => {
    const rivals = [{ n: 'A', str: 100 }, { n: 'B', str: 50 }]
    const bids = genRivalHostBids(rivals, () => 0.5)   // factor 1.0
    expect(bids[0].bid).toBe(12000)   // 100 * 120 * 1.0
    expect(bids[1].bid).toBe(6000)
  })
  it('handles empty rival list', () => {
    expect(genRivalHostBids([], () => 0.5)).toEqual([])
  })
})

describe('hostBidding — resolve', () => {
  it('player wins when effective bid >= top rival', () => {
    const r = hostBidResolve(10000, [{ name: 'x', bid: 9000 }], 'C')
    expect(r.won).toBe(true)
    expect(r.playerEffective).toBe(Math.round(10000 * (1 + PRESTIGE_HOST_WEIGHT.C)))
    expect(r.topRival).toBe(9000)
  })
  it('prestige home-weight can flip a close bid', () => {
    // raw 10000 < 11000, but S weight (0.22) lifts it to 12200 (win); C (0.05) -> 10500 (loss)
    expect(hostBidResolve(10000, [{ bid: 11000 }], 'S').won).toBe(true)
    expect(hostBidResolve(10000, [{ bid: 11000 }], 'C').won).toBe(false)
  })
  it('loses to a higher rival bid', () => {
    expect(hostBidResolve(5000, [{ bid: 20000 }], 'B').won).toBe(false)
  })
})
