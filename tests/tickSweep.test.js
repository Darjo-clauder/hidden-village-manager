import { describe, it, expect, vi } from 'vitest'
import {
  seedRandom, clearBlockers, findNumericCorruption, findTextCorruption, branchProbe,
  autoAssignMissions,
} from './helpers/tickHarness.js'

/**
 * BROAD SWEEP — many seeds, shallow assertions.
 *
 * The characterisation suite runs four seeds deeply and pins their exact
 * output. That catches "this refactor changed the simulation" very well, and
 * catches "this code path was never executed" not at all. Two unimported
 * functions shipped in tick/staff.js precisely because no seed in that suite
 * happened to graduate a mentorship.
 *
 * This is the other half: dozens of seeds, no snapshots, checking two things.
 *
 *   1. Invariants hold on EVERY seed, not on the four that were convenient.
 *   2. The rare branches actually fire somewhere in the sweep — so coverage is
 *      measured. A change that makes shinobi unkillable, or stops promotions,
 *      fails here instead of drifting quietly through a snapshot.
 *
 * Deliberately shallow per seed: breadth is the point, and the deep behaviour
 * pinning already exists elsewhere.
 */

vi.mock('../client/js/ui.js', async () => {
  const { G } = await import('../client/js/state.js')
  return {
    aL: (msg, t = 'neutral') => {
      G.log.push({ y: G.year, m: G.month, msg, t })
      if (G.log.length > 150) G.log.shift()
    },
    ntf: () => {}, upUI: () => {}, schEx: () => {}, cm: () => {},
  }
})
vi.mock('../client/js/socket.js', () => ({ syncToServer: () => {} }))
vi.mock('../client/js/news.js', () => ({ addNewsItem: () => {} }))
vi.mock('../client/js/legacyStore.js', () => ({
  bankTenure: () => ({ record: { earned: 0 }, store: { points: 0 } }),
  loadLegacy: () => ({ version: 1, points: 0, tenures: [], pendingBequest: null }),
  applyLegacyToNewGame: () => null,
  previewStartingBonuses: () => ({ total: { ryo: 0, legend: 0, rep: 0, monthly: 0 }, tier: {}, bequest: null }),
}))

const { G, initState } = await import('../client/js/state.js')
const { adv } = await import('../client/js/adv.js')
await (await import('./helpers/tickHarness.js')).initLocale()   // t() returns raw keys otherwise

const SEEDS = 24
const MONTHS = 48

/** Run one seed, returning its end-state probe and any integrity failures. */
function runSeed(seed) {
  const restore = seedRandom(seed)
  try {
    initState()
    G.vName = 'Sweep' + seed; G.kName = 'Probe'; G.vIcon = '🏯'
    let probe = null
    for (let i = 0; i < MONTHS; i++) {
      clearBlockers(G)
      autoAssignMissions(G)   // without this, mission resolution never executes
      adv()
      probe = branchProbe(G, probe)
    }
    return {
      seed, probe,
      numeric: findNumericCorruption(G),
      text: findTextCorruption(G),
      year: G.year, roster: (G.shinobi || []).length, ryo: G.ryo,
    }
  } finally { restore() }
}

const RESULTS = Array.from({ length: SEEDS }, (_, i) => runSeed(1000 + i * 7919))

describe(`tick sweep — ${SEEDS} seeds x ${MONTHS} months`, () => {
  it('completes every seed without throwing', () => {
    expect(RESULTS).toHaveLength(SEEDS)
  })

  it('produces no NaN or Infinity on ANY seed', () => {
    const bad = RESULTS.filter(r => r.numeric.length)
    expect(bad.map(r => ({ seed: r.seed, problems: r.numeric.slice(0, 3) }))).toEqual([])
  })

  it('leaks no undefined / NaN / [object Object] into copy on ANY seed', () => {
    const bad = RESULTS.filter(r => r.text.length)
    expect(bad.map(r => ({ seed: r.seed, problems: r.text.slice(0, 3) }))).toEqual([])
  })

  it('advances the calendar on every seed', () => {
    for (const r of RESULTS) expect(r.year, `seed ${r.seed}`).toBeGreaterThanOrEqual(4)
  })

  it('never lets a village lose its whole roster', () => {
    for (const r of RESULTS) expect(r.roster, `seed ${r.seed}`).toBeGreaterThan(0)
  })

  it('keeps the treasury within believable bounds on every seed', () => {
    for (const r of RESULTS) {
      expect(Number.isFinite(r.ryo), `seed ${r.seed}`).toBe(true)
      expect(r.ryo, `seed ${r.seed}`).toBeLessThan(50_000_000)   // runaway-economy guard
    }
  })
})

describe('tick sweep — rare branches are actually exercised', () => {
  // Each of these is a path a single-seed test can miss entirely. If one stops
  // firing across two dozen seeds, something has been broken or gated off.
  const totals = key => RESULTS.reduce((a, r) => a + (Number(r.probe[key]) || 0), 0)
  const seedsHitting = key => RESULTS.filter(r => (Number(r.probe[key]) || 0) > 0).length

  const MUST_FIRE = [
    'kia',          // shinobi die on missions
    'injured',      // and are wounded short of that
    'chronicles',   // narrative events record themselves
    'students',     // the academy takes an intake
    'youthCups',    // and runs its tournament
    'prospects',    // the scouting pipeline produces candidates
  ]

  for (const key of MUST_FIRE) {
    it(`${key} occurs somewhere in the sweep`, () => {
      expect(totals(key), `${key} never fired across ${SEEDS} seeds`).toBeGreaterThan(0)
    })
  }

  it('reports which branches the sweep reached, for the record', () => {
    const report = {}
    for (const k of Object.keys(RESULTS[0].probe)) {
      report[k] = { total: totals(k), seedsHitting: seedsHitting(k) }
    }
    // Not an assertion so much as a printed inventory — if a future extraction
    // silently kills a branch, the diff on this expectation shows which one.
    expect(Object.keys(report).length).toBeGreaterThan(10)
    expect(report.kia.seedsHitting).toBeGreaterThan(0)
  })

  it('does not kill so many that the roster floor is doing all the work', () => {
    // A sanity bound in the other direction: if every seed is bleeding shinobi,
    // mission lethality has been mis-tuned rather than the branch merely working.
    const avgKia = totals('kia') / SEEDS
    expect(avgKia).toBeLessThan(MONTHS / 2)
  })
})
