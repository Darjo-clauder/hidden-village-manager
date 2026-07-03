import { describe, it, expect } from 'vitest'
import { hofScore, HOF_THRESHOLD, isHofWorthy, inductionReason, buildHofEntry } from '../shared/utils/hallOfFame.js'

describe('hofScore', () => {
  it('returns 0 for null/undefined/empty input', () => {
    expect(hofScore(null)).toBe(0)
    expect(hofScore(undefined)).toBe(0)
    expect(hofScore({})).toBe(0)
  })

  it('weights wins 1:1', () => {
    expect(hofScore({ wins: 12 })).toBe(12)
  })

  it('weights S-rank wins at x8', () => {
    expect(hofScore({ winsS: 3 })).toBe(24)
  })

  it('weights champions (tournament titles) at x15', () => {
    expect(hofScore({ champions: 2 })).toBe(30)
  })

  it('weights youth cup wins at x6', () => {
    expect(hofScore({ youthCupWins: 1 })).toBe(6)
  })

  it('adds 2 points per full year (floor(months/12)*2)', () => {
    expect(hofScore({ months: 35 })).toBe(4)  // floor(35/12)=2 -> 4
    expect(hofScore({ months: 36 })).toBe(6)  // floor(36/12)=3 -> 6
    expect(hofScore({ months: 11 })).toBe(0)  // floor(11/12)=0
  })

  it('adds a flat 20 for legend status', () => {
    expect(hofScore({ legendStatus: true })).toBe(20)
    expect(hofScore({ legendStatus: false })).toBe(0)
  })

  it('combines all components additively', () => {
    const s = { wins: 10, winsS: 2, champions: 1, youthCupWins: 1, months: 24, legendStatus: true }
    // 10 + 16 + 15 + 6 + 4 + 20 = 71
    expect(hofScore(s)).toBe(71)
  })

  it('a 50-win career with a decade of service clears the Hall of Fame threshold', () => {
    const s = { wins: 50, months: 120 } // 50 + floor(120/12)*2 = 50 + 20 = 70
    expect(hofScore(s)).toBeGreaterThanOrEqual(HOF_THRESHOLD)
  })

  it('a career built on 8 S-rank missions (64) plus a few wins clears the threshold', () => {
    const s = { winsS: 8, wins: 10 } // 64 + 10 = 74
    expect(hofScore(s)).toBeGreaterThanOrEqual(HOF_THRESHOLD)
  })

  it('a 10-win rookie with nothing else falls well short of the threshold', () => {
    const s = { wins: 10 }
    expect(hofScore(s)).toBeLessThan(HOF_THRESHOLD)
  })
})

describe('isHofWorthy', () => {
  it('is false just under the threshold', () => {
    const s = { wins: HOF_THRESHOLD - 1 }
    expect(hofScore(s)).toBe(HOF_THRESHOLD - 1)
    expect(isHofWorthy(s)).toBe(false)
  })

  it('is true right at the threshold', () => {
    const s = { wins: HOF_THRESHOLD }
    expect(hofScore(s)).toBe(HOF_THRESHOLD)
    expect(isHofWorthy(s)).toBe(true)
  })

  it('is true comfortably over the threshold', () => {
    expect(isHofWorthy({ wins: 100, legendStatus: true })).toBe(true)
  })

  it('is false for null/empty input', () => {
    expect(isHofWorthy(null)).toBe(false)
    expect(isHofWorthy({})).toBe(false)
  })
})

describe('inductionReason', () => {
  it('lists missions, S-rank, Youth Cup, titles, and years of service for a decorated shinobi', () => {
    const s = { wins: 45, winsS: 6, youthCupWins: 1, champions: 2, months: 100 } // 8 years
    const reason = inductionReason(s)
    expect(reason).toContain('45 missions')
    expect(reason).toContain('6 S-rank')
    expect(reason).toContain('Youth Cup winner')
    expect(reason).toContain('2 tournament titles')
    expect(reason).toContain('8 years of service')
  })

  it('pluralizes a single tournament title correctly', () => {
    const reason = inductionReason({ champions: 1 })
    expect(reason).toContain('1 tournament title')
    expect(reason).not.toContain('1 tournament titles')
  })

  it('omits years of service under 8 years', () => {
    const reason = inductionReason({ wins: 5, months: 90 }) // 7 years
    expect(reason).not.toContain('years of service')
  })

  it('falls back to "a distinguished career" for a bare shinobi with no achievements', () => {
    expect(inductionReason({})).toBe('a distinguished career')
    expect(inductionReason({ wins: 0, months: 3 })).toBe('a distinguished career')
  })
})

describe('buildHofEntry', () => {
  it('maps fields correctly and composes name from fn + ln', () => {
    const s = { id: 'shinobi-1', fn: 'Kestrel', ln: 'Amaru', ri: 4, clan: 'Amaru', wins: 50, winsS: 2 }
    const entry = buildHofEntry(s, 'retired', 2026)
    expect(entry.id).toBe('shinobi-1')
    expect(entry.name).toBe('Kestrel Amaru')
    expect(entry.rankIndex).toBe(4)
    expect(entry.clan).toBe('Amaru')
    expect(entry.how).toBe('retired')
    expect(entry.year).toBe(2026)
    expect(entry.wins).toBe(50)
    expect(entry.winsS).toBe(2)
    expect(entry.score).toBe(hofScore(s))
    expect(entry.reason).toBe(inductionReason(s))
  })

  it('sets how to "fallen" for a shinobi who died in service', () => {
    const s = { id: 'shinobi-2', fn: 'Doran', ln: 'Vess', wins: 90, legendStatus: true }
    const entry = buildHofEntry(s, 'fallen', 2020)
    expect(entry.how).toBe('fallen')
    expect(entry.year).toBe(2020)
  })

  it('defaults rankIndex and clan when absent', () => {
    const s = { id: 'shinobi-3', fn: 'Nym', ln: '', wins: 80 }
    const entry = buildHofEntry(s, 'retired', 2022)
    expect(entry.rankIndex).toBe(0)
    expect(entry.clan).toBeNull()
    expect(entry.name).toBe('Nym ')
  })
})
