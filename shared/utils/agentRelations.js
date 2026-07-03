/**
 * Agent relationships (R12) — persistent standing between your village and the
 * intermediaries who represent high-rank talent. Standing (0–100) rises when you
 * sign or reward their clients and falls when you renege, lowball, or poach. It
 * shifts their fee cut and, at the top tier, earns first-refusal tips on their
 * other clients. Pure + deterministic so the numbers can be unit-tested.
 */

// Ordered high → low; standingTier() returns the first whose `min` is met.
export const AGENT_TIERS = [
  { min: 80, id: 'trusted', label: 'Trusted', color: '#8fbc8f', feeAdj: -4, tip: true,  desc: 'Tips you off first on their other clients.' },
  { min: 60, id: 'warm',    label: 'Warm',    color: '#a9d0a9', feeAdj: -2, tip: false, desc: 'Deals go smoothly; a small discount on the cut.' },
  { min: 40, id: 'neutral', label: 'Neutral', color: '#9a9080', feeAdj: 0,  tip: false, desc: 'A professional, arms-length relationship.' },
  { min: 20, id: 'wary',    label: 'Wary',    color: '#f0a030', feeAdj: 2,  tip: false, desc: 'Burned before — they pad their cut.' },
  { min: 0,  id: 'hostile', label: 'Hostile', color: '#f66',    feeAdj: 4,  tip: false, desc: 'Bad blood; expect the worst terms.' },
]

export function standingTier(standing) {
  const s = standing ?? 50
  return AGENT_TIERS.find(t => s >= t.min) || AGENT_TIERS[AGENT_TIERS.length - 1]
}

// Fee cut after the standing adjustment, floored so it never goes free.
export function effectiveFeePercent(baseFeePercent, standing) {
  return Math.max(2, Math.round((baseFeePercent || 0) + standingTier(standing).feeAdj))
}

// Standing deltas per interaction.
export const STANDING_EVENTS = {
  signed_client:  8,   // did business — good faith
  exceeded_offer: 12,  // paid over the odds for their client
  declined_polite: -1, // walked away cleanly
  lowballed:      -5,   // insulting offer
  reneged:        -12,  // broke a deal / promise
  poached:        -6,   // took their client without going through them
}

const _clamp = v => Math.max(0, Math.min(100, v))

export function adjustStanding(standing, event) {
  return _clamp((standing ?? 50) + (STANDING_EVENTS[event] || 0))
}
