import { describe, it, expect, beforeEach } from 'vitest'
import { resolveActiveStarter } from '../shared/types/DepthChart.js'
import { calcConfidence, createScoutReport } from '../shared/types/ScoutReport.js'
import { createScout } from '../shared/types/Scout.js'
import { createProspect } from '../shared/types/Prospect.js'
import { resolveMission, createMissionTemplate } from '../shared/types/MissionTemplate.js'
import { seedPhase1 } from '../seeds/phase1.js'
import { HIDDEN_ATTRIBUTE_KEYS } from '../shared/constants/prospect.js'

// ── Depth chart: auto-promotion integration ───────────────────────────────────
describe('Auto-promotion integration', () => {
  it('cascades through backup and emergency when starter and backup both injured', () => {
    const shinobi = {
      'A': { status: 'injured' },
      'B': { status: 'injured' },
      'C': { status: 'available' },
    }
    const slot = { starterId: 'A', backupIds: ['B', 'C'], promotionRules: 'auto' }
    expect(resolveActiveStarter(slot, shinobi)).toBe('C')
  })

  it('respects manual promotion rule — returns null even with available backups', () => {
    const shinobi = { 'A': { status: 'injured' }, 'B': { status: 'available' } }
    const slot = { starterId: 'A', backupIds: ['B'], promotionRules: 'manual' }
    expect(resolveActiveStarter(slot, shinobi)).toBeNull()
  })
})

// ── Scout confidence → report pipeline ───────────────────────────────────────
describe('Scouting pipeline integration', () => {
  let scout, prospect

  beforeEach(() => {
    scout = createScout({ judgement: 14, bias: 0 })
    prospect = createProspect({ currentAbility: 60, potential: 80 })
  })

  it('a high-judgement scout at 6 months produces Detailed or Elite quality', () => {
    const report = createScoutReport(scout, prospect, 6)
    expect(['Detailed', 'Elite']).toContain(report.quality)
  })

  it('scout with positive bias over-estimates ability', () => {
    const biasedScout = createScout({ judgement: 14, bias: 8 })
    // Run 20 trials — majority should be above true ability
    const estimates = Array.from({ length: 20 }, () =>
      createScoutReport(biasedScout, prospect, 4).estimatedAbility
    )
    const aboveTrue = estimates.filter(e => e > prospect.currentAbility).length
    expect(aboveTrue).toBeGreaterThan(10)
  })

  it('negative bias scout under-estimates ability', () => {
    const biasedScout = createScout({ judgement: 14, bias: -8 })
    const estimates = Array.from({ length: 20 }, () =>
      createScoutReport(biasedScout, prospect, 4).estimatedAbility
    )
    const belowTrue = estimates.filter(e => e < prospect.currentAbility).length
    expect(belowTrue).toBeGreaterThan(10)
  })

  it('confidence increases monotonically with months active (for same scout)', () => {
    const shim = { judgement: scout.judgement }
    const c1 = calcConfidence(shim, 1)
    const c3 = calcConfidence(shim, 3)
    const c6 = calcConfidence(shim, 6)
    expect(c3).toBeGreaterThan(c1)
    expect(c6).toBeGreaterThan(c3)
  })
})

// ── Hidden attributes backfill ────────────────────────────────────────────────
describe('Hidden attribute initialisation', () => {
  it('new prospects have all 5 hidden attributes unrevealed', () => {
    const p = createProspect()
    expect(p.hiddenAttributes).toHaveLength(5)
    p.hiddenAttributes.forEach(attr => {
      expect(HIDDEN_ATTRIBUTE_KEYS).toContain(attr.key)
      expect(attr.revealed).toBe(false)
      expect(attr.value).toBeGreaterThanOrEqual(1)
      expect(attr.value).toBeLessThanOrEqual(20)
    })
  })
})

// ── Mission resolution integration ───────────────────────────────────────────
describe('Mission template resolution integration', () => {
  const escort = createMissionTemplate({
    baseDifficulty: 'D', rewardRange: { min: 300, max: 600 },
    riskProfile: { injuryChance: 0.04, failPenalty: 1 },
  })
  const sRank = createMissionTemplate({
    baseDifficulty: 'S', rewardRange: { min: 20000, max: 30000 },
    riskProfile: { injuryChance: 0.45, failPenalty: 8 },
  })

  it('weak squad always fails S-rank (deterministic seed near 1)', () => {
    const result = resolveMission(sRank, 10, 0.99)
    expect(result.success).toBe(false)
  })

  it('strong squad reliably completes D-rank (deterministic seed near 0)', () => {
    const result = resolveMission(escort, 80, 0.01)
    expect(result.success).toBe(true)
    expect(result.ryo).toBeGreaterThanOrEqual(300)
  })

  it('rep penalty on failure matches failPenalty', () => {
    const result = resolveMission(sRank, 5, 0.99)
    expect(result.repGain).toBe(-sRank.riskProfile.failPenalty)
  })
})

// ── Full seed → simulate pipeline ────────────────────────────────────────────
describe('Seed + simulate end-to-end', () => {
  it('seedPhase1 templates can all be simulated at average power 30', () => {
    const G = { prospects: [], staff: [], squads: [] }
    seedPhase1(G)
    G.missionTemplates.forEach(t => {
      const result = resolveMission(t, 30)
      expect(typeof result.success).toBe('boolean')
      expect(result.injuryRoll).toBeGreaterThanOrEqual(0)
      expect(result.injuryRoll).toBeLessThanOrEqual(1)
    })
  })
})
