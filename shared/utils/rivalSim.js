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
 * Grows or decays a village's strength by one monthly tick.
 * @param {object} village - has .strength, .rel, .personality
 * @returns {number} strength delta applied
 */
export function tickRivalStrength(village) {
  const base = village.personality === 'Aggressive' ? 1.5 : village.personality === 'Honorable' ? 0.8 : 1.0
  const relMod = village.rel >= 60 ? -0.3 : village.rel <= 30 ? 0.5 : 0
  const delta = base + relMod + (Math.random() * 0.5 - 0.25)
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
