/**
 * Achievement persistence.
 *
 * Account-level, not per-run: unlocks live in their own localStorage key
 * alongside the legacy store, so starting a new game never takes them away.
 * Same reasoning as legacyStore.js — the save is wiped on a new game, and
 * anything that must outlive a run cannot live inside it.
 *
 * Definitions and predicates are in shared/constants/achievements.js; this file
 * only loads, saves and announces.
 */

import { checkAchievements, ACHIEVEMENT_BY_ID } from '../../shared/constants/achievements.js'
import { loadLegacy } from './legacyStore.js'
import { G, addChronicle } from './state.js'
import { aL, ntf } from './ui.js'
import { sfx } from './audio.js'

const LS_KEY = 'hvm_achievements_v1'

export function loadAchievements() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed?.unlocked) ? parsed : { version: 1, unlocked: [], at: {} }
  } catch { return { version: 1, unlocked: [], at: {} } }
}

function _save(store) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); return true } catch { return false }
}

export function clearAchievements() {
  try { localStorage.removeItem(LS_KEY) } catch { /* non-fatal */ }
}

/**
 * Evaluate everything against the current run plus the lineage, persist any new
 * unlocks and announce them. Safe to call every tick — already-unlocked entries
 * are skipped, so this is a no-op once the set stops growing.
 *
 * Returns the ids unlocked by this call (empty most months).
 */
export function syncAchievements() {
  const store = loadAchievements()
  const won = checkAchievements({ G, legacy: loadLegacy() }, store.unlocked)
  if (!won.length) return []

  const now = { year: G.year, month: G.month }
  for (const id of won) {
    store.unlocked.push(id)
    store.at[id] = now
    const a = ACHIEVEMENT_BY_ID[id]
    if (!a) continue
    aL(`🏅 Achievement unlocked — ${a.icon} ${a.name}: ${a.desc}`, 'good')
    addChronicle(`Achievement: ${a.name}`, a.desc, 'milestone')
  }
  _save(store)

  // One announcement per tick however many landed, so a big month doesn't
  // bury the player in toasts.
  const first = ACHIEVEMENT_BY_ID[won[0]]
  if (first) {
    ntf(won.length === 1
      ? `🏅 ${first.icon} ${first.name}`
      : `🏅 ${first.icon} ${first.name} +${won.length - 1} more`)
  }
  sfx('victory')
  return won
}
