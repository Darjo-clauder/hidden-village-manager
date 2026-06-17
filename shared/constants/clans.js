/**
 * Clan definitions with bloodline passives and council seat mechanics.
 */

export const CLANS = [
  {
    id: 'uchiha',
    name: 'Uchiha',
    icon: '🔥',
    bloodline: 'Sharingan',
    passive: { successMod: 0.04, anbuSuccessBonus: 0.05 },
    councilWeight: 1.4,
    approvalNeeded: 60,
    desc: 'Elite warriors with visual prowess. Squad success bonus, ANBU advantage.',
    missionChains: ['uchiha_trial', 'sharingan_hunt'],
  },
  {
    id: 'hyuga',
    name: 'Hyuga',
    icon: '👁',
    bloodline: 'Byakugan',
    passive: { scoutConfidenceBonus: 0.10, successMod: 0.02 },
    councilWeight: 1.2,
    approvalNeeded: 55,
    desc: 'Noble house of seers. Scouting intel bonus and solid mission success.',
    missionChains: ['hyuga_succession', 'cage_bird_seal'],
  },
  {
    id: 'nara',
    name: 'Nara',
    icon: '🦌',
    bloodline: 'Shadow Manipulation',
    passive: { growthBonus: 0.08, missionRiskReduction: 0.03 },
    councilWeight: 1.1,
    approvalNeeded: 50,
    desc: 'Strategic geniuses. Shinobi grow faster and squad risk is reduced.',
    missionChains: ['nara_deer_rite', 'shadow_ambush'],
  },
  {
    id: 'akimichi',
    name: 'Akimichi',
    icon: '⚡',
    bloodline: 'Caloric Control',
    passive: { successMod: 0.03, kiaRiskMod: -0.01 },
    councilWeight: 1.0,
    approvalNeeded: 45,
    desc: 'Stalwart fighters. Team presence reduces KIA risk.',
    missionChains: ['akimichi_feast', 'formation_drill'],
  },
  {
    id: 'inuzuka',
    name: 'Inuzuka',
    icon: '🐺',
    bloodline: 'Beast Mimicry',
    passive: { successMod: 0.02, scoutConfidenceBonus: 0.08 },
    councilWeight: 0.9,
    approvalNeeded: 40,
    desc: 'Tracking specialists. Scouting and mission success from feral instinct.',
    missionChains: ['inuzuka_hunt', 'pack_formation'],
  },
  {
    id: 'aburame',
    name: 'Aburame',
    icon: '🪲',
    bloodline: 'Insect Symbiosis',
    passive: { anbuSuccessBonus: 0.06, missionRiskReduction: 0.02 },
    councilWeight: 0.9,
    approvalNeeded: 40,
    desc: 'Silent operatives. ANBU missions succeed more often.',
    missionChains: ['aburame_colony', 'insect_net'],
  },
]

export const CLAN_BY_ID = Object.fromEntries(CLANS.map(c => [c.id, c]))

