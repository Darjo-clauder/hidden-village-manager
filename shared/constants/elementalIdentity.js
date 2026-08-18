/**
 * Elemental identity — the single table the whole world reads.
 *
 * WHY THIS EXISTS. Three overlapping "nation" concepts had grown up
 * independently: NATIONS (the five elemental nations the player picks, in
 * nations.js), VILLAGE_IDENTITIES (the twelve great rivals) and MINOR_NATIONS
 * (eight more). They already agreed on exactly one thing — ELEMENT — and
 * NATIONS maps 1:1 onto it (ember=Fire, tempest=Lightning, tide=Water,
 * dune=Wind, stone=Earth).
 *
 * So the identity package hangs off the element and all three read from here.
 * One table, three consumers, no fourth taxonomy. The payoff is that rivals
 * inherit every strength the player gets, which is what makes scouting them
 * meaningful rather than decorative.
 *
 * Before this, a nation was worth `successMod` 0–4% and `ryoMod` −2–5%, with
 * NO weaknesses at all — the five were functionally identical.
 *
 * Pure data + pure helpers. No G access. Unit-tested.
 */

export const ELEMENTS = ['Fire', 'Water', 'Wind', 'Earth', 'Lightning']

/** The six mission specs the sim actually tags contracts with. */
export const SPECS = ['combat', 'escort', 'intel', 'recovery', 'siege', 'stealth']

/**
 * THE STRENGTH MATRIX — mostly real tradeoffs, with one genuine wall each.
 *
 * Every element gets exactly one +20 SIGNATURE spec and one −20 WALL, with the
 * rest at ±10 or flat. You can still take any contract; you feel it when you
 * take the wrong one.
 *
 * TWO DELIBERATE PROPERTIES, both asserted in tests:
 *
 *  1. EVERY ROW SUMS TO ZERO. No element is globally stronger than another —
 *     they are differently shaped, not differently sized. This is the invariant
 *     that stops one nation being simply the best pick.
 *
 *  2. Columns do NOT sum to zero, on purpose. Escort work is globally easier to
 *     staff (+20 across the five) and stealth globally harder (−20). That is a
 *     statement about the world rather than an imbalance: escort is common
 *     labour, infiltration is specialist, and two elements being walled out of
 *     stealth is what makes a Wind village's monopoly on it feel earned.
 *
 * `intel` has no +20 owner. With five elements and six specs one spec cannot
 * have one, and intel is the right one to leave unowned — it belongs to the
 * scouting and staff layers, not to chakra nature.
 */
export const SPEC_MODS = {
  Fire:      { combat:  0.10, escort:  0.00, intel:  0.00, recovery: -0.10, siege:  0.20, stealth: -0.20 },
  Water:     { combat: -0.10, escort:  0.10, intel:  0.00, recovery:  0.20, siege: -0.20, stealth:  0.00 },
  Wind:      { combat: -0.10, escort:  0.00, intel:  0.10, recovery:  0.00, siege: -0.20, stealth:  0.20 },
  Earth:     { combat:  0.00, escort:  0.20, intel: -0.10, recovery:  0.00, siege:  0.10, stealth: -0.20 },
  Lightning: { combat:  0.20, escort: -0.10, intel:  0.10, recovery: -0.20, siege:  0.00, stealth:  0.00 },
}

/**
 * The elemental wheel. Fire > Wind > Lightning > Earth > Water > Fire.
 *
 * ⚠ THIS IS TEXTURE, NOT A LEVER, AND THE DISTINCTION IS LOAD-BEARING.
 * `docs/MATCHDAY_AS_A_BET.md` exists because matchday had exactly one correct
 * answer per fixture, which made it a lookup table rather than a decision. A
 * base-element counter grid is the same shape. The rule that keeps it safe:
 *
 *   A counter you cannot CHOOSE is texture. A counter you pick each time is a
 *   lookup.
 *
 * So this is only ever applied where the player does NOT select the matchup —
 * league fixtures, mission antagonists, defence raids — and never becomes a
 * per-encounter pick. The tactic layer owns that decision.
 */
