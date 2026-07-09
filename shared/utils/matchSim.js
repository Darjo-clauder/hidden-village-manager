/**
 * In-match condition sim — stamina + live tactics for the animated match view.
 *
 * The battle viewer is presentation over an already-resolved result; this layer
 * gives it management teeth WITHOUT touching outcomes: every shinobi enters the
 * match with stamina derived from their real condition (chakra reserves, carried
 * fatigue), each beat drains it based on their SQUAD ROLE and the live tactic
 * the player sets from the touchline, and the state they finish in becomes real
 * post-match fatigue/morale. Unit composition is the multiplier: a balanced
 * trio starts fresher, a medic regenerates the squad on won beats, doubled
 * vanguards hit hard but redline fast.
 *
 * Pure functions only — the client applies the effects through a report closure
 * (same live-only pattern as battleCalls). Unit-tested.
 */

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

// ── Starting condition ────────────────────────────────────────────────────────
// Chakra reserves lift the tank; carried fatigue (workload) drains it.
export function staminaStart({ chakra = 30, workload = 0 } = {}) {
  return Math.round(clamp(62 + chakra * 0.55 - workload * 0.4, 25, 100))
}

// ── Live tactics — the touchline dial (mirrors the exam-posture vocabulary) ──
export const MATCH_TACTICS = [
  { id: 'press',    label: 'Press',    icon: '⚔', drain: 1.35, desc: 'Chase every exchange — spectacular when fresh, ruinous when tired.' },
  { id: 'balanced', label: 'Balanced', icon: '⚖', drain: 1.0,  desc: 'Fight the match as it comes.' },
  { id: 'conserve', label: 'Conserve', icon: '🛡', drain: 0.68, desc: 'Protect their legs — concede the flashy exchanges, finish fresh.' },
]
export const TACTIC_BY_ID = Object.fromEntries(MATCH_TACTICS.map(t => [t.id, t]))

// ── Role drain profiles — where unit comp starts to matter ───────────────────
// Vanguards carry the fight and burn hottest; medics pace themselves.
export const ROLE_DRAIN = { vanguard: 1.25, support: 0.9, intel: 0.85, medical: 0.78, flex: 1.0 }

/**
 * Composition read + its mechanical effects. Roles = array like
 * ['vanguard','support','medical']. Returns { tags, startBonus, drainMult, regenPerWin }.
 *  - balanced trio (3+ distinct roles): everyone starts fresher
 *  - medical present: won beats restore a little squad stamina
 *  - support present: eases everyone's drain
 *  - doubled vanguard: heavier collective drain (all-out comp)
 */
export function unitCompRead(roles = []) {
  const counts = {}
  roles.forEach(r => { const k = ROLE_DRAIN[r] ? r : 'flex'; counts[k] = (counts[k] || 0) + 1 })
  const distinct = Object.keys(counts).length
  const tags = []
  let startBonus = 0, drainMult = 1, regenPerWin = 0
  if (distinct >= 3) { tags.push({ id: 'balanced', label: 'Balanced unit', desc: 'Three distinct roles — the squad paces itself. +8 starting stamina.', good: true }); startBonus = 8 }
  if (counts.medical) { tags.push({ id: 'medic', label: 'Field medic', desc: 'Won exchanges restore +4 squad stamina.', good: true }); regenPerWin = 4 }
  if (counts.support) { tags.push({ id: 'support', label: 'Support core', desc: 'Squad drain eased 10%.', good: true }); drainMult *= 0.9 }
  if ((counts.vanguard || 0) >= 2) { tags.push({ id: 'all-out', label: 'All-out comp', desc: 'Doubled vanguard — hits harder, burns 15% hotter.', good: false }); drainMult *= 1.15 }
  return { counts, tags, startBonus, drainMult, regenPerWin }
}

/**
 * Stamina drain for one shinobi over one beat.
 * Lost beats cost more; running on empty compounds (tired legs work harder).
 */
export function beatDrain({ role = 'flex', tactic = 'balanced', won = true, stamina = 100, compDrainMult = 1 } = {}) {
  const base = 13
  const t = TACTIC_BY_ID[tactic] || TACTIC_BY_ID.balanced
  const tired = stamina < 30 ? 1.25 : 1
  return Math.round(base * (ROLE_DRAIN[role] || 1) * t.drain * (won ? 1 : 1.3) * tired * compDrainMult)
}

