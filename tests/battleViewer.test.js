import { describe, it, expect } from 'vitest'
import { battleMomentum, beatNarrative, battleSequence, battleVerdict } from '../shared/utils/battleViewer.js'

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
