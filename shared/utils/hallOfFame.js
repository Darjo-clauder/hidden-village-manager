/**
 * Hall of Fame — career-legacy induction.
 *
 * When a shinobi leaves the active roster (retirement or death), their career
 * is weighed against Hall-of-Fame thresholds. Inductees are recorded in
 * G.hallOfFame and resurface at ceremonies/alumni events — the payoff end of
 * the youth → prime → legend arc (a Youth Cup winner who becomes a village
 * legend closes the loop the academy opens).
 *
 * Pure helpers; no G access. Unit-tested.
 */

/**
 * Career weight. Missions are the spine; S-ranks, championships, youth-cup
 * pedigree, and long service add prestige.
 */
export function hofScore(s) {
  if (!s) return 0
  return (s.wins || 0)
    + (s.winsS || 0) * 8
    + (s.champions || 0) * 15          // Grand Tournament titles, if tracked
    + (s.youthCupWins || 0) * 6
    + Math.floor((s.months || 0) / 12) * 2
    + (s.legendStatus ? 20 : 0)
}

/** Induction threshold — a genuinely exceptional career, not every veteran. */
export const HOF_THRESHOLD = 70

export function isHofWorthy(s) {
  return hofScore(s) >= HOF_THRESHOLD
}

/** One-line citation summarizing why they're in. */
export function inductionReason(s) {
  const bits = []
  if ((s.wins || 0) > 0) bits.push(`${s.wins} missions`)
  if ((s.winsS || 0) > 0) bits.push(`${s.winsS} S-rank`)
  if ((s.youthCupWins || 0) > 0) bits.push(`Youth Cup winner`)
  if ((s.champions || 0) > 0) bits.push(`${s.champions} tournament title${s.champions !== 1 ? 's' : ''}`)
  const yrs = Math.floor((s.months || 0) / 12)
  if (yrs >= 8) bits.push(`${yrs} years of service`)
  return bits.length ? bits.join(' · ') : 'a distinguished career'
}

/**
 * Build a Hall-of-Fame record from a departing shinobi.
 * `how` = 'retired' | 'fallen'. Caller supplies the current year.
 */
export function buildHofEntry(s, how, year) {
  return {
    id: s.id,
    name: (s.fn || '') + ' ' + (s.ln || ''),
    rankIndex: s.ri || 0,
    clan: s.clan || null,
    score: hofScore(s),
    reason: inductionReason(s),
    how,                 // 'retired' | 'fallen'
    year,
    wins: s.wins || 0,
    winsS: s.winsS || 0,
  }
}