export const COUNTER_WHEEL = {
  Fire: 'Wind', Wind: 'Lightning', Lightning: 'Earth', Earth: 'Water', Water: 'Fire',
}
/** Capped at the same 5% the combined-element matchup already uses. */
export const COUNTER_MOD = 0.05

export const ELEMENTAL_IDENTITY = {
  Fire: {
    element: 'Fire', nationId: 'ember', name: 'Ember', crest: '🔥', accent: '#ff5a3c',
    creed: 'Take the ground, then take what stands on it.',
    signature: 'siege', wall: 'stealth',
    // Talent: how hard the roster leans to the element (0–1), plus stat lean.
    talent: { bias: 0.74, stats: { ninjutsu: 4, taijutsu: 2 } },
    blurb: 'Ember villages break things open. Walls, gates, formations — anything that holds still long enough. They are hopeless at going quietly.',
  },
  Water: {
    element: 'Water', nationId: 'tide', name: 'Tide', crest: '🌊', accent: '#46b5ff',
    creed: 'Outlast, recover, return.',
    signature: 'recovery', wall: 'siege',
    talent: { bias: 0.70, stats: { chakra: 4, genjutsu: 2 } },
    blurb: 'Tide villages bring people back. Their medics are the best in the world and their sieges are a standing joke.',
  },
  Wind: {
    element: 'Wind', nationId: 'dune', name: 'Dune', crest: '💨', accent: '#e6b873',
    creed: 'Arrive before they know, leave before they look.',
    signature: 'stealth', wall: 'siege',
    talent: { bias: 0.72, stats: { speed: 4, intelligence: 2 } },
    blurb: 'Dune villages are never where you left them. Give them a wall to break and they will simply go around it, or fail trying.',
  },
  Earth: {
    element: 'Earth', nationId: 'stone', name: 'Stone', crest: '🪨', accent: '#7bd88f',
    creed: 'What we guard, we do not lose.',
    signature: 'escort', wall: 'stealth',
    talent: { bias: 0.76, stats: { taijutsu: 4, chakra: 2 } },
    blurb: 'Nothing entrusted to a Stone escort has ever failed to arrive. Asking one to move unseen is asking a mountain to be discreet.',
  },
  Lightning: {
    element: 'Lightning', nationId: 'tempest', name: 'Tempest', crest: '⚡', accent: '#ffd24a',
    creed: 'One strike. Make it the last one.',
    signature: 'combat', wall: 'recovery',
    talent: { bias: 0.70, stats: { speed: 3, ninjutsu: 3 } },
    blurb: 'Tempest villages end fights. They are less interested in what happens to the people who were in them.',
  },
}

export const IDENTITY_BY_NATION = Object.fromEntries(
  Object.values(ELEMENTAL_IDENTITY).map(i => [i.nationId, i]))

/** Identity for an element name, or null. */
export function identityForElement(el) { return ELEMENTAL_IDENTITY[el] || null }
/** Identity for a nation id (the player's pick), or null. */
export function identityForNation(nationId) { return IDENTITY_BY_NATION[nationId] || null }
/** The element a nation id resolves to, or null. */
export function elementOfNation(nationId) { return IDENTITY_BY_NATION[nationId]?.element || null }

/**
 * Mission-success modifier for an element on a mission spec.
 * Unknown elements and untagged missions contribute nothing.
 */
export function specMod(element, spec) {
  if (!element || !spec) return 0
  return SPEC_MODS[element]?.[spec] ?? 0
}

/** 'signature' | 'strong' | 'neutral' | 'weak' | 'wall' — for UI labelling. */
export function specStanding(element, spec) {
  const m = specMod(element, spec)
  if (m >= 0.20) return 'signature'
  if (m > 0) return 'strong'
  if (m <= -0.20) return 'wall'
  if (m < 0) return 'weak'
  return 'neutral'
}

/**
 * Counter modifier for our element against theirs. See COUNTER_WHEEL — only
 * valid where the player did not choose the matchup.
 */
export function counterMod(ourElement, theirElement) {
  if (!ourElement || !theirElement) return 0
  if (COUNTER_WHEEL[ourElement] === theirElement) return COUNTER_MOD
  if (COUNTER_WHEEL[theirElement] === ourElement) return -COUNTER_MOD
  return 0
}

