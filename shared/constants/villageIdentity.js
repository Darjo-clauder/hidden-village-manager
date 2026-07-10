/**
 * Village identity — what makes each rival village FEEL different.
 *
 * Every village in RIVAL_VILLAGE_POOL has a fixed identity: a signature pair of
 * stat biases (baked into its generated roster) and a matchday STYLE (how it
 * plays league fixtures). Identity is deterministic by village name, so it needs
 * no save migration — but each run rolls an INTENSITY (0.75–1.25) so the same
 * village is recognizably itself without playing identically run to run.
 *
 * Pure data + helpers; no G access. Unit-tested.
 */

// ── Matchday styles ────────────────────────────────────────────────────────────
// Small, legible effects on the league match sim:
//   varLo/varHi   — per-match performance swing (default 0.7–1.3)
//   drawMult      — widens the draw band (grind-out-a-draw factor)
//   underdogEdge  — effective-strength mult when FACING a stronger side
//   favoriteEdge  — effective-strength mult when FACING a weaker side
export const MATCH_STYLES = {
  blitz: {
    id: 'blitz', label: 'Blitz', icon: '⚡',
    varLo: 0.55, varHi: 1.45, drawMult: 0.7, underdogEdge: 1, favoriteEdge: 1,
    desc: 'All-out aggression — brilliant one week, brittle the next. Few draws.',
  },
  fortress: {
    id: 'fortress', label: 'Fortress', icon: '🛡',
    varLo: 0.82, varHi: 1.18, drawMult: 1.8, underdogEdge: 1, favoriteEdge: 1,
    desc: 'Disciplined and hard to beat — grinds out draws, rarely blown away.',
  },
  opportunist: {
    id: 'opportunist', label: 'Opportunist', icon: '🎯',
    varLo: 0.7, varHi: 1.3, drawMult: 1, underdogEdge: 1.08, favoriteEdge: 1,
    desc: 'Upset merchants — raise their game against stronger opposition.',
  },
  grinder: {
    id: 'grinder', label: 'Grinder', icon: '⚙',
    varLo: 0.7, varHi: 1.3, drawMult: 1, underdogEdge: 1, favoriteEdge: 1.08,
    desc: 'Ruthless favorites — reliably put weaker sides away.',
  },
  balanced: {
    id: 'balanced', label: 'Balanced', icon: '⚖',
    varLo: 0.7, varHi: 1.3, drawMult: 1, underdogEdge: 1, favoriteEdge: 1,
    desc: 'No pronounced tendencies — takes matches as they come.',
  },
}

// ── Identities, keyed by RIVAL_VILLAGE_POOL name ───────────────────────────────
// statBias: signature stats added to every generated roster member (scaled by
// the per-run intensity). Two stats each, themed to the village.
// element: chakra-nature affinity the village's roster leans toward (feeds
//   generation + the exam's elemental-harmony cells). archetypes: signature
//   flavour titles a share of its shinobi carry, so a Frostmere dossier reads
//   differently from an Emberfall one.
export const VILLAGE_IDENTITIES = {
  Dunehold:    { id: 'dunehold',    label: 'Desert Endurance',  style: 'grinder',     statBias: { speed: 5, taijutsu: 4 },        element: 'Earth',     archetypes: ['Dune Strider', 'Sandveil Ascetic'],   blurb: 'Desert-forged conditioning — they outlast you, then break you.' },
  Tidefort:    { id: 'tidefort',    label: 'Tidal Discipline',  style: 'fortress',    statBias: { genjutsu: 5, chakra: 4 },       element: 'Water',     archetypes: ['Tide Caller', 'Mist Diver'],          blurb: 'Patient as the tide — illusion-heavy and maddening to attack.' },
  Stoneveil:   { id: 'stoneveil',   label: 'Stone Doctrine',    style: 'fortress',    statBias: { taijutsu: 5, chakra: 4 },       element: 'Earth',     archetypes: ['Stone Bulwark', 'Granite Monk'],      blurb: 'A wall with a village behind it. Nothing gets through cheaply.' },
  Stormreach:  { id: 'stormreach',  label: 'Storm Assault',     style: 'blitz',       statBias: { speed: 6, ninjutsu: 3 },        element: 'Lightning', archetypes: ['Storm Striker', 'Gale Skirmisher'],   blurb: 'First strike, fastest strike — devastating when it lands.' },
  Wellspring:  { id: 'wellspring',  label: 'Deep Reserves',     style: 'balanced',    statBias: { chakra: 5, intelligence: 4 },   element: 'Water',     archetypes: ['Wellkeeper', 'Deep Adept'],           blurb: 'Bottomless chakra and cool heads. Never beaten before the end.' },
  Verdancross: { id: 'verdancross', label: 'Wildgrowth School', style: 'opportunist', statBias: { ninjutsu: 5, intelligence: 4 }, element: 'Wind',      archetypes: ['Thornweaver', 'Bloomshaper'],         blurb: 'Unorthodox growth techniques — dangerous exactly when underestimated.' },
  Frostmere:   { id: 'frostmere',   label: 'Winter Patience',   style: 'fortress',    statBias: { genjutsu: 5, intelligence: 4 }, element: 'Water',     archetypes: ['Frost Warden', 'Rime Sentinel'],      blurb: 'Cold, methodical, unhurried. They wait for your mistake.' },
  Starhaven:   { id: 'starhaven',   label: 'Prodigy Court',     style: 'opportunist', statBias: { ninjutsu: 5, genjutsu: 4 },     element: 'Lightning', archetypes: ['Star Prodigy', 'Astral Savant'],      blurb: 'A magnet for gifted outliers — brilliance without a system.' },
  Cragmoor:    { id: 'cragmoor',    label: 'Mountain Blood',    style: 'grinder',     statBias: { taijutsu: 6, chakra: 3 },       element: 'Earth',     archetypes: ['Crag Breaker', 'Peakborn Brawler'],   blurb: 'Bred at altitude, built like the cliffs. They bully the weak.' },
  Emberfall:   { id: 'emberfall',   label: 'Ember Fury',        style: 'blitz',       statBias: { ninjutsu: 6, taijutsu: 3 },     element: 'Fire',      archetypes: ['Flame Duelist', 'Ash Runner'],        blurb: 'Everything burns — including, some seasons, their own campaign.' },
  Mistral:     { id: 'mistral',     label: 'Veiled Arts',       style: 'opportunist', statBias: { genjutsu: 5, speed: 4 },        element: 'Wind',      archetypes: ['Veil Dancer', 'Whisper Adept'],       blurb: 'You never see the shape of them until the match is over.' },
  Thornveil:   { id: 'thornveil',   label: 'Thorn Tactics',     style: 'balanced',    statBias: { intelligence: 5, speed: 4 },    element: 'Wind',      archetypes: ['Snare Tactician', 'Bramble Warden'],  blurb: 'Traps, preparation, and precision. Every engagement is planned.' },
}

