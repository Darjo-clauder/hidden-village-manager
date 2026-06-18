import { describe, it, expect } from 'vitest'
import { rankStandings } from '../shared/utils/rivalSim.js'

describe('rankStandings (#9 league table)', () => {
  const villages = [
    { n: 'Tide', strength: 120, rel: 40 },
    { n: 'Stone', strength: 60, rel: 70 },
    { n: 'Ember', strength: 150, rel: 20 },
  ]

  it('ranks player + rivals by strength descending', () => {
    const rows = rankStandings(100, 'Konoha', villages)
    expect(rows.map(r => r.name)).toEqual(['Ember', 'Tide', 'Konoha', 'Stone'])
    expect(rows.map(r => r.rank)).toEqual([1, 2, 3, 4])
  })

  it('flags the player row', () => {
    const rows = rankStandings(999, 'Konoha', villages)
    const player = rows.find(r => r.isPlayer)
    expect(player.rank).toBe(1)
    expect(player.name).toBe('Konoha')
  })

  it('handles no rivals (player alone is rank 1)', () => {
    expect(rankStandings(50, 'Solo', [])).toEqual([{ rank: 1, name: 'Solo', strength: 50, rel: null, isPlayer: true }])
  })

  it('rounds strengths', () => {
    expect(rankStandings(50.7, 'P', [{ n: 'X', strength: 49.2 }])[0].strength).toBe(51)
  })
})
