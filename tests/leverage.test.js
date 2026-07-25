import { describe, it, expect } from 'vitest'
import { LEVERAGE_PLAYS, PLAY_BY_ID, playEligibility, leverageSuccessChance, leverageEffect } from '../shared/utils/leverage.js'

describe('LEVERAGE_PLAYS shape', () => {
  it('every play has the fields the panel renders', () => {
    LEVERAGE_PLAYS.forEach(p => {
      expect(typeof p.id).toBe('string')
      expect(typeof p.n).toBe('string')
      expect(typeof p.cost).toBe('number')
      expect(p.cost).toBeGreaterThan(0)
      expect(typeof p.desc).toBe('string')
      expect(typeof p.requires).toBe('string')
    })
  })
  it('PLAY_BY_ID indexes every play', () => {
    expect(Object.keys(PLAY_BY_ID).sort()).toEqual(LEVERAGE_PLAYS.map(p => p.id).sort())
  })
})

describe('playEligibility', () => {
  it('every play requires a filed intel report', () => {
    LEVERAGE_PLAYS.forEach(p => {
      const r = playEligibility(p.id, { hasIntel: false, kagePersonalRel: 10, aceCount: 2, hasBlocOffer: true })
      expect(r.ok).toBe(false)
      expect(r.reason).toMatch(/recon/i)
    })
  })
  it('blackmail needs a soured personal relationship', () => {
    expect(playEligibility('blackmail', { hasIntel: true, kagePersonalRel: 20 }).ok).toBe(true)
    expect(playEligibility('blackmail', { hasIntel: true, kagePersonalRel: 70 }).ok).toBe(false)
  })
  it('discredit needs a named ace', () => {
    expect(playEligibility('discredit_ace', { hasIntel: true, aceCount: 1 }).ok).toBe(true)
    expect(playEligibility('discredit_ace', { hasIntel: true, aceCount: 0 }).ok).toBe(false)
  })
  it('poison bloc needs an active offer', () => {
    expect(playEligibility('poison_bloc', { hasIntel: true, hasBlocOffer: true }).ok).toBe(true)
    expect(playEligibility('poison_bloc', { hasIntel: true, hasBlocOffer: false }).ok).toBe(false)
  })
  it('rejects unknown plays', () => {
    expect(playEligibility('nope', { hasIntel: true }).ok).toBe(false)
  })
})

describe('leverageSuccessChance', () => {
  it('espionage investment helps, rivalry heat and counter-intel hurt', () => {
    const base = leverageSuccessChance('blackmail', {})
    expect(leverageSuccessChance('blackmail', { espionageBonus: 0.2 })).toBeGreaterThan(base)
    expect(leverageSuccessChance('blackmail', { grudgeTicks: 5 })).toBeLessThan(base)
    expect(leverageSuccessChance('blackmail', { counterIntel: 8 })).toBeLessThan(base)
  })
  it('stays inside [0.1, 0.9]', () => {
    expect(leverageSuccessChance('poison_bloc', { espionageBonus: 99 })).toBe(0.9)
    expect(leverageSuccessChance('poison_bloc', { counterIntel: 99, grudgeTicks: 99 })).toBe(0.1)
  })
  it('handles unknown play ids without NaN', () => {
    expect(Number.isFinite(leverageSuccessChance('nope', {}))).toBe(true)
  })
})

describe('leverageEffect', () => {
  const seeded = () => 0.5
  it('failure always exposes you, whatever the play', () => {
    LEVERAGE_PLAYS.forEach(p => {
      const e = leverageEffect(p.id, false, seeded)
      expect(e.relDelta).toBeLessThan(0)
      expect(e.kageRelDelta).toBeLessThan(0)
      expect(e.threatDelta).toBeGreaterThan(0)
      expect(e.strengthDelta).toBe(0)
    })
  })
  it('blackmail buys quiet rather than damage', () => {
    const e = leverageEffect('blackmail', true, seeded)
    expect(e.suppressDemandsMonths).toBeGreaterThan(0)
    expect(e.threatDelta).toBeLessThan(0)
    expect(e.strengthDelta).toBe(0)
  })
  it('discrediting an ace dents strength', () => {
    const e = leverageEffect('discredit_ace', true, seeded)
    expect(e.strengthDelta).toBeLessThan(0)
    expect(e.clearBloc).toBe(false)
  })
  it('poisoning a bloc clears the offer without a strength hit', () => {
    const e = leverageEffect('poison_bloc', true, seeded)
    expect(e.clearBloc).toBe(true)
    expect(e.strengthDelta).toBe(0)
  })
})