export const CLAN_CHAINS = {
  uchiha_trial:    { n: 'Uchiha Awakening Trial', rk: 'A', ryo: 12000, rep: 8,  reqClanSize: 2, desc: 'Two Uchiha undertake the awakening trial.' },
  sharingan_hunt:  { n: 'Sharingan Retrieval',    rk: 'S', ryo: 25000, rep: 15, reqClanSize: 1, reqRi: 3, desc: 'Recover a stolen Sharingan.' },
  hyuga_succession:{ n: 'Succession Ceremony',    rk: 'B', ryo: 8000,  rep: 10, reqClanSize: 2, desc: 'Conduct the Hyuga heir ceremony.' },
  cage_bird_seal:  { n: 'Cage Bird Liberation',   rk: 'A', ryo: 14000, rep: 12, reqClanSize: 1, reqRi: 3, desc: 'Eliminate a Hyuga seal threat.' },
  nara_deer_rite:  { n: 'Deer Tending Rite',      rk: 'C', ryo: 4000,  rep: 5,  reqClanSize: 1, desc: 'Seasonal duty — tend the Nara deer.' },
  shadow_ambush:   { n: 'Shadow Net Ambush',      rk: 'B', ryo: 9000,  rep: 7,  reqClanSize: 1, reqRi: 2, desc: 'Trap a fleeing target.' },
  akimichi_feast:  { n: 'Grand Feast Hosting',    rk: 'C', ryo: 3500,  rep: 8,  reqClanSize: 1, desc: 'Host a village feast — morale +10.' },
  formation_drill: { n: 'Formation Drill',         rk: 'B', ryo: 7000,  rep: 5,  reqClanSize: 2, desc: 'Run clan formation drills — growth bonus.' },
  inuzuka_hunt:    { n: 'Great Hunt',              rk: 'B', ryo: 8500,  rep: 6,  reqClanSize: 1, desc: 'Track and bring back a target.' },
  pack_formation:  { n: 'Pack Tactics Drill',      rk: 'C', ryo: 4500,  rep: 4,  reqClanSize: 2, desc: 'Two Inuzuka members sharpen pack tactics.' },
  aburame_colony:  { n: 'Colony Calibration',      rk: 'C', ryo: 5000,  rep: 5,  reqClanSize: 1, desc: 'Tune insect hive — intel bonus next month.' },
  insect_net:      { n: 'Insect Surveillance Net', rk: 'A', ryo: 13000, rep: 9,  reqClanSize: 1, reqRi: 3, desc: 'Blanket an area with surveillance bugs.' },
}

/**
 * Aggregate bloodline passives from all clans that have at least one
 * available member.
 *
 * @param {object} G - game state
 * @returns {{ successMod, growthBonus, missionRiskReduction, kiaRiskMod, anbuSuccessBonus, scoutConfidenceBonus }}
 */
export function getClanPassives(G) {
  const result = {
    successMod: 0,
    growthBonus: 0,
    missionRiskReduction: 0,
    kiaRiskMod: 0,
    anbuSuccessBonus: 0,
    scoutConfidenceBonus: 0,
  }
  const activeClanIds = new Set(
    (G.shinobi || [])
      .filter(s => s.status === 'available' && s.clan)
      .map(s => s.clan)
  )
  for (const clanId of activeClanIds) {
    const clan = CLAN_BY_ID[clanId]
    if (!clan) continue
    // Only apply if clan approval met (default 100 if no tracking)
    const approval = (G.clanApproval || {})[clanId] ?? 100
    if (approval < clan.approvalNeeded) continue
    for (const [key, val] of Object.entries(clan.passive || {})) {
      if (key in result) result[key] += val
    }
  }
  return result
}

/**
 * Returns available clan chains for a given clan (those whose requirements are met).
 * @param {string} clanId
 * @param {object} G
 * @returns {object[]} array of { chainId, chain, assignable }
 */
export function availableClanChains(clanId, G) {
  const clan = CLAN_BY_ID[clanId]
  if (!clan) return []
  const members = (G.shinobi || []).filter(s => s.clan === clanId && s.status === 'available')
  return (clan.missionChains || []).map(chainId => {
    const chain = CLAN_CHAINS[chainId]
    if (!chain) return null
    const eligible = members.filter(s => (s.ri || 0) >= (chain.reqRi || 0))
    const canRun = eligible.length >= (chain.reqClanSize || 1)
    return { chainId, chain, eligible, canRun }
  }).filter(Boolean)
}

/**
 * Returns the council influence total for a village, reflecting clan seat weight.
 * Each clan contributes councilWeight * (active members / total village shinobi).
 * @param {object} G
 * @returns {{ [clanId]: number }} influence share 0..1 per clan
 */
export function clanCouncilInfluence(G) {
  const total = (G.shinobi || []).filter(s => s.status !== 'retired' && s.status !== 'kia').length || 1
  const result = {}
  for (const clan of CLANS) {
    const memberCount = (G.shinobi || []).filter(s => s.clan === clan.id).length
    result[clan.id] = (memberCount / total) * clan.councilWeight
  }
  return result
}