// Chakra natures used when a village has no explicit affinity (mirrors ELEMENTS).
const _ELEMENTS = ['Fire', 'Water', 'Wind', 'Earth', 'Lightning']

import { MINOR_BY_NAME } from './minorNations.js'

/**
 * Chakra-element affinity for ANY named origin — a great village's themed
 * element, a minor nation's regional element, or null for unthemed names
 * (the player's custom village rolls its own persistent affinity instead).
 */
export function elementAffinityFor(name) {
  return VILLAGE_IDENTITIES[name]?.element || MINOR_BY_NAME[name]?.element || null
}

/**
 * Roll a nation-flavoured (element, archetype) for one generated shinobi. The
 * village's chakra affinity dominates its roster (~60%) but never entirely —
 * every nation still fields the odd outlier — and a share carry a signature
 * archetype title. Pure; pass an rng for determinism. Returns { element, archetype }.
 */
export function nationTalent(identity, rng = Math.random) {
  const aff = identity?.element
  const element = aff && rng() < 0.6 ? aff : _ELEMENTS[Math.floor(rng() * _ELEMENTS.length)]
  const pool = identity?.archetypes || []
  const archetype = pool.length && rng() < 0.5 ? pool[Math.floor(rng() * pool.length)] : null
  return { element, archetype }
}

const DEFAULT_IDENTITY = { id: 'none', label: 'Unaligned', style: 'balanced', statBias: {}, blurb: '' }

/** Identity for a village name (deterministic — safe on old saves). */
export function identityFor(name) {
  return VILLAGE_IDENTITIES[name] || DEFAULT_IDENTITY
}

/** Per-run identity intensity: 0.75–1.25. Same village, different sharpness each world. */
export function rollIntensity(rng = Math.random) {
  return Math.round((0.75 + rng() * 0.5) * 100) / 100
}

/**
 * Apply a village's signature stat bias to a generated shinobi's stats,
 * scaled by the run's intensity. Mutates and returns `stats`.
 */
export function applyIdentityBias(stats, identity, intensity = 1) {
  if (!identity?.statBias) return stats
  Object.entries(identity.statBias).forEach(([k, v]) => {
    if (stats[k] === undefined) return
    stats[k] = Math.max(1, Math.min(99, Math.round(stats[k] + v * intensity)))
  })
  return stats
}

/** Match-sim parameters for a style id (always returns a valid style). */
export function styleParams(styleId) {
  return MATCH_STYLES[styleId] || MATCH_STYLES.balanced
}

// ── Bracket-stage tendencies ───────────────────────────────────────────────────
// How each style behaves across a knockout competition (Adept Exam stages, Grand
// Tournament war stages). Applied to RIVAL squads only — the player expresses
// tendencies through posture/command orders instead. Magnitudes sit well under
// the player's ±10% posture swing so brackets stay winnable, but a blitz village
// starting hot and fading, or an opportunist peaking in the late rounds, becomes
// a recognizable personality across seasons.
//   kind: 'early' (qualifiers/mobilization) | 'endurance' (attrition stages)
//       | 'late' (semifinals/finals/decisive duels)
const STAGE_ADV = {
  blitz:       { early: 0.05,  endurance: -0.02, late: -0.03 },
  fortress:    { early: 0,     endurance: 0.05,  late: 0.02 },
  opportunist: { early: -0.02, endurance: 0,     late: 0.05 },
  grinder:     { early: 0.04,  endurance: 0.02,  late: -0.02 },
  balanced:    { early: 0,     endurance: 0,     late: 0 },
}

/** Advance-probability nudge for a style at a bracket stage kind. 0 for unknowns. */
export function identityStageAdv(styleId, kind) {
  return (STAGE_ADV[styleId] || STAGE_ADV.balanced)[kind] || 0
}
