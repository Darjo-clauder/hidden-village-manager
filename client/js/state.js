import {
  CLANS, RANKS, FNAMES, LNAMES, SPECS, PERSONALITIES, BACKSTORIES, ARCHETYPES,
  TAILED_BEASTS, VILLAGES_DEF, MISS_POOL, TRADE_ROUTES, CONTRACTS, STAFF_ROLES,
  REGIONS, PM_DESC,
} from './constants.js'

// ── utilities ──────────────────────────────────────────────────────────────
export const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
export const pk = a => a[Math.floor(Math.random() * a.length)]
export const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v))
export const fmt = n => Number(n).toLocaleString()
export const sn = s => s.fn + ' ' + s.ln

// ── game state ─────────────────────────────────────────────────────────────
export const G = {}
export const WS = { villages: [], myId: null, myVillage: null, pendingAlliances: [] }

// ui state — mutable object so any module can assign properties
export const ui = { CP: 'roster', MT: 'solo', ET: 'trade', aT: null, sqAT: null, csL: null, csM: [], exSt: null, pKE: null }

// setup / diplomacy state
export let spIcon = '🍃'
export function setSpIcon(ic) { spIcon = ic }
export let _dipCb = null
export function setDipCb(cb) { _dipCb = cb }

// ── shinobi constructor ────────────────────────────────────────────────────
export function mS(ri = 0) {
  const hC = Math.random() < 0.28, clan = hC ? pk(CLANS) : null
  const age = ri === 0 ? rnd(12, 15) : ri === 1 ? rnd(16, 22) : ri === 2 ? rnd(20, 30) : rnd(25, 35)
  let base = { ninjutsu: rnd(12, 40), taijutsu: rnd(12, 40), genjutsu: rnd(8, 32), chakra: rnd(18, 48), intelligence: rnd(12, 40), speed: rnd(12, 40) }
  if (clan) Object.keys(clan.b).forEach(k => { base[k] = clamp((base[k] || 0) + clan.b[k], 0, 99) })
  const m = 1 + ri * 0.28
  Object.keys(base).forEach(k => { base[k] = clamp(Math.round(base[k] * m), 1, 99) })
  const p = pk(PERSONALITIES), sal = Math.round((500 + ri * 400) * (1 + (p.effect.salary || 0)))
  const origin = Math.random() < 0.05 ? pk(['Sunagakure', 'Kirigakure', 'Iwagakure', 'Kumogakure']) : null
  return {
    id: Math.random().toString(36).slice(2), fn: pk(FNAMES), ln: pk(LNAMES),
    clan: clan?.n || null, trait: clan?.t || null, spec: pk(SPECS), age, ri,
    stats: base, potential: rnd(ri * 20 + 45, 99),
    status: 'available', injDays: 0, injuryType: null, missId: null, squadId: null,
    salary: sal, months: 0, wins: 0, winsB: 0, winsS: 0, streak: 0,
    pers: p, backstory: pk(BACKSTORIES), archetype: pk(ARCHETYPES),
    scouted: false, monthsWaiting: 0, rivalId: null, origin, jk: null,
    darkMoment: null, jutsu: [], bonds: [], prodigy: false, familyId: null, mentor: null,
    workload: 0, consecutiveMissions: 0, traumaStatus: null, traumaCount: 0, returningForm: 100,
    // Personality matrix (hidden from player — revealed via staff)
    pMatrix: {
      loyalty:         rnd(3, 18),
      ambition:        rnd(3, 18),
      professionalism: rnd(3, 18),
      temperament:     rnd(3, 18),
      adaptability:    rnd(3, 18),
    },
    indMorale:         rnd(55, 85),  // individual morale 0–100
    commitment:        rnd(55, 90),  // 0–100, decays monthly
    legendStatus:      false,        // true after 10 years of service
    meetingCooldown:   0,            // months before next meeting request
    promotionDeadline: null,         // month by which they expect promotion
    roleGuarantee:     false,        // Kage promised regular deployment
    bingoBookPresence: 0,            // 0=none 1=listed 2=featured 3=legendary
    bingoBookSuppressed: false,
  }
}

