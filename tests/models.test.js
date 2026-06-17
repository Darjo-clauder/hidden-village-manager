import { describe, it, expect } from 'vitest'
import { createProspect } from '../shared/types/Prospect.js'
import { createScout } from '../shared/types/Scout.js'
import { createScoutReport, calcConfidence, confidenceToQuality } from '../shared/types/ScoutReport.js'
import { createDepthChart, resolveActiveStarter } from '../shared/types/DepthChart.js'
import { createMissionTemplate, resolveMission, DIFFICULTY_THRESHOLDS } from '../shared/types/MissionTemplate.js'

// ── Prospect ─────────────────────────────────────────────────────────────────
describe('createProspect', () => {
  it('generates a prospect with required fields', () => {
    const p = createProspect({ fn: 'Naruto', ln: 'Uzumaki' })
    expect(p.id).toBeTruthy()
    expect(p.fn).toBe('Naruto')
    expect(p.ln).toBe('Uzumaki')
    expect(p.potentialRange.min).toBeLessThanOrEqual(p.potentialRange.max)
    expect(p.currentAbility).toBeLessThanOrEqual(p.potential)
    expect(p.hiddenAttributes).toHaveLength(5)
    expect(p.hiddenAttributes.every(h => !h.revealed)).toBe(true)
  })

  it('accepts overrides for potentialRange', () => {
    const p = createProspect({ potentialRange: { min: 70, max: 90 } })
    expect(p.potentialRange.min).toBe(70)
    expect(p.potentialRange.max).toBe(90)
    expect(p.potential).toBeGreaterThanOrEqual(70)
    expect(p.potential).toBeLessThanOrEqual(90)
  })

  it('currentAbility is always below potential', () => {
    for (let i = 0; i < 50; i++) {
      const p = createProspect()
      expect(p.currentAbility).toBeLessThanOrEqual(p.potential)
    }
  })
})

// ── Scout ─────────────────────────────────────────────────────────────────────
describe('createScout', () => {
  it('generates a scout with a derived rating', () => {
    const s = createScout({ fn: 'Jiraiya', ln: '', knowledge: 18, judgement: 16 })
    expect(s.rating).toBe(17)
    expect(s.costPerReport).toBe((18 + 16) * 100)
  })

  it('bias is within -10 to +10', () => {
    for (let i = 0; i < 30; i++) {
      const s = createScout()
      expect(s.bias).toBeGreaterThanOrEqual(-10)
      expect(s.bias).toBeLessThanOrEqual(10)
    }
  })
})

// ── ScoutReport ───────────────────────────────────────────────────────────────
describe('calcConfidence', () => {
  it('increases with judgement and months active', () => {
    const lowScout = createScout({ judgement: 5 })
    const highScout = createScout({ judgement: 18 })
    expect(calcConfidence(highScout, 6)).toBeGreaterThan(calcConfidence(lowScout, 1))
  })

  it('caps at 0.98', () => {
    const s = createScout({ judgement: 20 })
    expect(calcConfidence(s, 12)).toBeLessThanOrEqual(0.98)
  })
})

describe('confidenceToQuality', () => {
  it('maps confidence bands to quality tiers', () => {
    expect(confidenceToQuality(0.90)).toBe('Elite')
    expect(confidenceToQuality(0.70)).toBe('Detailed')
    expect(confidenceToQuality(0.50)).toBe('General')
    expect(confidenceToQuality(0.20)).toBe('Impression')
  })
})

describe('createScoutReport', () => {
  it('produces a report within plausible bounds', () => {
    const scout = createScout({ judgement: 12, bias: 0 })
    const prospect = createProspect({ currentAbility: 50, potential: 75 })
    const report = createScoutReport(scout, prospect, 3, { year: 1, month: 4 })

    expect(report.prospectId).toBe(prospect.id)
    expect(report.scoutId).toBe(scout.id)
    expect(report.confidence).toBeGreaterThan(0)
    expect(report.confidence).toBeLessThanOrEqual(0.98)
    expect(report.estimatedAbility).toBeGreaterThanOrEqual(0)
    expect(report.estimatedAbility).toBeLessThanOrEqual(99)
    expect(report.estimatedPotentialRange.min).toBeLessThanOrEqual(report.estimatedPotentialRange.max)
  })

  it('reveals personality at confidence >= 0.65', () => {
    const scout = createScout({ judgement: 20, bias: 0 })
    const prospect = createProspect()
    const report = createScoutReport(scout, prospect, 6)
    expect(report.personalityRevealed).toBe(true)
  })
})

// ── DepthChart ────────────────────────────────────────────────────────────────
describe('createDepthChart', () => {
  it('creates slots for all 5 roles', () => {
    const dc = createDepthChart('squad-1')
    expect(Object.keys(dc)).toHaveLength(5)
    expect(dc.vanguard.starterId).toBeNull()
    expect(dc.support.backupIds).toEqual([])
  })
})

describe('resolveActiveStarter', () => {
  const shinobi = {
    's1': { status: 'available' },
    's2': { status: 'available' },
    's3': { status: 'injured' },
  }

  it('returns starter when available', () => {
    const slot = { starterId: 's1', backupIds: ['s2'], promotionRules: 'auto' }
    expect(resolveActiveStarter(slot, shinobi)).toBe('s1')
  })

  it('auto-promotes first available backup when starter is injured', () => {
    const slot = { starterId: 's3', backupIds: ['s2'], promotionRules: 'auto' }
    expect(resolveActiveStarter(slot, shinobi)).toBe('s2')
  })

  it('returns null when no one is available', () => {
    const slot = { starterId: 's3', backupIds: [], promotionRules: 'auto' }
    expect(resolveActiveStarter(slot, shinobi)).toBeNull()
  })

  it('does not auto-promote when rule is manual', () => {
    const slot = { starterId: 's3', backupIds: ['s2'], promotionRules: 'manual' }
    expect(resolveActiveStarter(slot, shinobi)).toBeNull()
  })
})

// ── MissionTemplate ───────────────────────────────────────────────────────────
describe('createMissionTemplate', () => {
  it('creates a template with defaults', () => {
    const t = createMissionTemplate({ name: 'Escort the Daimyo', baseDifficulty: 'B' })
    expect(t.baseDifficulty).toBe('B')
    expect(t.riskProfile.injuryChance).toBeGreaterThanOrEqual(0)
  })
})

describe('resolveMission', () => {
  const template = createMissionTemplate({
    baseDifficulty: 'C',
    rewardRange: { min: 500, max: 1000 },
    riskProfile: { injuryChance: 0.1, failPenalty: 2 },
  })

  it('succeeds with seed below success chance (strong squad)', () => {
    // squad power 50 vs threshold 25 → successChance ~ 0.5 + (50-25)/25 = 1.0 capped at 0.95
    const result = resolveMission(template, 50, 0.1)
    expect(result.success).toBe(true)
    expect(result.ryo).toBeGreaterThanOrEqual(500)
  })

  it('fails with seed above success chance (weak squad)', () => {
    // squad power 10 vs threshold 25 → successChance = 0.05 (floor)
    const result = resolveMission(template, 10, 0.9)
    expect(result.success).toBe(false)
    expect(result.ryo).toBe(0)
    expect(result.repGain).toBeLessThan(0)
  })

  it('repGain is positive on success', () => {
    const result = resolveMission(template, 60, 0.01)
    expect(result.repGain).toBeGreaterThan(0)
  })
})
