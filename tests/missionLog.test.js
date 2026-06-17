import { describe, it, expect } from 'vitest'

// ── Pure helpers replicated from adv.js ───────────────────────────────────────

function pushMissionLog(G, entry) {
  if (!G.missionLog) G.missionLog = []
  G.missionLog.push({ id: 'test_' + G.missionLog.length, ...entry, year: G.year, month: G.month })
  if (G.missionLog.length > 30) G.missionLog.splice(0, G.missionLog.length - 30)
}

// ── Log filtering helper (matches missions.js logic) ─────────────────────────

function filterLog(log, filter) {
  return log.filter(e => {
    if (filter === 'chains') return !!e.chainName
    if (filter === 'injuries') return !!e.injuryName
    if (filter === 's-rank') return e.rank === 'S'
    return true
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Mission log push', () => {
  it('initializes missionLog if absent', () => {
    const G = { year: 1, month: 3 }
    pushMissionLog(G, { missionName: 'Test', rank: 'C', success: true, ryo: 500, rep: 1 })
    expect(G.missionLog).toHaveLength(1)
  })

  it('stores year and month from G', () => {
    const G = { year: 5, month: 7, missionLog: [] }
    pushMissionLog(G, { missionName: 'Patrol', rank: 'D', success: true, ryo: 200, rep: 1 })
    expect(G.missionLog[0].year).toBe(5)
    expect(G.missionLog[0].month).toBe(7)
  })

  it('caps log at 30 entries', () => {
    const G = { year: 1, month: 1, missionLog: [] }
    for (let i = 0; i < 35; i++) {
      pushMissionLog(G, { missionName: `M${i}`, rank: 'C', success: true, ryo: 100, rep: 1 })
    }
    expect(G.missionLog).toHaveLength(30)
    expect(G.missionLog[29].missionName).toBe('M34')
  })

  it('stores failure entries with success: false', () => {
    const G = { year: 2, month: 4, missionLog: [] }
    pushMissionLog(G, { missionName: 'Ambush', rank: 'A', success: false, ryo: 0, rep: 0 })
    expect(G.missionLog[0].success).toBe(false)
    expect(G.missionLog[0].ryo).toBe(0)
  })

  it('stores chain context when chainName is provided', () => {
    const G = { year: 1, month: 1, missionLog: [] }
    pushMissionLog(G, { missionName: 'Chain Step 1', rank: 'B', success: true, ryo: 800, rep: 3, chainName: 'The Long Road' })
    expect(G.missionLog[0].chainName).toBe('The Long Road')
  })

  it('stores injury when injuryName is provided', () => {
    const G = { year: 1, month: 1, missionLog: [] }
    pushMissionLog(G, { missionName: 'Patrol', rank: 'C', success: true, ryo: 300, rep: 1, injuryName: 'Broken Arm' })
    expect(G.missionLog[0].injuryName).toBe('Broken Arm')
  })
})

describe('Mission log filtering', () => {
  const sampleLog = [
    { rank: 'S', success: true, ryo: 8000, rep: 20, chainName: 'Dragon Hunt', missionName: 'S1' },
    { rank: 'B', success: false, ryo: 0, rep: 0, missionName: 'B1' },
    { rank: 'A', success: true, ryo: 3000, rep: 8, chainName: null, injuryName: 'Sprained Wrist', missionName: 'A1' },
    { rank: 'C', success: true, ryo: 300, rep: 1, missionName: 'C1' },
  ]

  it('filter all returns all entries', () => {
    expect(filterLog(sampleLog, 'all')).toHaveLength(4)
  })

  it('filter chains returns only chain entries', () => {
    const r = filterLog(sampleLog, 'chains')
    expect(r).toHaveLength(1)
    expect(r[0].missionName).toBe('S1')
  })

  it('filter injuries returns only injury entries', () => {
    const r = filterLog(sampleLog, 'injuries')
    expect(r).toHaveLength(1)
    expect(r[0].missionName).toBe('A1')
  })

  it('filter s-rank returns only S-rank entries', () => {
    const r = filterLog(sampleLog, 's-rank')
    expect(r).toHaveLength(1)
    expect(r[0].rank).toBe('S')
  })
})
