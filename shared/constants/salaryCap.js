/**
 * Salary cap — monthly SHINOBI payroll ceiling by prestige tier.
 *
 * Counts shinobi wages only. Staff salaries are village infrastructure (scouts,
 * sensei, council) and are EXEMPT — the cap governs how big a fighting roster you
 * can field, not your back office. (A default new village is seeded with 7 staff it
 * never chose; charging those against the cap put a fresh roster ~2× over its own
 * cap and bled a hidden luxury tax from turn 1.) The D cap sits just above the
 * starting roster so the early game is tight but legal; over-signing still bites.
 *
 * Overage is charged as a luxury tax (50 ryo/ryo over), and a hard signing block
 * activates when payroll exceeds 130% of cap.
 *
 * Cap amounts are calibrated against the wage scale in state.js:
 *   Genin 500 · Chunin 900 · Jonin 1300 · ANBU 1700 · S-Rank 2100  (ryo/month)
 */

/** Monthly shinobi-payroll ceiling per prestige tier. */
export const SALARY_CAP = {
  D: 24_000,   // ~starting 22-shinobi roster + a little headroom — early game is tight
  C: 38_000,   // ~25 shinobi
  B: 65_000,   // ~40 shinobi
  A: 100_000,  // ~48 shinobi
  S: 150_000,  // ~50 elite shinobi
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
