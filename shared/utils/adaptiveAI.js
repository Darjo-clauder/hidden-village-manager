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

// ── Per-village rival profiling ───────────────────────────────────────────────

/**
 * AI personalities that modify how a rival interprets observed player tactics.
 */
export const AI_PERSONALITIES = {
  conservative:   { label: 'Conservative', riskTolerance: 0.3, bluffChance: 0.1, desc: 'Calculated. Adapts slowly but never overextends.' },
  opportunistic:  { label: 'Opportunistic', riskTolerance: 0.6, bluffChance: 0.3, desc: 'Quick to exploit perceived weakness.' },
  reckless:       { label: 'Reckless',     riskTolerance: 0.9, bluffChance: 0.5, desc: 'Throws resources at you. High-risk, high-reward.' },
}

/**
 * Initialise a rival village's per-village profile (call once, lazy).
 * @param {object} village  rival village object
 */
export function ensureRivalProfile(village) {
  if (village.rivalProfile) return
  const personalities = Object.keys(AI_PERSONALITIES)
  const aiPersonality = AI_PERSONALITIES[village.personality?.toLowerCase()] ? village.personality.toLowerCase() : personalities[Math.floor(Math.random() * personalities.length)]
  village.rivalProfile = {
    aiPersonality,
    // Bayesian-style tactic frequency vector (updated by observePlayerTactic)
    tacticFreq:  { elite: 0.25, passive: 0.25, squad: 0.25, solo: 0.25 },
    totalObs:    0,
    lastStance:  null,
    stanceHistory: [],
  }
}

/**
 * Update a single rival village's profile based on one player tactic observation.
 * Uses a decayed running average (lr = learning rate).
 * @param {object} village
 * @param {string} rank    D | C | B | A | S
 * @param {boolean} isSquad
 */
export function observePlayerTactic(village, rank, isSquad) {
  ensureRivalProfile(village)
  const p = village.rivalProfile
  const lr = 0.15  // learning rate — how fast the rival updates its model
  const obs = {
    elite:   (rank === 'A' || rank === 'S') ? 1 : 0,
    passive: (rank === 'D' || rank === 'C') ? 1 : 0,
    squad:   isSquad ? 1 : 0,
    solo:    isSquad ? 0 : 1,
  }
  // Exponential moving average
  for (const k of Object.keys(p.tacticFreq)) {
    p.tacticFreq[k] = p.tacticFreq[k] * (1 - lr) + obs[k] * lr
  }
  p.totalObs++
}

/**
 * Generate an explainable stance-change blurb for a rival, referencing what
 * tactic pattern triggered the shift. More specific than the generic counter-strategy desc.
 * @param {object} village
 * @param {object} strategy  COUNTER_STRATEGIES entry
 * @returns {string}
 */
export function explainStanceChange(village, strategy) {
  const p = village.rivalProfile
  if (!p) return strategy.desc

  const aiP = AI_PERSONALITIES[p.aiPersonality]
  const dominant = Object.entries(p.tacticFreq).sort((a, b) => b[1] - a[1])[0][0]

  const lines = {
    elite:   `${village.n} noticed your heavy use of A/S-rank operatives and has reinforced elite defenses.`,
    passive: `${village.n} interpreted your conservative approach as a window and is pushing harder at the borders.`,
    squad:   `${village.n} has studied your squad formations. They know the pattern.`,
    solo:    `${village.n} sees a lone-operative bias — expect targeted counters on solo missions.`,
  }

  const aiFlav = aiP ? ` (${aiP.label}: ${aiP.desc})` : ''
  return (lines[dominant] ?? strategy.desc) + aiFlav
}

/**
 * Meta event: a league-wide shift that forces all rivals to re-evaluate.
 * Randomly fires ~once per year. Mutates all villages' counter strategies.
 * @param {object[]} villages
 * @param {{ year:number, month:number }} when
 * @returns {{ fired: boolean, desc: string }}
 */
export function rollMetaEvent(villages, when) {
  if (Math.random() > 0.08) return { fired: false, desc: '' }
  const META_EVENTS = [
    { desc: 'A new infiltration technique swept through the shinobi world — rivals are rethinking their intel strategies.', reset: 'scout_study' },
    { desc: 'Economic shock: a trade route collapsed. Rival villages are cutting back on elite missions.', reset: 'elite_wall' },
    { desc: 'Cross-village summit redrew threat assessments — rivals recalibrated their border postures.', reset: 'aggressive' },
  ]
  const ev = META_EVENTS[Math.floor(Math.random() * META_EVENTS.length)]
  // Force all villages back to balanced, letting next January re-derive the new stance
  for (const v of (villages || [])) {
    if (v.counterStrategy === ev.reset) v.counterStrategy = 'balanced'
  }
  return { fired: true, desc: ev.desc }
}
