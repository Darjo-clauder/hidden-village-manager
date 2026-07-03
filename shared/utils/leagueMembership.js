/**
 * Dynamic league membership — the world evolves across a dynasty.
 *
 * A great village that collapses for years running is relegated out of the
 * league, and the strongest risen minor nation takes its place with a full
 * generated roster. Over a 30-year dynasty the five great powers are no longer
 * fixed — a fallen dynasty can vanish and an upstart can arrive. This is the
 * long-game texture no competitor in the niche has.
 *
 * These are the pure decision helpers; adv.js owns the roster/table mutation.
 * Unit-tested.
 */

// A village at/under this strength at year-end counts as a "collapse year".
export const COLLAPSE_STRENGTH = 34
// Consecutive collapse years before relegation is on the table.
export const COLLAPSE_YEARS = 3

/**
 * Next value of a village's consecutive-collapse counter given its year-end
 * strength. Resets to 0 once it recovers above the collapse line.
 */
export function nextDeclineYears(prev, strength, line = COLLAPSE_STRENGTH) {
  return (strength || 50) <= line ? (prev || 0) + 1 : 0
}

/** The weakest village eligible for relegation, or null if none qualifies. */
export function findRelegation(villages, years = COLLAPSE_YEARS) {
  const eligible = (villages || []).filter(v => (v.declineYears || 0) >= years)
  if (!eligible.length) return null
  return eligible.reduce((a, b) => ((b.strength || 50) < (a.strength || 50) ? b : a))
}

/**
 * The minor nation to promote: strongest tier-C not already in the league.
 * `strengthOf(nation)` supplies a comparable strength (e.g. minorStrength).
 * Returns the nation or null.
 */
export function pickPromotion(minorNations, currentNames, strengthOf) {
  const pool = (minorNations || []).filter(m => m.tier === 'C' && !currentNames.includes(m.n))
  if (!pool.length) return null
  return pool.reduce((a, b) => (strengthOf(b) > strengthOf(a) ? b : a))
}
