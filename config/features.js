/**
 * Feature flags for Phase 1 depth expansions.
 * Set a flag to false to disable the system without removing code.
 * Flags are read at runtime — no rebuild needed for server-side flags.
 */
export const FEATURES = {
  /** Academy hub: prospect listing, profiles, training plan UI */
  ACADEMY: true,

  /** Scouting network: scout assignment, ScoutReport generation */
  SCOUTING: true,

  /** Depth chart editor + auto-promotion on injury/absence */
  DEPTH_CHART: true,

  /** Mission templates: template-based generation + resolution stub */
  MISSION_TEMPLATES: true,
}

/**
 * Returns true only if the named feature is enabled.
 * @param {keyof typeof FEATURES} name
 */
export function isEnabled(name) {
  return FEATURES[name] === true
}