// ── stat helpers ───────────────────────────────────────────────────────────
export function sPow(s) {
  const v = Object.values(s.stats)
  let p = Math.round(v.reduce((a, b) => a + b, 0) / v.length)
  if (s.jk) { const b = G.beasts.find(x => x.n === s.jk); if (b) p += Math.round(b.pow * 0.4) }
  return p
}

export function sqP(sq) {
  return sq.members.reduce((a, id) => { const s = G.shinobi.find(x => x.id === id); return a + (s ? sPow(s) : 0) }, 0)
}

// ── kage events ────────────────────────────────────────────────────────────
// fn signature: (G, log) — log is aL, passed by caller to avoid circular dep
export const KAGE_EVENTS = [
  { n: 'Five Kage Summit', desc: 'All Kage gathering diplomatically.', choices: [
    { l: 'Attend (+8 rel all, -5k ryo)', fn: (G, log) => { G.villages.forEach(v => v.rel = clamp(v.rel + 8, 0, 100)); G.ryo -= 5000; log('Attended Summit.', 'good') } },
    { l: 'Send envoy (+4 rel all, -2k ryo)', fn: (G, log) => { G.villages.forEach(v => v.rel = clamp(v.rel + 4, 0, 100)); G.ryo -= 2000; log('Envoy sent.', 'neutral') } },
    { l: 'Boycott (-5 rel, +5 rep)', fn: (G, log) => { G.villages.forEach(v => v.rel = clamp(v.rel - 5, 0, 100)); G.reputation = clamp(G.reputation + 5, 0, 999); log('Boycotted summit.', 'neutral') } },
  ] },
  { n: 'Enemy Spy Caught', desc: 'A rival village spy is in custody.', choices: [
    { l: 'Interrogate (+3k ryo intel)', fn: (G, log) => { G.ryo += 3000; log('Spy interrogated.', 'neutral') } },
    { l: 'Execute (+8 rep, risk war)', fn: (G, log) => { const v = pk(G.villages); v.rel = clamp(v.rel - 15, 0, 100); v.threat = clamp(v.threat + 20, 0, 100); G.reputation = clamp(G.reputation + 8, 0, 999); log('Spy executed. Tensions rise.', 'warn') } },
    { l: 'Turn double agent (+5k ryo)', fn: (G, log) => { G.ryo += 5000; log('Spy turned.', 'good') } },
  ] },
  { n: 'Refugee Crisis', desc: 'Civilians flee toward your village.', choices: [
    { l: 'Accept all (-8k ryo, +10 morale, +5 rep)', fn: (G, log) => { G.ryo -= 8000; G.morale = clamp(G.morale + 10, 0, 100); G.reputation = clamp(G.reputation + 5, 0, 999); log('Refugees accepted.', 'good') } },
    { l: 'Accept shinobi-capable (+1 prospect)', fn: (G, log) => { G.prospects.push(mS(0)); log('One recruit accepted.', 'neutral') } },
    { l: 'Seal gates (-8 morale, -8 rep)', fn: (G, log) => { G.morale = clamp(G.morale - 8, 0, 100); G.reputation = clamp(G.reputation - 8, 0, 999); log('Gates sealed.', 'bad') } },
  ] },
  { n: 'Alliance Proposal', desc: 'A rival offers a military alliance.', choices: [
    { l: 'Accept (+25 rel, -10k ryo, +10 rep)', fn: (G, log) => { const v = pk(G.villages); v.rel = clamp(v.rel + 25, 0, 100); v.allied = true; G.ryo -= 10000; G.reputation = clamp(G.reputation + 10, 0, 999); log('Alliance forged!', 'good') } },
    { l: 'Negotiate (+12 rel)', fn: (G, log) => { pk(G.villages).rel = clamp(pk(G.villages).rel + 12, 0, 100); log('Partial deal reached.', 'neutral') } },
    { l: 'Decline', fn: (G, log) => { log('Declined.', 'neutral') } },
  ] },
  { n: 'Tailed Beast Sighting', desc: 'A wild beast roams near your borders.', choices: [
    { l: 'Launch capture mission', fn: (G, log) => { const b = G.beasts.find(x => !x.sealed); if (b) { b.captPending = true; log('Capture mission launched.', 'warn') } else log('No beasts to capture.', 'neutral') } },
    { l: 'Warn all villages (+8 rel)', fn: (G, log) => { G.villages.forEach(v => v.rel = clamp(v.rel + 8, 0, 100)); log('Warned neighbours.', 'good') } },
    { l: 'Fortify (+20 temp def)', fn: (G, log) => { G.tempDef = 20; log('Fortifications raised.', 'neutral') } },
  ] },
]

