/**
 * Matchday tactics — the player's monthly counter-play against a rival's
 * village identity (see villageIdentity.js MATCH_STYLES).
 *
 * Rock-paper-scissors against the opponent's revealed style: each tactic is
 * STRONG into some styles (+8% effective strength) and WEAK into others (−4%).
 * Standard is the safe default. The pick persists month to month
 * (G.matchdayTactic) so it's a set-and-forget lever with a reason to revisit
 * every time the fixture list turns over.
 *
 * Pure data + helpers; no G access. Unit-tested.
 */

export const MATCHDAY_TACTICS = [
  {
    id: 'standard', label: 'Standard', icon: '⚖',
    strong: [], weak: [],
    desc: 'Play your own game. No matchup swing either way.',
  },
  {
    id: 'counter', label: 'Counter', icon: '🪞',
    strong: ['blitz'], weak: ['fortress'],
    desc: 'Absorb the storm and punish. Strong vs Blitz; toothless vs a Fortress that never over-commits.',
  },
  {
    id: 'control', label: 'Control', icon: '🧭',
    strong: ['opportunist', 'grinder'], weak: ['blitz'],
    desc: 'Dictate tempo and deny chaos. Strong vs Opportunists and Grinders; risks being overrun by a Blitz.',
  },
  {
    id: 'overwhelm', label: 'Overwhelm', icon: '🌊',
    strong: ['fortress'], weak: ['opportunist'],
    desc: 'Commit everything to cracking the wall. Strong vs a Fortress; feeds an Opportunist counter-punch.',
  },
]

export const TACTIC_BY_ID = Object.fromEntries(MATCHDAY_TACTICS.map(t => [t.id, t]))

// Matchup read. Deliberately smaller than the ±0.08/−0.04 it replaced: the read
// is now a modifier on a bet the player is making for their own reasons, not the
// whole decision. Upside still exceeds downside, so a wrong guess stays cheap.
export const TACTIC_STRONG_MOD = 0.06   // effective-strength mult bonus on a good read
export const TACTIC_WEAK_MOD = -0.03    // penalty on a bad read (upside > downside by design)

/**
 * RISK PROFILES — the part that makes this a decision rather than a lookup.
 *
 * Measured against the real 12-village field, the matchup read alone gave every
 * fixture exactly ONE correct answer worth a flat +8%: Control into
 * grinder/opportunist (5 of 12 villages), Overwhelm into fortress (3), Counter
 * into blitz (2), and no edge at all against the two balanced sides. Learn that
 * table once and the decision is over permanently — a memory test, not
 * management.
 *
 * So a tactic also shapes the DISTRIBUTION of the result:
 *
 *   varMult   scales the performance swing around 1.0. >1 widens (more wins
 *             AND more losses), <1 narrows (fewer of both).
 *   drawMult  scales the draw band. >1 grinds out draws.
 *
 * Under 3-1-0 scoring these pull against each other honestly: a draw is worth
 * 1, so narrowing variance banks points against stronger sides and throws them
 * away against weaker ones. The question stops being "which tactic is correct"
 * and becomes "what do I need from this match" — which the season state already
 * knows and already displays.
 *
 * Landed inert first (all 1.0) to prove the plumbing changed nothing; these are
 * the live values.
 */
export const TACTIC_PROFILES = {
  standard:  { varMult: 1.00, drawMult: 1.00 },
  counter:   { varMult: 0.90, drawMult: 1.15 },
  control:   { varMult: 0.75, drawMult: 1.50 },
  overwhelm: { varMult: 1.35, drawMult: 0.60 },
}

/**
 * Effective-strength modifier for a tactic into an opponent style.
 * Returns +0.08 (strong read), −0.04 (bad read) or 0.
 */
export function tacticMod(tacticId, oppStyle) {
  const t = TACTIC_BY_ID[tacticId]
  if (!t || !oppStyle) return 0
  if (t.strong.includes(oppStyle)) return TACTIC_STRONG_MOD
  if (t.weak.includes(oppStyle)) return TACTIC_WEAK_MOD
  return 0
}

/** 'strong' | 'weak' | 'neutral' — for UI hints on the picker. */
export function tacticRead(tacticId, oppStyle) {
  const m = tacticMod(tacticId, oppStyle)
  return m > 0 ? 'strong' : m < 0 ? 'weak' : 'neutral'
}

/** The risk profile for a tactic (always returns a usable one). */
export function tacticProfile(tacticId) {
  return TACTIC_PROFILES[tacticId] || TACTIC_PROFILES.standard
}

/**
 * Reshape a base match style by a tactic's risk profile.
 *
 * `varMult` scales the SPREAD around 1.0 rather than the endpoints, so a blitz
 * side playing Control is still more volatile than a fortress side playing it —
 * the tactic bends the village's character instead of overwriting it.
 *
 * Returns a params object for styleParams()/simMatch(), never a style id.
 */
export function applyTacticShape(baseParams, tacticId) {
  const p = tacticProfile(tacticId)
  const lo = baseParams.varLo ?? 0.7
  const hi = baseParams.varHi ?? 1.3
  return {
    ...baseParams,
    varLo: 1 - (1 - lo) * p.varMult,
    varHi: 1 + (hi - 1) * p.varMult,
    drawMult: (baseParams.drawMult ?? 1) * p.drawMult,
  }
}

/**
 * A plain-language read of what a tactic does to the shape of a result, for the
 * picker. The player should be choosing a bet, so the bet has to be legible.
 */
export function tacticShapeLabel(tacticId) {
  const p = tacticProfile(tacticId)
  const swing = p.varMult > 1.15 ? 'High swing' : p.varMult < 0.85 ? 'Low swing' : 'Even swing'
  const draws = p.drawMult > 1.2 ? 'draws likelier' : p.drawMult < 0.8 ? 'draws rarer' : 'draws typical'
  return `${swing} · ${draws}`
}
