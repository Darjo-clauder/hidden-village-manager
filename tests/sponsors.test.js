import { describe, it, expect } from 'vitest'
import { negotiate, sponsorMoodDelta, moodPayoutMult, moodTier, applyMoodDelta, SPONSOR_QUIT_MOOD, NEGOTIATE_TACTICS } from '../shared/utils/sponsors.js'

const offer = { id: 'x', n: 'Test Guild', monthlyRyo: 2000, obligation: 'None', restrictedVillage: 'Stoneveil' }

describe('sponsors — negotiate', () => {
  it('accept returns the base deal', () => {
    const r = negotiate(offer, 'accept', 0.5, 0.9)
    expect(r.outcome).toBe('accept')
    expect(r.deal.monthlyRyo).toBe(2000)
  })

  it('push_pay: low roll wins a 25% bump, high roll walks', () => {
    // leverage 0.5 -> win threshold 0.525
    expect(negotiate(offer, 'push_pay', 0.5, 0.1).deal.monthlyRyo).toBe(2500)
    const counter = negotiate(offer, 'push_pay', 0.5, 0.7)   // between win and win+0.35
    expect(counter.outcome).toBe('counter')
    expect(counter.deal.monthlyRyo).toBe(2200)
    expect(negotiate(offer, 'push_pay', 0.5, 0.99).outcome).toBe('walk')
  })

  it('higher leverage makes push_pay more likely to land', () => {
    expect(negotiate(offer, 'push_pay', 1.0, 0.7).outcome).toBe('accept')   // threshold 0.8
    expect(negotiate(offer, 'push_pay', 0.0, 0.3).outcome).not.toBe('accept') // threshold 0.25
  })

  it('ease_terms drops the restriction for less pay', () => {
    const r = negotiate(offer, 'ease_terms', 0.5, 0.1)
    expect(r.outcome).toBe('accept')
    expect(r.deal.restrictedVillage).toBe(null)
    expect(r.deal.monthlyRyo).toBe(1640)   // 2000 * 0.82
    expect(r.deal.obligation).toContain('eased')
  })
})

describe('sponsors — mood', () => {
  it('mood delta rewards title/wins, punishes unmet obligation and slumps', () => {
    expect(sponsorMoodDelta({ obligationMet: true })).toBe(1)
    expect(sponsorMoodDelta({ obligationMet: false })).toBe(-8)
    expect(sponsorMoodDelta({ obligationMet: true, title: true })).toBe(9)
    expect(sponsorMoodDelta({ obligationMet: true, lowMorale: true })).toBe(-1)
    expect(sponsorMoodDelta({ obligationMet: true, seasonWin: true, derbyWin: true })).toBe(6)
  })

  it('payout multiplier spans 0.85..1.15 around a neutral 1.0', () => {
    expect(moodPayoutMult(0)).toBe(0.85)
    expect(moodPayoutMult(50)).toBe(1)
    expect(moodPayoutMult(100)).toBe(1.15)
  })

  it('mood tiers', () => {
    expect(moodTier(90).id).toBe('delighted')
    expect(moodTier(60).id).toBe('satisfied')
    expect(moodTier(30).id).toBe('restless')
    expect(moodTier(5).id).toBe('displeased')
  })

  it('applyMoodDelta clamps to [0,100]', () => {
    expect(applyMoodDelta(98, 8)).toBe(100)
    expect(applyMoodDelta(5, -20)).toBe(0)
    expect(applyMoodDelta(undefined, 0)).toBe(50)
  })

  it('quit threshold is defined and low', () => {
    expect(SPONSOR_QUIT_MOOD).toBeLessThan(25)
    expect(NEGOTIATE_TACTICS.map(t => t.id)).toContain('push_pay')
  })
})
