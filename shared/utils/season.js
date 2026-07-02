/**
 * Season league table — the "regular season" spine.
 *
 * Between Adept Exams the five villages play monthly matchdays; results
 * accrue into a points table that (a) gives the player a standings race to
 * chase and (b) seeds the exam bracket (the playoff). Pure + deterministic
 * when an rng is injected, so it is fully unit-testable.
 */

import { styleParams } from '../constants/villageIdentity.js'

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

/**
 * Simulate one match by strength with variance; returns winner + raw scores.
 * Optional styles (village identity) shape the sim without touching the default
 * path: variance band (blitz/fortress), draw band (fortress grinds draws),
 * underdog/favorite edges (opportunist/grinder). Defaults = legacy behavior.
 */
export function simMatch(aStr, bStr, rng = Math.random, aStyle = null, bStyle = null) {
  const A = styleParams(aStyle), B = styleParams(bStyle)
  // Underdog/favorite edges apply to effective strength before the swing roll.
  let ea = aStr || 1, eb = bStr || 1
  if (ea < eb) { ea *= A.underdogEdge; eb *= B.favoriteEdge }
  else if (eb < ea) { eb *= B.underdogEdge; ea *= A.favoriteEdge }
  const sa = ea * (A.varLo + rng() * (A.varHi - A.varLo))
  const sb = eb * (B.varLo + rng() * (B.varHi - B.varLo))
  const diff = sa - sb
  const drawBand = Math.max(aStr, bStr, 1) * 0.05 * Math.max(A.drawMult, B.drawMult)
  if (Math.abs(diff) < drawBand) return { winner: 'draw', sa, sb }
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
 * Stylised "objectives secured" scoreline from a sim result — turns abstract strength
 * into a readable score (e.g. 3–1) whose margin tracks how dominant the win was.
 * Deterministic from sa/sb. Returns [scoreA, scoreB] in a/b order.
 */
export function styledScore(res) {
  const sa = res.sa || 0, sb = res.sb || 0
  const hi = Math.max(sa, sb), lo = Math.min(sa, sb)
  const rel = hi > 0 ? (hi - lo) / hi : 0          // 0 = dead even, →1 = blowout
  if (res.winner === 'draw') { const s = 1 + Math.round(rel * 2); return [s, s] }
  const w = 2 + Math.round(rel * 4)                // winner: 2..6
  const l = Math.max(0, Math.round((1 - rel * 1.6) * 2)) // loser: 2..0 as dominance grows
  return res.winner === 'a' ? [w, l] : [l, w]
}

/**
 * Recent form for a team across played rounds, oldest→newest, capped at `n`.
 * Returns an array of 'W' | 'D' | 'L'. Pure read over resultsByRound.
 */
export function teamForm(resultsByRound, name, upToRound, n = 5) {
  const out = []
  for (let r = upToRound - 1; r >= 0 && out.length < n; r--) {
    const rr = resultsByRound[r]; if (!rr) continue
    const m = rr.find(x => x.a === name || x.b === name); if (!m) continue
    out.push(m.winner == null ? 'D' : m.winner === name ? 'W' : 'L')
  }
  return out.reverse()
}

/**
 * Title-race state for the persistent season banner (M3). Pure read over the table.
 * Returns { leader, leaderPts, playerPos, total, gapToLead, roundsLeft, phase, inHunt }.
 */
export function seasonState(table, playerName, round, totalRounds) {
  const order = sortedTable(table)
  if (!order.length) return null
  const leader = order[0]
  const playerPos = order.findIndex(r => r.name === playerName) + 1
  const me = table[playerName] || { pts: 0 }
  const roundsLeft = Math.max(0, totalRounds - round)
  const frac = totalRounds ? round / totalRounds : 0
  const phase = frac < 0.34 ? 'Early season' : frac < 0.67 ? 'Mid season' : roundsLeft <= 1 ? 'Final day' : 'Run-in'
  const gapToLead = (leader.pts || 0) - (me.pts || 0)
  return {
    leader: leader.name, leaderPts: leader.pts || 0,
    playerPos, total: order.length, gapToLead, roundsLeft, phase,
    inHunt: playerPos > 1 && gapToLead <= 4 && playerPos <= Math.ceil(order.length / 2),
    isLeader: playerPos === 1,
  }
}

/**
 * Pre-match build-up for the player's fixture in `round` (M2): opponent, venue,
 * both teams' form, this-season head-to-head, table positions, and what's at stake.
 * Pure — also the data source for the future live-battle pre-match screen. Returns
 * null on a bye / no fixture.
 */
export function matchPreview(table, resultsByRound, schedule, playerName, round) {
  const rnd = schedule[round]; if (!rnd) return null
  const fx = rnd.find(m => m.a === playerName || m.b === playerName); if (!fx) return null
  const home = fx.a === playerName
  const opp = home ? fx.b : fx.a
  const order = sortedTable(table)
  const playerPos = order.findIndex(r => r.name === playerName) + 1
  const oppPos = order.findIndex(r => r.name === opp) + 1
  const h2h = { w: 0, d: 0, l: 0 }
  for (let r = 0; r < round; r++) {
    const rr = resultsByRound[r]; if (!rr) continue
    const m = rr.find(x => (x.a === playerName && x.b === opp) || (x.a === opp && x.b === playerName)); if (!m) continue
    if (m.winner == null) h2h.d++; else if (m.winner === playerName) h2h.w++; else h2h.l++
  }
  const me = table[playerName] || { pts: 0 }
  const leader = order[0]
  const stakes = []
  if (playerPos === 1) stakes.push('Defend top spot')
  else if (leader && (leader.pts - (me.pts || 0)) <= 3) stakes.push('Win to close on the leaders')
  if (playerPos >= order.length && order.length > 1) stakes.push('Climb off the bottom')
  if (oppPos > 0 && oppPos < playerPos) stakes.push(`Leapfrog ${opp}`)
  return {
    opp, home, playerPos, oppPos, posGap: Math.abs(playerPos - oppPos),
    h2h, oppForm: teamForm(resultsByRound, opp, round, 5),
    playerForm: teamForm(resultsByRound, playerName, round, 5), stakes,
  }
}

/**
 * Convert a league result into a beat sequence for the live matchday viewer, from
 * the player's point of view. Pure + deterministic. The scoreline stays authoritative
 * (shown at the end); the 3 contest beats are stylised drama biased by the margin.
 * Returns { phases:[{name,won}], result:'win'|'draw'|'loss', playerScore, oppScore }.
 */
export function matchToBeats(match, playerName) {
  const isA = match.a === playerName
  const ps = (isA ? match.scoreA : match.scoreB) ?? 0
  const os = (isA ? match.scoreB : match.scoreA) ?? 0
  const margin = ps - os
  const names = ['Opening Exchanges', 'Midgame Push', 'Final Stand']
  const pattern = margin >= 2 ? [true, true, true]
    : margin === 1 ? [true, false, true]
    : margin === 0 ? [false, true, false]      // tense, level — outcome shows the draw
    : margin === -1 ? [true, false, false]
    : [false, false, false]
  return {
    phases: names.map((name, i) => ({ name, won: pattern[i] })),
    result: match.winner == null ? 'draw' : match.winner === playerName ? 'win' : 'loss',
    playerScore: ps, oppScore: os,
  }
}

/**
 * Play one matchday for all villages and fold results into the table.
 * Mutates `season` (round++, table, lastResults, resultsByRound). `strOf(name)` → strength.
 * Optional `styleOf(name)` → matchday style id (village identity); null = balanced.
 * Each result carries a stylised scoreline { a, b, winner, scoreA, scoreB }.
 */
export function playMatchday(season, names, strOf, rng = Math.random, styleOf = () => null) {
  const playedRound = season.round
  const pairs = roundPairings(names, season.round)
  const results = []
  pairs.forEach(([a, b]) => {
    const res = simMatch(strOf(a), strOf(b), rng, styleOf(a), styleOf(b))
    recordMatch(season.table, a, b, res)
    const [scoreA, scoreB] = styledScore(res)
    results.push({ a, b, winner: res.winner === 'draw' ? null : (res.winner === 'a' ? a : b), scoreA, scoreB })
  })
  season.lastResults = results
  season.resultsByRound = season.resultsByRound || {}
  season.resultsByRound[playedRound] = results
  season.round++
  return results
}
