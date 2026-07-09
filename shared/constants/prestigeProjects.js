/**
 * Prestige projects — multi-year monuments that drain a dynasty's treasury for
 * lasting, non-monetary prestige.
 *
 * A 30-year economy sweep showed late-dynasty treasuries grow unbounded (rep
 * income outruns wage/staff costs). These projects are the missing sink: huge
 * up-front ryo, a build measured in years, and payoffs in legend / morale /
 * standing rather than more money — so wealth converts into permanence, not
 * a bigger pile of ryo.
 *
 * effect fields (all optional, applied while completed):
 *   moraleFloor  — raises the hard morale floor by N
 *   academyBoost — adds to effective academy level (student quality)
 *   defBonus     — flat village defense
 *   legend       — ONE-TIME legend award on completion
 *
 * Pure data + helpers; no G access. Unit-tested.
 */

export const PRESTIGE_PROJECTS = [
  { id: 'monument',   name: 'Grand Monument',   icon: '🗿', cost: 80000,  buildMonths: 24,
    desc: 'A towering memorial to the village. Lifts spirits for generations.',
    effect: { moraleFloor: 6, legend: 20 } },
  { id: 'spires',     name: 'Academy Spires',   icon: '🏫', cost: 110000, buildMonths: 30,
    desc: 'A world-class training complex. Every intake is sharper for it.',
    effect: { academyBoost: 2, legend: 15 } },
  { id: 'arena',      name: 'Grand Arena',      icon: '🏟', cost: 140000, buildMonths: 36,
    desc: 'A colossal arena. Home crowds and civic pride swell.',
    effect: { moraleFloor: 8, legend: 25 } },
  { id: 'bastion',    name: 'Great Bastion',    icon: '🏯', cost: 100000, buildMonths: 24,
    desc: 'Layered fortifications that make the village a fortress in fact.',
    effect: { defBonus: 30, legend: 15 } },
  { id: 'hall',       name: 'Hall of Heroes',   icon: '🏛', cost: 70000,  buildMonths: 18,
    desc: 'An eternal hall honouring the village\'s legends.',
    effect: { moraleFloor: 5, legend: 30 } },
  // ── Grand works — mega-tier sinks for a wealthy dynasty. Same machinery, costs
  // scaled to a treasury that has grown into the millions; the balloon has somewhere
  // to go beyond the five founding monuments. Long builds keep them a commitment.
  { id: 'skyspire',   name: 'The Sky Spire',    icon: '🗼', cost: 1500000, buildMonths: 48,
    desc: 'A spire visible from every border — the village made legend in stone.',
    effect: { moraleFloor: 10, legend: 80 } },
  { id: 'citadel',    name: 'Eternal Citadel',  icon: '🏰', cost: 3000000, buildMonths: 60,
    desc: 'An impregnable seat of power that will outlast every warden who raised it.',
    effect: { defBonus: 60, academyBoost: 2, legend: 120 } },
  { id: 'wonder',     name: 'The Great Wonder', icon: '🌌', cost: 6000000, buildMonths: 72,
    desc: 'A generational marvel spoken of across the nations for a hundred years.',
    effect: { moraleFloor: 14, academyBoost: 3, legend: 200 } },
]

// ── Grand Festival — a repeatable prestige sink with escalating cost ──────────
// Projects are one-shot; a treasury that keeps growing needs a sink that keeps
// taking. A festival converts a large lump of ryo into immediate legend + morale,
// and each one you throw costs more (1.6x per prior festival) — so the richer the
// dynasty, the bigger the bill for the same prestige. Convert-not-farm by design.
export const FESTIVAL_BASE_COST = 300000
export function festivalCost(timesHeld = 0) {
  return Math.round(FESTIVAL_BASE_COST * Math.pow(1.6, Math.max(0, timesHeld)))
}
// Flat prestige payoff; the rising cost is what makes legend-per-ryo diminish.
export function festivalReward() {
  return { legend: 15, morale: 8 }
}

export const PROJECT_BY_ID = Object.fromEntries(PRESTIGE_PROJECTS.map(p => [p.id, p]))

/** Sum a numeric effect key across a list of completed project ids. */
export function completedEffect(completedIds, key) {
  return (completedIds || []).reduce((sum, id) => sum + (PROJECT_BY_ID[id]?.effect?.[key] || 0), 0)
}

/** Fraction complete [0,1] for an in-progress build. */
export function buildProgress(build) {
  const def = PROJECT_BY_ID[build?.id]
  if (!def || !def.buildMonths) return 0
  return Math.max(0, Math.min(1, (build.monthsDone || 0) / def.buildMonths))
}

/** Can a project be started? Not already built, not already building, affordable. */
export function canStartProject(id, ryo, completedIds = [], buildingIds = []) {
  const def = PROJECT_BY_ID[id]
  if (!def) return false
  if (completedIds.includes(id) || buildingIds.includes(id)) return false
  return ryo >= def.cost
}
