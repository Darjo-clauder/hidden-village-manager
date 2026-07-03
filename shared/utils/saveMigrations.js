/**
 * Save migrations — forward-compatible local saves.
 *
 * Steam players will accumulate long dynasties across game updates, so a saved
 * game must survive schema changes. Every save is stamped with `_saveVersion`;
 * on load, `migrateSave` walks any intermediate migrations up to the current
 * version. Unversioned saves (from before this system) are treated as v1.
 *
 * To add a migration: bump SAVE_VERSION and add MIGRATIONS[newVersion] = fn,
 * where fn(save) mutates the parsed save object in place.
 *
 * Pure helpers; no G access. Unit-tested.
 */

export const SAVE_VERSION = 2

// migrations[v] upgrades a save FROM v-1 TO v. Keyed by target version.
export const MIGRATIONS = {
  // v1 → v2: guarantee the dynasty-layer collections exist so a pre-update save
  // (village identities / minor nations / eras / promises / etc.) loads clean.
  2: (s) => {
    const arrays = ['hallOfFame', 'youthCupHistory', 'invitationalHistory', 'exhibitions',
      'prestigeBuilds', 'prestigeCompleted', 'eraHistory', 'promises']
    arrays.forEach(k => { if (!Array.isArray(s[k])) s[k] = [] })
    const maps = ['minorRelations', 'journalistRel', 'h2h']
    maps.forEach(k => { if (!s[k] || typeof s[k] !== 'object') s[k] = {} })
  },
}

/** The stamped version of a save (unversioned → 1). */
export function saveVersionOf(save) {
  const v = save?._saveVersion
  return Number.isInteger(v) && v > 0 ? v : 1
}

/**
 * Migrate a parsed save up to SAVE_VERSION, applying each intermediate migration
 * in order. Mutates and returns the save (with `_saveVersion` stamped current).
 * A save already at/above current is returned untouched (but re-stamped).
 */
export function migrateSave(save) {
  if (!save || typeof save !== 'object') return save
  let from = saveVersionOf(save)
  for (let v = from + 1; v <= SAVE_VERSION; v++) {
    const fn = MIGRATIONS[v]
    if (fn) fn(save)
  }
  save._saveVersion = SAVE_VERSION
  return save
}
