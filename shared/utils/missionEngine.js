/**
 * Event-based mission resolution.
 *
 * A mission no longer resolves as a single coin flip. It plays out as a short
 * sequence of phases, each contested at the mission's success chance (sc). The
 * overall success/failure is still decided exactly as before (rng < sc) so the
 * carefully tuned economy is untouched — but the phase tally yields a *margin*
 * and a *quality* band that drive variable rewards and feed the league table.
 *
 * Pure + deterministic under an injected rng.
 */

export const MISSION_PHASES = ['Infiltration', 'Engagement', 'Extraction']

/**
 * @param {number} sc   success chance, 0..1 (already clamped by caller)
 * @param {function} rng
 * @param {object} [opts] - opts.success forces the outcome (else rng < sc)
 * @returns {{success:boolean, phases:{name,won}[], phasesWon:number, margin:number, quality:string}}
 *   quality ∈ 'decisive' | 'narrow' (successes) | 'costly' | 'disaster' (failures)
 *   margin ∈ -3..+3 (phasesWon minus phasesLost)
 */
export function resolveMission(sc, rng = Math.random, opts = {}) {
  const success = opts.success !== undefined ? opts.success : rng() < sc
  const phases = MISSION_PHASES.map(name => ({ name, won: rng() < sc }))
  const majority = Math.ceil(MISSION_PHASES.length / 2)

  // Reconcile the phase tally with the (balance-preserving) overall outcome.
  let wonIdx = phases.map((p, i) => (p.won ? i : -1)).filter(i => i >= 0)
  let lostIdx = phases.map((p, i) => (!p.won ? i : -1)).filter(i => i >= 0)
  if (success) {
    while (wonIdx.length < majority && lostIdx.length) {
      const i = lostIdx.pop(); phases[i].won = true; wonIdx.push(i)
    }
  } else {
    while (wonIdx.length >= majority && wonIdx.length) {
      const i = wonIdx.pop(); phases[i].won = false; lostIdx.push(i)
    }
  }

  const phasesWon = phases.filter(p => p.won).length
  const margin = phasesWon - (phases.length - phasesWon)
  const quality = success
    ? (phasesWon === phases.length ? 'decisive' : 'narrow')
    : (phasesWon === 0 ? 'disaster' : 'costly')
  return { success, phases, phasesWon, margin, quality }
}

/**
 * Reward/penalty multipliers and flavour for each quality band.
 * ryoMult applies to the mission's base ryo on success; morale is a flat delta.
 */
export const QUALITY_EFFECTS = {
  decisive: { ryoMult: 1.25, morale: 2, legend: 2, label: 'Decisive', tone: 'good' },
  narrow:   { ryoMult: 1.0,  morale: 0, legend: 0, label: 'Narrow',   tone: 'good' },
  costly:   { ryoMult: 0,    morale: 0, legend: 0, label: 'Costly',   tone: 'bad' },
  disaster: { ryoMult: 0,    morale: -3, legend: 0, label: 'Disaster', tone: 'bad' },
}

export function qualityEffects(quality) {
  return QUALITY_EFFECTS[quality] || QUALITY_EFFECTS.narrow
}

/**
 * Tactical approach — chosen per assignment, matched against the mission spec.
 * A matching approach boosts success; a mismatched one penalises it. Makes
 * squad/shinobi selection a puzzle that uses the mission intel (terrain/spec).
 */
export const MISSION_APPROACHES = [
  { id: 'stealth',  label: 'Stealth',  icon: '🥷', favors: ['stealth', 'intel', 'recovery'], scBonus: 0.07, riskMod: -0.03, desc: 'Favors stealth / intel / recovery. Lower risk.' },
  { id: 'balanced', label: 'Balanced', icon: '⚖',  favors: [],                                scBonus: 0,    riskMod: 0,     desc: 'No matchup edge — steady and safe.' },
  { id: 'assault',  label: 'Assault',  icon: '⚔',  favors: ['combat', 'siege'],               scBonus: 0.07, riskMod: 0.03,  desc: 'Favors combat / siege. Higher risk.' },
]
export const APPROACH_BY_ID = Object.fromEntries(MISSION_APPROACHES.map(a => [a.id, a]))

/** @returns {{sc:number, risk:number}} success + risk deltas for an approach vs a mission spec. */
export function missionApproachMod(approachId, spec) {
  const a = APPROACH_BY_ID[approachId] || APPROACH_BY_ID.balanced
  if (!spec) return { sc: 0, risk: a.riskMod }            // no spec → posture only
  if (a.favors.includes(spec)) return { sc: a.scBonus, risk: a.riskMod }
  if (a.id !== 'balanced') return { sc: -a.scBonus, risk: a.riskMod }
  return { sc: 0, risk: 0 }
}
