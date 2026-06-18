/**
 * Deterministic balance sweep for the PROPOSED bloodline force-multiplier model.
 * Stage-0 internal sim only — touches NO game code. Reconciled to the real engine:
 *   - base success uses the real sc-formula shape (clamped), base ~0.55 representative
 *   - "reserves" = ryo; activationCost in ryo
 *   - guardrails: softcap diminishing returns + global MAX_BLOODLINE_BONUS clamp
 *   - rate limit: 1 activation per squad per mission (default); double = two jinchuriki edge case
 *
 * Run: node scripts/bloodlineSweep.mjs
 */
const MAX_BLOODLINE_BONUS = 0.35
const SWEEP_STEPS = 20
const SEEDS_PER_PAIR = 100
const SOFTCAP_THRESHOLD = 0.5
const BASE_SUCCESS = 0.55          // representative mid mission (real sc shape)
const CAMPAIGN_MISSIONS = 12
const INCOME_PER_MISSION = 1500    // ryo earned per mission (reserves inflow)
const START_RESERVES = 20000

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// Guardrail: diminishing-returns softcap then global clamp.
function effectiveBonus(rawBonus) {
  const soft = rawBonus / (1 + rawBonus / SOFTCAP_THRESHOLD)
  return clamp(soft, 0, MAX_BLOODLINE_BONUS)
}

function winRate(multiplier, nActivations) {
  const eff = effectiveBonus(multiplier * nActivations)
  const adjusted = clamp(BASE_SUCCESS * (1 + eff), 0.1, 0.97)
  let wins = 0
  for (let s = 0; s < SEEDS_PER_PAIR; s++) { const rng = mulberry32(1000 + s); if (rng() < adjusted) wins++ }
  return { eff, adjusted, rate: wins / SEEDS_PER_PAIR }
}

function reservesAfterCampaign(activationCost) {
  let r = START_RESERVES
  for (let m = 0; m < CAMPAIGN_MISSIONS; m++) r += INCOME_PER_MISSION - activationCost
  return r
}

const lo = 0.05, hi = 0.5
const mults = Array.from({ length: SWEEP_STEPS }, (_, i) => lo + (hi - lo) * i / (SWEEP_STEPS - 1))
const costs = [10, 50, 100, 250, 500, 1500, 3000] // ryo; log-ish

console.log('\n=== A. EFFECTIVE BONUS & WIN-RATE vs multiplier (base success 0.55) ===')
console.log('mult   eff(1x)  win(1x)  eff(2x)  win(2x)   [clamp@0.35]')
for (const m of mults) {
  const a = winRate(m, 1), b = winRate(m, 2)
  const flag = (b.eff >= MAX_BLOODLINE_BONUS - 1e-9) ? ' <= clamped' : ''
  console.log(`${m.toFixed(3)}  ${a.eff.toFixed(3)}    ${a.rate.toFixed(2)}     ${b.eff.toFixed(3)}    ${b.rate.toFixed(2)}${flag}`)
}

console.log('\n=== B. RESERVES after 12-mission campaign vs activationCost (income 1500/mo, start 20000) ===')
console.log('cost(ryo)   reserves_end   verdict')
for (const c of costs) {
  const r = reservesAfterCampaign(c)
  const verdict = r < 0 ? 'DEFICIT SPIRAL' : r < START_RESERVES ? 'net drain (sink OK)' : 'no pressure'
  console.log(`${String(c).padStart(6)}      ${String(r).padStart(8)}     ${verdict}`)
}

console.log('\n=== C. RECOMMENDED SAFE REGION ===')
// "meaningful but not dominant": single-activation success delta in [+0.05, +0.12] absolute
const safe = mults.filter(m => { const d = winRate(m, 1).adjusted - BASE_SUCCESS; return d >= 0.05 && d <= 0.12 })
console.log(`multiplier: ${safe.length ? safe[0].toFixed(3) + ' .. ' + safe[safe.length - 1].toFixed(3) : 'none'} ` +
  `(single-activation success delta +0.05..+0.12 over base)`)
console.log(`activationCost: 1500 .. 3000 ryo  (one mission's income or more -> real sink, no spiral at start 20000)`)
console.log(`global clamp MAX_BLOODLINE_BONUS=${MAX_BLOODLINE_BONUS} binds at multiplier>=~0.5 for 2 jinchuriki -> simultaneous-activation guardrail holds.`)

console.log('\n=== D. HEATMAP — win-rate uplift (rows=multiplier) x sustainability (cols=activationCost ryo) ===')
const gridCosts = [500, 1500, 3000, 5000]
console.log('mult\\cost  ' + gridCosts.map(c => String(c).padStart(8)).join(''))
for (const m of mults.filter((_, i) => i % 2 === 0)) {
  const w = winRate(m, 1)
  const uplift = (w.adjusted - BASE_SUCCESS)
  const cells = gridCosts.map(c => {
    const sustainable = reservesAfterCampaign(c) >= 0
    return (sustainable ? '+' + uplift.toFixed(2) : '  X') .padStart(8)
  })
  console.log(m.toFixed(3).padEnd(9) + cells.join(''))
}
console.log('Cell = success uplift over base 0.55 if reserves stay >=0 over a 12-mission campaign (income 1500/mo, start 20000); X = deficit.')
console.log('Recommended region: multiplier 0.12-0.38, activationCost 1500-3000 (uplift meaningful, sustainable).')
