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
  { n: 'Reedmarsh',  ico: '🌾', region: 'water',     tier: 'D', specialty: 'genjutsu',     blurb: 'River-delta scrappers — every graduate fights like they have something to prove.' },
  { n: 'Saltcliff',  ico: '⛵', region: 'water',     tier: 'C', specialty: 'chakra',       blurb: 'A harbor stronghold with deep reserves and deeper grudges.' },
  { n: 'Palewood',   ico: '🍂', region: 'fire',      tier: 'D', specialty: 'ninjutsu',     blurb: 'A fading forest power that still produces the occasional prodigy.' },
  { n: 'Kilnrock',   ico: '🧱', region: 'earth',     tier: 'C', specialty: 'taijutsu',     blurb: 'Quarry-town toughness — their fighters are carved, not trained.' },
  { n: 'Galecrest',  ico: '🪁', region: 'wind',      tier: 'C', specialty: 'speed',        blurb: 'Highland runners; the fastest feet outside the great villages.' },
  { n: 'Bronzegate', ico: '🥉', region: 'iron',      tier: 'C', specialty: 'taijutsu',     blurb: 'Mercenary-guild city — disciplined, contract-hungry, chakra-poor.' },
  { n: 'Hollowfen',  ico: '🕸', region: 'earth',     tier: 'D', specialty: 'intelligence', blurb: 'Swamp-maze survivors who value cunning over strength.' },
  { n: 'Skylark',    ico: '🪶', region: 'lightning', tier: 'D', specialty: 'speed',        blurb: 'A mountain-pass waystation famous for couriers and scouts.' },
]

export const MINOR_BY_NAME = Object.fromEntries(MINOR_NATIONS.map(m => [m.n, m]))

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
export function applyMinorOrigin(s, nation, rng = Math.random) {
  s.origin = nation.n
  s.minorNation = nation.n
  if (s.stats && s.stats[nation.specialty] !== undefined) {
    const bump = (nation.tier === 'C' ? 6 : 4) + Math.floor(rng() * 5) // C: 6–10, D: 4–8
    s.stats[nation.specialty] = Math.max(1, Math.min(99, s.stats[nation.specialty] + bump))
  }
  return s
}
