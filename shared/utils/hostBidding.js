/**
 * Adept Exam host bidding (R6) — activates the dormant `examHosting` flag. Once an
 * exam is scheduled, an eligible village (prestige C+) can bid ryo for the right to
 * host: home-crowd edge in the bracket (already wired) plus hosting gate revenue.
 * Rival villages bid against you based on their strength. Pure + deterministic
 * (rolls injected) for unit tests.
 */

export const HOST_MIN_BID = { C: 5000, B: 8000, A: 12000, S: 18000 }
export const HOST_REVENUE = { C: 9000, B: 13000, A: 19000, S: 27000 }

export function isHostEligible(tier) {
  return ['C', 'B', 'A', 'S'].includes(tier)
}

export function minHostBid(tier) {
  return HOST_MIN_BID[tier] || 5000
}

// Hosting gate revenue scales with the village's prestige (bigger crowd).
export function hostRevenue(tier) {
  return HOST_REVENUE[tier] || 9000
}

// Rival bids scale with village strength, with noise. `roll` is injected (0..1).
export function genRivalHostBids(rivals, roll = Math.random) {
  return (rivals || []).map(v => ({
    name: v.n,
    bid: Math.round((v.str || 50) * 120 * (0.7 + roll() * 0.6)),
  }))
}

// Prestige gives the host nation a small home-advantage weight on the bid.
export const PRESTIGE_HOST_WEIGHT = { C: 0.05, B: 0.10, A: 0.15, S: 0.22 }

/**
 * Resolve whether the player's bid wins host rights: highest effective bid wins,
 * where the player's bid is lifted by their prestige home-weight.
 * @returns { won, playerEffective, topRival }
 */
export function hostBidResolve(playerBid, rivalBids, prestigeTier) {
  const weight = PRESTIGE_HOST_WEIGHT[prestigeTier] || 0
  const effective = Math.round(playerBid * (1 + weight))
  const topRival = (rivalBids || []).reduce((m, r) => Math.max(m, r.bid || 0), 0)
  return { won: effective >= topRival, playerEffective: effective, topRival }
}
