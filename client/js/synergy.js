// Squad synergy: clan combos (same + cross-clan), cohesion, chemistry, cross-village, rival pairs, squad identity.
// Pure functions — no side effects, no imports from state.

// ── Same-clan combos ──────────────────────────────────────────────────────────
const SAME_CLAN_COMBOS = {
  Kageha:   { label: 'Kagan Sync',       desc: '+18% power — twin Kagan warp perception together.',          powerMod: 0.18 },
  Shiromi:    { label: 'Twin Hakugan',        desc: '+14% power — 360° sight shared, zero blind spots.',             powerMod: 0.14 },
  Kagero:     { label: 'Shadow Twins',         desc: '+12% power — chained shadow techniques stagger any foe.',       powerMod: 0.12 },
  Tsuchida: { label: 'Meat Tank Formation',  desc: '+12% power — human shields absorb punishment for the team.',    powerMod: 0.12 },
  Tamashii: { label: 'Mind Link',            desc: '+10% power — seamless telepathic coordination.',                powerMod: 0.10 },
  Okamura:  { label: 'Pack Tactics',         desc: '+14% power — fang attacks multiply with numbers.',              powerMod: 0.14 },
  Mushiba:  { label: 'Hive Coordination',    desc: '+10% power — insects swarm with coordinated precision.',        powerMod: 0.10 },
  Fuma:  { label: 'Seal Chain',           desc: '+16% power — sealing techniques amplify each other.',           powerMod: 0.16 },
  Mori:    { label: 'Forest Birth Resonance',    desc: '+20% power — forest birth flourishes in tandem.',               powerMod: 0.20 },
}

// ── Cross-clan combos (specific pairs) ───────────────────────────────────────
const CROSS_CLAN_COMBOS = [
  { clans: ['Kageha', 'Mori'],    label: 'Ancient Rivals United',  desc: '+22% power — centuries of rivalry become devastating synergy.',         powerMod: 0.22, successMod: 0 },
  { clans: ['Fuma', 'Mori'],   label: 'Will of Fire',           desc: '+18% power — the bloodlines that built the village, reunited.',             powerMod: 0.18, successMod: 0.05 },
  { clans: ['Kagero', 'Okamura'],    label: 'Pack Strategists',       desc: '+14% power — shadow jutsu cage enemies for fang attacks.',             powerMod: 0.14, successMod: 0 },
  { clans: ['Shiromi', 'Kageha'],    label: 'Dojutsu Overlord',       desc: '+20% power — two great eye techniques, no blind spots anywhere.',      powerMod: 0.20, successMod: 0 },
  { clans: ['Tsuchida', 'Kagero'],   label: 'Formation Mind-Shadow',    desc: '+12% power — two parts of the three-minds formation.',                  powerMod: 0.12, successMod: 0.05 },
  { clans: ['Tamashii', 'Kagero'],   label: 'Mind & Shadow',          desc: '+12% power — mental control layered over shadow binding.',             powerMod: 0.12, successMod: 0.05 },
  { clans: ['Mushiba', 'Okamura'], label: 'Swarm and Fang',         desc: '+14% power — insects drive targets into fang attack range.',           powerMod: 0.14, successMod: 0 },
  { clans: ['Fuma', 'Shiromi'],   label: 'Unbreakable Sight',      desc: '+15% power — sealing arts guided by Hakugan precision.',             powerMod: 0.15, successMod: 0 },
  { clans: ['Mori', 'Mushiba'],   label: 'Nature\'s Arsenal',      desc: '+14% power — wood and insects combine into living barriers.',          powerMod: 0.14, successMod: 0 },
  { clans: ['Kageha', 'Kagero'],     label: 'Fire and Shadow',        desc: '+16% power — Kagan reads shadow bindings in real time.',           powerMod: 0.16, successMod: 0 },
  { clans: ['Shiromi', 'Tsuchida'],  label: 'See It, Crush It',       desc: '+12% power — Hakugan spots the vulnerability; Tsuchida exploits it.', powerMod: 0.12, successMod: 0 },
  { clans: ['Okamura', 'Fuma'], label: 'Feral Seal',             desc: '+14% power — seals lock targets for fang-strike finishers.',          powerMod: 0.14, successMod: 0.03 },
  { clans: ['Tamashii', 'Kageha'], label: 'Mind Over Eye',          desc: '+16% power — mind-transfer guided by Kagan perception.',          powerMod: 0.16, successMod: 0 },
  { clans: ['Mori', 'Kagero'],      label: 'Deep Root Strategy',     desc: '+14% power — wood pillars create perfect shadow-binding terrain.',     powerMod: 0.14, successMod: 0.04 },
  { clans: ['Mushiba', 'Tamashii'],label: 'Hive Mind',              desc: '+12% power — insect chakra channels feed mental technique range.',     powerMod: 0.12, successMod: 0.03 },
]

