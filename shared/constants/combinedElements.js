/**
 * Combined elements — what two chakra natures become when one shinobi holds
 * both at once.
 *
 * WHY THIS EXISTS. `s.element` was, mechanically, decoration. It tinted a
 * circle in the battle viewer, nudged roster generation, and paid a 3-point
 * cohesion bonus if an exam cell happened to match. Nothing in mission
 * resolution ever read it. Five elements, one flavour line each, no decisions
 * attached. This layer is where the element finally does something: it is rare,
 * it is visible, it changes the odds, and it unlocks a technique nobody else
 * can learn.
 *
 * TEN COMBINATIONS, one for every unordered pair of the five base elements —
 * so the set is complete by construction and no pair is a dead end. Names are
 * plain English on purpose: this build is IP-neutral and stays that way.
 *
 * THREE WAYS TO GET ONE, deliberately, because a single rare roll is how you
 * build content nobody sees. The depth sweep measured exactly that: the three
 * prodigy-gated rare jutsu were never learned once across 160 village-years,
 * because they needed a ~1-in-4,000 roll AND one clan in seventeen. So:
 *
 *   1. INNATE      — a small roll at generation. The lottery, kept small.
 *   2. CLAN        — six clans are predisposed to a specific combination,
 *                    which makes their bloodline mean something concrete and
 *                    gives recruiting a reason to care about clan names.
 *   3. AWAKENING   — the earnable path, and the one that carries the drama:
 *                    a shinobi who already has a parent element, enough chakra
 *                    and enough career behind them can awaken it in the field.
 *
 * Pure data + pure helpers. No G access, fully deterministic when an rng is
 * injected. Unit-tested.
 */

/** Canonical order, so a pair always resolves to the same key regardless of argument order. */
export const BASE_ELEMENTS = ['Fire', 'Water', 'Wind', 'Earth', 'Lightning']

export const COMBINED_ELEMENTS = [
  {
    id: 'scald', name: 'Scald', parents: ['Fire', 'Water'], icon: '♨', color: '#d98f7a',
    specs: ['siege', 'combat'], strongInto: ['Earth'],
    blurb: 'Water forced past boiling. It goes where a blade cannot and leaves nothing standing.',
    signature: { id: 'ce_scald', n: 'Boiling Shroud', minRi: 2, bonus: { powerMod: 0.10, successMod: 0.04 },
      desc: 'A scalding fog that blinds a position and cooks the armour inside it.' },
  },
  {
    id: 'scorch', name: 'Scorch', parents: ['Fire', 'Wind'], icon: '🔆', color: '#e8a33d',
    specs: ['combat', 'siege'], strongInto: ['Wind'],
    blurb: 'Fire fed until the air itself burns. Nothing caught in it stays whole.',
    signature: { id: 'ce_scorch', n: 'Searing Wake', minRi: 2, bonus: { powerMod: 0.14 },
      desc: 'A wall of heat drawn across the field, faster than anyone can retreat through it.' },
  },
  {
    id: 'magma', name: 'Magma', parents: ['Fire', 'Earth'], icon: '🌋', color: '#c85a3a',
    specs: ['siege', 'combat'], strongInto: ['Earth'],
    blurb: 'Stone made liquid. Slow, unstoppable, and it reshapes the ground it takes.',
    signature: { id: 'ce_magma', n: 'Molten Bulwark', minRi: 3, bonus: { powerMod: 0.12, successMod: 0.05 },
      desc: 'The earth opens and closes again as a wall of cooling rock.' },
  },
  {
    id: 'plasma', name: 'Plasma', parents: ['Fire', 'Lightning'], icon: '✴', color: '#f0e08a',
    specs: ['combat', 'intel'], strongInto: ['Water'],
    blurb: 'Charge and flame collapsed into one point. It arrives before the sound does.',
    signature: { id: 'ce_plasma', n: 'Arc Lance', minRi: 3, bonus: { powerMod: 0.16 },
      desc: 'A single line of white heat, thrown further than any technique has a right to reach.' },
  },
  {
    id: 'rime', name: 'Rime', parents: ['Water', 'Wind'], icon: '❄', color: '#a8d8e8',
    specs: ['stealth', 'escort'], strongInto: ['Fire'],
    blurb: 'Cold that settles rather than strikes. Sound dies in it, and so does pursuit.',
    signature: { id: 'ce_rime', n: 'Glacier Veil', minRi: 2, bonus: { successMod: 0.10 },
      desc: 'A drifting bank of ice-fog that hides a squad and slows anything following it.' },
  },
  {
    id: 'verdant', name: 'Verdant', parents: ['Water', 'Earth'], icon: '🌿', color: '#7ab86a',
    specs: ['recovery', 'escort'], strongInto: ['Lightning'],
    blurb: 'Growth called up out of bare ground. The rarest of them, and the only one that heals.',
    signature: { id: 'ce_verdant', n: 'Living Bastion', minRi: 3, bonus: { successMod: 0.12, powerMod: 0.04 },
      desc: 'Roots thrown up as cover, and the wounded pulled back behind them.' },
  },
  {
    id: 'tempest', name: 'Tempest', parents: ['Water', 'Lightning'], icon: '🌩', color: '#6f8fd8',
    specs: ['combat', 'intel'], strongInto: ['Wind'],
    blurb: 'A storm held in the hand. Indiscriminate, and difficult to put down once it starts.',
    signature: { id: 'ce_tempest', n: 'Squall Line', minRi: 3, bonus: { powerMod: 0.13, successMod: 0.03 },
      desc: 'Charged rain driven flat across a position until nothing can hold formation.' },
  },
  {
    id: 'dust', name: 'Dust', parents: ['Wind', 'Earth'], icon: '🌪', color: '#c2b280',
    specs: ['stealth', 'siege'], strongInto: ['Lightning'],
    blurb: 'The ground lifted and carried. It buries tracks, and occasionally the people who left them.',
    signature: { id: 'ce_dust', n: 'Shrouding Gale', minRi: 2, bonus: { successMod: 0.09, powerMod: 0.03 },
      desc: 'A blinding curtain of grit that erases an approach entirely.' },
  },
  {
    id: 'squall', name: 'Squall', parents: ['Wind', 'Lightning'], icon: '🌬', color: '#9fd0e0',
    specs: ['intel', 'stealth'], strongInto: ['Water'],
    blurb: 'Air pulled taut until it carries a charge. It hears further than it strikes.',
    signature: { id: 'ce_squall', n: 'Far Whisper', minRi: 2, bonus: { successMod: 0.11 },
      desc: 'The wind carries back what was said three valleys away.' },
  },
  {
    id: 'quartz', name: 'Quartz', parents: ['Earth', 'Lightning'], icon: '💠', color: '#b9a8d8',
    specs: ['recovery', 'combat'], strongInto: ['Fire'],
    blurb: 'Stone grown into lattice and charged through. It holds a blow, then returns it.',
    signature: { id: 'ce_quartz', n: 'Refracting Guard', minRi: 3, bonus: { powerMod: 0.08, successMod: 0.08 },
      desc: 'A crystal shell that takes the strike and throws the charge back down it.' },
  },
]

