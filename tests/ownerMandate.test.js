import { describe, it, expect } from 'vitest'
import {
  MANDATE_POOL, MANDATE_BY_ID,
  pickMandates, evaluateMandates, checkMandate,
  CONFIDENCE_START, DISMISSAL_THRESHOLD,
} from '../shared/utils/ownerMandate.js'

describe('Mandate pool', () => {
  it('all mandates have required fields', () => {
    for (const m of MANDATE_POOL) {
      expect(typeof m.id).toBe('string')
      expect(typeof m.n).toBe('string')
      expect(m.confidenceGain).toBeGreaterThan(0)
      expect(m.confidenceLoss).toBeGreaterThan(0)
    }
  })

  it('MANDATE_BY_ID indexes all pool entries', () => {
    for (const m of MANDATE_POOL) {
      expect(MANDATE_BY_ID[m.id]).toBe(m)
    }
  })
})

describe('pickMandates', () => {
  it('returns exactly 3 ids', () => {
    const ids = pickMandates()
    expect(ids).toHaveLength(3)
  })

  it('ids are unique within a pick', () => {
    const ids = pickMandates()
    expect(new Set(ids).size).toBe(3)
  })

  it('avoids all last-year ids when pool is big enough', () => {
    const lastYear = MANDATE_POOL.slice(0, 4).map(m => m.id)
    const ids = pickMandates(lastYear)
    ids.forEach(id => expect(lastYear).not.toContain(id))
  })

  it('falls back gracefully when last-year ids overlap most of pool', () => {
    const lastYear = MANDATE_POOL.map(m => m.id)  // "exclude everything"
    const ids = pickMandates(lastYear)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })
})

describe('checkMandate', () => {
  it('stay_solvent: passes when deficitMonths ≤ 2', () => {
    expect(checkMandate('stay_solvent', { finances: { deficitMonths: 0 } })).toBe(true)
    expect(checkMandate('stay_solvent', { finances: { deficitMonths: 2 } })).toBe(true)
    expect(checkMandate('stay_solvent', { finances: { deficitMonths: 3 } })).toBe(false)
  })

  it('no_kia: passes when no KIA recorded', () => {
    expect(checkMandate('no_kia', { _mandateKIAThisYear: 0 })).toBe(true)
    expect(checkMandate('no_kia', { _mandateKIAThisYear: 1 })).toBe(false)
    expect(checkMandate('no_kia', {})).toBe(true)  // undefined → 0
  })

  it('grow_rep: passes when rep grew 20+', () => {
    expect(checkMandate('grow_rep', { reputation: 55, _mandateStartRep: 30 })).toBe(true)
    expect(checkMandate('grow_rep', { reputation: 45, _mandateStartRep: 30 })).toBe(false)
  })

  it('cap_compliant: passes when luxury tax months ≤ 1', () => {
    expect(checkMandate('cap_compliant', { _mandateLuxTaxMonths: 0 })).toBe(true)
    expect(checkMandate('cap_compliant', { _mandateLuxTaxMonths: 1 })).toBe(true)
    expect(checkMandate('cap_compliant', { _mandateLuxTaxMonths: 2 })).toBe(false)
  })

  it('finish_top3: reads season table standings', () => {
    const G = {
      vName: 'LeafVillage',
      season: {
        table: {
          LeafVillage: { name: 'LeafVillage', pts: 12, w: 4, l: 0 },
          RivalA:      { name: 'RivalA',      pts: 9,  w: 3, l: 1 },
          RivalB:      { name: 'RivalB',      pts: 6,  w: 2, l: 2 },
          RivalC:      { name: 'RivalC',      pts: 3,  w: 1, l: 3 },
          RivalD:      { name: 'RivalD',      pts: 0,  w: 0, l: 4 },
        },
      },
    }
    expect(checkMandate('finish_top3', G)).toBe(true)
    // Demote player to 4th
    G.season.table.LeafVillage.pts = 2
    expect(checkMandate('finish_top3', G)).toBe(false)
  })
})

describe('evaluateMandates', () => {
  it('positive delta when all mandates met', () => {
    const G = { finances: { deficitMonths: 0 }, _mandateKIAThisYear: 0, _mandateLuxTaxMonths: 0 }
    const { results, delta } = evaluateMandates(['stay_solvent', 'no_kia', 'cap_compliant'], G)
    expect(results.every(r => r.met)).toBe(true)
    expect(delta).toBeGreaterThan(0)
  })

  it('negative delta when all mandates missed', () => {
    const G = { finances: { deficitMonths: 5 }, _mandateKIAThisYear: 3, _mandateLuxTaxMonths: 5 }
    const { results, delta } = evaluateMandates(['stay_solvent', 'no_kia', 'cap_compliant'], G)
    expect(results.every(r => !r.met)).toBe(true)
    expect(delta).toBeLessThan(0)
  })

  it('two consecutive bad years reach dismissal threshold from CONFIDENCE_START', () => {
    // Simulate worst-case two years in a row
    const G = { finances: { deficitMonths: 5 }, _mandateKIAThisYear: 3, _mandateLuxTaxMonths: 5 }
    const ids = ['stay_solvent', 'no_kia', 'cap_compliant']
    let conf = CONFIDENCE_START
    for (let y = 0; y < 2; y++) {
      const { delta } = evaluateMandates(ids, G)
      conf = Math.max(0, Math.min(100, conf + delta))
    }
    expect(conf).toBeLessThan(DISMISSAL_THRESHOLD)
  })

  it('two consecutive good years well above dismissal threshold', () => {
    const G = { finances: { deficitMonths: 0 }, _mandateKIAThisYear: 0, _mandateLuxTaxMonths: 0 }
    const ids = ['stay_solvent', 'no_kia', 'cap_compliant']
    let conf = CONFIDENCE_START
    for (let y = 0; y < 2; y++) {
      const { delta } = evaluateMandates(ids, G)
      conf = Math.max(0, Math.min(100, conf + delta))
    }
    expect(conf).toBeGreaterThan(DISMISSAL_THRESHOLD)
  })
})