// Three-Minds Formation requires all three clans
const ISC_TRIO = new Set(['Kagero', 'Tsuchida', 'Tamashii'])

// ── Chemistry effects (trait combos) ─────────────────────────────────────────
const CHEMISTRY = [
  { match: t => t.filter(x => x === 'Ambitious').length >= 2,
    label: 'Rival Spirits',     desc: '+10% power, -6% success — two Ambitious shinobi push each other hard.',  powerMod: 0.10, successMod: -0.06, color: '#fa0' },
  { match: t => t.includes('Protective') && t.includes('Reckless'),
    label: 'Cover Fire',        desc: '+8% success — Protective cancels out Reckless\'s risk penalty.',          powerMod: 0,    successMod: 0.08,  color: '#8fbc8f' },
  { match: t => t.includes('Loyal') && t.includes('Charismatic'),
    label: 'Band of Brothers',  desc: '+6% success — loyalty and charisma create unshakeable unit cohesion.',   powerMod: 0,    successMod: 0.06,  color: '#8fbc8f' },
  { match: t => t.includes('Lone Wolf'),
    label: 'Friction',          desc: '-4% success — Lone Wolf resents squad structure.',                        powerMod: 0,    successMod: -0.04, color: '#f66' },
  { match: t => t.includes('Vengeful') && t.includes('Protective'),
    label: 'Sworn Vengeance',   desc: '+12% power — they will not let each other fall.',                         powerMod: 0.12, successMod: 0,     color: '#cc7fb8' },
  { match: t => t.includes('Hot-headed') && t.includes('Calm'),
    label: 'Yin-Yang',          desc: '+4% success — Calm steadies the Hot-headed one at critical moments.',     powerMod: 0,    successMod: 0.04,  color: '#87ceeb' },
  { match: t => t.includes('Stoic') && t.includes('Charismatic'),
    label: 'Silent Strength',   desc: '+5% power — composed presence amplifies the leader\'s energy.',           powerMod: 0.05, successMod: 0,     color: '#87ceeb' },
  { match: t => t.includes('Bookworm') && t.includes('Hot-headed'),
    label: 'Theory Meets Fury', desc: '-3% success — constant tactical disagreements slow the team.',            powerMod: 0,    successMod: -0.03, color: '#fa0' },
  { match: t => t.includes('Cowardly') && t.includes('Loyal'),
    label: 'Courage by Proxy',  desc: '+5% success — loyalty overrides cowardice when it counts.',               powerMod: 0,    successMod: 0.05,  color: '#8fbc8f' },
  { match: t => t.includes('Greedy') && t.includes('Honorable'),
    label: 'Uneasy Tension',    desc: '-4% success — fundamentally opposed values create friction.',              powerMod: 0,    successMod: -0.04, color: '#fa0' },
  { match: t => t.includes('Ambitious') && t.includes('Charismatic'),
    label: 'Natural Leaders',   desc: '+8% power — two forces of will pulling in the same direction.',           powerMod: 0.08, successMod: 0,     color: '#c9a84c' },
  { match: t => t.filter(x => x === 'Loyal').length >= 2,
    label: 'Oath Brothers',     desc: '+8% success — unwavering mutual loyalty is its own force multiplier.',    powerMod: 0,    successMod: 0.08,  color: '#c9a84c' },
]

