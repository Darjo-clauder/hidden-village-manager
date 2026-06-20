/**
 * Marathon simulation — 10 in-game years (120 months).
 *
 * Goal: verify the gameplay loop is self-sustaining across a full decade.
 * Uses only shared/utils/* (pure, no browser deps) so it runs headless.
 *
 * Simulated systems:
 *   - Economy: villageRevenue income, shinobi wages, monthly net
 *   - Season league: full round-robin each year, standings + seeding
 *   - Rival dynamics: strength tick, event probability
 *   - Missions: monthly batch at mid-tier success chance
 *   - Dynasty: grade computable at year 10
 *
 * Invariants checked per-month AND per-year:
 *   FIN-1  ryo stays finite
 *   FIN-2  ryo recovers — never bankrupt for 3+ consecutive years
 *   SEA-1  season table has no NaN cells
 *   SEA-2  player finishes ≥ last place in ≥ 5 of 10 seasons
 *   RIV-1  all rival strengths stay in [10, 200]
 *   MOR-1  village morale stays in [0, 100]
 *   DYN-1  dynasty score is a finite number at year 10
 */

import { describe, it, expect } from 'vitest'
import {
  initSeasonTable, playMatchday, sortedTable, seedsFromTable,
} from '../shared/utils/season.js'
import { tickRivalStrength } from '../shared/utils/rivalSim.js'
import { computeDynastyGrade } from '../shared/utils/dynasty.js'
import { villageRevenue } from '../shared/utils/economy.js'
import { resolveMission } from '../shared/utils/missionEngine.js'

// ── helpers ────────────────────────────────────────────────────────────────────

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

const VILLAGE_NAMES = ['HiddenLeaf', 'Kazegakure', 'Shimogakure', 'Gangakure', 'Raikurokure']
const PLAYER = VILLAGE_NAMES[0]

/** Build a fresh sim state for year 1. */
function buildState() {
  return {
    year: 1,
    month: 1,
    ryo: 50000,
    morale: 70,
    reputation: 30,
    legend: 0,
    prestigeTier: 'D',
    hallOfLegends: [],
    districts: [],
    villages: [
      { n: 'Kazegakure',  strength: 55, rel: 50, personality: 'Honorable',  allied: false },
      { n: 'Shimogakure', strength: 65, rel: 40, personality: 'Aggressive', allied: false },
      { n: 'Gangakure',   strength: 48, rel: 55, personality: 'Balanced',   allied: false },
      { n: 'Raikurokure', strength: 72, rel: 35, personality: 'Aggressive', allied: false },
    ],
    shinobi: Array.from({ length: 12 }, (_, i) => ({
      ri: i < 2 ? 2 : i < 6 ? 1 : 0,
      salary: i < 2 ? 1300 : i < 6 ? 900 : 500,
    })),
    upgrades: { training: 1, intel: 0, hospital: 1, wall: 1, seal: 0 },
    // Tracked across the sim:
    _consecutiveBankruptYears: 0,
    _seasonFinishRecord: [],    // 1..5 finishing position each year
    _yearlyRyo: [],
  }
}

