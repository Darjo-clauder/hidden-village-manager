/**
 * #12 Optional debt/overdraft mechanic (scaffold, behind _ff_debt).
 * When treasury goes negative, accrue interest instead of flooring at 0.
 * OPTIONAL feature — interest rate is a tunable feel-parameter awaiting sign-off.
 */
export const DEBT_INTEREST = 0.05 // monthly interest on a negative balance

/**
 * @returns {{ ryo, debt, interestCharged }} — ryo unchanged if solvent.
 */
export function applyDebt(ryo, { interest = DEBT_INTEREST } = {}) {
  if (!Number.isFinite(ryo) || ryo >= 0) return { ryo, debt: 0, interestCharged: 0 }
  const owed = -ryo
  const interestCharged = Math.round(owed * interest)
  return { ryo: ryo - interestCharged, debt: owed + interestCharged, interestCharged }
}
