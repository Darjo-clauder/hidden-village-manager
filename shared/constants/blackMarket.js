/**
 * Black market mission types and underworld standing tiers.
 */

export const BLACK_MARKET_MISSIONS = [
  {
    id: 'bm_assassination',
    n: 'Contract Assassination',
    icon: '🗡',
    rk: 'A',
    ryo: 18000,
    repLoss: 12,
    kiaBonus: 0.04,
    reqRi: 3,
    reqAnbu: false,
    desc: 'Eliminate a high-value target. Pays triple — but discovery costs dearly.',
    discoveryChance: 0.12,
  },
  {
    id: 'bm_sabotage',
    n: 'Infrastructure Sabotage',
    icon: '💣',
    rk: 'B',
    ryo: 9000,
    repLoss: 6,
    kiaBonus: 0.02,
    reqRi: 2,
    reqAnbu: false,
    desc: 'Destroy rival supply lines. Moderate risk, solid payout.',
    discoveryChance: 0.08,
  },
  {
    id: 'bm_theft',
    n: 'Scroll Heist',
    icon: '📜',
    rk: 'B',
    ryo: 7000,
    repLoss: 5,
    kiaBonus: 0.01,
    reqRi: 2,
    reqAnbu: false,
    desc: 'Steal a forbidden jutsu scroll. Success unlocks a rare jutsu for the assignee.',
    discoveryChance: 0.10,
    rewardJutsu: true,
  },
  {
    id: 'bm_espionage',
    n: 'Deep Espionage',
    icon: '🕵',
    rk: 'A',
    ryo: 14000,
    repLoss: 9,
    kiaBonus: 0.03,
    reqRi: 3,
    reqAnbu: true,
    desc: 'Infiltrate a rival village. ANBU required. Reveals village strength and current missions.',
    discoveryChance: 0.09,
    rewardIntel: true,
  },
  {
    id: 'bm_bounty',
    n: 'Bingo Book Bounty',
    icon: '📛',
    rk: 'S',
    ryo: 30000,
    repLoss: 0,
    kiaBonus: 0.06,
    reqRi: 4,
    reqAnbu: true,
    desc: 'Hunt a missing-nin from the bingo book. Huge payout, maximum risk.',
    discoveryChance: 0.05,
  },
]

export const BM_MISSION_BY_ID = Object.fromEntries(BLACK_MARKET_MISSIONS.map(m => [m.id, m]))

export const UNDERWORLD_TIERS = [
  { id: 'unknown',   minRep: 0,   label: 'Unknown',        bonus: 0 },
  { id: 'contractor',minRep: 10,  label: 'Contractor',     bonus: 0.05 },
  { id: 'operative', minRep: 25,  label: 'Operative',      bonus: 0.10, unlocksBounty: true },
  { id: 'shadow',    minRep: 50,  label: 'Shadow Agent',   bonus: 0.15, unlocksDiscount: 0.20 },
  { id: 'phantom',   minRep: 100, label: 'Phantom',        bonus: 0.20, unlocksDiscount: 0.30, passiveRyo: 1500 },
]

/**
 * Returns the current underworld tier for a given blackMarketRep score.
 * @param {number} rep
 * @returns {object}
 */
export function getUnderworldTier(rep) {
  const tiers = [...UNDERWORLD_TIERS].reverse()
  return tiers.find(t => (rep || 0) >= t.minRep) || UNDERWORLD_TIERS[0]
}

/**
 * Returns the discovery chance for a mission, adjusted for underworld standing.
 * Higher standing = lower discovery risk.
 * @param {object} mission - BLACK_MARKET_MISSIONS entry
 * @param {number} bmRep
 * @returns {number}
 */
export function discoveryChance(mission, bmRep) {
  const tier = getUnderworldTier(bmRep)
  return Math.max(0.02, mission.discoveryChance - tier.bonus * 0.3)
}
