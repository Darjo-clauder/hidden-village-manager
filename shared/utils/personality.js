/**
 * Emergent personality system.
 * Tracks confidence, grudges, and pair chemistry beyond the static pers/pMatrix fields.
 * Pure — no G references. Caller passes shinobi objects.
 */

// Naruto-verse narrative archetype layer — assigned at generation, revealed through play
export const NARUTO_ARCHETYPES = [
  {
    id: 'will_of_fire',
    label: 'Will of Fire',
    desc: "Carries the village on their back. Won't quit while a teammate stands.",
    confidenceFloor: 40,
    chemBonus: 8,
  },
  {
    id: 'avenger',
    label: 'Avenger',
    desc: 'A wound that never healed. Drives them forward and blinds them to cost.',
    confidenceFloor: 20,
    grudgeAmp: 2,
  },
  {
    id: 'prodigy',
    label: 'Prodigy',
    desc: 'Chakra flows like water. Confidence soars with wins, craters with loss.',
    confidenceSwing: 2,
  },
  {
    id: 'gentle_fist',
    label: 'Gentle Fist',
    desc: 'Precision over power. Steady confidence, rarely rattled.',
    confidenceFloor: 45,
  },
  {
    id: 'wild_card',
    label: 'Wild Card',
    desc: 'Unpredictable. Thrives in chaos, a liability when the plan falls apart.',
    confidenceSwing: 1.5,
    chaosBonus: 5,
  },
  {
    id: 'sage_path',
    label: 'Sage Path',
    desc: 'Patient and observant. Confidence grows slowly but never collapses.',
    confidenceFloor: 35,
    confidenceCap: 85,
  },
  {
    id: 'clan_heir',
    label: 'Clan Heir',
    desc: 'Every victory is expected; every failure is a disgrace to the name.',
    grudgeAmp: 1.5,
    confidenceSwing: 1.5,
  },
  {
    id: 'rogue_element',
    label: 'Rogue Element',
    desc: "Carries the stain of a past they don't talk about. Trust is earned slowly.",
    confidenceFloor: 10,
    grudgeAmp: 1.5,
  },
  {
    id: 'medic_path',
    label: 'Medic Path',
    desc: 'Wired to protect. KIA events hit harder; saves amplify confidence.',
    kiaShock: 2,
    saveBoost: 1.5,
  },
]

export const ARCHETYPE_BY_ID = Object.fromEntries(NARUTO_ARCHETYPES.map(a => [a.id, a]))

// Pool for random assignment — weighted toward common archetypes
export const ARCHETYPE_POOL = [
  'will_of_fire', 'will_of_fire', 'will_of_fire',
  'prodigy', 'prodigy',
  'gentle_fist', 'gentle_fist',
  'wild_card', 'wild_card',
  'sage_path',
  'clan_heir',
  'avenger',
  'rogue_element',
  'medic_path',
]

export const GRUDGE_REASONS = [
  { id: 'kia_partner',      label: 'Fallen Comrade',   intensity: 3, desc: 'A squadmate died on their watch.' },
  { id: 'blame_loss',       label: 'Mission Blame',    intensity: 2, desc: 'Blamed for a mission disaster.' },
  { id: 'clan_rivalry',     label: 'Clan Feud',        intensity: 2, desc: 'Ancestral clan tensions surfaced.' },
  { id: 'stolen_promotion', label: 'Promotion Stolen', intensity: 2, desc: 'Someone else got the rank they earned.' },
  { id: 'betrayal',         label: 'Betrayal',         intensity: 3, desc: 'Trust broken in the field.' },
  { id: 'rival_village',    label: 'Enemy Origin',     intensity: 1, desc: 'Old village allegiances die hard.' },
  { id: 'harsh_training',   label: 'Dojo Grudge',      intensity: 1, desc: 'A training rivalry that got personal.' },
]

export const GRUDGE_BY_ID = Object.fromEntries(GRUDGE_REASONS.map(r => [r.id, r]))

/**
 * Update a shinobi's confidence after a mission outcome.
 * @param {object} s        shinobi
 * @param {string} quality  decisive|narrow|costly|disaster
 * @param {object} [opts]   { isLeader, hadKIA, savedSquadmate }
 */
