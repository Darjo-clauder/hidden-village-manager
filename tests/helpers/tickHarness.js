/**
 * Headless harness for the monthly tick.
 *
 * The whole client was unverified: 1,047 tests covered pure shared/ functions
 * and nothing at all imported adv.js, so ~21k lines including the entire
 * simulation ran only under manual browser QA. adv.js turns out to be free of
 * direct DOM access — it reaches the browser only through four modules — so it
 * can be driven in plain node once those are stubbed. No jsdom required.
 *
 * Test files must declare the mocks themselves (vi.mock is hoisted per file);
 * MOCKS below documents the exact set. This module owns the seeding and the
 * state-reading helpers.
 */

/** The four modules in adv.js's import graph that touch the browser. */
export const MOCKS = ['ui.js', 'socket.js', 'news.js', 'legacyStore.js']

/** Deterministic PRNG (same generator the match engine uses). */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Replace Math.random with a seeded stream for the duration of a run, so the
 * tick is reproducible. Returns a restore function.
 */
export function seedRandom(seed = 12345) {
  const real = Math.random
  Math.random = mulberry32(seed)
  return () => { Math.random = real }
}

/**
 * Stand in for a player answering whatever is holding the turn.
 *
 * adv() now refuses to run while a blocking decision is outstanding
 * (shared/utils/turnGate.js). Before that guard existed this harness drove the
 * tick straight over pending mandates, pact calls and world choices — which
 * means the months it produced were ones no real player could have reached.
 * Clearing them here is closer to a real playthrough than ignoring them was,
 * though it does skip whatever effect answering would have had.
 *
 * Exams and wars need interactive play to resolve properly, so they are simply
 * stood down; driving those end-to-end is a browser job, not a harness one.
 */
export function clearBlockers(G) {
  G.pendingChoiceEvent = null
  G.pendingObligation = null
  G.pendingQuickDecision = null
  G.examActive = false
  G.warActive = false
}

/** Numeric fields that must stay finite for the simulation to be meaningful. */
export const NUMERIC_INVARIANTS = [
  'ryo', 'reputation', 'legend', 'morale', 'year', 'month',
]

/**
 * Walk state and collect anything that has gone numerically wrong. Catching
 * NaN/Infinity early matters because they propagate silently through a tick
 * and only surface as "undefined" or "NaN" in the UI many months later.
 */
export function findNumericCorruption(G, { maxDepth = 3 } = {}) {
  const bad = []
  const seen = new Set()
  const walk = (node, path, depth) => {
    if (!node || typeof node !== 'object' || depth > maxDepth) return
    if (seen.has(node)) return
    seen.add(node)
    for (const [k, v] of Object.entries(node)) {
      const p = path ? `${path}.${k}` : k
      if (typeof v === 'number') {
        if (Number.isNaN(v)) bad.push(`${p} = NaN`)
        else if (!Number.isFinite(v)) bad.push(`${p} = ${v}`)
      } else if (v && typeof v === 'object') {
        walk(v, p, depth + 1)
      }
    }
  }
  walk(G, '', 0)
  return bad
}

/** Text fields that leaked an undefined/NaN into player-visible copy. */
export function findTextCorruption(G) {
  const bad = []
  const check = (s, where) => {
    if (typeof s !== 'string') return
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(s)) bad.push(`${where}: ${s.slice(0, 90)}`)
  }
  ;(G.log || []).forEach((e, i) => check(e.msg, `log[${i}]`))
  ;(G.noticeboard || []).forEach((n, i) => { check(n.text, `notice[${i}]`); check(n.title, `notice[${i}].title`) })
  ;(G.chronicle || []).forEach((c, i) => { check(c.title, `chronicle[${i}].title`); check(c.body, `chronicle[${i}].body`) })
  ;(G.shinobi || []).forEach((s, i) => { check(s.fn, `shinobi[${i}].fn`); check(s.ln, `shinobi[${i}].ln`) })
  return bad
}

/**
 * A compact, comparable fingerprint of simulation state. Used as a golden
 * value: refactoring the tick must not change what the same seed produces.
 */
export function fingerprint(G) {
  return {
    year: G.year, month: G.month,
    ryo: G.ryo, reputation: G.reputation, legend: G.legend, morale: G.morale,
    prestigeTier: G.prestigeTier,
    shinobi: (G.shinobi || []).length,
    prospects: (G.prospects || []).length,
    staff: (G.staff || []).length,
    squads: (G.squads || []).length,
    missions: (G.aM || []).length,
    logLines: (G.log || []).length,
    injured: (G.shinobi || []).filter(s => s.status === 'injured').length,
    // Roster power total is the broadest single signal that progression changed.
    // Stats live in s.stats as a keyed object, not as flat fields.
    power: (G.shinobi || []).reduce(
      (a, s) => a + Object.values(s.stats || {}).reduce((x, y) => x + (Number(y) || 0), 0), 0),
  }
}
