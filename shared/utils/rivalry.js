/**
 * Rivalry — all-time head-to-head records and the yearly derby rival.
 *
 * H2H: every league fixture the player contests accumulates into G.h2h
 * (keyed by rival name), giving fixtures a history beyond one season.
 *
 * Derby: each January the most hostile rival (low relations, hot grudge) is
 * designated the derby rival for the year. Derby fixtures carry extra morale/
 * reputation swing and feed the press — the fixture you circle on the calendar.
 *
 * Pure helpers; no G access. Unit-tested.
 */

/**
 * Fold one played match into the all-time H2H ledger (player's perspective).
 * `match` is a playMatchday result: { a, b, winner, scoreA, scoreB } with
 * winner = village name or null for a draw. Mutates `h2h`; returns the
 * updated { w, d, l } record vs that opponent, or null if the player didn't play.
 */
export function updateH2H(h2h, playerName, match) {
  if (!match || (match.a !== playerName && match.b !== playerName)) return null
  const opp = match.a === playerName ? match.b : match.a
  if (!h2h[opp]) h2h[opp] = { w: 0, d: 0, l: 0 }
  const rec = h2h[opp]
  if (match.winner == null) rec.d++
  else if (match.winner === playerName) rec.w++
  else rec.l++
  return rec
}

/** All-time record vs an opponent, or null if never met. */
export function h2hRecord(h2h, opp) {
  return h2h?.[opp] || null
}

/**
 * Pick the derby rival: the village the barracks most wants beaten.
 * Hostility score = (100 − relations) + grudgeTicks × 5, with a stickiness
 * bonus for the incumbent so the derby doesn't flap year to year.
 * Returns the village object or null.
 */
export function pickDerbyRival(villages, prevDerby = null) {
  if (!villages?.length) return null
  let best = null, bestScore = -Infinity
  for (const v of villages) {
    let score = (100 - (v.rel ?? 50)) + (v.grudgeTicks || 0) * 5
    if (v.n === prevDerby) score += 15
    if (score > bestScore) { bestScore = score; best = v }
  }
  return best
}

/** Compact "5W–1D–3L all-time" label, or null if no history. */
export function h2hLabel(h2h, opp) {
  const r = h2hRecord(h2h, opp)
  if (!r || (r.w + r.d + r.l) === 0) return null
  return `${r.w}W–${r.d}D–${r.l}L all-time`
}
