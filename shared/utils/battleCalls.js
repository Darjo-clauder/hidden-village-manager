/**
 * Live-battle micro-call (R8) — one real decision mid-viewer that swings the
 * quality band and the rewards, but NEVER the win/loss. The engine has already
 * decided success/failure (resolveMission); the player only bets on the final
 * beat: commit reserves (high-variance) or disengage (safe). Pure + deterministic
 * so the stakes can be unit-tested; the viewer applies the returned deltas.
 */

export const BATTLE_CALLS = [
  { id: 'commit',    label: 'Commit Reserves', icon: '⚔', desc: 'Throw everything at the final push — a clutch finish if it lands, ragged if it fails.' },
  { id: 'disengage', label: 'Disengage',        icon: '🛡', desc: 'Play it safe and lock in the result — no swing either way.' },
]

// One step better / worse within the SAME success side (success: narrow↔decisive,
// failure: disaster↔costly). A call can never cross the success/failure line.
const BETTER = { disaster: 'costly',   costly: 'costly',    narrow: 'decisive', decisive: 'decisive' }
const WORSE  = { disaster: 'disaster', costly: 'disaster',  narrow: 'narrow',   decisive: 'narrow' }

/**
 * Resolve the micro-call.
 * @param call        'commit' | 'disengage' | 'none' (timeout)
 * @param pivotalWon  whether the final (bet-on) beat is won
 * @param succeeded   overall mission result (unchanged by the call)
 * @param baseQuality the engine's quality band before the call
 * @returns { call, kind, quality, ryoMult, legendDelta, moraleDelta, label, note }
 *          ryoMult multiplies the mission payout (bonus if +, penalty if −).
 */
export function resolveBattleCall({ call, pivotalWon, succeeded, baseQuality }) {
  const q = baseQuality || (succeeded ? 'narrow' : 'costly')
  if (call === 'commit') {
    if (pivotalWon) {
      return { call, kind: 'clutch', quality: BETTER[q] || q,
        ryoMult: 0.15, legendDelta: 2, moraleDelta: 2,
        label: 'Clutch finish', note: 'Reserves committed at the decisive moment — and it paid off.' }
    }
    return { call, kind: 'overcommit', quality: WORSE[q] || q,
      ryoMult: -0.08, legendDelta: 0, moraleDelta: -3,
      label: 'Overcommitted', note: 'The reserves overreached and were caught out at the last.' }
  }
  // disengage / timeout / none — lock in the result, no swing.
  return { call: call || 'disengage', kind: 'safe', quality: q,
    ryoMult: 0, legendDelta: 0, moraleDelta: 0,
    label: 'Measured finish', note: 'Your squad held position and locked in the result.' }
}

/**
 * Which beat the player bets on: the final contested beat. Returns -1 when the
 * report is too short to offer a call (need at least one beat before the bet).
 */
export function callBeatIndex(phases) {
  return (phases && phases.length >= 2) ? phases.length - 1 : -1
}
