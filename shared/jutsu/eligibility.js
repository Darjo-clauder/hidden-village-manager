/**
 * Jutsu eligibility — can this shinobi learn this technique yet?
 *
 * Extracted from the filter inside checkJutsu() so it can be tested directly
 * and, more importantly, so a technique can offer MORE THAN ONE WAY IN.
 *
 * WHY THAT MATTERS. Three rare jutsu — the top-tier bloodline eyes — required
 * `prodigy: true` and membership of one clan in seventeen. The depth sweep
 * measured the result end to end: about one prodigy reaches a roster per 4,000
 * prospects, and across 160 village-years not one of the three was ever
 * learned. They were, functionally, dead text.
 *
 * So a jutsu may now declare `altReq`: a second, independent requirement set.
 * Meet EITHER and you are eligible. The prodigy path stays exactly as it was —
 * the birth-lottery shortcut — and a long enough career in the right clan now
 * reaches the same place. The clan lock is untouched either way.
 *
 * Pure. No G access. Unit-tested.
 */

/**
 * Does a shinobi satisfy one requirement block?
 * An empty/absent block is satisfied by everyone — that is how the
 * combined-element signatures (gated by the element itself) pass through.
 */
export function meetsReq(s, req) {
  if (!req) return false
  if (req.winsB && (s?.winsB || 0) < req.winsB) return false
  if (req.winsS && (s?.winsS || 0) < req.winsS) return false
  if (req.wins && (s?.wins || 0) < req.wins) return false
  if (req.prodigy && !s?.prodigy) return false
  return true
}

/**
 * Full eligibility for one jutsu: clan lock, not already known, and either
 * requirement set satisfied.
 */
export function jutsuEligible(s, j) {
  if (!s || !j) return false
  if ((s.jutsu || []).includes(j.id)) return false
  if (j.clan && s.clan !== j.clan) return false
  return meetsReq(s, j.req) || (!!j.altReq && meetsReq(s, j.altReq))
}

/** Every jutsu this shinobi could learn right now. */
export function eligibleJutsu(s, jutsuList) {
  return (jutsuList || []).filter(j => jutsuEligible(s, j))
}
