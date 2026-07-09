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
// squad-building reward, not just a promotion lottery. `stagesAdvanced` is how many
// bracket rounds the cell survived (0 = out in the qualifier, 3 = a finalist);
// champions get a further bump. Every nominated cell gains a little from fighting
// together. Returned as a delta the caller clamps onto squad cohesion.
// Legacy-compatible: a finalist (3) lands on 12, a champion on 18 as before, but
// mid-bracket exits (semifinal 9, forest 6) now scale in between.
export function examCohesionGain({ stagesAdvanced = 0, champion = false } = {}) {
  let g = 3 + clamp(stagesAdvanced, 0, 3) * 3   // participation + per-stage drip
  if (champion) g += 6                          // won it all
  return g
}

// Draft a pool into cells that maximise elemental harmony (see elementalHarmony):
// first pack same-nature trios ("affinity"), then build distinct-nature trios
// ("spectrum") from the remainder, then chunk whatever's left. Pure — items just
// need an `.element`; input order is preserved within each nature so a power-sorted
// pool still yields power-ordered affinity cells. Leftovers that can't fill a cell
// are dropped, matching groupIntoCells. Powers the exam panel's quick-form path.
export function packHarmonicCells(pool, size = 3) {
  const groupBy = arr => {
    const m = new Map()
    arr.forEach(s => { const k = s.element || '_'; if (!m.has(k)) m.set(k, []); m.get(k).push(s) })
    return m
  }
  const cells = []
  // 1. affinity trios — full same-nature cells.
  const rest = []
  groupBy(pool).forEach(list => {
    let i = 0
    for (; i + size <= list.length; i += size) cells.push(list.slice(i, i + size))
    rest.push(...list.slice(i))
  })
  // 2. spectrum cells — one member each from `size` distinct natures, biggest first.
  const buckets = groupBy(rest)
  for (;;) {
    const keys = [...buckets.keys()].filter(k => buckets.get(k).length > 0)
    if (keys.length < size) break
    keys.sort((a, b) => buckets.get(b).length - buckets.get(a).length)
    cells.push(keys.slice(0, size).map(k => buckets.get(k).shift()))
  }
  // 3. mixed chunks — whatever nature-fragments remain.
  const leftover = []
  buckets.forEach(list => leftover.push(...list))
  for (let i = 0; i + size <= leftover.length; i += size) cells.push(leftover.slice(i, i + size))
  return cells
}

// Elemental makeup of a three-ninja cell — a squad-composition flavour with teeth.
// A cell whose members all share one chakra nature reads as a focused clan-style unit
// ("affinity"); one with three distinct natures is a versatile "full spectrum" cell.
// Either coherent shape earns a small cohesion bonus; a lopsided 2-1 mix earns none.
export function elementalHarmony(elements = []) {
  const valid = elements.filter(Boolean)
  if (valid.length < 2) return { kind: 'none', bonus: 0, label: '' }
  const uniq = new Set(valid)
  if (uniq.size === 1) return { kind: 'affinity', bonus: 3, label: `${valid[0]} affinity` }
  if (uniq.size === valid.length) return { kind: 'spectrum', bonus: 2, label: 'Full spectrum' }
  return { kind: 'mixed', bonus: 0, label: '' }
}

// When an exam promotion crosses a rank threshold that answers a shinobi's stated
// dream, it becomes a personal milestone — a resonant chronicle line and a small
// legend nudge. `newRi` is the rank index they were just promoted to. Dreams that
// don't map to a rank milestone return { fulfilled:false } and the caller falls back
// to the plain promotion note. Kept data-driven so new dreams are one line to wire.
const _DREAM_MILESTONES = {
  'To lead a squad of their own': { minRi: 2, note: 'a first real step toward leading a squad of their own', legend: 2 },
  'To surpass their old sensei':  { minRi: 3, note: 'rising at last to stand level with the sensei who trained them', legend: 3 },
  'To be remembered in the chronicles': { minRi: 2, note: 'a name now written where it can be remembered', legend: 2 },
  'To prove a civilian-born can be a legend': { minRi: 3, note: 'proof a civilian-born can climb as high as any clan heir', legend: 3 },
}
export function dreamPromotionBeat(dream, newRi) {
  const m = _DREAM_MILESTONES[dream]
  if (!m || !m.note || newRi < m.minRi) return { fulfilled: false, note: '', legend: 0 }
  return { fulfilled: true, note: m.note, legend: m.legend }
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
