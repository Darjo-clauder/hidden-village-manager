import { describe, it, expect } from 'vitest'
import { specialistBonus } from '../shared/utils/scoutAggregation.js'

// ── Pure helpers replicated for testing ──────────────────────────────────────

function updateExpertise(scout, regionId, contactLevel) {
  if (contactLevel < 15) return false
  if (!scout.expertise) scout.expertise = {}
  if (scout.expertise[regionId] === 'specialist') return false
  scout.expertise[regionId] = 'specialist'
  return true
}

function tickBurnout(scout) {
  if ((scout.fatigue || 0) >= 80) {
    scout.burnoutMonths = (scout.burnoutMonths || 0) + 1
  } else {
    scout.burnoutMonths = 0
  }
  return (scout.burnoutMonths || 0) >= 3
}

function generatePoachOffer(scout, G) {
  if (scout.poachOffer) return false
  const rating = scout.rating ?? 10
  if (rating < 16) return false
  scout.poachOffer = { village: 'Kumogakure', retentionCost: rating * 800, expiresMonth: G.month + 2 }
  return true
}

// ── Expertise ─────────────────────────────────────────────────────────────────
describe('Scout expertise', () => {
  it('does not become specialist before contactLevel 15', () => {
    const scout = {}
    updateExpertise(scout, 'fire', 14)
    expect(scout.expertise?.fire).toBeUndefined()
  })

  it('becomes specialist at contactLevel 15', () => {
    const scout = {}
    updateExpertise(scout, 'fire', 15)
    expect(scout.expertise?.fire).toBe('specialist')
  })

  it('does not overwrite existing specialist status', () => {
    const scout = { expertise: { fire: 'specialist' } }
    const changed = updateExpertise(scout, 'fire', 20)
    expect(changed).toBe(false)
  })

  it('specialistBonus returns 0.15 for specialist region', () => {
    const scout = { expertise: { fire: 'specialist' } }
    expect(specialistBonus(scout, 'fire')).toBe(0.15)
  })

  it('specialistBonus returns 0 for non-specialist region', () => {
    const scout = { expertise: { fire: 'specialist' } }
    expect(specialistBonus(scout, 'water')).toBe(0)
  })

  it('specialistBonus returns 0 when scout has no expertise', () => {
    expect(specialistBonus({}, 'fire')).toBe(0)
  })
})

// ── Burnout ───────────────────────────────────────────────────────────────────
describe('Scout burnout', () => {
  it('does not trigger burnout at fatigue < 80', () => {
    const scout = { fatigue: 75 }
    expect(tickBurnout(scout)).toBe(false)
    expect(scout.burnoutMonths).toBe(0)
  })

  it('increments burnoutMonths when fatigue >= 80', () => {
    const scout = { fatigue: 85 }
    tickBurnout(scout)
    expect(scout.burnoutMonths).toBe(1)
  })

  it('resets burnoutMonths when fatigue drops below 80', () => {
    const scout = { fatigue: 85, burnoutMonths: 2 }
    scout.fatigue = 70
    tickBurnout(scout)
    expect(scout.burnoutMonths).toBe(0)
  })

  it('triggers resignation after 3 consecutive high-fatigue months', () => {
    const scout = { fatigue: 90, burnoutMonths: 2 }
    expect(tickBurnout(scout)).toBe(true)
  })
})

// ── Poaching ──────────────────────────────────────────────────────────────────
describe('Scout poaching', () => {
  it('does not generate offer for low-rated scout (<16)', () => {
    const scout = { rating: 14, poachOffer: null }
    expect(generatePoachOffer(scout, { month: 3 })).toBe(false)
  })

  it('generates offer for high-rated scout (>=16)', () => {
    const scout = { rating: 17, poachOffer: null }
    expect(generatePoachOffer(scout, { month: 3 })).toBe(true)
    expect(scout.poachOffer).not.toBeNull()
  })

  it('retention cost scales with rating', () => {
    const scout = { rating: 18, poachOffer: null }
    generatePoachOffer(scout, { month: 3 })
    expect(scout.poachOffer.retentionCost).toBe(18 * 800)
  })

  it('does not overwrite existing poach offer', () => {
    const scout = { rating: 18, poachOffer: { village: 'Existing' } }
    expect(generatePoachOffer(scout, { month: 3 })).toBe(false)
    expect(scout.poachOffer.village).toBe('Existing')
  })
})