// ── Named squad identities (unlock at cohesion ≥ 75) ─────────────────────────
export const SQUAD_IDENTITIES = [
  { title: 'The Iron Fang',     desc: 'Forged in adversity. Strikes hard, holds harder.',          bonus: '+4% success on all missions.' },
  { title: 'Storm Unit',        desc: 'Fast, unpredictable, unstoppable in motion.',                bonus: '+6% power when outnumbered.' },
  { title: 'The Silent Blade',  desc: 'No wasted movement. No wasted words.',                      bonus: '+5% success on infiltration.' },
  { title: 'Ashwood Brigade',   desc: 'Survivors every one. Harder to kill than to face.',         bonus: 'KIA chance reduced by half.' },
  { title: 'The Crimson Pact',  desc: 'Bound by blood spilled together. Loyalty is chemical.',     bonus: '+8% success after any casualty.' },
  { title: 'Void Formation',    desc: 'They operate in silence and leave the same way.',            bonus: '+5% power on A-rank and above.' },
  { title: 'Thornwall',         desc: 'A defensive line that nothing has broken yet.',              bonus: '+8% power on defense missions.' },
  { title: 'The Pale Lantern',  desc: 'They carry light into the darkest missions.',               bonus: '+4% success, +3% power.' },
  { title: 'Gale Squadron',     desc: 'Speed and coordination as a single instrument.',             bonus: '+6% success on escort missions.' },
  { title: 'Iron Curtain',      desc: 'They have held every line they were given. Every one.',     bonus: '+10% power on S-rank missions.' },
]

// Each identity maps to a small numerical bonus applied in sqSynergy
const IDENTITY_BONUS = { powerMod: 0.04, successMod: 0.04 }

export function sqSynergy(sq, shinobi) {
  const members = sq.members.map(id => shinobi.find(s => s.id === id)).filter(Boolean)
  const bonuses = []
  let powerMod = 0
  let successMod = 0

  // ── Rival pair inside the squad ───────────────────────────────────────────
  const rivalPairs = members.filter(m => m.rivalId && members.some(o => o.id === m.rivalId))
  if (rivalPairs.length >= 2) {
    powerMod += 0.15
    successMod -= 0.08
    bonuses.push({ label: 'Rivals in Arms', desc: '+15% power, -8% success — rivalry pushes limits but fractures teamwork.', color: '#fa0' })
  }

  // ── Clan combos ───────────────────────────────────────────────────────────
  const clans = members.map(s => s.clan).filter(Boolean)
  const clanSet = new Set(clans)

  // Three-Minds Formation trio
  if ([...ISC_TRIO].every(c => clanSet.has(c))) {
    powerMod += 0.35
    successMod += 0.12
    bonuses.push({ label: 'Three-Minds Formation', desc: '+35% power, +12% success — the legendary formation reborn.', color: '#c9a84c' })
  } else {
    // Cross-clan combos (check before same-clan so they don't stack)
    const appliedCrossClans = new Set()
    for (const combo of CROSS_CLAN_COMBOS) {
      const [a, b] = combo.clans
      if (clanSet.has(a) && clanSet.has(b) && !appliedCrossClans.has(a) && !appliedCrossClans.has(b)) {
        powerMod += combo.powerMod
        successMod += (combo.successMod || 0)
        bonuses.push({ label: combo.label, desc: combo.desc, color: '#c9a84c' })
        appliedCrossClans.add(a)
        appliedCrossClans.add(b)
      }
    }

    // Same-clan combos (for clans not consumed by cross-clan combos)
    const clanCounts = {}
    clans.forEach(c => { clanCounts[c] = (clanCounts[c] || 0) + 1 })
    Object.entries(clanCounts).forEach(([clan, count]) => {
      if (count >= 2 && !appliedCrossClans.has(clan)) {
        const combo = SAME_CLAN_COMBOS[clan] || { label: clan + ' Kinship', desc: '+8% power — shared blood, shared instinct.', powerMod: 0.08 }
        powerMod += combo.powerMod
        bonuses.push({ label: combo.label, desc: combo.desc, color: '#87ceeb' })
      }
    })
  }

  // ── Chemistry effects ─────────────────────────────────────────────────────
  const traits = members.map(s => s.pers.n)
  for (const chem of CHEMISTRY) {
    if (chem.match(traits)) {
      powerMod += chem.powerMod
      successMod += chem.successMod
      bonuses.push({ label: chem.label, desc: chem.desc, color: chem.color })
    }
  }

  // ── Cross-village synergy ─────────────────────────────────────────────────
  const origins = members.map(s => s.origin).filter(Boolean)
  if (origins.length >= 2) {
    const uniqueOrigins = new Set(origins)
    if (uniqueOrigins.size >= 2) {
      powerMod += 0.14; successMod += 0.03
      bonuses.push({ label: 'Foreign Legion', desc: '+14% power — diverse village origins create unpredictable tactics.', color: '#cc7fb8' })
    } else {
      powerMod += 0.07
      bonuses.push({ label: origins[0] + ' Techniques', desc: '+7% power — exotic jutsu from ' + origins[0] + ' surprise the enemy.', color: '#87ceeb' })
    }
  } else if (origins.length === 1) {
    powerMod += 0.06
    bonuses.push({ label: origins[0] + ' Arts', desc: '+6% power — techniques from ' + origins[0] + ' give the team an edge.', color: '#87ceeb' })
  }

  // ── Cohesion bonus ────────────────────────────────────────────────────────
  const cohesion = sq.cohesion ?? 0
  const cohesionPowerMod = cohesion * 0.004  // max +40% at 100

  // ── Squad identity bonus ──────────────────────────────────────────────────
  if (sq.identity) {
    powerMod += IDENTITY_BONUS.powerMod
    successMod += IDENTITY_BONUS.successMod
    bonuses.push({ label: sq.identity.title, desc: sq.identity.desc + ' ' + sq.identity.bonus, color: '#c9a84c' })
  }

  return {
    powerMult: 1 + powerMod + cohesionPowerMod,
    successMod,
    bonuses,
    cohesion,
  }
}