// ── game init & helpers ────────────────────────────────────────────────────
export function initState() {
  Object.keys(G).forEach(k => delete G[k])
  Object.assign(G, {
    year: 1, month: 1, ryo: 60000, reputation: 10, morale: 75,
    shinobi: [], squads: [], aM: [], log: [], prospects: [],
    villages: JSON.parse(JSON.stringify(VILLAGES_DEF)),
    beasts: JSON.parse(JSON.stringify(TAILED_BEASTS)),
    avM: [], upgrades: { academy: 0, hospital: 0, wall: 0, intel: 0, training: 0, seal: 0 },
    raid: null, raidW: 0, defSh: null, tempDef: 0,
    examSched: false, examMonth: null, examActive: false, examResults: [], examCands: [],
    tradeRoutes: JSON.parse(JSON.stringify(TRADE_ROUTES)),
    contracts: JSON.parse(JSON.stringify(CONTRACTS)),
    keQ: [...KAGE_EVENTS].sort(() => Math.random() - 0.5), keCD: 0,
    memorial: [], chronicles: [], legend: 0, worldFlags: {}, pendingChoiceEvent: null,
    staff: [],
    finances: {
      history: [],        // last 12 monthly snapshots
      deficitMonths: 0,
      healthTier: 'Stable',
      lastMonthNet: 0,
      // accumulators reset each month in adv()
      missionCommissions: { D:0, C:0, B:0, A:0, S:0 },
      examFees: 0,
      loanFees: 0,
      scoutCostThisMonth: 0,
    },
    // Scouting Network
    scoutReports: [],
    // Youth Academy
    intakeClass: [],
    lastIntakeYear: null,
    kageTrainingUsedYear: 0,
    // People Management
    meetingQueue: [],
    harmonyScore: 70,
    // Transfer Market
    transferMarket: {
      pool: [],
      offers: [],
      loanOut: [],
      loanIn: [],
      windowOpen: false,
      windowSeason: null,
      windowMonthsLeft: 0,
    },
    sellPressure: [],
    // Reputation & Legacy
    kageRep: 1,               // 1–5 stars
    prestigeTier: 'D',
    hallOfLegends: [],        // enshrined shinobi records
    dynastyRecords: {
      examWins: 0, beastCaptures: [], longestRaidStreak: 0,
      peakLegend: 0, enshrined: 0,
    },
    summitHistory: [],        // past summit votes
    generationalSummary: null,
    // S-rank bidding
    sRankContracts: [],       // active seasonal S-rank bids
    // ANBU & Intel
    anbuOps: [],              // active ops { type, agentId, monthsLeft, targetVillageId }
    caughtAnbu: [],           // { id, targetVillageId, month, status:'imprisoned'|'executed' }
    intelReports: [],         // { villageId, type, data:{}, expiresMonth }
    counterIntelRating: 2,    // passive 1–20, vs rival ANBU catch chance
    // War state
    warState: null,           // null or { villageId, phase, monthsLeft, warHistory:[] }
  });
  [2, 2, 1, 1, 1, 0, 0, 0].forEach(r => G.shinobi.push(mS(r)))
  rfM(); rfP()
}

// ── Staff constructor ──────────────────────────────────────────────────────────
export function mStaff(roleId, ratingOverride) {
  const role = STAFF_ROLES.find(r => r.id === roleId)
  if (!role) return null
  const stats = {}
  role.stats.forEach(k => { stats[k] = ratingOverride ? clamp(ratingOverride + rnd(-2, 2), 1, 20) : rnd(5, 15) })
  const rating = Math.round(Object.values(stats).reduce((a, b) => a + b, 0) / role.stats.length)
  const salary = Math.round(role.salBase * (0.7 + rating * 0.04))
  return {
    id: Math.random().toString(36).slice(2),
    fn: pk(FNAMES), ln: pk(LNAMES),
    role: roleId,
    stats,
    rating,
    salary,
    monthsServed: 0,
    institutional: 0,
    fromShinobi: null,
  }
}

// Generate staff candidates for hiring modal
export function genStaffCandidates(roleId, count = 3) {
  return Array.from({ length: count }, () => mStaff(roleId))
}

