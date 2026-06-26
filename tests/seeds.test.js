import { describe, it, expect } from 'vitest'
import { SEED_PROSPECTS, SEED_MISSION_TEMPLATES, seedPhase1 } from '../seeds/phase1.js'

describe('Phase 1 seed data', () => {
  it('exports exactly 20 prospects', () => {
    expect(SEED_PROSPECTS).toHaveLength(20)
  })

  it('all prospects have valid potentialRange', () => {
    SEED_PROSPECTS.forEach(p => {
      expect(p.potentialRange.min).toBeLessThanOrEqual(p.potentialRange.max)
      expect(p.potential).toBeGreaterThanOrEqual(p.potentialRange.min)
      expect(p.potential).toBeLessThanOrEqual(p.potentialRange.max)
    })
  })

  it('exports exactly 3 mission templates', () => {
    expect(SEED_MISSION_TEMPLATES).toHaveLength(3)
  })

  it('mission templates span D / B / A difficulties', () => {
    const difficulties = SEED_MISSION_TEMPLATES.map(t => t.baseDifficulty)
    expect(difficulties).toContain('D')
    expect(difficulties).toContain('B')
    expect(difficulties).toContain('A')
  })
})

describe('seedPhase1()', () => {
  it('injects prospects and mission templates into G (lean start — no auto-seeded scouts)', () => {
    const G = { prospects: [], staff: [], squads: [] }
    seedPhase1(G)
    expect(G.prospects.length).toBe(20)
    expect(G.staff.length).toBe(0)   // village builds its own scouting
    expect(G.missionTemplates.length).toBe(3)
  })

  it('is idempotent — calling twice does not duplicate data', () => {
    const G = { prospects: [], staff: [], squads: [] }
    seedPhase1(G)
    seedPhase1(G)
    expect(G.prospects.length).toBe(20)
  })

  it('initialises depthChart for existing squads', () => {
    const G = { prospects: [], staff: [], squads: [{ id: 'sq-1' }, { id: 'sq-2' }] }
    seedPhase1(G)
    expect(Object.keys(G.depthChart)).toHaveLength(2)
    expect(G.depthChart['sq-1'].vanguard).toBeDefined()
  })

  it('throws when called without a game state', () => {
    expect(() => seedPhase1(null)).toThrow()
  })
})