export const COMBINED_BY_ID = Object.fromEntries(COMBINED_ELEMENTS.map(c => [c.id, c]))

/**
 * Every signature technique, shaped like a JUTSU_LIST entry so the existing
 * loadout maths and the dossier's jutsu list can read them without a special
 * case. `req` is empty because eligibility is the combined element itself.
 */
export const COMBINED_SIGNATURES = COMBINED_ELEMENTS.map(c => ({
  ...c.signature,
  tier: 'signature', req: {}, clan: null,
  combinedId: c.id, element: c.name, icon: c.icon,
}))
export const SIGNATURE_BY_ID = Object.fromEntries(COMBINED_SIGNATURES.map(s => [s.id, s]))

/**
 * Clans predisposed to a combination. Six of the nine major clans, so clan
 * identity carries real weight without every clan being a guaranteed jackpot —
 * a predisposed shinobi still has to roll it or awaken it, just far more often.
 */
export const CLAN_PREDISPOSITION = {
  Mori: 'verdant',     // Forest Birth — the growth bloodline, the obvious home for it
  Kusari: 'quartz',    // Chain Seal — lattice and binding
  Kageha: 'scorch',    // fire-lineage
  Shiromi: 'rime',     // still, precise, defensive
  Tsuchida: 'magma',   // earth-body clan
  Kagero: 'dust',      // shadow and concealment
}

// ── Odds ──────────────────────────────────────────────────────────────────
/** Base chance a newly generated shinobi is innately combined. */
export const INNATE_CHANCE = 0.012
/** Chance for a shinobi of a predisposed clan, when the roll matches their clan's combination. */
export const CLAN_CHANCE = 0.18
/** Minimum chakra stat before an awakening is possible at all. */
export const AWAKEN_MIN_CHAKRA = 62
/** Minimum career wins before an awakening is possible at all. */
export const AWAKEN_MIN_WINS = 12
/** Per-month chance once every condition is met. */
export const AWAKEN_CHANCE = 0.03
/** Multiplier on that chance in the month a shinobi survives a disaster or a squadmate's death. */
export const AWAKEN_CRISIS_MULT = 6