// Generate a prospect from a specific region, with stat ranges based on scout quality
export function genRegionProspect(regionId, scout) {
  const region = REGIONS.find(r => r.id === regionId)
  const p = mS(0)
  p.origin = region?.n || regionId
  p.fromRegion = regionId
  p.scoutId = scout?.id || null
  p.scoutName = scout ? scout.fn + ' ' + scout.ln : null
  p.rivalInterest = rnd(0, 2)
  p.urgencyMonths = rnd(4, 8)

  // Apply regional stat bonuses
  if (region?.statBonus) {
    Object.entries(region.statBonus).forEach(([k, v]) => {
      if (p.stats[k] !== undefined) p.stats[k] = clamp(p.stats[k] + v, 0, 99)
    })
  }

  // Apply clan affinity (higher chance of region's clans)
  if (!p.clan && region?.clanAffinity?.length && Math.random() < 0.45) {
    const clanName = pk(region.clanAffinity)
    const clan = CLANS.find(c => c.n === clanName)
    if (clan) {
      p.clan = clan.n; p.trait = clan.t
      Object.keys(clan.b).forEach(k => { p.stats[k] = clamp(p.stats[k] + clan.b[k], 0, 99) })
    }
  }

  // Compute stat ranges based on scout's perception (Judging Ability)
  if (scout) {
    const judgeAbility = scout.stats.perception || 8
    const contactBonus = scout.contacts?.[regionId] ? Math.floor(scout.contacts[regionId] / 2) : 0
    const effectiveJudge = Math.min(20, judgeAbility + contactBonus)
    const errorMargin = Math.max(1, Math.round(15 - effectiveJudge * 0.65))
    p.statRanges = {}
    Object.keys(p.stats).forEach(k => {
      const lo = Math.max(1, p.stats[k] - errorMargin)
      const hi = Math.min(99, p.stats[k] + errorMargin)
      p.statRanges[k] = { lo, hi, exact: effectiveJudge >= 16 }
    })
    // Potential range from Judging Potential (endurance stat)
    const judgePot = scout.stats.endurance || scout.stats.perception || 8
    const effectivePotJudge = Math.min(20, judgePot + contactBonus)
    const potError = Math.max(3, Math.round(25 - effectivePotJudge))
    p.potRange = {
      lo: Math.max(10, p.potential - potError),
      hi: Math.min(99, p.potential + potError),
      exact: effectivePotJudge >= 16,
    }
  }

  return p
}

// Generate an intake class student (more structured than a prospect)
export function genStudent(academyLevel, headSenseiRating) {
  const base = mS(0)
  // Academy quality boost
  const qualityBonus = academyLevel * 6 + Math.floor((headSenseiRating || 0) / 3)
  Object.keys(base.stats).forEach(k => {
    base.stats[k] = clamp(base.stats[k] + rnd(0, qualityBonus), 0, 99)
  })
  // Potential boosted by prestige
  base.potential = clamp(base.potential + rnd(0, qualityBonus * 2), 20, 99)
  // Students enter as blank slates development-wise
  base.devTrack = 'balanced'
  base.intensity = 'medium'
  base.sensei = null
  base.monthsInClass = 0
  base.burnout = false
  base.burnoutRisk = 0
  base.burnoutMonths = 0
  base.burnoutTrait = null
  base.milestones = []
  base.kageTraining = false
  base.startStats = { ...base.stats }  // snapshot at entry for progress tracking
  delete base.missId
  delete base.squadId
  delete base.salary
  delete base.months
  delete base.wins
  delete base.winsB
  delete base.winsS
  delete base.streak
  delete base.injDays
  delete base.injuryType
  delete base.workload
  delete base.consecutiveMissions
  delete base.traumaStatus
  delete base.traumaCount
  delete base.returningForm
  delete base.jk
  delete base.darkMoment
  delete base.jutsu
  delete base.bonds
  return base
}

// Personality descriptor — returns text based on staff judgment level
export function pDesc(value, trait, judgmentLevel) {
  if (judgmentLevel < 6) return '???'
  const tiers = PM_DESC[trait]
  if (!tiers) return '???'
  const tier = tiers.find(t => value <= t.max) || tiers[tiers.length - 1]
  if (judgmentLevel < 11) return value >= 13 ? 'positive' : value >= 8 ? 'neutral' : 'concerning'
  if (judgmentLevel < 16) return tier.short
  return tier.full
}

