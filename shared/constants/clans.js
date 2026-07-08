/**
 * Clan definitions with bloodline passives and council seat mechanics.
 */

export const CLANS = [
  {
    id: 'kageha',
    name: 'Kageha',
    icon: '🔥',
    bloodline: 'Kagan',
    passive: { successMod: 0.04, anbuSuccessBonus: 0.05 },
    councilWeight: 1.4,
    approvalNeeded: 60,
    desc: 'Elite warriors with visual prowess. Squad success bonus, Shadow advantage.',
    missionChains: ['kageha_trial', 'kagan_hunt'],
  },
  {
    id: 'shiromi',
    name: 'Shiromi',
    icon: '👁',
    bloodline: 'Hakugan',
    passive: { scoutConfidenceBonus: 0.10, successMod: 0.02 },
    councilWeight: 1.2,
    approvalNeeded: 55,
    desc: 'Noble house of seers. Scouting intel bonus and solid mission success.',
    missionChains: ['shiromi_succession', 'sealed_eye_liberation'],
  },
  {
    id: 'kagero',
    name: 'Kagero',
    icon: '🦌',
    bloodline: 'Shadow Weave',
    passive: { growthBonus: 0.08, missionRiskReduction: 0.03 },
    councilWeight: 1.1,
    approvalNeeded: 50,
    desc: 'Strategic geniuses. Shinobi grow faster and squad risk is reduced.',
    missionChains: ['kagero_deer_rite', 'shadow_ambush'],
  },
  {
    id: 'tsuchida',
    name: 'Tsuchida',
    icon: '⚡',
    bloodline: 'Body Expansion',
    passive: { successMod: 0.03, kiaRiskMod: -0.01 },
    councilWeight: 1.0,
    approvalNeeded: 45,
    desc: 'Stalwart fighters. Team presence reduces KIA risk.',
    missionChains: ['tsuchida_feast', 'formation_drill'],
  },
  {
    id: 'okamura',
    name: 'Okamura',
    icon: '🐺',
    bloodline: 'Pack Bond',
    passive: { successMod: 0.02, scoutConfidenceBonus: 0.08 },
    councilWeight: 0.9,
    approvalNeeded: 40,
    desc: 'Tracking specialists. Scouting and mission success from feral instinct.',
    missionChains: ['okamura_hunt', 'pack_formation'],
  },
  {
    id: 'mushiba',
    name: 'Mushiba',
    icon: '🪲',
    bloodline: 'Hive Bond',
    passive: { anbuSuccessBonus: 0.06, missionRiskReduction: 0.02 },
    councilWeight: 0.9,
    approvalNeeded: 40,
    desc: 'Silent operatives. Shadow missions succeed more often.',
    missionChains: ['mushiba_colony', 'insect_net'],
  },
  {
    id: 'tamashii',
    name: 'Tamashii',
    icon: '👻',
    bloodline: 'Soul Touch',
    passive: { successMod: 0.03, missionRiskReduction: 0.02 },
    councilWeight: 1.1,
    approvalNeeded: 50,
    desc: 'Spirit-walkers who read the enemy\'s intent. Genjutsu edge lowers mission risk.',
    missionChains: ['tamashii_communion', 'soul_severance'],
  },
  {
    id: 'kusari',
    name: 'Kusari',
    icon: '⛓',
    bloodline: 'Chain Seal',
    passive: { growthBonus: 0.06, successMod: 0.02 },
    councilWeight: 1.0,
    approvalNeeded: 45,
    desc: 'Vast chakra reserves and sealing mastery. Members grow faster and endure.',
    missionChains: ['kusari_sealing', 'chain_binding'],
  },
  {
    id: 'mori',
    name: 'Mori',
    icon: '🌲',
    bloodline: 'Forest Birth',
    passive: { successMod: 0.05, kiaRiskMod: -0.02 },
    councilWeight: 1.3,
    approvalNeeded: 60,
    desc: 'A near-mythic bloodline of life-force techniques. Powerful in the field, hard to kill.',
    missionChains: ['mori_grove', 'wood_bastion'],
  },

  // ── Minor-nation regional bloodlines ──────────────────────────────────────
  // Lesser clans carried by talent recruited from the minor nations (see
  // minorNations.js). Lighter passives + council weight than the great-village
  // clans, no signature mission chains — regional, not dynastic.
  { id: 'ashiba',  name: 'Ashiba',  icon: '🌾', bloodline: 'Reed Step',   minor: true, passive: { scoutConfidenceBonus: 0.04 }, councilWeight: 0.6, approvalNeeded: 35, desc: 'Reedmarsh river-fighters. A little extra scouting instinct.' },
  { id: 'shiota',  name: 'Shiota',  icon: '⛵', bloodline: 'Brine Body',  minor: true, passive: { successMod: 0.02 },            councilWeight: 0.6, approvalNeeded: 35, desc: 'Saltcliff harbor stock. Steady in the field.' },
  { id: 'kareha',  name: 'Kareha',  icon: '🍂', bloodline: 'Ash Bloom',   minor: true, passive: { successMod: 0.02 },            councilWeight: 0.6, approvalNeeded: 35, desc: 'Palewood\'s fading line — the odd flash of brilliance.' },
  { id: 'iwabe',   name: 'Iwabe',   icon: '🧱', bloodline: 'Kiln Skin',   minor: true, passive: { kiaRiskMod: -0.01 },           councilWeight: 0.6, approvalNeeded: 35, desc: 'Kilnrock quarry-forged. Hard to put down.' },
  { id: 'kazehai', name: 'Kazehai', icon: '🪁', bloodline: 'Gale Step',   minor: true, passive: { successMod: 0.02 },            councilWeight: 0.6, approvalNeeded: 35, desc: 'Galecrest highland runners. Quick on the approach.' },
  { id: 'dokan',   name: 'Dokan',   icon: '🥉', bloodline: 'Bronze Fist', minor: true, passive: { successMod: 0.02 },            councilWeight: 0.6, approvalNeeded: 35, desc: 'Bronzegate mercenary discipline.' },
  { id: 'numaki',  name: 'Numaki',  icon: '🕸', bloodline: 'Fen Whisper', minor: true, passive: { scoutConfidenceBonus: 0.05 }, councilWeight: 0.6, approvalNeeded: 35, desc: 'Hollowfen fen-cunning. Reads a battlefield early.' },
  { id: 'hibari',  name: 'Hibari',  icon: '🪶', bloodline: 'Sky Dart',    minor: true, passive: { successMod: 0.02 },            councilWeight: 0.6, approvalNeeded: 35, desc: 'Skylark courier bloodline. Fleet and precise.' },
]

