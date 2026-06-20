/**
 * Adaptive rival AI.
 * Rivals observe the player's mission tendencies season-by-season and shift their strategy.
 * Pure — no G references. Caller passes extracted tendency data and village objects.
 */

export const COUNTER_STRATEGIES = {
  aggressive: {
    id: 'aggressive',
    label: 'Border Blitz',
    desc: "Sensing passivity, the rival floods the border with C/B-rank pressure.",
    strengthTickBonus: 1.5,
    matchdayMod: 5,
    scMod: 0,
    rivalEventBias: 'border_threat',
  },
  elite_wall: {
    id: 'elite_wall',
    label: 'Elite Wall',
    desc: "Rival elites have studied your A/S-rank teams. Their defenses are tailored.",
    strengthTickBonus: 0.8,
    matchdayMod: -5,
    scMod: -0.05,  // player A/S missions 5% harder
    rivalEventBias: 'diplomatic_win',
  },
  scout_study: {
    id: 'scout_study',
    label: 'Film Study',
    desc: "Rivals have catalogued your formation tendencies. The element of surprise is gone.",
    strengthTickBonus: 1.0,
    matchdayMod: -8,
    scMod: -0.03,
    rivalEventBias: 'srank_complete',
  },
  balanced: {
    id: 'balanced',
    label: 'Standard Doctrine',
    desc: "No dominant tendency detected. Rivals play their baseline game.",
    strengthTickBonus: 1.0,
    matchdayMod: 0,
    scMod: 0,
    rivalEventBias: null,
  },
}

/**
 * Record one player mission tactic into the running tendencies object.
 * @param {object} tendencies  G.rivalTendencies
 * @param {string} rank        D | C | B | A | S
 * @param {string} quality     decisive | narrow | costly | disaster
 * @param {boolean} isSquad
 */
export function recordPlayerTactic(tendencies, rank, quality, isSquad) {
  if (!tendencies) return
  tendencies.totalMissions  = (tendencies.totalMissions  || 0) + 1
  if (rank === 'A' || rank === 'S') {
    tendencies.eliteDeployments = (tendencies.eliteDeployments || 0) + 1
  }
  const isSuccess = quality === 'decisive' || quality === 'narrow'
  tendencies.successRun = isSuccess ? (tendencies.successRun || 0) + 1 : 0
  if (isSquad) tendencies.squadMissions = (tendencies.squadMissions || 0) + 1
}

/**
 * Derive the player's dominant tendency from accumulated data.
 * @param {object} tendencies  G.rivalTendencies
 * @returns {{ aggression: 'passive'|'elite'|'mixed', eliteRatio: number, consistency: number, total: number }}
 */
export function getPlayerTendency(tendencies) {
  const total      = Math.max(1, tendencies.totalMissions || 0)
  const eliteRatio = (tendencies.eliteDeployments || 0) / total
  const consistency = Math.min(1, (tendencies.successRun || 0) / 5)
  const aggression  = eliteRatio > 0.5 ? 'elite' : total < 5 ? 'passive' : 'mixed'
  return { aggression, eliteRatio, consistency, total }
}

/**
 * Pick the counter-strategy a rival should adopt given the player tendency.
 * Isolationist villages never adapt.
 * @param {object} village   rival village (has .personality)
 * @param {object} tendency  from getPlayerTendency
 * @returns {object} a COUNTER_STRATEGIES entry
 */
export function pickCounterStrategy(village, tendency) {
  if (village.personality === 'Isolationist') return COUNTER_STRATEGIES.balanced
  const { aggression, consistency } = tendency
  if (aggression === 'passive' && village.personality === 'Aggressive') return COUNTER_STRATEGIES.aggressive
  if (aggression === 'elite')   return COUNTER_STRATEGIES.elite_wall
  if (consistency >= 0.8)       return COUNTER_STRATEGIES.scout_study
  return COUNTER_STRATEGIES.balanced
}

/**
 * Apply a counter-strategy to a rival village (mutates village).
 * Returns { changed, strategy } so caller can queue a narrative blurb.
 */
export function applyCounterStrategy(village, tendency) {
  const strategy = pickCounterStrategy(village, tendency)
  const changed  = village.counterStrategy !== strategy.id
  village.counterStrategy     = strategy.id
  village.counterStrategyDesc = strategy.desc
  village.counterTickBonus    = strategy.strengthTickBonus
  return { changed, strategy }
}

/**
 * Sum of scMod penalties from all active rival counter-strategies for a given mission rank.
 * Only elite_wall (A/S) and scout_study (all) affect player success chances.
 * Returns a negative number or 0.
 * @param {object[]} villages  rival village array
 * @param {string}   rank      D | C | B | A | S
 */
export function rivalScPenalty(villages, rank) {
  let penalty = 0
  for (const v of (villages || [])) {
    const strat = COUNTER_STRATEGIES[v.counterStrategy]
    if (!strat || strat.scMod === 0) continue
    if (strat.id === 'elite_wall' && rank !== 'A' && rank !== 'S') continue
    penalty += strat.scMod
  }
  return penalty
}
