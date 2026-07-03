/**
 * World eras — the climate shifts across a dynasty.
 *
 * The per-world economy/threat climate is rolled once at worldgen and then sits
 * static. Over a 30-year dynasty that makes the world feel frozen. Eras re-roll
 * the climate every few years with a named transition ("The Long Peace ends"),
 * so a dynasty lives through booms, recessions, peace and turmoil — cheap texture
 * riding the existing WORLD_CLIMATES hooks (economyMod → income, raidMod → raids).
 *
 * Pure helpers; no G access. Unit-tested.
 */

// Evocative era names keyed by the new climate combo (economyId × threatId).
const ERA_NAMES = {
  'boom|calm':        { name: 'A Golden Age', blurb: 'Prosperity and peace — the village has never had it so good.' },
  'boom|tense':       { name: 'The Gilded Standoff', blurb: 'Coffers swell even as the borders bristle.' },
  'boom|volatile':    { name: 'The Powder-Keg Boom', blurb: 'Wealth flows, but the region could ignite at any moment.' },
  'stable|calm':      { name: 'The Long Peace', blurb: 'Quiet years. Steady markets, quiet borders.' },
  'stable|tense':     { name: 'An Uneasy Balance', blurb: 'Ordinary times under a watchful sky.' },
  'stable|volatile':  { name: 'The Gathering Storm', blurb: 'Markets hold, but the region grows dangerous.' },
  'recession|calm':   { name: 'The Lean Peace', blurb: 'Hard times, at least without war to compound them.' },
  'recession|tense':  { name: 'The Grinding Years', blurb: 'Lean coffers and fraying nerves.' },
  'recession|volatile': { name: 'The Age of Ash', blurb: 'Poverty and violence together — the village must endure.' },
}

/** Era descriptor for a climate combo (always returns something). */
export function eraFor(economyId, threatId) {
  return ERA_NAMES[`${economyId}|${threatId}`] || { name: 'A New Era', blurb: 'The winds of the world shift.' }
}

/** Years until the next era shift: 4–6. */
export function nextShiftIn(rng = Math.random) {
  return 4 + Math.floor(rng() * 3)
}

/**
 * Transition line from the old era to the new — reads like a chronicle beat.
 * `prevName` may be null for the first shift.
 */
export function transitionLine(prevName, next) {
  if (!prevName) return `${next.name} dawns. ${next.blurb}`
  return `${prevName} gives way to ${next.name}. ${next.blurb}`
}
