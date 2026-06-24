/**
 * Pure rival village simulation helpers.
 * Strength represents military power on a 0–200 scale.
 */

export const RIVAL_EVENT_TYPES = [
  { id: 'srank_complete', weight: 3, severity: 'warn',  template: '{village} completed an S-rank mission — their reputation grows.' },
  { id: 'poach_prospect', weight: 2, severity: 'bad',   template: '{village} has recruited a high-potential prospect from the region.' },
  { id: 'border_threat',  weight: 2, severity: 'bad',   template: '{village} is massing forces near your border. Relationship strained.' },
  { id: 'diplomatic_win', weight: 2, severity: 'neutral',template: '{village} forged a new alliance. Their influence is growing.' },
  { id: 'internal_strife',weight: 2, severity: 'good',  template: '{village} is dealing with internal unrest — their strength has declined.' },
  { id: 'natural_disaster',weight:1, severity: 'good',  template: '{village} suffered a natural disaster. Their forces are weakened.' },
]

/**
 * Evolves a village's strength by one monthly tick — MEAN-REVERTING toward a
 * stable per-village baseline rather than drifting upward unboundedly.
 *
 * The original model added an almost-always-positive delta every month, so over a
 * long dynasty (15+ years) every rival saturated at the 200 cap and pinned there,
 * erasing all differentiation (personality/relations stopped mattering). Instead we
 * pull strength toward a personality/relations-shifted target each month plus small
 * noise: aggressive/hostile neighbours sit higher, but everyone settles into a band.
 *
 * @param {object} village - has .strength, .rel, .personality (.baseStrength lazily set)
 * @returns {number} strength delta applied
 */
export function tickRivalStrength(village) {
  // Anchor each village to a stable baseline the first time it's ticked.
  if (village.baseStrength == null) village.baseStrength = village.strength || 50
  // Personality & relations shift the target the village gravitates toward — a band,
  // not a ramp. Hostile (low rel) neighbours build up; friendly ones ease off.
  const persTarget = village.personality === 'Aggressive' ? 18 : village.personality === 'Honorable' ? -8 : 0
  const relTarget  = village.rel >= 60 ? -10 : village.rel <= 30 ? 12 : 0
  const target = Math.max(10, Math.min(200, village.baseStrength + persTarget + relTarget))
  // Pull ~8%/month toward target + small noise → settles into a stable band, no runaway.
  const delta = (target - (village.strength || 50)) * 0.08 + (Math.random() - 0.5)
  village.strength = Math.max(10, Math.min(200, (village.strength || 50) + delta))
  return delta
}

/**
 * Returns true if a rival event should fire this month.
 * @param {object} village
 * @returns {boolean}
 */
export function shouldFireRivalEvent(village) {
  return Math.random() < 0.06
}

/**
 * Picks a weighted random rival event type.
 * @returns {object} event definition
 */
export function pickRivalEvent() {
  const total = RIVAL_EVENT_TYPES.reduce((s, e) => s + e.weight, 0)
  let roll = Math.random() * total
  for (const e of RIVAL_EVENT_TYPES) {
    roll -= e.weight
    if (roll <= 0) return e
  }
  return RIVAL_EVENT_TYPES[0]
}

/**
 * Computes relative strength ratio: player / rival.
 * > 1 means player is stronger.
 * @param {number} playerStrength
 * @param {number} rivalStrength
 * @returns {number}
 */
export function strengthRatio(playerStrength, rivalStrength) {
  return rivalStrength > 0 ? playerStrength / rivalStrength : 2
}

/**
 * Ranks the player and all rival villages into a standings table by strength (desc).
 * @param {number} playerStrength
 * @param {string} playerName
 * @param {object[]} villages - rival villages with .n, .strength, .rel
 * @returns {Array<{rank, name, strength, rel, isPlayer}>}
 */
export function rankStandings(playerStrength, playerName, villages = []) {
  const rows = [
    { name: playerName, strength: Math.round(playerStrength || 0), rel: null, isPlayer: true },
    ...villages.map(v => ({ name: v.n, strength: Math.round(v.strength || 50), rel: v.rel ?? null, isPlayer: false })),
  ]
  rows.sort((a, b) => b.strength - a.strength)
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}

/**
 * Computes player village strength from G state.
 * @param {object} G
 * @returns {number}
 */
export function computePlayerStrength(G) {
  const shinobiCount = (G.shinobi || []).filter(s => s.status === 'available').length
  const avgRi = shinobiCount > 0
    ? (G.shinobi || []).reduce((a, s) => a + (s.ri || 0), 0) / (G.shinobi || []).length
    : 0
  const wallBonus = (G.upgrades?.wall || 0) * 15
  const sealBonus = (G.upgrades?.seal || 0) * 10
  return Math.round(shinobiCount * (5 + avgRi * 3) + wallBonus + sealBonus)
}
