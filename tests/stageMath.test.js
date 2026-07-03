import { describe, it, expect } from 'vitest'
import {
  clamp, squadPower, avgStat, seedEdge, survivalMult,
  examWrittenProb, examForestNavProb, examForestClashProb, examInjuryChance, examPromotionChance,
  warMobilizeProb, warFrontProb, warCasualtyChance, duelScore,
} from '../shared/utils/stageMath.js'

describe('stageMath — primitives', () => {
  it('clamp bounds a value', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })

  it('squadPower averages member power and lifts by cohesion', () => {
    expect(squadPower([])).toBe(0)
    expect(squadPower([90, 90, 90], 0)).toBe(90)
    // avg 100, cohesion 300 → ×2
    expect(squadPower([100, 100], 300)).toBe(200)
    // rounds: avg 50, cohesion 30 → 50 * 1.1 = 55
    expect(squadPower([40, 60], 30)).toBe(55)
  })

  it('avgStat averages, with a 30 fallback for an empty squad', () => {
    expect(avgStat([])).toBe(30)
    expect(avgStat([], 12)).toBe(12)
    expect(avgStat([20, 40])).toBe(30)
    expect(avgStat([10, undefined, 20])).toBeCloseTo(10) // (10+0+20)/3
  })

  it('seedEdge gives the top seed +0.10 and the bottom +0', () => {
    expect(seedEdge(1, 5)).toBe(0.1)   // top seed
    expect(seedEdge(5, 5)).toBe(0)     // bottom seed
    expect(seedEdge(3, 5)).toBe(0.05)  // middle
    expect(seedEdge(null, 5)).toBe(0)  // unseeded
    expect(seedEdge(1, 1)).toBe(0)     // <2 villages
    expect(seedEdge(1, 5, 0.2)).toBe(0.2) // custom max
  })

  it('survivalMult favours vessels then clans', () => {
    expect(survivalMult({ isVessel: true, hasClan: true })).toBe(0.35) // vessel wins
    expect(survivalMult({ hasClan: true })).toBe(0.6)
    expect(survivalMult({})).toBe(1)
    expect(survivalMult()).toBe(1)
  })
})

describe('stageMath — exam probabilities (legacy-exact)', () => {
  it('examWrittenProb matches the inline formula', () => {
    // 0.46 + 40/200 + 0.15 + 0.1 + 0 = 0.91
    expect(examWrittenProb({ avgIntelligence: 40, formatBonus: 0.15, seedBonus: 0.1 })).toBeCloseTo(0.91)
    // clamps high
    expect(examWrittenProb({ avgIntelligence: 200 })).toBe(0.95)
    // clamps low
    expect(examWrittenProb({ avgIntelligence: 0, postureAdv: -1 })).toBe(0.1)
  })

  it('examForestNavProb blends speed+intel over 400', () => {
    // 0.46 + (80+80)/400 + 0.08 + 0 + 0 = 0.94
    expect(examForestNavProb({ avgSpeed: 80, avgIntelligence: 80, hostBonus: 0.08 })).toBeCloseTo(0.94)
    expect(examForestNavProb({ avgSpeed: 0, avgIntelligence: 0, postureAdv: -1 })).toBe(0.12)
  })

  it('examForestClashProb blends tai+nin over 400', () => {
    // 0.46 + (100+100)/400 = 0.96 → clamps to 0.95
    expect(examForestClashProb({ avgTaijutsu: 100, avgNinjutsu: 100 })).toBe(0.95)
    expect(examForestClashProb({ avgTaijutsu: 20, avgNinjutsu: 20 })).toBeCloseTo(0.56)
  })

  it('examInjuryChance shifts base by woundMod, bounded [0,0.9]', () => {
    expect(examInjuryChance(0.38, 0.12)).toBeCloseTo(0.5)
    expect(examInjuryChance(0.1, -0.2)).toBe(0)
    expect(examInjuryChance(0.85, 0.12)).toBe(0.9)
  })

  it('examPromotionChance subtracts judge bias', () => {
    // 0.55 + 0.1 + 0.1 - 0.2 + 0 = 0.55
    expect(examPromotionChance({ hostBonus: 0.1, formatBonus: 0.1, biasMod: 0.2 })).toBeCloseTo(0.55)
    expect(examPromotionChance({ biasMod: 1 })).toBe(0.05)
    expect(examPromotionChance({ hostBonus: 1 })).toBe(0.97)
  })
})

describe('stageMath — war probabilities (legacy-exact)', () => {
  it('warMobilizeProb is power-driven with seed + command', () => {
    // 0.5 + 110/220 + 0.1 + 0 = 1.1 → clamps 0.95
    expect(warMobilizeProb({ pow: 110, seedBonus: 0.1 })).toBe(0.95)
    // 0.5 + 44/220 = 0.7
    expect(warMobilizeProb({ pow: 44 })).toBeCloseTo(0.7)
    expect(warMobilizeProb({ pow: 0, cmdAdv: -1 })).toBe(0.15)
  })

  it('warFrontProb attrition over 240', () => {
    // 0.45 + 48/240 = 0.65
    expect(warFrontProb({ pow: 48 })).toBeCloseTo(0.65)
    expect(warFrontProb({ pow: 1000 })).toBe(0.9)
    expect(warFrontProb({ pow: 0, cmdAdv: -1 })).toBe(0.1)
  })

  it('warCasualtyChance scales kia by survival edge, bounded', () => {
    expect(warCasualtyChance(0.22, 1)).toBeCloseTo(0.22)
    expect(warCasualtyChance(0.22, 0.35)).toBeCloseTo(0.077)
    expect(warCasualtyChance(0, 1)).toBe(0.01)   // floor
    expect(warCasualtyChance(2, 1)).toBe(0.9)    // ceiling
  })

  it('duelScore weights command advantage x60', () => {
    expect(duelScore({ pow: 100 })).toBe(100)
    expect(duelScore({ pow: 100, jitter: 5, cmdAdv: 0.1 })).toBeCloseTo(111)
    // a 0.10 command edge is worth ~6 power
    expect(duelScore({ pow: 0, cmdAdv: 0.1 })).toBeCloseTo(6)
  })
})
