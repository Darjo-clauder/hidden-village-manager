/**
 * Typed bond system — each bond type has passive mechanics applied in mission calc.
 */

export const BOND_TYPES = {
  'Brothers-in-Arms': {
    successMod: 0.03,
    moraleOnKIA: -5,
    desc: 'Tested together. +3% mission success when both deployed.',
  },
  'Mentor/Student': {
    mentorGrowthBonus: 0.08,
    studentSuccessMod: 0.04,
    moraleOnKIA: -8,
    desc: 'Senior guides junior. Student gains +4% success; junior grows 8% faster.',
  },
  'Rivals': {
    rivalSuccessMod: 0.05,
    rivalMoraleOnKIA: -10,
    desc: 'Fierce competition drives both higher. +5% success when both on active roster.',
  },
  'Battle-Scarred': {
    successMod: 0.02,
    injResist: 0.05,
    moraleOnKIA: -6,
    desc: 'Survived the same near-death. Minor success and injury resistance boost.',
  },
}

export const BOND_TYPE_KEYS = Object.keys(BOND_TYPES)

/** Squad wins required before bonds may form (mirrors adv.js tryFormBonds gate). */
export const BOND_FORM_THRESHOLD = 5

/** "Next threshold" info for a squad — how close it is to forming bonds. */
export function bondThresholdInfo(squad) {
  const wins = (squad && squad.wins) || 0
  const away = Math.max(0, BOND_FORM_THRESHOLD - wins)
  return { wins, threshold: BOND_FORM_THRESHOLD, eligible: wins >= BOND_FORM_THRESHOLD, away }
}

/**
 * Returns combined bond bonuses for a shinobi's active missions,
 * given the full roster (to check if bonded partners are also active).
 *
 * @param {object} s - shinobi
 * @param {object[]} allShinobi - G.shinobi
 * @returns {{ successMod: number, growthBonus: number }}
 */
export function bondMissionBonus(s, allShinobi) {
  let successMod = 0
  let growthBonus = 0

  for (const bond of (s.bonds || [])) {
    const partner = allShinobi.find(x => x.id === bond.otherId)
    if (!partner) continue
    const def = BOND_TYPES[bond.type]
    if (!def) continue
    const partnerActive = partner.status === 'available' || partner.status === 'mission'

    if (bond.type === 'Brothers-in-Arms' && partnerActive) {
      successMod += def.successMod
    } else if (bond.type === 'Rivals' && partnerActive) {
      successMod += def.rivalSuccessMod
    } else if (bond.type === 'Mentor/Student') {
      if (s.ri > (partner.ri || 0)) {
        // s is mentor — no direct success bonus, but student growth tracked elsewhere
      } else {
        successMod += def.studentSuccessMod
      }
    } else if (bond.type === 'Battle-Scarred' && partnerActive) {
      successMod += def.successMod
    }
  }

  return { successMod, growthBonus }
}

/**
 * Returns growth multiplier bonus from mentor bonds.
 * Call for each shinobi during monthly growth tick.
 *
 * @param {object} s - shinobi (potential student)
 * @param {object[]} allShinobi - G.shinobi
 * @returns {number} bonus growth multiplier (0 if no mentor bond)
 */
export function mentorGrowthBonus(s, allShinobi) {
  for (const bond of (s.bonds || [])) {
    if (bond.type !== 'Mentor/Student') continue
    const mentor = allShinobi.find(x => x.id === bond.otherId)
    if (!mentor) continue
    if ((mentor.ri || 0) > (s.ri || 0) && mentor.status === 'available') {
      return BOND_TYPES['Mentor/Student'].mentorGrowthBonus
    }
  }
  return 0
}

/**
 * Returns the morale penalty when `fallen` shinobi is KIA.
 * Sum across all bonds of survivors.
 *
 * @param {string} fallenId
 * @param {object[]} allShinobi - G.shinobi (not including fallen)
 * @returns {Array<{ shinobiId: string, delta: number }>}
 */
export function kiaRipple(fallenId, allShinobi) {
  const effects = []
  for (const s of allShinobi) {
    const bond = (s.bonds || []).find(b => b.otherId === fallenId)
    if (!bond) continue
    const def = BOND_TYPES[bond.type]
    if (!def) continue
    const delta = bond.type === 'Rivals'
      ? (def.rivalMoraleOnKIA || 0)
      : (def.moraleOnKIA || 0)
    if (delta !== 0) effects.push({ shinobiId: s.id, delta })
  }
  return effects
}
