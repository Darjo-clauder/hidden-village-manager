import { describe, it, expect } from 'vitest'
import { resolveBattleCall, callBeatIndex, BATTLE_CALLS, isSalvageable, SALVAGE_MARGIN } from '../shared/utils/battleCalls.js'

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

// ── Salvage: the call may now change the result, in one direction only ──────
describe('salvaging a close defeat', () => {
  const call = (over = {}) => resolveBattleCall({
    call: 'commit', pivotalWon: true, succeeded: false, baseQuality: 'costly', margin: -1, ...over,
  })

  it('turns a one-beat defeat into a win when reserves win the final beat', () => {
    const r = call()
    expect(r.flipped).toBe(true)
    expect(r.succeeded).toBe(true)
    expect(r.kind).toBe('salvage')
    expect(r.quality).toBe('narrow')
  })

  it('NEVER reverses a win — that would retroactively kill someone', () => {
    for (const margin of [-3, -1, 0, 1, 3]) {
      for (const pivotalWon of [true, false]) {
        for (const c of ['commit', 'disengage', 'none']) {
          const r = resolveBattleCall({ call: c, pivotalWon, succeeded: true, baseQuality: 'narrow', margin })
          expect(r.succeeded, `${c}/${margin}/${pivotalWon}`).toBe(true)
          expect(r.flipped, `${c}/${margin}/${pivotalWon}`).toBe(false)
        }
      }
    }
  })

  it('does not salvage a heavy defeat', () => {
    expect(call({ margin: -3 }).flipped).toBe(false)
    expect(call({ margin: -2 }).flipped).toBe(false)
  })

  it('does not salvage when the final beat is lost — committing is a gamble', () => {
    const r = call({ pivotalWon: false })
    expect(r.flipped).toBe(false)
    expect(r.succeeded).toBe(false)
    expect(r.kind).toBe('overcommit')
    expect(r.ryoMult).toBeLessThan(0)
  })

  it('does not salvage on disengage — safety forfeits the comeback', () => {
    for (const c of ['disengage', 'none', undefined]) {
      const r = call({ call: c })
      expect(r.flipped, String(c)).toBe(false)
      expect(r.succeeded, String(c)).toBe(false)
    }
  })

  it('pays in legend and morale rather than a payout multiplier', () => {
    // The caller grants the base mission value on a flip; ryoMult must not
    // also fire or the reward is counted twice.
    const r = call()
    expect(r.ryoMult).toBe(0)
    expect(r.legendDelta).toBeGreaterThan(0)
    expect(r.moraleDelta).toBeGreaterThan(0)
  })

  it('isSalvageable agrees with the resolver', () => {
    expect(isSalvageable(false, -1)).toBe(true)
    expect(isSalvageable(false, -2)).toBe(false)
    expect(isSalvageable(true, -1)).toBe(false)
    // An omitted margin must NOT salvage — the default is not a licence to flip.
    expect(isSalvageable(false, undefined)).toBe(false)
    expect(isSalvageable(false, 0)).toBe(false)
  })
})
