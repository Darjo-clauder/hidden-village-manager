import { G, rnd, pk, clamp } from './state.js'
import { MISS_POOL } from './constants.js'
import { aL } from './ui.js'

// ── Contextual mission templates ──────────────────────────────────────────────
const CONTEXTUAL_SOLO = [
  // War-state missions
  { n:'Sabotage enemy supply line',    rk:'B', ryo:7000,  rep:9,  dur:2, risk:0.30, mp:60,  sq:false, ctx:'war' },
  { n:'Extract captive from war zone', rk:'A', ryo:13000, rep:18, dur:3, risk:0.42, mp:90,  sq:false, ctx:'war' },
  { n:'Intercept war courier',         rk:'B', ryo:6500,  rep:8,  dur:2, risk:0.28, mp:55,  sq:false, ctx:'war' },
  // High-rep missions
  { n:'Protect diplomacy envoy',       rk:'A', ryo:14000, rep:20, dur:3, risk:0.35, mp:85,  sq:false, ctx:'highRep' },
  { n:'Clear rival bingo entry',       rk:'S', ryo:28000, rep:45, dur:2, risk:0.48, mp:130, sq:false, ctx:'highRep' },
  // Low-rep hustle missions
  { n:'Merchant guild escort',         rk:'C', ryo:3000,  rep:5,  dur:2, risk:0.15, mp:40,  sq:false, ctx:'lowRep' },
  { n:'Recover stolen village funds',  rk:'C', ryo:3500,  rep:6,  dur:2, risk:0.18, mp:45,  sq:false, ctx:'lowRep' },
  // Seasonal
  { n:'Festival security detail',      rk:'D', ryo:900,   rep:2,  dur:1, risk:0.03, mp:10,  sq:false, ctx:'spring' },
  { n:'Harvest caravan protection',    rk:'C', ryo:2500,  rep:4,  dur:2, risk:0.13, mp:38,  sq:false, ctx:'autumn' },
  // Beast-related
  { n:'Tail beast sighting — recon',   rk:'A', ryo:15000, rep:22, dur:3, risk:0.40, mp:90,  sq:false, ctx:'beast' },
]

const CONTEXTUAL_SQUAD = [
  { n:'Siege rogue ninja fortress',    rk:'A', ryo:20000, rep:28, dur:3, risk:0.38, mp:220, sq:true,  ctx:'war' },
  { n:'Defend mountain border post',   rk:'B', ryo:11000, rep:14, dur:2, risk:0.25, mp:160, sq:true,  ctx:'war' },
  { n:'Escort daimyo through conflict',rk:'A', ryo:18000, rep:24, dur:3, risk:0.33, mp:190, sq:true,  ctx:'highRep' },
  { n:'Hunt missing-nin cell',         rk:'B', ryo:12000, rep:15, dur:2, risk:0.28, mp:170, sq:true,  ctx:'any' },
]

// ── Expiry pruning ────────────────────────────────────────────────────────────
export function pruneExpiredMissions(G) {
  const before = G.avM.length
  G.avM = G.avM.filter(m => {
    // Skip active assignments
    if (G.aM.find(am => am.mId === m.id || am.squadMId === m.id)) return true
    if (!m.expiresMonth) return true

    // Handle year rollover for expiry check
    const addedYear = m.addedYear || G.year
    const monthsAlive = (G.year - addedYear) * 12 + (G.month - (m.expiresMonth - 3))
    return monthsAlive < 3
  })
  return before - G.avM.length  // returns count removed
}

