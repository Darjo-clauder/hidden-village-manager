import { describe, it, expect } from 'vitest'
import {
  staminaStart, MATCH_TACTICS, TACTIC_BY_ID, ROLE_DRAIN,
  unitCompRead, beatDrain, staminaBand, finishEffects,
} from '../shared/utils/matchSim.js'

describe('matchSim — starting condition', () => {
  it('chakra lifts the tank, carried fatigue drains it', () => {
    // 62 + 40*0.55 - 0*0.4 = 84
    expect(staminaStart({ chakra: 40, workload: 0 })).toBe(84)
    // same shinobi carrying 60 fatigue: 84 - 24 = 60
    expect(staminaStart({ chakra: 40, workload: 60 })).toBe(60)
    // floors at 25, caps at 100
    expect(staminaStart({ chakra: 0, workload: 100 })).toBe(25)
    expect(staminaStart({ chakra: 99, workload: 0 })).toBe(100)
    expect(staminaStart()).toBe(Math.round(62 + 30 * 0.55))
  })
})

describe('matchSim — tactics + role drain', () => {
  it('exposes the three touchline tactics', () => {
    expect(MATCH_TACTICS.map(t => t.id)).toEqual(['press', 'balanced', 'conserve'])
    expect(TACTIC_BY_ID.press.drain).toBeGreaterThan(TACTIC_BY_ID.balanced.drain)
    expect(TACTIC_BY_ID.conserve.drain).toBeLessThan(TACTIC_BY_ID.balanced.drain)
  })

  it('beatDrain scales by role, tactic, result and tired legs', () => {
    // balanced flex won beat = base 13
    expect(beatDrain({})).toBe(13)
    // vanguard pressing a lost beat: 13*1.25*1.35*1.3 ≈ 29
    expect(beatDrain({ role: 'vanguard', tactic: 'press', won: false })).toBe(29)
    // conserve medic won beat: 13*0.78*0.68 ≈ 7
    expect(beatDrain({ role: 'medical', tactic: 'conserve' })).toBe(7)
    // running on empty compounds (+25%)
    expect(beatDrain({ stamina: 20 })).toBe(Math.round(13 * 1.25))
    // comp multiplier applies
    expect(beatDrain({ compDrainMult: 0.9 })).toBe(Math.round(13 * 0.9))
  })

  it('vanguards burn hottest, medics slowest', () => {
    expect(ROLE_DRAIN.vanguard).toBeGreaterThan(ROLE_DRAIN.flex)
    expect(ROLE_DRAIN.medical).toBeLessThan(ROLE_DRAIN.intel)
  })
})

describe('matchSim — unit composition', () => {
  it('a balanced trio starts fresher', () => {
    const r = unitCompRead(['vanguard', 'support', 'medical'])
    expect(r.startBonus).toBe(8)
    expect(r.tags.some(t => t.id === 'balanced')).toBe(true)
  })

  it('medic regenerates, support eases drain, double vanguard burns hotter', () => {
    expect(unitCompRead(['medical', 'flex', 'flex']).regenPerWin).toBe(4)
    expect(unitCompRead(['support', 'flex', 'flex']).drainMult).toBeCloseTo(0.9)
    const allOut = unitCompRead(['vanguard', 'vanguard', 'flex'])
    expect(allOut.drainMult).toBeCloseTo(1.15)
    expect(allOut.tags.some(t => t.id === 'all-out' && !t.good)).toBe(true)
  })

  it('support + double vanguard stack multiplicatively; unknown roles read as flex', () => {
    expect(unitCompRead(['support', 'vanguard', 'vanguard']).drainMult).toBeCloseTo(0.9 * 1.15)
    expect(unitCompRead(['??', undefined]).counts.flex).toBe(2)
    expect(unitCompRead([]).tags).toEqual([])
  })
})

describe('matchSim — condition bands + finish effects', () => {
  it('bands cover the range', () => {
    expect(staminaBand(80).id).toBe('fresh')
    expect(staminaBand(40).id).toBe('working')
    expect(staminaBand(20).id).toBe('flagging')
    expect(staminaBand(5).id).toBe('spent')
  })

  it('finishEffects rewards pacing and punishes the redline', () => {
    const fresh = finishEffects(70)
    expect(fresh.workloadDelta).toBeLessThan(0)
    expect(fresh.moraleDelta).toBeGreaterThan(0)
    expect(finishEffects(40).workloadDelta).toBe(0)
    const ragged = finishEffects(10)
    expect(ragged.workloadDelta).toBeGreaterThan(0)
    expect(ragged.moraleDelta).toBeLessThanOrEqual(0)
  })
})