export const CLAN_BY_ID = Object.fromEntries(CLANS.map(c => [c.id, c]))

export const CLAN_CHAINS = {
  kageha_trial:         { n: 'Kageha Awakening Trial',  rk: 'A', ryo: 12000, rep: 8,  reqClanSize: 2, desc: 'Two Kageha undertake the awakening trial.' },
  kagan_hunt:           { n: 'Kagan Eye Retrieval',      rk: 'S', ryo: 25000, rep: 15, reqClanSize: 1, reqRi: 3, desc: 'Recover a stolen bloodline eye.' },
  shiromi_succession:   { n: 'Succession Ceremony',      rk: 'B', ryo: 8000,  rep: 10, reqClanSize: 2, desc: 'Conduct the Shiromi heir ceremony.' },
  sealed_eye_liberation:{ n: 'Sealed Eye Liberation',    rk: 'A', ryo: 14000, rep: 12, reqClanSize: 1, reqRi: 3, desc: 'Eliminate a sealed bloodline threat.' },
  kagero_deer_rite:     { n: 'Deer Tending Rite',        rk: 'C', ryo: 4000,  rep: 5,  reqClanSize: 1, desc: 'Seasonal duty — tend the Kagero deer.' },
  shadow_ambush:        { n: 'Shadow Net Ambush',        rk: 'B', ryo: 9000,  rep: 7,  reqClanSize: 1, reqRi: 2, desc: 'Trap a fleeing target.' },
  tsuchida_feast:       { n: 'Grand Feast Hosting',      rk: 'C', ryo: 3500,  rep: 8,  reqClanSize: 1, desc: 'Host a village feast — morale +10.' },
  formation_drill:      { n: 'Formation Drill',           rk: 'B', ryo: 7000,  rep: 5,  reqClanSize: 2, desc: 'Run clan formation drills — growth bonus.' },
  okamura_hunt:         { n: 'Great Hunt',                rk: 'B', ryo: 8500,  rep: 6,  reqClanSize: 1, desc: 'Track and bring back a target.' },
  pack_formation:       { n: 'Pack Tactics Drill',        rk: 'C', ryo: 4500,  rep: 4,  reqClanSize: 2, desc: 'Two Okamura members sharpen pack tactics.' },
  mushiba_colony:       { n: 'Colony Calibration',        rk: 'C', ryo: 5000,  rep: 5,  reqClanSize: 1, desc: 'Tune hive bond — intel bonus next month.' },
  insect_net:           { n: 'Hive Surveillance Net',     rk: 'A', ryo: 13000, rep: 9,  reqClanSize: 1, reqRi: 3, desc: 'Blanket an area with surveillance insects.' },
  tamashii_communion:   { n: 'Ancestral Communion',       rk: 'C', ryo: 4500,  rep: 6,  reqClanSize: 1, desc: 'Commune with clan spirits — morale and insight.' },
  soul_severance:       { n: 'Soul Severance',            rk: 'A', ryo: 14000, rep: 11, reqClanSize: 1, reqRi: 3, desc: 'Sever a rogue spirit-technique user.' },
  kusari_sealing:       { n: 'Great Seal Renewal',        rk: 'B', ryo: 9000,  rep: 8,  reqClanSize: 2, desc: 'Reinforce the village\'s binding seals.' },
  chain_binding:        { n: 'Adamantine Chain Binding',  rk: 'S', ryo: 24000, rep: 15, reqClanSize: 1, reqRi: 3, desc: 'Restrain a primal-class threat with chakra chains.' },
  mori_grove:           { n: 'Sacred Grove Tending',      rk: 'C', ryo: 4000,  rep: 7,  reqClanSize: 1, desc: 'Tend the clan\'s ancient grove — village morale.' },
  wood_bastion:         { n: 'Living Bastion',            rk: 'A', ryo: 16000, rep: 13, reqClanSize: 1, reqRi: 3, desc: 'Raise a wood-style fortress — village defense surges.' },
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
      .map(s => s.clan?.toLowerCase()).filter(Boolean)
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
  const members = (G.shinobi || []).filter(s => s.clan?.toLowerCase() === clanId && s.status === 'available')
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
    const memberCount = (G.shinobi || []).filter(s => s.clan?.toLowerCase() === clan.id).length
    result[clan.id] = (memberCount / total) * clan.councilWeight
  }
  return result
}