/** Short read of a matchup, for the build-up card. Null when neither counters. */
export function counterLabel(ourElement, theirElement) {
  const m = counterMod(ourElement, theirElement)
  if (!m) return null
  return m > 0
    ? `${ourElement} has the better of ${theirElement}`
    : `${theirElement} has the better of ${ourElement}`
}

// ── W7 · Terrain and weather ─────────────────────────────────────────────────
/**
 * Conditions a contract can carry. These argue with the element rather than
 * with the shinobi: Fire struggles in a downpour whoever you send. Shown on the
 * mission card so the choice is made knowingly, never as a hidden tax.
 */
export const TERRAINS = [
  { id: 'downpour',  n: 'Downpour',      icon: '🌧', mods: { Fire: -0.15, Water: 0.15, Lightning: 0.05 },
    desc: 'Rain kills flame and carries a charge.' },
  { id: 'tunnels',   n: 'Deep Tunnels',  icon: '🕳', mods: { Wind: -0.15, Earth: 0.15, Fire: -0.05 },
    desc: 'No sky, no air to move, and stone on every side.' },
  { id: 'openplain', n: 'Open Plain',    icon: '🌾', mods: { Wind: 0.15, Earth: -0.10 },
    desc: 'Nothing to hide behind and nothing to shape.' },
  { id: 'ashfall',   n: 'Ashfall',       icon: '🌋', mods: { Fire: 0.15, Water: -0.10, Wind: -0.05 },
    desc: 'The air itself is already burning.' },
  { id: 'stormfront', n: 'Storm Front',  icon: '⛈', mods: { Lightning: 0.15, Wind: 0.05, Fire: -0.10 },
    desc: 'Every strike lands twice.' },
  { id: 'frozen',    n: 'Frozen Waste',  icon: '❄', mods: { Water: 0.10, Fire: -0.10, Earth: -0.05 },
    desc: 'Ground too hard to move, water already waiting.' },
]
export const TERRAIN_BY_ID = Object.fromEntries(TERRAINS.map(t => [t.id, t]))

export function terrainMod(terrainId, element) {
  if (!terrainId || !element) return 0
  return TERRAIN_BY_ID[terrainId]?.mods?.[element] ?? 0
}

/** Pick a terrain for a contract. Deterministic given an rng. */
export function rollTerrain(rng = Math.random) {
  return TERRAINS[Math.floor(rng() * TERRAINS.length)].id
}

// ── W4 · Nation-exclusive techniques ─────────────────────────────────────────
/**
 * Techniques gated by NATION rather than clan — the gap that prompted this
 * work: jutsu eligibility knew about clans, win counts and prodigy status, and
 * nothing at all about where a shinobi came from.
 *
 * Shaped like JUTSU_LIST entries so `eligibleJutsu` and the loadout maths read
 * them unchanged. `element` is the gate; `req` is the career threshold.
 *
 * Deliberately reachable. The rare-jutsu finding (`3d7e467`) proved that a
 * technique behind a rare roll AND a narrow gate is content nobody ever sees —
 * these need only rank and service in the right nation, and depthCoverage
 * asserts every one is actually learned.
 */
