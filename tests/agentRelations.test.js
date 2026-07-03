import { describe, it, expect } from 'vitest'
import { standingTier, effectiveFeePercent, adjustStanding, AGENT_TIERS, STANDING_EVENTS } from '../shared/utils/agentRelations.js'

describe('agentRelations — standingTier', () => {
  it('maps standing to the right tier', () => {
    expect(standingTier(90).id).toBe('trusted')
    expect(standingTier(70).id).toBe('warm')
    expect(standingTier(50).id).toBe('neutral')
    expect(standingTier(30).id).toBe('wary')
    expect(standingTier(5).id).toBe('hostile')
  })
  it('defaults to neutral (50) when undefined', () => {
    expect(standingTier(undefined).id).toBe('neutral')
  })
  it('only the trusted tier grants first-refusal tips', () => {
    expect(AGENT_TIERS.filter(t => t.tip).map(t => t.id)).toEqual(['trusted'])
  })
})

describe('agentRelations — effectiveFeePercent', () => {
  it('trusted agents discount the cut, hostile ones pad it', () => {
    expect(effectiveFeePercent(10, 90)).toBe(6)   // -4
    expect(effectiveFeePercent(10, 50)).toBe(10)  // neutral
    expect(effectiveFeePercent(10, 5)).toBe(14)   // +4
  })
  it('never drops below a 2% floor', () => {
    expect(effectiveFeePercent(3, 100)).toBe(2)   // 3-4 = -1 -> floored to 2
  })
})

describe('agentRelations — adjustStanding', () => {
  it('rewards doing business and exceeding offers', () => {
    expect(adjustStanding(50, 'signed_client')).toBe(50 + STANDING_EVENTS.signed_client)
    expect(adjustStanding(50, 'exceeded_offer')).toBe(62)
  })
  it('punishes reneging, lowballing, poaching', () => {
    expect(adjustStanding(50, 'reneged')).toBe(38)
    expect(adjustStanding(50, 'lowballed')).toBe(45)
    expect(adjustStanding(50, 'poached')).toBe(44)
  })
  it('clamps to [0,100]', () => {
    expect(adjustStanding(96, 'exceeded_offer')).toBe(100)
    expect(adjustStanding(2, 'reneged')).toBe(0)
  })
  it('ignores unknown events', () => {
    expect(adjustStanding(50, 'nope')).toBe(50)
    expect(adjustStanding(undefined, 'signed_client')).toBe(58)
  })
})
