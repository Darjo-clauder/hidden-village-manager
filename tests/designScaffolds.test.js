import { describe, it, expect } from 'vitest'
import { formationMods, FORMATIONS } from '../shared/utils/formation.js'
import { pickSupportEvent, SUPPORT_EVENTS } from '../shared/bonds/supportEvents.js'
import { applyDebt, DEBT_INTEREST } from '../shared/utils/debt.js'

describe('#8 formationMods', () => {
  it('returns declared mods', () => {
    expect(formationMods('vanguard')).toEqual({ successMod: 0.06, riskMod: 0.04 })
  })
  it('unknown -> balanced zeros', () => {
    expect(formationMods('nope')).toEqual({ successMod: 0, riskMod: 0 })
  })
  it('every formation success/risk mod stays within ±0.1', () => {
    for (const f of Object.values(FORMATIONS)) {
      expect(Math.abs(f.successMod)).toBeLessThanOrEqual(0.1)
      expect(Math.abs(f.riskMod)).toBeLessThanOrEqual(0.1)
    }
  })
})

describe('#11 pickSupportEvent', () => {
  it('deterministic with injected rng', () => {
    const ev = pickSupportEvent('Rivals', () => 0)
    expect(ev.id).toBe('riv_spar')
  })
  it('null for unknown bond type', () => {
    expect(pickSupportEvent('NoSuchBond', () => 0)).toBeNull()
  })
  it('every bond type has at least one event', () => {
    for (const k of Object.keys(SUPPORT_EVENTS)) expect(SUPPORT_EVENTS[k].length).toBeGreaterThan(0)
  })
})

describe('#12 applyDebt (optional)', () => {
  it('solvent treasury is untouched', () => {
    expect(applyDebt(5000)).toEqual({ ryo: 5000, debt: 0, interestCharged: 0 })
  })
  it('negative balance accrues interest', () => {
    // -1000 owed, 5% -> 50 interest -> ryo -1050, debt 1050
    expect(applyDebt(-1000)).toEqual({ ryo: -1050, debt: 1050, interestCharged: 50 })
  })
  it('interest rate is configurable', () => {
    expect(applyDebt(-1000, { interest: 0.1 }).interestCharged).toBe(100)
  })
  it('default rate is the exported constant', () => {
    expect(DEBT_INTEREST).toBe(0.05)
  })
})
