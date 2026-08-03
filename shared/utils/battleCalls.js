/**
 * Live-battle micro-call — the one moment the player is present for a result
 * instead of reading about it afterwards.
 *
 * ORIGINALLY this could never change win/loss: the engine decided the mission,
 * and the call only moved the quality band and the rewards. That made the
 * battle viewer a cutscene over a fixed result, which is why the game read as
 * "pick a dial, wait, read a report" even after four depth passes — every pass
 * added inputs, none added presence (docs/LOOP_ANALYSIS_2026-08-03.md).
 *
 * It can now SALVAGE a close defeat. The asymmetry is deliberate and load-
 * bearing:
 *
 *   loss → win   allowed, when the margin was one beat and the player
 *                committed reserves and won the final contested beat
 *   win  → loss  NEVER — reversing a win would mean retroactively killing
 *                someone the player has already been told survived
 *
 * A salvage does not undo what the defeat cost. Anyone wounded or lost in the
 * earlier beats stays wounded or lost; the player rescues the objective, not
 * the squad. That keeps the comeback from being free, and keeps the memorial
 * honest.
 *
 * Committing is still a gamble: on a close defeat where the final beat is also
 * lost, the existing overcommit penalty applies instead.
 *
 * Pure + deterministic — the caller supplies the beat outcome, so the stakes
 * are unit-testable and no new randomness enters the sim.
 */

export const BATTLE_CALLS = [
  { id: 'commit',    label: 'Commit Reserves', icon: '⚔', desc: 'Throw everything at the final push — a clutch finish if it lands, ragged if it fails.' },
  { id: 'disengage', label: 'Disengage',        icon: '🛡', desc: 'Play it safe and lock in the result — no swing either way.' },
]

// One step better / worse within the SAME success side (success: narrow↔decisive,
// failure: disaster↔costly). A call can never cross the success/failure line.
const BETTER = { disaster: 'costly',   costly: 'costly',    narrow: 'decisive', decisive: 'decisive' }
const WORSE  = { disaster: 'disaster', costly: 'disaster',  narrow: 'narrow',   decisive: 'narrow' }

/** Beat margin within which a defeat is close enough to be stolen back. */
export const SALVAGE_MARGIN = 1

/**
 * Was this defeat close enough that committing reserves could steal it?
 * @param succeeded  the engine's result
 * @param margin     beats won minus beats lost
 */
export function isSalvageable(succeeded, margin) {
  if (succeeded) return false
  const m = Number(margin)
  // Must be a REAL defeat margin. A three-phase mission loses by 1 or by 3, so
  // only -1 qualifies. Requiring m < 0 also means an omitted or unknown margin
  // (defaulting to 0) can never accidentally salvage — the earlier version
  // treated the default as "close" and would have flipped any caller that
  // forgot to pass one.
  if (!Number.isFinite(m) || m >= 0) return false
  return m >= -SALVAGE_MARGIN
}

/**
 * Resolve the micro-call.
 * @param call        'commit' | 'disengage' | 'none' (timeout)
 * @param pivotalWon  whether the final (bet-on) beat is won
 * @param succeeded   the engine's result going in
 * @param baseQuality the engine's quality band before the call
 * @param margin      beats won minus beats lost, for the salvage window
 * @returns { call, kind, quality, ryoMult, legendDelta, moraleDelta, label, note,
 *            succeeded, flipped }
 *          `succeeded` is the result AFTER the call; `flipped` marks a salvage.
 *          ryoMult multiplies the mission payout (bonus if +, penalty if −).
 */
export function resolveBattleCall({ call, pivotalWon, succeeded, baseQuality, margin = 0 }) {
  const q = baseQuality || (succeeded ? 'narrow' : 'costly')
  const keep = { succeeded: !!succeeded, flipped: false }

  if (call === 'commit') {
    if (pivotalWon) {
      // The comeback: a close defeat, reserves thrown in, final beat won.
      if (isSalvageable(succeeded, margin)) {
        return { call, kind: 'salvage', quality: 'narrow',
          ryoMult: 0, legendDelta: 4, moraleDelta: 4,
          succeeded: true, flipped: true,
          label: 'Snatched from defeat',
          note: 'The reserves turned it at the last moment. The objective holds — though it cost what it cost.' }
      }
      return { call, kind: 'clutch', quality: BETTER[q] || q,
        ryoMult: 0.15, legendDelta: 2, moraleDelta: 2, ...keep,
        label: 'Clutch finish', note: 'Reserves committed at the decisive moment — and it paid off.' }
    }
    return { call, kind: 'overcommit', quality: WORSE[q] || q,
      ryoMult: -0.08, legendDelta: 0, moraleDelta: -3, ...keep,
      label: 'Overcommitted', note: 'The reserves overreached and were caught out at the last.' }
  }
  // disengage / timeout / none — lock in the result, no swing.
  return { call: call || 'disengage', kind: 'safe', quality: q,
    ryoMult: 0, legendDelta: 0, moraleDelta: 0, ...keep,
    label: 'Measured finish', note: 'Your squad held position and locked in the result.' }
}

/**
 * Which beat the player bets on: the final contested beat. Returns -1 when the
 * report is too short to offer a call (need at least one beat before the bet).
 */
export function callBeatIndex(phases) {
  return (phases && phases.length >= 2) ? phases.length - 1 : -1
}
