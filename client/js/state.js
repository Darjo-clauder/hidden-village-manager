import {
  CLANS, RANKS, FNAMES, LNAMES, SPECS, PERSONALITIES, BACKSTORIES, ARCHETYPES,
  TAILED_BEASTS, VILLAGES_DEF, MISS_POOL, TRADE_ROUTES, CONTRACTS, STAFF_ROLES,
  REGIONS, PM_DESC, REGION_EVENTS, DEV_CURVES, AGENT_AGENDAS,
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
  const origin = Math.random() < 0.05 ? pk(['Kazegakure', 'Shimogakure', 'Gangakure', 'Raikurokure']) : null
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
    traits: [],                      // evolved traits: Resilient, Haunted, Confident, Resentful...
    lowCommitMonths: 0,              // consecutive months under commitment threshold (rumor trigger)
    lastReviewYear: null,            // year of last annual review
    transferListed: false,           // requested to leave but not yet sold — harmony fallout while lingering
    transferListedMonths: 0,
    sellOnClause: null,              // { percent, village } — paid out automatically on future sale
    homegrown: false,                // true for academy graduates promoted to active roster
    pursuedByVillages: [],           // village names that previously made (and lost) a bid — affects future negotiation tone
    injuryCount: 0,                  // career total injuries
    injuryHistory: [],               // [{ year, month, type, duration, treatment }]
    secondOpinionUsed: false,        // reset each new injury
    specialistTreated: false,        // reset each new injury
    // Career arc (Phase 1)
    peakAge:    ri === 0 ? rnd(20, 24) : ri === 1 ? rnd(23, 27) : rnd(24, 30),
    phase:      age < 18 ? 'developing' : age < 32 ? 'prime' : age < 37 ? 'veteran' : 'declining',
    declineMod: 0,
    retirementOffered: false,
    squadRole: 'flex',               // vanguard|support|intel|medical|flex
    // Phase 4 additions
    trainingFocus: null,             // stat name to boost monthly, or null
    contractEnd: null,               // year contract expires (set on creation)
    contractRenewing: false,         // true when renewal dialogue is open
    naturalRoles: ['flex'],          // roles this shinobi is comfortable in (1–3)
    restMonth: false,                // if true: skip mission deployment, recover workload
    pairChemistry: {},               // { otherId: missionsTogether } — pair-level chemistry tracker
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
    vName: 'Hidden Village', kName: 'Kage', vIcon: '🍃',
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
    warState: null,           // null or { villageId, phase, monthsLeft, playerWins:0, playerLosses:0, warHistory:[] }
    warConsequences: null,    // { loser:bool, academyDebuffYears:0, reparationVillage } post-war debuffs
    // Competition depth
    examFormat: null,             // { id, n, icon, bonusStats, desc } assigned when exam schedules
    examJudgeBias: null,          // { villageName, biasMod:0.05-0.10 } active during current exam
    examJudgeProtested: false,
    examHistoricalRecords: {      // running totals and bests across all exams
      totalPromotions: 0, bestSingleExam: 0, examWinsByVillage: {}
    },
    summitBlocOffer: null,        // { villageName, agendaItem, favorId } pending pre-summit approach
    pendingSummitFavor: null,     // favor owed after aligning in summit bloc
    upsetHistory: [],             // [{ year, desc }] recorded upsets
    // Reputation & legacy depth
    kageRelations: {},            // { villageName: { rel, grudge, note } } — per-kage personal relationship
    worldReputationText: '',      // dynamic monthly-updated flavor descriptor
    legacyDecisionPending: null,  // active LEGACY_DECISIONS entry awaiting player choice
    legacyDecisionHistory: [],    // [{ id, choice, year }]
    successorId: null,            // id of designated successor (shinobi or staff)
    successorType: null,          // 'shinobi' | 'staff'
    dynastyContinuityScore: 0,    // 0–100, built by developing the successor
    // Scouting depth
    scoutWatchlist: [],        // array of prospect ids the player is tracking
    scoutBudget: { domestic: 40, foreign: 30, shadow: 30 },  // % split, sums to 100
    regionalMeta: {},          // regionId -> { eventId, monthsLeft }
    // Youth academy depth
    academyRecords: {},        // statKey -> { value, name, year }
    gradTracking: [],          // { id, name, gradYear, gradMonth, clan }
    // People management depth
    rumors: [],                 // { id, shinobiId, shinobiName, text, year, month, isFalse, resolved }
    noticeboard: [],            // { year, month, text, type }
    serviceAwardQueue: [],      // { id, shinobiId, years, year, month }
    reviewQueue: [],            // { id, shinobiId, outcome, year }
    // Staff depth
    staffHallOfFame: [],             // [{ fn, ln, role, yearsServed, rating, year }]
    asstKageLog: [],                 // [{ year, month, text }] — log of AK autonomous decisions
    staffConflict: null,             // { headSenseiId, teamSenseiId, year, month } — active conflict
    staffPoachOffer: null,           // { staffId, staffName, village, matchCost, expiresYear, expiresMonth }
    // Injury system depth
    emergencyRecruitWindow: false,   // true after squad injury crisis (4+ injured simultaneously)
    emergencyWindowEnd: null,        // { year, month } when emergency window closes
    // Finance & transfer market depth
    daimyoObjectives: null,     // { ids:[], year, startRel } — set each January, evaluated each December
    daimyoObjectiveHistory: [], // { year, met:[bool,bool,bool], budgetMult }
    daimyoBudgetMult: 1,        // multiplies daimyo bonus income; adjusted by objective outcomes
    sponsorship: null,          // active deal: { id, n, monthlyRyo, obligation, restrictedVillage }
    sponsorshipOffer: null,     // pending offer awaiting accept/decline
    blackLedger: { balance: 0, history: [] }, // off-books ryo tracker, separate from G.ryo
    yearEndReports: [],         // { year, totalIncome, totalExpend, net, streams, daimyoReaction }
    // Phase 1 additions
    depthChart: {},             // roleId -> { starter, backup, emergency } per squad id
    missionChains: [],          // active multi-step mission chains
    completedMissionChains: [], // completed/expired chains (capped 20)
    depthGaps: [],              // [{ squadId, roleId, severity }] — written by depthEngine
    // Phase 4 additions
    missionPrepMode: 'standard',       // 'aggressive'|'standard'|'cautious' — set before each mission
    lastMissionReport: null,           // { missionId, squadId, scores:[{id,name,grade,detail}] }
    seniorGroup: [],                   // [shinobiId] — top 3 by wins+commitment, auto-updated monthly
    seniorGroupMorale: 75,             // 0–100 — separate from village morale
    contractRenewalQueue: [],          // [{ shinobiId, demandSalary, year }]
    pairChemistryLog: {},              // global { `${idA}_${idB}`: missionCount }
    analyticsHistory: [],              // monthly snapshots for analytics dashboard
    // Phase 2–5 additions (lazy-init guarded in adv but explicit here for save/load safety)
    blackMarketRep: 0,                 // underworld reputation 0–100
    councilApproval: {},               // { [factionId]: 0–100 } — populated by council tick
    safehouses: [],                    // [{ id, locationId, status, established }]
    worldCalendar: {},                 // keyed by event notice flags + pendingEvent/activeEvent
    clanApproval: {},                  // { [clanId]: 0–100 } — drift toward 60 monthly
    draftPool: [],                     // prospect leads from safehouse network (see rollProspectLead)
  });
  ;[2, 2, 1, 1, 1, 0, 0, 0].forEach(r => {
    const s = mS(r)
    s.contractEnd = 1 + Math.floor(Math.random() * 3) + 1  // year 2–4
    G.shinobi.push(s)
  })
  // Starter staff — gives new players immediate access to Staff and Scouting panels
  ;['scout_jonin', 'team_sensei'].forEach(roleId => {
    const st = mStaff(roleId, 8)
    if (st) {
      if (roleId === 'scout_jonin') st.regionAssigned = 'fire'
      G.staff.push(st)
    }
  })
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
    ambition: rnd(3, 18),            // how aggressively they seek career advancement
    careerPathMonths: 0,             // months tracked since last career move / hire
    asstKage: false,                 // designated Assistant Kage
    hiddenFlaw: Math.random() < 0.25
      ? pk(['Low Professionalism', 'Fragile Under Pressure', 'High Conflict Tendency', 'Overestimates Own Abilities'])
      : null,
    flawRevealed: false,
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

  // Compute stat ranges based on scout attributes (perception=stat accuracy, judgement=potential/personality)
  if (scout) {
    const perception  = scout.stats.perception  || 8
    const judgement   = scout.stats.judgement   ?? scout.stats.endurance ?? 8   // backward compat
    const adaptability = scout.stats.adaptability ?? scout.stats.ninjutsu ?? 8  // backward compat
    // Regional memory: contactLevel builds over months worked in this region
    const mem = scout.regionMemory?.[regionId]
    const contactLevel = mem?.contactLevel || 0
    const contactBonus = Math.floor(contactLevel / 3)  // +1 per 3 contact levels (max +6 at lvl 20)

    // Stat accuracy: perception + contact familiarity
    const effectivePerception = Math.min(20, perception + contactBonus)
    const errorMargin = Math.max(1, Math.round(14 - effectivePerception * 0.60))
    p.statRanges = {}
    Object.keys(p.stats).forEach(k => {
      p.statRanges[k] = {
        lo:    Math.max(1, p.stats[k] - errorMargin),
        hi:    Math.min(99, p.stats[k] + errorMargin),
        exact: effectivePerception >= 17,
      }
    })

    // Potential accuracy: judgement stat drives this
    const effectiveJudgement = Math.min(20, judgement + contactBonus)
    const potError = Math.max(3, Math.round(24 - effectiveJudgement))
    p.potRange = {
      lo:    Math.max(10, p.potential - potError),
      hi:    Math.min(99, p.potential + potError),
      exact: effectiveJudgement >= 17,
    }

    // Overall confidence: blend of perception, judgement, contact level, adaptability bonus in new regions
    const regionFamiliarity = contactLevel >= 10 ? 10 : contactLevel >= 5 ? 5 : 0
    const noveltyPenalty = contactLevel < 3 ? Math.floor((3 - contactLevel) * 2) : 0  // scouts in new regions are less confident
    p.scoutConfidence = clamp(
      Math.round(35 + perception * 1.5 + judgement * 1.2 + regionFamiliarity - noveltyPenalty),
      35, 95
    )

    // Personality read: requires high judgement
    const persJudge = Math.round((judgement + (scout.stats.intelligence || judgement * 0.6)) / 2)
    p.personalityRevealed = persJudge >= 13
    p.personalityJudgeLevel = persJudge

    // Report quality tier (drives UI label)
    p.reportQuality = p.scoutConfidence >= 80 ? 'Elite' : p.scoutConfidence >= 65 ? 'Detailed' : p.scoutConfidence >= 50 ? 'General' : 'Impression'

    // Scout bias: if scout has hiddenBias and it matches a stat, subtly skew the range
    if (scout.hiddenBias) {
      const { overvalues, undervalues, magnitude } = scout.hiddenBias
      if (p.statRanges[overvalues])  { p.statRanges[overvalues].lo  += magnitude; p.statRanges[overvalues].hi  += magnitude }
      if (p.statRanges[undervalues]) { p.statRanges[undervalues].lo -= magnitude; p.statRanges[undervalues].hi -= magnitude }
    }
  }

  return p
}

