/**
 * Team-tactic framework for the match engine (blueprint §3).
 *
 * Three layers, all pure data + helpers:
 *  - Team knobs (tempo / width / forecheck / shape) — auto-mapped from village
 *    identities so every AI side plays like itself with zero new authoring.
 *  - Situational triggers (late push, protect the lead, man down, power phase,
 *    redline) — evaluated from state the sim already tracks.
 *  - Tactic effects on the possession script (pass counts, interception odds
 *    shaping) — consumed by matchEngine.buildMatchScript.
 *
 * DOM-free, unit-tested.
 */

// ── Team knobs ────────────────────────────────────────────────────────────────
export const TEMPO = { patient: { passes: 2, label: 'Patient' }, standard: { passes: 1, label: 'Standard' }, direct: { passes: 0, label: 'Direct' } }
export const WIDTH = { narrow: 0.35, balanced: 0.55, wide: 0.8 }         // lateral spread factor
export const FORECHECK = { passive: 1, standard: 2, swarm: 3 }            // pressing bodies
export const SHAPE = ['collapse', 'zone', 'man-press']

/** Identity style → full tactic row (blueprint §3.1 auto-map). */
export const STYLE_TACTICS = {
  blitz:       { tempo: 'direct',   width: 'wide',     forecheck: 'swarm',    shape: 'zone' },
  fortress:    { tempo: 'patient',  width: 'narrow',   forecheck: 'passive',  shape: 'collapse' },
  opportunist: { tempo: 'standard', width: 'balanced', forecheck: 'standard', shape: 'zone' },
  grinder:     { tempo: 'patient',  width: 'balanced', forecheck: 'standard', shape: 'man-press' },
  balanced:    { tempo: 'standard', width: 'balanced', forecheck: 'standard', shape: 'zone' },
}
export function tacticsForStyle(style) {
  return STYLE_TACTICS[style] || STYLE_TACTICS.balanced
}

/** One-line read of a tactic row for the pre-match / scouting UI. */
export function tacticsRead(t) {
  return `${TEMPO[t.tempo]?.label || 'Standard'} tempo · ${t.width} width · ${t.forecheck} forecheck · ${t.shape}`
}

// ── Situational triggers (blueprint §3.3) ─────────────────────────────────────
/**
 * Evaluate auto-situations for the HOME side before a period.
 *   ctx: { periodIdx, totalPeriods, pointsSoFar (home phase-point sum),
 *          homeKo, awayKo, avgStamina }
 * Returns ordered list of { id, label, note, effects } — the viewer announces
 * each with a ⚑ and applies `effects` to the period's tactic row.
 */
export function evalSituations(ctx = {}) {
  const {
    periodIdx = 0, totalPeriods = 3, pointsSoFar = 0,
    homeKo = 0, awayKo = 0, avgStamina = 100,
  } = ctx
  const out = []
  const lastPeriod = periodIdx >= totalPeriods - 1
  if (avgStamina < 25) {
    out.push({ id: 'redline', label: 'Legs gone', note: 'The squad is spent — forced onto a patient tempo.', effects: { tempo: 'patient' } })
  }
  if (lastPeriod && pointsSoFar < 0) {
    out.push({ id: 'late_push', label: 'Late push', note: 'Behind with time running out — everything forward.', effects: { tempo: 'direct', forecheck: 'swarm' } })
  } else if (lastPeriod && pointsSoFar > 0) {
    out.push({ id: 'protect', label: 'Protecting the lead', note: 'Ahead late — collapse the shape, kill the clock.', effects: { shape: 'collapse', tempo: 'patient' } })
  }
  if (homeKo > awayKo) {
    out.push({ id: 'man_down', label: 'Fighting short', note: 'A shinobi down — the shape compresses.', effects: { shape: 'collapse' } })
  } else if (awayKo > homeKo) {
    out.push({ id: 'power_phase', label: 'Power phase', note: 'The opposition is a body down — press the advantage.', effects: { width: 'wide' } })
  }
  return out
}

/** Apply situation effects (in order) over a base tactic row → effective row. */
export function effectiveTactics(base, situations = []) {
  const t = { ...base }
  situations.forEach(s => Object.assign(t, s.effects))
  return t
}
