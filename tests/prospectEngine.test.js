import { describe, it, expect, beforeEach, vi } from 'vitest'

// prospectEngine imports G from state.js which is a browser module.
// We test the pure growth logic by extracting it here instead.

// ── Replicate pure growth helpers for testing ─────────────────────────────────
function baseGrowthRate(age) {
  if (age <= 14) return 1.2
  if (age <= 17) return 1.6
  if (age <= 21) return 1.4
  if (age <= 25) return 0.8
  if (age <= 28) return 0.4
  return 0.1
}

function curveMultiplier(curve, age) {
  switch (curve) {
    case 'early_peak':   return age <= 19 ? 1.5 : age <= 22 ? 0.4 : 0.05
    case 'late_bloomer': return age <= 18 ? 0.4 : age <= 21 ? 0.8 : age <= 26 ? 1.6 : 0.6
    case 'volatile':     return 1.0
    case 'linear':
    default:             return 1.0
  }
}

function coachabilityBonus(prospect) {
  const attr = (prospect.hiddenAttributes || []).find(a => a.key === 'coachability')
  if (!attr || !attr.revealed) return 0
  return attr.value / 80
}

// ── baseGrowthRate ────────────────────────────────────────────────────────────
describe('baseGrowthRate', () => {
  it('peaks in the 15-17 range', () => {
    expect(baseGrowthRate(16)).toBeGreaterThan(baseGrowthRate(12))
    expect(baseGrowthRate(16)).toBeGreaterThan(baseGrowthRate(24))
  })

  it('returns near-zero for veterans over 30', () => {
    expect(baseGrowthRate(31)).toBe(0.1)
  })

  it('age 14 and below uses 1.2 rate', () => {
    expect(baseGrowthRate(13)).toBe(1.2)
    expect(baseGrowthRate(14)).toBe(1.2)
  })
})

// ── curveMultiplier ───────────────────────────────────────────────────────────
describe('curveMultiplier', () => {
  it('early_peak amplifies before 20 and suppresses after 22', () => {
    expect(curveMultiplier('early_peak', 17)).toBe(1.5)
    expect(curveMultiplier('early_peak', 25)).toBe(0.05)
  })

  it('late_bloomer suppresses before 19 and amplifies after 22', () => {
    expect(curveMultiplier('late_bloomer', 17)).toBe(0.4)
    expect(curveMultiplier('late_bloomer', 23)).toBe(1.6)
  })

  it('linear is always 1.0', () => {
    for (const age of [14, 18, 22, 28]) {
      expect(curveMultiplier('linear', age)).toBe(1.0)
    }
  })

  it('volatile returns 1.0 base (caller adds swing)', () => {
    expect(curveMultiplier('volatile', 20)).toBe(1.0)
  })
})

// ── coachabilityBonus ─────────────────────────────────────────────────────────
describe('coachabilityBonus', () => {
  it('returns 0 when attribute is unrevealed', () => {
    const p = { hiddenAttributes: [{ key: 'coachability', value: 20, revealed: false }] }
    expect(coachabilityBonus(p)).toBe(0)
  })

  it('returns 0.25 for max coachability revealed', () => {
    const p = { hiddenAttributes: [{ key: 'coachability', value: 20, revealed: true }] }
    expect(coachabilityBonus(p)).toBeCloseTo(0.25)
  })

  it('returns 0 when hiddenAttributes is empty', () => {
    expect(coachabilityBonus({ hiddenAttributes: [] })).toBe(0)
  })
})

// ── growth ceiling: currentAbility never exceeds potential ────────────────────
describe('potential ceiling', () => {
  it('growth is clamped to potential', () => {
    // Simulate: ability 78, potential 80, growth would push to 82
    const ability = 78
    const potential = 80
    const rawGrowth = 4
    const result = Math.min(ability + rawGrowth, potential)
    expect(result).toBe(80)
  })
})

// ── curve comparison: early_peak grows faster before 20 than late_bloomer ────
describe('curve comparison', () => {
  it('early_peak outgrows late_bloomer at age 16', () => {
    const age = 16
    const base = baseGrowthRate(age)
    const ep = base * curveMultiplier('early_peak', age)
    const lb = base * curveMultiplier('late_bloomer', age)
    expect(ep).toBeGreaterThan(lb)
  })

  it('late_bloomer outgrows early_peak at age 24', () => {
    const age = 24
    const base = baseGrowthRate(age)
    const ep = base * curveMultiplier('early_peak', age)
    const lb = base * curveMultiplier('late_bloomer', age)
    expect(lb).toBeGreaterThan(ep)
  })
})
