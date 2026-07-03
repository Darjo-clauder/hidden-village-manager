/**
 * Rival disruption operations — covert action against a rival village that
 * bites into their league form.
 *
 * A successful op shaves a rival's strength (so they slip in the standings and
 * play weaker fixtures) at the cost of ryo and relations, with war risk on a
 * botched job. The target's village identity matters: a Fortress is disciplined
 * and hard to disrupt, a Blitz is chaotic and easier to catch off guard — so
 * the same op that identity shapes on the pitch also shapes off it.
 *
 * Pure helpers; no G access. Unit-tested.
 */

export const RIVAL_OP_COST = 3000

// Per-style resistance to disruption (added to/subtracted from success chance).
const STYLE_RESIST = {
  fortress: -0.12,     // disciplined, hard to catch
  grinder: -0.05,
  balanced: 0,
  opportunist: 0.03,
  blitz: 0.10,         // chaotic, exposed
}

/**
 * Success chance for a disruption op.
 * @param playerStrength  your village strength (10–200 band)
 * @param rivalStrength   target strength (same band)
 * @param rivalStyle      target identity style id
 * @param espionageBonus  flat additive from Warden espionage / intel (0–0.25ish)
 * @returns clamped [0.1, 0.9] probability
 */
export function opSuccessChance(playerStrength, rivalStrength, rivalStyle, espionageBonus = 0) {
  const edge = ((playerStrength || 50) - (rivalStrength || 50)) / 300   // ±0.5 across the band
  const base = 0.5 + edge + (STYLE_RESIST[rivalStyle] || 0) + espionageBonus
  return Math.max(0.1, Math.min(0.9, base))
}

/**
 * Effect of an op resolution on the target.
 * Success: strength drop (bigger vs weaker targets), relations hit, threat up.
 * Failure: exposed — a larger relations hit, no strength change.
 * @returns { strengthDelta, relDelta, threatDelta }
 */
export function opEffect(success, rng = Math.random) {
  if (success) {
    return { strengthDelta: -(5 + Math.floor(rng() * 6)), relDelta: -8, threatDelta: 6 }
  }
  return { strengthDelta: 0, relDelta: -14, threatDelta: 10 }
}