// ── Monthly board refresh ─────────────────────────────────────────────────────
export function refreshMissionBoard(G) {
  // 1. Prune expired missions
  const pruned = pruneExpiredMissions(G)
  if (pruned > 0) aL(`${pruned} mission contract${pruned > 1 ? 's' : ''} expired.`, 'neutral')

  // 2. Count current available (not active)
  const activeMIds = new Set(G.aM.flatMap(am => [am.mId, am.squadMId]).filter(Boolean))
  const available = G.avM.filter(m => !activeMIds.has(m.id))
  const soloAvail  = available.filter(m => !m.sq).length
  const squadAvail = available.filter(m =>  m.sq).length

  // 3. Inject contextual missions if board is thin
  const soloNeeded  = Math.max(0, 5 - soloAvail)
  const squadNeeded = Math.max(0, 2 - squadAvail)

  if (soloNeeded > 0 || squadNeeded > 0) {
    const ctx = _currentContext(G)
    const expiresMonth = G.month + 3
    const addedYear = G.year

    const newSolo = CONTEXTUAL_SOLO
      .filter(m => m.ctx === ctx || m.ctx === 'any' || ctx === 'any')
      .sort(() => Math.random() - 0.5)
      .slice(0, soloNeeded)
      .map(m => ({ ...m, id: Math.random().toString(36).slice(2), expiresMonth, addedYear, contextual: true }))

    const newSquad = CONTEXTUAL_SQUAD
      .filter(m => m.ctx === ctx || m.ctx === 'any')
      .sort(() => Math.random() - 0.5)
      .slice(0, squadNeeded)
      .map(m => ({ ...m, id: Math.random().toString(36).slice(2), expiresMonth, addedYear, contextual: true }))

    G.avM.push(...newSolo, ...newSquad)
  }

  // 4. Inject a mission chain step if a chain is active and its next step isn't on the board
  _injectChainMissions(G)
}

function _currentContext(G) {
  if (G.warState && !G.warState.resolved) return 'war'
  if ((G.reputation || 0) >= 60) return 'highRep'
  if ((G.reputation || 0) < 20) return 'lowRep'
  if (G.beasts?.some(b => b.sealed)) return 'beast'
  const month = G.month
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'any'
}

// ── Mission chain injection ───────────────────────────────────────────────────
const CHAIN_TEMPLATES = [
  {
    id: 'chain_border_crisis',
    n: 'Border Crisis',
    steps: [
      { n:'Recon the border anomaly',           rk:'B', ryo:6000,  rep:8,  dur:2, risk:0.25, mp:60,  sq:false },
      { n:'Neutralize the advance scout cell',  rk:'A', ryo:11000, rep:16, dur:3, risk:0.38, mp:85,  sq:false },
      { n:'Repel the incursion force',          rk:'S', ryo:22000, rep:35, dur:3, risk:0.45, mp:120, sq:false },
    ],
  },
  {
    id: 'chain_missing_nin',
    n: 'Missing-Nin Hunt',
    steps: [
      { n:'Track the missing-nin to the region',rk:'C', ryo:3000,  rep:5,  dur:2, risk:0.18, mp:40,  sq:false },
      { n:'Capture or eliminate the target',    rk:'B', ryo:8000,  rep:12, dur:2, risk:0.32, mp:65,  sq:false },
    ],
  },
  {
    id: 'chain_escort_betrayal',
    n: 'The Merchant Gambit',
    // Consequences escalate: escort reveals betrayal, rescue extracts the client
    steps: [
      { n:'Escort the merchant through Fire Country', rk:'C', ryo:3500,  rep:4,  dur:2, risk:0.12, mp:38,  sq:false },
      { n:'Investigate the merchant\'s betrayal',     rk:'B', ryo:7500,  rep:10, dur:2, risk:0.30, mp:60,  sq:false },
      { n:'Extract the kidnapped contact',            rk:'A', ryo:14000, rep:20, dur:3, risk:0.40, mp:88,  sq:false },
    ],
  },
]

