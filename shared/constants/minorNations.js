/**
 * Minor nations — the small villages that populate the world beyond the five
 * great powers. They are not league members: they feed the world with TALENT
 * (transfer-market origins, scouted prospects "via" a minor nation) and with
 * SCHEDULING (off-season exhibition fixtures).
 *
 * Tiers: 'C' = credible regional power, 'D' = backwater. Tier drives exhibition
 * strength and how good their exported talent tends to be. Each nation has a
 * specialty stat its shinobi lean toward — region-flavored, like REGIONS biases.
 *
 * Pure data + helpers; no G access. Unit-tested.
 */

export const MINOR_NATIONS = [
  { n: 'Reedmarsh',  element: 'Water', ico: '🌾', region: 'water',     tier: 'D', specialty: 'genjutsu',     blurb: 'River-delta scrappers — every graduate fights like they have something to prove.',
    clan: { name: 'Ashiba', bloodline: 'Reed Step', b: { genjutsu: 8, speed: 6 } } },
  { n: 'Saltcliff',  element: 'Water', ico: '⛵', region: 'water',     tier: 'C', specialty: 'chakra',       blurb: 'A harbor stronghold with deep reserves and deeper grudges.',
    clan: { name: 'Shiota', bloodline: 'Brine Body', b: { chakra: 10, taijutsu: 5 } } },
  { n: 'Palewood',   element: 'Fire', ico: '🍂', region: 'fire',      tier: 'D', specialty: 'ninjutsu',     blurb: 'A fading forest power that still produces the occasional prodigy.',
    clan: { name: 'Kareha', bloodline: 'Ash Bloom', b: { ninjutsu: 9, intelligence: 5 } } },
  { n: 'Kilnrock',   element: 'Earth', ico: '🧱', region: 'earth',     tier: 'C', specialty: 'taijutsu',     blurb: 'Quarry-town toughness — their fighters are carved, not trained.',
    clan: { name: 'Iwabe', bloodline: 'Kiln Skin', b: { taijutsu: 10, chakra: 5 } } },
  { n: 'Galecrest',  element: 'Wind', ico: '🪁', region: 'wind',      tier: 'C', specialty: 'speed',        blurb: 'Highland runners; the fastest feet outside the great villages.',
    clan: { name: 'Kazehai', bloodline: 'Gale Step', b: { speed: 11, taijutsu: 4 } } },
  { n: 'Bronzegate', element: 'Earth', ico: '🥉', region: 'iron',      tier: 'C', specialty: 'taijutsu',     blurb: 'Mercenary-guild city — disciplined, contract-hungry, chakra-poor.',
    clan: { name: 'Dokan', bloodline: 'Bronze Fist', b: { taijutsu: 10, intelligence: 5 } } },
  { n: 'Hollowfen',  element: 'Water', ico: '🕸', region: 'earth',     tier: 'D', specialty: 'intelligence', blurb: 'Swamp-maze survivors who value cunning over strength.',
    clan: { name: 'Numaki', bloodline: 'Fen Whisper', b: { intelligence: 10, genjutsu: 6 } } },
  { n: 'Skylark',    element: 'Lightning', ico: '🪶', region: 'lightning', tier: 'D', specialty: 'speed',        blurb: 'A mountain-pass waystation famous for couriers and scouts.',
    clan: { name: 'Hibari', bloodline: 'Sky Dart', b: { speed: 10, ninjutsu: 5 } } },
]

export const MINOR_BY_NAME = Object.fromEntries(MINOR_NATIONS.map(m => [m.n, m]))

/** All minor-nation clan names (lowercased id → definition), for lookups + mechanics. */
export const MINOR_CLAN_BY_NAME = Object.fromEntries(MINOR_NATIONS.map(m => [m.clan.name, m.clan]))

/** Exhibition/league-sim strength for a minor nation (well below the great villages). */
export function minorStrength(nation, rng = Math.random) {
  const [lo, hi] = nation.tier === 'C' ? [38, 55] : [26, 42]
  return lo + Math.floor(rng() * (hi - lo + 1))
}

/** Pick a random minor nation, optionally filtered by region id. */
export function pickMinorNation(rng = Math.random, region = null) {
  const pool = region ? MINOR_NATIONS.filter(m => m.region === region) : MINOR_NATIONS
  const src = pool.length ? pool : MINOR_NATIONS
  return src[Math.floor(rng() * src.length)]
}

/**
 * Tag a generated shinobi/prospect as coming out of a minor nation and lean
 * their stats toward its specialty (tier C exports better talent than D).
 * Mutates and returns `s`.
 */
// ── Minor-nation relations ─────────────────────────────────────────────────────
// A standing per minor nation (0–100, neutral 50), moved by exhibitions, signings
// (poaching their talent stings), and gifts. High standing = cheaper fees + better
// scouting access; low standing = they favor your rivals. Stored on G.minorRelations.

export function getMinorRel(rels, name) {
  const v = rels?.[name]
  return typeof v === 'number' ? v : 50
}

/** Adjust and clamp a nation's standing; returns the new value. Mutates `rels`. */
export function adjustMinorRel(rels, name, delta) {
  const next = Math.max(0, Math.min(100, getMinorRel(rels, name) + delta))
  rels[name] = next
  return next
}

/** Standing tier for UI + effects. */
export function minorRelTier(rel) {
  if (rel >= 75) return { id: 'friendly', label: 'Friendly', color: '#8fbc8f' }
  if (rel >= 45) return { id: 'neutral', label: 'Neutral', color: '#c9a84c' }
  if (rel >= 20) return { id: 'cool', label: 'Cool', color: '#cc9a4a' }
  return { id: 'hostile', label: 'Hostile', color: '#cc5a4a' }
}

/** Transfer-fee multiplier from standing: friendly nations discount, hostile ones surcharge. */
export function minorFeeMult(rel) {
  // 0 → 1.15x, 50 → 1.0x, 100 → 0.8x  (linear)
  return Math.round((1.15 - (rel / 100) * 0.35) * 100) / 100
}

export function applyMinorOrigin(s, nation, rng = Math.random) {
  s.origin = nation.n
  s.minorNation = nation.n
  if (s.stats && s.stats[nation.specialty] !== undefined) {
    const bump = (nation.tier === 'C' ? 6 : 4) + Math.floor(rng() * 5) // C: 6–10, D: 4–8
    s.stats[nation.specialty] = Math.max(1, Math.min(99, s.stats[nation.specialty] + bump))
  }
  // ~40% of a minor nation's talent carries its regional bloodline (if not already
  // clanned by a great-village clan). Applies the clan's stat bias.
  if (nation.clan && !s.clan && rng() < 0.4) {
    s.clan = nation.clan.name
    s.trait = nation.clan.bloodline
    if (s.stats) Object.entries(nation.clan.b).forEach(([k, v]) => {
      if (s.stats[k] !== undefined) s.stats[k] = Math.max(1, Math.min(99, s.stats[k] + v))
    })
  }
  return s
}
