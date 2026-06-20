/**
 * Salary cap — monthly payroll ceiling (shinobi wages + staff wages) by prestige tier.
 *
 * A village at prestige D can't afford to field a 50-man roster; reaching prestige S
 * unlocks the budget to do so. Overage is charged as a luxury tax (50 ryo/ryo over),
 * and a hard signing block activates when payroll exceeds 130% of cap.
 *
 * Cap amounts are calibrated against the wage scale in state.js:
 *   Genin 500 · Chunin 900 · Jonin 1300 · ANBU 1700 · S-Rank 2100  (ryo/month)
 */

/** Monthly payroll ceiling per prestige tier. */
export const SALARY_CAP = {
  D: 18_000,   // ~15 genin/chunin mix — early game is tight
  C: 38_000,   // ~25 shinobi + small staff
  B: 65_000,   // ~40 shinobi + full staff
  A: 100_000,  // ~48 shinobi + elite staff
  S: 150_000,  // ~50 elite shinobi + all staff roles
}

/** Ryo charged per ryo of payroll above the cap (applied monthly). */
export const LUXURY_TAX_RATE = 0.50

/**
 * Beyond this multiple of the cap, new signings are blocked.
 * e.g. 1.30 = 130 % → hard block at 30 % over.
 */
export const CAP_HARD_BLOCK_MULT = 1.30

/** Compute cap status for the current roster. */
export function capStatus(prestige, monthlyPayroll) {
  const cap = SALARY_CAP[prestige] ?? SALARY_CAP.D
  const overBy = Math.max(0, monthlyPayroll - cap)
  const luxuryTax = Math.round(overBy * LUXURY_TAX_RATE)
  const pct = cap > 0 ? monthlyPayroll / cap : 0
  const hardBlock = pct >= CAP_HARD_BLOCK_MULT
  const label = pct >= CAP_HARD_BLOCK_MULT ? 'HARD CAP' : pct >= 1 ? 'Over Cap' : pct >= 0.9 ? 'Near Cap' : 'Under Cap'
  const color = pct >= CAP_HARD_BLOCK_MULT ? '#f44' : pct >= 1 ? '#f66' : pct >= 0.9 ? '#fa0' : '#8fbc8f'
  return { cap, payroll: monthlyPayroll, overBy, luxuryTax, pct, hardBlock, label, color }
}