// Personality judgment level based on council/head sensei stats
export function personalityJudge() {
  const council = (G.staff || []).find(st => st.role === 'council')
  const headSensei = (G.staff || []).find(st => st.role === 'head_sensei')
  const cScore = council ? ((council.stats.charisma || 0) + (council.stats.diplomacy || 0)) / 2 : 0
  const sScore = headSensei ? ((headSensei.stats.pedagogy || 0) + (headSensei.stats.empathy || 0)) / 2 : 0
  return Math.floor(Math.max(cScore, sScore))
}

// Dressing room harmony score (0–100)
export function computeHarmony() {
  if (!G.shinobi || G.shinobi.length === 0) return 70
  let harmony = 70
  G.squads.forEach(sq => {
    const members = sq.members.map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i], b = members[j]
        if (!a.pMatrix || !b.pMatrix) continue
        const tempDiff = Math.abs((a.pMatrix.temperament || 10) - (b.pMatrix.temperament || 10))
        if (tempDiff > 10) harmony -= 6
        if ((a.pMatrix.ambition || 10) > 14 && (b.pMatrix.ambition || 10) > 14 && a.ri === b.ri) harmony -= 5
        const isRival = (a.bonds || []).some(bnd => bnd.otherId === b.id && bnd.type === 'Rivals')
        if (isRival) harmony -= 8
        const isBros = (a.bonds || []).some(bnd => bnd.otherId === b.id && bnd.type === 'Brothers-in-Arms')
        if (isBros) harmony += 4
      }
    }
  })
  const lowLoyal = G.shinobi.filter(s => s.pMatrix && s.pMatrix.loyalty < 8).length
  harmony -= lowLoyal * 3
  // Leadership group: top shinobi by loyalty + tenure
  const leaders = G.shinobi
    .slice()
    .sort((a, b) => ((b.pMatrix?.loyalty || 0) + Math.floor(b.months / 12)) - ((a.pMatrix?.loyalty || 0) + Math.floor(a.months / 12)))
    .slice(0, 5)
  const loyalLeaders = leaders.filter(l => (l.pMatrix?.loyalty || 0) >= 14).length
  harmony += loyalLeaders * 4
  return clamp(harmony, 0, 100)
}

// Generate transfer market pool for a window
export function genTransferPool() {
  const pool = []
  // Free agents: 2-3
  for (let i = 0; i < rnd(2, 3); i++) {
    const s = mS(rnd(0, 2))
    s.transferCategory = 'free_agent'; s.askingFee = 2000 + s.ri * 1500
    s.originVillage = null; s.monthsAvailable = rnd(2, 4); pool.push(s)
  }
  // Village-listed: 2-4
  for (let i = 0; i < rnd(2, 4); i++) {
    const s = mS(rnd(1, 3))
    s.transferCategory = 'village_listed'; s.askingFee = 5000 + s.ri * 3000
    s.originVillage = pk(VILLAGES_DEF).n; s.monthsAvailable = rnd(1, 2); pool.push(s)
  }
  // Missing-nin: 1-2
  for (let i = 0; i < rnd(1, 2); i++) {
    const s = mS(rnd(2, 4))
    s.transferCategory = 'missing_nin'
    s.pMatrix = { loyalty: rnd(1, 7), ambition: rnd(12, 20), professionalism: rnd(2, 10), temperament: rnd(2, 10), adaptability: rnd(8, 18) }
    s.askingFee = 3000 + s.ri * 2000; s.originVillage = null; s.monthsAvailable = rnd(1, 3); pool.push(s)
  }
  // Retired return: 0-1
  if (Math.random() < 0.5) {
    const s = mS(rnd(2, 3))
    s.transferCategory = 'retired_return'
    s.pMatrix = { loyalty: rnd(14, 20), ambition: rnd(2, 10), professionalism: rnd(14, 20), temperament: rnd(12, 18), adaptability: rnd(8, 14) }
    s.potential = rnd(35, 55); s.askingFee = 1500 + s.ri * 1000; s.originVillage = null; s.monthsAvailable = rnd(2, 3); pool.push(s)
  }
  // Foreign specialists: 0-2
  for (let i = 0; i < rnd(0, 2); i++) {
    const s = mS(rnd(1, 3))
    const specialStat = pk(Object.keys(s.stats))
    s.stats[specialStat] = clamp(s.stats[specialStat] + rnd(20, 35), 0, 99)
    s.transferCategory = 'foreign_specialist'; s.askingFee = 4000 + s.ri * 2500
    s.originVillage = pk(VILLAGES_DEF).n; s.monthsAvailable = rnd(1, 2); pool.push(s)
  }
  return pool
}

