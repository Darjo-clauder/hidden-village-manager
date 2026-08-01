import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  seedRandom, findNumericCorruption, findTextCorruption, fingerprint,
} from './helpers/tickHarness.js'

// adv.js reaches the browser only through these four modules. Stubbing them
// lets the entire monthly tick run in plain node -- no jsdom, no DOM at all.
// aL is mirrored rather than stubbed: it is what writes G.log, and a no-op
// would leave the text-corruption check inspecting a permanently empty array —
// a test that cannot fail. state.js does not import ui.js, so this is safe.
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

/** Fresh seeded game, then N months of simulation. */
function runMonths(n, seed = 20260731) {
  const restore = seedRandom(seed)
  try {
    initState()
    G.vName = 'Testfall'; G.kName = 'Probe'; G.vIcon = '🏯'
    for (let i = 0; i < n; i++) adv()
    return fingerprint(G)
  } finally { restore() }
}

describe('monthly tick — it runs at all', () => {
  it('advances a single month without throwing', () => {
    expect(() => runMonths(1)).not.toThrow()
  })

  it('advances the calendar correctly across a year boundary', () => {
    const fp = runMonths(13)
    // 13 ticks from Y1 M1 lands in Y2
    expect(fp.year).toBeGreaterThanOrEqual(2)
    expect(fp.month).toBeGreaterThanOrEqual(1)
    expect(fp.month).toBeLessThanOrEqual(12)
  })

  it('survives five simulated years', () => {
    expect(() => runMonths(60)).not.toThrow()
  })
})

describe('monthly tick — numeric integrity', () => {
  it('produces no NaN or Infinity anywhere in state after 36 months', () => {
    const restore = seedRandom(4242)
    try {
      initState()
      G.vName = 'Testfall'; G.kName = 'Probe'
      for (let i = 0; i < 36; i++) adv()
      expect(findNumericCorruption(G)).toEqual([])
    } finally { restore() }
  })

  it('keeps the headline numbers finite and sane', () => {
    const fp = runMonths(24)
    expect(Number.isFinite(fp.ryo)).toBe(true)
    expect(Number.isFinite(fp.reputation)).toBe(true)
    expect(Number.isFinite(fp.legend)).toBe(true)
    expect(fp.morale).toBeGreaterThanOrEqual(0)
    expect(fp.morale).toBeLessThanOrEqual(100)
  })
})

describe('monthly tick — player-visible text', () => {
  it('actually produces log output to inspect', () => {
    const restore = seedRandom(99)
    try {
      initState()
      G.vName = 'Testfall'; G.kName = 'Probe'
      for (let i = 0; i < 12; i++) adv()
      // Guards the check below from silently passing over an empty array.
      expect(G.log.length).toBeGreaterThan(0)
    } finally { restore() }
  })

  it('never leaks undefined / NaN / [object Object] into copy', () => {
    const restore = seedRandom(99)
    try {
      initState()
      G.vName = 'Testfall'; G.kName = 'Probe'
      for (let i = 0; i < 36; i++) adv()
      expect(findTextCorruption(G)).toEqual([])
    } finally { restore() }
  })
})

describe('harness self-check', () => {
  it('the corruption detectors are not vacuous', () => {
    expect(findNumericCorruption({ a: NaN })).toHaveLength(1)
    expect(findNumericCorruption({ nested: { x: Infinity } })).toHaveLength(1)
    expect(findNumericCorruption({ ok: 3, s: 'fine' })).toEqual([])
    expect(findTextCorruption({ log: [{ msg: 'undefined has joined' }] })).toHaveLength(1)
    expect(findTextCorruption({ log: [{ msg: 'all well' }] })).toEqual([])
  })

  it('the fingerprint reflects roster progression', () => {
    const restore = seedRandom(606)
    try {
      initState()
      G.vName = 'Testfall'; G.kName = 'Probe'
      // stats live in s.stats — a wrong field name here would silently zero this
      expect(fingerprint(G).power).toBeGreaterThan(0)
    } finally { restore() }
  })
})

describe('monthly tick — roster invariants', () => {
  it('never lets the roster collapse (auto-sign floor holds)', () => {
    const restore = seedRandom(777)
    try {
      initState()
      G.vName = 'Testfall'; G.kName = 'Probe'
      let min = Infinity
      for (let i = 0; i < 60; i++) { adv(); min = Math.min(min, G.shinobi.length) }
      expect(min).toBeGreaterThan(0)
    } finally { restore() }
  })

  it('keeps every shinobi identifiable and ranked', () => {
    const restore = seedRandom(555)
    try {
      initState()
      G.vName = 'Testfall'; G.kName = 'Probe'
      for (let i = 0; i < 24; i++) adv()
      for (const s of G.shinobi) {
        expect(s.id).toBeTruthy()
        expect(typeof s.fn).toBe('string')
        expect(s.ri).toBeGreaterThanOrEqual(0)
        expect(s.ri).toBeLessThanOrEqual(4)
      }
    } finally { restore() }
  })

  it('bounds the log so a long dynasty cannot grow state without limit', () => {
    const restore = seedRandom(31337)
    try {
      initState()
      G.vName = 'Testfall'; G.kName = 'Probe'
      for (let i = 0; i < 120; i++) adv()
      expect(G.log.length).toBeLessThanOrEqual(200)
    } finally { restore() }
  })
})

describe('monthly tick — determinism', () => {
  it('is reproducible for a given seed', () => {
    const a = runMonths(18, 8080)
    const b = runMonths(18, 8080)
    expect(a).toEqual(b)
  })

  it('actually diverges on a different seed (the harness is not faking it)', () => {
    const a = runMonths(18, 8080)
    const b = runMonths(18, 9090)
    expect(a).not.toEqual(b)
  })
})
