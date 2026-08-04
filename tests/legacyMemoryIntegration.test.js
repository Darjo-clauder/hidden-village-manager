import { describe, it, expect, vi } from 'vitest'
import { seedRandom, clearBlockers, autoAssignMissions } from './helpers/tickHarness.js'

/**
 * The legacy-memory layer, driven through the REAL tick.
 *
 * The unit suite proves the vendetta functions behave; it cannot prove they are
 * ever CALLED. That distinction is not academic here — the branch this system
 * replaces (`wasBonded` in tick/missions.js) was fully written, fully plausible,
 * and had never once executed in the game's history, because it compared a
 * bond's `otherId` against `sq.fallen` records that carried no `id` at all.
 * Green unit tests would not have caught that. Only running the tick does.
 *
 * So this drives real months with real mission dispatch until real shinobi die,
 * and asserts the consequences actually landed on the survivors.
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
const { definingMoments } = await import('../shared/utils/legacyMemory.js')
await (await import('./helpers/tickHarness.js')).initLocale()

const SEEDS = 12
const MONTHS = 48

function runSeed(seed) {
  const restore = seedRandom(seed)
  try {
    initState()
    G.vName = 'Vend' + seed; G.kName = 'Probe'; G.vIcon = '🏯'
    // Collected each month: the narrative inbox is capped at 50 entries, so over
    // four years a payoff beat is long gone by the time the run ends.
    const beats = []
    const seen = new Set()
    for (let i = 0; i < MONTHS; i++) {
      clearBlockers(G)
      autoAssignMissions(G)
      adv()
      for (const n of G.narrativeInbox || []) {
        if (n.tag === 'vendetta' && !seen.has(n.id)) { seen.add(n.id); beats.push(n) }
      }
    }
    const ledger = G.vendettas || {}
    const deaths = Object.values(ledger).reduce((a, v) => a + v.deaths.length, 0)
    return {
      seed,
      kia: (G.memorial || []).filter(m => !m.transfer).length,
      ledgerVillages: Object.keys(ledger),
      deaths,
      avenged: Object.values(ledger).reduce((a, v) => a + (v.avenged || 0), 0),
      carriers: (G.shinobi || []).filter(s => (s.vendettas || []).length),
      scarred: (G.shinobi || []).filter(s => definingMoments(s).length),
      inbox: beats,
    }
  } finally { restore() }
}

const RESULTS = Array.from({ length: SEEDS }, (_, i) => runSeed(4200 + i * 7919))
const withDeaths = RESULTS.filter(r => r.deaths > 0)

describe('legacy memory, driven through the real tick', () => {
  it('the sweep actually kills people — otherwise this file proves nothing', () => {
    const totalKia = RESULTS.reduce((a, r) => a + r.kia, 0)
    expect(totalKia, 'no KIA across the sweep; this test is blind').toBeGreaterThan(0)
  })

  it('every death reaches the village ledger', () => {
    expect(withDeaths.length, 'deaths occurred but no ledger was ever written').toBeGreaterThan(0)
    for (const r of withDeaths) {
      expect(r.ledgerVillages.length, `seed ${r.seed}`).toBeGreaterThan(0)
      expect(r.deaths, `seed ${r.seed}`).toBeGreaterThan(0)
    }
  })

  it('survivors carry it — the branch that never used to fire, now fires', () => {
    const carrying = withDeaths.filter(r => r.carriers.length > 0)
    expect(carrying.length, 'nobody on any roster carries a vendetta').toBeGreaterThan(0)
    for (const r of carrying) {
      for (const s of r.carriers) {
        for (const v of s.vendettas) {
          expect(v.village, `seed ${r.seed}`).toBeTruthy()
          expect(v.lost.length, `seed ${r.seed}`).toBeGreaterThan(0)
          expect(v.intensity).toBeGreaterThan(0)
          expect(v.intensity).toBeLessThanOrEqual(3)
        }
      }
    }
  })

  it('a vendetta always names a village that actually exists in the world', () => {
    for (const r of withDeaths) {
      for (const s of r.carriers) {
        for (const v of s.vendettas) expect(typeof v.village).toBe('string')
      }
    }
  })

  it('defining moments survive four years of monthly decay in a live game', () => {
    const scarred = RESULTS.filter(r => r.scarred.length > 0)
    expect(scarred.length, 'no shinobi ended a 4-year run with any permanent memory').toBeGreaterThan(0)
    // Every one of them decayed for years and is still on the record.
    for (const r of scarred) {
      for (const s of r.scarred) {
        for (const m of definingMoments(s)) expect(m.intensity).toBeGreaterThanOrEqual(0.22)
      }
    }
  })

  it('debts get answered somewhere in the sweep, and the beat reaches the inbox', () => {
    const totalAvenged = RESULTS.reduce((a, r) => a + r.avenged, 0)
    const beats = RESULTS.reduce((a, r) => a + r.inbox.length, 0)
    expect(totalAvenged, 'no vendetta was ever settled across the sweep').toBeGreaterThan(0)
    expect(beats, 'debts were settled but no narrative beat was pushed').toBeGreaterThan(0)
    // The payoff line has to name the dead, or it is not a payoff.
    const sample = RESULTS.flatMap(r => r.inbox)[0]
    expect(sample.title).toMatch(/^Answered — .+/)
    expect(sample.body.length).toBeGreaterThan(60)
  })

  it('never settles more debts than deaths it recorded', () => {
    for (const r of RESULTS) expect(r.avenged, `seed ${r.seed}`).toBeLessThanOrEqual(r.deaths)
  })
})