/** Condition band for display: fresh / working / flagging / spent. */
export function staminaBand(s) {
  return s >= 60 ? { id: 'fresh', label: 'Fresh', color: '#8fbc8f' }
    : s >= 35 ? { id: 'working', label: 'Working', color: '#c9a84c' }
    : s >= 15 ? { id: 'flagging', label: 'Flagging', color: '#f0a030' }
    : { id: 'spent', label: 'Spent', color: '#cc5a4a' }
}

/**
 * The post-match consequence of how the player managed the squad's legs.
 * Applied as REAL deltas (workload/morale) by the report closure — this is the
 * interaction's teeth. Rewards good pacing, punishes a redline finish.
 */
export function finishEffects(avgStamina) {
  if (avgStamina >= 55) return { id: 'fresh', workloadDelta: -5, moraleDelta: 2, label: 'Fresh finish', note: 'Well-paced — the squad walks off with legs to spare. Fatigue eased, spirits up.' }
  if (avgStamina >= 30) return { id: 'worked', workloadDelta: 0, moraleDelta: 0, label: 'Hard-worked', note: 'An honest shift — nothing left in reserve, nothing torn.' }
  return { id: 'redline', workloadDelta: 9, moraleDelta: -1, label: 'Ran ragged', note: 'They gave everything and it shows — heavy legs carried into next month.' }
}

/**
 * Simulate a squad's stamina across the whole beat sequence at once — used by
 * the auto-resolve path, which settles the match without animating it. Mirrors
 * the per-beat drain the live viewer applies, so watching and auto-resolving
 * a given report reach the same finish. Returns the final per-member stamina.
 */
export function simulateFinalStamina({ starts = [], roles = [], beatsWon = [], tactic = 'balanced', comp = { drainMult: 1, regenPerWin: 0 } } = {}) {
  return starts.map((s0, k) => {
    let s = s0
    beatsWon.forEach(won => {
      s -= beatDrain({ role: roles[k] || 'flex', tactic, won, stamina: s, compDrainMult: comp.drainMult || 1 })
      if (won && comp.regenPerWin) s += comp.regenPerWin
      s = clamp(s, 0, 100)
    })
    return s
  })
}

// ── Match preferences (auto-resolve) ──────────────────────────────────────────
export const DEFAULT_MATCH_PREFS = { autoResolve: false, tactic: 'balanced', battleCall: 'commit' }

/** Normalise a (possibly partial/old-save) prefs object to safe values. */
export function resolveMatchPrefs(prefs = {}) {
  const tactic = TACTIC_BY_ID[prefs.tactic] ? prefs.tactic : DEFAULT_MATCH_PREFS.tactic
  const battleCall = ['commit', 'disengage', 'none'].includes(prefs.battleCall) ? prefs.battleCall : DEFAULT_MATCH_PREFS.battleCall
  return { autoResolve: !!prefs.autoResolve, tactic, battleCall }
}

// ── Player of the Match ───────────────────────────────────────────────────────
const _GRADE_RANK = { A: 4, B: 3, C: 2, D: 1 }

/**
 * Pick the standout from the squad's match grades, breaking ties by who kept the
 * most in the tank (stamina discipline). `scores` = [{ name, grade, role }];
 * `staminaByName` optional. Returns { name, grade, role, reason } or null.
 */
export function playerOfMatch(scores = [], staminaByName = {}) {
  const rated = scores.filter(s => s && s.name && s.grade)
  if (!rated.length) return null
  let best = null
  rated.forEach(s => {
    const gr = _GRADE_RANK[s.grade] || 0
    const stam = staminaByName[s.name] ?? 50
    const score = gr * 100 + stam
    if (!best || score > best.score) best = { ...s, score }
  })
  if (!best) return null
  const stam = staminaByName[best.name]
  const reason = best.grade === 'A' ? `A commanding ${best.role || 'all-round'} display`
    : best.grade === 'B' ? `The steadiest hand on the squad`
    : `Carried more than their share on a hard day`
  const stamNote = stam != null && stam >= 55 ? ' — and still had legs at the end' : ''
  return { name: best.name, grade: best.grade, role: best.role, reason: reason + stamNote }
}
