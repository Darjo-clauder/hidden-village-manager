/**
 * Youth Cup — the annual academy-age tournament (Month 6).
 *
 * The player's brightest academy students face rival villages' and minor
 * nations' junior talent in a single-elimination bracket. This is the FM
 * "wonderkid arc" surface: a student who wins the cup at 13 carries that
 * milestone (and the growth spark) into their whole career.
 *
 * Entrant: { name, village, ico, power, isPlayer, id? } — power is a small
 * scalar (~30–55) comparable across sources; the caller builds entrants,
 * this module only runs the bracket. Pure + deterministic with an injected
 * rng (reuses season.js simMatch for the per-match swing). Unit-tested.
 */

import { simMatch } from './season.js'

/** Stage names by remaining-field size (8 → QF, 4 → SF, 2 → Final). */
export function stageName(fieldSize) {
  return fieldSize > 4 ? 'Quarterfinal' : fieldSize > 2 ? 'Semifinal' : 'Final'
}

/**
 * Run a single-elimination cup: seeds by power (best vs worst pairing each
 * round), sudden-death coin on drawn matches, byes when the field is odd.
 * Returns { rounds: [{ stage, matches: [{ a, b, winner }] }], champion }.
 */
export function runYouthCup(entrants, rng = Math.random) {
  let field = entrants.slice().sort((a, b) => b.power - a.power)
  const rounds = []
  while (field.length > 1) {
    const stage = stageName(field.length)
    const matches = []
    const next = []
    let lo = 0, hi = field.length - 1
    while (lo < hi) {
      const A = field[lo], B = field[hi]
      const res = simMatch(A.power, B.power, rng)
      const winner = res.winner === 'a' ? A : res.winner === 'b' ? B : (rng() < 0.5 ? A : B)
      matches.push({ a: A, b: B, winner })
      next.push(winner)
      lo++; hi--
    }
    if (lo === hi) next.push(field[lo])   // odd field — top remaining seed gets the bye
    rounds.push({ stage, matches })
    field = next
  }
  return { rounds, champion: field[0] || null }
}

/**
 * One entrant's run through a finished cup:
 * { wins, exit: 'Champion' | stage they lost at | 'Did not play' }.
 */
export function entrantRun(cup, name) {
  let wins = 0
  let exit = 'Did not play'
  for (const round of cup.rounds) {
    for (const m of round.matches) {
      if (m.a.name !== name && m.b.name !== name) continue
      if (m.winner.name === name) { wins++; exit = round.stage === 'Final' ? 'Champion' : exit }
      else exit = round.stage
    }
  }
  if (cup.champion?.name === name) exit = 'Champion'
  return { wins, exit }
}

/**
 * Power scalar for a player academy student: average stats with a small
 * potential kicker — a high-ceiling kid punches above current training.
 */
export function studentPower(student) {
  const v = Object.values(student.stats || {})
  const avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
  return Math.round(avg + (student.potential || 0) * 0.08)
}

/** Power scalar for a rival great village's junior entrant. */
export function rivalYouthPower(villageStrength, rng = Math.random) {
  return Math.round(25 + (villageStrength || 50) * 0.22 + rng() * 8)
}

/** Power scalar for a minor nation's junior entrant. */
export function minorYouthPower(nationStrength, rng = Math.random) {
  return Math.round(22 + (nationStrength || 35) * 0.3 + rng() * 6)
}
