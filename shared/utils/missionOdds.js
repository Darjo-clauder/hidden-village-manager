/**
 * Per-rank mission success ceiling (risk floors).
 * High-rank missions cap below 1.0 so elite content keeps tension even for
 * overpowered squads; routine missions retain the standard 0.97 ceiling.
 */
export function successCeiling(rank) {
  if (rank === 'S') return 0.85
  if (rank === 'A') return 0.90
  return 0.97
}
