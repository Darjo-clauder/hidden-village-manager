/**
 * Depth-chart pressure — the opportunity cost of a lineup choice.
 *
 * Reuses the existing `workload` field (already tracked per-shinobi, already fed
 * by missions/matches and training focus) as the single opportunity signal.
 * Bench players who sit idle lose development speed (no reps to grow from);
 * starters run into the ground the same way (no bandwidth left to absorb
 * coaching amid the grind). Only the healthy middle band develops at full rate.
 *
 * Pure — no G references. Caller reads s.workload and applies the growth mod.
 */

export const OPPORTUNITY_BANDS = [
  { max: 15,  label: 'Rusty',      color: '#87ceeb', growthMod: 0.5,  note: 'Not getting reps — development has stalled.' },
  { max: 76,  label: 'Match Sharp', color: '#8fbc8f', growthMod: 1.0,  note: 'Healthy rotation — developing at full rate.' },
  { max: 101, label: 'Overworked', color: '#f0a030', growthMod: 0.7,  note: 'Running on empty — too little left to absorb coaching.' },
]

/** Returns the opportunity band for a given workload (0-100). */
export function opportunityBand(workload) {
  const w = Math.min(Math.max(workload ?? 0, 0), 100)
  return OPPORTUNITY_BANDS.find(b => w < b.max) ?? OPPORTUNITY_BANDS[OPPORTUNITY_BANDS.length - 1]
}

/** Multiplier applied to the monthly stat-growth roll chance. */
export function opportunityGrowthMod(workload) {
  return opportunityBand(workload).growthMod
}
