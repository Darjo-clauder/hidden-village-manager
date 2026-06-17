/**
 * @typedef {'vanguard'|'support'|'intel'|'medical'|'flex'} RoleId
 *
 * @typedef {Object} DepthChartSlot
 * @property {string}   squadId
 * @property {RoleId}   role
 * @property {string|null} starterId         - shinobi id
 * @property {string[]} backupIds            - ordered backup list
 * @property {PromotionRule} promotionRules
 *
 * @typedef {'auto'|'manual'} PromotionRule
 */

export const ROLES = ['vanguard', 'support', 'intel', 'medical', 'flex']

/**
 * Creates a blank depth chart for a squad.
 * @param {string} squadId
 * @returns {Record<RoleId, DepthChartSlot>}
 */
export function createDepthChart(squadId) {
  return Object.fromEntries(
    ROLES.map(role => [role, {
      squadId,
      role,
      starterId: null,
      backupIds: [],
      promotionRules: 'auto',
    }])
  )
}

/**
 * Returns the active starter for a role, automatically promoting a backup
 * if the starter is unavailable (injured / deployed elsewhere).
 * @param {DepthChartSlot} slot
 * @param {Record<string,{status:string}>} shinobiIndex - id → shinobi
 * @returns {string|null} shinobiId of the active starter
 */
export function resolveActiveStarter(slot, shinobiIndex) {
  const starterAvailable = slot.starterId && shinobiIndex[slot.starterId]?.status === 'available'
  if (starterAvailable) return slot.starterId

  if (slot.promotionRules === 'auto') {
    for (const backupId of slot.backupIds) {
      if (shinobiIndex[backupId]?.status === 'available') return backupId
    }
  }

  return null
}
