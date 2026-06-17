import { describe, it, expect } from 'vitest'

// Pure rival-offer logic replicated for testing (no G/browser deps)

const RIVAL_VILLAGES = ['Kumogakure', 'Sunagakure', 'Kirigakure', 'Iwagakure', 'Otogakure']

function generateOffer(p, G) {
  if (p.rivalOffer) return false
  if ((p.potential ?? 0) < 70) return false
  if ((p.monthsWaiting ?? 0) < 2) return false
  const village = RIVAL_VILLAGES[0]
  const potTier = p.potential >= 90 ? 4 : p.potential >= 80 ? 3 : p.potential >= 70 ? 2 : 1
  const baseOffer = 4000 + potTier * 2500
  p.rivalOffer = {
    village,
    offerRyo: baseOffer,
    expiresMonth: G.month + 2,
    expiresYear: G.month >= 11 ? G.year + 1 : G.year,
  }
  p.rivalInterest = true
  return true
}

function matchOffer(p, G) {
  if (!p.rivalOffer) return 'no_offer'
  if (G.ryo < p.rivalOffer.offerRyo) return 'insufficient'
  G.ryo -= p.rivalOffer.offerRyo
  p.rivalOffer = null
  p.rivalInterest = false
  return 'matched'
}

function exceedOffer(p, G) {
  if (!p.rivalOffer) return 'no_offer'
  const cost = Math.round(p.rivalOffer.offerRyo * 1.2)
  if (G.ryo < cost) return 'insufficient'
  G.ryo -= cost
  p.rivalOffer = null
  p.rivalInterest = false
  if (p.pMatrix) p.pMatrix.loyalty = Math.max((p.pMatrix.loyalty || 0) + 3, 15)
  p.loyaltyBonus = true
  return 'exceeded'
}

function tickOffers(prospects, G) {
  return prospects.filter(p => {
    if (!p.rivalOffer) return true
    const { expiresYear, expiresMonth } = p.rivalOffer
    const expired = G.year > expiresYear || (G.year === expiresYear && G.month > expiresMonth)
    return !expired  // remove expired
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('Rival offer generation', () => {
  it('does not generate offer for low-potential prospect (<70)', () => {
    const p = { potential: 65, monthsWaiting: 3, rivalOffer: null }
    expect(generateOffer(p, { month: 3, year: 1 })).toBe(false)
    expect(p.rivalOffer).toBeNull()
  })

  it('does not generate offer before 2 months waiting', () => {
    const p = { potential: 80, monthsWaiting: 1, rivalOffer: null }
    expect(generateOffer(p, { month: 3, year: 1 })).toBe(false)
  })

  it('generates offer for high-potential prospect with 2+ months waiting', () => {
    const p = { potential: 80, monthsWaiting: 3, rivalOffer: null }
    generateOffer(p, { month: 3, year: 1 })
    expect(p.rivalOffer).not.toBeNull()
    expect(p.rivalInterest).toBe(true)
  })

  it('offer amount scales with potential tier', () => {
    const low  = { potential: 72, monthsWaiting: 3, rivalOffer: null }
    const high = { potential: 92, monthsWaiting: 3, rivalOffer: null }
    generateOffer(low,  { month: 3, year: 1 })
    generateOffer(high, { month: 3, year: 1 })
    expect(high.rivalOffer.offerRyo).toBeGreaterThan(low.rivalOffer.offerRyo)
  })

  it('does not overwrite an existing offer', () => {
    const p = { potential: 85, monthsWaiting: 4, rivalOffer: { village: 'Existing', offerRyo: 9999 } }
    generateOffer(p, { month: 3, year: 1 })
    expect(p.rivalOffer.village).toBe('Existing')
  })
})

describe('Rival offer response', () => {
  it('match deducts exact offer amount', () => {
    const p = { rivalOffer: { offerRyo: 8000, expiresYear: 1, expiresMonth: 5 } }
    const G = { ryo: 10000 }
    expect(matchOffer(p, G)).toBe('matched')
    expect(G.ryo).toBe(2000)
    expect(p.rivalOffer).toBeNull()
  })

  it('match returns insufficient when ryo too low', () => {
    const p = { rivalOffer: { offerRyo: 8000 } }
    expect(matchOffer(p, { ryo: 5000 })).toBe('insufficient')
  })

  it('exceed deducts 120% of offer', () => {
    const p = { rivalOffer: { offerRyo: 8000 }, pMatrix: { loyalty: 10 } }
    const G = { ryo: 20000 }
    exceedOffer(p, G)
    expect(G.ryo).toBe(20000 - 9600)
    expect(p.loyaltyBonus).toBe(true)
  })

  it('exceed sets loyalty to at least 15', () => {
    const p = { rivalOffer: { offerRyo: 5000 }, pMatrix: { loyalty: 8 } }
    exceedOffer(p, { ryo: 20000 })
    expect(p.pMatrix.loyalty).toBe(15)
  })

  it('exceed adds 3 to loyalty if already above 12', () => {
    const p = { rivalOffer: { offerRyo: 5000 }, pMatrix: { loyalty: 14 } }
    exceedOffer(p, { ryo: 20000 })
    expect(p.pMatrix.loyalty).toBe(17)
  })
})

describe('Rival offer expiry', () => {
  it('removes prospect when offer expires', () => {
    const prospects = [
      { id: 'a', rivalOffer: { expiresYear: 1, expiresMonth: 3 } },
      { id: 'b', rivalOffer: null },
    ]
    const remaining = tickOffers(prospects, { year: 1, month: 4 })
    expect(remaining.map(p => p.id)).not.toContain('a')
    expect(remaining.map(p => p.id)).toContain('b')
  })

  it('keeps prospect when offer has not yet expired', () => {
    const prospects = [
      { id: 'a', rivalOffer: { expiresYear: 1, expiresMonth: 5 } },
    ]
    const remaining = tickOffers(prospects, { year: 1, month: 4 })
    expect(remaining).toHaveLength(1)
  })
})
