/**
 * Village district definitions.
 * Each district: one-time build, costs ryo + buildMonths to complete.
 * effect: passive bonus applied via getDistrictPassives(G).
 */
export const DISTRICTS = [
  {
    id: 'training_grounds',
    n: 'Advanced Training Grounds',
    icon: '🥋',
    color: '#f0a030',
    cost: 20000,
    buildMonths: 2,
    desc: 'Elite training facilities. Shinobi grow faster and build jutsu mastery sooner.',
    effect: { statGrowthBonus: 0.10, jutsuWinReq: -5 },
  },
  {
    id: 'hospital_wing',
    n: 'Field Hospital Wing',
    icon: '🏥',
    color: '#8fbc8f',
    cost: 18000,
    buildMonths: 2,
    desc: 'Dedicated medical facility. Reduces injury recovery time and KIA risk.',
    effect: { injDayReduction: 1, kiaRiskMod: -0.02 },
  },
  {
    id: 'intel_office',
    n: 'Intelligence Office',
    icon: '🕵',
    color: '#87ceeb',
    cost: 22000,
    buildMonths: 3,
    desc: 'Centralised intelligence operations. Boosts Shadow and scouting performance.',
    effect: { anbuSuccessBonus: 0.08, scoutConfidenceBonus: 0.05 },
  },
  {
    id: 'forge',
    n: 'Weapons Forge',
    icon: '⚒',
    color: '#c9a84c',
    cost: 15000,
    buildMonths: 2,
    desc: 'High-quality equipment reduces mission risk and improves combat outcomes.',
    effect: { missionRiskReduction: 0.04, powerFlat: 2 },
  },
  {
    id: 'market',
    n: 'Trade Market',
    icon: '🏪',
    color: '#cc7fb8',
    cost: 12000,
    buildMonths: 1,
    desc: 'Attracts merchants and commerce. Generates passive monthly income.',
    effect: { monthlyRyo: 1200 },
  },
]

export const DISTRICT_BY_ID = Object.fromEntries(DISTRICTS.map(d => [d.id, d]))

/**
 * Returns the combined passive effect object for all completed districts.
 * @param {object} G
 * @returns {object}
 */
export function getDistrictPassives(G) {
  const built = (G.districts || []).filter(d => d.status === 'built').map(d => d.id)
  const passives = {
    statGrowthBonus: 0,
    injDayReduction: 0,
    kiaRiskMod: 0,
    anbuSuccessBonus: 0,
    scoutConfidenceBonus: 0,
    missionRiskReduction: 0,
    powerFlat: 0,
    monthlyRyo: 0,
  }
  for (const id of built) {
    const def = DISTRICT_BY_ID[id]
    if (!def) continue
    for (const [k, v] of Object.entries(def.effect)) {
      if (k in passives) passives[k] += v
    }
  }
  return passives
}