// Narrative flavor text for a scout report, written from the scout's POV
export function genScoutNarrative(scout, prospect, quality) {
  const openers = {
    Detailed: ['I watched closely over several days.', 'Got a clean, thorough read on this one.', 'Spent real time confirming what I saw.'],
    General:  ['Caught a few sessions, enough to form an opinion.', 'A decent look, though I wasn\'t able to confirm everything.', 'Saw enough to be reasonably confident.'],
    Vague:    ['Only a brief glimpse — take this with caution.', 'Limited access, this is mostly secondhand.', 'Couldn\'t get close. This is a rough guess at best.'],
  }
  const bodies = [
    `${prospect.fn} shows real promise in the field — worth tracking.`,
    `There's raw talent here, but discipline is still unproven.`,
    `Clan blood runs strong in this one.` ,
    `Quiet, watchful type. Hard to read intentions.`,
    `Energetic and eager — the kind that either rises fast or burns out.`,
    `Reminds me of shinobi who went on to do great things.`,
  ]
  const closers = [
    'Recommend continued observation.',
    'Rival villages may already be circling.',
    'Worth the ryo to bring in for a trial.',
    'No rush — this one isn\'t going anywhere yet.',
  ]
  return `${pk(openers[quality] || openers.General)} ${pk(bodies)} ${pk(closers)}`
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
  // Hidden development curve — revealed by experienced sensei or elite scout
  base.devCurve = pk(DEV_CURVES).id
  base.devCurveRevealed = false
  base.trainingReports = []  // monthly narrative log from sensei
  base.academyOrigin = true
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

// Determine a sensei's training style from their stat profile
export function senseiStyle(sensei) {
  if (!sensei) return 'neutral'
  const discipline = sensei.stats.discipline || 8
  const empathy = sensei.stats.empathy || 8
  if (discipline > empathy + 3) return 'harsh'
  if (empathy > discipline + 3) return 'nurturing'
  return 'neutral'
}

// Generate a short monthly training-report narrative from a sensei's perspective
export function genTrainingReport(student, sensei, growthNote) {
  const style = senseiStyle(sensei)
  const senseiName = sensei ? sensei.fn + ' ' + sensei.ln : 'the instructors'
  const observations = {
    harsh: [`${student.fn} needs to toughen up — pushed them hard this month.`, `Discipline is improving, but ${student.fn} still flinches under pressure.`, `No excuses accepted. ${student.fn} is learning that the hard way.`],
    nurturing: [`${student.fn} is coming along nicely — encouraged them through some rough patches.`, `Made sure ${student.fn} felt supported this month. Confidence is growing.`, `${student.fn} responds well to patience. Proud of the progress.`],
    neutral: [`Standard progress from ${student.fn} this month.`, `${student.fn} is keeping pace with the rest of the class.`, `Nothing remarkable to report on ${student.fn} this month.`],
  }
  return `${pk(observations[style] || observations.neutral)} ${growthNote || ''} — ${senseiName}`.trim()
}

// Reveal a student's hidden development curve if sensei/scout judgment is high enough
export function revealDevCurve(student, judgeRating) {
  if (!student.devCurveRevealed && (judgeRating || 0) >= 14) {
    student.devCurveRevealed = true
    return true
  }
  return false
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
  // Transfer-listed shinobi linger awkwardly in training — fault line for harmony
  const listed = G.shinobi.filter(s => s.transferListed).length
  harmony -= listed * 4
  // Leadership group: top shinobi by loyalty + tenure
  const leaders = getLeadershipGroup()
  const loyalLeaders = leaders.filter(l => (l.pMatrix?.loyalty || 0) >= 14).length
  harmony += loyalLeaders * 4
  return clamp(harmony, 0, 100)
}

// Shared leadership-group computation (top 5 by loyalty + tenure) — used by
// harmony scoring, the meetings panel, and group dynamics events.
export function getLeadershipGroup(list) {
  return (list || G.shinobi || [])
    .slice()
    .sort((a, b) => ((b.pMatrix?.loyalty || 0) + Math.floor(b.months / 12)) - ((a.pMatrix?.loyalty || 0) + Math.floor(a.months / 12)))
    .slice(0, 5)
}

// Add an evolved trait if not already present. Returns true if newly added.
export function addTrait(s, trait) {
  if (!s.traits) s.traits = []
  if (s.traits.includes(trait)) return false
  s.traits.push(trait)
  return true
}

// Build a relationship web: nodes (shinobi) + edges (bonds and rivalries)
export function buildRelationshipWeb() {
  const nodes = (G.shinobi || []).map(s => ({ id: s.id, name: sn(s), ri: s.ri, traits: s.traits || [] }))
  const edges = []
  const seen = new Set()
  ;(G.shinobi || []).forEach(a => {
    (a.bonds || []).forEach(bnd => {
      const key = [a.id, bnd.otherId].sort().join('|') + bnd.type
      if (seen.has(key)) return
      seen.add(key)
      const b = G.shinobi.find(x => x.id === bnd.otherId)
      if (!b) return
      edges.push({ aId: a.id, aName: sn(a), bId: b.id, bName: sn(b), type: bnd.type, sign: bnd.type === 'Rivals' ? -1 : 1 })
    })
    if (a.rivalId) {
      const b = G.shinobi.find(x => x.id === a.rivalId)
      if (b) {
        const key = [a.id, b.id].sort().join('|') + 'RivalFlag'
        if (!seen.has(key)) { seen.add(key); edges.push({ aId: a.id, aName: sn(a), bId: b.id, bName: sn(b), type: 'Rivals', sign: -1 }) }
      }
    }
  })
  return { nodes, edges }
}

// Add a rumor about an unhappy shinobi. 20% chance the rumor is false (no actual mechanical basis).
export function addRumor(s, template) {
  if (!G.rumors) G.rumors = []
  const isFalse = Math.random() < 0.20
  G.rumors.push({
    id: Math.random().toString(36).slice(2),
    shinobiId: s.id, shinobiName: sn(s),
    text: template.replace('%name%', s.fn),
    year: G.year, month: G.month,
    isFalse, resolved: false,
  })
  if (G.rumors.length > 20) G.rumors.shift()
}

// Add a narrative entry to the village noticeboard feed.
export function addNotice(text, type = 'neutral') {
  if (!G.noticeboard) G.noticeboard = []
  G.noticeboard.push({ year: G.year, month: G.month, text, type })
  if (G.noticeboard.length > 60) G.noticeboard.shift()
}

// Assign an agent intermediary to high-rank pool entries (A-rank+/S-rank).
// Agents take a cut of any signing bonus and push their own agenda in negotiation.
function assignAgent(s) {
  if (s.ri < 3) return
  const agenda = pk(AGENT_AGENDAS)
  s.agent = {
    name: pk(FNAMES) + ' ' + pk(LNAMES),
    agenda: agenda.id,
    agendaDesc: agenda.desc,
    feePercent: rnd(5, 15),
  }
}

// Market value — current worth, rising with performance/age curve, falling with
// injury/decline. Computed on demand rather than stored (always reflects current state).
export function computeMarketValue(s) {
  const power = Object.values(s.stats).reduce((a, b) => a + b, 0) / Object.keys(s.stats).length
  let value = Math.round(power * 90 + (s.potential || 50) * 35)
  // Age curve: rises to late-20s, declines after
  if (s.age <= 24) value = Math.round(value * (0.85 + (s.age - 12) * 0.012))
  else if (s.age <= 29) value = Math.round(value * 1.05)
  else value = Math.round(value * Math.max(0.5, 1.05 - (s.age - 29) * 0.04))
  // Performance modifiers
  value += (s.wins || 0) * 60 + (s.winsS || 0) * 400
  if ((s.streak || 0) >= 3) value = Math.round(value * 1.08)
  if (s.legendStatus) value = Math.round(value * 1.15)
  // Decline modifiers
  if (s.status === 'injured') value = Math.round(value * 0.85)
  if (s.traumaStatus) value = Math.round(value * 0.9)
  if ((s.traumaCount || 0) >= 2) value = Math.round(value * 0.85)
  if ((s.traits || []).includes('InjuryProne')) value = Math.round(value * 0.80)
  if ((s.traits || []).includes('Fragile')) value = Math.round(value * 0.90)
  return Math.max(500, value)
}

// Generate transfer market pool for a window
export function genTransferPool() {
  const pool = []
  // Free agents: 2-3
  for (let i = 0; i < rnd(2, 3); i++) {
    const s = mS(rnd(0, 2))
    s.transferCategory = 'free_agent'; s.askingFee = 2000 + s.ri * 1500
    s.originVillage = null; s.monthsAvailable = rnd(2, 4); assignAgent(s); pool.push(s)
  }
  // Village-listed: 2-4
  for (let i = 0; i < rnd(2, 4); i++) {
    const s = mS(rnd(1, 3))
    s.transferCategory = 'village_listed'; s.askingFee = 5000 + s.ri * 3000
    s.originVillage = pk(VILLAGES_DEF).n; s.monthsAvailable = rnd(1, 2)
    // Origin village sometimes negotiates a sell-on clause as part of the deal
    if (Math.random() < 0.4) s.sellOnClause = { percent: rnd(5, 20), village: s.originVillage }
    assignAgent(s); pool.push(s)
  }
  // Missing-nin: 1-2
  for (let i = 0; i < rnd(1, 2); i++) {
    const s = mS(rnd(2, 4))
    s.transferCategory = 'missing_nin'
    s.pMatrix = { loyalty: rnd(1, 7), ambition: rnd(12, 20), professionalism: rnd(2, 10), temperament: rnd(2, 10), adaptability: rnd(8, 18) }
    s.askingFee = 3000 + s.ri * 2000; s.originVillage = null; s.monthsAvailable = rnd(1, 3); assignAgent(s); pool.push(s)
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
    s.originVillage = pk(VILLAGES_DEF).n; s.monthsAvailable = rnd(1, 2); assignAgent(s); pool.push(s)
  }
  return pool
}

export function addChronicle(title, body, type = 'event', narrative = null) {
  const entry = { year: G.year, month: G.month, title, body, type }
  if (narrative) entry.narrative = narrative
  G.chronicles.push(entry)
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
  const expiryBase = (G.month || 1) + 3
  G.avM = [...s, ...sq].map(m => ({
    ...m,
    id: Math.random().toString(36).slice(2),
    expiresMonth: expiryBase,   // month number; missions >3 months old are removed
    addedYear: G.year || 1,
  }))
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
