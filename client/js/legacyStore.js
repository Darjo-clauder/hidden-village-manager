/**
 * Persistence for the cross-run legacy.
 *
 * Deliberately kept in its OWN localStorage key, separate from the save and
 * from the save slots. That is the whole point: the save is wiped when a new
 * game begins, which is exactly why the old handoff record never survived to
 * be read. This store outlives runs by design.
 *
 * Computation lives in shared/utils/legacy.js; this file only loads, saves and
 * applies. Every function degrades to "no legacy" if storage is unavailable,
 * so a private-mode browser plays a normal first run rather than erroring.
 */

import { emptyLegacy, recordTenure, startingBonuses, consumeBequest } from '../../shared/utils/legacy.js'
import { computeDynastyGrade } from '../../shared/utils/dynasty.js'

const LS_KEY = 'hvm_legacy_v1'

export function loadLegacy() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyLegacy()
    const parsed = JSON.parse(raw)
    return parsed && parsed.version ? parsed : emptyLegacy()
  } catch { return emptyLegacy() }
}

export function saveLegacy(store) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); return true } catch { return false }
}

/** Wipe the lineage. Only ever called from an explicit, confirmed player action. */
export function clearLegacy() {
  try { localStorage.removeItem(LS_KEY) } catch { /* non-fatal */ }
  return emptyLegacy()
}

/**
 * Close out the current run and bank it.
 * `endedBy` is one of 'completed' | 'retired' | 'dismissed'.
 * Returns the record that was banked so the caller can show what was earned.
 */
export function bankTenure(G, endedBy) {
  const { grade, score } = computeDynastyGrade(G)
  const { store, record } = recordTenure(loadLegacy(), {
    vName: G.vName, wardenName: G.kName,
    yearsServed: G.year || 1,
    endedBy, grade, score, legend: G.legend || 0,
  })
  saveLegacy(store)
  return { record, store }
}

/** What the next run would begin with, without changing anything. */
export function previewStartingBonuses() { return startingBonuses(loadLegacy()) }

/**
 * Apply the inherited head start to a freshly-initialised G, then spend the
 * bequest so it cannot be claimed twice. Returns a summary for the UI, or null
 * when there is no legacy yet (a true first run).
 */
export function applyLegacyToNewGame(G) {
  const store = loadLegacy()
  const { total, tier, bequest } = startingBonuses(store)
  if (!total.ryo && !total.legend && !total.rep && !total.monthly) return null

  G.ryo = (G.ryo || 0) + total.ryo
  G.legend = (G.legend || 0) + total.legend
  G.reputation = (G.reputation || 0) + total.rep
  // A standing monthly stipend from the family name; read by the income tick.
  if (total.monthly) G.legacyStipend = total.monthly
  G.legacyApplied = { tier: tier.name, bequestGrade: bequest ? bequest.grade : null, ...total }

  if (bequest) saveLegacy(consumeBequest(store))
  return G.legacyApplied
}
