/**
 * Populace support (R27) — a civilian/fan support meter (0-100), distinct from
 * shinobi morale. It reacts to results and the treasury, feeds gate revenue, and
 * at the extremes triggers festivals (high) or unrest (low). Pure + deterministic
 * so the numbers can be unit-tested; adv.js owns the events + revenue hook.
 */

const _clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Monthly support shift from how the season and economy are going.
export function supportDelta({ wonThisMonth = false, lostBadly = false, title = false, derbyWin = false, derbyLoss = false, treasuryDeficit = false, treasurySurplus = false } = {}) {
  let d = 0
  if (wonThisMonth) d += 2
  if (lostBadly) d -= 2
  if (title) d += 10
  if (derbyWin) d += 4
  if (derbyLoss) d -= 4
  if (treasuryDeficit) d -= 1
  if (treasurySurplus) d += 1
  return d
}

export const SUPPORT_TIERS = [
  { min: 80, id: 'adoring',    label: 'Adoring',    color: '#8fbc8f' },
  { min: 55, id: 'content',    label: 'Content',    color: '#c9a84c' },
  { min: 30, id: 'uneasy',     label: 'Uneasy',     color: '#f0a030' },
  { min: 0,  id: 'discontent', label: 'Discontent', color: '#f66' },
]

export function supportTier(support) {
  const v = support ?? 60
  return SUPPORT_TIERS.find(t => v >= t.min) || SUPPORT_TIERS[SUPPORT_TIERS.length - 1]
}

// Gate-revenue multiplier: 0.90 (discontent) → 1.15 (adoring), ~1.0 around content.
export function revenueMult(support) {
  return Math.round((0.9 + _clamp(support ?? 60, 0, 100) / 100 * 0.25) * 100) / 100
}

export function applySupport(support, delta) {
  return _clamp((support ?? 60) + delta, 0, 100)
}

export const FESTIVAL_THRESH = 85
export const UNREST_THRESH = 20
