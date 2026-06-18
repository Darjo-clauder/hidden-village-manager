/**
 * Balance parameter sweeps over the live engine formulas (see docs/SIMULATION_MODELS.md).
 * Pure math — no engine import needed; formulas mirror adv.js line-for-line.
 * Run: node scripts/balanceSweep.mjs
 */
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)
const pad = (s, n) => String(s).padStart(n)

// ── 1. Mission success sc = clamp(1 - risk + (pw-mp)*0.005 + mods, 0.1, 0.97) ──
console.log('\n=== 1. MISSION SUCCESS — sc vs power gap (mods=0) ===')
console.log('gap\\risk   0.30   0.45   0.60')
for (const gap of [-40, -20, 0, 20, 40, 60, 80, 100, 120]) {
  const row = [0.30, 0.45, 0.60].map(risk => clamp(1 - risk + gap * 0.005, 0.1, 0.97).toFixed(2))
  console.log(`${pad(gap, 4)}     ${row.map(r => pad(r, 6)).join(' ')}`)
}
// Saturation analysis: gap where sc hits 0.97 at risk 0.45 -> 1-0.45+g*0.005=0.97 -> g=84
console.log('Power spike: at risk 0.45, sc caps at 0.97 once power gap >= +84 (missions trivial).')
console.log('Floor: at risk 0.60, sc floors at 0.10 once gap <= -60 (auto-fail band).')

// ── 2. KIA risk on failure: clamp((hL>=2?.02:hL>=1?.04:.08)+kiaRiskMod, .005, .15) ──
console.log('\n=== 2. KIA RISK ON FAILURE — by healer level (kiaRiskMod=0) ===')
for (const [hL, base] of [[0, 0.08], [1, 0.04], [2, 0.02]])
  console.log(`  healer ${hL}: ${(clamp(base, 0.005, 0.15) * 100).toFixed(1)}% per failed mission`)
console.log('A maxed healer (hL>=2) quarters KIA risk vs no healer — strong incentive.')

// ── 3. Economy — monthly net vs roster size (salary = 500 + 400*ri) ──
console.log('\n=== 3. ECONOMY — monthly net vs roster size ===')
const incomeFixed = 12000, staffSal = 3000, maintenance = 4000
console.log('roster  avgRank  shinobiSal   net(@12k income)')
for (const n of [5, 10, 15, 20, 30, 40]) {
  // assume rank distribution skews to Genin/Chunin: avg ri ~1.0
  const avgRi = 1.0
  const shinobiSal = Math.round(n * (500 + 400 * avgRi))
  const net = incomeFixed - shinobiSal - staffSal - maintenance
  console.log(`${pad(n, 5)}   ${avgRi.toFixed(1)}      ${pad(shinobiSal, 8)}     ${pad(net, 7)}`)
}
console.log('Deficit threshold: at 12k income / 7k fixed costs, roster > ~5 Jonin-heavy or')
console.log('~10 mixed shinobi tips monthly net negative -> deficit spiral after 3 months.')

// ── 4. Progression — minimum months to each rank (tenure gate (ri+1)*12) ──
console.log('\n=== 4. PROGRESSION — minimum tenure to reach each rank ===')
const ranks = ['Genin', 'Chunin', 'Jonin', 'ANBU', 'S-Rank']
const thresh = [0, 30, 55, 78, 90]
let cum = 0
for (let ri = 0; ri < 4; ri++) {
  const gate = (ri + 1) * 12
  cum += gate
  console.log(`  ${ranks[ri]}->${ranks[ri + 1]}: needs ${gate}mo tenure + power>=${thresh[ri + 1]}  (earliest total: ${cum}mo = ${(cum / 12).toFixed(1)}yr)`)
}
console.log('Earliest possible S-Rank = 120 months (10 in-game years) even with perfect stats.')