/** The combination formed by two base elements, or null if they are the same / unknown. */
export function combineElements(a, b) {
  if (!a || !b || a === b) return null
  return COMBINED_ELEMENTS.find(c => c.parents.includes(a) && c.parents.includes(b)) || null
}

/** The combined element a shinobi actually has, or null. */
export function combinedOf(s) {
  return s?.combinedElement ? (COMBINED_BY_ID[s.combinedElement] || null) : null
}

/** Does this shinobi hold one of the combination's two parent elements? */
export function hasParent(s, combined) {
  return !!combined && !!s?.element && combined.parents.includes(s.element)
}

/**
 * Which combination a shinobi could plausibly develop: their clan's, if their
 * element fits it, otherwise one of the three that build on their element.
 * Deterministic given an rng.
 */
export function candidateFor(s, rng = Math.random) {
  if (!s?.element) return null
  const clanPick = CLAN_PREDISPOSITION[s.clan]
  const clanCombined = clanPick ? COMBINED_BY_ID[clanPick] : null
  if (clanCombined && hasParent(s, clanCombined)) return clanCombined
  const options = COMBINED_ELEMENTS.filter(c => c.parents.includes(s.element))
  return options.length ? options[Math.floor(rng() * options.length)] : null
}

/**
 * Roll a combination at generation. Returns the combined element or null.
 * A predisposed clan is far likelier, but only toward its own combination.
 */
export function rollInnate(s, rng = Math.random) {
  if (!s?.element || s.combinedElement) return null
  const clanPick = CLAN_PREDISPOSITION[s.clan]
  const clanCombined = clanPick ? COMBINED_BY_ID[clanPick] : null
  if (clanCombined && hasParent(s, clanCombined)) {
    return rng() < CLAN_CHANCE ? clanCombined : null
  }
  if (rng() >= INNATE_CHANCE) return null
  return candidateFor(s, rng)
}

/**
 * Is this shinobi eligible to awaken one, and how likely is it this month?
 * Returns { eligible, chance, combined }. `crisis` is the caller's signal that
 * something happened this month worth awakening for.
 */
export function awakeningOdds(s, { crisis = false } = {}, rng = Math.random) {
  if (!s || s.combinedElement || !s.element) return { eligible: false, chance: 0, combined: null }
  const chakra = s.stats?.chakra || 0
  if (chakra < AWAKEN_MIN_CHAKRA || (s.wins || 0) < AWAKEN_MIN_WINS) {
    return { eligible: false, chance: 0, combined: null }
  }
  const combined = candidateFor(s, rng)
  if (!combined) return { eligible: false, chance: 0, combined: null }
  return { eligible: true, chance: AWAKEN_CHANCE * (crisis ? AWAKEN_CRISIS_MULT : 1), combined }
}

/**
 * The mission modifier a combined element contributes: a flat edge, doubled on
 * the two mission specs it suits. Small on purpose — this sits on top of a long
 * chain of other modifiers in mission resolution, and the element layer is meant
 * to tilt a mission, not decide it.
 */
export const COMBINED_BASE_MOD = 0.03
export const COMBINED_SPEC_MOD = 0.06

export function combinedMissionMod(s, mission) {
  const c = combinedOf(s)
  if (!c) return 0
  if (mission?.spec && c.specs.includes(mission.spec)) return COMBINED_SPEC_MOD
  return COMBINED_BASE_MOD
}

/** Aggregate mission modifier for a squad, averaged so a full squad cannot stack it away. */
export function squadCombinedMod(members, mission) {
  const list = (members || []).filter(Boolean)
  if (!list.length) return 0
  const total = list.reduce((a, s) => a + combinedMissionMod(s, mission), 0)
  return total / list.length
}

/** Matchup edge against an opposing base element, e.g. Rime into Fire. */
export const MATCHUP_MOD = 0.05
export function matchupMod(s, opposingElement) {
  const c = combinedOf(s)
  if (!c || !opposingElement) return 0
  return c.strongInto.includes(opposingElement) ? MATCHUP_MOD : 0
}

/** Has this shinobi earned their signature technique yet? */
export function signatureUnlocked(s) {
  const c = combinedOf(s)
  if (!c) return false
  return (s.ri || 0) >= c.signature.minRi
}

/** A one-line dossier read. Null when they have no combination. */
export function combinedBlurb(s) {
  const c = combinedOf(s)
  if (!c) return null
  const how = s.combinedSource === 'awakened' ? 'Awakened' : s.combinedSource === 'clan' ? 'Clan bloodline' : 'Born to it'
  return `${c.icon} ${c.name} — ${c.parents.join(' + ')}. ${how}.`
}
