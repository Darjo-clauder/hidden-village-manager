/**
 * Staff development (R26) — scouts, senseis, medics and other staff gain experience
 * on the job, level up (Novice → Master), and improve at their craft: each level-up
 * nudges their primary stat, so the effects those stats already drive (scout
 * judgement, sensei teaching, medic care) get better over a dynasty. Pure math here;
 * the client tick applies the stat bump and notices.
 */

export const STAFF_MAX_LEVEL = 5
export const STAFF_TITLES = ['Novice', 'Adept', 'Seasoned', 'Expert', 'Master']

export function staffTitle(level) {
  return STAFF_TITLES[Math.min(STAFF_TITLES.length - 1, Math.max(0, (level || 1) - 1))]
}

// XP needed to go from `level` to the next (rising cost).
export function xpForStaffLevel(level) {
  return 40 + (Math.max(1, level || 1) - 1) * 40
}

// Effect multiplier from level: 1.0 at L1 → 1.4 at L5 (for count-based effects).
export function staffLevelBonus(level) {
  return 1 + (Math.max(1, level || 1) - 1) * 0.10
}

/**
 * Add XP to a staff member, applying any level-ups. Mutates staff.staffXp/staffLevel
 * (mirrors kageDev.addKageXp). Returns { leveledUp, level, gained } where `gained`
 * is how many levels were gained this call.
 */
export function addStaffXp(staff, amount) {
  staff.staffLevel = staff.staffLevel || 1
  staff.staffXp = (staff.staffXp || 0) + amount
  let gained = 0
  while (staff.staffLevel < STAFF_MAX_LEVEL && staff.staffXp >= xpForStaffLevel(staff.staffLevel)) {
    staff.staffXp -= xpForStaffLevel(staff.staffLevel)
    staff.staffLevel++
    gained++
  }
  return { leveledUp: gained > 0, level: staff.staffLevel, gained }
}
