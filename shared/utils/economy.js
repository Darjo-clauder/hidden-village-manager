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