export function updateConfidence(s, quality, opts = {}) {
  if (s.confidence === undefined) s.confidence = 50
  const arch = ARCHETYPE_BY_ID[s.narrativeArchetype]
  const swing = arch?.confidenceSwing ?? 1

  const base = { decisive: 6, narrow: 2, costly: -4, disaster: -10 }
  let d = (base[quality] ?? 0) * swing

  if (opts.isLeader) d = Math.round(d * 1.3)
  if (opts.hadKIA) d -= arch?.kiaShock ? Math.round(8 * arch.kiaShock) : 8
  if (opts.savedSquadmate && arch?.saveBoost) d += Math.round(5 * arch.saveBoost)

  const floor = arch?.confidenceFloor ?? 5
  const cap   = arch?.confidenceCap  ?? 95
  s.confidence = Math.max(floor, Math.min(cap, Math.round((s.confidence || 50) + d)))
}

/**
 * Returns a ±0.05 mission sc modifier based on current confidence.
 * 50 → ±0; 0 → −0.05; 100 → +0.05.
 */
export function confidenceMod(s) {
  const c = s.confidence ?? 50
  return Math.round(((c - 50) / 50) * 5) / 100
}

/**
 * Form (or intensify) a grudge on shinobi s against a target.
 * @param {object} s          the shinobi
 * @param {string} targetId
 * @param {string} targetName
 * @param {string} reasonId   key from GRUDGE_REASONS
 * @param {{ year: number, month: number }} when
 */
export function formGrudge(s, targetId, targetName, reasonId, when) {
  if (!s.grudges) s.grudges = []
  const existing = s.grudges.find(g => g.targetId === targetId)
  const reason = GRUDGE_BY_ID[reasonId]
  const arch   = ARCHETYPE_BY_ID[s.narrativeArchetype]
  const amp    = arch?.grudgeAmp ?? 1

  if (existing) {
    existing.intensity = Math.min(3, existing.intensity + Math.ceil(amp))
    existing.lastEvent = when
    return existing
  }

  const entry = {
    targetId, targetName,
    reasonId, reasonLabel: reason?.label ?? reasonId,
    intensity: Math.min(3, Math.ceil((reason?.intensity ?? 1) * amp)),
    formed: when, lastEvent: when,
  }
  s.grudges.push(entry)
  // Keep list compact — oldest drops off beyond 5
  if (s.grudges.length > 5) s.grudges.splice(0, 1)
  return entry
}

/**
 * Squad power penalty when two grudge-holders share a deployment.
 * Returns a flat negative integer (0, −5, −10, or −15).
 */
export function grudgePenalty(a, b) {
  const gA = (a.grudges || []).find(g => g.targetId === b.id)
  const gB = (b.grudges || []).find(g => g.targetId === a.id)
  const top = Math.max(gA?.intensity ?? 0, gB?.intensity ?? 0)
  return top === 0 ? 0 : -(top * 5)
}

/**
 * Squad power bonus from accumulated pair chemistry.
 * @param {object} a
 * @param {object} b
 * @param {object} [pairChemistryLog]  G.pairChemistryLog
 */
export function pairChemistryBonus(a, b, pairChemistryLog = {}) {
  const key = [a.id, b.id].sort().join('_')
  const shared = pairChemistryLog[key] ?? 0
  const bondA  = (a.bonds || []).find(bd => bd.otherId === b.id)

  let bonus = Math.min(10, Math.floor(shared / 5))
  if (bondA) {
    const BT = { 'Brothers-in-Arms': 8, 'Mentor/Student': 6, 'Battle-Scarred': 5, 'Rivals': 2 }
    bonus += BT[bondA.type] ?? 4
  }
  const arch = ARCHETYPE_BY_ID[a.narrativeArchetype]
  if (arch?.chemBonus) bonus += arch.chemBonus

  return bonus
}

/**
 * One-line blurb describing a shinobi's current emotional arc.
 */
export function personalityBlurb(s) {
  const conf  = s.confidence ?? 50
  const grudges = s.grudges || []
  const arch  = ARCHETYPE_BY_ID[s.narrativeArchetype]

  if (conf >= 80) return `${arch ? arch.label + ' — ' : ''}riding high after recent victories.`
  if (conf <= 20) return `Confidence shattered. ${arch?.desc ?? 'Their edge has dulled.'}`
  if (grudges.length >= 2) return `Carrying old wounds. ${grudges.length} grudges fester beneath the surface.`
  if (arch) return arch.desc
  return 'Steady. Nothing to prove yet.'
}
