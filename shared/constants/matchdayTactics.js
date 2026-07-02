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

export const TACTIC_STRONG_MOD = 0.08   // effective-strength mult bonus on a good read
export const TACTIC_WEAK_MOD = -0.04    // penalty on a bad read (upside > downside by design)

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
