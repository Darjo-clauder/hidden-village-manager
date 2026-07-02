import { describe, it, expect } from 'vitest'
import {
  MATCHDAY_TACTICS, TACTIC_BY_ID, tacticMod, tacticRead, TACTIC_STRONG_MOD, TACTIC_WEAK_MOD,
} from '../shared/constants/matchdayTactics.js'
import { MATCH_STYLES } from '../shared/constants/villageIdentity.js'

describe('matchday tactics — shape', () => {
  it('has 4 tactics with valid style references and unique ids', () => {
    expect(MATCHDAY_TACTICS.length).toBe(4)
    const ids = new Set(MATCHDAY_TACTICS.map(t => t.id))
    expect(ids.size).toBe(4)
    MATCHDAY_TACTICS.forEach(t => {
      ;[...t.strong, ...t.weak].forEach(s => expect(MATCH_STYLES[s], `${t.id} refs unknown style ${s}`).toBeTruthy())
      // A tactic can't be simultaneously strong and weak into the same style.
      t.strong.forEach(s => expect(t.weak).not.toContain(s))
      expect(TACTIC_BY_ID[t.id]).toBe(t)
    })
  })

  it('every non-balanced style has at least one strong answer (no dead matchup)', () => {
    Object.keys(MATCH_STYLES).filter(s => s !== 'balanced').forEach(style => {
      const answer = MATCHDAY_TACTICS.some(t => t.strong.includes(style))
      expect(answer, `no tactic is strong vs ${style}`).toBe(true)
    })
  })
})

describe('tacticMod / tacticRead', () => {
  it('returns the strong/weak/neutral mods per matchup', () => {
    expect(tacticMod('counter', 'blitz')).toBe(TACTIC_STRONG_MOD)
    expect(tacticMod('counter', 'fortress')).toBe(TACTIC_WEAK_MOD)
    expect(tacticMod('counter', 'grinder')).toBe(0)
    expect(tacticMod('overwhelm', 'fortress')).toBe(TACTIC_STRONG_MOD)
    expect(tacticMod('overwhelm', 'opportunist')).toBe(TACTIC_WEAK_MOD)
    expect(tacticMod('control', 'opportunist')).toBe(TACTIC_STRONG_MOD)
    expect(tacticMod('control', 'grinder')).toBe(TACTIC_STRONG_MOD)
    expect(tacticMod('control', 'blitz')).toBe(TACTIC_WEAK_MOD)
    expect(tacticRead('counter', 'blitz')).toBe('strong')
    expect(tacticRead('counter', 'fortress')).toBe('weak')
    expect(tacticRead('standard', 'blitz')).toBe('neutral')
  })

  it('standard and unknown inputs are inert', () => {
    Object.keys(MATCH_STYLES).forEach(s => expect(tacticMod('standard', s)).toBe(0))
    expect(tacticMod('no-such-tactic', 'blitz')).toBe(0)
    expect(tacticMod('counter', null)).toBe(0)
    expect(tacticMod(null, 'blitz')).toBe(0)
  })

  it('upside beats downside (encourages engaging with the system)', () => {
    expect(TACTIC_STRONG_MOD).toBeGreaterThan(Math.abs(TACTIC_WEAK_MOD))
  })
})
