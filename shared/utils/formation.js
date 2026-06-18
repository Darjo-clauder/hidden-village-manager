/**
 * #8 Tactical formations (scaffold, behind _ff_tacticalFormation).
 * NOTE: overlaps the existing missionPrepMode (aggressive/cautious/balanced). Pending a
 * design decision to either MERGE into prep mode or run as a parallel per-squad layer,
 * this is a tested pure helper only — not yet folded into the sc formula.
 * Tunable feel-parameters below await sign-off.
 */
export const FORMATIONS = {
  balanced: { name: 'Balanced', successMod:  0.00, riskMod:  0.00 },
  vanguard: { name: 'Vanguard', successMod:  0.06, riskMod:  0.04 }, // aggressive push
  phalanx:  { name: 'Phalanx',  successMod: -0.04, riskMod: -0.05 }, // defensive hold
}

/** Returns {successMod, riskMod} for a formation id; unknown -> balanced (zeros). */
export function formationMods(id) {
  const f = FORMATIONS[id] || FORMATIONS.balanced
  return { successMod: f.successMod, riskMod: f.riskMod }
}
