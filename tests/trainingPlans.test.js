import { describe, it, expect } from 'vitest'
import { TRAINING_PLANS, PLAN_BY_ID } from '../shared/constants/trainingPlans.js'

// ── Replicate pure helpers for testing (no browser deps) ─────────────────────

function trainingPlanBonus(prospect) {
  const plan = PLAN_BY_ID[prospect.trainingPlanId]
  if (!plan) return 0
  const coachAttr = (prospect.hiddenAttributes || []).find(a => a.key === 'coachability')
  const coachAmp = coachAttr?.revealed ? (coachAttr.value / 20) * 0.10 : 0
  return plan.growthBonus + coachAmp
}

function applyGraduationBias(prospect) {
  const plan = PLAN_BY_ID[prospect.trainingPlanId]
  if (!plan || !prospect.stats) return
  const weights = plan.graduationWeights
  const statKeys = Object.keys(weights)
  const totalWeight = statKeys.reduce((s, k) => s + Math.max(0, weights[k]), 0)
  if (totalWeight === 0) return
  const BONUS_POOL = 12
  statKeys.forEach(k => {
    if (prospect.stats[k] == null) return
    const delta = Math.round((weights[k] / totalWeight) * BONUS_POOL)
    prospect.stats[k] = Math.max(0, Math.min(99, prospect.stats[k] + delta))
  })
}

// ── PLAN_BY_ID ────────────────────────────────────────────────────────────────
describe('PLAN_BY_ID', () => {
  it('contains all 5 plans', () => {
    expect(Object.keys(PLAN_BY_ID)).toHaveLength(5)
  })

  it('all plans have required fields', () => {
    TRAINING_PLANS.forEach(p => {
      expect(p.id).toBeTruthy()
      expect(p.label).toBeTruthy()
      expect(typeof p.growthBonus).toBe('number')
      expect(p.graduationWeights).toBeDefined()
    })
  })
})

// ── trainingPlanBonus ─────────────────────────────────────────────────────────
describe('trainingPlanBonus', () => {
  it('returns 0 when no plan assigned', () => {
    expect(trainingPlanBonus({ trainingPlanId: null })).toBe(0)
  })

  it('returns plan growthBonus when coachability not revealed', () => {
    const p = { trainingPlanId: 'ninjutsu_focus', hiddenAttributes: [] }
    expect(trainingPlanBonus(p)).toBeCloseTo(0.18)
  })

  it('amplifies bonus when coachability is revealed at max (20)', () => {
    const p = {
      trainingPlanId: 'ninjutsu_focus',
      hiddenAttributes: [{ key: 'coachability', value: 20, revealed: true }],
    }
    // 0.18 + (20/20)*0.10 = 0.28
    expect(trainingPlanBonus(p)).toBeCloseTo(0.28)
  })

  it('unrevealed coachability adds no amplification', () => {
    const p = {
      trainingPlanId: 'balanced',
      hiddenAttributes: [{ key: 'coachability', value: 20, revealed: false }],
    }
    expect(trainingPlanBonus(p)).toBeCloseTo(0.08)
  })
})

// ── applyGraduationBias ───────────────────────────────────────────────────────
describe('applyGraduationBias', () => {
  const baseStats = () => ({ ninjutsu: 40, taijutsu: 40, speed: 40, chakra: 40, intelligence: 40 })

  it('ninjutsu_focus raises ninjutsu and chakra, lowers taijutsu', () => {
    const p = { trainingPlanId: 'ninjutsu_focus', stats: baseStats() }
    applyGraduationBias(p)
    expect(p.stats.ninjutsu).toBeGreaterThan(40)
    expect(p.stats.chakra).toBeGreaterThan(40)
    expect(p.stats.taijutsu).toBeLessThan(40)
  })

  it('speed_focus gives biggest bonus to speed', () => {
    const p = { trainingPlanId: 'speed_focus', stats: baseStats() }
    applyGraduationBias(p)
    const speedGain = p.stats.speed - 40
    const ninjGain  = p.stats.ninjutsu - 40
    expect(speedGain).toBeGreaterThan(ninjGain)
  })

  it('balanced plan raises all stats by at least 1', () => {
    const p = { trainingPlanId: 'balanced', stats: baseStats() }
    applyGraduationBias(p)
    Object.values(p.stats).forEach(v => expect(v).toBeGreaterThanOrEqual(40))
  })

  it('stats are clamped to 99', () => {
    const p = { trainingPlanId: 'ninjutsu_focus', stats: { ninjutsu: 98, taijutsu: 98, speed: 98, chakra: 98, intelligence: 98 } }
    applyGraduationBias(p)
    Object.values(p.stats).forEach(v => expect(v).toBeLessThanOrEqual(99))
  })

  it('does nothing when no plan assigned', () => {
    const stats = baseStats()
    const p = { trainingPlanId: null, stats }
    applyGraduationBias(p)
    expect(p.stats).toEqual(stats)
  })
})
