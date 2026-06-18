/**
 * #11 Pairwise support events (scaffold, behind _ff_supportEvents).
 * Bond-typed vignettes that can fire when a bonded pair deploys together (FE-style).
 * Pure selection helper; surfacing/wiring into the inbox awaits sign-off on cadence.
 * Effect magnitudes are tunable feel-parameters.
 */
export const SUPPORT_EVENTS = {
  'Brothers-in-Arms': [{ id: 'bia_trust', text: '{a} and {b} cover each other flawlessly under fire.', moraleMod: 4 }],
  'Mentor/Student':   [{ id: 'ms_lesson', text: '{a} passes hard-won wisdom to {b} after the mission.', growthMod: 0.04 }],
  'Rivals':           [{ id: 'riv_spar', text: '{a} and {b} push each other through a brutal sparring session.', successMod: 0.03 }],
  'Battle-Scarred':   [{ id: 'bs_vigil', text: '{a} and {b} keep a quiet vigil for those they lost.', moraleMod: 3 }],
}

/** Deterministic pick (inject rng for tests). Returns null for unknown/empty type. */
export function pickSupportEvent(bondType, rng = Math.random) {
  const pool = SUPPORT_EVENTS[bondType]
  if (!pool || !pool.length) return null
  return pool[Math.floor(rng() * pool.length)]
}