export function maybeSpawnChain(G) {
  if ((G.missionChains || []).length >= 3) return  // cap active chains
  if (Math.random() > 0.08) return  // ~8% monthly chance

  const eligible = CHAIN_TEMPLATES.filter(t => !G.missionChains?.find(c => c.id === t.id))
  if (!eligible.length) return

  const template = pk(eligible)
  if (!G.missionChains) G.missionChains = []
  G.missionChains.push({
    id: template.id,
    n: template.n,
    steps: template.steps,
    currentStep: 0,
    completedSteps: [],
    failedSteps: [],
    startYear: G.year,
    startMonth: G.month,
  })
  aL(`New mission chain unlocked: "${template.n}" — check the mission board.`, 'ev')
}

function _injectChainMissions(G) {
  ;(G.missionChains || []).forEach(chain => {
    const step = chain.steps[chain.currentStep]
    if (!step) return
    const alreadyOnBoard = G.avM.find(m => m.chainId === chain.id && m.chainStep === chain.currentStep)
    if (alreadyOnBoard) return
    G.avM.push({
      ...step,
      id: Math.random().toString(36).slice(2),
      chainId: chain.id,
      chainName: chain.n,
      chainStep: chain.currentStep,
      chainTotal: chain.steps.length,
      expiresMonth: G.month + 4,
      addedYear: G.year,
    })
  })
}

// ── Called from adv.js when a mission completes ────────────────────────────────
export function advanceChain(G, missionId, succeeded) {
  const m = G.avM.find(x => x.id === missionId) || G.aM.find(x => x.mId === missionId)
  if (!m?.chainId) return

  const chain = (G.missionChains || []).find(c => c.id === m.chainId)
  if (!chain) return

  // Initialise cumulative state if missing
  if (!chain.state) chain.state = { ryoAccumulated: 0, repAccumulated: 0, injuryEscalation: 0 }

  if (succeeded) {
    // Accumulate rewards — later steps get a 10% stacking bonus per completed step
    const stepBonus = 1 + chain.completedSteps.length * 0.10
    const stepRyo = Math.round((m.ryo || 0) * stepBonus)
    const stepRep = Math.round((m.rep || 0) * stepBonus)
    chain.state.ryoAccumulated += stepRyo
    chain.state.repAccumulated += stepRep

    chain.completedSteps.push(chain.currentStep)
    chain.currentStep++

    if (chain.currentStep >= chain.steps.length) {
      // Chain complete — pay out accumulated rewards on top of the final mission reward
      const bonusRyo = Math.round(chain.state.ryoAccumulated * 0.5)
      const bonusRep = chain.state.repAccumulated
      G.ryo = (G.ryo || 0) + bonusRyo
      G.reputation = Math.min(999, (G.reputation || 0) + bonusRep)
      aL(`Mission chain "${chain.n}" completed! Chain bonus: +${bonusRyo.toLocaleString()} ryo, +${bonusRep} rep.`, 'good')
      if (!G.completedMissionChains) G.completedMissionChains = []
      G.completedMissionChains.push({ ...chain, completedYear: G.year, completedMonth: G.month })
      if (G.completedMissionChains.length > 20) G.completedMissionChains.shift()
      G.missionChains = G.missionChains.filter(c => c.id !== chain.id)
    } else {
      // Escalating injury risk for subsequent steps
      chain.state.injuryEscalation += 0.05
      aL(`Chain step complete: "${m.n}" — ${chain.steps.length - chain.currentStep} step${chain.steps.length - chain.currentStep !== 1 ? 's' : ''} remaining.`, 'neutral')
    }
  } else {
    chain.failedSteps.push(chain.currentStep)
    // Partial reward on failure — pay out 25% of accumulated ryo
    const partialRyo = Math.round((chain.state?.ryoAccumulated || 0) * 0.25)
    if (partialRyo > 0) {
      G.ryo = (G.ryo || 0) + partialRyo
      aL(`Chain collapsed — partial payment: +${partialRyo.toLocaleString()} ryo for completed steps.`, 'warn')
    }
    aL(`Mission chain "${chain.n}" failed at step ${chain.currentStep + 1}.`, 'warn')
    G.missionChains = (G.missionChains || []).filter(c => c.id !== chain.id)
  }
}
