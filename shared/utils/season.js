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
 * Full fixture schedule for a season: an array of rounds, each a list of
 * { a, b } pairings. Lets the UI show the year's slate and look ahead.
 */
export function seasonSchedule(names, numRounds) {
  const rounds = []
  for (let r = 0; r < numRounds; r++) rounds.push(roundPairings(names, r).map(([a, b]) => ({ a, b })))
  return rounds
}

/** The fixtures for one team across a schedule: [{ round, opp, home }]. */
export function teamFixtures(schedule, name) {
  const out = []
  schedule.forEach((round, i) => {
    for (const m of round) {
      if (m.a === name) { out.push({ round: i, opp: m.b, home: true }); break }
      if (m.b === name) { out.push({ round: i, opp: m.a, home: false }); break }
    }
  })
  return out
}

/**
 * Standings-driven mid-season pressure — returns at most one notice descriptor
 * (or null) reflecting where the player sits in the race. Pure + deterministic:
 * the same table/round always yields the same notice, so it's unit-testable and
 * the caller controls frequency. `playerName` is the human village.
 *
 * Notice kinds: 'title_race' (top, chasers close), 'clinching' (commanding lead
 * late), 'pace' (leading comfortably mid-table), 'midpack' (drifting), 'slump'
 * (bottom of the table, council restless), 'relegation' (rock bottom, late).
 */
export function seasonPressNotice(table, playerName, round, totalRounds) {
  const rows = sortedTable(table)
  if (rows.length < 2) return null
  const rank = rows.findIndex(r => r.name === playerName)
  if (rank < 0) return null
  const me = rows[rank]
  if ((me.played || 0) < 1) return null               // nothing to react to yet
  const n = rows.length
  const roundsLeft = Math.max(0, totalRounds - round)
  const lateSeason = round >= Math.ceil(totalRounds * 0.6)
  const leader = rows[0]
  const gapToLead = leader.pts - me.pts
  const chaser = rows[rank + 1]
  const gapToChaser = chaser ? me.pts - chaser.pts : Infinity

  // Leading.
  if (rank === 0) {
    if (lateSeason && gapToChaser >= 7) {
      return { kind: 'clinching', priority: 'standard', icon: '🏆',
        title: 'Title in Sight',
        body: `${playerName} top the table with a ${gapToChaser}-point cushion and ${roundsLeft} round(s) to play. The village smells a championship — and the seeding edge into the Grand Tournament that comes with it.` }
    }
    if (gapToChaser <= 3) {
      return { kind: 'title_race', priority: 'standard', icon: '🔥',
        title: 'Top of the Table — Just',
        body: `${playerName} lead, but ${chaser.name} are right on your heels (${gapToChaser <= 0 ? 'level' : `+${gapToChaser}`} pts). Every matchday is a final from here. Drop points and the lead is gone.` }
    }
    return { kind: 'pace', priority: 'info', icon: '📈',
      title: 'Setting the Pace',
      body: `${playerName} sit top of the standings with ${me.pts} pts. Keep the run going and the bracket seeding is yours.` }
  }

  // Bottom of the table.
  if (rank >= n - 1) {
    if (lateSeason) {
      return { kind: 'relegation', priority: 'urgent', icon: '⚠',
        title: 'Council Demands Answers',
        body: `${playerName} are rooted to the bottom of the standings with ${roundsLeft} round(s) left. The council is openly questioning your leadership. A strong finish would cool the room — a poor one will not be forgotten at year's end.` }
    }
    return { kind: 'slump', priority: 'standard', icon: '📉',
      title: 'Fans Growing Restless',
      body: `${playerName} are languishing at the foot of the table (${me.pts} pts). The barracks mood is sour. Results need to turn before this becomes a crisis.` }
  }

  // Chasing from mid-pack.
  if (rank <= Math.floor(n / 2) && gapToLead <= 4) {
    return { kind: 'title_race', priority: 'standard', icon: '🔥',
      title: 'In the Hunt',
      body: `${playerName} sit ${rank + 1}${_ord(rank + 1)}, just ${gapToLead} pts off ${leader.name} at the top. The race is on — a winning streak puts the lead within reach.` }
  }

  if (lateSeason && rank > Math.floor(n / 2)) {
    return { kind: 'midpack', priority: 'info', icon: '😐',
      title: 'Drifting in Mid-Table',
      body: `${playerName} are ${rank + 1}${_ord(rank + 1)} and fading from the seeding picture with ${roundsLeft} round(s) left. Time to string results together or settle for a low seed.` }
  }

  return null
}

function _ord(n) { return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th' }

/**
 * Play one matchday for all villages and fold results into the table.
 * Mutates `season` (round++, table, lastResults, resultsByRound). `strOf(name)` → strength.
 */
export function playMatchday(season, names, strOf, rng = Math.random) {
  const playedRound = season.round
  const pairs = roundPairings(names, season.round)
  const results = []
  pairs.forEach(([a, b]) => {
    const res = simMatch(strOf(a), strOf(b), rng)
    recordMatch(season.table, a, b, res)
    results.push({ a, b, winner: res.winner === 'draw' ? null : (res.winner === 'a' ? a : b) })
  })
  season.lastResults = results
  season.resultsByRound = season.resultsByRound || {}
  season.resultsByRound[playedRound] = results
  season.round++
  return results
}