export const NATION_TECHNIQUES = [
  { id: 'nt_ember_1',  n: 'Cinderstep',        element: 'Fire',      tier: 'nation', clan: null, req: { winsB: 8 },
    bonus: { powerMod: 0.08 }, desc: 'Ground scorched behind every stride. Pursuit becomes expensive.' },
  { id: 'nt_ember_2',  n: 'Breachfire',        element: 'Fire',      tier: 'nation', clan: null, req: { wins: 25 },
    bonus: { powerMod: 0.12, successMod: 0.04 }, desc: 'A gate is only a wall that has agreed to open. Ember disagrees.' },
  { id: 'nt_tide_1',   n: 'Undertow Grasp',    element: 'Water',     tier: 'nation', clan: null, req: { winsB: 8 },
    bonus: { successMod: 0.08 }, desc: 'The ground gives underfoot and does not give back.' },
  { id: 'nt_tide_2',   n: 'Second Breath',     element: 'Water',     tier: 'nation', clan: null, req: { wins: 25 },
    bonus: { successMod: 0.12 }, desc: 'Tide medics have a saying: nobody is finished until we say so.' },
  { id: 'nt_dune_1',   n: 'Sandveil Step',     element: 'Wind',      tier: 'nation', clan: null, req: { winsB: 8 },
    bonus: { successMod: 0.09 }, desc: 'They were never standing where you struck.' },
  { id: 'nt_dune_2',   n: 'Hollow Passage',    element: 'Wind',      tier: 'nation', clan: null, req: { wins: 25 },
    bonus: { successMod: 0.13 }, desc: 'A way in that the defenders will never find, because it was not there yesterday.' },
  { id: 'nt_stone_1',  n: 'Bedrock Stance',    element: 'Earth',     tier: 'nation', clan: null, req: { winsB: 8 },
    bonus: { powerMod: 0.06, successMod: 0.03 }, desc: 'Immovable, and increasingly annoying about it.' },
  { id: 'nt_stone_2',  n: 'Sealing Bulwark',   element: 'Earth',     tier: 'nation', clan: null, req: { wins: 25 },
    bonus: { successMod: 0.14 }, desc: 'Stone closes over what it was given to protect.' },
  { id: 'nt_tempest_1', n: 'Riding the Arc',   element: 'Lightning', tier: 'nation', clan: null, req: { winsB: 8 },
    bonus: { powerMod: 0.10 }, desc: 'Faster than the decision to move.' },
  { id: 'nt_tempest_2', n: 'Thunderhead',      element: 'Lightning', tier: 'nation', clan: null, req: { wins: 25 },
    bonus: { powerMod: 0.16 }, desc: 'One strike, from a sky that was clear a moment ago.' },
]

export function nationTechniquesFor(element) {
  return NATION_TECHNIQUES.filter(t => t.element === element)
}

// ── W8 · Elemental doctrines ─────────────────────────────────────────────────
/**
 * An exclusive doctrine per element, EXTENDING the three generic ones already
 * in VILLAGE_DOCTRINES (fortress / commerce / sage) rather than sitting beside
 * them — otherwise the player has two unrelated things called doctrine.
 *
 * Same shape as VILLAGE_DOCTRINES so every existing consumer reads them with no
 * change; `element` is the only new field and it gates availability.
 *
 * SCOPE NOTE: the plan called for a five-or-six node track per element. This
 * ships the first node as an exclusive doctrine — real, reachable and wired
 * through tested machinery — rather than a partly-built tree with new UI. The
 * remaining nodes are a follow-on.
 */
export const ELEMENTAL_DOCTRINES = [
  { id: 'pyre',    element: 'Fire',      n: 'Doctrine of the Pyre',    icon: '🔥',
    defBonus: -5, incomeMod: 0.04, growthMod: 0.04,
    desc: 'Ember: +4% income and growth, −5 defense. Everything is fuel, including caution.' },
  { id: 'wellspring', element: 'Water',  n: 'Doctrine of the Wellspring', icon: '🌊',
    defBonus: 8, incomeMod: -0.03, growthMod: 0.08,
    desc: 'Tide: +8% growth, +8 defense, −3% income. Nothing is spent that cannot be recovered, and recovery is not free.' },
  { id: 'driftway', element: 'Wind',     n: 'Doctrine of the Driftway', icon: '💨',
    defBonus: -8, incomeMod: 0.10, growthMod: 0.02,
    desc: 'Dune: +10% income, −8 defense. Walls are for people who intend to be found.' },
  { id: 'bedrock', element: 'Earth',     n: 'Doctrine of Bedrock',      icon: '🪨',
    defBonus: 28, incomeMod: -0.04, growthMod: 0,
    desc: 'Stone: +28 defense, −4% income. Let them come. They have before.' },
  { id: 'stormcall', element: 'Lightning', n: 'Doctrine of the Stormcall', icon: '⚡',
    defBonus: -6, incomeMod: 0.06, growthMod: 0.08,
    desc: 'Tempest: +8% growth, +6% income, −6 defense. Decisive people are expensive, and nobody is watching the wall.' },
]

/** Doctrines a village of this element may adopt, generic ones included. */
export function doctrinesFor(element, generic = []) {
  return [...generic, ...ELEMENTAL_DOCTRINES.filter(d => d.element === element)]
}
