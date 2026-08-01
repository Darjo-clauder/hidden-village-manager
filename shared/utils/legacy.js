/**
 * Cross-run legacy — the meta-progression layer.
 *
 * The game had two clocks that were never connected: `ownerMandate` can end a
 * run early by dismissing the Warden, and `dynasty.js` defines a 30-year arc
 * with an heir handoff. Both worked; nothing carried between runs, because the
 * handoff record was written and never read. A completed 30-year dynasty left
 * the player starting their next run at exactly the same power as their first.
 *
 * This models both scales at once, so neither play pattern is the "wrong" one:
 *
 *   TENURE   one Warden's time in charge. Ends by dismissal, voluntary handoff,
 *            or reaching the dynasty year. Yields LEGACY POINTS that accumulate
 *            across runs and buy capped tiers of starting bonuses — the
 *            compounding reward for several shorter arcs.
 *
 *   DYNASTY  the full 30 years. Additionally leaves a BEQUEST: a large one-time
 *            inheritance applied at the start of the next run only — the reward
 *            for committing to the long arc.
 *
 * Points are capped and tiered rather than additive-forever, so a tenth run is
 * a stronger start, not an unloseable one. Dismissal still pays (0.4x), because
 * a meta-loop that punishes failure with nothing just means restarting.
 *
 * Pure: no G mutation, no storage, no UI. Persistence lives in
 * client/js/legacyStore.js; this module only computes.
 */

import { DYNASTY_YEARS, inheritedBonuses } from './dynasty.js'

/** How a tenure ended, and what fraction of its value the Warden keeps. */
export const END_REASONS = {
  completed: { id: 'completed', label: 'Completed the dynasty', mult: 1.0 },
  retired:   { id: 'retired',   label: 'Handed over to an heir', mult: 0.8 },
  dismissed: { id: 'dismissed', label: 'Dismissed by the council', mult: 0.4 },
}

const GRADE_BASE = { S: 100, A: 70, B: 45, C: 25, D: 10 }

/**
 * Legacy points earned by a single tenure.
 * Long, well-graded, voluntarily-concluded tenures are worth the most; a short
 * dismissal still returns something.
 */
export function tenurePoints({ grade = 'D', yearsServed = 1, endedBy = 'dismissed' } = {}) {
  const base = GRADE_BASE[grade] ?? GRADE_BASE.D
  const reason = END_REASONS[endedBy] || END_REASONS.dismissed
  // Partial credit for partial tenures, with a floor so a very short run isn't zero.
  const yearsFactor = Math.max(0.15, Math.min(1, (yearsServed || 0) / DYNASTY_YEARS))
  return Math.max(1, Math.round(base * yearsFactor * reason.mult))
}

/**
 * Cumulative-point tiers. Deliberately capped: the top tier is reachable and
 * then stops, so the meta-loop is a leg-up rather than a power spiral.
 *
 * NOTE on `rep`: village revenue scales WITH reputation, so inherited
 * reputation is multiplicative on income, not additive. These values are
 * therefore much smaller than the ryo/legend grants — an early build handed
 * out ~110 inherited reputation and produced a month-one village earning 74k
 * against a fresh village's ~22k, which erased the entire early economy.
 */
export const LEGACY_TIERS = [
  { at: 0,   name: 'Unknown',    ryo: 0,     legend: 0,  rep: 0,  monthly: 0 },
  { at: 50,  name: 'Remembered', ryo: 3000,  legend: 5,  rep: 5,  monthly: 0 },
  { at: 120, name: 'Respected',  ryo: 8000,  legend: 15, rep: 10, monthly: 150 },
  { at: 250, name: 'Renowned',   ryo: 16000, legend: 30, rep: 18, monthly: 350 },
  { at: 450, name: 'Storied',    ryo: 28000, legend: 50, rep: 28, monthly: 600 },
]

/**
 * Inherited reputation is damped for the same reason: the bequest's own rep
 * grant (up to 80 at S grade) was authored as a display value long before
 * anything applied it, and applying it raw compounds through revenue.
 */
export const BEQUEST_REP_DAMPING = 0.35

/** The highest tier the given point total has reached. */
export function tierFor(points = 0) {
  let t = LEGACY_TIERS[0]
  for (const tier of LEGACY_TIERS) if ((points || 0) >= tier.at) t = tier
  return t
}

/** Points still needed for the next tier, or null at the cap. */
export function nextTier(points = 0) {
  return LEGACY_TIERS.find(t => t.at > (points || 0)) || null
}

/** A fresh, empty legacy store. */
export function emptyLegacy() {
  return { version: 1, points: 0, tenures: [], pendingBequest: null, dynastiesCompleted: 0, bestGrade: null }
}

const GRADE_ORDER = ['D', 'C', 'B', 'A', 'S']
function _better(a, b) {
  if (!a) return b
  if (!b) return a
  return GRADE_ORDER.indexOf(a) >= GRADE_ORDER.indexOf(b) ? a : b
}

/**
 * Close a tenure and fold it into the store. Returns a NEW store plus the
 * record that was added, so callers can report what was just earned.
 *
 * Reaching the dynasty year also arms a bequest for the next run; that bequest
 * is consumed by `applyLegacy` and does not stack with a later one.
 */
export function recordTenure(store, { vName, wardenName, yearsServed, endedBy, grade, score, legend } = {}) {
  const s = store && store.version ? { ...store, tenures: [...store.tenures] } : emptyLegacy()
  const reason = END_REASONS[endedBy] ? endedBy : 'dismissed'
  const earned = tenurePoints({ grade, yearsServed, endedBy: reason })
  const record = {
    vName: vName || 'Unnamed', wardenName: wardenName || 'Unknown',
    yearsServed: yearsServed || 0, endedBy: reason,
    grade: grade || 'D', score: score || 0, legend: legend || 0, earned,
  }
  s.tenures.push(record)
  if (s.tenures.length > 20) s.tenures.shift()   // keep the store bounded
  s.points = (s.points || 0) + earned
  s.bestGrade = _better(s.bestGrade, record.grade)
  if (reason === 'completed') {
    s.dynastiesCompleted = (s.dynastiesCompleted || 0) + 1
    s.pendingBequest = { grade: record.grade, bonuses: inheritedBonuses(record.grade) }
  }
  return { store: s, record }
}

/**
 * What a new run starts with: the standing tier bonus, plus any armed bequest.
 * Returns the merged numbers and the parts, so the UI can explain where a
 * starting advantage came from rather than just handing over a bigger number.
 */
export function startingBonuses(store) {
  const s = store && store.version ? store : emptyLegacy()
  const tier = tierFor(s.points)
  const out = { ryo: tier.ryo, legend: tier.legend, rep: tier.rep, monthly: tier.monthly }
  const bequest = s.pendingBequest || null
  if (bequest) {
    for (const b of bequest.bonuses) {
      if (b.id === 'ryo_start')    out.ryo     += b.value
      if (b.id === 'legend_start') out.legend  += b.value
      if (b.id === 'rep_start')    out.rep     += Math.round(b.value * BEQUEST_REP_DAMPING)
      if (b.id === 'hall_bonus')   out.monthly += b.value
    }
  }
  return { total: out, tier, bequest }
}

/** Consume the armed bequest. Call once the next run has actually started. */
export function consumeBequest(store) {
  const s = store && store.version ? { ...store } : emptyLegacy()
  s.pendingBequest = null
  return s
}