export function addChronicle(title, body, type = 'event') {
  G.chronicles.push({ year: G.year, month: G.month, title, body, type })
  if (G.chronicles.length > 80) G.chronicles.shift()
}

export function addLegend(amount) {
  G.legend = (G.legend || 0) + amount
  const titles = [{ at: 500, name: 'Legendary Village' }, { at: 250, name: 'War-Renowned Village' }, { at: 100, name: 'Rising Village' }]
  const now = G.legend, prev = now - amount
  titles.forEach(t => { if (now >= t.at && prev < t.at) addChronicle('Legend Milestone', 'Our village has been recognized as "' + t.name + '" with ' + now + ' legend points.', 'legend') })
}

export function schEx() {
  if (!G.examSched) { G.examMonth = G.month + rnd(3, 6); G.examSched = true }
}

export function rfM() {
  const s = MISS_POOL.filter(m => !m.sq).sort(() => Math.random() - 0.5).slice(0, 7)
  const sq = MISS_POOL.filter(m => m.sq).sort(() => Math.random() - 0.5).slice(0, 4)
  G.avM = [...s, ...sq].map(m => ({ ...m, id: Math.random().toString(36).slice(2) }))
}

export function rfP() {
  const lv = G.upgrades.academy
  const maxProspects = rnd(4, 6) + lv * 2

  // Age existing prospects
  G.prospects.forEach(p => { p.monthsWaiting = (p.monthsWaiting || 0) + 1 })

  // Add new prospects to fill up to the cap
  const toAdd = Math.max(0, maxProspects - G.prospects.length)
  for (let i = 0; i < toAdd; i++) {
    const s = mS(lv >= 2 && Math.random() < 0.1 ? 2 : 0)
    if (lv > 0) Object.keys(s.stats).forEach(k => { s.stats[k] = clamp(s.stats[k] + lv * 5, 0, 99) })
    G.prospects.push(s)
  }

  // 15% chance to spawn a rival pair among unrivaled prospects
  if (Math.random() < 0.15) {
    const unrivaled = G.prospects.filter(p => !p.rivalId)
    if (unrivaled.length >= 2) {
      const a = unrivaled[Math.floor(Math.random() * unrivaled.length)]
      const others = unrivaled.filter(p => p.id !== a.id)
      const b = others[Math.floor(Math.random() * others.length)]
      a.rivalId = b.id; b.rivalId = a.id
    }
  }

  // 1% chance per new prospect to be a prodigy
  G.prospects.filter(p => !p.prodigy && !p.monthsWaiting).forEach(p => {
    if (Math.random() < 0.01) {
      p.prodigy = true
      p.potential = 95 + Math.floor(Math.random() * 5) // 95-99
      p.archetype = { id: 'prodigy', n: 'Natural Prodigy', flavor: 'Chakra flows as naturally as breathing. Potential is obvious — and draws dangerous attention.' }
      if (G.log) G.log.push({ y: G.year, m: G.month, msg: '✦ A prodigy has appeared in the academy: ' + p.fn + ' ' + p.ln + '!', t: 'ev' })
    }
  })

  // 8% chance to spawn a family pair (same last name) among new unrelated prospects
  const noFamily = G.prospects.filter(p => !p.familyId && !p.monthsWaiting)
  if (noFamily.length >= 2 && Math.random() < 0.08) {
    const a = noFamily[Math.floor(Math.random() * noFamily.length)]
    const sameLastName = noFamily.filter(p => p.id !== a.id)
    if (sameLastName.length) {
      const b = sameLastName[Math.floor(Math.random() * sameLastName.length)]
      b.ln = a.ln // share last name
      const famId = Math.random().toString(36).slice(2)
      a.familyId = famId; b.familyId = famId
    }
  }
}
