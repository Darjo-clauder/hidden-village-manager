import { describe, it, expect } from 'vitest'
import {
  ACHIEVEMENTS, ACHIEVEMENT_BY_ID, TIER_ORDER,
  checkAchievements, achievementProgress, fallenCount,
} from '../shared/constants/achievements.js'

const empty = { G: {}, legacy: {} }

describe('achievement definitions', () => {
  it('has a healthy number of them', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(28)
  })

  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every entry a name, description, icon and valid tier', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.name, a.id).toBeTruthy()
      expect(a.desc, a.id).toBeTruthy()
      expect(a.icon, a.id).toBeTruthy()
      expect(TIER_ORDER, a.id).toContain(a.tier)
      expect(typeof a.check, a.id).toBe('function')
    }
  })

  it('indexes by id', () => {
    expect(ACHIEVEMENT_BY_ID.first_year.name).toBe('First Winter')
  })
})

describe('checks are safe on empty / malformed state', () => {
  it('unlocks nothing for a blank state', () => {
    expect(checkAchievements(empty, [])).toEqual([])
  })

  it('never throws, whatever it is handed', () => {
    for (const a of ACHIEVEMENTS) {
      expect(() => a.check(empty), a.id).not.toThrow()
      expect(() => a.check({ G: null, legacy: null }), a.id).not.toThrow()
    }
  })

  it('survives a check that throws, without losing the rest of the sweep', () => {
    const exploding = { id: 'boom', check: () => { throw new Error('nope') } }
    ACHIEVEMENTS.push(exploding)
    try {
      const won = checkAchievements({ G: { year: 5 }, legacy: {} }, [])
      expect(won).toContain('first_year')
      expect(won).not.toContain('boom')
    } finally { ACHIEVEMENTS.pop() }
  })
})

describe('representative unlocks', () => {
  const cases = [
    ['first_year',     { G: { year: 2 } }],
    ['decade',         { G: { year: 10 } }],
    ['full_dynasty',   { G: {}, legacy: { dynastiesCompleted: 1 } }],
    ['grade_s',        { G: {}, legacy: { bestGrade: 'S' } }],
    ['dismissed',      { G: {}, legacy: { tenures: [{ endedBy: 'dismissed' }] } }],
    ['lineage_storied',{ G: {}, legacy: { points: 450 } }],
    ['first_exam',     { G: { dynastyRecords: { examWins: 1 } } }],
    ['war_victor',     { G: { warState: { warHistory: [{ won: true }] } } }],
    ['first_legend',   { G: { hallOfLegends: [{}] } }],
    ['legend_rank',    { G: { shinobi: [{ ri: 4 }, { ri: 4 }, { ri: 4 }] } }],
    ['first_primal',   { G: { beasts: [{ sealed: true }] } }],
    ['millionaire',    { G: { ryo: 1_000_000 } }],
    ['from_the_brink', { G: { _everBroke: true, ryo: 100_000 } }],
    ['monument',       { G: { prestigeCompleted: ['sky_spire'] } }],
    ['prestige_s',     { G: { prestigeTier: 'S' } }],
    ['first_ally',     { G: { villages: [{ allied: true }] } }],
    ['beloved',        { G: { populace: { support: 95 } } }],
    ['first_fallen',   { G: { memorial: [{ name: 'A' }] } }],
    ['no_losses_year', { G: { _cleanYears: 1 } }],
  ]

  for (const [id, state] of cases) {
    it(`unlocks ${id}`, () => {
      expect(checkAchievements({ legacy: {}, ...state }, [])).toContain(id)
    })
  }
})

describe('checks that must NOT fire early', () => {
  it('does not award recovery without having been broke', () => {
    expect(checkAchievements({ G: { ryo: 500_000 }, legacy: {} }, [])).not.toContain('from_the_brink')
  })

  it('does not award a clean year before one completes', () => {
    expect(checkAchievements({ G: { year: 5 }, legacy: {} }, [])).not.toContain('no_losses_year')
  })

  it('counts only KIA on the memorial, not departures', () => {
    expect(fallenCount({ memorial: [{ transfer: true }, { transfer: true }] })).toBe(0)
    expect(fallenCount({ memorial: [{ transfer: true }, {}] })).toBe(1)
    const state = { G: { memorial: [{ transfer: true }] }, legacy: {} }
    expect(checkAchievements(state, [])).not.toContain('first_fallen')
  })
})

describe('already-unlocked handling', () => {
  it('does not re-report an unlock', () => {
    const state = { G: { year: 12 }, legacy: {} }
    const first = checkAchievements(state, [])
    expect(first).toContain('first_year')
    const second = checkAchievements(state, first)
    expect(second).toEqual([])
  })
})

describe('achievementProgress', () => {
  it('reports zero for a fresh player', () => {
    const p = achievementProgress([])
    expect(p.unlocked).toBe(0)
    expect(p.total).toBe(ACHIEVEMENTS.length)
  })

  it('totals per tier and sums to the whole set', () => {
    const p = achievementProgress([])
    const sum = TIER_ORDER.reduce((a, t) => a + p.byTier[t].total, 0)
    expect(sum).toBe(ACHIEVEMENTS.length)
  })

  it('counts unlocks', () => {
    const p = achievementProgress(['first_year', 'decade'])
    expect(p.unlocked).toBe(2)
  })
})
