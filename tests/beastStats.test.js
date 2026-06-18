import { describe, it, expect } from 'vitest'
import { applyBeastStats, getSyncStage, STAGE_THRESHOLDS, BEAST_DATA, captureChance, migrateBeastStats } from '../client/js/beastEngine.js'

// ── B-IDEMP-1 — Beast stat application is non-idempotent and stacks cumulatively ──
//
// statBonus[stage] arrays are ABSOLUTE per-stage totals (Sakeru speed: -5,12,20,28),
// but applyBeastStats ADDS bonus[k] to s.stats[k] (beastEngine.js:297-301), and
// tickBeast calls it once per stage transition (beastEngine.js:319-322). So as a
// jinchuriki advances through stages the bonuses accumulate instead of replacing.
//
// These tests pin the CURRENT (buggy) behavior deterministically so the defect is
// proven and a fix can be validated against it. The desired behavior is captured
// in the it.todo below and in the Fix Pack.

const mkBeast = (syncMonths) => ({ n: 'Sakeru', sealed: true, jk: 'jk1', syncMonths })
const mkJk = () => ({ id: 'jk1', fn: 'Test', ln: 'Host',
  stats: { ninjutsu: 30, taijutsu: 30, chakra: 30, speed: 40, genjutsu: 30, intelligence: 30 } })

describe('getSyncStage (I-BEAST-2)', () => {
  it('maps syncMonths to stage and respects syncCeiling', () => {
    expect(getSyncStage(mkBeast(0))).toBe(1)   // m>=0
    expect(getSyncStage(mkBeast(3))).toBe(2)   // m>=3
    expect(getSyncStage(mkBeast(6))).toBe(3)   // m>=6
    expect(getSyncStage(mkBeast(12))).toBe(4)  // m>=12
    expect(getSyncStage(mkBeast(18))).toBe(4)  // Sakeru syncCeiling=4 -> never reaches 5
  })
  it('returns 0 for unsealed / jk-less beast (I-BEAST-3)', () => {
    expect(getSyncStage({ n: 'Sakeru', sealed: false, jk: 'jk1', syncMonths: 99 })).toBe(0)
    expect(getSyncStage({ n: 'Sakeru', sealed: true, jk: null, syncMonths: 99 })).toBe(0)
  })
  it('stage never exceeds min(5, syncCeiling)', () => {
    for (const name of Object.keys(BEAST_DATA)) {
      const ceil = BEAST_DATA[name].syncCeiling ?? 5
      const stage = getSyncStage({ n: name, sealed: true, jk: 'x', syncMonths: 999 })
      expect(stage).toBeLessThanOrEqual(Math.min(5, ceil))
    }
  })
})

describe('M-CAP-1: captureChance is clamped to [0.05, 0.95]', () => {
  it('equal power gives base 0.35', () => {
    expect(captureChance(60, 60)).toBeCloseTo(0.35)
  })
  it('overwhelming power is capped at 0.95 (never a sure thing)', () => {
    expect(captureChance(200, 60)).toBe(0.95)
  })
  it('hopeless power is floored at 0.05 (never impossible)', () => {
    expect(captureChance(0, 200)).toBe(0.05)
  })
  it('scales 1% per power point inside the band', () => {
    expect(captureChance(70, 60)).toBeCloseTo(0.45) // +10 -> +0.10
  })
})

describe('MIG-1: migrateBeastStats heals pre-fix inflated saves', () => {
  // Pre-fix, a stage-4 Sakeru jinchuriki with base speed 40 was inflated to 95
  // (-5+12+20+28) and ninjutsu to 40 (stage-4 +10 only). Correct = base + statBonus[4].
  const inflatedSave = () => ({
    _beastStatsMigrated: false,
    beasts: [{ n: 'Sakeru', sealed: true, jk: 'jk1', syncMonths: 12 }], // stage 4
    shinobi: [{ id: 'jk1', stats: { ninjutsu: 40, taijutsu: 30, chakra: 30, speed: 95, genjutsu: 30, intelligence: 30 } }],
  })

  it('restores stats to base + statBonus[currentStage]', () => {
    const G = inflatedSave()
    migrateBeastStats(G)
    expect(G.shinobi[0].stats.speed).toBe(68)    // 95 - (−5+12+20 over-application) = 68
    expect(G.shinobi[0].stats.ninjutsu).toBe(40) // no prior-stage ninjutsu bonus → unchanged
    expect(G._beastStatsMigrated).toBe(true)
  })

  it('is idempotent — second run does nothing', () => {
    const G = inflatedSave()
    migrateBeastStats(G)
    const after = { ...G.shinobi[0].stats }
    migrateBeastStats(G)
    expect(G.shinobi[0].stats).toEqual(after)
  })

  it('seeds _beastBonusApplied so post-fix ticks stay correct', () => {
    const G = inflatedSave()
    migrateBeastStats(G)
    const s = G.shinobi[0]
    applyBeastStats(s, G.beasts[0]) // same stage → must be a no-op now
    expect(s.stats.speed).toBe(68)
  })

  it('skips shinobi already on post-fix accounting', () => {
    const G = inflatedSave()
    G.shinobi[0]._beastBonusApplied = { speed: 28, ninjutsu: 10 }
    migrateBeastStats(G)
    expect(G.shinobi[0].stats.speed).toBe(95) // untouched — not double-healed
  })
})

describe('B-IDEMP-1: applyBeastStats is idempotent (fixed)', () => {
  it('re-applying the same stage is a no-op', () => {
    const s = mkJk()
    const beast = mkBeast(6) // stage 3 -> absolute speed +20
    applyBeastStats(s, beast)
    expect(s.stats.speed).toBe(60) // 40 + 20
    applyBeastStats(s, beast)      // same stage again
    expect(s.stats.speed).toBe(60) // unchanged — idempotent
  })

  it('progressing through stages yields base + statBonus[N] only (no inflation)', () => {
    const s = mkJk()
    // Simulate tickBeast applying each stage's bonus once, in order.
    applyBeastStats(s, mkBeast(1))   // stage 1 (speed -5)
    applyBeastStats(s, mkBeast(3))   // stage 2 (speed +12)
    applyBeastStats(s, mkBeast(6))   // stage 3 (speed +20)
    applyBeastStats(s, mkBeast(12))  // stage 4 (speed +28, ninjutsu +10)
    expect(s.stats.speed).toBe(68)    // 40 + 28 (absolute stage-4 total), NOT 95
    expect(s.stats.ninjutsu).toBe(40) // 30 + 10
  })

  it('dropping back to stage 0 (beast lost) removes the applied bonus', () => {
    const s = mkJk()
    applyBeastStats(s, mkBeast(12))                          // stage 4 -> speed 68
    expect(s.stats.speed).toBe(68)
    applyBeastStats(s, { n: 'Sakeru', sealed: false, jk: null, syncMonths: 12 }) // stage 0
    expect(s.stats.speed).toBe(40)                           // back to base
  })
})
