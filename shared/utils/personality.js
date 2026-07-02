/**
 * Emergent personality system.
 * Tracks confidence, grudges, and pair chemistry beyond the static pers/pMatrix fields.
 * Pure — no G references. Caller passes shinobi objects.
 */

// Narrative archetype layer — assigned at generation, revealed through play
export const NARRATIVE_ARCHETYPES = [
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

export const ARCHETYPE_BY_ID = Object.fromEntries(NARRATIVE_ARCHETYPES.map(a => [a.id, a]))

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

// ── Role identity / playstyle tags ───────────────────────────────────────────

export const ROLE_TAGS = [
  { id: 'playmaker',  label: 'Playmaker',  desc: 'Elevates squadmates. +3 to each ally\'s effective power when deployed together.',   missionBonus: 0,    squadBonus: 3  },
  { id: 'grinder',    label: 'Grinder',    desc: 'Thrives on volume. +5% sc for every 10 missions completed (cap +15%).',              missionBonus: 0.05, squadBonus: 0  },
  { id: 'enforcer',   label: 'Enforcer',   desc: 'Intimidation factor reduces KIA risk by 1% when deployed.',                          missionBonus: 0,    kiaRiskMod: -0.01 },
  { id: 'tactician',  label: 'Tactician',  desc: 'Reduces mission failure margin. Costly results become Narrow on a 30% roll.',        missionBonus: 0,    squadBonus: 0  },
  { id: 'lone_wolf',  label: 'Lone Wolf',  desc: '+8% sc on solo missions; −4 chemistry when forced into squads.',                     missionBonus: 0.08, squadBonus: -4 },
  { id: 'anchor',     label: 'Anchor',     desc: 'Stabilises squad cohesion. Cohesion floor raised to 20 while deployed.',             missionBonus: 0,    squadBonus: 0  },
]

export const ROLE_TAG_BY_ID = Object.fromEntries(ROLE_TAGS.map(r => [r.id, r]))

const ROLE_TAG_POOL = ['playmaker', 'grinder', 'enforcer', 'tactician', 'lone_wolf', 'anchor']

/**
 * Assign a role tag to a shinobi if they don't have one.
 * Called lazily — not set at generation so it emerges after first missions.
 */
export function assignRoleTag(s) {
  if (s.roleTag) return
  // Bias toward archetype-compatible tags
  const affinities = {
    will_of_fire: 'playmaker', avenger: 'enforcer', prodigy: 'tactician',
    gentle_fist: 'anchor', wild_card: 'lone_wolf', sage_path: 'tactician',
    clan_heir: 'playmaker', rogue_element: 'lone_wolf', medic_path: 'anchor',
  }
  s.roleTag = affinities[s.narrativeArchetype] ?? ROLE_TAG_POOL[Math.floor(Math.random() * ROLE_TAG_POOL.length)]
}

// ── Emotional states ──────────────────────────────────────────────────────────

export const EMOTIONAL_STATES = {
  angry:      { label: 'Angry',      moodMod: -5,  scMod: 0.03,  duration: 2, desc: 'Fuelled by rage — reckless but hits hard.' },
  inspired:   { label: 'Inspired',   moodMod: 8,   scMod: 0.05,  duration: 3, desc: 'Something lit a fire. Operating at peak.' },
  homesick:   { label: 'Homesick',   moodMod: -4,  scMod: -0.03, duration: 3, desc: 'Distracted by thoughts of home.' },
  grieving:   { label: 'Grieving',   moodMod: -8,  scMod: -0.05, duration: 4, desc: 'Loss has hollowed them out for now.' },
  triumphant: { label: 'Triumphant', moodMod: 6,   scMod: 0.04,  duration: 2, desc: 'Victory still fresh. Unstoppable feeling.' },
  fearful:    { label: 'Fearful',    moodMod: -6,  scMod: -0.04, duration: 3, desc: 'Something broke their nerve.' },
  focused:    { label: 'Focused',    moodMod: 3,   scMod: 0.02,  duration: 2, desc: 'Locked in. Nothing else matters.' },
}

/**
 * Set a shinobi's emotional state (replaces previous).
 * @param {object} s  shinobi
 * @param {string} stateId  key from EMOTIONAL_STATES
 */
export function setEmotionalState(s, stateId) {
  const def = EMOTIONAL_STATES[stateId]
  if (!def) return
  s.emotionalState     = stateId
  s.emotionalStateLabel = def.label
  s.emotionalStateMo   = def.duration  // months remaining
}

/**
 * Tick emotional state duration. Called monthly. Clears when expired.
 */
export function tickEmotionalState(s) {
  if (!s.emotionalState) return
  s.emotionalStateMo = (s.emotionalStateMo || 1) - 1
  if (s.emotionalStateMo <= 0) {
    s.emotionalState      = null
    s.emotionalStateLabel = null
    s.emotionalStateMo    = 0
  }
}

/**
 * Returns the sc modifier from the current emotional state (0 if none).
 */
export function emotionalScMod(s) {
  if (!s.emotionalState) return 0
  return EMOTIONAL_STATES[s.emotionalState]?.scMod ?? 0
}

// ── Dynamic NPC quotes ────────────────────────────────────────────────────────

const ARCHETYPE_QUOTES = {
  will_of_fire:   ["For the village.", "I won't let this end here.", "This is my nindo — my ninja way."],
  avenger:        ["I'll remember this.", "Everyone who wronged me will know my name.", "Emotions are just another tool."],
  prodigy:        ["I already knew that.", "My potential is limitless.", "Don't waste my time with easy missions."],
  gentle_fist:    ["Precision over power.", "Every opening closes if you wait.", "I don't fight for glory. I fight to protect."],
  wild_card:      ["Plans are just suggestions.", "Chaos is where I thrive.", "You never know what I'll do next — including me."],
  sage_path:      ["Patience is a weapon too.", "The mission will speak to you if you're quiet enough.", "I've lived through worse."],
  clan_heir:      ["The clan's honour demands nothing less than perfection.", "My name carries weight. I intend to keep it that way.", "Failure is not an option my ancestors would accept."],
  rogue_element:  ["Some things stay buried.", "Trust is earned. I'm still earning mine.", "My past is mine alone."],
  medic_path:     ["No one dies on my watch.", "I didn't train this hard to lose anyone.", "Save them first. Ask questions after."],
}

const MEMORY_VALENCE_QUOTES = {
  positive:  ["Remembering what we're fighting for helps.", "Every win adds up."],
  negative:  ["That failure still stings.", "I won't let that happen again."],
  trauma:    ["Carrying it quietly.", "Some things don't leave you."],
  neutral:   [],
}

/**
 * Returns a personality-colored quote for a shinobi.
 * Influenced by archetype and dominant memory valence.
 * @param {object} s  shinobi (with narrativeArchetype + optional memories)
 * @returns {string}
 */
export function getArchetypeQuote(s) {
  const pk = arr => arr[Math.floor(Math.random() * arr.length)]
  const arch = s.narrativeArchetype
  const pool = ARCHETYPE_QUOTES[arch]

  // 30% chance to pull a memory-colored quote instead
  if (s.memories && s.memories.length && Math.random() < 0.30) {
    const valence = dominantValence(s.memories)
    const vPool = MEMORY_VALENCE_QUOTES[valence] || []
    if (vPool.length) return pk(vPool)
  }

  return pool ? pk(pool) : 'Ready for the next mission.'
}

function dominantValence(memories) {
  if (!memories || memories.length === 0) return 'neutral'
  const scores = { positive: 0, negative: 0, trauma: 0 }
  for (const m of memories) scores[m.valence] = (scores[m.valence] || 0) + m.intensity
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return top[1] > 0.15 ? top[0] : 'neutral'
}

// ── One-line blurb ────────────────────────────────────────────────────────────

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
