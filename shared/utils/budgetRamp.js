/**
 * Budget allocation — a bet placed a quarter early, not a dial with an
 * instant readout.
 *
 * Two problems with a raw slider set: the three tracks were independent (so
 * nothing stopped you funding all three at 100% and collecting every bonus at
 * once), and changes applied the moment you dragged (so there was never a
 * commitment to regret). Here the player sets a TARGET allocation which is
 * always normalised to a zero-sum 100, and the EFFECTIVE allocation the sim
 * reads walks toward that target a few points a month. Funding a track pays
 * off a quarter later; starving one keeps costing you while it unwinds.
 *
 * Pure — no G access. Caller ramps at the monthly tick and reads effects.
 */
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)

export const BUDGET_KEYS = ['training', 'warPrep', 'infra']
export const DEFAULT_ALLOCATION = { training: 33, warPrep: 33, infra: 34 }
/** Points a track can move per month — full swing takes about two quarters. */
export const RAMP_STEP = 6

/**
 * Force an allocation to a zero-sum 100 split, preserving relative weights.
 * Guarantees funding one track genuinely costs the others.
 */
export function normalizeAllocation(alloc = {}) {
  const raw = BUDGET_KEYS.map(k => Math.max(0, Number(alloc[k]) || 0))
  const sum = raw.reduce((a, b) => a + b, 0)
  if (sum <= 0) return { ...DEFAULT_ALLOCATION }
  const scaled = raw.map(v => Math.floor((v / sum) * 100))
  // Hand any rounding remainder to the largest track so the split lands on 100.
  const remainder = 100 - scaled.reduce((a, b) => a + b, 0)
  let biggest = 0
  for (let i = 1; i < scaled.length; i++) if (scaled[i] > scaled[biggest]) biggest = i
  scaled[biggest] += remainder
  return Object.fromEntries(BUDGET_KEYS.map((k, i) => [k, scaled[i]]))
}

/**
 * Walk the effective allocation one month toward the target, then renormalise
 * so the effective split is always a legal zero-sum 100.
 */
export function rampToward(effective = {}, target = {}, step = RAMP_STEP) {
  const eff = normalizeAllocation(effective)
  const tgt = normalizeAllocation(target)
  const moved = Object.fromEntries(BUDGET_KEYS.map(k => {
    const gap = tgt[k] - eff[k]
    if (Math.abs(gap) <= step) return [k, tgt[k]]
    return [k, eff[k] + Math.sign(gap) * step]
  }))
  return normalizeAllocation(moved)
}

/** Months until the effective allocation reaches the target. */
export function monthsToConverge(effective = {}, target = {}, step = RAMP_STEP) {
  const eff = normalizeAllocation(effective)
  const tgt = normalizeAllocation(target)
  const worst = Math.max(...BUDGET_KEYS.map(k => Math.abs(tgt[k] - eff[k])))
  return Math.ceil(worst / step)
}

/**
 * Single source of truth for what an allocation actually does, so the panel
 * preview and the sim can never drift apart.
 * @returns { devMult, warMult, maintMult }
 */
export function allocationEffects(effective = {}) {
  const a = normalizeAllocation(effective)
  return {
    devMult:   1 + ((a.training - 33) / 100) * 0.5,
    warMult:   1 + ((a.warPrep  - 33) / 100) * 0.4,
    maintMult: 1 - (a.infra / 100) * 0.3,
  }
}

/** Human-readable band for how far a track sits from a neutral split. */
export function trackBand(pct) {
  const p = clamp(pct ?? 33, 0, 100)
  if (p >= 55) return { label: 'Prioritised', color: '#8fbc8f' }
  if (p >= 25) return { label: 'Balanced',    color: '#c9a84c' }
  return { label: 'Starved', color: '#f0a030' }
}