/**
 * Calculates a chemistry score (0-100) for a squad based on:
 * - Positive personality matches: +8 each
 * - Negative personality matches: -6 each
 * - Mentor/student bonds between members: +5 each
 * - Brothers-in-Arms bonds: +4 each
 * - Months active together (cohesion as proxy): up to +20
 *
 * Score is clamped 0-100. Used for UI display only — does not affect
 * mission outcomes (sqSynergy already handles that).
 *
 * @param {object} sq - Squad object with .members[], .cohesion
 * @param {Array}  shinobiList - Full shinobi array
 * @returns {{ score: number, tier: string, color: string }}
 */
export function calcChemistry(sq, shinobiList) {
  const members = sq.members.map(id => shinobiList.find(s => s.id === id)).filter(Boolean)
  if (!members.length) return { score: 0, tier: 'Unknown', color: '#555' }

  let score = 50  // neutral baseline

  const traits = members.map(s => s.pers?.n).filter(Boolean)

  // Positive chemistry rules
  const POSITIVE_CHEM = [
    t => t.includes('Loyal') && t.includes('Charismatic'),
    t => t.includes('Protective') && t.includes('Reckless'),
    t => t.includes('Stoic') && t.includes('Charismatic'),
    t => t.filter(x => x === 'Loyal').length >= 2,
    t => t.includes('Cowardly') && t.includes('Loyal'),
    t => t.includes('Calm') && t.includes('Hot-headed'),
    t => t.includes('Ambitious') && t.includes('Charismatic'),
  ]
  const NEGATIVE_CHEM = [
    t => t.includes('Lone Wolf'),
    t => t.includes('Greedy') && t.includes('Honorable'),
    t => t.includes('Bookworm') && t.includes('Hot-headed'),
    t => t.filter(x => x === 'Ambitious').length >= 2,
  ]

  for (const check of POSITIVE_CHEM) { if (check(traits)) score += 8 }
  for (const check of NEGATIVE_CHEM) { if (check(traits)) score -= 6 }

  // Bond bonuses
  members.forEach(m => {
    (m.bonds || []).forEach(b => {
      if (!sq.members.includes(b.otherId)) return
      if (b.type === 'Mentor/Student') score += 5
      else if (b.type === 'Brothers-in-Arms') score += 4
      else if (b.type === 'Rivals') score -= 3
    })
  })

  // Cohesion proxy: 0-100 cohesion → 0-20 chemistry points
  score += Math.round((sq.cohesion ?? 0) * 0.2)

  score = Math.max(0, Math.min(100, score))

  const tier  = score >= 80 ? 'Exceptional' : score >= 65 ? 'Strong' : score >= 45 ? 'Stable' : score >= 25 ? 'Tense' : 'Fractured'
  const color = score >= 80 ? '#c9a84c'     : score >= 65 ? '#8fbc8f' : score >= 45 ? '#87ceeb' : score >= 25 ? '#fa0'   : '#f66'

  return { score, tier, color }
}

export function cohesionLabel(c) {
  if (c >= 90) return 'Legendary'
  if (c >= 75) return 'Elite'
  if (c >= 50) return 'Veteran'
  if (c >= 30) return 'Experienced'
  if (c >= 10) return 'Green'
  return 'New'
}
