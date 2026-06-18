/**
 * Composite "strain" score (Darkest-Dungeon-style stress, 0..100) derived from
 * EXISTING simulated state — no new sim. Higher = closer to breakdown/transfer.
 * Aggregates low commitment, low morale, workload, and accumulated trauma.
 */
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)

export function computeStrain(s = {}) {
  const commit = s.commitment ?? 70
  const morale = s.indMorale ?? 70
  const workload = clamp(s.workload ?? 0, 0, 100)
  const traumaCount = (s.traumaHistory && s.traumaHistory.length) || 0
  const raw =
    (100 - commit) * 0.4 +
    (100 - morale) * 0.3 +
    workload * 0.2 +
    clamp(traumaCount * 8, 0, 40) * 0.1
  return Math.round(clamp(raw, 0, 100))
}

export function strainBand(strain) {
  if (strain >= 75) return { label: 'Breaking', color: '#f66' }
  if (strain >= 50) return { label: 'At Risk',  color: '#f0a030' }
  if (strain >= 25) return { label: 'Strained', color: '#c9a84c' }
  return { label: 'Calm', color: '#8fbc8f' }
}
