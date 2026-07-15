/**
 * Match engine (pure) — the possession-phase micro-sim under the battle viewer.
 * Blueprint: docs/MATCH_ENGINE_BLUEPRINT.md §1, §4, §6.
 *
 * Takes the PRE-RESOLVED beat results and expands each beat ("period") into a
 * script of possession phases — zone entries, passes, interceptions, strikes on
 * the seal gate — whose phase points always sum to honour the recorded result
 * (the outcome governor, applied at plan level). The viewer renders this script;
 * it never rolls outcomes of its own.
 *
 * Deterministic: seeded from the report, so a replay of the same match renders
 * the same sequence — replays are archival, not rerolls. DOM-free, unit-tested.
 */

// ── Seeded RNG (mulberry32 — matches the test-harness convention) ─────────────
export function seedFrom(str = '') {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Zones — hockey grammar on the hex (blueprint §2.5) ───────────────────────
// Five vertical bands, home gate on the left: HG | HD | N | AD | AG.
export const ZONES = ['HG', 'HD', 'N', 'AD', 'AG']
/** Band centre as a fraction of pitch width (x, 0..1), for the renderer. */
export const ZONE_X = { HG: 0.10, HD: 0.30, N: 0.50, AD: 0.70, AG: 0.90 }

/**
 * One phase = one team advancing the objective through zones toward the enemy
 * gate. `side`: 'home'|'away'. `point`: +1 (home banks it), -1 (away does), 0
 * (dead phase — turnover in the middle, nobody profits).
 * Events are ordered, `at` = 0..1 offset inside the phase window:
 *   { type, at, actor, target, zone }
 * types: carry, pass, pass_fail, intercept, strike, block, turnover
 * `actor`/`target` are side-relative indices (renderer maps them to tokens).
 */
function _buildPhase(rng, side, point, nHome, nAway, tempoPasses = 1) {
  const atk = side === 'home' ? nHome : nAway
  const def = side === 'home' ? nAway : nHome
  const pick = n => Math.floor(rng() * Math.max(1, n))
  const ev = []
  // Path through zones, attacker's perspective: own defence → neutral → attack.
  const path = side === 'home' ? ['HD', 'N', 'AD'] : ['AD', 'N', 'HD']
  let carrier = pick(atk)
  ev.push({ type: 'carry', at: 0.05, actor: carrier, zone: path[0], side })
  const succeeds = side === 'home' ? point > 0 : point < 0   // does this side bank the phase?
  if (succeeds) {
    // Build-up length follows the attacking side's TEMPO (patient probes with an
    // extra pass, direct goes straight at the gate). A lone shinobi carries instead.
    const passes = tempoPasses + (rng() < 0.5 ? 1 : 0)
    for (let p = 0; p < passes; p++) {
      if (atk < 2) { ev.push({ type: 'carry', at: 0.2 + p * 0.25, actor: carrier, zone: path[Math.min(p + 1, 2)], side }); continue }
      let rcv = pick(atk); if (rcv === carrier) rcv = (rcv + 1) % atk
      ev.push({ type: 'pass', at: 0.2 + p * 0.25, actor: carrier, target: rcv, zone: path[Math.min(p + 1, 2)], side })
      carrier = rcv
    }
    const blocked = rng() < 0.35
    const gate = side === 'home' ? 'AG' : 'HG'
    ev.push({ type: blocked ? 'block' : 'strike', at: 0.85, actor: carrier, target: pick(def), zone: gate, side })
    // A blocked strike still banks the phase (pressure told); strike is cleaner.
  } else if (point === 0) {
    // Dead phase: a pass dies in the neutral band, nobody profits.
    let rcv = pick(atk); if (rcv === carrier && atk > 1) rcv = (rcv + 1) % atk
    ev.push({ type: 'pass_fail', at: 0.45, actor: carrier, target: rcv, zone: 'N', side })
    ev.push({ type: 'turnover', at: 0.55, actor: pick(def), zone: 'N', side: side === 'home' ? 'away' : 'home' })
  } else {
    // The defence wins it: pressured pass picked off, counter banks the point.
    let rcv = pick(atk); if (rcv === carrier && atk > 1) rcv = (rcv + 1) % atk
    const thief = pick(def)
    ev.push({ type: 'pass_fail', at: 0.35, actor: carrier, target: rcv, zone: path[1], side })
    ev.push({ type: 'intercept', at: 0.45, actor: thief, zone: path[1], side: side === 'home' ? 'away' : 'home' })
    const gate = side === 'home' ? 'HG' : 'AG'
    ev.push({ type: rng() < 0.3 ? 'block' : 'strike', at: 0.85, actor: thief, zone: gate, side: side === 'home' ? 'away' : 'home' })
  }
  return { side, point, events: ev }
}

/**
 * The outcome governor, applied at plan level (blueprint §4.6): pick per-phase
 * points whose sum honours the period's recorded result. A won period must end
 * positive, a lost one negative — no plan can contradict the engine.
 */
export function planPeriodPoints(rng, won, nPhases = 3) {
  const pts = []
  for (let i = 0; i < nPhases; i++) pts.push(rng() < 0.62 ? (won ? 1 : -1) : rng() < 0.5 ? (won ? -1 : 1) : 0)
  // Governor: force the sum's sign. Flip from the end until it honours the result.
  const sum = a => a.reduce((x, y) => x + y, 0)
  for (let i = nPhases - 1; (won ? sum(pts) <= 0 : sum(pts) >= 0) && i >= 0; i--) pts[i] = won ? 1 : -1
  return pts
}

/**
 * Build ONE period lazily — seeded per (report, period index) so a period's
 * phases are deterministic regardless of when they're built. This is what lets
 * the viewer evaluate situational tactics at the period boundary and have the
 * effective TEMPO genuinely shape the play (blueprint §3.3), while replays stay
 * archival: same situations → same seed path → same phases.
 */
export function buildPeriod({ seedStr = '', periodIdx = 0, won = false, nHome = 3, nAway = 3, phasesPerPeriod = 3, tempoPasses = { home: 1, away: 1 } } = {}) {
  const rng = mulberry32(seedFrom(seedStr) ^ (0x9e3779b9 * (periodIdx + 1) | 0))
  const pts = planPeriodPoints(rng, !!won, phasesPerPeriod)
  return {
    won: !!won,
    phases: pts.map(p => {
      const side = p >= 0 ? 'home' : 'away'
      return _buildPhase(rng, side, p, nHome, nAway, tempoPasses[side] ?? 1)
    }),
  }
}

/**
 * Build the full match script from the resolved beats (eager form — used by
 * auto-resolve, tests and anywhere situations aren't in play).
 *   beats: [{ name, won }]  (the report's beats — one period each)
 *   seedStr: any stable string from the report
 *   tempoPasses: { home, away } — build-up passes per banked phase (from TEMPO)
 * Returns { periods: [{ name, won, phases: [phase] }], seed }.
 */
export function buildMatchScript({ beats = [], seedStr = '', nHome = 3, nAway = 3, phasesPerPeriod = 3, tempoPasses = { home: 1, away: 1 } } = {}) {
  const seed = seedFrom(seedStr)
  const periods = beats.map((b, i) => ({
    name: b.name,
    ...buildPeriod({ seedStr, periodIdx: i, won: b.won, nHome, nAway, phasesPerPeriod, tempoPasses }),
  }))
  return { periods, seed }
}

// ── Post-match stats (blueprint §6.3) — aggregate the event log ───────────────
/**
 * Sheet from the full event list: possession %, strikes (on target / blocked),
 * pass completion, interceptions + strikes per home actor index.
 */
export function statsFrom(events = []) {
  const s = {
    possHome: 0, possAway: 0,
    strikesHome: 0, strikesAway: 0, blocksHome: 0, blocksAway: 0,
    passOk: 0, passFail: 0, intercepts: 0,
    byHomeActor: {},   // idx → { strikes, intercepts, passes }
  }
  const bump = (idx, k) => {
    const rec = s.byHomeActor[idx] || (s.byHomeActor[idx] = { strikes: 0, intercepts: 0, passes: 0 })
    rec[k]++
  }
  events.forEach(e => {
    const home = e.side === 'home'
    if (e.type === 'carry' || e.type === 'pass') home ? s.possHome++ : s.possAway++
    if (e.type === 'pass') { s.passOk++; if (home) bump(e.actor, 'passes') }
    if (e.type === 'pass_fail') s.passFail++
    if (e.type === 'intercept') { s.intercepts++; if (home) bump(e.actor, 'intercepts') }
    if (e.type === 'strike') { home ? s.strikesHome++ : s.strikesAway++; if (home) bump(e.actor, 'strikes') }
    if (e.type === 'block') home ? s.blocksHome++ : s.blocksAway++
  })
  const possTot = s.possHome + s.possAway
  s.possessionPct = possTot ? Math.round(s.possHome / possTot * 100) : 50
  const passTot = s.passOk + s.passFail
  s.passPct = passTot ? Math.round(s.passOk / passTot * 100) : 0
  return s
}

/** Running zone control (−1..+1 per band) from the events seen so far — feeds
 *  the renderer's zone tinting. Home presence pushes +, away −. */
export function zoneControlFrom(events) {
  const ctl = { HG: 0.4, HD: 0.25, N: 0, AD: -0.25, AG: -0.4 }   // territorial baseline
  events.forEach(e => {
    if (!e.zone) return
    const w = e.type === 'strike' ? 0.5 : e.type === 'intercept' ? 0.35 : 0.15
    ctl[e.zone] = Math.max(-1, Math.min(1, ctl[e.zone] + (e.side === 'home' ? w : -w)))
  })
  return ZONES.map(z => ctl[z])
}

// ── Commentary ticker (blueprint §6.2) — every event, one line, same record ──
const _TICKER = {
  carry:     ['{A} takes the scroll up the {Z} band.', '{A} carries through {Z}.'],
  pass:      ['{A} finds {B} in {Z}.', '{A} threads it to {B}.'],
  pass_fail: ['{A}\'s pass dies under pressure.', '{A} forces it — nothing on.'],
  intercept: ['⚡ {A} reads the lane — turnover.', '⚡ picked off by {A}!'],
  strike:    ['✦ {A} strikes at the seal gate!', '✦ {A} forces the breach!'],
  block:     ['▣ {A}\'s strike is blocked at the gate.', '▣ smothered at the gate.'],
  turnover:  ['✕ loose scroll — {A} falls on it.', '✕ swallowed up in the neutral band.'],
}
const _ZONE_LABEL = { HG: 'home-gate', HD: 'home', N: 'neutral', AD: 'attacking', AG: 'gate' }
/** Render one event to a ticker line. `names(side, idx)` resolves a display name. */
export function tickerLine(ev, names, rngRoll = 0) {
  const bank = _TICKER[ev.type] || ['…']
  const tpl = bank[Math.abs(rngRoll | 0) % bank.length]
  return tpl
    .replace('{A}', names(ev.side, ev.actor))
    .replace('{B}', names(ev.side, ev.target ?? ev.actor))
    .replace('{Z}', _ZONE_LABEL[ev.zone] || 'middle')
}
