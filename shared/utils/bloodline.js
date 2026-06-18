/**
 * Reference model for the proposed ACTIVE bloodline layer (v2, additive).
 * PURE — not wired into the game loop. When integrated it will sit behind
 * G._ff_bloodlineActive and fold effectiveBloodlineBonus() into the real `sc` mods.
 * Mirrors docs/SIMULATION_MODELS_V2.md §3 and scripts/bloodlineSweep.mjs.
 */
export const MAX_BLOODLINE_BONUS = 0.35
export const SOFTCAP_THRESHOLD = 0.5
export const ACTIVATION_COST = 3000     // ryo — sweep-derived sink (>= 1 mission's income)
export const ACTIVATION_MIN_STAGE = 3   // must be >= Coexistence to activate
export const ACTIVE_DURATION = 1        // months
export const COOLDOWN = 3               // months
export const AGGRO_INCREASE = 10
export const BLOODLINE_MULTIPLIER = 0.20  // per active beast; inside safe region 0.12–0.38
export const DEBUFF_DURATION = 2          // months of reduced effectiveness after channelling
export const DEBUFF_PCT = 0.05            // success penalty while debuffed

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)

/** Diminishing-returns softcap then global clamp. Guardrail against runaway scaling. */
export function effectiveBloodlineBonus(rawBonus, { threshold = SOFTCAP_THRESHOLD, max = MAX_BLOODLINE_BONUS } = {}) {
  if (!(rawBonus > 0)) return 0
  const soft = rawBonus / (1 + rawBonus / threshold)
  return clamp(soft, 0, max)
}

/** Sum effective bloodline bonus from a list of active beasts ({ multiplier }). Softcapped + clamped. */
export function activeBloodlineBonus(activeBeasts = []) {
  const raw = activeBeasts.reduce((a, b) => a + (b.multiplier || 0), 0)
  return effectiveBloodlineBonus(raw)
}

/** Net bloodline success mod: active bonus minus post-use debuff. Pure. */
export function netBloodlineMod(activeBeasts = [], anyDebuffed = false) {
  return activeBloodlineBonus(activeBeasts) - (anyDebuffed ? DEBUFF_PCT : 0)
}

/** Validate an activation attempt. Pure — returns { ok, reason }, mutates nothing. */
export function canActivate({
  stage = 0, ryo = 0, cooldownUntil = null, month = 0, squadActivations = 0,
  cost = ACTIVATION_COST, minStage = ACTIVATION_MIN_STAGE,
} = {}) {
  if (stage < minStage) return { ok: false, reason: 'not_synced' }
  if (cooldownUntil != null && month < cooldownUntil) return { ok: false, reason: 'cooldown' }
  if (ryo < cost) return { ok: false, reason: 'insufficient_ryo' }
  if (squadActivations >= 1) return { ok: false, reason: 'rate_limit' }
  return { ok: true, reason: null }
}
