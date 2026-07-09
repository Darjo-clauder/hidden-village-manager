import { describe, it, expect } from 'vitest'
import {
  staminaStart, MATCH_TACTICS, TACTIC_BY_ID, ROLE_DRAIN,
  unitCompRead, beatDrain, staminaBand, finishEffects,
  simulateFinalStamina, DEFAULT_MATCH_PREFS, resolveMatchPrefs, playerOfMatch, scrollOutcome,
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

describe('matchSim — auto-resolve simulation', () => {
  it('simulateFinalStamina matches beat-by-beat drain for a whole sequence', () => {
    const starts = [80], roles = ['flex'], beatsWon = [true, false, true]
    // reproduce the loop by hand
    let s = 80
    for (const won of beatsWon) s = Math.max(0, Math.min(100, s - beatDrain({ role: 'flex', tactic: 'balanced', won, stamina: s })))
    expect(simulateFinalStamina({ starts, roles, beatsWon })).toEqual([s])
  })

  it('a medic comp regens on won beats; conserve tactic finishes fresher than press', () => {
    const base = { starts: [80], roles: ['medical'], beatsWon: [true, true] }
    const withRegen = simulateFinalStamina({ ...base, comp: { drainMult: 1, regenPerWin: 4 } })[0]
    const noRegen = simulateFinalStamina({ ...base, comp: { drainMult: 1, regenPerWin: 0 } })[0]
    expect(withRegen).toBeGreaterThan(noRegen)
    const press = simulateFinalStamina({ starts: [80], roles: ['flex'], beatsWon: [true, true], tactic: 'press' })[0]
    const conserve = simulateFinalStamina({ starts: [80], roles: ['flex'], beatsWon: [true, true], tactic: 'conserve' })[0]
    expect(conserve).toBeGreaterThan(press)
  })
})

describe('matchSim — match preferences', () => {
  it('resolveMatchPrefs normalises partial / bad input to safe values', () => {
    expect(resolveMatchPrefs()).toEqual(DEFAULT_MATCH_PREFS)
    expect(resolveMatchPrefs({ autoResolve: 1, tactic: 'press', battleCall: 'disengage' }))
      .toEqual({ autoResolve: true, tactic: 'press', battleCall: 'disengage' })
    // unknown tactic/call fall back
    expect(resolveMatchPrefs({ tactic: 'yolo', battleCall: 'nope' }))
      .toEqual({ autoResolve: false, tactic: 'balanced', battleCall: 'commit' })
  })
})

describe('matchSim — player of the match', () => {
  it('picks the top grade, tie-broken by stamina discipline', () => {
    const scores = [
      { name: 'Aoi', grade: 'B', role: 'vanguard' },
      { name: 'Ren', grade: 'A', role: 'support' },
      { name: 'Sora', grade: 'A', role: 'intel' },
    ]
    // two A's — Sora kept more in the tank
    const motm = playerOfMatch(scores, { Ren: 30, Sora: 70 })
    expect(motm.name).toBe('Sora')
    expect(motm.reason).toMatch(/legs at the end/)
  })
  it('returns null for an empty or ungraded squad', () => {
    expect(playerOfMatch([])).toBeNull()
    expect(playerOfMatch([{ name: 'X' }])).toBeNull()
  })
})

describe('matchSim — capture the scroll', () => {
  it('held only when more exchanges won than lost, scaled by rank', () => {
    expect(scrollOutcome({ beatsWon: 2, beatsLost: 1, rank: 'B' }).held).toBe(true)
    expect(scrollOutcome({ beatsWon: 2, beatsLost: 1, rank: 'B' }).ryo).toBe(1200)
    // A-rank bounty exceeds B-rank
    expect(scrollOutcome({ beatsWon: 3, beatsLost: 0, rank: 'A' }).ryo).toBeGreaterThan(scrollOutcome({ beatsWon: 3, beatsLost: 0, rank: 'B' }).ryo)
    // held grants a small legend + morale
    const held = scrollOutcome({ beatsWon: 3, beatsLost: 0, rank: 'S' })
    expect(held.legend).toBe(1); expect(held.morale).toBe(1)
  })
  it('not held on a tie or a loss — no bounty', () => {
    expect(scrollOutcome({ beatsWon: 1, beatsLost: 1 }).held).toBe(false)
    expect(scrollOutcome({ beatsWon: 0, beatsLost: 3 }).ryo).toBe(0)
    expect(scrollOutcome().held).toBe(false)
  })
})
