// Pure stage-resolution math for the Adept Exam and Grand Tournament brackets.
//
// These formulas used to live inline in client/js/panels/{exam,war}.js, where they
// could only be checked by driving the browser. Extracting them here (R5) lets the
// bracket balance be unit-tested and gives deeper bracket features (e.g. live-battle
// micro-calls) a tested base to build on. Behaviour is legacy-exact — the panels now
// delegate to these, and stageMath.test.js locks the numbers.

// Local clamp so the module has no imports (mirrors state.js clamp).
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

// Squad power = average member power, lifted by cohesion (rewards squad-building).
// Takes an array of already-computed member power values so it stays pure.
export function squadPower(memberPowers, cohesion = 0) {
  if (!memberPowers.length) return 0
  const avg = memberPowers.reduce((a, p) => a + p, 0) / memberPowers.length
  return Math.round(avg * (1 + (cohesion || 0) / 300))
}

// Average of a stat across a squad; `fallback` is used for an empty squad.
export function avgStat(statValues, fallback = 30) {
  return statValues.length
    ? statValues.reduce((a, v) => a + (v || 0), 0) / statValues.length
    : fallback
}

// Seeding edge a finishing position earns: top seed +maxBonus, bottom seed +0.
// Mirrors the seedBonus() closures in exam.js / war.js.
export function seedEdge(seed, numVillages, maxBonus = 0.10) {
  if (!seed || numVillages < 2) return 0
  return Math.round((1 - (seed - 1) / (numVillages - 1)) * (maxBonus * 100)) / 100
}

// Survival multiplier on KIA rolls: vessels hardest to kill, bloodline clans tougher.
export function survivalMult({ isVessel = false, hasClan = false } = {}) {
  if (isVessel) return 0.35
  if (hasClan) return 0.6
  return 1
}

// Group a flat pool into fixed-size cells, dropping any leftover that can't fill
// a full cell (an exam squad must be a complete three-ninja cell). Pure — the
// caller passes an already-ordered pool. Powers the exam panel's quick-form path.
export function groupIntoCells(pool, size = 3) {
  const cells = []
  for (let i = 0; i + size <= pool.length; i += size) cells.push(pool.slice(i, i + size))
  return cells
}

// Cohesion a nominated player squad earns from its exam run — advancing deep is a
// squad-building reward, not just a promotion lottery. Reaching the final is worth
// the most; champions get a further bump; even eliminated cells gain a little from
// fighting together. Returned as a delta the caller clamps onto squad cohesion.
export function examCohesionGain({ reachedFinal = false, champion = false } = {}) {
  let g = 3                     // participation — every nominated cell bonds a little
  if (reachedFinal) g += 9      // survived the whole bracket together
  if (champion) g += 6          // won it all
  return g
}

// ── Adept Exam stage advance probabilities ──────────────────────────────────

// Qualifier — Written Test: rewards intelligence + format fit + seed + posture.
export function examWrittenProb({ avgIntelligence, formatBonus = 0, seedBonus = 0, postureAdv = 0 }) {
  return clamp(0.46 + avgIntelligence / 200 + formatBonus + seedBonus + postureAdv, 0.1, 0.95)
}

// Forest of Death — Navigation phase: speed + intelligence, host edge, posture.
export function examForestNavProb({ avgSpeed, avgIntelligence, hostBonus = 0, formatBonus = 0, postureAdv = 0 }) {
  return clamp(0.46 + (avgSpeed + avgIntelligence) / 400 + hostBonus + formatBonus + postureAdv, 0.12, 0.95)
}

// Forest of Death — Scroll Clash phase: taijutsu + ninjutsu, posture.
export function examForestClashProb({ avgTaijutsu, avgNinjutsu, formatBonus = 0, postureAdv = 0 }) {
  return clamp(0.46 + (avgTaijutsu + avgNinjutsu) / 400 + formatBonus + postureAdv, 0.12, 0.95)
}

// Wound chance in a stage, shifted by posture's woundMod.
export function examInjuryChance(baseInjury, woundMod = 0) {
  return clamp(baseInjury + woundMod, 0, 0.9)
}

// Final — per-member promotion chance: host + format fit − judge bias + posture.
export function examPromotionChance({ hostBonus = 0, formatBonus = 0, biasMod = 0, postureAdv = 0 }) {
  return clamp(0.55 + hostBonus + formatBonus - biasMod + postureAdv, 0.05, 0.97)
}

// ── Grand Tournament (Nation War) stage advance probabilities ────────────────

// Mobilization: power-driven, plus seed edge and command order.
export function warMobilizeProb({ pow, seedBonus = 0, cmdAdv = 0 }) {
  return clamp(0.5 + pow / 220 + seedBonus + cmdAdv, 0.15, 0.95)
}

// The Front: attritional, power + command order.
export function warFrontProb({ pow, cmdAdv = 0 }) {
  return clamp(0.45 + pow / 240 + cmdAdv, 0.1, 0.9)
}

// KIA chance for one shinobi when their squad falls, softened by survival edge.
export function warCasualtyChance(kiaChance, survMult) {
  return clamp(kiaChance * survMult, 0.01, 0.9)
}

// Decisive/Final duel score — higher wins. `jitter` is the caller's RNG roll so the
// function stays deterministic; command advantage is weighted ×60 (a ~6-power swing
// per 0.10 of advance), matching the inline formula.
export function duelScore({ pow, cmdAdv = 0, jitter = 0 }) {
  return pow + jitter + cmdAdv * 60
}
