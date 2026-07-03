import { describe, it, expect } from 'vitest'
import { resolveBattleCall, callBeatIndex, BATTLE_CALLS } from '../shared/utils/battleCalls.js'

describe('battleCalls — callBeatIndex', () => {
  it('bets on the final beat when there are >=2 phases', () => {
    expect(callBeatIndex([{}, {}, {}])).toBe(2)
    expect(callBeatIndex([{}, {}])).toBe(1)
  })
  it('declines when the report is too short or missing', () => {
    expect(callBeatIndex([{}])).toBe(-1)
    expect(callBeatIndex([])).toBe(-1)
    expect(callBeatIndex(null)).toBe(-1)
  })
})

describe('battleCalls — resolveBattleCall', () => {
  it('commit + won pivotal = clutch upgrade with reward on a success', () => {
    const r = resolveBattleCall({ call: 'commit', pivotalWon: true, succeeded: true, baseQuality: 'narrow' })
    expect(r.kind).toBe('clutch')
    expect(r.quality).toBe('decisive')       // narrow -> decisive
    expect(r.ryoMult).toBeGreaterThan(0)
    expect(r.legendDelta).toBeGreaterThan(0)
    expect(r.moraleDelta).toBeGreaterThan(0)
  })

  it('commit + lost pivotal = overcommit downgrade with penalty', () => {
    const r = resolveBattleCall({ call: 'commit', pivotalWon: false, succeeded: true, baseQuality: 'decisive' })
    expect(r.kind).toBe('overcommit')
    expect(r.quality).toBe('narrow')          // decisive -> narrow
    expect(r.ryoMult).toBeLessThan(0)
    expect(r.moraleDelta).toBeLessThan(0)
  })

  it('never crosses the success/failure line', () => {
    // A failed mission stays a failure band whether upgraded or downgraded.
    const up = resolveBattleCall({ call: 'commit', pivotalWon: true, succeeded: false, baseQuality: 'disaster' })
    expect(up.quality).toBe('costly')         // disaster -> costly (still a failure)
    const down = resolveBattleCall({ call: 'commit', pivotalWon: false, succeeded: false, baseQuality: 'costly' })
    expect(down.quality).toBe('disaster')     // costly -> disaster (still a failure)
    // Top/bottom bands clamp.
    expect(resolveBattleCall({ call: 'commit', pivotalWon: true, succeeded: true, baseQuality: 'decisive' }).quality).toBe('decisive')
    expect(resolveBattleCall({ call: 'commit', pivotalWon: false, succeeded: false, baseQuality: 'disaster' }).quality).toBe('disaster')
  })

  it('disengage and timeout lock in the base quality with no deltas', () => {
    for (const call of ['disengage', 'none', undefined]) {
      const r = resolveBattleCall({ call, pivotalWon: true, succeeded: true, baseQuality: 'narrow' })
      expect(r.kind).toBe('safe')
      expect(r.quality).toBe('narrow')
      expect(r.ryoMult).toBe(0)
      expect(r.legendDelta).toBe(0)
      expect(r.moraleDelta).toBe(0)
    }
  })

  it('falls back to a sensible base quality when none is given', () => {
    expect(resolveBattleCall({ call: 'disengage', pivotalWon: true, succeeded: true }).quality).toBe('narrow')
    expect(resolveBattleCall({ call: 'disengage', pivotalWon: false, succeeded: false }).quality).toBe('costly')
  })

  it('exposes exactly two calls (commit + disengage)', () => {
    expect(BATTLE_CALLS.map(c => c.id)).toEqual(['commit', 'disengage'])
  })
})
