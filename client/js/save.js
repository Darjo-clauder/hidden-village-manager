// ── Local persistence ─────────────────────────────────────────────────────────
// Single-player saves live on the player's machine (localStorage), so the game
// persists with no server and no Supabase. The server sync (socket.js) still runs
// for online play, but it is no longer required to keep a save.
//
// The payload is trimmed the same way the server trims its Supabase copy, so a
// local save and a restored server save behave identically.

import { G } from './state.js'
import { migrateBeastStats } from './beastEngine.js'
import { SAVE_VERSION, migrateSave } from '../../shared/utils/saveMigrations.js'
import { dlog } from '../../shared/utils/debug.js'

const SAVE_KEY = 'hvm_save_v1'
let _active = false

/** Mark that a game is in progress, so autosaves are allowed to write. */
export function markGameActive() { _active = true }

/** Serialize G to localStorage. No-op until a game is active. Returns true on success. */
export function saveLocal() {
  if (!_active) return false
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(_trim(G)))
    return true
  } catch (e) {
    dlog('[Save] local save failed:', e?.message)
    return false
  }
}

/** Parsed saved state, or null if none / corrupt. */
export function loadLocal() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    dlog('[Save] local load failed:', e?.message)
    return null
  }
}

export function hasLocalSave() {
  return !!localStorage.getItem(SAVE_KEY)
}

// ── Manual save slots ─────────────────────────────────────────────────────────
// Separate from the rolling autosave: named slots the player writes/loads on demand,
// each carrying lightweight metadata (village, date) for the load menu.
const SLOT_PREFIX = 'hvm_slot_'
export const SAVE_SLOT_COUNT = 3

export function saveToSlot(n) {
  if (!_active) return false
  try {
    const payload = _trim(G)
    payload._slotMeta = { vName: G.vName, kName: G.kName, vIcon: G.vIcon, year: G.year, month: G.month, prestige: G.prestigeTier, savedAt: Date.now() }
    localStorage.setItem(SLOT_PREFIX + n, JSON.stringify(payload))
    return true
  } catch (e) {
    dlog('[Save] slot save failed:', e?.message)
    return false
  }
}

export function loadSlot(n) {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + n)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    dlog('[Save] slot load failed:', e?.message)
    return null
  }
}

export function slotMeta(n) {
  return loadSlot(n)?._slotMeta || null
}

export function deleteSlot(n) {
  localStorage.removeItem(SLOT_PREFIX + n)
}

export function listSlots() {
  const out = []
  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) out.push({ n: i, meta: slotMeta(i) })
  return out
}

export function clearLocal() {
  localStorage.removeItem(SAVE_KEY)
  _active = false
}

/**
 * Overlay a saved state onto the live G object (mutates in place — G is a stable
 * reference). Existing initState() defaults fill any fields older saves lacked.
 * Call initState() first, then this.
 */
export function applySavedState(saved) {
  if (!saved || typeof saved !== 'object') return
  migrateSave(saved)     // walk schema migrations up to the current version
  Object.keys(saved).forEach(k => { G[k] = saved[k] })
  migrateBeastStats(G)   // heal any vessel stats inflated by the pre-fix beast bug
}

// Bound the payload the same way the server does (see server/db.js _trimState),
// keeping localStorage well under quota over a long dynasty. Stamped with the
// current save version so future updates can migrate it forward.
function _trim(G) {
  return {
    _saveVersion: SAVE_VERSION,
    ...G,
    log:         (G.log         || []).slice(-100),
    examResults: (G.examResults || []).slice(-40),
    noticeboard: (G.noticeboard || []).slice(-60),
    rumors:      (G.rumors      || []).filter(r => !r.resolved).slice(-25),
    aM:          (G.aM          || []).slice(0, 24),
    prospects:   (G.prospects   || []).slice(0, 16),
  }
}

// Safety net: persist on tab / app close. Covers offline play, where the socket's
// own beforeunload sync never runs.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => saveLocal())
}
