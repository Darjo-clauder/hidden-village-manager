import { describe, it, expect } from 'vitest'
import { DISTRICTS, DISTRICT_BY_ID, getDistrictPassives } from '../shared/constants/districts.js'

describe('District definitions', () => {
  it('all districts have required fields', () => {
    for (const d of DISTRICTS) {
      expect(d.id).toBeTruthy()
      expect(d.cost).toBeGreaterThan(0)
      expect(d.buildMonths).toBeGreaterThan(0)
      expect(d.effect).toBeTruthy()
    }
  })

  it('DISTRICT_BY_ID lookup works', () => {
    expect(DISTRICT_BY_ID['market'].n).toBe('Trade Market')
    expect(DISTRICT_BY_ID['forge'].icon).toBe('⚒')
  })
})

describe('getDistrictPassives', () => {
  it('returns all-zero passives when no districts built', () => {
    const G = { districts: [] }
    const p = getDistrictPassives(G)
    expect(p.monthlyRyo).toBe(0)
    expect(p.missionRiskReduction).toBe(0)
    expect(p.injDayReduction).toBe(0)
  })

  it('applies monthlyRyo from market district', () => {
    const G = { districts: [{ id: 'market', status: 'built' }] }
    const p = getDistrictPassives(G)
    expect(p.monthlyRyo).toBe(1200)
  })

  it('ignores buildings still under construction', () => {
    const G = { districts: [{ id: 'market', status: 'building', buildMonthsLeft: 1 }] }
    const p = getDistrictPassives(G)
    expect(p.monthlyRyo).toBe(0)
  })

  it('stacks passives from multiple built districts', () => {
    const G = {
      districts: [
        { id: 'market', status: 'built' },
        { id: 'hospital_wing', status: 'built' },
      ]
    }
    const p = getDistrictPassives(G)
    expect(p.monthlyRyo).toBe(1200)
    expect(p.injDayReduction).toBe(1)
  })

  it('applies missionRiskReduction from forge', () => {
    const G = { districts: [{ id: 'forge', status: 'built' }] }
    const p = getDistrictPassives(G)
    expect(p.missionRiskReduction).toBeCloseTo(0.04)
  })

  it('applies kiaRiskMod from hospital_wing', () => {
    const G = { districts: [{ id: 'hospital_wing', status: 'built' }] }
    const p = getDistrictPassives(G)
    expect(p.kiaRiskMod).toBeCloseTo(-0.02)
  })

  it('handles missing G.districts gracefully', () => {
    const G = {}
    const p = getDistrictPassives(G)
    expect(p.monthlyRyo).toBe(0)
  })
})
