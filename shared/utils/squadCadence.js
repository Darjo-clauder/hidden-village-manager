/**
 * Squad deployment cadence — back-to-back missions grind a squad down beyond
 * what individual fatigue already covers; squads left idle lose the cohesion
 * they built. Reuses the squad's own `cohesion` field plus two new counters
 * (`consecutiveDeployMonths`, `idleMonths`) driven off a `deployedThisMonth`
 * flag the caller sets when a squad mission is queued.
 *
 * Pure — no G references. Caller mutates sq at the monthly tick.
 */
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)

/** Advance a squad's cadence counters for one month. Returns the new counter pair. */
export function tickCadence(sq = {}) {
  if (sq.deployedThisMonth) {
    return { consecutiveDeployMonths: (sq.consecutiveDeployMonths || 0) + 1, idleMonths: 0 }
  }
  return { consecutiveDeployMonths: 0, idleMonths: (sq.idleMonths || 0) + 1 }
}

/** Cohesion lost for a squad sitting idle a month (1-month grace period, then ramps). */
export function idleCohesionDecay(idleMonths = 0) {
  if (idleMonths <= 1) return 0
  return clamp(2 + (idleMonths - 2) * 2, 0, 15)
}

/** Mission-success penalty from grinding missions with no rest (2-month grace, then ramps). */
export function grindMod(consecutiveDeployMonths = 0) {
  if (consecutiveDeployMonths <= 2) return 0
  return -clamp((consecutiveDeployMonths - 2) * 0.03, 0, 0.15)
}

/** Extra cohesion lost on a mission loss for a squad that's been grinding. */
export function grindCohesionPenalty(consecutiveDeployMonths = 0) {
  if (consecutiveDeployMonths <= 2) return 0
  return clamp((consecutiveDeployMonths - 2) * 2, 0, 10)
}
