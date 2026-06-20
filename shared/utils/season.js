/**
 * Season league table — the "regular season" spine.
 *
 * Between Chunin Exams the five villages play monthly matchdays; results
 * accrue into a points table that (a) gives the player a standings race to
 * chase and (b) seeds the exam bracket (the playoff). Pure + deterministic
 * when an rng is injected, so it is fully unit-testable.
 */

export const SEASON_PTS = { win: 3, draw: 1, loss: 0 }
const BYE = '__BYE__'

/** Build an empty table keyed by village name. */
export function initSeasonTable(names) {
  const table = {}
  names.forEach(n => { table[n] = { name: n, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, played: 0 } })
  return table
}

/**
 * Circle-method round-robin pairings for a given round index.
 * Every village faces each other exactly once across (n-1) rounds, then repeats.
 */
export function roundPairings(names, round) {
  const arr = names.slice()
  if (arr.length % 2 === 1) arr.push(BYE)
  const n = arr.length
  if (n < 2) return []
  const r = ((round % (n - 1)) + (n - 1)) % (n - 1)
  const fixed = arr[0]
  const rest = arr.slice(1)
  for (let i = 0; i < r; i++) rest.unshift(rest.pop())
  const order = [fixed, ...rest]
  const pairs = []
  for (let i = 0; i < n / 2; i++) {
    const a = order[i], b = order[n - 1 - i]
    if (a !== BYE && b !== BYE) pairs.push([a, b])
  }
  return pairs
}

/** Simulate one match by strength with variance; returns winner + raw scores. */
export function simMatch(aStr, bStr, rng = Math.random) {
  const sa = (aStr || 1) * (0.7 + rng() * 0.6)
  const sb = (bStr || 1) * (0.7 + rng() * 0.6)
  const diff = sa - sb
  if (Math.abs(diff) < Math.max(aStr, bStr, 1) * 0.05) return { winner: 'draw', sa, sb }
  return { winner: diff > 0 ? 'a' : 'b', sa, sb }
}

/** Apply a match result to the table. */
export function recordMatch(table, aName, bName, result) {
  const A = table[aName], B = table[bName]
  if (!A || !B) return
  A.played++; B.played++
  const margin = Math.round(Math.abs((result.sa || 0) - (result.sb || 0)))
  if (result.winner === 'draw') {
    A.d++; B.d++; A.pts += SEASON_PTS.draw; B.pts += SEASON_PTS.draw
  } else if (result.winner === 'a') {
    A.w++; B.l++; A.pts += SEASON_PTS.win; A.gf += margin; B.ga += margin
  } else {
    B.w++; A.l++; B.pts += SEASON_PTS.win; B.gf += margin; A.ga += margin
  }
}

/** Standings order: points, then win-diff, then score-diff, then name. */
export function sortedTable(table) {
  return Object.values(table).sort((a, b) =>
    b.pts - a.pts ||
    (b.w - b.l) - (a.w - a.l) ||
    (b.gf - b.ga) - (a.gf - a.ga) ||
    a.name.localeCompare(b.name))
}

/** Seeding map { [name]: seed } from finishing order (1 = top seed). */
export function seedsFromTable(table) {
  const seeds = {}
  sortedTable(table).forEach((row, i) => { seeds[row.name] = i + 1 })
  return seeds
}

/**
 * Play one matchday for all villages and fold results into the table.
 * Mutates `season` (round++, table, lastResults). `strOf(name)` returns strength.
 */
export function playMatchday(season, names, strOf, rng = Math.random) {
  const pairs = roundPairings(names, season.round)
  const results = []
  pairs.forEach(([a, b]) => {
    const res = simMatch(strOf(a), strOf(b), rng)
    recordMatch(season.table, a, b, res)
    results.push({ a, b, winner: res.winner === 'draw' ? null : (res.winner === 'a' ? a : b) })
  })
  season.lastResults = results
  season.round++
  return results
}
