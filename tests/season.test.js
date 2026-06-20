import { describe, it, expect } from 'vitest'
import {
  initSeasonTable, roundPairings, simMatch, recordMatch,
  sortedTable, seedsFromTable, playMatchday, SEASON_PTS,
} from '../shared/utils/season.js'
import { withSeed } from './helpers/rng.js'

const NAMES = ['You', 'Kazegakure', 'Shimogakure', 'Gangakure', 'Raikurokure']

describe('season table', () => {
  it('initialises a zeroed row per village', () => {
    const t = initSeasonTable(NAMES)
    expect(Object.keys(t)).toHaveLength(5)
    expect(t.You).toEqual({ name: 'You', w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, played: 0 })
  })

  it('round-robin: every village faces each other exactly once over a full cycle', () => {
    const seen = new Set()
    // 5 villages pad to 6 with a BYE → a full cycle is 5 rounds.
    for (let r = 0; r < NAMES.length; r++) {
      roundPairings(NAMES, r).forEach(([a, b]) => seen.add([a, b].sort().join('|')))
    }
    // 5 villages → C(5,2) = 10 unique matchups
    expect(seen.size).toBe(10)
  })

  it('odd field gives exactly one village a bye each round (no self-pairing)', () => {
    roundPairings(NAMES, 0).forEach(([a, b]) => expect(a).not.toBe(b))
    // 5 villages → 2 matches per round (one sits out)
    expect(roundPairings(NAMES, 0)).toHaveLength(2)
  })

  it('recordMatch awards win/draw/loss points correctly', () => {
    const t = initSeasonTable(['A', 'B'])
    recordMatch(t, 'A', 'B', { winner: 'a', sa: 60, sb: 40 })
    expect(t.A.w).toBe(1); expect(t.A.pts).toBe(SEASON_PTS.win)
    expect(t.B.l).toBe(1); expect(t.B.pts).toBe(0)
    expect(t.A.gf).toBe(20); expect(t.B.ga).toBe(20)
    recordMatch(t, 'A', 'B', { winner: 'draw', sa: 50, sb: 50 })
    expect(t.A.d).toBe(1); expect(t.A.pts).toBe(SEASON_PTS.win + SEASON_PTS.draw)
    expect(t.A.played).toBe(2)
  })

  it('sortedTable orders by points then win-diff', () => {
    const t = initSeasonTable(['A', 'B', 'C'])
    t.A.pts = 6; t.A.w = 2; t.A.l = 0   // win-diff +2
    t.B.pts = 6; t.B.w = 2; t.B.l = 2   // win-diff 0
    t.C.pts = 3; t.C.w = 1
    const order = sortedTable(t).map(r => r.name)
    expect(order).toEqual(['A', 'B', 'C']) // equal pts → A has better win-diff
  })

  it('seedsFromTable assigns 1 to the leader', () => {
    const t = initSeasonTable(['A', 'B'])
    t.A.pts = 9; t.B.pts = 3
    const seeds = seedsFromTable(t)
    expect(seeds.A).toBe(1); expect(seeds.B).toBe(2)
  })

  it('simMatch is deterministic under a seeded rng and favours the stronger side', () => {
    withSeed(7, () => {
      let strongWins = 0
      for (let i = 0; i < 200; i++) {
        const r = simMatch(90, 40, Math.random)
        if (r.winner === 'a') strongWins++
      }
      expect(strongWins).toBeGreaterThan(150) // strong side wins the clear majority
    })
  })

  it('playMatchday folds a full round into the table and advances the round', () => {
    const season = { year: 1, round: 0, table: initSeasonTable(NAMES), lastResults: [] }
    const strOf = n => ({ You: 70, Kazegakure: 60, Shimogakure: 85, Gangakure: 80, Raikurokure: 75 }[n] || 50)
    withSeed(3, () => playMatchday(season, NAMES, strOf, Math.random))
    expect(season.round).toBe(1)
    const totalPlayed = Object.values(season.table).reduce((a, r) => a + r.played, 0)
    expect(totalPlayed).toBe(4) // 2 matches → 4 participations
    // total points distributed = 3 per decisive match, 2 per draw
    const totalPts = Object.values(season.table).reduce((a, r) => a + r.pts, 0)
    expect([4, 5, 6]).toContain(totalPts)
  })
})
