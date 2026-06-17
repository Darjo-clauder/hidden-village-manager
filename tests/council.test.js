import { describe, it, expect } from 'vitest'
import { COUNCIL_FACTIONS, COUNCIL_PROPOSALS, FACTION_BY_ID, getCouncilPerks } from '../shared/constants/council.js'

describe('Council faction definitions', () => {
  it('defines 4 factions', () => {
    expect(COUNCIL_FACTIONS).toHaveLength(4)
  })

  it('each faction has a perk with threshold', () => {
    for (const f of COUNCIL_FACTIONS) {
      expect(f.perk.threshold).toBeGreaterThan(0)
    }
  })

  it('FACTION_BY_ID lookup works', () => {
    expect(FACTION_BY_ID['military'].n).toBe('Military Council')
    expect(FACTION_BY_ID['merchant'].icon).toBe('💰')
  })
})

describe('Council proposals', () => {
  it('all proposals reference a valid faction', () => {
    const fIds = COUNCIL_FACTIONS.map(f => f.id)
    for (const p of COUNCIL_PROPOSALS) {
      expect(fIds).toContain(p.faction)
    }
  })

  it('each proposal has exactly 2 choices', () => {
    for (const p of COUNCIL_PROPOSALS) {
      expect(p.choices).toHaveLength(2)
    }
  })
})

describe('getCouncilPerks', () => {
  it('returns zero perks when all approvals below threshold', () => {
    const G = { councilApproval: { military: 30, merchant: 30, academy: 30, elder: 30 } }
    const p = getCouncilPerks(G)
    expect(p.successMod).toBe(0)
    expect(p.monthlyRyo).toBe(0)
    expect(p.growthBonus).toBe(0)
    expect(p.monthlyRep).toBe(0)
  })

  it('activates military perk at >= 70 approval', () => {
    const G = { councilApproval: { military: 75, merchant: 30, academy: 30, elder: 30 } }
    const p = getCouncilPerks(G)
    expect(p.successMod).toBeCloseTo(0.05)
  })

  it('activates merchant perk at >= 70 approval', () => {
    const G = { councilApproval: { military: 30, merchant: 80, academy: 30, elder: 30 } }
    const p = getCouncilPerks(G)
    expect(p.monthlyRyo).toBe(800)
  })

  it('activates academy perk at >= 70 approval', () => {
    const G = { councilApproval: { military: 30, merchant: 30, academy: 70, elder: 30 } }
    const p = getCouncilPerks(G)
    expect(p.growthBonus).toBeCloseTo(0.10)
  })

  it('activates elder perk at >= 70 approval', () => {
    const G = { councilApproval: { military: 30, merchant: 30, academy: 30, elder: 90 } }
    const p = getCouncilPerks(G)
    expect(p.monthlyRep).toBe(5)
  })

  it('stacks perks from multiple high-approval factions', () => {
    const G = { councilApproval: { military: 80, merchant: 80, academy: 30, elder: 30 } }
    const p = getCouncilPerks(G)
    expect(p.successMod).toBeCloseTo(0.05)
    expect(p.monthlyRyo).toBe(800)
  })

  it('handles missing councilApproval with defaults', () => {
    const G = {}
    const p = getCouncilPerks(G)
    expect(p.successMod).toBe(0)
  })
})
