import { describe, it, expect } from 'vitest'
import {
  SAFEHOUSE_LOCATIONS,
  SH_LOCATION_BY_ID,
  DEEP_COVER_OPS,
  DC_OP_BY_ID,
  MAX_SAFEHOUSES,
  SAFEHOUSE_COST,
  getSafehousePassives,
  rollProspectLead,
} from '../shared/constants/safehouses.js'

const mkSh = (locationId) => ({ id: 'sh_' + locationId, locationId, status: 'active' })

describe('constants', () => {
  it('has 5 safehouse locations', () => {
    expect(SAFEHOUSE_LOCATIONS).toHaveLength(5)
  })
  it('SH_LOCATION_BY_ID indexes all locations', () => {
    for (const loc of SAFEHOUSE_LOCATIONS) {
      expect(SH_LOCATION_BY_ID[loc.id]).toBe(loc)
    }
  })
  it('has 4 deep cover ops', () => {
    expect(DEEP_COVER_OPS).toHaveLength(4)
  })
  it('DC_OP_BY_ID indexes all ops', () => {
    for (const op of DEEP_COVER_OPS) {
      expect(DC_OP_BY_ID[op.id]).toBe(op)
    }
  })
  it('MAX_SAFEHOUSES is 3', () => {
    expect(MAX_SAFEHOUSES).toBe(3)
  })
  it('SAFEHOUSE_COST is positive', () => {
    expect(SAFEHOUSE_COST).toBeGreaterThan(0)
  })
})

describe('getSafehousePassives', () => {
  it('returns zeros when no safehouses', () => {
    const G = { safehouses: [] }
    const p = getSafehousePassives(G)
    expect(p.prospectBonus).toBe(0)
    expect(p.opSuccessBonus).toBe(0)
    expect(p.count).toBe(0)
  })

  it('returns zeros when safehouses not active', () => {
    const G = { safehouses: [{ locationId: 'sh_north', status: 'destroyed' }] }
    const p = getSafehousePassives(G)
    expect(p.count).toBe(0)
  })

  it('sums bonuses for active safehouses', () => {
    const G = { safehouses: [mkSh('sh_north'), mkSh('sh_east')] }
    const p = getSafehousePassives(G)
    expect(p.count).toBe(2)
    const expectedProspect = SH_LOCATION_BY_ID['sh_north'].prospectBonus + SH_LOCATION_BY_ID['sh_east'].prospectBonus
    expect(p.prospectBonus).toBeCloseTo(expectedProspect)
  })
})

describe('rollProspectLead', () => {
  it('returns null when no safehouses', () => {
    const G = { safehouses: [] }
    const lead = rollProspectLead(G, () => 0.99)
    expect(lead).toBeNull()
  })

  it('returns null when roll fails', () => {
    const G = { safehouses: [mkSh('sh_north')] }
    const lead = rollProspectLead(G, () => 0.99)
    expect(lead).toBeNull()
  })

  it('returns a prospect when roll succeeds', () => {
    const G = { safehouses: [mkSh('sh_north')] }
    let callCount = 0
    const fakeRand = () => {
      callCount++
      return callCount === 1 ? 0.01 : 0.5
    }
    const lead = rollProspectLead(G, fakeRand)
    expect(lead).not.toBeNull()
    expect(lead.name).toBeTruthy()
    expect(typeof lead.ri).toBe('number')
  })

  it('prospect source matches active safehouse location', () => {
    const G = { safehouses: [mkSh('sh_city')] }
    let callCount = 0
    const fakeRand = () => {
      callCount++
      return callCount === 1 ? 0.01 : 0.5
    }
    const lead = rollProspectLead(G, fakeRand)
    expect(lead?.source).toBe(SH_LOCATION_BY_ID['sh_city'].name)
  })
})
