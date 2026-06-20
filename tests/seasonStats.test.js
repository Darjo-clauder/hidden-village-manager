import { describe, it, expect } from 'vitest'
import { snapshotSeasonStats, leagueLeaders } from '../shared/utils/seasonStats.js'

function makeG(overrides = {}) {
  return {
    year: 5,
    prestigeTier: 'B',
    vName: 'LeafVillage',
    shinobi: [
      { id: 's1', n: 'Naruto', ri: 2, wins: 30, _seasonWins: 8, _seasonMissions: 10, _seasonSRankWins: 2, clan: '' },
      { id: 's2', n: 'Sasuke', ri: 3, wins: 50, _seasonWins: 5, _seasonMissions: 6,  _seasonSRankWins: 1, clan: '' },
      { id: 's3', n: 'Genin1', ri: 0, wins: 2,  _seasonWins: 2, _seasonMissions: 3,  _seasonSRankWins: 0, clan: '' },
    ],
    memorial: [],
    season: {
      table: {
        LeafVillage: { name: 'LeafVillage', pts: 12, w: 4, l: 0 },
        RivalA:      { name: 'RivalA',      pts: 9,  w: 3, l: 1 },
        RivalB:      { name: 'RivalB',      pts: 6,  w: 2, l: 2 },
      },
    },
    dynastyRecords: { examWins: 2, warWins: 1 },
    ...overrides,
  }
}

describe('snapshotSeasonStats', () => {
  it('returns correct year and prestige', () => {
    const snap = snapshotSeasonStats(makeG())
    expect(snap.year).toBe(5)
    expect(snap.prestige).toBe('B')
  })

  it('maps shinobi fields correctly', () => {
    const snap = snapshotSeasonStats(makeG())
    const naruto = snap.players.find(p => p.name === 'Naruto')
    expect(naruto.winsThisSeason).toBe(8)
    expect(naruto.missionsThisSeason).toBe(10)
    expect(naruto.sRankWins).toBe(2)
  })

  it('derives player standing from standings', () => {
    const snap = snapshotSeasonStats(makeG())
    expect(snap.playerStanding).toBe(1)  // LeafVillage has most pts
  })

  it('standings sorted descending by pts', () => {
    const snap = snapshotSeasonStats(makeG())
    expect(snap.standings[0].pts).toBeGreaterThanOrEqual(snap.standings[1].pts)
  })
})

describe('leagueLeaders', () => {
  it('topWins returns player with most season wins first', () => {
    const snap = snapshotSeasonStats(makeG())
    const ll = leagueLeaders(snap)
    expect(ll.topWins[0].name).toBe('Naruto')
    expect(ll.topWins[0].winsThisSeason).toBe(8)
  })

  it('topMissions returns player with most missions first', () => {
    const snap = snapshotSeasonStats(makeG())
    const ll = leagueLeaders(snap)
    expect(ll.topMissions[0].name).toBe('Naruto')
  })

  it('topCareer returns highest career wins first', () => {
    const snap = snapshotSeasonStats(makeG())
    const ll = leagueLeaders(snap)
    expect(ll.topCareer[0].name).toBe('Sasuke')
    expect(ll.topCareer[0].wins).toBe(50)
  })
})
