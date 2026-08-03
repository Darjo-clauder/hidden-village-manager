import { describe, it, expect, vi } from 'vitest'
import { seedRandom, fingerprint, clearBlockers, autoAssignMissions } from './helpers/tickHarness.js'

/**
 * CHARACTERISATION TEST — the safety net for refactoring adv().
 *
 * adv() is a single ~2,900-line function carrying every system's monthly hook,
 * and until now nothing tested it at all. Splitting it apart is worth doing but
 * is exactly the kind of change that silently reorders side effects.
 *
 * These snapshots pin what the simulation PRODUCES for fixed seeds. They are
 * not assertions that the current numbers are correct or well balanced — only
 * that they do not change. A refactor that preserves behaviour leaves every
 * snapshot untouched; any diff here during a refactor is a regression until
 * proven otherwise.
 *
 * If a snapshot changes because of a deliberate BALANCE change, update it in
 * the same commit as that change and say so — never alongside a refactor.
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

function run(months, seed) {
  const restore = seedRandom(seed)
  try {
    initState()
    G.vName = 'Testfall'; G.kName = 'Probe'; G.vIcon = '🏯'
    const trail = []
    for (let i = 0; i < months; i++) {
      clearBlockers(G)          // stand in for the player answering what holds the turn
      autoAssignMissions(G)     // …and actually playing: without this, mission
                                // resolution never executes at all
      adv()
      if ((i + 1) % 12 === 0) trail.push(fingerprint(G))
    }
    return trail
  } finally { restore() }
}

describe('tick characterisation', () => {
  // Three seeds so a refactor that only holds for one random path still fails.
  for (const seed of [11111, 24680, 98765]) {
    it(`seed ${seed} — 36 months, yearly fingerprints`, () => {
      expect(run(36, seed)).toMatchSnapshot()
    })
  }

  it('seed 13579 — 120 months, a full decade', () => {
    expect(run(120, 13579)).toMatchSnapshot()
  })
})
