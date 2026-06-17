/**
 * Pure jutsu loadout helpers — shared between adv.js (browser) and tests (Node).
 */

export const LOADOUT_MAX = 3

/**
 * Computes the combined mission bonus from a shinobi's active loadout.
 * @param {object} s - shinobi with jutsu[] and jutsuLoadout[]
 * @param {object[]} jutsuList - JUTSU_LIST constant
 * @returns {{ powerMod: number, successMod: number }}
 */
export function jutsuLoadoutBonus(s, jutsuList) {
  const loadout = s.jutsuLoadout || []
  let powerMod = 0
  let successMod = 0
  for (const jId of loadout) {
    if (!(s.jutsu || []).includes(jId)) continue
    const j = jutsuList.find(x => x.id === jId)
    if (!j) continue
    powerMod += j.bonus?.powerMod || 0
    successMod += j.bonus?.successMod || 0
  }
  return { powerMod, successMod }
}

/**
 * Toggles a jutsu in/out of the loadout (max LOADOUT_MAX).
 * Returns the updated loadout array (does not mutate).
 * @param {string[]} loadout
 * @param {string} jutsuId
 * @returns {string[]}
 */
export function toggleLoadoutSlot(loadout, jutsuId) {
  const current = loadout || []
  if (current.includes(jutsuId)) return current.filter(id => id !== jutsuId)
  if (current.length >= LOADOUT_MAX) return current
  return [...current, jutsuId]
}
