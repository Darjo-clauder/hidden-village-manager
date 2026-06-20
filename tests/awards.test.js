import { describe, it, expect } from 'vitest'
import { computeAwards } from '../shared/utils/awards.js'

function makeSnap(players = [], year = 5) {
  return { year, players, standings: [] }
}

describe('computeAwards', () => {
  it('MVP goes to player with most season wins', () => {
    const snap = makeSnap([
      { id: 's1', name: 'Naruto', ri: 2, rank: 'Jonin',  wins: 30, winsThisSeason: 8, sRankWins: 2 },
      { id: 's2', name: 'Sasuke', ri: 3, rank: 'ANBU',   wins: 50, winsThisSeason: 5, sRankWins: 1 },
    ])
    const a = computeAwards({ year: 5, vName: 'Leaf', memorial: [], warVets: [] }, snap)
    expect(a.mvp?.name).toBe('Naruto')
    expect(a.mvp?.label).toBe('Season MVP')
  })

  it('no MVP when nobody has wins this season', () => {
    const snap = makeSnap([
      { id: 's1', name: 'Naruto', ri: 0, rank: 'Genin', wins: 0, winsThisSeason: 0, sRankWins: 0 },
    ])
    const a = computeAwards({ year: 5, vName: 'Leaf', memorial: [], warVets: [] }, snap)
    expect(a.mvp).toBeNull()
  })

  it('Rookie of the Year is a low-rank player with wins this season', () => {
    const snap = makeSnap([
      { id: 's1', name: 'Genin1', ri: 0, rank: 'Genin', wins: 3,  winsThisSeason: 3, sRankWins: 0 },
      { id: 's2', name: 'Vet',    ri: 4, rank: 'S-Rank', wins: 80, winsThisSeason: 6, sRankWins: 2 },
    ])
    const a = computeAwards({ year: 5, vName: 'Leaf', memorial: [], warVets: [] }, snap)
    expect(a.rookieOfYear?.name).toBe('Genin1')
    expect(a.rookieOfYear?.label).toBe('Rookie of the Year')
  })

  it('Iron Wall awarded when no KIA this year', () => {
    const snap = makeSnap([])
    const a = computeAwards({ year: 5, vName: 'Leaf', memorial: [], warVets: [] }, snap)
    expect(a.ironwall?.label).toBe('Iron Wall')
    expect(a.ironwall?.name).toBe('Leaf')
  })

  it('Iron Wall not awarded when KIA occurred', () => {
    const snap = makeSnap([])
    const a = computeAwards({ year: 5, vName: 'Leaf', memorial: [{ year: 5, name: 'Dead Guy' }], warVets: [] }, snap)
    expect(a.ironwall).toBeNull()
  })

  it('War Hero goes to war vet with most kills', () => {
    const snap = makeSnap([])
    const G = { year: 5, vName: 'Leaf', memorial: [], warVets: [
      { name: 'Kakashi', kills: 5 },
      { name: 'Guy',     kills: 2 },
    ]}
    const a = computeAwards(G, snap)
    expect(a.warHero?.name).toBe('Kakashi')
    expect(a.warHero?.label).toBe('Nation War Hero')
  })
})
