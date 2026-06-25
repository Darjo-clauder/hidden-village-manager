/**
 * Economy snapshot math (mirrors adv.js end-of-month snapshot, docs/SIMULATION_MODELS.md §1).
 * PURE single-source-of-truth for income/expend/net so the formula can be asserted
 * deterministically and reused. Does NOT mutate G.ryo (that stays in adv.js).
 */
export function monthlySnapshot({
  trade = 0, contracts = 0, jinchuriki = 0, daimyo = 0,
  examFees = 0, loanFees = 0, sponsorship = 0,
  shinobiWages = 0, staffWages = 0, maintenance = 0,
} = {}) {
  const totalIncome = trade + contracts + jinchuriki + daimyo + examFees + loanFees + sponsorship
  const totalExpend = shinobiWages + staffWages + maintenance
  return { totalIncome, totalExpend, net: totalIncome - totalExpend }
}

/** I-ECON-1: treasury must remain a finite number after every tick. */
export function isFiniteRyo(ryo) {
  return Number.isFinite(ryo)
}

// Baseline village revenue — the franchise's "ticket revenue": civilian tax base +
// daimyo patronage, scaling with reputation and prestige. Single source of truth so
// the tick and the UI panels agree. Pure.
export const PRESTIGE_REVENUE = { D: 0, C: 4000, B: 9000, A: 15000, S: 24000 }
// Reputation revenue uses diminishing returns past a soft cap so a maxed-rep
// village doesn't run away with ~400k/mo. Below REP_SOFT_CAP it's the original
// linear 400/rep (early/mid game unchanged); above it, marginal rep is worth 25%.
export const REP_SOFT_CAP = 200
// Flat civilian tax floor every village earns regardless of rep/prestige. Sized so a
// fresh village (rep ~10, D prestige) carrying its seeded roster + starter staff runs
// the intended gentle deficit (~−7k/mo, ~8-month runway) rather than a steep one — the
// "perform-to-survive" pressure stays, but year-1 isn't a guaranteed bankruptcy. A flat
// bump only matters early; at high rep/prestige it's negligible and the soft cap below
// still bounds runaway wealth.
export const BASE_REVENUE = 28000
export function villageRevenue(reputation = 0, prestigeTier = 'D') {
  const base = Math.min(reputation, REP_SOFT_CAP) * 400
  const over = Math.max(0, reputation - REP_SOFT_CAP) * 100
  return Math.round(BASE_REVENUE + base + over + (PRESTIGE_REVENUE[prestigeTier] || 0))
}
