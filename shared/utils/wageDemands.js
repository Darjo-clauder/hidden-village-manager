/**
 * Wage demands that track village standing.
 *
 * THE PROBLEM (measured, see docs/BALANCE_MISSION_INCOME.md): village revenue
 * scales with reputation — `min(rep,200) × 400` — so a village merely at the
 * soft cap earns 102,000/month against a fresh village's 26,000. Payroll does
 * not move with it, because a shinobi signed in year one costs the same in year
 * five. Active play therefore reaches ~7.5× idle wealth by year two and keeps
 * widening, and the finance screen stops being a decision surface.
 *
 * THE FIX: shinobi in a renowned village know it, and want a share. Wages are
 * pulled toward a standing-adjusted market rate, so income rising with
 * reputation is met by payroll rising too and net pressure stays roughly flat.
 *
 * WHY THIS SHAPE RATHER THAN A TAX:
 *
 * - It reuses the salary cap instead of duplicating it. The cap scales with
 *   PRESTIGE; wages scale with REPUTATION. Those are correlated but not locked
 *   together, so a village whose renown outruns its prestige tier finds its
 *   wage bill outrunning its cap — and the existing luxury tax turns that into
 *   a recurring "trim the roster or pay for it" decision rather than a flat
 *   deduction.
 * - It drifts rather than jumps. Like the budget ramp, the player sees it
 *   coming and can act; a sudden repricing would just feel arbitrary.
 * - It is applied as a monthly review over the whole roster, not at signing.
 *   Salaries are assigned from a dozen scattered call sites, and patching each
 *   would leave the standing roster cheap — which is where the money actually
 *   is.
 *
 * Pure: no G, no RNG, no UI.
 */

const n = v => Number(v) || 0

/** Mirrors REP_SOFT_CAP in economy.js — wages bend where revenue bends. */
export const WAGE_REP_SOFT_CAP = 200

/**
 * Extra multiple of base wage a village at the reputation soft cap must pay.
 *
 * TUNED BY MEASUREMENT, not by reasoning from the revenue curve — that first
 * guess (2.2) barely moved anything. Across 20 seeds x 36 months, active play
 * versus idle:
 *
 *   wages off  19.35x   payroll  20,000
 *   max 2.2    16.94x   payroll  41,901
 *   max 5      7.66x    payroll  87,826
 *   max 6      4.51x    payroll 101,270   <- chosen
 *   max 7      2.03x    payroll 117,500
 *
 * 6 leaves a well-run village genuinely richer (718k vs 159k at 36 months)
 * without the runaway, and lands payroll above the B-tier salary cap so the
 * existing luxury tax turns it into a recurring roster decision.
 */
export const STANDING_WAGE_MAX = 6

/** Marginal pull per point of reputation past the soft cap. */
export const OVER_CAP_WAGE_STEP = 0.0015

/** Fraction of the gap to the demanded wage closed each month. */
export const WAGE_DRIFT_RATE = 0.12

/** Never let a single month's review move a contract by less than this. */
export const WAGE_DRIFT_MIN = 5

/**
 * Reputation below which wages do not rise at all.
 *
 * Without this the mechanism is REGRESSIVE, and measurably so: a struggling
 * village still fields ~22 shinobi and still has *some* reputation, so it paid
 * the multiplier while earning almost nothing. At the ceiling that fixed
 * runaway play, idle villages went bankrupt in 7 of 20 seeds. A village nobody
 * has heard of has no wage pressure — the demand only exists once there is
 * standing to trade on.
 */
export const WAGE_REP_FLOOR = 60

/**
 * How much more than base wage this village's standing commands.
 * 1.0 below the floor; 1 + STANDING_WAGE_MAX at the reputation soft cap.
 */
export function standingMultiplier(reputation, max = STANDING_WAGE_MAX) {
  const rep = Math.max(0, n(reputation))
  if (rep <= WAGE_REP_FLOOR) return 1
  const span = WAGE_REP_SOFT_CAP - WAGE_REP_FLOOR
  const under = Math.min(rep - WAGE_REP_FLOOR, span) / span
  const over = Math.max(0, rep - WAGE_REP_SOFT_CAP)
  return 1 + under * max + over * OVER_CAP_WAGE_STEP
}

/** A shinobi's base wage before standing — the published rank scale. */
export function baseWage(shinobi) {
  const ri = Math.max(0, Math.min(4, n(shinobi?.ri)))
  const persMod = n(shinobi?.pers?.effect?.salary)
  return Math.round((500 + ri * 400) * (1 + persMod))
}

/** What this shinobi would ask for, at this village, at this standing. */
export function demandedWage(shinobi, reputation, max = STANDING_WAGE_MAX) {
  return Math.round(baseWage(shinobi) * standingMultiplier(reputation, max))
}

/**
 * One month's movement of a contract toward its demanded level.
 * Only ever moves upward: a renowned village cannot quietly cut wages back
 * when reputation dips, which is what makes losing standing survivable.
 */
export function wageStep(current, demanded, rate = WAGE_DRIFT_RATE) {
  const cur = n(current)
  const dem = n(demanded)
  if (dem <= cur) return cur
  const step = Math.max(WAGE_DRIFT_MIN, Math.round((dem - cur) * rate))
  return Math.min(dem, cur + step)
}

/**
 * Review the whole roster. Returns the new salaries plus a summary, and does
 * not mutate — the caller applies it, so this stays testable.
 */
export function reviewWages(shinobi, reputation, rate = WAGE_DRIFT_RATE, max = STANDING_WAGE_MAX) {
  const roster = Array.isArray(shinobi) ? shinobi : []
  const changes = []
  let before = 0, after = 0
  for (const s of roster) {
    const cur = n(s.salary)
    const dem = demandedWage(s, reputation, max)
    const next = wageStep(cur, dem, rate)
    before += cur
    after += next
    if (next !== cur) changes.push({ id: s.id, from: cur, to: next, demanded: dem })
  }
  return {
    changes,
    payrollBefore: before,
    payrollAfter: after,
    delta: after - before,
    multiplier: standingMultiplier(reputation, max),
  }
}
