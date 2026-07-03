/**
 * Sponsor negotiation + mood (R14) — deepens the accept/decline sponsorship into a
 * short negotiation (push for more pay, or trade pay to ease their clause) and a
 * living relationship: an active sponsor's mood reacts to results and obligation,
 * shifting the monthly payout and eventually renewal. Pure + deterministic (rolls
 * are passed in) so the numbers can be unit-tested.
 */

const _clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export const NEGOTIATE_TACTICS = [
  { id: 'accept',     label: 'Accept terms',  icon: '🤝', desc: 'Take the deal as offered.' },
  { id: 'push_pay',   label: 'Push for more', icon: '💰', desc: 'Ask for a higher stipend — a weak hand risks them walking.' },
  { id: 'ease_terms', label: 'Ease the clause', icon: '📝', desc: 'Trade a lower stipend to drop their trade restriction.' },
]

/**
 * Resolve a negotiation tactic. `leverage` is 0..1 (prestige + reputation).
 * `roll` (0..1) is supplied by the caller so this stays deterministic.
 * @returns { outcome: 'accept'|'counter'|'walk', deal? }
 */
export function negotiate(offer, tactic, leverage = 0.3, roll = Math.random()) {
  const base = { ...offer, negotiated: true }
  const lev = _clamp(leverage, 0, 1)
  if (tactic === 'push_pay') {
    const win = 0.25 + lev * 0.55
    if (roll < win) return { outcome: 'accept', deal: { ...base, monthlyRyo: Math.round(offer.monthlyRyo * 1.25) } }
    if (roll < win + 0.35) return { outcome: 'counter', deal: { ...base, monthlyRyo: Math.round(offer.monthlyRyo * 1.10) } }
    return { outcome: 'walk' }   // insulted — offer withdrawn
  }
  if (tactic === 'ease_terms') {
    const win = 0.55 + lev * 0.35
    if (roll < win) return { outcome: 'accept', deal: { ...base, monthlyRyo: Math.round(offer.monthlyRyo * 0.82), restrictedVillage: null, obligation: (offer.obligation || 'None') + ' (clause eased)' } }
    return { outcome: 'counter', deal: { ...base, monthlyRyo: Math.round(offer.monthlyRyo * 0.90), restrictedVillage: null, obligation: (offer.obligation || 'None') + ' (clause eased)' } }
  }
  return { outcome: 'accept', deal: base }
}

// Monthly mood shift from how the village is doing for the sponsor.
export function sponsorMoodDelta({ obligationMet = true, seasonWin = false, title = false, derbyWin = false, lowMorale = false } = {}) {
  let d = obligationMet ? 1 : -8
  if (seasonWin) d += 2
  if (title) d += 8
  if (derbyWin) d += 3
  if (lowMorale) d -= 2
  return d
}

// Payout multiplier from mood: 0.85 (displeased) → 1.15 (delighted), ~1.0 at 50.
export function moodPayoutMult(mood) {
  return Math.round((0.85 + _clamp(mood ?? 50, 0, 100) / 100 * 0.30) * 100) / 100
}

export const MOOD_TIERS = [
  { min: 75, id: 'delighted',  label: 'Delighted',  color: '#8fbc8f' },
  { min: 50, id: 'satisfied',  label: 'Satisfied',  color: '#c9a84c' },
  { min: 25, id: 'restless',   label: 'Restless',   color: '#f0a030' },
  { min: 0,  id: 'displeased', label: 'Displeased', color: '#f66' },
]

export function moodTier(mood) {
  const m = mood ?? 50
  return MOOD_TIERS.find(t => m >= t.min) || MOOD_TIERS[MOOD_TIERS.length - 1]
}

// A sponsor whose mood collapses walks away.
export const SPONSOR_QUIT_MOOD = 10

export function applyMoodDelta(mood, delta) {
  return _clamp((mood ?? 50) + delta, 0, 100)
}
