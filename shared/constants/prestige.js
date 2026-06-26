/**
 * Prestige tiers — the single source of truth for how a village's prestige is derived.
 *
 * Prestige is driven by LEGEND (not reputation): legend accrues from missions (per rank),
 * Grand Tournament / Chunin Exam wins, sealed beasts, monuments, and milestone events.
 * The tier gates salary-cap headroom (salaryCap.js) and baseline income (economy.js
 * PRESTIGE_REVENUE), so anything that models the economy — including the dynasty-sweep
 * harness — MUST derive prestige the same way the live tick does, or its verdict drifts
 * from reality. (It did: the harness previously proxied prestige off reputation with
 * invented thresholds.)
 */

/** Legend thresholds per prestige tier, ascending. Mirrors the live tick in adv.js. */
export const PRESTIGE_TIERS = [
  { id: 'D', min: 0 },
  { id: 'C', min: 50 },
  { id: 'B', min: 150 },
  { id: 'A', min: 300 },
  { id: 'S', min: 500 },
]

/** Resolve the prestige tier id for a given legend total. */
export function prestigeFromLegend(legend = 0) {
  return [...PRESTIGE_TIERS].reverse().find(t => (legend || 0) >= t.min)?.id || 'D'
}
