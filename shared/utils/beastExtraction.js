/**
 * Beast extraction arc (R15) — makes the dormant "rival-held primal" display
 * playable. Mounting an extraction is a three-stage operation (Intel → Infiltration
 * → Extraction) against the holding village; each stage's odds turn on your strength
 * vs theirs, and failing — especially deep in — risks open war. Pure + deterministic
 * (rolls injected) so the odds are unit-tested; the panel drives it.
 */

const _clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export const EXTRACTION_STAGES = ['Intel Gathering', 'Infiltration', 'Extraction']

// Success odds for a stage: strength ratio, tilted harder for the later stages.
export function stageSuccessChance(stageIndex, playerStrength, holderStrength) {
  const ratio = playerStrength / Math.max(1, playerStrength + holderStrength)
  const base = [0.62, 0.52, 0.44][stageIndex] ?? 0.5
  return _clamp(base + (ratio - 0.5) * 0.7, 0.1, 0.92)
}

// Chance a failed stage provokes the holder into open war — rises the deeper you are.
export function warRiskOnFail(stageIndex) {
  return [0.15, 0.35, 0.60][stageIndex] ?? 0.3
}

// Ryo cost to mount the operation, scaling with the holder's strength.
export function extractionCost(holderStrength) {
  return 4000 + Math.round((holderStrength || 50) * 60)
}

// Relationship hit with the holder for daring the raid (win or lose).
export const EXTRACTION_REL_HIT = 20
