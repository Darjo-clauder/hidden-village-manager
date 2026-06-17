/**
 * Dynasty endgame helpers.
 * The dynasty clock runs 30 in-game years. At year 30, the player can trigger
 * a handoff to their designated heir, earning inherited bonuses for the next run.
 */

export const DYNASTY_YEARS = 30

/**
 * Computes dynasty progress as a 0–1 fraction.
 * @param {number} year - current G.year
 * @returns {number}
 */
export function dynastyProgress(year) {
  return Math.min(1, (year || 1) / DYNASTY_YEARS)
}

/**
 * Computes the dynasty grade (S–D) based on multiple factors.
 * @param {object} G
 * @returns {{ grade: string, score: number, breakdown: object }}
 */
export function computeDynastyGrade(G) {
  const legend = G.legend || 0
  const hallCount = (G.hallOfLegends || []).length
  const alliedCount = (G.villages || []).filter(v => v.allied).length
  const prestige = G.prestigeTier || 'D'
  const prestigePoints = { S: 40, A: 30, B: 20, C: 10, D: 0 }[prestige] || 0
  const continuity = G.dynastyContinuityScore || 0
  const districtCount = (G.districts || []).filter(d => d.status === 'built').length

  const breakdown = {
    legend:     Math.min(30, Math.floor(legend / 20)),
    hall:       Math.min(20, hallCount * 5),
    alliances:  Math.min(15, alliedCount * 5),
    prestige:   prestigePoints,
    continuity: Math.min(15, Math.floor(continuity / 10)),
    districts:  Math.min(10, districtCount * 2),
  }
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const grade = score >= 90 ? 'S' : score >= 70 ? 'A' : score >= 50 ? 'B' : score >= 30 ? 'C' : 'D'
  return { grade, score, breakdown }
}

/**
 * Computes inherited bonuses for the next dynasty run based on this run's grade.
 * @param {string} grade
 * @returns {object[]} array of bonus descriptors
 */
export function inheritedBonuses(grade) {
  const base = [
    { id: 'ryo_start',    desc: 'Starting ryo bonus',         value: { S: 20000, A: 12000, B: 6000, C: 2000, D: 0 }[grade] || 0 },
    { id: 'legend_start', desc: 'Starting legend score',      value: { S: 50,    A: 30,    B: 15,   C: 5,    D: 0 }[grade] || 0 },
    { id: 'rep_start',    desc: 'Starting reputation',        value: { S: 80,    A: 60,    B: 40,   C: 20,   D: 10 }[grade] || 10 },
    { id: 'hall_bonus',   desc: 'Hall of Legends passive bonus/mo', value: { S: 1000, A: 600, B: 300, C: 100, D: 0 }[grade] || 0 },
  ]
  return base.filter(b => b.value > 0)
}
