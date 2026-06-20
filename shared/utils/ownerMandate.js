/**
 * Owner mandate — annual accountability layer.
 *
 * Each January the council sets 3 mandates for the year.
 * Each December the mandates are evaluated and owner confidence adjusts.
 * Confidence < 30 for two consecutive years triggers a no-confidence vote
 * (the Kage is dismissed — dynasty grade is finalised and a new run begins).
 *
 * Pure: no G mutations, no UI calls. Caller applies returned deltas.
 */

export const MANDATE_POOL = [
  { id: 'finish_top3',    n: 'Top-3 Season Finish',    desc: 'End the regular season in the top 3.',            confidenceGain: 12, confidenceLoss: 20 },
  { id: 'win_exam',       n: 'Win the Chunin Exam',     desc: 'Crown your village champion of the Chunin Exam.', confidenceGain: 18, confidenceLoss: 22 },
  { id: 'win_war',        n: 'Win the Nation War',      desc: 'Prevail in the annual Nation War.',               confidenceGain: 20, confidenceLoss: 20 },
  { id: 'stay_solvent',   n: 'Financial Discipline',    desc: 'No more than 2 deficit months this year.',        confidenceGain:  8, confidenceLoss: 15 },
  { id: 'grow_rep',       n: 'Reputation Growth',       desc: 'Raise village reputation by 20+ this year.',     confidenceGain: 10, confidenceLoss: 12 },
  { id: 'no_kia',         n: 'Force Preservation',      desc: 'Suffer no KIA on regular missions.',              confidenceGain:  8, confidenceLoss: 10 },
  { id: 'cap_compliant',  n: 'Payroll Discipline',      desc: 'Do not trigger the luxury tax more than once.',   confidenceGain:  6, confidenceLoss: 10 },
]

export const MANDATE_BY_ID = Object.fromEntries(MANDATE_POOL.map(m => [m.id, m]))

/** Starting owner confidence (out of 100). */
export const CONFIDENCE_START = 75

/** Confidence below this for 2+ consecutive years fires the no-confidence vote. */
export const DISMISSAL_THRESHOLD = 30

/**
 * Pick 3 mandate ids for the coming year (no repeats, avoid last year's set).
 * @param {string[]} lastYearIds - mandate ids used last year to avoid full repeat
 * @param {function} rng
 * @returns {string[]} 3 mandate ids
 */
export function pickMandates(lastYearIds = [], rng = Math.random) {
  const pool = MANDATE_POOL.filter(m => !lastYearIds.includes(m.id))
  const out = []
  const avail = pool.slice()
  while (out.length < 3 && avail.length) {
    const i = Math.floor(rng() * avail.length)
    out.push(avail.splice(i, 1)[0].id)
  }
  // If we couldn't fill 3 (tiny pool), fill from the full pool
  if (out.length < 3) {
    const remaining = MANDATE_POOL.filter(m => !out.includes(m.id))
    while (out.length < 3 && remaining.length) {
      const i = Math.floor(rng() * remaining.length)
      out.push(remaining.splice(i, 1)[0].id)
    }
  }
  return out
}

/**
 * Evaluate mandates at year-end. Returns confidence delta and per-mandate results.
 * @param {string[]} mandateIds - active mandate ids
 * @param {object}  G           - game state snapshot (read-only)
 * @returns {{ results: {id,met,gain}[], delta: number }}
 */
export function evaluateMandates(mandateIds, G) {
  const results = mandateIds.map(id => {
    const def = MANDATE_BY_ID[id]
    if (!def) return { id, met: false, gain: 0 }
    const met = checkMandate(id, G)
    const gain = met ? def.confidenceGain : -def.confidenceLoss
    return { id, met, gain }
  })
  const delta = results.reduce((a, r) => a + r.gain, 0)
  return { results, delta }
}

/** Check a single mandate against current G state. */
export function checkMandate(id, G) {
  switch (id) {
    case 'finish_top3': {
      if (!G.season?.table) return false
      const sorted = Object.values(G.season.table).sort((a, b) => b.pts - a.pts || (b.w - b.l) - (a.w - a.l))
      const pos = sorted.findIndex(r => r.name === G.vName) + 1
      return pos >= 1 && pos <= 3
    }
    case 'win_exam':
      return G.dynastyRecords?.examWins > 0 &&
             (G.dynastyRecords?.lastExamWinYear === G.year)
    case 'win_war':
      return G.warChampion === G.vName && G.warDoneYear === G.year
    case 'stay_solvent':
      return (G.finances?.deficitMonths ?? 0) <= 2
    case 'grow_rep': {
      const startRep = G._mandateStartRep ?? (G.reputation - 20)
      return (G.reputation - startRep) >= 20
    }
    case 'no_kia':
      return (G._mandateKIAThisYear ?? 0) === 0
    case 'cap_compliant':
      return (G._mandateLuxTaxMonths ?? 0) <= 1
    default:
      return false
  }
}
