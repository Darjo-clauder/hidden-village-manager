import { describe, it, expect } from 'vitest'
import { resolveMission, qualityEffects, MISSION_PHASES } from '../shared/utils/missionEngine.js'
import { withSeed } from './helpers/rng.js'

describe('mission engine', () => {
  it('runs one phase per defined beat', () => {
    const r = resolveMission(0.7)
    expect(r.phases).toHaveLength(MISSION_PHASES.length)
  })

  it('honours a forced success outcome and reconciles the phase tally', () => {
    const r = resolveMission(0.01, Math.random, { success: true })
    expect(r.success).toBe(true)
    expect(r.phasesWon).toBeGreaterThanOrEqual(2) // majority of 3
    expect(['decisive', 'narrow']).toContain(r.quality)
  })

  it('honours a forced failure outcome', () => {
    const r = resolveMission(0.99, Math.random, { success: false })
    expect(r.success).toBe(false)
    expect(r.phasesWon).toBeLessThan(2)
    expect(['costly', 'disaster']).toContain(r.quality)
  })

  it('margin is phasesWon minus phasesLost and stays in range', () => {
    for (let i = 0; i < 50; i++) {
      const r = resolveMission(Math.random())
      expect(r.margin).toBe(r.phasesWon - (MISSION_PHASES.length - r.phasesWon))
      expect(r.margin).toBeGreaterThanOrEqual(-3)
      expect(r.margin).toBeLessThanOrEqual(3)
    }
  })

  it('decisive requires a clean sweep; disaster requires a shutout', () => {
    const dec = resolveMission(1, Math.random, { success: true })
    expect(dec.quality).toBe('decisive')
    expect(dec.phasesWon).toBe(3)
    const dis = resolveMission(0, Math.random, { success: false })
    expect(dis.quality).toBe('disaster')
    expect(dis.phasesWon).toBe(0)
  })

  it('preserves tuned balance: success rate tracks sc when not forced', () => {
    withSeed(11, () => {
      const sc = 0.65
      let wins = 0
      const N = 4000
      for (let i = 0; i < N; i++) if (resolveMission(sc, Math.random).success) wins++
      expect(wins / N).toBeGreaterThan(0.60)
      expect(wins / N).toBeLessThan(0.70)
    })
  })

  it('quality effects: decisive pays a bonus, failures pay none', () => {
    expect(qualityEffects('decisive').ryoMult).toBeGreaterThan(1)
    expect(qualityEffects('narrow').ryoMult).toBe(1)
    expect(qualityEffects('costly').ryoMult).toBe(0)
    expect(qualityEffects('disaster').morale).toBeLessThan(0)
  })
})
