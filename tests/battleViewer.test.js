import { describe, it, expect } from 'vitest'
import { battleMomentum, beatNarrative, battleSequence, battleVerdict, spotlightRole, roleBeatFlavor } from '../shared/utils/battleViewer.js'

const PHASES = [
  { name: 'Infiltration', won: true },
  { name: 'Engagement', won: false },
  { name: 'Extraction', won: true },
]

describe('battleMomentum', () => {
  it('rises on a won beat and falls on a lost beat, one value per phase', () => {
    const m = battleMomentum(PHASES, 50, 20)
    expect(m).toHaveLength(3)
    expect(m[0]).toBe(70)        // 50 +20
    expect(m[1]).toBe(50)        // 70 -20
    expect(m[2]).toBe(70)        // 50 +20
  })

  it('clamps to a readable band (never pinned at 0/100)', () => {
    const allLost = battleMomentum([{ won: false }, { won: false }, { won: false }, { won: false }], 50, 40)
    expect(Math.min(...allLost)).toBeGreaterThanOrEqual(8)
    const allWon = battleMomentum([{ won: true }, { won: true }, { won: true }, { won: true }], 50, 40)
    expect(Math.max(...allWon)).toBeLessThanOrEqual(92)
  })

  it('handles empty input', () => {
    expect(battleMomentum([])).toEqual([])
  })
})

describe('beatNarrative', () => {
  it('returns a non-empty, outcome-appropriate line and is deterministic', () => {
    const a = beatNarrative('Infiltration', true, 0)
    const b = beatNarrative('Infiltration', true, 0)
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(0)
    // won and lost banks differ
    expect(beatNarrative('Engagement', true, 1)).not.toBe(beatNarrative('Engagement', false, 1))
  })

  it('falls back gracefully for an unknown phase', () => {
    expect(typeof beatNarrative('Mystery', true, 0)).toBe('string')
  })

  it('covers tournament + exam stage names with distinct won/lost lines', () => {
    for (const stage of ['Mobilization', 'The Front', 'Decisive Engagement', 'Final Stand', 'Qualifier', 'Quarterfinal', 'Semifinal', 'Final']) {
      expect(beatNarrative(stage, true, 0).length).toBeGreaterThan(0)
      expect(beatNarrative(stage, true, 0)).not.toBe(beatNarrative(stage, false, 0))
    }
  })
})

describe('battleSequence', () => {
  it('combines name/won/momentum/line per beat in order', () => {
    const seq = battleSequence(PHASES, 3)
    expect(seq).toHaveLength(3)
    expect(seq[0]).toMatchObject({ name: 'Infiltration', won: true })
    expect(typeof seq[0].momentum).toBe('number')
    expect(typeof seq[0].line).toBe('string')
  })
})

describe('spotlightRole', () => {
  it('prefers the phase-natural role when the squad fields it', () => {
    expect(spotlightRole(['vanguard', 'intel', 'medical'], 'Infiltration')).toBe('intel')
    expect(spotlightRole(['vanguard', 'intel', 'medical'], 'Engagement')).toBe('vanguard')
    expect(spotlightRole(['vanguard', 'support', 'medical'], 'Extraction')).toBe('medical')
  })
  it('rotates through present roles when the preferred one is absent, deterministically', () => {
    const roles = ['vanguard', 'support']
    // Engagement prefers vanguard (present) → vanguard; Infiltration prefers intel (absent) → rotate
    expect(spotlightRole(roles, 'Infiltration', 0)).toBe('vanguard')
    expect(spotlightRole(roles, 'Infiltration', 1)).toBe('support')
    expect(spotlightRole(roles, 'Infiltration', 1)).toBe('support') // deterministic
  })
  it('returns null for an empty squad', () => {
    expect(spotlightRole([], 'Engagement')).toBeNull()
    expect(spotlightRole(undefined, 'Engagement')).toBeNull()
  })
})

describe('roleBeatFlavor', () => {
  it('gives a nameable verb phrase differing by outcome, deterministic per seed', () => {
    const won = roleBeatFlavor('vanguard', true, 0)
    expect(won).toBe(roleBeatFlavor('vanguard', true, 0))
    expect(won.length).toBeGreaterThan(0)
    expect(roleBeatFlavor('vanguard', true, 0)).not.toBe(roleBeatFlavor('vanguard', false, 0))
  })
  it('falls back to flex phrasing for an unknown role', () => {
    expect(typeof roleBeatFlavor('ninja-cook', true, 0)).toBe('string')
    expect(roleBeatFlavor('ninja-cook', true, 0)).toBe(roleBeatFlavor('flex', true, 0))
  })
})

describe('battleVerdict', () => {
  it('maps each quality band to a verdict', () => {
    expect(battleVerdict('decisive', true)).toMatch(/decisive/i)
    expect(battleVerdict('disaster', false)).toMatch(/disaster/i)
  })
  it('falls back on success/fail when quality is unknown', () => {
    expect(battleVerdict(undefined, true)).toMatch(/accomplished/i)
    expect(battleVerdict(undefined, false)).toMatch(/failed/i)
  })
})