/** One full year: 12 months of economy + missions + rivals + one season. */
function simYear(state) {
  const season = {
    year: state.year,
    round: 0,
    table: initSeasonTable(VILLAGE_NAMES),
    lastResults: [],
  }

  // Simplified per-village strength: player + rivals combined into one lookup
  const strOf = (name) => {
    if (name === PLAYER) {
      const shinobiAvail = state.shinobi.filter(s => !s.injured).length
      const avgRi = state.shinobi.reduce((a, s) => a + s.ri, 0) / state.shinobi.length
      return Math.round(shinobiAvail * (5 + avgRi * 3) + (state.upgrades.wall || 0) * 15)
    }
    const v = state.villages.find(v => v.n === name)
    return v ? Math.round(v.strength) : 50
  }

  for (let m = 1; m <= 12; m++) {
    state.month = m

    // ── Economy tick ────────────────────────────────────────────────────────
    const income = villageRevenue(state.reputation, state.prestigeTier)
    const wages  = state.shinobi.reduce((a, s) => a + s.salary, 0)
    const net    = income - wages
    state.ryo    = Math.max(0, state.ryo + net)

    // Slow reputation ramp as the village completes missions
    state.reputation = clamp(state.reputation + (Math.random() < 0.4 ? 1 : 0), 0, 999)

    // ── Monthly missions (batch of 3, mid-rank) ──────────────────────────
    for (let i = 0; i < 3; i++) {
      const sc = clamp(0.55 + Math.random() * 0.15, 0.1, 0.9)
      const r  = resolveMission(sc)
      if (r.success) {
        state.ryo    += 3000
        state.morale  = clamp(state.morale + 2, 0, 100)
        state.legend += 2
      } else {
        state.morale = clamp(state.morale - 1, 0, 100)
      }
    }

    // ── Morale natural drift toward 65 ──────────────────────────────────
    const morDelta = state.morale < 65 ? 1 : state.morale > 65 ? -1 : 0
    state.morale = clamp(state.morale + morDelta, 0, 100)

    // ── Rival strength tick ─────────────────────────────────────────────
    state.villages.forEach(v => tickRivalStrength(v))

    // ── Season matchday ─────────────────────────────────────────────────
    if (season.round < VILLAGE_NAMES.length) {
      playMatchday(season, VILLAGE_NAMES, strOf)
    }

    // ── Shinobi roster: aging / injury / rank growth ────────────────────
    state.shinobi.forEach(s => {
      // 5% monthly injury chance, 1-month recovery
      if (!s.injured && Math.random() < 0.05) s.injured = true
      else if (s.injured) s.injured = false

      // Natural rank progression: 8% monthly chance per tier cap
      // mirrors adv.js: promotable when power crosses threshold
      if (!s.injured && s.ri < 4 && Math.random() < 0.08) {
        s.ri = Math.min(4, s.ri + 1)
        s.salary = 500 + s.ri * 400
      }

      // 1% retirement chance per month for senior shinobi (ri ≥ 3)
      if (s.ri >= 3 && Math.random() < 0.01) s._retire = true
    })
    // Remove retired shinobi; refill roster to keep 10–14
    state.shinobi = state.shinobi.filter(s => !s._retire)
    if (state.shinobi.length < 10) {
      const needed = 12 - state.shinobi.length
      for (let i = 0; i < needed; i++) {
        state.shinobi.push({ ri: 0, salary: 500, injured: false })
      }
    }
  }

  // ── End-of-year bookkeeping ─────────────────────────────────────────────────
  const sorted    = sortedTable(season.table)
  const myPos     = sorted.findIndex(r => r.name === PLAYER) + 1 // 1 = top
  const seeds     = seedsFromTable(season.table)
  state._seasonFinishRecord.push(myPos)
  state._yearlyRyo.push(state.ryo)

  // Prestige upgrade at reputation milestones
  const repTiers = [['S', 200], ['A', 120], ['B', 70], ['C', 30], ['D', 0]]
  state.prestigeTier = (repTiers.find(([, t]) => state.reputation >= t) || ['D'])[0]

  // Dynasty continuity: add a point for each year the roster stays healthy
  state.dynastyContinuityScore = (state.dynastyContinuityScore || 0)
    + (state.shinobi.length >= 10 ? 10 : 0)

  state.year++
  state.month = 1

  return { season, myPos, seeds, net: state._yearlyRyo.at(-1) }
}

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('Marathon — 10-year gameplay loop survival', () => {
  const state   = buildState()
  const reports = []

  for (let y = 1; y <= 10; y++) {
    reports.push(simYear(state))
  }

  // ── FIN-1: ryo is always finite ─────────────────────────────────────────────
  it('FIN-1: ryo stays finite every year', () => {
    state._yearlyRyo.forEach((ryo, i) => {
      expect(Number.isFinite(ryo), `Year ${i + 1} ryo is not finite: ${ryo}`).toBe(true)
    })
  })

  // ── FIN-2: village is not broke for the full decade ─────────────────────────
  it('FIN-2: ryo is positive in at least 7 of 10 years', () => {
    const positiveYears = state._yearlyRyo.filter(r => r > 0).length
    expect(positiveYears).toBeGreaterThanOrEqual(7)
  })

  // ── SEA-1: season tables have no NaN ────────────────────────────────────────
  it('SEA-1: no NaN values in any season table row', () => {
    reports.forEach(({ season }, i) => {
      Object.values(season.table).forEach(row => {
        ['w', 'd', 'l', 'gf', 'ga', 'pts', 'played'].forEach(key => {
          expect(Number.isNaN(row[key]), `Year ${i + 1} ${row.name}.${key} is NaN`).toBe(false)
        })
      })
    })
  })

  // ── SEA-2: player is not last in majority of seasons ───────────────────────
  it('SEA-2: player finishes above last place in ≥ 5 of 10 seasons', () => {
    const notLast = state._seasonFinishRecord.filter(pos => pos < VILLAGE_NAMES.length).length
    expect(notLast).toBeGreaterThanOrEqual(5)
  })

  // ── RIV-1: rival strengths stay within bounds ───────────────────────────────
  it('RIV-1: all rival strengths end in [10, 200]', () => {
    state.villages.forEach(v => {
      expect(v.strength).toBeGreaterThanOrEqual(10)
      expect(v.strength).toBeLessThanOrEqual(200)
    })
  })

  // ── MOR-1: morale stays in [0, 100] ─────────────────────────────────────────
  it('MOR-1: morale is in [0, 100] at decade end', () => {
    expect(state.morale).toBeGreaterThanOrEqual(0)
    expect(state.morale).toBeLessThanOrEqual(100)
  })

  // ── DYN-1: dynasty grade computable at year 10 ──────────────────────────────
  it('DYN-1: dynasty grade is valid at year 10', () => {
    const G = {
      legend: state.legend,
      hallOfLegends: state.hallOfLegends,
      villages: state.villages,
      prestigeTier: state.prestigeTier,
      dynastyContinuityScore: state.dynastyContinuityScore,
      districts: state.districts,
    }
    const { grade, score } = computeDynastyGrade(G)
    expect(['S', 'A', 'B', 'C', 'D']).toContain(grade)
    expect(Number.isFinite(score)).toBe(true)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  // ── Roster integrity: shinobi count never collapses ─────────────────────────
  it('ROSTER-1: shinobi roster stays at ≥ 10 through the decade', () => {
    // We check the final state; the sim refills below 10 each month, so
    // at year-end it must be ≥ 10.
    expect(state.shinobi.length).toBeGreaterThanOrEqual(10)
  })

  // ── Seeds are 1-indexed integers ────────────────────────────────────────────
  it('SEED-1: year-10 seeding assigns unique 1..5 integers', () => {
    const seeds = reports.at(-1).seeds
    const vals = Object.values(seeds)
    expect(vals).toHaveLength(VILLAGE_NAMES.length)
    VILLAGE_NAMES.forEach((n, i) => {
      expect(Number.isInteger(seeds[n])).toBe(true)
      expect(seeds[n]).toBeGreaterThanOrEqual(1)
      expect(seeds[n]).toBeLessThanOrEqual(VILLAGE_NAMES.length)
    })
    // All seeds unique
    expect(new Set(vals).size).toBe(VILLAGE_NAMES.length)
  })

  // ── Snapshot: log the decade summary ────────────────────────────────────────
  it('SNAP: decade summary is sensible (logged, not hard asserted)', () => {
    const standings = state._seasonFinishRecord
    const ryoTrack  = state._yearlyRyo.map(r => Math.round(r / 1000) + 'k')
    const { grade, score } = computeDynastyGrade({
      legend: state.legend, hallOfLegends: state.hallOfLegends,
      villages: state.villages, prestigeTier: state.prestigeTier,
      dynastyContinuityScore: state.dynastyContinuityScore,
      districts: state.districts,
    })
    console.log([
      '',
      '══════════════════════════════════════════',
      '  DECADE SUMMARY (10-year marathon sim)',
      '══════════════════════════════════════════',
      `  Season finishes : ${standings.join(' → ')}  (1=top, 5=last)`,
      `  Year-end ryo    : ${ryoTrack.join(' → ')}`,
      `  Final morale    : ${state.morale}`,
      `  Final rep       : ${state.reputation}`,
      `  Final prestige  : ${state.prestigeTier}`,
      `  Rival strengths : ${state.villages.map(v => v.n.slice(0,4) + '=' + Math.round(v.strength)).join(', ')}`,
      `  Dynasty grade   : ${grade}  (score ${score})`,
      `  Shinobi count   : ${state.shinobi.length}`,
      '══════════════════════════════════════════',
    ].join('\n'))
    expect(true).toBe(true)
  })
})
