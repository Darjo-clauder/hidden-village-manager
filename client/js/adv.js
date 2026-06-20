import { G, ui, sPow, sqP, sn, rnd, pk, clamp, fmt, rfM, rfP, KAGE_EVENTS, addChronicle, addLegend, genRegionProspect, genStudent, computeHarmony, genTransferPool, pDesc, genScoutNarrative, senseiStyle, genTrainingReport, revealDevCurve, getLeadershipGroup, addTrait, addRumor, addNotice, computeMarketValue, mS, genVillageRoster } from './state.js'
import { RANKS, RAID_POOL, MONTHS, JUTSU_LIST, WORLD_CHOICE_EVENTS, INJURY_TYPES, RANK_INJ_CHANCE, RANK_WORKLOAD, RANK_INJ_POOL, TRAUMA_TRAITS, FINANCE_TIERS, FINANCIAL_EVENTS, MISSION_COMMISSION, BUILDING_MAINTENANCE, DAIMYO_BONUS, REGIONS, DEV_TRACKS, INTENSITY_LEVELS, STAFF_ROLES, MEETING_TYPES, TRANSFER_WINDOWS, BINGO_TIERS, HARMONY_EVENTS, REGION_EVENTS, DEV_CURVES, GROUP_EVENTS, SERVICE_AWARDS, RUMOR_TEMPLATES, DAIMYO_OBJECTIVES, SPONSORSHIP_OFFERS, EXAM_FORMATS, LEGACY_DECISIONS, PRESTIGE_TIERS } from './constants.js'
import { aL, ntf, upUI, schEx } from './ui.js'
import { tickBeast, applyBeastPairEffects, getBeastPassives, BEAST_DATA, getSyncStage, captureChance } from './beastEngine.js'
import { tickKageRels, getWorldReputationFlavor, shiftKageRel, ensureKageRels } from './rivalKage.js'
import { syncToServer } from './socket.js'
import { pickNarrative, pickSquadNarrative, pickRankUpNarrative, DARK_MOMENT_POOL, LAST_WORDS_POOL } from './narratives.js'
import { sqSynergy, SQUAD_IDENTITIES } from './synergy.js'
import { tickScouts } from './scoutEngine.js'
import { tickProspects } from './prospectEngine.js'
import { tickCareers, ensureCareerFields } from './careerEngine.js'
import { refreshMissionBoard, maybeSpawnChain, advanceChain } from './missionGen.js'
import { evalDepth, roleBonus } from './depthEngine.js'
import { jutsuLoadoutBonus } from '../../shared/jutsu/loadout.js'
import { DISTRICTS, getDistrictPassives } from '../../shared/constants/districts.js'
import { COUNCIL_FACTIONS, COUNCIL_PROPOSALS, getCouncilPerks } from '../../shared/constants/council.js'
import { tickRivalStrength, shouldFireRivalEvent, pickRivalEvent, computePlayerStrength } from '../../shared/utils/rivalSim.js'
import { initSeasonTable, playMatchday } from '../../shared/utils/season.js'
import { villageRevenue } from '../../shared/utils/economy.js'
import { resolveMission, qualityEffects } from '../../shared/utils/missionEngine.js'
import { DYNASTY_YEARS, computeDynastyGrade } from '../../shared/utils/dynasty.js'
import { bondMissionBonus, mentorGrowthBonus, kiaRipple, BOND_TYPES } from '../../shared/bonds/bondTypes.js'
import { BM_MISSION_BY_ID, getUnderworldTier, discoveryChance, UNDERWORLD_TIERS } from '../../shared/constants/blackMarket.js'
import { getClanPassives, CLANS, CLAN_CHAINS, availableClanChains } from '../../shared/constants/clans.js'
import { getSafehousePassives, rollProspectLead, SAFEHOUSE_COST, MAX_SAFEHOUSES, SH_LOCATION_BY_ID, DC_OP_BY_ID, SAFEHOUSE_LOCATIONS } from '../../shared/constants/safehouses.js'
import { getEventForMonth, getUpcomingEvent, resolveWorldEvent, WE_BY_ID } from '../../shared/constants/worldCalendar.js'
import { successCeiling } from '../../shared/utils/missionOdds.js'
import { emit, integrityCheck } from '../../shared/utils/telemetry.js'
import { formationMods } from '../../shared/utils/formation.js'
import { pickSupportEvent } from '../../shared/bonds/supportEvents.js'
import { applyDebt } from '../../shared/utils/debt.js'
import { nationMods } from '../../shared/constants/nations.js'
import { activeBloodlineBonus, netBloodlineMod, canActivate, BLOODLINE_MULTIPLIER, ACTIVATION_COST, ACTIVATION_MIN_STAGE, ACTIVE_DURATION, COOLDOWN, AGGRO_INCREASE, DEBUFF_DURATION } from '../../shared/utils/bloodline.js'
import { capStatus } from '../../shared/constants/salaryCap.js'
import { pickMandates, evaluateMandates, MANDATE_BY_ID, CONFIDENCE_START, DISMISSAL_THRESHOLD } from '../../shared/utils/ownerMandate.js'
import { getPhilosophyMods } from '../../shared/constants/coachingPhilosophy.js'
import { snapshotSeasonStats, leagueLeaders } from '../../shared/utils/seasonStats.js'
import { computeAwards } from '../../shared/utils/awards.js'
import { PRESS_QUESTIONS, PRESS_TONES, TONE_BY_ID, TONE_TRIGGER_OVERRIDES, hydrateQuestion } from '../../shared/utils/pressConference.js'
import { updateConfidence, confidenceMod, formGrudge, grudgePenalty, pairChemistryBonus, assignRoleTag, setEmotionalState, tickEmotionalState, emotionalScMod, getArchetypeQuote } from '../../shared/utils/personality.js'
import { genMissionBlurb, genKIABlurb, genRankUpBlurb, genBondBlurb, genGrudgeBlurb, genCounterStrategyBlurb } from '../../shared/utils/narrativeEngine.js'
import { recordPlayerTactic, getPlayerTendency, applyCounterStrategy, rivalScPenalty, observePlayerTactic, explainStanceChange, rollMetaEvent, ensureRivalProfile } from '../../shared/utils/adaptiveAI.js'
import { addMemory, decayMemories, memoryMoraleMod, memoryStateBlurb } from '../../shared/utils/memorySystem.js'
import { linkToThread, pruneOldThreads } from '../../shared/utils/narrativeThreads.js'
import { tickMentorships } from '../../shared/utils/mentorship.js'

function currentSeason() { return MONTHS[G.month - 1]?.season || 'Spring' }

// ── Narrative inbox + thread helper ───────────────────────────────────────────
function pushNarrative(blurb, actorIds = []) {
  if (!G.narrativeInbox) G.narrativeInbox = []
  if (!G.narrativeThreads) G.narrativeThreads = []
  const entry = { id: Math.random().toString(36).slice(2), ...blurb, actorIds, year: G.year, month: G.month }
  // Thread linking
  const thread = linkToThread(G.narrativeThreads, entry.id, entry.tag, actorIds, entry.title, { year: G.year, month: G.month })
  if (thread) entry.threadId = thread.id
  G.narrativeInbox.push(entry)
  if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
  // Prune stale threads yearly
  if (G.month === 1) G.narrativeThreads = pruneOldThreads(G.narrativeThreads, G.year, G.month)
}

// ── Mission log ────────────────────────────────────────────────────────────────
function pushMissionLog(entry) {
  if (!G.missionLog) G.missionLog = []
  G.missionLog.push({ id: Math.random().toString(36).slice(2), ...entry, year: G.year, month: G.month })
  if (G.missionLog.length > 30) G.missionLog.splice(0, G.missionLog.length - 30)
}

// ── Beast unique ability helpers ───────────────────────────────────────────────
function getBeastForJK(shinobiId) {
  return G.beasts?.find(b => b.sealed && b.jk === shinobiId)
}
function hasUniqueAbility(shinobiId, beastName) {
  const b = getBeastForJK(shinobiId)
  if (!b || b.n !== beastName) return false
  const data = BEAST_DATA[b.n]
  if (!data?.uniqueAbility) return false
  return getSyncStage(b) >= data.uniqueAbility.stage
}
function jkKIAImmune(s) {
  const b = getBeastForJK(s.id); if (!b) return false
  const data = BEAST_DATA[b.n]; if (!data?.uniqueAbility) return false
  if (getSyncStage(b) < data.uniqueAbility.stage) return false
  // Sakeru Sand Armor and Kureni Nine-Tails Mode both grant KIA immunity once per year
  if (b.n !== 'Sakeru' && b.n !== 'Kureni') return false
  if (!G._jkKIAImmuneYear) G._jkKIAImmuneYear = {}
  if (G._jkKIAImmuneYear[b.n] === G.year) return false
  G._jkKIAImmuneYear[b.n] = G.year
  aL(`${sn(s)}'s ${b.n} aura deflected certain death — ${b.n === 'Kureni' ? 'Nine-Tails Mode' : 'Sand Armor'} activated!`, 'good')
  return true
}

// ── Injury helpers ─────────────────────────────────────────────────────────────
function pickInjuryType(mRk) {
  const pool = RANK_INJ_POOL[mRk] || ['muscle']
  return INJURY_TYPES.find(t => t.id === pool[Math.floor(Math.random() * pool.length)])
}

function applyInjury(s, injType, hL, extraReduction = 0) {
  const medNinjaCount = (G.staff || []).filter(st => st.role === 'medical').length
  const medReduction = medNinjaCount * 0.5  // each medical ninja -0.5 months
  let dur = rnd(injType.minMo, injType.maxMo)
  dur = Math.max(1, Math.round(dur - (s.pers?.effect?.injReduct || 0) - hL - medReduction - extraReduction))
  s.injDays = dur
  s.injuryType = injType.id
  s.status = 'injured'
  s.missId = null
  s.secondOpinionUsed = false
  s.specialistTreated = false

  // Track career injury count and history
  s.injuryCount = (s.injuryCount || 0) + 1
  if (!s.injuryHistory) s.injuryHistory = []
  s.injuryHistory.push({ year: G.year, month: G.month, type: injType.id, typeName: injType.n, duration: dur, treatment: 'standard' })

  // Injury-prone trait after 3+ career injuries
  if (s.injuryCount >= 3 && addTrait(s, 'InjuryProne')) {
    aL(sn(s) + ' has now been injured ' + s.injuryCount + ' times — officially injury-prone.', 'warn')
    addNotice(sn(s) + '\'s repeated injuries are becoming a pattern — scouts will take note.', 'warn')
  }

  if (injType.id === 'severe' && injType.statLoss && Math.random() < 0.3) {
    const k = pk(['ninjutsu','taijutsu','speed','chakra'])
    s.stats[k] = Math.max(5, s.stats[k] - rnd(1, 3))
    aL(sn(s) + ' suffered permanent stat loss from their severe wound.', 'bad')
  }
  // Career-threatening injury personality evolution (severe, 3+ months)
  if (injType.id === 'severe' && dur >= 3) {
    if (s.pers?.n === 'Reckless' && Math.random() < 0.40) {
      s.pers = { n:'Careful', cat:'pos', desc:'A serious injury changed everything. They now calculate before acting.', effect:{ riskMod:-0.10 } }
      aL(sn(s) + '\'s recklessness burned out in the hospital bed — they returned Careful.', 'warn')
      addNotice(sn(s) + ' is a changed shinobi after their injury.', 'neutral')
    } else {
      const roll = Math.random()
      if (roll < 0.30) {
        if (addTrait(s, 'Resilient')) aL(sn(s) + ' drew something from the hardship — emerged Resilient.', 'good')
      } else if (roll < 0.50) {
        if (addTrait(s, 'Fragile')) {
          // Fragile: minor permanent stat reduction
          const k = pk(['ninjutsu','taijutsu','speed'])
          s.stats[k] = Math.max(5, s.stats[k] - 2)
          aL(sn(s) + ' carries lasting damage — gained the Fragile trait.', 'bad')
        }
      }
    }
  }

  if (injType.trauma) {
    applyTrauma(s)
  }
  // Long injury → returning form penalty
  if (dur >= 3) {
    s.returningForm = 60
  }
}

function applyTrauma(s) {
  s.traumaCount = (s.traumaCount || 0) + 1
  s.traumaStatus = pk(TRAUMA_TRAITS)
  s.traumaMonths = rnd(2, 6)
  // Stat penalty while traumatised
  Object.keys(s.stats).forEach(k => { s.stats[k] = Math.max(5, s.stats[k] - 2) })
  G.morale = clamp(G.morale - 5, 0, 100)
  aL(sn(s) + ' is suffering from psychological trauma — ' + s.traumaStatus + '.', 'warn')
  addChronicle('Psychological Trauma', sn(s) + ' developed a ' + s.traumaStatus + ' personality after traumatic events.', 'shinobi')
}

function rollInjuryOnSuccess(s, m, hL, injDayReduction = 0) {
  let chance = RANK_INJ_CHANCE[m.rk] || 0.02
  if ((s.age || 0) >= 40) chance += 0.08
  if ((s.consecutiveMissions || 0) >= 2) chance += 0.10
  if (G.morale < 40) chance += 0.05
  const medCount = (G.staff || []).filter(st => st.role === 'medical').length
  chance = clamp(chance - medCount * 0.03, 0, 0.90)
  if (s.pers?.effect?.riskMod) chance += s.pers.effect.riskMod
  if (Math.random() < chance) {
    const injType = pickInjuryType(m.rk)
    if (injType) {
      applyInjury(s, injType, hL, injDayReduction)
      aL(sn(s) + ' sustained a ' + injType.n + ' completing "' + m.n + '".', 'warn')
    }
  }
}

function addWorkload(s, mRk) {
  s.workload = clamp((s.workload || 0) + (RANK_WORKLOAD[mRk] || 10), 0, 100)
  s.consecutiveMissions = (s.consecutiveMissions || 0) + 1
}

// ── Finance helpers ────────────────────────────────────────────────────────────
function computeDaimyoBonus() {
  const leg = G.legend || 0
  for (const tier of DAIMYO_BONUS) {
    if (leg >= tier.at) return tier.amount
  }
  return 0
}

function computeVillageRevenue() {
  return villageRevenue(G.reputation || 0, G.prestigeTier || 'D')
}

function computeMaintenance() {
  let total = 0
  Object.keys(G.upgrades).forEach(k => {
    const lv = G.upgrades[k]
    if (lv > 0) total += (BUILDING_MAINTENANCE[k] || 400) * lv
  })
  return total
}

function computeFinanceTier(net) {
  for (const tier of FINANCE_TIERS) {
    if (net >= tier.minNet) return tier
  }
  return FINANCE_TIERS[FINANCE_TIERS.length - 1]
}

export function recordMissionCommission(rank) {
  if (!G.finances) return
  if (!G.finances.missionCommissions) G.finances.missionCommissions = { D:0,C:0,B:0,A:0,S:0 }
  G.finances.missionCommissions[rank] = (G.finances.missionCommissions[rank] || 0) + 1
  const commission = MISSION_COMMISSION[rank] || 0
  G.ryo += commission
}

export function recordScoutCost(amount) {
  if (!G.finances) return
  G.finances.scoutCostThisMonth = (G.finances.scoutCostThisMonth || 0) + amount
}

export function recordExamFee(amount) {
  if (!G.finances) return
  G.finances.examFees = (G.finances.examFees || 0) + amount
}

// ── Jutsu unlock check ─────────────────────────────────────────────────────
function checkJutsu(s) {
  if (!s.jutsu) s.jutsu = []
  const eligible = JUTSU_LIST.filter(j => {
    if (s.jutsu.includes(j.id)) return false
    if (j.clan && s.clan !== j.clan) return false
    if (j.req.winsB && (s.winsB || 0) < j.req.winsB) return false
    if (j.req.winsS && (s.winsS || 0) < j.req.winsS) return false
    if (j.req.wins && s.wins < j.req.wins) return false
    if (j.req.prodigy && !s.prodigy) return false
    return true
  })
  if (eligible.length) {
    const j = eligible[Math.floor(Math.random() * eligible.length)]
    s.jutsu.push(j.id)
    aL(sn(s) + ' learned ' + j.n + '! [' + j.tier + '] ' + j.desc, 'good')
    addChronicle('Jutsu Mastered', sn(s) + ' learned ' + j.n + '.', 'shinobi')
    addLegend(j.tier === 'rare' ? 10 : j.tier === 'uncommon' ? 5 : 2)
  }
}

// ── Bond formation ─────────────────────────────────────────────────────────
function tryFormBonds(sq) {
  if (!sq) return
  const members = sq.members.map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
  const wins = sq.wins || 0
  if (wins < 5) return
  // Try to form bonds between pairs
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i], b = members[j]
      if (!a.bonds) a.bonds = []
      if (!b.bonds) b.bonds = []
      const alreadyBonded = a.bonds.some(bnd => bnd.otherId === b.id)
      if (alreadyBonded) continue
      if (Math.random() > 0.20) continue // 20% chance per qualifying check
      let type = 'Brothers-in-Arms'
      if (Math.abs(a.ri - b.ri) >= 2) type = 'Mentor/Student'
      if (a.rivalId === b.id || b.rivalId === a.id) type = 'Rivals'
      if (a.darkMoment && b.darkMoment) type = 'Battle-Scarred'
      a.bonds.push({ otherId: b.id, type, formed: { year: G.year, month: G.month } })
      b.bonds.push({ otherId: a.id, type, formed: { year: G.year, month: G.month } })
      aL(sn(a) + ' and ' + sn(b) + ' have formed a bond: ' + type + '.', 'good')
      addChronicle('Bond Formed', sn(a) + ' and ' + sn(b) + ' are now ' + type + ' after ' + wins + ' missions together.', 'shinobi')
      addNotice(type === 'Rivals'
        ? sn(a) + ' and ' + sn(b) + ' have become rivals — sparks are flying in the training grounds.'
        : sn(a) + ' and ' + sn(b) + ' are now ' + type + ' after fighting side by side.', type === 'Rivals' ? 'warn' : 'good')
    }
  }
}

// ── Age-based stat decline ─────────────────────────────────────────────────
function applyAgeDecline(s) {
  if (s.age < 40) return
  const chance = s.age >= 55 ? 0.35 : s.age >= 50 ? 0.20 : s.age >= 45 ? 0.10 : 0.05
  if (Math.random() < chance) {
    const k = pk(['speed', 'taijutsu', 'ninjutsu'])
    s.stats[k] = Math.max(5, s.stats[k] - 1)
  }
}

// ── Resolve world choice event ─────────────────────────────────────────────
export function resolveChoiceEvent(fnKey) {
  const ev = G.pendingChoiceEvent
  G.pendingChoiceEvent = null
  if (!ev) return
  if (fnKey.endsWith('_aid'))    { G.ryo -= 8000; G.morale = clamp(G.morale + 10, 0, 100); G.reputation = clamp(G.reputation + 5, 0, 999); G.worldFlags[ev.effects?.worldFlag || 'event'] = 0; aL('Aid distributed.', 'good') }
  else if (fnKey.endsWith('_partial')) { G.ryo -= 3000; G.morale = clamp(G.morale + 3, 0, 100); aL('Partial aid sent.', 'neutral') }
  else if (fnKey.endsWith('_none'))  { G.morale = clamp(G.morale - 8, 0, 100); G.reputation = clamp(G.reputation - 5, 0, 999); aL('No action taken.', 'bad') }
  else if (fnKey.endsWith('_cure'))  { G.ryo -= 10000; G.reputation = clamp(G.reputation + 8, 0, 999); G.morale = clamp(G.morale + 6, 0, 100); aL('Medics deployed. Plague contained.', 'good') }
  else if (fnKey.endsWith('_quar'))  { G.ryo -= 5000; G.morale = clamp(G.morale - 3, 0, 100); aL('District quarantined.', 'neutral') }
  else if (fnKey === 'sage_accept')  { const eli = G.shinobi.filter(s => s.ri >= 2); if (eli.length) { const s = pk(eli); if (!s.jutsu) s.jutsu = []; const rare = JUTSU_LIST.filter(j => j.tier === 'rare' && !s.jutsu.includes(j.id)); if (rare.length) { const j = pk(rare); s.jutsu.push(j.id); aL('The Wandering Sage taught ' + sn(s) + ' — ' + j.n + '!', 'good'); addChronicle('Sage Taught', sn(s) + ' received rare jutsu from a Wandering Sage.', 'legend') } } }
  else if (fnKey === 'sage_honor')   { G.reputation = clamp(G.reputation + 5, 0, 999); G.villages.forEach(v => v.rel = clamp(v.rel + 10, 0, 100)); aL('The Sage honored and seen off.', 'good') }
  else if (fnKey === 'eclipse_fest') { G.morale = clamp(G.morale + 5, 0, 100); G.ryo -= 2000; aL('Festival held during the eclipse.', 'good') }
  else if (fnKey === 'eclipse_def')  { G.tempDef = 20; aL('Defense mobilized during the eclipse.', 'neutral') }
  else if (fnKey === 'scroll_study') { const eli = G.shinobi.filter(s => s.ri >= 1); if (eli.length) { const s = pk(eli); if (!s.jutsu) s.jutsu = []; const avail = JUTSU_LIST.filter(j => !s.jutsu.includes(j.id) && (!j.clan || s.clan === j.clan)); if (avail.length) { const j = pk(avail); s.jutsu.push(j.id); aL(sn(s) + ' studied the forbidden scroll and learned ' + j.n + '!', 'good') } } }
  else if (fnKey === 'scroll_sell')  { G.ryo += 15000; aL('Forbidden scrolls sold for 15,000 ryo.', 'good') }
  else if (fnKey === 'scroll_destroy') { G.reputation = clamp(G.reputation + 5, 0, 999); aL('Forbidden scrolls destroyed. Reputation improved.', 'good') }
  upUI()
}

export function assignBlackMarket(missionId, shinobiId) {
  const bm = BM_MISSION_BY_ID[missionId]
  if (!bm) return
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!s) return
  if (s.status !== 'available') { ntf('Shinobi must be available.'); return }
  if ((s.ri || 0) < bm.reqRi) { ntf(`Requires ${['Genin','Chunin','Jonin','ANBU','S-Rank'][bm.reqRi]} or higher.`); return }
  if (bm.reqAnbu && s.ri < 3) { ntf('ANBU required for this contract.'); return }
  s.status = 'mission'
  s.missId = 'bm_' + missionId
  if (!G.aM) G.aM = []
  G.aM.push({ id: 'bm_' + Date.now(), missionId: 'bm_' + missionId, assignedTo: shinobiId, isBM: true, bmId: missionId, daysLeft: 1 })
  aL(`${sn(s)} assigned to black market: ${bm.n}.`, 'warn')
  upUI()
}

export function resolveBlackMarket(assignmentId) {
  const am = (G.aM || []).find(x => x.id === assignmentId)
  if (!am || !am.isBM) return
  const bm = BM_MISSION_BY_ID[am.bmId]
  const s = G.shinobi.find(x => x.id === am.assignedTo)
  if (!s || !bm) { G.aM = G.aM.filter(x => x.id !== assignmentId); return }

  const bmRep = G.blackMarketRep || 0
  const tier = getUnderworldTier(bmRep)
  const sc = clamp(0.60 + tier.bonus - bm.kiaBonus * 2, 0.20, 0.92)

  if (Math.random() < sc) {
    G.ryo += bm.ryo
    G.blackMarketRep = (G.blackMarketRep || 0) + 5
    s.status = 'available'; s.missId = null
    aL(`${sn(s)} completed "${bm.n}" — +${bm.ryo.toLocaleString()} ryo.`, 'good')
    if (bm.rewardJutsu) {
      if (!s.jutsu) s.jutsu = []
      const rare = JUTSU_LIST.filter(j => j.tier === 'rare' && !s.jutsu.includes(j.id))
      if (rare.length) { const j = pk(rare); s.jutsu.push(j.id); aL(`${sn(s)} seized the scroll — learned ${j.n}!`, 'good') }
    }
    if (bm.rewardIntel) {
      const v = pk(G.villages || [])
      if (v) aL(`Intel from ${v.n}: ${Math.round(v.strength || 50)} strength, ${v.rel > 60 ? 'Allied' : v.rel > 30 ? 'Neutral' : 'Hostile'} disposition.`, 'good')
    }
    pushMissionLog({ missionName: bm.n, rank: bm.rk, success: true, ryo: bm.ryo, rep: 0, narrative: 'Underground contract completed.' })
  } else {
    const kR = clamp(bm.kiaBonus, 0.01, 0.15)
    if (Math.random() < kR && !jkKIAImmune(s)) {
      aL(`${sn(s)} KIA on underground contract "${bm.n}".`, 'bad')
      G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: bm.n, year: G.year, month: G.month, wins: s.wins, lastWords: '"No witnesses."' })
      G.shinobi = G.shinobi.filter(x => x.id !== s.id)
    } else {
      s.status = 'available'; s.missId = null
      aL(`${sn(s)} failed "${bm.n}" and returned empty-handed.`, 'bad')
    }
    pushMissionLog({ missionName: bm.n, rank: bm.rk, success: false, ryo: 0, rep: 0 })
  }

  // Discovery check
  if (Math.random() < discoveryChance(bm, G.blackMarketRep || 0)) {
    G.reputation = clamp(G.reputation - bm.repLoss, 0, 999)
    if (!G.councilApproval) G.councilApproval = {}
    G.councilApproval.elder = clamp((G.councilApproval.elder || 50) - 8, 0, 100)
    // Log to black ledger so exposure has a persistent record
    if (!G.blackLedger) G.blackLedger = { balance: 0, history: [] }
    G.blackLedger.history.push({ year: G.year, month: G.month, type: 'discovery', desc: `${bm.n} contract exposed`, repLoss: bm.repLoss })
    aL(`The "${bm.n}" contract was discovered! −${bm.repLoss} reputation.`, 'bad')
  }

  G.aM = G.aM.filter(x => x.id !== assignmentId)
  upUI()
}

export function establishSafehouse(locationId) {
  const loc = SH_LOCATION_BY_ID[locationId]
  if (!loc) return
  if ((G.ryo || 0) < SAFEHOUSE_COST) { ntf(`Need ${SAFEHOUSE_COST.toLocaleString()} ryo to establish a safehouse.`); return }
  if (!G.safehouses) G.safehouses = []
  if (G.safehouses.filter(s => s.status === 'active').length >= MAX_SAFEHOUSES) { ntf('Maximum 3 safehouses active.'); return }
  if (G.safehouses.find(s => s.locationId === locationId && s.status === 'active')) { ntf('Safehouse already active there.'); return }
  G.ryo -= SAFEHOUSE_COST
  G.safehouses.push({ id: 'sh_' + locationId + '_' + Date.now(), locationId, status: 'active', established: G.year * 12 + G.month })
  aL(`${loc.icon} ${loc.name} safehouse established.`, 'good')
  upUI()
}

export function assignDeepCoverOp(opId, shinobiId, safehouseId) {
  const op = DC_OP_BY_ID[opId]
  if (!op) return
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!s || s.status !== 'available') { ntf('Shinobi not available.'); return }
  if ((s.ri || 0) < op.reqRi) { ntf(`Requires ${['Genin','Chunin','Jonin','ANBU','S-Rank'][op.reqRi]} or higher.`); return }
  const sh = (G.safehouses || []).find(x => x.id === safehouseId && x.status === 'active')
  if (!sh) { ntf('Invalid safehouse.'); return }
  s.status = 'mission'; s.missId = opId
  if (!G.aM) G.aM = []
  G.aM.push({ id: 'dc_' + Date.now(), missionId: opId, assignedTo: shinobiId, isDeepCover: true, opId, safehouseId, daysLeft: op.daysActive })
  aL(`${sn(s)} deployed on ${op.n} from ${SH_LOCATION_BY_ID[sh.locationId]?.name || 'safehouse'}.`, 'warn')
  upUI()
}

export function resolveDeepCoverOp(assignmentId) {
  const am = (G.aM || []).find(x => x.id === assignmentId)
  if (!am || !am.isDeepCover) return
  const op = DC_OP_BY_ID[am.opId]
  const s = G.shinobi.find(x => x.id === am.assignedTo)
  const sh = (G.safehouses || []).find(x => x.id === am.safehouseId)
  const shBonus = sh ? (SH_LOCATION_BY_ID[sh.locationId]?.opSuccessBonus || 0) : 0

  if (!op || !s) { G.aM = G.aM.filter(x => x.id !== assignmentId); return }

  const sc = clamp(0.60 + (s.ri || 0) * 0.05 + shBonus, 0.20, 0.95)
  s.status = 'available'; s.missId = null

  if (Math.random() < sc) {
    G.ryo = (G.ryo || 0) + op.ryo
    G.reputation = clamp((G.reputation || 0) + op.rep, 0, 999)
    if (op.id === 'dc_infiltrate') {
      const v = pk(G.villages || [])
      if (v) aL(`Deep cover intel from ${v.n}: strength ${Math.round(v.strength || 50)}.`, 'good')
    }
    if (op.id === 'dc_recruit') {
      aL(`Double agent turned — rival intel network weakened.`, 'good')
    }
    aL(`${sn(s)} completed "${op.n}" — +${op.ryo.toLocaleString()} ryo.`, 'good')
  } else {
    aL(`${sn(s)} failed "${op.n}" and returned.`, 'bad')
  }

  G.aM = G.aM.filter(x => x.id !== assignmentId)
  upUI()
}

export function resolveWorldEventChoice(choiceId) {
  const ae = G.worldCalendar?.activeEvent
  if (!ae) { ntf('No active world event.'); return }
  const ev = WE_BY_ID[ae.eventId]
  if (!ev) return
  const outcome = resolveWorldEvent(ae.eventId, choiceId)
  G.ryo = clamp((G.ryo || 0) + outcome.ryo, 0, Infinity)
  G.reputation = clamp((G.reputation || 0) + outcome.rep, 0, 999)
  G.morale = clamp((G.morale || 50) + outcome.morale, 0, 100)
  const resultMsg = outcome.success
    ? `${ev.icon} "${ev.name}" — success! ${outcome.ryo > 0 ? '+' + outcome.ryo.toLocaleString() + ' ryo' : ''} ${outcome.rep !== 0 ? (outcome.rep > 0 ? '+' : '') + outcome.rep + ' rep' : ''}.`
    : `${ev.icon} "${ev.name}" — setback. The risk played out badly.`
  aL(resultMsg, outcome.success ? 'good' : 'bad')
  if (!G.worldCalendar.history) G.worldCalendar.history = []
  G.worldCalendar.history.push({ ...ae, choiceId, outcome, resolvedYear: G.year, resolvedMonth: G.month })
  if (G.worldCalendar.history.length > 24) G.worldCalendar.history.splice(0, G.worldCalendar.history.length - 24)
  delete G.worldCalendar.activeEvent
  upUI()
}

export function resolveClanChain(assignmentId) {
  const am = (G.aM || []).find(x => x.id === assignmentId)
  if (!am || !am.isClanChain) return
  const chain = CLAN_CHAINS[am.chainId]
  const clan = CLANS.find(c => c.id === am.clanId)
  const members = [].concat(am.assignedTo).map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
  if (!chain) { G.aM = G.aM.filter(x => x.id !== assignmentId); return }

  const rankBonus = members.reduce((sum, s) => sum + (s.ri || 0) * 0.04, 0)
  const _clP = getClanPassives(G)
  const sc = clamp(0.65 + rankBonus + _clP.successMod, 0.25, 0.95)

  members.forEach(s => { s.status = 'available'; s.missId = null })

  if (Math.random() < sc) {
    G.ryo = (G.ryo || 0) + chain.ryo
    G.reputation = clamp((G.reputation || 0) + chain.rep, 0, 999)
    if (!G.clanApproval) G.clanApproval = {}
    G.clanApproval[am.clanId] = clamp((G.clanApproval[am.clanId] ?? 80) + 3, 0, 100)
    if (chain.id === 'tsuchida_feast') G.morale = clamp((G.morale || 50) + 10, 0, 100)
    if (chain.id === 'formation_drill') members.forEach(s => { s.monthsActive = (s.monthsActive || 0) + 2 })
    aL(`${clan?.icon || ''} "${chain.n}" succeeded — +${chain.ryo.toLocaleString()} ryo, +${chain.rep} rep.`, 'good')
  } else {
    aL(`${clan?.icon || ''} "${chain.n}" failed. No reward.`, 'bad')
  }

  G.aM = G.aM.filter(x => x.id !== assignmentId)
  upUI()
}

export function resolveCouncilProposal(choice) {
  const prop = G.councilProposal
  if (!prop) return
  G.councilProposal = null
  const faction = COUNCIL_FACTIONS.find(f => f.id === prop.faction)
  const approvalDelta = choice === 'yes' ? 8 : -5
  if (!G.councilApproval) G.councilApproval = {}
  G.councilApproval[prop.faction] = clamp((G.councilApproval[prop.faction] || 50) + approvalDelta, 0, 100)
  if (choice === 'yes') {
    if (prop.id === 'war_footing')    { G._warFooting = true; aL('War Footing declared — missions doubled, KIA risk up.', 'warn') }
    else if (prop.id === 'trade_treaty')  { if (G.ryo >= 8000) { G.ryo -= 8000; if (!G.districts) G.districts = []; G.districts.push({ id: '_trade_route', status: 'built', effect: { monthlyRyo: 1500 } }); aL('Trade route opened — +1,500 ryo/month.', 'good') } else { aL('Not enough ryo for treaty.', 'bad'); G.councilApproval[prop.faction] = clamp(G.councilApproval[prop.faction] - 5, 0, 100) } }
    else if (prop.id === 'exam_funding')  { if (G.ryo >= 5000) { G.ryo -= 5000; G._examFundingBonus = true; aL('Exam funding approved — graduation rates up this cycle.', 'good') } else { aL('Not enough ryo.', 'bad') } }
    else if (prop.id === 'curfew')        { G.morale = clamp(G.morale - 5, 0, 100); G.reputation = clamp(G.reputation + 8, 0, 999); aL('Curfew imposed — morale down, reputation up.', 'neutral') }
    else if (prop.id === 'arms_stockpile'){ if (G.ryo >= 12000) { G.ryo -= 12000; G.tempDef = (G.tempDef || 0) + 10; aL('Arms stockpile complete — +10 defense.', 'good') } else { aL('Not enough ryo.', 'bad') } }
    else if (prop.id === 'market_day')    { G.ryo += 3000; G.morale = clamp(G.morale + 5, 0, 100); aL('Grand Market Day held — +3,000 ryo, +5 morale.', 'good') }
    aL(`${faction?.n || ''} proposal approved.`, 'good')
  } else {
    aL(`${faction?.n || ''} proposal declined. Approval −5.`, 'neutral')
  }
  upUI()
}

// Compute staff-derived modifiers (called from adv and panels)
export function staffBonus() {
  const staff = G.staff || []
  const strategists = staff.filter(s => s.role === 'strategist').length
  const teamSenseis = staff.filter(s => s.role === 'team_sensei').length
  const anbuCmdr = staff.find(s => s.role === 'anbu_cmdr')
  const treasurer = staff.find(s => s.role === 'treasurer')
  const council = staff.find(s => s.role === 'council')
  const headSensei = staff.find(s => s.role === 'head_sensei')
  const headScout = staff.find(s => s.role === 'head_scout')
  const scoutJonins = staff.filter(s => s.role === 'scout_jonin').length
  return {
    missionSuccessBonus: strategists > 0 ? 0.05 : 0,
    squadMissionBonus: teamSenseis * 0.02,
    anbuMissionBonus: anbuCmdr ? 0.10 : 0,
    tradeIncomeMultiplier: treasurer ? 1 + (Math.floor(treasurer.rating / 5) * 0.03) : 1,
    repGainMultiplier: council ? 1.10 : 1,
    prospectGrowthBonus: headSensei ? Math.floor(headSensei.rating / 5) : 0,
    scoutCostReduction: Math.min(0.60, scoutJonins * 0.15 + (headScout ? 0.20 : 0)),
  }
}

// ── Bloodline active layer (v2, behind G._ff_bloodlineActive — returns 0 when flag off) ──
function _bloodlineBonus(memberIds) {
  if (!G._ff_bloodlineActive) return 0
  const active = (G.beasts || []).filter(b =>
    b.sealed && b.jk && memberIds.includes(b.jk) && (b.activeUntil || 0) > G.month)
  const anyDebuffed = (G.shinobi || []).some(s =>
    memberIds.includes(s.id) && (s._blDebuffUntil || 0) > G.month)
  if (!active.length && !anyDebuffed) return 0
  return netBloodlineMod(active.map(() => ({ multiplier: BLOODLINE_MULTIPLIER })), anyDebuffed)
}

// #8 Tactical formation (flag-gated; 0 when off or no formation set)
function _formationMod(sq) {
  if (!G._ff_tacticalFormation || !sq.formation) return 0
  return formationMods(sq.formation).successMod
}
function _formationRisk(sq) {
  if (!G._ff_tacticalFormation || !sq.formation) return 0
  return formationMods(sq.formation).riskMod
}

// Nation identity success modifier (flag-gated; 0 when off or neutral nation)
function _nationSuccessMod() {
  if (!G._ff_nationHud) return 0
  return nationMods(G.nationId).successMod
}

function _philosophySuccessMod() { return getPhilosophyMods(G).missionSuccess }
function _philosophyKIAMod()     { return getPhilosophyMods(G).kiaRisk }

export function activateBloodline(beastName) {
  if (!G._ff_bloodlineActive) return
  const b = (G.beasts || []).find(x => x.n === beastName && x.sealed && x.jk)
  if (!b) return
  const s = G.shinobi.find(x => x.id === b.jk)
  const sqId = s && (G.squads || []).find(q => q.members?.includes(s.id))?.id
  const squadActivations = sqId
    ? (G.beasts || []).filter(x => x.activeUntil > G.month && (G.squads.find(q => q.id === sqId)?.members || []).includes(x.jk)).length
    : 0
  const v = canActivate({ stage: getSyncStage(b), ryo: G.ryo, cooldownUntil: b.cooldownUntil, month: G.month, squadActivations })
  if (!v.ok) { aL(`Cannot channel ${beastName}: ${v.reason.replace('_', ' ')}.`, 'bad'); return }
  G.ryo -= ACTIVATION_COST
  b.activeUntil = G.month + ACTIVE_DURATION
  b.cooldownUntil = G.month + COOLDOWN
  if (s) s._aggro = (s._aggro || 0) + AGGRO_INCREASE
  aL(`${sn(s)} channels ${beastName} — squad empowered this month (−${fmt(ACTIVATION_COST)} ryo).`, 'good')
  upUI()
}

export function adv() {
  const tgM = G.upgrades.training === 1 ? 2 : G.upgrades.training === 2 ? 3 : 1
  const iB = G.upgrades.intel === 1 ? 0.05 : G.upgrades.intel === 2 ? 0.10 : 0
  const hL = G.upgrades.hospital
  const sb = staffBonus()
  const season = currentSeason()
  const dp = getDistrictPassives(G)
  const cp = getCouncilPerks(G)
  const clP = getClanPassives(G)
  const shP = getSafehousePassives(G)
  const monthDef = MONTHS[G.month - 1]

  // ── Seasonal passive effects ────────────────────────────────────────────
  if (monthDef?.effects?.morale) G.morale = clamp(G.morale + monthDef.effects.morale, 0, 100)
  if (monthDef?.effects?.ryo) G.ryo = Math.max(0, G.ryo + monthDef.effects.ryo)

  // ── District build progress & passive income ────────────────────────────
  if (!G.districts) G.districts = []
  G.districts.forEach(d => {
    if (d.status === 'building') {
      d.buildMonthsLeft = (d.buildMonthsLeft || 1) - 1
      if (d.buildMonthsLeft <= 0) {
        d.status = 'built'
        const def = DISTRICTS.find(x => x.id === d.id)
        aL(`${def?.n || d.id} construction complete — passives now active.`, 'good')
        ntf(`${def?.icon || '🏗'} ${def?.n || d.id} built!`)
      }
    }
  })
  if (dp.monthlyRyo > 0) G.ryo += dp.monthlyRyo

  // ── Persistent world flag tick-down ─────────────────────────────────────
  Object.keys(G.worldFlags || {}).forEach(k => {
    G.worldFlags[k]--
    if (G.worldFlags[k] <= 0) { delete G.worldFlags[k]; aL('The ' + k + ' has ended.', 'neutral') }
    else {
      if (k === 'drought') { G.ryo -= 1000; G.morale = clamp(G.morale - 1, 0, 100) }
      if (k === 'plague')  { G.morale = clamp(G.morale - 2, 0, 100); G.reputation = clamp(G.reputation - 1, 0, 999) }
    }
  })

  // ── Council approval passives & monthly proposal ────────────────────────
  if (!G.councilApproval) G.councilApproval = {}
  COUNCIL_FACTIONS.forEach(f => { if (G.councilApproval[f.id] === undefined) G.councilApproval[f.id] = 50 })
  // Apply perks
  if (cp.monthlyRyo > 0) G.ryo += cp.monthlyRyo
  if (cp.monthlyRep > 0) G.reputation = clamp(G.reputation + cp.monthlyRep, 0, 999)
  // Passive rep floor — prevents permanent zero in idle villages
  if ((G.reputation || 0) < 10) G.reputation = Math.min(10, (G.reputation || 0) + 1)
  // Underworld passive income (Phantom tier)
  const uwTier = getUnderworldTier(G.blackMarketRep || 0)
  if (uwTier.passiveRyo) G.ryo += uwTier.passiveRyo
  // Tick BM assignments
  for (const am of (G.aM || []).filter(x => x.isBM)) {
    am.daysLeft = (am.daysLeft || 1) - 1
    if (am.daysLeft <= 0) resolveBlackMarket(am.id)
  }
  // Tick clan chain assignments
  for (const am of (G.aM || []).filter(x => x.isClanChain)) {
    am.daysLeft = (am.daysLeft || 1) - 1
    if (am.daysLeft <= 0) resolveClanChain(am.id)
  }
  // Tick deep cover ops
  for (const am of (G.aM || []).filter(x => x.isDeepCover)) {
    am.daysLeft = (am.daysLeft || 1) - 1
    if (am.daysLeft <= 0) resolveDeepCoverOp(am.id)
  }
  // Passive prospect leads from safehouse network
  const lead = rollProspectLead(G)
  if (lead) {
    const exists = (G.prospects || []).some(p => p.fromSafehouse && p.fn === lead.name)
    if (!exists) {
      const p = mS(lead.ri)
      p.fn = lead.name
      p.fromSafehouse = true
      p.fromRegion = lead.source
      p.urgencyMonths = rnd(3, 6)
      G.prospects.push(p)
      aL(`🏠 Safehouse network surfaced a prospect: ${lead.name} (via ${lead.source}).`, 'good')
    }
  }
  // ── World Events Calendar ────────────────────────────────────────────────
  if (!G.worldCalendar) G.worldCalendar = {}
  // Advance notice — 1 month before the event fires
  const upcoming = getUpcomingEvent(G.month)
  if (upcoming && !G.worldCalendar[`noticed_${G.year}_${upcoming.id}`]) {
    G.worldCalendar[`noticed_${G.year}_${upcoming.id}`] = true
    G.worldCalendar.pendingEvent = { eventId: upcoming.id, dueYear: G.year, dueMonth: upcoming.month }
    aL(`${upcoming.icon} Advance notice: "${upcoming.name}" arrives next month — prepare your response.`, 'warn')
  }
  // Fire the event if it's this month and player hasn't resolved it yet
  const thisEvent = getEventForMonth(G.month)
  if (thisEvent) {
    const key = `fired_${G.year}_${thisEvent.id}`
    if (!G.worldCalendar[key]) {
      G.worldCalendar[key] = true
      if (!G.worldCalendar.activeEvent || G.worldCalendar.activeEvent.eventId !== thisEvent.id) {
        G.worldCalendar.activeEvent = { eventId: thisEvent.id, year: G.year, month: G.month }
        aL(`${thisEvent.icon} World Event: "${thisEvent.name}" — resolve it in the Calendar tab.`, 'warn')
      }
    }
  }

  // Approval drift from game state
  const approvalDrift = (faction, delta) => {
    G.councilApproval[faction] = clamp((G.councilApproval[faction] || 50) + delta, 0, 100)
  }
  if (G.reputation >= 70) { approvalDrift('elder', 1); approvalDrift('merchant', 1) }
  if (G.morale < 40) { approvalDrift('elder', -1); approvalDrift('academy', -1) }
  if (G.ryo < 5000) { approvalDrift('merchant', -2) }
  // Spawn monthly proposal (1-in-3 chance, only 1 pending at a time)
  if (!G.councilProposal && Math.random() < 0.33) {
    const available = COUNCIL_PROPOSALS.filter(p => p.id !== G._lastCouncilProposal)
    if (available.length) {
      const prop = available[Math.floor(Math.random() * available.length)]
      G.councilProposal = { ...prop }
      G._lastCouncilProposal = prop.id
      const f = COUNCIL_FACTIONS.find(x => x.id === prop.faction)
      aL(`${f?.icon || ''} ${f?.n || ''} proposes: "${prop.n}" — see Inbox to respond.`, 'warn')
    }
  }
  // Low-approval crisis at < 20
  COUNCIL_FACTIONS.forEach(f => {
    const ap = G.councilApproval[f.id] ?? 50
    if (ap < 20 && !G[`_crisisNotice_${f.id}`]) {
      G[`_crisisNotice_${f.id}`] = true
      aL(`Crisis: ${f.n} approval critically low (${ap}). Perks suspended.`, 'bad')
    } else if (ap >= 25) {
      G[`_crisisNotice_${f.id}`] = false
    }
  })

  // ── Clan approval drift & chain notifications ───────────────────────────
  if (!G.clanApproval) G.clanApproval = {}
  for (const clan of CLANS) {
    if (G.clanApproval[clan.id] === undefined) G.clanApproval[clan.id] = 80
    // Approval drifts toward 60 naturally (±1/mo)
    const cur = G.clanApproval[clan.id]
    G.clanApproval[clan.id] = clamp(cur + (cur < 60 ? 1 : cur > 60 ? -1 : 0), 0, 100)
    // Notify of available clan chains (once per 6 months)
    if (!G._clanChainNotice) G._clanChainNotice = {}
    const chains = availableClanChains(clan.id, G)
    const runnable = chains.filter(c => c.canRun)
    if (runnable.length && G.month % 6 === 0) {
      if (!G._clanChainNotice[clan.id] || G._clanChainNotice[clan.id] < G.year * 12 + G.month - 5) {
        G._clanChainNotice[clan.id] = G.year * 12 + G.month
        aL(`${clan.icon} ${clan.name} clan has ${runnable.length} mission chain(s) available.`, 'warn')
      }
    }
  }

  // ── Shinobi monthly tick ─────────────────────────────────────────────────
  G.shinobi.forEach(s => {
    // Ensure new fields on existing shinobi
    if (!s.jutsu) s.jutsu = []
    if (!s.bonds) s.bonds = []
    if (s.winsB === undefined) s.winsB = 0
    if (s.winsS === undefined) s.winsS = 0
    if (s.streak === undefined) s.streak = 0

    // Memory decay + emotional state tick (monthly)
    decayMemories(s, 1)
    tickEmotionalState(s)
    // Assign role tag on first mission (lazy)
    if (!s.roleTag && s.wins > 0) assignRoleTag(s)
    // Memory-driven morale nudge (small, monthly)
    const _memMod = memoryMoraleMod(s)
    if (_memMod !== 0) s.indMorale = clamp((s.indMorale || 70) + _memMod, 0, 100)

    s.months++
    if (s.months % 12 === 0) {
      s.age++
      applyAgeDecline(s)
      // Retirement at 55+ (probability rises)
      if (s.age >= 70) {
        // Hard retirement ceiling — no shinobi active past 70
        const retLine = sn(s) + ' has reached the age limit and retired at ' + s.age + '.'
        aL(retLine, 'neutral')
        addChronicle('Mandatory Retirement — ' + sn(s), retLine, 'shinobi')
        s.status = 'retired'
        return
      }
      if (s.age >= 55) {
        const retChance = s.age >= 65 ? 0.55 : s.age >= 60 ? 0.30 : 0.10
        if (Math.random() < retChance) {
          const isVet = s.wins >= 30
          const retLine = isVet
            ? sn(s) + ' retires after ' + s.wins + ' missions. A legend steps out of the field.'
            : sn(s) + ' has retired at age ' + s.age + '.'
          aL(retLine, 'neutral')
          if (isVet) {
            const squadCount = (G.squads || []).filter(q => q.members.includes(s.id) || (q.alumni || []).includes(s.id)).length
            const retNarrative = [
              sn(s) + ' retired after ' + s.wins + ' missions' + (squadCount > 0 ? ', ' + squadCount + ' squad campaign' + (squadCount !== 1 ? 's' : '') : '') + '.',
              s.darkMoment ? 'They carried: "' + s.darkMoment + '".' : null,
              (s.bonds || []).length > 0 ? (s.bonds.length) + ' bond' + (s.bonds.length !== 1 ? 's' : '') + ' formed.' : null,
              s.winsS > 0 ? 'Completed ' + s.winsS + ' S-rank mission' + (s.winsS !== 1 ? 's' : '') + '.' : null,
              'The village will not forget them.',
            ].filter(Boolean).join(' ')
            addChronicle('Retirement — ' + sn(s), retLine, 'legend', retNarrative)
          }
          s.status = 'retired'
          return
        }
      }
    }

    // Ensure new fields on existing shinobi
    if (s.workload === undefined) s.workload = 0
    if (s.consecutiveMissions === undefined) s.consecutiveMissions = 0
    if (s.traumaStatus === undefined) s.traumaStatus = null
    if (s.traumaCount === undefined) s.traumaCount = 0
    if (s.returningForm === undefined) s.returningForm = 100
    if (s.injuryType === undefined) s.injuryType = null

    if (s.status === 'injured') {
      s.injDays = Math.max(0, s.injDays - 1)
      if (s.injDays === 0) {
        s.status = 'available'
        s.injuryType = null
        aL(sn(s) + ' recovered from injury.', 'good')
      }
    }
    if (s.status === 'available') {
      // Workload recovery
      s.workload = Math.max(0, s.workload - 10)
      s.consecutiveMissions = 0  // reset on rest month

      // Trauma tick-down
      if (s.traumaStatus && s.traumaMonths !== undefined) {
        s.traumaMonths = Math.max(0, s.traumaMonths - 1)
        if (s.traumaMonths === 0) {
          aL(sn(s) + ' has found peace — their ' + s.traumaStatus + ' trauma has faded.', 'good')
          s.traumaStatus = null
          // Personality evolution: surviving trauma leaves a permanent mark
          const evolvedTrait = Math.random() < 0.5 ? 'Resilient' : 'Haunted'
          if (addTrait(s, evolvedTrait)) {
            aL(sn(s) + ' emerged from the experience ' + evolvedTrait.toLowerCase() + '.', evolvedTrait === 'Resilient' ? 'good' : 'warn')
            addNotice(sn(s) + ' has returned to duty, changed by what they endured.', 'neutral')
          }
        } else if (s.traumaCount >= 2 && Math.random() < 0.12) {
          // Defection risk after 2 traumas
          aL('⚠ ' + sn(s) + ' has abandoned the village — trauma and loss drove them to defect.', 'bad')
          addChronicle('Defection', sn(s) + ' defected after suffering ' + s.traumaCount + ' psychological traumas.', 'shinobi')
          s.status = 'retired'
          return
        }
      }

      // Returning form — builds back over 2–3 missions
      if ((s.returningForm || 100) < 100) {
        s.returningForm = Math.min(100, s.returningForm + 20)
      }

      // Stat growth
      const mentorBoost = 1 + mentorGrowthBonus(s, G.shinobi) + (cp.growthBonus || 0) + (dp.statGrowthBonus || 0)
      if (Math.random() < 0.25 * tgM * mentorBoost) {
        const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
        const kG = k === 'intelligence' && s.pers.n === 'Bookworm' ? 2 : 1
        if (sPow(s) < s.potential) s.stats[k] = clamp(s.stats[k] + rnd(1, kG * 2), 0, 99)
      }
      if (s.pers.n === 'Ambitious' && Math.random() < 0.15) {
        const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
        s.stats[k] = clamp(s.stats[k] + 1, 0, 99)
      }

      // ── Training focus boost (Phase 4) ────────────────────────────────
      if (s.trainingFocus && s.trainingFocus in s.stats) {
        if (sPow(s) < s.potential) {
          const gain = rnd(1, 3)
          s.stats[s.trainingFocus] = clamp(s.stats[s.trainingFocus] + gain, 0, 99)
        }
        s.workload = clamp((s.workload || 0) + 12, 0, 100)
      }

      // ── Rest month (Phase 4) ────────────────────────────────────────────
      if (s.restMonth) {
        s.workload = Math.max(0, (s.workload || 0) - 30)  // extra recovery
        s.restMonth = false  // auto-clear after one month
      }
    }
    const pw = sPow(s), thresh = [0, 30, 55, 78, 90]
    if (s.ri < 4 && pw >= thresh[s.ri + 1] && s.months >= (s.ri + 1) * 12 && s.status === 'available') {
      s.ri++; s.salary = 500 + s.ri * 400
      const newRankName = RANKS[s.ri]
      aL(sn(s) + ' promoted to ' + newRankName + '! ' + pickRankUpNarrative(sn(s), newRankName), 'good')
      pushNarrative(genRankUpBlurb(sn(s), s.ri))
      addLegend(s.ri * 3)
    }
  })
  G.shinobi = G.shinobi.filter(s => s.status !== 'retired')

  // ── Squad injury crisis check ──────────────────────────────────────────────
  const injuredCount = G.shinobi.filter(s => s.status === 'injured').length
  if (injuredCount >= 4 && !G.emergencyRecruitWindow) {
    G.emergencyRecruitWindow = true
    const closeMonth = G.month + 2 > 12 ? G.month - 10 : G.month + 2
    const closeYear = G.month + 2 > 12 ? G.year + 1 : G.year
    G.emergencyWindowEnd = { year: closeYear, month: closeMonth }
    G.morale = clamp(G.morale - 10, 0, 100)
    // Emergency pool: 3 extra free-agent prospects for 2 months
    for (let i = 0; i < 3; i++) G.prospects.push(mS(rnd(0, 1)))
    aL('⚠ INJURY CRISIS — ' + injuredCount + ' shinobi sidelined simultaneously. Emergency recruitment window open for 2 months. Daimyo has been notified. Morale −10.', 'bad')
    addChronicle('Injury Crisis', injuredCount + ' shinobi injured at the same time. Emergency recruitment authorised by the Daimyo.', 'event')
    addNotice('CRISIS: ' + injuredCount + ' shinobi are injured. Emergency recruitment window is open.', 'bad')
    ntf('Injury Crisis! Emergency window open — check Academy.')
  }
  // Close emergency window when time expires or injuries drop
  if (G.emergencyRecruitWindow && G.emergencyWindowEnd) {
    const expired = G.year > G.emergencyWindowEnd.year || (G.year === G.emergencyWindowEnd.year && G.month >= G.emergencyWindowEnd.month)
    if (expired || injuredCount < 2) {
      G.emergencyRecruitWindow = false
      G.emergencyWindowEnd = null
      aL('Emergency recruitment window has closed.', 'neutral')
    }
  }

  // ── Squad monthly tick (monthsActive, anniversary) ───────────────────────
  G.squads.forEach(sq => {
    sq.monthsActive = (sq.monthsActive || 0) + 1
    if (sq.monthsActive > 0 && sq.monthsActive % 12 === 0) {
      const years = sq.monthsActive / 12
      aL(sq.n + ' marks ' + years + ' year' + (years > 1 ? 's' : '') + ' as a unit.', 'ev')
      addChronicle('Squad Anniversary', sq.n + ' has been together for ' + years + ' year' + (years > 1 ? 's' : '') + '. Cohesion: ' + (sq.cohesion || 0) + '.', 'squad')
    }
  })

  // ── Prospect aging ──────────────────────────────────────────────────────
  G.prospects = G.prospects.filter(p => {
    if ((p.monthsWaiting || 0) >= 24) {
      aL(sn(p) + ' lost patience and left the academy.', 'neutral')
      // 10% chance dropout becomes a missing-nin event
      if (Math.random() < 0.10) {
        aL('⚠ ' + sn(p) + ' turned rogue. Rumoured to appear on the black market...', 'warn')
        addChronicle('Dropout Gone Rogue', sn(p) + ' departed the academy and turned missing-nin.', 'shinobi')
      }
      return false
    }
    if (p.stats && (p.monthsWaiting || 0) >= 4 && Math.random() < 0.25) {
      const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
      p.stats[k] = Math.max(5, p.stats[k] - 1)
    }
    // Sensei boost — if this prospect has a mentor assigned
    if (p.mentor) {
      const sensei = G.shinobi.find(s => s.id === p.mentor)
      if (sensei && sensei.status === 'available') {
        if (p.stats && Math.random() < 0.40) {
          const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
          p.stats[k] = clamp(p.stats[k] + 1, 0, 99)
        }
      } else if (!sensei) {
        p.mentor = null // sensei left
      }
    }
    return true
  })

  // ── Auto-sign floor — world stays alive without player recruitment ────────
  {
    const activeRoster = G.shinobi.filter(s => s.status !== 'retired').length
    if (activeRoster < 6 && G.prospects.length > 0) {
      const best = G.prospects.reduce((a, b) => (b.potential || 0) > (a.potential || 0) ? b : a)
      best.status = 'available'
      if (best.academyOrigin) { best.homegrown = true; best.salary = Math.round(best.salary * 0.85) }
      G.shinobi.push(best)
      G.prospects = G.prospects.filter(x => x.id !== best.id)
      aL(sn(best) + ' signed on — the village needed them.', 'good')
      addChronicle('Roster Crisis Signing', sn(best) + ' joined amid a roster shortage.', 'shinobi')
    }
  }

  // ── Mission resolution ──────────────────────────────────────────────────
  const beastPassives = getBeastPassives(G)
  G._beastMissionLuck = beastPassives.missionLuck
  G.aM.forEach(am => am.daysLeft--)
  // Monthly mission form — accrued from real outcomes, fed into the league matchday.
  G._formThisMonth = { wins: 0, losses: 0, marginSum: 0 }
  G.aM.filter(am => am.daysLeft <= 0).forEach(am => {
    if (am.isScout) {
      const scout = G.shinobi.find(x => x.id === am.assignedTo)
      if (scout) { scout.status = 'available'; scout.missId = null }
      const prospect = G.prospects.find(x => x.id === am.scoutTargetId)
      if (prospect) {
        const waited = prospect.monthsWaiting || 0
        const degraded = waited >= 6
        if (degraded) {
          const decay = Math.min(20, (waited - 5) * 4)
          prospect.potential = Math.max(45, prospect.potential - decay)
        }
        prospect.scouted = true
        aL('Intel on ' + sn(prospect) + ' confirmed — Potential: ' + prospect.potential + (degraded ? ' ⚠ degraded.' : '.'), degraded ? 'warn' : 'good')
        ntf(prospect.fn + '\'s potential revealed' + (degraded ? ' (degraded!)' : '') + '!')
      } else {
        aL('Scouting complete — prospect has already moved on.', 'neutral')
      }
      return
    }
    if (am.isBeastCapture) {
      const b = G.beasts.find(x => x.n === am.beastName), s = G.shinobi.find(x => x.id === am.assignedTo)
      if (!b || !s) return
      const ok = Math.random() < captureChance(sPow(s), b.pow)
      s.status = 'available'; s.missId = null
      if (ok) {
        b.sealed = true
        aL(b.n + ' captured! Assign a Jinchuriki.', 'good'); ntf(b.n + ' sealed!')
        addChronicle('Beast Captured', b.n + ' was sealed by our forces.', 'legend')
        addLegend(20)
      } else {
        aL(sn(s) + ' failed to capture ' + b.n + '.', 'bad')
        if (Math.random() < 0.3) { s.injDays = rnd(1, 3); s.status = 'injured' }
      }
      return
    }

    const m = G.avM.find(x => x.id === am.missionId); if (!m) return

    if (am.isSquad) {
      const sq = G.squads.find(q => q.id === am.squadId); if (!sq) return
      if (!sq.wins) sq.wins = 0
      if (!sq.losses) sq.losses = 0
      if (!sq.kills) sq.kills = 0
      if (!sq.fallen) sq.fallen = []
      const syn = sqSynergy(sq, G.shinobi)
      const rawPw = sqP(sq) + (G.shinobi.find(s => s.id === sq.leaderId)?.pers.n === 'Charismatic' ? 5 : 0)
      // Bond bonus
      const bondBonus = _squadBondBonus(sq)
      const pw = Math.round(rawPw * syn.powerMult)
      const anbuBon = (m.rk === 'S' || m.rk === 'A') ? sb.anbuMissionBonus : 0
      const rB2 = roleBonus(sq)
      // Pair chemistry bonus: +0.02 per proven pair (5+ missions together), max +0.06
      const chemBonus = Math.min(0.06, (() => {
        if (!G.pairChemistryLog) return 0
        let b = 0
        const mIds = sq.members
        for (let a = 0; a < mIds.length; a++)
          for (let c = a + 1; c < mIds.length; c++) {
            const key = [mIds[a], mIds[c]].sort().join('_')
            if ((G.pairChemistryLog[key] || 0) >= 5) b += 0.02
          }
        return b
      })())
      // Tactical prep modifier (Phase 4)
      // #8 merge: when this squad has a formation set, it OVERRIDES global prep-mode (no double-count)
      const _fOverride = G._ff_tacticalFormation && !!sq.formation
      const prepMod = _fOverride ? 0 : (G.missionPrepMode === 'aggressive' ? 0.08 : G.missionPrepMode === 'cautious' ? -0.06 : 0)
      const prepRiskMod = _fOverride ? 0 : (G.missionPrepMode === 'aggressive' ? 0.04 : G.missionPrepMode === 'cautious' ? -0.03 : 0)
      const sqJutsuMod = sq.members.reduce((acc, id) => {
        const ms = G.shinobi.find(x => x.id === id); if (!ms) return acc
        const jb = jutsuLoadoutBonus(ms, JUTSU_LIST)
        return acc + jb.successMod * 0.5 + jb.powerMod * 0.25
      }, 0)
      const sqBondMod = sq.members.reduce((acc, id) => {
        const ms = G.shinobi.find(x => x.id === id); if (!ms) return acc
        return acc + bondMissionBonus(ms, G.shinobi).successMod * 0.5
      }, 0)
      const sqDeclineMod = sq.members.reduce((acc, id) => {
        const ms = G.shinobi.find(x => x.id === id); if (!ms) return acc
        ensureCareerFields(ms)
        return acc + (ms.declineMod || 0) * 0.5  // half-weight per member so one declining vet doesn't cripple a squad
      }, 0)
      const sc = clamp(1 - m.risk - prepRiskMod + (pw - m.mp) * 0.005 + iB + syn.successMod + bondBonus + sb.missionSuccessBonus + sb.squadMissionBonus + anbuBon + rB2.missionBonus - rB2.riskReduction + chemBonus + prepMod + sqJutsuMod + dp.missionRiskReduction + cp.successMod + sqBondMod + clP.successMod + shP.opSuccessBonus + sqDeclineMod + _bloodlineBonus(sq.members) + _formationMod(sq) + _nationSuccessMod() + _philosophySuccessMod(), 0.1, successCeiling(m.rk))

      const _mev = resolveMission(sc)
      const _mq = qualityEffects(_mev.quality)
      G._formThisMonth.marginSum += _mev.margin
      if (_mev.success) {
        G._formThisMonth.wins++
        const _bonusRyo = Math.round(m.ryo * _mq.ryoMult)
        G.ryo += _bonusRyo; G.reputation = clamp(G.reputation + m.rep, 0, 999); G.morale = clamp(G.morale + 3 + _mq.morale, 0, 100)
        const prevCohesion = sq.cohesion ?? 0
        sq.cohesion = Math.min(100, prevCohesion + rnd(3, 7))
        sq.wins++
        recordMissionCommission(m.rk)
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          addWorkload(s, m.rk)
          s.missId = null; s.wins++; s.streak = (s.streak || 0) + 1
          s._seasonWins = (s._seasonWins || 0) + 1
          s._seasonMissions = (s._seasonMissions || 0) + 1
          s.status = 'available'
          rollInjuryOnSuccess(s, m, hL, dp.injDayReduction)  // may flip back to 'injured'
          if (m.rk === 'B' || m.rk === 'C') s.winsB = (s.winsB || 0) + 1
          if (m.rk === 'S') { s.winsS = (s.winsS || 0) + 1; s._seasonSRankWins = (s._seasonSRankWins || 0) + 1 }
          checkJutsu(s)
        })
        // Pair chemistry tracking
        if (!G.pairChemistryLog) G.pairChemistryLog = {}
        const mIds = sq.members
        for (let a = 0; a < mIds.length; a++) {
          for (let b = a + 1; b < mIds.length; b++) {
            const key = [mIds[a], mIds[b]].sort().join('_')
            G.pairChemistryLog[key] = (G.pairChemistryLog[key] || 0) + 1
            if (G.pairChemistryLog[key] === 5) {
              const sA = G.shinobi.find(x => x.id === mIds[a]), sB = G.shinobi.find(x => x.id === mIds[b])
              if (sA && sB) aL(`${sn(sA)} and ${sn(sB)} have built strong field chemistry after 5 missions together.`, 'good')
            }
          }
        }
        const _sqSuccessNarr = pickSquadNarrative(m.rk, 'success', sq.n)
        const _sqTag = _mev.quality === 'decisive' ? '⚔ Decisive victory — ' : ''
        aL(_sqTag + sq.n + ' completed "' + m.n + '" — +' + fmt(_bonusRyo) + ' ryo. ' + _sqSuccessNarr, 'good')
        pushMissionLog({ missionName: m.n, rank: m.rk, success: true, ryo: _bonusRyo, rep: m.rep, chainName: m.chainName || null, narrative: _sqSuccessNarr, quality: _mev.quality })
        addLegend((m.rk === 'S' ? 15 : m.rk === 'A' ? 8 : m.rk === 'B' ? 3 : 1) + _mq.legend)
        // Narrative Pillar 1&2: confidence + memory + blurb
        recordPlayerTactic(G.rivalTendencies, m.rk, _mev.quality, true)
        G.villages.forEach(v => observePlayerTactic(v, m.rk, true))
        const _sqActorIds = sq.members.slice()
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          updateConfidence(s, _mev.quality, { isLeader: s.id === sq.leaderId })
          if (_mev.quality === 'decisive') {
            addMemory(s, 'mission_triumph', m.id || m.n, { year: G.year, month: G.month })
            if (s.wins === 10 || s.wins === 25) setEmotionalState(s, 'triumphant')
          } else if (_mev.quality === 'narrow') {
            addMemory(s, 'mission_triumph', m.id || m.n, { year: G.year, month: G.month }, 0.3)
          }
        })
        if (_mev.quality === 'decisive') pushNarrative(genMissionBlurb(sq.n, sq.members.length > 0 ? (G.shinobi.find(x => x.id === sq.members[0])?.ri ?? 2) : 2, m.n, 'decisive'), _sqActorIds)
        // Post-mission contribution scores (Phase 4)
        G.lastMissionReport = _buildMissionReport(sq, m, true)
        // Squad identity unlock at cohesion 75
        if (sq.cohesion >= 75 && !sq.identity) {
          const taken = G.squads.filter(q => q.identity).map(q => q.identity.title)
          const available = SQUAD_IDENTITIES.filter(i => !taken.includes(i.title))
          if (available.length) {
            sq.identity = available[Math.floor(Math.random() * available.length)]
            aL(sq.n + ' has forged an unbreakable bond — now known as "' + sq.identity.title + '"!', 'good')
            ntf(sq.n + ': ' + sq.identity.title)
            addChronicle('Squad Identity', sq.n + ' earned the title "' + sq.identity.title + '".', 'squad')
            addLegend(20)
          }
        }
        // Try bond formation after 5 squad wins
        if (sq.wins >= 5) tryFormBonds(sq)
        // #11 Pairwise support events (flag-gated): one bonded pair may share a vignette
        if (G._ff_supportEvents) {
          const ids = sq.members
          let fired = false
          for (let a = 0; a < ids.length && !fired; a++) {
            const sA = G.shinobi.find(x => x.id === ids[a]); if (!sA) continue
            for (const bnd of (sA.bonds || [])) {
              if (!ids.includes(bnd.otherId) || Math.random() >= 0.25) continue
              const ev = pickSupportEvent(bnd.type); if (!ev) continue
              const sB = G.shinobi.find(x => x.id === bnd.otherId); if (!sB) continue
              if (ev.moraleMod) {
                sA.indMorale = clamp((sA.indMorale || 70) + ev.moraleMod, 0, 100)
                sB.indMorale = clamp((sB.indMorale || 70) + ev.moraleMod, 0, 100)
              }
              aL('🤝 ' + ev.text.replace('{a}', sn(sA)).replace('{b}', sn(sB)), 'good')
              fired = true; break
            }
          }
        }
      } else {
        G._formThisMonth.losses++
        const hasPr = sq.members.some(id => G.shinobi.find(s => s.id === id)?.pers.n === 'Protective')
        const kR = clamp((hL >= 2 ? 0.02 : hL >= 1 ? 0.04 : 0.08) + dp.kiaRiskMod + _formationRisk(sq) + _philosophyKIAMod(), 0.005, 0.15)
        let hadKIA = false
        const survivorIds = []
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          s.streak = 0
          addWorkload(s, m.rk)
          if (!hasPr && Math.random() < kR && !jkKIAImmune(s)) {
            const lastWords = pk(LAST_WORDS_POOL)
            aL(sn(s) + ' KIA on "' + m.n + '". ' + lastWords, 'bad')
            sq.fallen.push({ name: sn(s), rank: RANKS[s.ri], mission: m.n, year: G.year, month: G.month })
            if (s.wins >= 50) { addChronicle('Fallen Veteran', sn(s) + ' died on "' + m.n + '" after ' + s.wins + ' missions.', 'shinobi'); addLegend(10) }
            G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: m.n, year: G.year, month: G.month, wins: s.wins, lastWords })
            pushNarrative(genKIABlurb(sn(s), s.ri, m.n))
            G.shinobi = G.shinobi.filter(x => x.id !== s.id)
            hadKIA = true; sq.kills++
            G._mandateKIAThisYear = (G._mandateKIAThisYear || 0) + 1
            if (!G.pendingPress) queuePressConference('kia')
          } else {
            const injType = pickInjuryType(m.rk)
            if (injType) applyInjury(s, injType, hL, dp.injDayReduction)
            survivorIds.push(s.id)
          }
        })
        // Survivors who witnessed KIA may develop trauma + grudges + memories
        if (hadKIA) {
          const fallen = sq.fallen[sq.fallen.length - 1]
          survivorIds.forEach(id => {
            const survivor = G.shinobi.find(x => x.id === id)
            if (!survivor) return
            if (Math.random() < 0.5) applyTrauma(survivor)
            updateConfidence(survivor, _mev.quality, { hadKIA: true })
            addMemory(survivor, 'witness_kia', m.id || m.n, { year: G.year, month: G.month })
            setEmotionalState(survivor, 'grieving')
            // Bonded shinobi form a grudge against the rival village that caused the loss
            const wasBonded = fallen && (survivor.bonds || []).some(b => b.otherId === sq.fallen.find(f => f.name === fallen.name)?.id)
            if (wasBonded && G.villages.length) {
              const antagonist = pk(G.villages)
              formGrudge(survivor, antagonist.n, antagonist.n, 'kia_partner', { year: G.year, month: G.month })
              const quote = getArchetypeQuote(survivor)
              if (fallen) pushNarrative(genGrudgeBlurb(survivor.fn + ' ' + survivor.ln, fallen.name, 'Fallen Comrade', 3), [survivor.id])
              aL(`"${quote}" — ${sn(survivor)}`, 'warn')
            }
          })
        } else {
          survivorIds.forEach(id => {
            const survivor = G.shinobi.find(x => x.id === id)
            if (!survivor) return
            updateConfidence(survivor, _mev.quality)
            if (_mev.quality === 'disaster') addMemory(survivor, 'mission_disaster', m.id || m.n, { year: G.year, month: G.month })
          })
        }
        sq.cohesion = Math.max(0, (sq.cohesion ?? 0) + (hadKIA ? -15 : -4))
        sq.losses++
        const _sqFailNarr = pickSquadNarrative(m.rk, 'failure', sq.n)
        const _sqFailTag = _mev.quality === 'disaster' ? '💥 Disaster — ' : ''
        aL(_sqFailTag + '"' + m.n + '" squad mission failed. ' + _sqFailNarr, 'bad')
        recordPlayerTactic(G.rivalTendencies, m.rk, _mev.quality, true)
        G.villages.forEach(v => observePlayerTactic(v, m.rk, true))
        if (_mev.quality === 'disaster') pushNarrative(genMissionBlurb(sq.n, 2, m.n, 'disaster'))
        pushMissionLog({ missionName: m.n, rank: m.rk, success: false, ryo: 0, rep: 0, narrative: _sqFailNarr, quality: _mev.quality })
        G.morale = clamp(G.morale - 5 + _mq.morale, 0, 100)
        G.lastMissionReport = _buildMissionReport(sq, m, false)
      }
    } else {
      const s = G.shinobi.find(x => x.id === am.assignedTo); if (!s) return
      const pw = sPow(s), rM = s.pers.effect.riskMod || 0, sM = pw < m.mp ? (s.pers.effect.sucMod || 0) : 0, sB = s.pers.effect.soloBonus || 0
      const soloFormMod = ((s.returningForm || 100) < 100) ? ((s.returningForm - 100) / 500) : 0
      const soloAnbuBon = (m.rk === 'S' || m.rk === 'A') ? sb.anbuMissionBonus : 0
      const beastLuck = G._beastMissionLuck || 0
      ensureCareerFields(s)
      const soloPrepMod = G.missionPrepMode === 'aggressive' ? 0.08 : G.missionPrepMode === 'cautious' ? -0.06 : 0
      const jLB = jutsuLoadoutBonus(s, JUTSU_LIST)
      const bMB = bondMissionBonus(s, G.shinobi)
      const sc = clamp(1 - m.risk - rM + (pw - m.mp) * 0.01 + iB + sM + sB + sb.missionSuccessBonus + soloAnbuBon + soloFormMod + beastLuck + (s.declineMod || 0) + soloPrepMod + jLB.successMod + jLB.powerMod * 0.5 + dp.missionRiskReduction + cp.successMod + bMB.successMod + clP.successMod + shP.opSuccessBonus + _bloodlineBonus([s.id]) + _nationSuccessMod() + _philosophySuccessMod() + confidenceMod(s) + rivalScPenalty(G.villages, m.rk), 0.08, successCeiling(m.rk))
      const rB = ['A','S'].includes(m.rk) && s.pers.n === 'Honorable' ? 2 : 0

      addWorkload(s, m.rk)
      // Hanaku Lucky Scales: failed mission becomes marginal success once per month
      const chomeiActive = hasUniqueAbility(s.id, 'Hanaku') && !G._hanakuLuckyUsed
      const rollResult = Math.random()
      const missionPassed = rollResult < sc || (rollResult >= sc && chomeiActive && (() => { G._hanakuLuckyUsed = true; aL(`${sn(s)}'s Hanaku Lucky Scales turned failure to success!`, 'good'); return true })())
      const _mev = resolveMission(sc, Math.random, { success: missionPassed })
      const _mq = qualityEffects(_mev.quality)
      G._formThisMonth.marginSum += _mev.margin
      if (missionPassed) G._formThisMonth.wins++; else G._formThisMonth.losses++
      if (missionPassed) {
        const _bonusRyo = Math.round(m.ryo * _mq.ryoMult)
        G.ryo += _bonusRyo; G.reputation = clamp(G.reputation + m.rep + rB, 0, 999); G.morale = clamp(G.morale + 2 + _mq.morale, 0, 100)
        recordMissionCommission(m.rk)
        s.missId = null; s.wins++; s.streak = (s.streak || 0) + 1
        s._seasonWins = (s._seasonWins || 0) + 1
        s._seasonMissions = (s._seasonMissions || 0) + 1
        s.status = 'available'
        if (m.rk === 'B' || m.rk === 'C') s.winsB = (s.winsB || 0) + 1
        if (m.rk === 'S') { s.winsS = (s.winsS || 0) + 1 }
        checkJutsu(s)
        const _soloSuccNarr = pickNarrative(m.rk, 'success', sn(s), s.pers.n, { wins: s.wins, streak: s.streak, season })
        const _soloTag = _mev.quality === 'decisive' ? '⚔ Decisive — ' : ''
        aL(_soloTag + sn(s) + ' completed "' + m.n + '" — +' + fmt(_bonusRyo) + ' ryo. ' + _soloSuccNarr, 'good')
        pushMissionLog({ missionName: m.n, rank: m.rk, success: true, ryo: _bonusRyo, rep: m.rep + rB, chainName: m.chainName || null, narrative: _soloSuccNarr, quality: _mev.quality })
        updateConfidence(s, _mev.quality)
        if (_mev.quality === 'decisive') addMemory(s, 'mission_triumph', m.id || m.n, { year: G.year, month: G.month })
        else if (_mev.quality === 'narrow') addMemory(s, 'mission_triumph', m.id || m.n, { year: G.year, month: G.month }, 0.3)
        recordPlayerTactic(G.rivalTendencies, m.rk, _mev.quality, false)
        G.villages.forEach(v => observePlayerTactic(v, m.rk, false))
        addLegend((m.rk === 'S' ? 12 : m.rk === 'A' ? 6 : m.rk === 'B' ? 2 : 1) + _mq.legend)
        if (m.rk === 'S') addChronicle('S-Rank Completed', sn(s) + ' completed the S-rank mission "' + m.n + '".', 'legend')
        if (m.chainId) advanceChain(G, m.id, true)
        // Career milestone notices
        const MILESTONES = [10, 25, 50, 100]
        if (MILESTONES.includes(s.wins)) {
          const flavour = s.wins >= 100 ? 'A living legend.' : s.wins >= 50 ? 'Half a century of service.' : s.wins >= 25 ? 'Battle-hardened veteran.' : 'A solid foundation built.'
          s._milestoneNotice = `${s.wins} missions completed (${s.winsS||0} S-rank). ${flavour}`
          addChronicle(`${s.wins}-Mission Milestone`, `${sn(s)} reaches ${s.wins} missions. ${flavour}`, 'shinobi')
        } else {
          s._milestoneNotice = null
        }
        rollInjuryOnSuccess(s, m, hL, dp.injDayReduction)
      } else {
        s.streak = 0
        s._seasonMissions = (s._seasonMissions || 0) + 1
        const kR = clamp((hL >= 2 ? 0.02 : hL >= 1 ? 0.04 : 0.08) + dp.kiaRiskMod + _philosophyKIAMod(), 0.005, 0.15)
        if (Math.random() < kR && !jkKIAImmune(s)) {
          const lastWords = pk(LAST_WORDS_POOL)
          aL(sn(s) + ' KIA on "' + m.n + '". ' + lastWords, 'bad')
          G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: m.n, year: G.year, month: G.month, wins: s.wins, lastWords })
          pushNarrative(genKIABlurb(sn(s), s.ri, m.n))
          if (s.wins >= 50) addChronicle('Fallen Veteran', sn(s) + ' died on "' + m.n + '" after ' + s.wins + ' missions. ' + lastWords, 'shinobi')
          G._mandateKIAThisYear = (G._mandateKIAThisYear || 0) + 1
          const ripple = kiaRipple(s.id, G.shinobi.filter(x => x.id !== s.id))
          ripple.forEach(r => {
            const affected = G.shinobi.find(x => x.id === r.shinobiId)
            if (affected) { affected.morale = clamp((affected.morale || 50) + r.delta, 0, 100); aL(`${sn(affected)} is shaken by the loss of ${sn(s)}.`, 'bad') }
          })
          G.shinobi = G.shinobi.filter(x => x.id !== s.id)
          G.reputation = clamp(G.reputation - 5, 0, 999)
        } else {
          if (m.rk === 'S' && !s.darkMoment) {
            s.darkMoment = pk(DARK_MOMENT_POOL)
            aL(sn(s) + ' failed the S-rank and carries something new. "' + s.darkMoment + '"', 'warn')
          }
          const injType = pickInjuryType(m.rk)
          if (injType) {
            applyInjury(s, injType, hL, dp.injDayReduction)
            aL('"' + m.n + '" failed — ' + sn(s) + ' has a ' + injType.n + ' (' + s.injDays + 'mo). ' + pickNarrative(m.rk, 'failure', sn(s), s.pers.n, { wins: s.wins, streak: s.streak, season }), 'bad')
          }
          // Re-injury risk for those returning from long absence
          if ((s.returningForm || 100) < 80 && Math.random() < 0.20) {
            aL(sn(s) + ' re-injured themselves — too soon to return to active duty.', 'warn')
          }
        }
        updateConfidence(s, _mev.quality)
        addMemory(s, 'mission_disaster', m.id || m.n, { year: G.year, month: G.month })
        if (_mev.quality === 'disaster') setEmotionalState(s, 'fearful')
        recordPlayerTactic(G.rivalTendencies, m.rk, _mev.quality, false)
        G.villages.forEach(v => observePlayerTactic(v, m.rk, false))
        pushMissionLog({ missionName: m.n, rank: m.rk, success: false, ryo: 0, rep: 0, chainName: m.chainName || null, quality: _mev.quality })
        G.morale = clamp(G.morale - 3 + _mq.morale, 0, 100)
        if (m.chainId) advanceChain(G, m.id, false)
      }
    }
  })
  G.aM = G.aM.filter(am => am.daysLeft > 0)

  // ── Raid system ──────────────────────────────────────────────────────────
  if (G.raid && !G.raid.resolved) { if (G.raidW <= 0) resRaid(); else G.raidW-- }
  if (!G.raid) {
    // Aggressive villages raise raid chance
    const aggressiveV = G.villages.filter(v => v.personality === 'Aggressive' && v.rel < 40)
    const aggressiveBonus = aggressiveV.length * 0.02
    if (Math.random() < 0.12 + aggressiveBonus) {
      const ev = pk(RAID_POOL), warn = G.upgrades.intel >= 2 ? 2 : G.upgrades.intel >= 1 ? 1 : 0
      G.raid = { ...ev, resolved: false }; G.raidW = warn
      aL('⚠ Threat: ' + ev.n + '! ' + (warn > 0 ? 'Arrives in ' + warn + 'm.' : 'Arriving now!'), 'warn')
      if (warn === 0) resRaid()
    }
  }

  // ── Rival village grudge tick-down ───────────────────────────────────────
  G.villages.forEach(v => {
    if ((v.grudgeTicks || 0) > 0) {
      v.grudgeTicks--
      // Honorable villages forgive faster
      if (v.personality === 'Honorable' && Math.random() < 0.3) v.grudgeTicks = Math.max(0, v.grudgeTicks - 1)
    }
  })

  // ── Rival village strength simulation ─────────────────────────────────────
  G.villages.forEach(v => {
    if (!v.strength) v.strength = 50 + Math.round(Math.random() * 40)
    if (!v.roster || !v.roster.length) v.roster = genVillageRoster(v)  // backfill rosters on older saves
    // Replenish war/mission losses so rivals stay viable — recruit fresh genin toward a floor.
    if (v.roster.length < 40 && Math.random() < 0.5) {
      const recruit = mS(rnd(0, 1)); recruit.homeVillage = v.n; v.roster.push(recruit)
    }
    // Adaptive AI — rivals re-evaluate tactics each season (once per year minimum)
    ensureRivalProfile(v)
    if (G.month === 1 || !v.counterStrategy) {
      const tendency = getPlayerTendency(G.rivalTendencies || {})
      const { changed, strategy } = applyCounterStrategy(v, tendency)
      if (changed && strategy.id !== 'balanced') {
        const explainedDesc = explainStanceChange(v, strategy)
        pushNarrative(genCounterStrategyBlurb(v.n, strategy.label, explainedDesc), [v.n])
        v.rivalProfile.lastStance = strategy.id
        v.rivalProfile.stanceHistory = [...(v.rivalProfile.stanceHistory || []).slice(-4), { stance: strategy.id, year: G.year, month: G.month }]
      }
    }
    // Meta-event: once per year, ~8% chance of league-wide shift
    if (G.month === 6) {
      const meta = rollMetaEvent(G.villages, { year: G.year, month: G.month })
      if (meta.fired) pushNarrative({ title: 'League Shift', body: meta.desc, tag: 'intel', link: null }, [])
    }
    // Apply counter-strategy strength tick multiplier
    v._ctBonus = v.counterTickBonus ?? 1
    tickRivalStrength(v)
    // Soft decay above 150 — prevents aggressive villages from permanently walling at 200
    if (v.strength > 150 && Math.random() < 0.25) v.strength = Math.max(150, v.strength - rnd(2, 4))
    if (shouldFireRivalEvent(v)) {
      const ev = pickRivalEvent(v)
      const msg = ev.template.replace('{village}', v.n)
      if (ev.id === 'border_threat') v.rel = clamp((v.rel || 50) - 5, 0, 100)
      if (ev.id === 'internal_strife' || ev.id === 'natural_disaster') v.strength = Math.max(10, v.strength - 15)
      if (ev.id === 'poach_prospect') G.councilApproval && (G.councilApproval.academy = clamp((G.councilApproval.academy || 50) - 3, 0, 100))
      aL(msg, ev.severity)
    }
  })
  G._playerStrength = computePlayerStrength(G)

  // ── Season league table — the regular-season spine that seeds the exam ────
  {
    const playerName = G.vName
    const names = [playerName, ...G.villages.map(v => v.n)]
    if (!G.season || !G.season.table || Object.keys(G.season.table).length !== names.length) {
      G.season = { year: G.year, round: 0, table: initSeasonTable(names), lastResults: [] }
    }
    // Real mission form feeds the player's matchday — a good month on missions
    // makes you likelier to win your league fixture (±2 effective strength per net phase-margin).
    const form = G._formThisMonth || { marginSum: 0 }
    const formBonus = clamp(form.marginSum * 2, -20, 20)
    G._seasonFormBonus = formBonus  // surfaced in UI
    const strOf = name => name === playerName
      ? Math.max(10, (G._playerStrength || 50) + formBonus)
      : ((G.villages.find(v => v.n === name)?.strength) || 50)
    playMatchday(G.season, names, strOf)

    // Track monthly form streak for press triggers
    const _fm = G._formThisMonth || { wins: 0, losses: 0 }
    if (_fm.wins > _fm.losses) {
      G._pressWinStreak  = (G._pressWinStreak  || 0) + 1
      G._pressLossStreak = 0
    } else if (_fm.losses > _fm.wins) {
      G._pressLossStreak = (G._pressLossStreak || 0) + 1
      G._pressWinStreak  = 0
    }
    if (G._pressWinStreak  >= 3 && !G.pendingPress) { queuePressConference('win_streak');  G._pressWinStreak  = 0 }
    if (G._pressLossStreak >= 3 && !G.pendingPress) { queuePressConference('loss_streak'); G._pressLossStreak = 0 }
  }

  // ── New press triggers ────────────────────────────────────────────────────
  // Trauma spike: 3+ shinobi in trauma simultaneously
  const _traumaCount = (G.shinobi || []).filter(s => s.traumaStatus).length
  if (_traumaCount >= 3 && !G.pendingPress && Math.random() < 0.4) {
    queuePressConference('trauma')
  }
  // Rivalry heat: a village has grudgeTicks >= 8
  if (!G.pendingPress) {
    const _hotRival = (G.villages || []).find(v => (v.grudgeTicks || 0) >= 8)
    if (_hotRival && Math.random() < 0.25) queuePressConference('rivalry_heat', { rivalName: _hotRival.n })
  }
  // Legend milestone: every 10 legend points gained, low-frequency press
  if (!G.pendingPress && (G.legend || 0) > 0 && (G.legend || 0) % 50 === 0 && G.year >= 5) {
    queuePressConference('legend', { legacyYears: G.year })
  }
  // KIA with grudge context
  const _kiaGrudge = (G.shinobi || []).some(s => (s.grudges || []).some(gr => gr.intensity >= 2 && (G.year - (gr.formed?.year || G.year)) * 12 + (G.month - (gr.formed?.month || G.month)) < 3))
  if (_kiaGrudge && !G.pendingPress && Math.random() < 0.3) {
    const _fallen = (G.shinobi || []).filter(s => s.status === 'kia').slice(-1)[0]
    queuePressConference('kia_grudge', { fallenName: _fallen ? sn(_fallen) : undefined })
  }

  // ── Staff tick ────────────────────────────────────────────────────────────
  if (!G.staff) G.staff = [];
  (G.staff || []).forEach(st => {
    st.monthsServed = (st.monthsServed || 0) + 1
    // Development — +1 rating over time
    if (st.monthsServed > 0 && st.monthsServed % 6 === 0 && Math.random() < 0.30 && st.rating < 20) {
      st.rating++
      const role = STAFF_ROLES.find(r => r.id === st.role)
      if (role) {
        const k = pk(role.stats)
        st.stats[k] = clamp(st.stats[k] + 1, 1, 20)
      }
      aL(st.fn + ' ' + st.ln + ' improved to rating ' + st.rating + '.', 'good')
    }
    // Retirement after 60+ months with institutional bonus
    if (st.monthsServed >= 60 && Math.random() < 0.05) {
      aL(st.fn + ' ' + st.ln + ' retired after ' + st.monthsServed + ' months. They leave behind institutional knowledge.', 'neutral')
      st.institutional = Math.floor(st.rating / 4)
      // Staff Hall of Fame — 8+ years (96 months) earns a legacy entry
      if (st.monthsServed >= 96) {
        if (!G.staffHallOfFame) G.staffHallOfFame = []
        G.staffHallOfFame.push({
          fn: st.fn, ln: st.ln, role: st.role,
          yearsServed: Math.floor(st.monthsServed / 12),
          peakRating: st.rating, year: G.year,
          fromShinobi: st.fromShinobi || null,
        })
        aL(st.fn + ' ' + st.ln + ' is inducted into the Staff Hall of Fame after ' + Math.floor(st.monthsServed / 12) + ' years of service.', 'good')
        addChronicle('Staff Hall of Fame', st.fn + ' ' + st.ln + ' inducted — ' + Math.floor(st.monthsServed / 12) + ' years, peak rating ' + st.rating + '.', 'milestone')
        addLegend(5)
      }
      G.staff = G.staff.filter(x => x.id !== st.id)
    }
  })

  // ── Mentorship tick ───────────────────────────────────────────────────────
  if (!G.mentorships) G.mentorships = []
  const _mentorEvents = tickMentorships(G.mentorships, G.shinobi, { year: G.year, month: G.month })
  for (const ev of _mentorEvents) {
    const actorIds = [ev.mentorId, ev.studentId].filter(Boolean)
    if (ev.type === 'bond_memory') {
      addMemory(G.shinobi.find(s => s.id === ev.mentorId), 'mentor_bond', 'mentorship', { year: G.year, month: G.month })
      addMemory(G.shinobi.find(s => s.id === ev.studentId), 'mentor_bond', 'mentorship', { year: G.year, month: G.month })
      pushNarrative({ title: `Mentorship: ${ev.mentorName} & ${ev.studentName}`, body: ev.detail, tag: 'bond', link: 'roster' }, actorIds)
    } else if (ev.type === 'graduation') {
      addMemory(G.shinobi.find(s => s.id === ev.mentorId), 'mentor_bond', 'mentorship', { year: G.year, month: G.month }, 0.65)
      pushNarrative({ title: `Mentorship Complete: ${ev.studentName}`, body: ev.detail, tag: 'promotion', link: 'roster' }, actorIds)
      aL(ev.detail, 'good')
    } else {
      pushNarrative({ title: `Mentorship: ${ev.mentorName} & ${ev.studentName}`, body: ev.detail, tag: 'bond', link: 'roster' }, actorIds)
    }
  }

  // ── Staff depth tick ──────────────────────────────────────────────────────
  if (!G.staffHallOfFame) G.staffHallOfFame = []
  if (!G.asstKageLog) G.asstKageLog = []

  // Career path: Team Sensei with high ambition wants Head Sensei promotion
  const teamSenseis = (G.staff || []).filter(st => st.role === 'team_sensei')
  const headSensei = (G.staff || []).find(st => st.role === 'head_sensei')
  teamSenseis.forEach(ts => {
    ts.careerPathMonths = (ts.careerPathMonths || 0) + 1
    if (!ts.ambition) ts.ambition = rnd(8, 14)
    // High-ambition sensei: after 18 months push for head sensei slot
    if (ts.ambition >= 14 && ts.careerPathMonths >= 18) {
      if (!headSensei) {
        // Slot open — surface a meeting request
        if (!(G.meetingQueue || []).find(m => m.staffId === ts.id && m.type === 'staff_promo_request')) {
          if (!G.meetingQueue) G.meetingQueue = []
          G.meetingQueue.push({ id: Math.random().toString(36).slice(2), staffId: ts.id, type: 'staff_promo_request', month: G.month, year: G.year, n: ts.fn + ' ' + ts.ln, role: ts.role })
          aL(ts.fn + ' ' + ts.ln + ' is ready for a Head Sensei role — check People Management.', 'warn')
          ntf(ts.fn + ' wants a promotion!')
        }
      } else if (Math.random() < 0.04) {
        // Slot taken and ambition unmet — they look elsewhere
        aL(ts.fn + ' ' + ts.ln + ' resigned — their ambition could not be satisfied here.', 'bad')
        addChronicle('Staff Resignation', ts.fn + ' ' + ts.ln + ' (Team Sensei) left to seek advancement at another village.', 'staff')
        addNotice(ts.fn + ' ' + ts.ln + ' has resigned in search of a head sensei position elsewhere.', 'bad')
        G.staff = G.staff.filter(x => x.id !== ts.id)
      }
    }
  })

  // Staff conflict: Head Sensei vs Team Sensei clash after 6+ months
  if (!G.staffConflict && headSensei && teamSenseis.length > 0) {
    const clashCandidate = teamSenseis.find(ts => {
      const hsDisc = headSensei.stats?.discipline || 0
      const tsEmp = ts.stats?.empathy || 0
      const bothLong = (ts.monthsServed || 0) >= 6 && (headSensei.monthsServed || 0) >= 6
      return bothLong && hsDisc >= 14 && tsEmp >= 14 && Math.random() < 0.03
    }) || (teamSenseis.some(ts => (ts.monthsServed || 0) >= 6) && Math.random() < 0.01
      ? teamSenseis.find(ts => (ts.monthsServed || 0) >= 6) : null)
    if (clashCandidate) {
      G.staffConflict = { headSenseiId: headSensei.id, teamSenseiId: clashCandidate.id, month: G.month, year: G.year }
      aL('⚠ Staff Conflict: ' + headSensei.fn + ' ' + headSensei.ln + ' and ' + clashCandidate.fn + ' ' + clashCandidate.ln + ' are clashing. Mediate in Staff panel.', 'warn')
      ntf('Staff conflict — mediation required!')
      addNotice('A conflict between your Head Sensei and a Team Sensei has escalated. Mediation needed.', 'warn')
    }
  }

  // Staff poaching by rival villages
  if (!G.staffPoachOffer) {
    const poachTargets = (G.staff || []).filter(st => st.rating >= 14 && !st.asstKage)
    if (poachTargets.length > 0 && Math.random() < 0.04) {
      const target = poachTargets.sort((a, b) => b.rating - a.rating)[0]
      const poachVillage = pk(['Kazegakure', 'Shimogakure', 'Gangakure', 'Raikurokure'])
      const matchCost = Math.round(target.salary * rnd(12, 18))
      const expMonth = G.month === 12 ? 1 : G.month + 1
      const expYear = G.month === 12 ? G.year + 1 : G.year
      G.staffPoachOffer = { staffId: target.id, staffName: target.fn + ' ' + target.ln, village: poachVillage, matchCost, expiresMonth: expMonth, expiresYear: expYear }
      aL('⚠ ' + poachVillage + ' is trying to recruit ' + target.fn + ' ' + target.ln + '. Respond in the Staff panel within 1 month.', 'warn')
      ntf('Rival village targeting your staff!')
      addNotice(target.fn + ' ' + target.ln + ' has received an offer from ' + poachVillage + '. Your response is required.', 'warn')
    }
  }
  // Expire poach offer
  if (G.staffPoachOffer) {
    const offer = G.staffPoachOffer
    const expired = G.year > offer.expiresYear || (G.year === offer.expiresYear && G.month >= offer.expiresMonth)
    if (expired) {
      // Staff leaves automatically when offer expires with no response
      const st = (G.staff || []).find(x => x.id === offer.staffId)
      if (st) {
        aL(offer.staffName + ' accepted ' + offer.village + '\'s offer — they are gone.', 'bad')
        G.staff = G.staff.filter(x => x.id !== offer.staffId)
        addChronicle('Staff Poached', offer.staffName + ' was recruited away by ' + offer.village + '.', 'staff')
      }
      G.staffPoachOffer = null
    }
  }

  // Assistant Kage autonomous meeting handling
  const asstKage = (G.staff || []).find(st => st.asstKage)
  if (asstKage && Math.random() < 0.18) {
    const minorMtg = (G.meetingQueue || []).find(m => {
      const def = MEETING_TYPES.find(t => t.id === m.type)
      return def && def.urgency === 'low' && !m.staffId  // not a staff request
    })
    if (minorMtg) {
      const s = G.shinobi.find(x => x.id === minorMtg.shinobiId)
      if (s) {
        const discipline = asstKage.stats?.discipline || 0
        const empathy = asstKage.stats?.empathy || 0
        const isFirm = discipline > empathy
        s.indMorale = clamp((s.indMorale || 70) + (isFirm ? -2 : 5), 0, 100)
        s.commitment = clamp((s.commitment || 70) + (isFirm ? -1 : 3), 0, 100)
        G.meetingQueue = G.meetingQueue.filter(m => m.id !== minorMtg.id)
        const logText = asstKage.fn + ' ' + asstKage.ln + ' handled ' + sn(s) + '\'s request ' + (isFirm ? 'firmly — direct and uncompromising.' : 'supportively — warmth and reassurance.')
        G.asstKageLog.unshift({ year: G.year, month: G.month, text: logText, shinobiName: sn(s) })
        if (G.asstKageLog.length > 25) G.asstKageLog.pop()
        aL('[AK] ' + logText, 'neutral')
      }
    }
  }

  // ── Daimyo seasonal objectives (set January, evaluated December) ───────────
  if (!G.daimyoObjectives && G.month !== 1) {
    // Backfill for old saves mid-year — assign on next January naturally
  }
  if (G.month === 1) {
    const ids = [...DAIMYO_OBJECTIVES].sort(() => Math.random() - 0.5).slice(0, 3).map(o => o.id)
    G.daimyoObjectives = { ids, year: G.year, startRel: G.villages.map(v => ({ n: v.n, rel: v.rel })) }
    aL('The Daimyo has set 3 objectives for the year — check Finances.', 'ev')
    addChronicle('Daimyo Objectives', 'This year\'s objectives: ' + ids.map(id => DAIMYO_OBJECTIVES.find(o=>o.id===id)?.n).join(', ') + '.', 'event')
  }
  if (G.month === 12 && G.daimyoObjectives && G.daimyoObjectives.year === G.year) {
    const ids = G.daimyoObjectives.ids
    const met = ids.map(id => {
      if (id === 'top_prestige') return ['B','A','S'].includes(G.prestigeTier)
      if (id === 'win_exam') return (G.dynastyRecords?.examWins || 0) > 0
      if (id === 'financial_stable') return (G.finances?.deficitMonths || 0) <= 1
      if (id === 'sign_grads') return G.shinobi.filter(s => s.homegrown).length >= 2
      if (id === 'no_incidents') {
        const start = G.daimyoObjectives.startRel || []
        return G.villages.every(v => { const s = start.find(x => x.n === v.n); return !s || (s.rel - v.rel) <= 15 })
      }
      return false
    })
    const allMet = met.every(Boolean)
    if (allMet) {
      G.daimyoBudgetMult = clamp((G.daimyoBudgetMult || 1) + 0.15, 1, 2)
      aL('The Daimyo is pleased — all objectives met! Budget increased for next season.', 'good')
      addChronicle('Daimyo Satisfied', 'All 3 objectives met this year. Daimyo budget multiplier now ' + G.daimyoBudgetMult.toFixed(2) + 'x.', 'milestone')
    } else {
      G.daimyoBudgetMult = clamp((G.daimyoBudgetMult || 1) - 0.10, 0.5, 2)
      G.reputation = clamp(G.reputation - 5, 0, 999)
      aL('The Daimyo is disappointed — objectives missed. Budget cut, relationship damaged.', 'bad')
      addChronicle('Daimyo Disappointed', met.filter(m=>!m).length + ' objective(s) missed. Budget multiplier now ' + G.daimyoBudgetMult.toFixed(2) + 'x.', 'event')
    }
    G.daimyoObjectiveHistory = G.daimyoObjectiveHistory || []
    G.daimyoObjectiveHistory.push({ year: G.year, met, budgetMult: G.daimyoBudgetMult })
  }

  // ── Owner mandate (annual accountability + job security) ────────────────────
  if (!G.ownerMandate) G.ownerMandate = { confidence: CONFIDENCE_START, consecutiveBadYears: 0, ids: [], history: [] }
  if (G.month === 1) {
    // New year — reset per-year trackers and set mandates
    G._mandateKIAThisYear   = 0
    G._mandateLuxTaxMonths  = 0
    G._mandateStartRep      = G.reputation
    const lastIds = G.ownerMandate.ids || []
    G.ownerMandate.ids = pickMandates(lastIds)
    const names = G.ownerMandate.ids.map(id => MANDATE_BY_ID[id]?.n || id).join(', ')
    aL(`Council mandate for Year ${G.year}: ${names}. See Kage tab.`, 'ev')
    addChronicle('Council Mandate', `Year ${G.year} mandates: ${names}.`, 'event')
  }
  if (G.month === 12 && G.ownerMandate.ids.length) {
    const { results, delta } = evaluateMandates(G.ownerMandate.ids, G)
    const prev = G.ownerMandate.confidence
    G.ownerMandate.confidence = clamp(prev + delta, 0, 100)
    const metCount = results.filter(r => r.met).length
    const allMet = metCount === results.length
    const badYear = delta < 0
    G.ownerMandate.consecutiveBadYears = badYear ? (G.ownerMandate.consecutiveBadYears || 0) + 1 : 0
    G.ownerMandate.history.push({
      year: G.year, results, delta,
      confidenceBefore: prev, confidenceAfter: G.ownerMandate.confidence,
    })
    if (G.ownerMandate.history.length > 10) G.ownerMandate.history.shift()
    const summary = results.map(r => (r.met ? '✓' : '✗') + ' ' + (MANDATE_BY_ID[r.id]?.n || r.id)).join(' · ')
    if (allMet) {
      aL(`Council review: all mandates met — confidence ${prev}→${G.ownerMandate.confidence}. ${summary}`, 'good')
      addChronicle('Mandate Review', `Year ${G.year}: all mandates met. Confidence ${G.ownerMandate.confidence}.`, 'milestone')
    } else {
      aL(`Council review: ${metCount}/${results.length} mandates met — confidence ${prev}→${G.ownerMandate.confidence}. ${summary}`, badYear ? 'bad' : 'neutral')
      addChronicle('Mandate Review', `Year ${G.year}: ${metCount}/${results.length} mandates met. Confidence ${G.ownerMandate.confidence}.`, 'event')
    }
    // No-confidence trigger
    if (G.ownerMandate.confidence < DISMISSAL_THRESHOLD && G.ownerMandate.consecutiveBadYears >= 2) {
      G.noConfidenceVote = true
      aL('⚠ The council has lost confidence in your leadership — a no-confidence vote has been called! See Kage tab.', 'bad')
      ntf('No-confidence vote called!')
      addChronicle('No-Confidence Vote', `After ${G.ownerMandate.consecutiveBadYears} consecutive poor years, the council demands a change of leadership.`, 'legend')
    } else if (G.ownerMandate.confidence < DISMISSAL_THRESHOLD) {
      aL(`⚠ Council confidence is critically low (${G.ownerMandate.confidence}). One more bad year risks dismissal.`, 'bad')
      addNotice(`Council confidence: ${G.ownerMandate.confidence}/100. Meet mandates next year or face a vote.`, 'bad')
    }
  }

  // ── Sponsorship deals ────────────────────────────────────────────────────────
  if (!G.sponsorship && !G.sponsorshipOffer && Math.random() < 0.06) {
    const eligible = SPONSORSHIP_OFFERS.filter(o => G.shinobi.some(s => s.ri >= o.minRi))
    if (eligible.length) {
      G.sponsorshipOffer = pk(eligible)
      aL(G.sponsorshipOffer.n + ' has offered a sponsorship deal — check Finances.', 'ev')
      ntf('Sponsorship offer: ' + G.sponsorshipOffer.n)
    }
  }
  let sponsorshipIncome = 0
  if (G.sponsorship) {
    const obligationBroken = G.sponsorship.id === 'iron_merchants' && !G.shinobi.some(s => s.ri >= 3 && s.status !== 'retired')
    if (obligationBroken) {
      aL(G.sponsorship.n + ' pulled out — obligation unmet.', 'bad')
      G.sponsorship = null
    } else {
      sponsorshipIncome = G.sponsorship.monthlyRyo
    }
  }

  // ── Black market ledger (off-books tracking, separate from G.ryo health) ───
  if (!G.blackLedger) G.blackLedger = { balance: 0, history: [] }
  if (G.blackLedger.balance > 0) {
    const catchChance = clamp(G.blackLedger.balance / 200000, 0.02, 0.35)
    if (Math.random() < catchChance) {
      const v = pk(G.villages)
      const penalty = Math.round(G.blackLedger.balance * 0.4)
      G.ryo = Math.max(0, G.ryo - penalty)
      if (v) v.rel = clamp(v.rel - 25, 0, 100)
      G.reputation = clamp(G.reputation - 15, 0, 999)
      aL('⚠ Rival intel uncovered black market dealings — massive diplomatic and financial penalty!', 'bad')
      addChronicle('Black Market Exposed', 'Off-books dealings exposed. Penalty: ' + fmt(penalty) + ' ryo, relations and reputation damaged.', 'event')
      G.blackLedger.history.push({ year: G.year, month: G.month, type: 'caught', amount: -penalty })
      G.blackLedger.balance = 0
    }
  }

  // ── Economy & Finance snapshot ────────────────────────────────────────────
  const trI = Math.round(G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0) * sb.tradeIncomeMultiplier)
  const coI = Math.round(G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0) * sb.tradeIncomeMultiplier)
  const jkI = G.beasts.filter(b => b.sealed && b.n === 'Niryuu' && b.jk).length * 3000
    + (G._kurenigykiBonus ? 5000 : 0) // Kureni+Hachitsuno trade bonus
  const daimyoB = Math.round(computeDaimyoBonus() * (G.daimyoBudgetMult || 1))
  const villageRev = Math.round(computeVillageRevenue() * (G.daimyoBudgetMult || 1))
  if (!G.budgetPriority) G.budgetPriority = { training: 33, warPrep: 33, infra: 34 }
  const _infraPct = (G.budgetPriority.infra || 34) / 100
  const maintenance = Math.round(computeMaintenance() * (1 - _infraPct * 0.3))
  // twoWay players (farm-assigned) don't count against the salary cap payroll
  const shinobiSal = G.shinobi.reduce((a, s) => a + s.salary, 0)
  const capPayroll = G.shinobi.filter(s => !s.twoWay).reduce((a, s) => a + s.salary, 0)
  const staffSal = (G.staff || []).reduce((a, st) => a + st.salary, 0)
  const commI = Object.entries(G.finances?.missionCommissions || {}).reduce((a,[,v]) => a + v * 0, 0) // commissions already applied to G.ryo
  const examFeeAmt = G.finances?.examFees || 0
  const loanFeeAmt = G.finances?.loanFees || 0

  const _natIncMult = G._ff_nationHud ? (1 + nationMods(G.nationId).ryoMod) : 1
  const totalIncome = Math.round((trI + coI + jkI + daimyoB + villageRev + examFeeAmt + loanFeeAmt + sponsorshipIncome) * _natIncMult)
  const totalExpend = shinobiSal + staffSal + maintenance
  const monthlyNet = totalIncome - totalExpend

  // Apply economy flows
  G.ryo += totalIncome  // nation-adjusted (see _natIncMult)
  G.ryo -= shinobiSal + staffSal + maintenance

  // ── Salary cap check ─────────────────────────────────────────────────────
  const _cs = capStatus(G.prestigeTier || 'D', capPayroll + staffSal)
  G.capStatus = _cs
  G._capHardBlock = _cs.hardBlock
  if (_cs.overBy > 0) {
    G._mandateLuxTaxMonths = (G._mandateLuxTaxMonths || 0) + 1
    G.ryo = Math.max(0, G.ryo - _cs.luxuryTax)
    if (_cs.hardBlock) {
      aL(`⚠ Hard cap exceeded (${Math.round(_cs.pct * 100)}% of cap) — signings BLOCKED until payroll drops. Luxury tax: -${fmt(_cs.luxuryTax)} ryo.`, 'bad')
    } else {
      aL(`Payroll over cap — luxury tax: -${fmt(_cs.luxuryTax)} ryo (${_cs.label}).`, 'warn')
    }
  }

  // #12 Optional debt/overdraft (flag-gated): accrue interest instead of an implicit hole
  if (G._ff_debt && G.ryo < 0) {
    const d = applyDebt(G.ryo)
    G.ryo = d.ryo; G.debt = d.debt
    if (d.interestCharged > 0) aL(`Treasury in arrears — ${fmt(d.interestCharged)} ryo interest accrued (debt ${fmt(d.debt)}).`, 'bad')
  }

  // Record finance snapshot
  if (!G.finances) G.finances = { history:[], deficitMonths:0, healthTier:'Stable', lastMonthNet:0, missionCommissions:{D:0,C:0,B:0,A:0,S:0}, examFees:0, loanFees:0, scoutCostThisMonth:0 }
  const commByRank = G.finances.missionCommissions || {D:0,C:0,B:0,A:0,S:0}
  const commTotal = Object.entries(commByRank).reduce((a,[rk,cnt]) => a + cnt * (MISSION_COMMISSION[rk]||0), 0)
  const snap = {
    year: G.year, month: G.month,
    income: { tradeRoutes:trI, contracts:coI, jinchuriki:jkI, daimyoBonus:daimyoB, villageRevenue:villageRev, missionCommissions:commTotal, examFees:examFeeAmt, loanFees:loanFeeAmt, sponsorship:sponsorshipIncome, nationBonus: totalIncome - (trI + coI + jkI + daimyoB + villageRev + examFeeAmt + loanFeeAmt + sponsorshipIncome) },
    expenditure: { shinobiWages:shinobiSal, staffWages:staffSal, maintenance, scoutCost:G.finances.scoutCostThisMonth||0 },
    totalIncome, totalExpend, net:monthlyNet,
    missionBreakdown: { ...commByRank },
    shinobiByRank: {
      Genin: G.shinobi.filter(s=>s.ri===0).length,
      Chunin: G.shinobi.filter(s=>s.ri===1).length,
      Jonin: G.shinobi.filter(s=>s.ri===2).length,
      ANBU: G.shinobi.filter(s=>s.ri===3).length,
      'S-Rank': G.shinobi.filter(s=>s.ri===4).length,
    }
  }
  G.finances.history.push(snap)
  if (G.finances.history.length > 12) G.finances.history.shift()
  G.finances.lastMonthNet = monthlyNet

  // Determine health tier
  const tier = computeFinanceTier(monthlyNet)
  G.finances.healthTier = tier.n
  if (tier.morale !== 0) G.morale = clamp(G.morale + tier.morale, 0, 100)

  // Telemetry (side-effect-only buffer; never alters game logic)
  emit('economy_tick', { year: G.year, month: G.month, ryo: G.ryo, net: monthlyNet, deficitMonths: G.finances.deficitMonths, tier: tier.n })
  emit('integrity_check', integrityCheck(G))

  // Deficit tracking & debt spiral
  if (monthlyNet < 0) {
    G.finances.deficitMonths = (G.finances.deficitMonths || 0) + 1
    if (G.finances.deficitMonths >= 3 && Math.random() < 0.25) {
      const ev = pk(FINANCIAL_EVENTS)
      G.ryo = Math.max(0, G.ryo + ev.ryo)
      if (ev.rep) G.reputation = clamp(G.reputation + ev.rep, 0, 999)
      if (ev.morale) G.morale = clamp(G.morale + ev.morale, 0, 100)
      aL('⚠ Financial Crisis: "' + ev.n + '" — ' + ev.desc, 'bad')
      addChronicle('Financial Crisis', ev.n + ': ' + ev.desc, 'event')
    }
  } else {
    G.finances.deficitMonths = 0
  }

  // ── End-of-year financial report ────────────────────────────────────────────
  if (G.month === 12) {
    const yearSnaps = G.finances.history.filter(h => h.year === G.year)
    const yearIncome = yearSnaps.reduce((a, h) => a + h.totalIncome, 0)
    const yearExpend = yearSnaps.reduce((a, h) => a + h.totalExpend, 0)
    const yearNet = yearIncome - yearExpend
    const streams = {
      tradeRoutes: yearSnaps.reduce((a,h)=>a+(h.income?.tradeRoutes||0),0),
      contracts: yearSnaps.reduce((a,h)=>a+(h.income?.contracts||0),0),
      daimyoBonus: yearSnaps.reduce((a,h)=>a+(h.income?.daimyoBonus||0),0),
      missionCommissions: yearSnaps.reduce((a,h)=>a+(h.income?.missionCommissions||0),0),
      sponsorship: yearSnaps.reduce((a,h)=>a+(h.income?.sponsorship||0),0),
      wages: yearSnaps.reduce((a,h)=>a+(h.expenditure?.shinobiWages||0)+(h.expenditure?.staffWages||0),0),
      maintenance: yearSnaps.reduce((a,h)=>a+(h.expenditure?.maintenance||0),0),
    }
    const daimyoReaction = yearNet >= 0
      ? 'The Daimyo notes the village remained financially sound through Year ' + G.year + '.'
      : 'The Daimyo expresses concern over Year ' + G.year + '\'s deficit and urges fiscal discipline.'
    G.yearEndReports = G.yearEndReports || []
    G.yearEndReports.push({ year: G.year, totalIncome: yearIncome, totalExpend: yearExpend, net: yearNet, streams, daimyoReaction })
    if (G.yearEndReports.length > 10) G.yearEndReports.shift()
    addChronicle('Year ' + G.year + ' Financial Report', `Income ${fmt(yearIncome)} / Expenditure ${fmt(yearExpend)} / Net ${yearNet>=0?'+':''}${fmt(yearNet)}. ${daimyoReaction}`, 'milestone')

    // ── Season stats snapshot ────────────────────────────────────────────────
    const _snap = snapshotSeasonStats(G)
    G.seasonStats = G.seasonStats || {}
    G.seasonStats[G.year] = _snap
    if (Object.keys(G.seasonStats).length > 10) {
      const oldest = Math.min(...Object.keys(G.seasonStats).map(Number))
      delete G.seasonStats[oldest]
    }
    const _leaders = leagueLeaders(_snap)
    if (_leaders.topWins[0]?.winsThisSeason > 0) {
      const mvpPre = _leaders.topWins[0]
      addChronicle('Year ' + G.year + ' Season Stats', `League leaders — Wins: ${mvpPre.name} (${mvpPre.winsThisSeason}). Missions: ${_leaders.topMissions[0]?.name} (${_leaders.topMissions[0]?.missionsThisSeason}). Career leader: ${_leaders.topCareer[0]?.name} (${_leaders.topCareer[0]?.wins} all-time).`, 'milestone')
    }

    // ── Awards ceremony ──────────────────────────────────────────────────────
    const _awards = computeAwards(G, _snap)
    G.seasonAwards = G.seasonAwards || {}
    G.seasonAwards[G.year] = _awards
    for (const award of Object.values(_awards)) {
      if (award?.name) addChronicle('Award: ' + award.label, award.name + ' — ' + award.reason, 'milestone')
    }

    // ── Reset per-season shinobi accumulators ────────────────────────────────
    G.shinobi.forEach(s => { s._seasonWins = 0; s._seasonMissions = 0; s._seasonSRankWins = 0 })

    // ── Draft order: seed by inverse standings (worst first gets pick #1) ────
    const _table = G.season?.table || {}
    const _sorted = Object.values(_table).sort((a, b) => (a.pts || 0) - (b.pts || 0))
    G.draftOrder = _sorted.map(r => r.name)
    G._draftPlayerPick = G.draftOrder.findIndex(n => n === G.vName) + 1
  }

  // Reset monthly accumulators
  G.finances.missionCommissions = { D:0, C:0, B:0, A:0, S:0 }
  G.finances.examFees = 0
  G.finances.loanFees = 0
  G.finances.scoutCostThisMonth = 0

  // When debt is enabled, the overdraft mechanic owns the negative balance (no implicit zero-floor).
  if (!G._ff_debt && G.ryo < 0) { aL('Treasury empty! Morale suffers.', 'bad'); G.morale = clamp(G.morale - 8, 0, 100); G.ryo = 0 }
  else if (G._ff_debt && G.ryo < 0) { G.morale = clamp(G.morale - 4, 0, 100) }

  // ── Diplomacy drift ──────────────────────────────────────────────────────
  G.villages.forEach(v => {
    if (Math.random() < 0.10) {
      // Mercantile villages drift toward positive rel; feared villages drift less negatively
      const fearMod = Math.floor((v.fear || 0) / 20)  // +0 to +5 dampening of negative drift
      let dir = v.personality === 'Mercantile' ? rnd(-3, 8) : v.personality === 'Isolationist' ? rnd(-3, 3) : rnd(-7, 7)
      if (dir < 0) dir = Math.min(0, dir + fearMod)  // fear reduces hostility drift
      v.rel = clamp(v.rel + dir, 0, 100)
      if (Math.abs(dir) > 4) aL('Diplomatic shift: ' + v.n + ' ' + (dir > 0 ? '+' : '') + dir + '.', 'neutral')
    }
  })

  // ── Kage events ──────────────────────────────────────────────────────────
  G.keCD = (G.keCD || 0) - 1
  if (!ui.pKE && G.keCD <= 0 && Math.random() < 0.25) {
    const ev = G.keQ.shift()
    if (ev) { ui.pKE = ev; G.keCD = rnd(4, 7); aL('Kage Event: "' + ev.n + '" — check Kage Council!', 'ev'); ntf('New Kage event!') }
    if (!G.keQ.length) G.keQ = [...KAGE_EVENTS].sort(() => Math.random() - 0.5)
  }

  // ── World choice events ───────────────────────────────────────────────────
  if (!G.pendingChoiceEvent && Math.random() < 0.06) {
    const ev = pk(WORLD_CHOICE_EVENTS)
    G.pendingChoiceEvent = ev
    if (ev.effects?.worldFlag) G.worldFlags[ev.effects.worldFlag] = rnd(3, 6)
    aL('World Event: "' + ev.n + '" — check Missions panel for response options!', 'ev')
    ntf('World Event requires response!')
  }

  // ── Regional meta shift tick ────────────────────────────────────────────────
  if (!G.regionalMeta) G.regionalMeta = {}
  REGIONS.forEach(r => {
    const active = G.regionalMeta[r.id]
    if (active) {
      active.monthsLeft--
      if (active.monthsLeft <= 0) { delete G.regionalMeta[r.id]; aL((REGION_EVENTS.find(e=>e.id===active.eventId)?.n||'Event') + ' in ' + r.n + ' has ended.', 'neutral') }
    } else if (Math.random() < 0.06) {
      const ev = pk(REGION_EVENTS)
      G.regionalMeta[r.id] = { eventId: ev.id, monthsLeft: rnd(2, 4) }
      aL(ev.icon + ' ' + ev.n + ' has begun in the ' + r.n + '. ' + ev.desc, ev.qualityMod < 0 ? 'warn' : 'good')
    }
  })

  // Scout network tick handled by tickScouts() below (Phase 1 engine)
  if (!G.scoutReports) G.scoutReports = []
  if (!G.scoutWatchlist) G.scoutWatchlist = []
  if (!G.scoutBudget) G.scoutBudget = { domestic: 40, foreign: 30, shadow: 30 }
  // Tick down urgency on scout-sourced prospects
  G.prospects.forEach(p => {
    if (p.urgencyMonths > 0) p.urgencyMonths--
  })

  // ── Annual intake (April = month 4) ───────────────────────────────────────
  if (G.month === 4 && (G.lastIntakeYear || 0) < G.year) {
    G.lastIntakeYear = G.year
    if (!G.intakeClass) G.intakeClass = []
    const acLv = G.upgrades.academy || 0
    const headSensei = (G.staff || []).find(st => st.role === 'head_sensei')
    const hsRating = headSensei?.rating || 0
    // Draft pick bonus: pick #1 gets full class, last pick gets slightly smaller class and lower base quality
    const _draftPick = G._draftPlayerPick || 3
    const _pickBonus = Math.max(0, (3 - _draftPick) * 0.08)  // #1 pick = +16%, #2 = +8%, #3+ = 0
    const classSize = rnd(8, 12) + Math.floor(acLv * 1.5)
    const prodigyIdx = Math.random() < (0.01 + _pickBonus * 0.5) * classSize ? rnd(0, classSize - 1) : -1
    for (let i = 0; i < classSize; i++) {
      const student = genStudent(acLv + (_pickBonus > 0 ? 1 : 0), hsRating)
      if (i === prodigyIdx) {
        student.potential = Math.min(99, student.potential + rnd(15, 25))
        student.trait = 'Prodigy'
        aL('A prodigy has entered the Academy this intake!', 'good')
        addChronicle('Prodigy Intake', student.fn + ' ' + student.ln + ' shows extraordinary talent.', 'shinobi')
        addLegend(5)
      }
      G.intakeClass.push(student)
    }
    aL('Annual intake: ' + classSize + ' students joined the Academy (Year ' + G.year + ').', 'good')
    ntf('New Academy intake — ' + classSize + ' students!')
  }

  // ── Mid-year walk-ins (October = month 10) ────────────────────────────────
  if (G.month === 10 && (G.lastMidIntakeYear || 0) < G.year) {
    G.lastMidIntakeYear = G.year
    if (!G.intakeClass) G.intakeClass = []
    const acLv = G.upgrades.academy || 0
    const walkInCount = rnd(2, 4)
    for (let i = 0; i < walkInCount; i++) G.intakeClass.push(genStudent(acLv, 0))
    aL(walkInCount + ' transfer students arrived mid-year.', 'neutral')
  }

  // ── Minimum prospect pool guarantee ──────────────────────────────────────
  if (G.prospects.length < 3 && G.month % 3 === 0) {
    const acLv = G.upgrades.academy || 0
    const walkIn = genStudent(acLv, 0)
    walkIn.status = 'prospect'
    G.prospects.push(walkIn)
    aL(sn(walkIn) + ' arrived at the village gates looking for a path.', 'neutral')
  }

  // ── Youth academy development tick ────────────────────────────────────────
  if (!G.intakeClass) G.intakeClass = []
  if (!G.academyRecords) G.academyRecords = {}
  if (!G.gradTracking) G.gradTracking = []
  const graduates = []
  // Peer influence: identify prodigy and low-professionalism students in the class
  const prodigyIds = G.intakeClass.filter(s => s.trait === 'Prodigy').map(s => s.id)
  const lowProfIds = G.intakeClass.filter(s => (s.pMatrix?.professionalism || 10) < 7).map(s => s.id)
  G.intakeClass.forEach(student => {
    student.monthsInClass = (student.monthsInClass || 0) + 1
    const track = DEV_TRACKS.find(t => t.id === (student.devTrack || 'balanced')) || DEV_TRACKS[0]
    const intensity = INTENSITY_LEVELS.find(i => i.id === (student.intensity || 'medium')) || INTENSITY_LEVELS[1]
    const sensei = (G.staff || []).find(st => st.id === student.sensei)
    const sensMult = sensei ? (1 + (sensei.stats.pedagogy || 8) / 40) : 1.0
    // Peer influence multiplier: prodigy in class +10%, low-professionalism classmates -5% (stacking, excludes self)
    let peerMult = 1.0
    if (prodigyIds.some(id => id !== student.id)) peerMult += 0.10
    const dragCount = lowProfIds.filter(id => id !== student.id).length
    peerMult -= dragCount * 0.05
    peerMult = clamp(peerMult, 0.6, 1.3)
    let statGain = 0
    // Growth
    const _philProspectMult = 1 + getPhilosophyMods(G).prospectGrowth
    const _trainingPct = ((G.budgetPriority?.training || 33) - 33) / 100  // 0 at 33%, ±0.67 at extremes
    const _trainingMult = 1 + _trainingPct * 0.5  // training=100% → +33.5% growth
    if (!student.burnout) {
      const growAmount = Math.round(intensity.mult * sensMult * peerMult * _philProspectMult * _trainingMult)
      // Bonus stats from track
      Object.entries(track.growBonus).forEach(([k, v]) => {
        if (student.stats[k] !== undefined) {
          const inc = Math.round(v * intensity.mult * sensMult * peerMult * 0.5)
          student.stats[k] = clamp(student.stats[k] + inc, 0, 99)
          statGain += inc
        }
      })
      // Random growth
      if (track.growRandom > 0) {
        const statKeys = Object.keys(student.stats)
        for (let i = 0; i < track.growRandom; i++) {
          const k = pk(statKeys)
          const inc = Math.round(Math.random() * growAmount)
          student.stats[k] = clamp(student.stats[k] + inc, 0, 99)
          statGain += inc
        }
      }
    } else {
      // Burnout: stat regression
      student.burnoutMonths = (student.burnoutMonths || 0) + 1
      if (Math.random() < 0.3) {
        const k = pk(Object.keys(student.stats))
        student.stats[k] = Math.max(1, student.stats[k] - 1)
      }
      if (student.burnoutMonths >= 3) {
        student.burnout = false; student.burnoutMonths = 0
        aL(sn(student) + ' has recovered from burnout.', 'neutral')
      }
    }
    // Burnout risk from high intensity
    if (!student.burnout && intensity.burnoutRisk > 0 && Math.random() < intensity.burnoutRisk / 100) {
      student.burnout = true
      student.burnoutTrait = pk(['Withdrawn', 'Anxious'])
      if (!student.traits) student.traits = []
      if (!student.traits.includes(student.burnoutTrait)) student.traits.push(student.burnoutTrait)
      aL(sn(student) + ' is burned out from intense training!', 'warn')
    }
    // Sensei style shapes personality during academy years
    if (sensei && student.pMatrix) {
      const style = senseiStyle(sensei)
      if (style === 'harsh' && Math.random() < 0.10) {
        const t = pk(['Resilient', 'Withdrawn'])
        student.pMatrix.temperament = clamp(student.pMatrix.temperament + (t === 'Resilient' ? 1 : -1), 1, 20)
        if (!student.traits) student.traits = []
        if (!student.traits.includes(t)) { student.traits.push(t); aL(sn(student) + ' grew ' + t + ' under a harsh training regimen.', t === 'Resilient' ? 'good' : 'warn') }
      } else if (style === 'nurturing' && Math.random() < 0.10) {
        const t = pk(['Loyal', 'Composed'])
        student.pMatrix.loyalty = clamp(student.pMatrix.loyalty + 1, 1, 20)
        if (!student.traits) student.traits = []
        if (!student.traits.includes(t)) { student.traits.push(t); aL(sn(student) + ' became ' + t + ' under a nurturing sensei.', 'good') }
      }
    }
    // Sensei trait pass-down (once, at 6 months) — legacy honor traits
    if (student.monthsInClass === 6 && sensei && sensei.stats.empathy >= 12 && Math.random() < 0.35) {
      const senseiTraits = ['Honorable', 'Determined', 'Analytical']
      const t = pk(senseiTraits)
      if (!student.traits) student.traits = []
      if (!student.traits.includes(t)) { student.traits.push(t); aL(sn(student) + ' adopted a ' + t + ' disposition from their sensei.', 'good') }
    }
    // Dev curve reveal — experienced sensei (pedagogy>=14) or elite head_scout judgment
    const headScoutForReveal = (G.staff || []).find(st => st.role === 'head_scout')
    const judgeRating = Math.max(sensei?.stats?.pedagogy || 0, headScoutForReveal?.stats?.perception || 0)
    if (revealDevCurve(student, judgeRating)) {
      const curve = DEV_CURVES.find(c => c.id === student.devCurve)
      aL(sn(student) + '\'s development curve was assessed: ' + (curve?.n || 'Standard') + '.', 'neutral')
    }
    // Monthly individual training report narrative
    const growthNote = statGain > 2 ? 'Strong gains this month.' : statGain > 0 ? 'Modest progress.' : student.burnout ? 'Struggling through burnout.' : 'A quiet month, little change.'
    student.trainingReports = student.trainingReports || []
    student.trainingReports.push({ year: G.year, month: G.month, text: genTrainingReport(student, sensei, growthNote) })
    if (student.trainingReports.length > 12) student.trainingReports.shift()
    // Milestones at months 3, 6, 9
    if ([3, 6, 9].includes(student.monthsInClass) && !student.milestones?.includes(student.monthsInClass)) {
      if (!student.milestones) student.milestones = []
      student.milestones.push(student.monthsInClass)
      aL(sn(student) + ' reached ' + student.monthsInClass + '-month Academy milestone.', 'neutral')
    }
    // Kage personal sparring (once per year, if G.kageTrainingUsedYear < G.year and student is flagged)
    if (student.kageTraining && (G.kageTrainingUsedYear || 0) < G.year) {
      G.kageTrainingUsedYear = G.year
      student.kageTraining = false
      const gainKey = pk(['ninjutsu','taijutsu','speed','chakra'])
      student.stats[gainKey] = clamp(student.stats[gainKey] + rnd(3, 6), 0, 99)
      student.potential = Math.min(99, student.potential + rnd(2, 5))
      aL('The Kage personally sparred with ' + sn(student) + ' — exceptional growth!', 'good')
      addLegend(2)
    }
    // Graduation at 12 months
    if (student.monthsInClass >= 12) {
      graduates.push(student)
    }
  })
  // Graduate students into prospects pool
  if (graduates.length > 0) {
    // Determine class ranking by potential for clan expectation resolution
    const classByPotential = [...G.intakeClass].sort((a, b) => b.potential - a.potential)
    graduates.forEach(student => {
      // Clan/parent expectations for clan heirs
      if (student.clan) {
        const rank = classByPotential.findIndex(s => s.id === student.id)
        const topOfClass = rank >= 0 && rank < Math.max(1, Math.ceil(classByPotential.length * 0.2))
        const bottomOfClass = rank >= 0 && rank >= classByPotential.length - Math.max(1, Math.ceil(classByPotential.length * 0.2))
        if (topOfClass) {
          const statKey = pk(Object.keys(student.stats))
          student.stats[statKey] = clamp(student.stats[statKey] + rnd(3, 6), 0, 99)
          if (student.pMatrix) student.pMatrix.loyalty = clamp(student.pMatrix.loyalty + 3, 1, 20)
          aL(student.clan + ' clan elders honor ' + sn(student) + ' for graduating top of class — clan support granted.', 'good')
        } else if (bottomOfClass) {
          if (student.pMatrix) student.pMatrix.loyalty = clamp(student.pMatrix.loyalty - 3, 1, 20)
          aL(student.clan + ' clan elders express disappointment in ' + sn(student) + '\'s graduation standing — support withdrawn.', 'bad')
        }
      }
      // Academy records check — highest graduating stat per category
      Object.entries(student.stats).forEach(([k, v]) => {
        const cur = G.academyRecords[k]
        if (!cur || v > cur.value) {
          G.academyRecords[k] = { value: v, name: sn(student), year: G.year }
          addChronicle('Academy Record', sn(student) + ' set a new academy record in ' + k + ' (' + v + ').', 'milestone')
          aL('NEW RECORD: ' + sn(student) + ' — ' + k + ' ' + v, 'good')
        }
      })
      // Post-graduation tracking entry
      G.gradTracking.push({ id: student.id, name: sn(student), gradYear: G.year, gradMonth: G.month, clan: student.clan || null })
      // Convert to proper prospect/shinobi entry
      student.status = 'prospect'
      G.prospects.push(student)
      G.intakeClass = G.intakeClass.filter(s => s.id !== student.id)
      aL(sn(student) + ' graduated from the Academy!', 'good')
    })
    addChronicle('Academy Graduation', graduates.length + ' students graduated: ' + graduates.map(s => sn(s)).join(', ') + '.', 'event')
    ntf(graduates.length + ' students graduated from the Academy!')
    addLegend(graduates.length * 2)
  }

  // ── Individual morale, commitment & people management tick ────────────────
  if (!G.meetingQueue) G.meetingQueue = []
  if (!G.sellPressure) G.sellPressure = []
  if (!G.transferMarket) G.transferMarket = { pool:[], offers:[], loanOut:[], loanIn:[], windowOpen:false, windowSeason:null, windowMonthsLeft:0 }
  if (!G.rumors) G.rumors = []
  if (!G.noticeboard) G.noticeboard = []
  if (!G.serviceAwardQueue) G.serviceAwardQueue = []
  if (!G.reviewQueue) G.reviewQueue = []

  G.shinobi.forEach(s => {
    // Backfill missing fields on old saves
    if (!s.pMatrix) s.pMatrix = { loyalty:rnd(3,18), ambition:rnd(3,18), professionalism:rnd(3,18), temperament:rnd(3,18), adaptability:rnd(3,18) }
    if (s.indMorale === undefined) s.indMorale = 70
    if (s.commitment === undefined) s.commitment = 70
    if (!s.traits) s.traits = []
    if (s.lowCommitMonths === undefined) s.lowCommitMonths = 0

    // Individual morale drifts toward village morale
    const mgap = G.morale - s.indMorale
    s.indMorale = clamp(s.indMorale + Math.round(mgap * 0.08), 0, 100)

    // Commitment decay: 1–2/month
    s.commitment = clamp(s.commitment - rnd(1, 2), 0, 100)
    // Restless ambition drains faster if not promoted
    if ((s.pMatrix.ambition || 10) >= 15 && s.ri < 3) s.commitment = clamp(s.commitment - 1, 0, 100)
    // High loyalty slows decay
    if ((s.pMatrix.loyalty || 10) >= 15) s.commitment = clamp(s.commitment + 1, 0, 100)
    // Deployment streak renews commitment
    if ((s.streak || 0) >= 2) s.commitment = clamp(s.commitment + 2, 0, 100)

    // Personality evolution: consistent winners grow Confident
    if ((s.streak || 0) >= 5 && addTrait(s, 'Confident')) {
      aL(sn(s) + ' has grown Confident after a streak of consistent success.', 'good')
      addNotice(sn(s) + ' is riding high after a string of victories.', 'good')
    }

    // Legend status: 10+ years (120 months)
    if (!s.legendStatus && s.months >= 120) {
      s.legendStatus = true
      s.commitment = clamp(s.commitment + 20, 0, 100)
      aL(sn(s) + ' is now a Village Legend — a decade of service!', 'good')
      addChronicle('Village Legend', sn(s) + ' became a legend after a decade of service.', 'shinobi')
      addNotice(sn(s) + ' has been recognized as a Village Legend.', 'good')
      addLegend(10)
      // Homegrown achievement — village-wide morale boost
      if (s.homegrown) {
        G.morale = clamp(G.morale + 5, 0, 100)
        aL('The whole village takes pride — ' + sn(s) + ' is homegrown talent.', 'good')
        addNotice(sn(s) + ', raised in our own Academy, has become a Village Legend.', 'good')
      }
    }

    // Long-service award milestones (5/10/15 years)
    SERVICE_AWARDS.forEach(award => {
      if (s.months === award.years * 12 && !G.serviceAwardQueue.find(a => a.shinobiId === s.id && a.years === award.years)) {
        G.serviceAwardQueue.push({ id: Math.random().toString(36).slice(2), shinobiId: s.id, years: award.years, year: G.year, month: G.month })
        ntf(sn(s) + ' reached ' + award.years + ' years of service — check People Management!')
      }
    })

    // Annual review (once per shinobi per year, December)
    if (G.month === 12 && s.lastReviewYear !== G.year && s.status !== 'exam') {
      s.lastReviewYear = G.year
      const expected = (s.ri + 1) * 6
      const outcome = s.wins >= expected * 1.4 ? 'exceeded' : s.wins >= expected * 0.7 ? 'met' : 'disappointed'
      G.reviewQueue.push({ id: Math.random().toString(36).slice(2), shinobiId: s.id, outcome, year: G.year })
    }

    // Meeting trigger (cooldown guard)
    s.meetingCooldown = Math.max(0, (s.meetingCooldown || 0) - 1)
    if (s.meetingCooldown === 0 && !G.meetingQueue.find(m => m.shinobiId === s.id)) {
      let mType = null
      if (s.commitment < 20) mType = 'leaving'
      else if (s.traumaStatus && Math.random() < 0.40) mType = 'grieving'
      else if (s.status === 'available' && (s.workload || 0) < 15 && s.months > 3 && Math.random() < 0.22) mType = 'underused'
      else if (s.months > 12 && s.ri < 4 && (s.pMatrix.ambition || 10) >= 13 && Math.random() < 0.18) mType = 'promotion'
      else if (s.squadId && (s.pMatrix.temperament || 10) < 7 && Math.random() < 0.15) mType = 'squad_clash'
      else if (s.wins > 0 && s.wins % 25 === 0 && Math.random() < 0.55) mType = 'milestone'
      if (mType) {
        G.meetingQueue.push({ id: Math.random().toString(36).slice(2), shinobiId: s.id, type: mType, month: G.month, year: G.year })
        s.meetingCooldown = 3
        aL(sn(s) + ' has requested a one-on-one meeting — check People Management!', 'ev')
        ntf('Meeting request: ' + sn(s))
      }
    }

    // Promotion deadline missed — personality evolution: feeling overlooked breeds resentment
    if (s.promotionDeadline && G.month >= s.promotionDeadline && G.year >= (s.promotionDeadlineYear || G.year)) {
      s.commitment = clamp(s.commitment - 15, 0, 100)
      s.indMorale = clamp(s.indMorale - 10, 0, 100)
      s.promotionDeadline = null
      aL(sn(s) + '\'s promised promotion deadline passed — they are deeply disappointed.', 'bad')
      if (addTrait(s, 'Resentful')) {
        aL(sn(s) + ' has grown Resentful after being passed over.', 'warn')
        addNotice(sn(s) + ' feels overlooked by village leadership.', 'bad')
      }
    }

    // Role guarantee breach
    if (s.roleGuarantee && s.status === 'available' && (s.workload || 0) < 10 && s.months > 1) {
      s.commitment = clamp(s.commitment - 3, 0, 100)
      s.indMorale = clamp(s.indMorale - 4, 0, 100)
    }

    // Transfer-listed fallout: awkward presence in training while unsold
    if (s.transferListed) {
      s.transferListedMonths = (s.transferListedMonths || 0) + 1
      s.indMorale = clamp(s.indMorale - 2, 0, 100)
      if (s.transferListedMonths === 1 || s.transferListedMonths % 3 === 0) {
        aL(sn(s) + ' remains an awkward presence in training, still listed for transfer.', 'warn')
        addNotice('Other shinobi have noticed ' + sn(s) + ' is still around despite requesting a transfer.', 'warn')
      }
    }

    // Rumor system: sustained low commitment surfaces rumors (early warning system)
    if (s.commitment < 35) {
      s.lowCommitMonths = (s.lowCommitMonths || 0) + 1
      const hasActiveRumor = G.rumors.some(r => r.shinobiId === s.id && !r.resolved)
      if (s.lowCommitMonths >= 2 && !hasActiveRumor && Math.random() < 0.25) {
        addRumor(s, pk(RUMOR_TEMPLATES))
        ntf('A rumor is circulating about ' + sn(s) + ' — check People Management.')
      }
    } else {
      s.lowCommitMonths = 0
    }

    // Transfer at zero commitment (loyalty check)
    if (s.commitment <= 0 && !s.legendStatus) {
      const loyRoll = s.pMatrix.loyalty || 10
      if (loyRoll < 10 && Math.random() < 0.40) {
        aL(sn(s) + ' has submitted a transfer request and left the village!', 'bad')
        G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, year: G.year, month: G.month, wins: s.wins, lastWords: 'Submitted a transfer request.', transfer: true })
        addChronicle('Transfer Departure', sn(s) + ' left the village after losing all commitment.', 'event')
        addNotice(sn(s) + ' has left the village for good.', 'bad')
        G.morale = clamp(G.morale - 4, 0, 100)
        G.shinobi = G.shinobi.filter(x => x.id !== s.id)
      }
    }
  })

  // ── Wage structure tension ──────────────────────────────────────────────────
  // A veteran who discovers a recent signing earns more than they do requests a meeting.
  const recentSignings = G.shinobi.filter(s => (s.months || 0) <= 2)
  if (recentSignings.length) {
    const topNewSalary = Math.max(...recentSignings.map(s => s.salary))
    G.shinobi.filter(s => (s.months || 0) > 24 && s.salary < topNewSalary && !G.meetingQueue.find(m => m.shinobiId === s.id)).forEach(vet => {
      const gap = topNewSalary - vet.salary
      const gapRatio = gap / Math.max(1, vet.salary)
      const chance = clamp(gapRatio * 0.5, 0, 0.6)
      if (Math.random() < chance) {
        G.meetingQueue.push({ id: Math.random().toString(36).slice(2), shinobiId: vet.id, type: 'wage_tension', month: G.month, year: G.year })
        vet.meetingCooldown = 3
        aL(sn(vet) + ' learned a new signing earns more than they do — requesting a meeting.', 'warn')
        ntf('Wage tension: ' + sn(vet))
      }
    })
  }

  // ── Dressing room harmony ──────────────────────────────────────────────────
  const harmony = computeHarmony()
  G.harmonyScore = harmony
  if (harmony > 70) G.morale = clamp(G.morale + 1, 0, 100)
  if (harmony < 40 && Math.random() < 0.28) {
    const eligible = HARMONY_EVENTS.filter(e => harmony <= e.harmonyThresh)
    const ev = eligible.length ? pk(eligible) : HARMONY_EVENTS[0]
    G.morale = clamp(G.morale + ev.morale, 0, 100)
    G.shinobi.forEach(s => { s.indMorale = clamp((s.indMorale || 70) + ev.indMorale, 0, 100) })
    aL('Dressing Room: "' + ev.n + '" — ' + ev.desc, 'bad')
    addChronicle('Dressing Room Crisis', ev.n + ': ' + ev.desc, 'event')
    addNotice(ev.n + ': ' + ev.desc, 'bad')
  }
  // Leadership group mediates after losses
  const leadershipGroup = getLeadershipGroup()
  if (harmony < 60) {
    if (leadershipGroup.filter(l => (l.pMatrix?.loyalty || 0) >= 14).length >= 2) {
      G.morale = clamp(G.morale + 2, 0, 100)
    }
  }

  // ── Group dynamics events (beyond 1-on-1 meetings) ─────────────────────────
  if (Math.random() < 0.18) {
    const rivalPairExists = G.shinobi.some(s => s.rivalId && G.shinobi.some(o => o.id === s.rivalId && o.squadId === s.squadId))
    const squadMilestone = G.squads.some(sq => sq.wins > 0 && sq.wins % 10 === 0)
    const prodigyPresent = G.shinobi.some(s => s.trait === 'Prodigy' || s.prodigy)
    const legendPresent = G.shinobi.some(s => s.legendStatus)
    const newcomerPresent = G.shinobi.some(s => (s.months || 0) <= 1)
    const eligible = GROUP_EVENTS.filter(ev => {
      if (ev.requires === 'rivals') return rivalPairExists
      if (ev.requires === 'leader') return leadershipGroup.length >= 2
      if (ev.requires === 'squadwin') return squadMilestone
      if (ev.requires === 'lowharmony') return harmony < 50
      if (ev.requires === 'prodigy') return prodigyPresent
      if (ev.requires === 'legend') return legendPresent
      if (ev.requires === 'newcomer') return newcomerPresent
      return false
    })
    if (eligible.length) {
      const gev = pk(eligible)
      G.morale = clamp(G.morale + gev.moraleMod, 0, 100)
      G.harmonyScore = clamp((G.harmonyScore || 70) + gev.harmonyMod, 0, 100)
      G.shinobi.forEach(s => { s.indMorale = clamp((s.indMorale || 70) + gev.indMoraleMod, 0, 100) })
      aL(gev.icon + ' ' + gev.n + ' — ' + gev.desc, gev.kind === 'good' ? 'good' : gev.kind === 'bad' ? 'bad' : 'neutral')
      addChronicle(gev.n, gev.desc, 'event')
      addNotice(gev.icon + ' ' + gev.desc, gev.kind === 'good' ? 'good' : gev.kind === 'bad' ? 'bad' : 'neutral')
    }
  }

  // ── Transfer window tick ────────────────────────────────────────────────────
  const tw = TRANSFER_WINDOWS.find(w => w.month === G.month)
  if (tw && !G.transferMarket.windowOpen) {
    G.transferMarket.windowOpen = true
    G.transferMarket.windowSeason = tw.id
    G.transferMarket.windowMonthsLeft = tw.duration
    G.transferMarket.pool = genTransferPool()
    aL(tw.icon + ' ' + tw.n + ' is now open — browse available shinobi!', 'ev')
    ntf(tw.n + ' open!')
  }
  if (G.transferMarket.windowOpen) {
    G.transferMarket.windowMonthsLeft = Math.max(0, G.transferMarket.windowMonthsLeft - 1)
    G.transferMarket.pool.forEach(p => { p.monthsAvailable = Math.max(0, (p.monthsAvailable || 1) - 1) })
    G.transferMarket.pool = G.transferMarket.pool.filter(p => p.monthsAvailable > 0)
    // Deadline pressure: final month of the window escalates everything
    G.transferMarket.deadlinePressure = G.transferMarket.windowMonthsLeft <= 1
    if (G.transferMarket.deadlinePressure) {
      G.transferMarket.pool.forEach(p => {
        if (!p.deadlineInflated) {
          p.askingFee = Math.round(p.askingFee * (1 + rnd(10, 20) / 100))
          p.deadlineInflated = true
        }
      })
      // Panic signings: rival villages snap up remaining pool entries, visible in the log
      if (Math.random() < 0.30 && G.transferMarket.pool.length > 0) {
        const victim = pk(G.transferMarket.pool)
        const rivalV = pk(G.villages)
        G.transferMarket.pool = G.transferMarket.pool.filter(p => p.id !== victim.id)
        aL('📰 Deadline panic: ' + (rivalV?.n || 'a rival village') + ' signed ' + sn(victim) + ' in a late rush.', 'warn')
        addNotice('Deadline-day panic signing: ' + sn(victim) + ' has joined ' + (rivalV?.n || 'a rival village') + '.', 'warn')
      }
    }
    if (G.transferMarket.windowMonthsLeft <= 0) {
      G.transferMarket.windowOpen = false
      G.transferMarket.windowSeason = null
      G.transferMarket.deadlinePressure = false
      aL('Transfer window closed. Market resets next season.', 'neutral')
    }
  }

  // ── Sell pressure (rival villages approach your shinobi) ───────────────────
  G.sellPressure = (G.sellPressure || []).filter(sp => {
    const stillValid = !(sp.expiresYear < G.year || (sp.expiresYear === G.year && sp.expiresMonth <= G.month))
    return stillValid
  })
  if (Math.random() < 0.10 && G.shinobi.length > 0) {
    const targets = G.shinobi.filter(s => (s.ri >= 2 || s.wins >= 20) && !s.noTrade && !G.sellPressure.find(sp => sp.shinobiId === s.id))
    if (targets.length > 0) {
      const target = pk(targets)
      const village = pk(G.villages)
      const offer = Math.round(target.salary * rnd(12, 24))
      G.sellPressure.push({ shinobiId: target.id, villageName: village.n, offerRyo: offer, expiresMonth: G.month + 2, expiresYear: G.year + (G.month > 10 ? 1 : 0) })
      aL(village.n + ' has approached ' + sn(target) + ' with a transfer offer of ' + fmt(offer) + ' ryo!', 'ev')
      ntf(village.n + ' wants ' + sn(target) + '!')
    }
  }

  // ── Loan tick ──────────────────────────────────────────────────────────────
  const tm = G.transferMarket
  // Loans out (our shinobi sent away)
  tm.loanOut = (tm.loanOut || []).filter(lo => {
    lo.monthsRemaining = Math.max(0, (lo.monthsRemaining || 1) - 1)
    G.ryo += lo.monthlyFee || 0
    if (lo.monthsRemaining <= 0) {
      const s = G.shinobi.find(x => x.id === lo.shinobiId)
      if (s) { s.status = 'available'; s.commitment = clamp((s.commitment || 70) - 5, 0, 100) }
      aL((s ? sn(s) : 'Loaned shinobi') + ' returned from loan.', 'neutral')
      return false
    }
    return true
  })
  // Loans in (borrowed shinobi)
  tm.loanIn = (tm.loanIn || []).filter(li => {
    li.monthsRemaining = Math.max(0, (li.monthsRemaining || 1) - 1)
    G.ryo -= li.monthlyCost || 0
    if (li.monthsRemaining <= 0) {
      G.shinobi = G.shinobi.filter(s => s.id !== li.shinobiId)
      aL((li.shinobiName || 'Loan player') + ' returned to their village.', 'neutral')
      return false
    }
    return true
  })

  // ── Bingo Book tick ────────────────────────────────────────────────────────
  G.shinobi.forEach(s => {
    if (!s.bingoBookPresence && (s.ri >= 4 || (s.winsS || 0) >= 3)) {
      s.bingoBookPresence = 1
      aL(sn(s) + ' has been listed in the Bingo Book!', 'warn')
    }
    if (!s.bingoBookPresence) return
    if (s.bingoBookSuppressed && Math.random() < 0.14) s.bingoBookSuppressed = false
    if (!s.bingoBookSuppressed) {
      const bTier = BINGO_TIERS[Math.min(s.bingoBookPresence, BINGO_TIERS.length - 1)]
      addLegend(bTier.prestigeBonus)
      if (Math.random() < bTier.assasRisk) {
        aL('⚠ Assassination attempt on ' + sn(s) + '! (Bingo Book: ' + bTier.n + ')', 'bad')
        if (Math.random() < 0.30) {
          const injType = pickInjuryType(s.ri >= 4 ? 'S' : 'A')
          if (injType) { applyInjury(s, injType, hL); aL(sn(s) + ' was injured in the assassination attempt.', 'bad') }
        }
      }
    }
  })

  // ── Prodigy event (1% per month in rfP) — handled in rfP ────────────────
  if (G.tempDef > 0) G.tempDef = Math.max(0, G.tempDef - 5)
  if (G.examSched && G.month === G.examMonth) { aL('Chunin Exam is now! Go to Exam panel.', 'ev'); ntf('Chunin Exam!') }

  // ── Nation War — annual marquee at year-end ───────────────────────────────
  if (G.month === 12 && !G.warActive && G.warDoneYear !== G.year) {
    G.warSched = true
    aL('🏯 The Nation War mobilizes! The great powers prepare to clash. Muster your elite in the Nation War tab.', 'ev')
    ntf('Nation War mobilizing!')
  }

  // ── Prestige tier tick ──────────────────────────────────────────────────────
  const PTIERS = [{ id:'D', min:0 }, { id:'C', min:50 }, { id:'B', min:150 }, { id:'A', min:300 }, { id:'S', min:500 }]
  const newPTier = [...PTIERS].reverse().find(t => (G.legend || 0) >= t.min)?.id || 'D'
  if (newPTier !== G.prestigeTier) {
    const was = G.prestigeTier; G.prestigeTier = newPTier
    addChronicle('Prestige Milestone', `${G.vName} has risen to Prestige Tier ${newPTier} (from ${was}). Legend: ${G.legend}.`, 'milestone')
    aL('Village prestige: Tier ' + newPTier + '!', 'good')
  }
  if (G.dynastyRecords) G.dynastyRecords.peakLegend = Math.max(G.dynastyRecords.peakLegend || 0, G.legend || 0)

  // ── Kage reputation tick ────────────────────────────────────────────────────
  if (!G.kageRep) G.kageRep = 1
  const repScore = (G.reputation || 0)
  const legendScore = (G.legend || 0)
  // Kage rep target: weighted blend of rep score + legend tier (so a Legendary village can't stay at ★☆☆☆☆)
  const legendBonus = legendScore >= 500 ? 2 : legendScore >= 300 ? 1 : legendScore >= 150 ? 1 : 0
  const targetRep = clamp((repScore >= 250 ? 5 : repScore >= 150 ? 4 : repScore >= 80 ? 3 : repScore >= 30 ? 2 : 1) + legendBonus, 1, 5)
  if (G.kageRep < targetRep && Math.random() < 0.3) G.kageRep = Math.min(5, G.kageRep + 1)
  if (G.kageRep > targetRep && Math.random() < 0.15) G.kageRep = Math.max(1, G.kageRep - 1)

  // ── Hall of Legends — check retiring shinobi ────────────────────────────────
  // ── Dynasty milestone notifications ────────────────────────────────────────
  if (G.year === DYNASTY_YEARS && G.month === 1 && !G.dynastyComplete) {
    const { grade } = computeDynastyGrade(G)
    aL(`Year ${DYNASTY_YEARS} reached — dynasty clock complete. Grade ${grade}. Go to Legacy → Dynasty to pass the torch.`, 'good')
    ntf(`Dynasty year ${DYNASTY_YEARS} — pass the torch in Legacy panel!`)
  }

  if (!G.hallOfLegends) G.hallOfLegends = []
  G.shinobi.filter(s => s.status === 'retired' && !s.enshrined).forEach(s => {
    if ((s.months || 0) >= 120 && (s.wins || 0) >= 100 && (s.ri || 0) >= 3) {
      G.hallOfLegends.push({
        id: s.id, name: sn(s), ri: s.ri, months: s.months,
        wins: s.wins, winsS: s.winsS, monthEnshrined: (G.year - 1) * 12 + G.month,
      })
      s.enshrined = true
      if (G.dynastyRecords) G.dynastyRecords.enshrined = G.hallOfLegends.length
      const passiveBonus = Math.min(G.hallOfLegends.length * 200, 2000)
      G.ryo += passiveBonus
      addChronicle('Hall of Legends', `${sn(s)} has been enshrined in the Hall of Legends. ${G.hallOfLegends.length} legends total. (+${passiveBonus} ryo legacy bonus)`, 'milestone')
      aL(sn(s) + ' enshrined in Hall of Legends!', 'good')
    }
  })

  // ── Generational legacy summary (every 10 years) ────────────────────────────
  if (G.year >= 10 && G.month === 1 && G.year % 10 === 0) {
    const devScore = clamp(Math.floor(((G.upgrades?.academy || 0) + (G.upgrades?.hospital || 0) + (G.upgrades?.training || 0)) / 9 * 100), 0, 100)
    const dipScore = clamp(Math.floor(G.villages.filter(v => v.allied).length / G.villages.length * 100 + G.reputation / 10), 0, 100)
    const milScore = clamp(Math.floor(((G.dynastyRecords?.examWins || 0) * 10) + G.shinobi.filter(s => s.ri >= 4).length * 5), 0, 100)
    const legScore = clamp(Math.floor((G.hallOfLegends?.length || 0) * 10 + (G.legend || 0) / 10), 0, 100)
    const overall = Math.round((devScore + dipScore + milScore + legScore) / 4)
    const grade = overall >= 85 ? 'S' : overall >= 70 ? 'A' : overall >= 55 ? 'B' : overall >= 40 ? 'C' : 'D'
    G.generationalSummary = { year: G.year, grade, devScore, dipScore, milScore, legScore, overall }
    addChronicle('Generational Legacy — Year ' + G.year,
      `[${grade}] Development:${devScore} Diplomacy:${dipScore} Military:${milScore} Legacy:${legScore} — Overall:${overall}/100`,
      'milestone')
    aL('Year ' + G.year + ' generational report: Grade ' + grade, 'good')
  }

  // ── Intel report expiry ─────────────────────────────────────────────────────
  if (G.intelReports) {
    const now = (G.year - 1) * 12 + G.month
    G.intelReports = G.intelReports.filter(r => r.expiresMonth > now)
  }

  // ── ANBU ops tick ───────────────────────────────────────────────────────────
  if (!G.anbuOps) G.anbuOps = []
  G.anbuOps = G.anbuOps.filter(op => {
    op.monthsLeft = (op.monthsLeft || 1) - 1
    if (op.monthsLeft > 0) return true
    // Op complete
    const anbuCmd = (G.staff || []).find(st => st.role === 'anbu_commander')
    const cmdRating = anbuCmd ? (anbuCmd.stats?.stealth || 8) : 5
    const targetV = (G.villages || []).find(v => v.id === op.targetVillageId)
    const targetCi = targetV?.counterIntel || 5
    const catchChance = clamp((targetCi - cmdRating) * 0.04 + op.catchRisk, 0.05, 0.80)
    if (Math.random() < catchChance) {
      // Caught!
      const status = Math.random() < 0.4 ? 'KIA' : 'imprisoned'
      G.caughtAnbu = G.caughtAnbu || []
      G.caughtAnbu.push({ id: op.id, targetVillageId: op.targetVillageId, month: (G.year - 1) * 12 + G.month, status })
      if (targetV) targetV.rel = clamp((targetV.rel || 50) - 12, 0, 100)
      aL(`ANBU agent caught by ${targetV?.n || 'enemy'} — ${status}.`, 'bad')
      addChronicle('ANBU Incident', `Our ${op.type} operative was ${status} by ${targetV?.n || 'enemy forces'}.`, 'bad')
    } else {
      // Success — generate intel report
      const now2 = (G.year - 1) * 12 + G.month
      const reportData = {}
      if (op.type === 'recon') {
        reportData.rosterSize = rnd(5, 20); reportData.economyLevel = rnd(1, 5)
      } else if (op.type === 'deep_cover') {
        reportData.defenseRating = rnd(1, 20); reportData.activeSquads = rnd(1, 5)
      } else if (op.type === 'assn_intel') {
        reportData.kageRating = rnd(1, 20); reportData.weaknesses = pk(['chakra overuse', 'defensive gaps', 'low morale'])
      }
      G.intelReports = G.intelReports || []
      G.intelReports.push({ villageId: op.targetVillageId, type: op.type, data: reportData, expiresMonth: now2 + 3 })
      aL(`ANBU ${op.type} on ${targetV?.n || 'target'} complete.`, 'good')
    }
    return false
  })

  // ── War arc tick ────────────────────────────────────────────────────────────
  if (G.warState) {
    G.warState.monthsLeft = (G.warState.monthsLeft || 1) - 1
    const warV = (G.villages || []).find(v => v.id === G.warState.villageId)
    if (G.warState.phase === 'mobilization') {
      aL('War mobilization with ' + (warV?.n || 'enemy') + ' continues.', 'warn')
      if (G.warState.monthsLeft <= 0) { G.warState.phase = 'conflict'; G.warState.monthsLeft = 3 }
    } else if (G.warState.phase === 'conflict') {
      // Monthly combat exchange
      const myStr = G.shinobi.filter(s => s.status === 'available').length * 5 + (G.upgrades?.wall || 0) * 10
      const theirStr = rnd(20, 60)
      if (myStr >= theirStr) {
        G.reputation = clamp(G.reputation + 3, 0, 999); addLegend(2)
        G.warState.playerWins = (G.warState.playerWins || 0) + 1
        aL('Combat exchange victory vs ' + (warV?.n || 'enemy') + '.', 'good')
      } else {
        G.morale = clamp(G.morale - 5, 0, 100)
        G.warState.playerLosses = (G.warState.playerLosses || 0) + 1
        aL('Combat exchange loss vs ' + (warV?.n || 'enemy') + '.', 'bad')
      }
      if (G.warState.monthsLeft <= 0) { G.warState.phase = 'ceasefire'; G.warState.monthsLeft = 1 }
    } else if (G.warState.phase === 'ceasefire') {
      aL('Ceasefire negotiations with ' + (warV?.n || 'enemy') + '.', 'neutral')
      if (G.warState.monthsLeft <= 0) { G.warState.phase = 'reparations'; G.warState.monthsLeft = 6 }
    } else if (G.warState.phase === 'reparations') {
      const tribute = rnd(1500, 4000)
      if (warV && (warV.rel || 0) < 40) {
        G.ryo += tribute
        aL((warV?.n || 'enemy') + ' pays reparations: +' + fmt(tribute) + ' ryo.', 'good')
      }
      if (G.warState.monthsLeft <= 0) {
        const playerWins = G.warState.playerWins || 0
        const playerLosses = G.warState.playerLosses || 0
        const weWon = playerWins > playerLosses
        const warEntry = { villageId: G.warState.villageId, year: G.year, weWon }
        const warDuration = (G.warState.warMonthStart ? ((G.year - 1) * 12 + G.month) - G.warState.warMonthStart : 6)
        const repChange = weWon ? 30 : -15
        const warBody = `Conflict with ${warV?.n || 'enemy'} resolved after ~${warDuration} month${warDuration !== 1 ? 's' : ''}. Our record: ${playerWins}W–${playerLosses}L. ${weWon ? 'Victory.' : 'Defeat.'} Reputation ${repChange > 0 ? '+' : ''}${repChange}.`
        const warNarrative = weWon
          ? `The conflict with ${warV?.n || 'the enemy'} ended in victory — hard-won through ${playerWins} exchange${playerWins !== 1 ? 's' : ''} across the front. The village's shinobi return changed, carrying the weight of what war demands of them.`
          : `The war against ${warV?.n || 'the enemy'} left its mark. After ${playerLosses} failed exchange${playerLosses !== 1 ? 's' : ''}, peace came not through strength but necessity. Some wounds take longer than treaties to heal.`
        addChronicle('War Concluded — ' + (warV?.n || 'Enemy'), warBody, 'war', warNarrative)
        G.warState.warHistory = G.warState.warHistory || []
        G.warState.warHistory.push(warEntry)
        if (!weWon) {
          // Loser consequences: prestige drop 2 tiers, shinobi commitment debuff, academy quality penalty
          const presOrd = ['D','C','B','A','S']
          const curOrd = presOrd.indexOf(G.prestigeTier || 'D')
          const newTier = presOrd[Math.max(0, curOrd - 2)]
          G.warConsequences = { prestigePenaltyMonths: 24, academyDebuffYears: 2, originalTier: G.prestigeTier }
          G.prestigeTier = newTier
          // Top 2 ambitious shinobi consider leaving
          const ambitious = G.shinobi.filter(s => (s.ambition || 0) >= 14 && s.status === 'available').slice(0, 2)
          ambitious.forEach(s => { s.morale = clamp((s.morale || 50) - 20, 0, 100) })
          if (ambitious.length) aL(`Defeat in war — ${ambitious.map(s => sn(s)).join(', ')} are questioning their future here.`, 'bad')
          aL(`Defeat: prestige dropped to ${newTier}. Academy intake quality penalised for 2 years.`, 'bad')
          addLegend(-15)
        } else {
          // Winner bonus
          addLegend(20); G.reputation = clamp(G.reputation + 30, 0, 999)
          aL(`War victory vs ${warV?.n || 'enemy'} — prestige and legend boosted.`, 'good')
        }
        G.warState = null
      }
    }
  }

  // ── Five Kage Summit tick (month 6 each year) ───────────────────────────────
  if (G.month === 6) {
    const prestige = G.prestigeTier || 'D'
    const presOrd = { D:0, C:1, B:2, A:3, S:4 }
    const myOrd = presOrd[prestige] || 0
    // Pick 3 random agenda items
    const SUMMIT_AGENDA = [
      { id:'trade_pact', n:'Regional Trade Pact', minVotes:3, effect:'ryo_bonus' },
      { id:'war_ban', n:'War Moratorium', minVotes:4, effect:'peace' },
      { id:'missing_bounty', n:'Missing-Nin Bounties', minVotes:2, effect:'bounty' },
      { id:'beast_protocol', n:'Tailed Beast Protocol', minVotes:3, effect:'beast_truce' },
      { id:'exam_expand', n:'Expand Chunin Exam', minVotes:3, effect:'exam_expand' },
    ]
    const items = [...SUMMIT_AGENDA].sort(() => Math.random() - 0.5).slice(0, 3)
    const results = []
    items.forEach(item => {
      const myVote = myOrd >= 2 ? 1 : (Math.random() < 0.5 ? 1 : 0)
      const npcVotes = rnd(0, 4)
      const total = myVote + npcVotes
      const passed = total >= item.minVotes
      if (passed) {
        if (item.effect === 'ryo_bonus') { G.ryo += 1500; aL('Summit: Trade Pact passed — +1,500 ryo/mo bonus.', 'good') }
        if (item.effect === 'bounty') { G.worldFlags.missingNinBounty = ((G.year - 1) * 12 + G.month) + 3 }
        if (item.effect === 'exam_expand') { G.worldFlags.examExpanded = true }
      }
      results.push({ item: item.n, passed, myVote })
    })
    G.summitHistory = G.summitHistory || []
    const blocEntry = G.pendingSummitFavor ? G.pendingSummitFavor.villageName : null
    G.summitHistory.push({ year: G.year, results, blocAligned: blocEntry })
    if (G.pendingSummitFavor) {
      // Owe a favor — slight rel penalty with bloc village (can't say no to them easily)
      const blocV = (G.villages || []).find(v => v.n === G.pendingSummitFavor.villageName)
      if (blocV) blocV.rel = clamp((blocV.rel || 50) - 5, 0, 100)
      aL('Favor owed to ' + G.pendingSummitFavor.villageName + ' from summit alignment. Their standing with you has grown complicated.', 'warn')
      G.pendingSummitFavor = null
    }
    addChronicle('Five Kage Summit Y' + G.year, results.map(r => `${r.item}: ${r.passed ? 'PASSED' : 'FAILED'}`).join('; ') + (blocEntry ? ` [Bloc: ${blocEntry}]` : ''), 'event')
    aL('Five Kage Summit completed. Check chronicles for results.', 'neutral')
  }

  // ── S-rank contract rotation (month 1, 4, 7, 10) ───────────────────────────
  if ([1, 4, 7, 10].includes(G.month)) {
    const SCONTRACTS = [
      { id:'escort_kage', n:'Escort the Five Kage', baseRyo:35000, rep:50, prestige:15, risk:0.45 },
      { id:'seal_bijuu', n:'Seal a Rampaging Beast', baseRyo:40000, rep:60, prestige:20, risk:0.50 },
      { id:'fortress', n:'Destroy Enemy Fortress', baseRyo:28000, rep:40, prestige:10, risk:0.40 },
      { id:'assn_warlord', n:'Assassinate a Warlord', baseRyo:32000, rep:45, prestige:12, risk:0.48 },
      { id:'rescue_dipl', n:'Rescue Captured Diplomat', baseRyo:25000, rep:35, prestige:8, risk:0.35 },
    ]
    G.sRankContracts = [...SCONTRACTS].sort(() => Math.random() - 0.5).slice(0, 2).map(c => ({
      ...c, bids: [], deadline: (G.year - 1) * 12 + G.month + 3,
    }))
  }

  // ── War arc lasting consequences ──────────────────────────────────────────
  if (!G.warState && G.warConsequences) {
    // Tick down war consequence effects
    if (G.warConsequences.academyDebuffYears > 0) G.warConsequences.academyDebuffYears--
    if (G.warConsequences.prestigePenaltyMonths > 0) {
      G.warConsequences.prestigePenaltyMonths--
      if (G.warConsequences.prestigePenaltyMonths <= 0) {
        G.warConsequences = null
        aL('War consequences have faded — prestige penalty lifted.', 'neutral')
      }
    }
  }

  // ── Summit pre-approach (month 5 — bloc offer before summit in month 6) ─────
  if (G.month === 5 && !G.summitBlocOffer && Math.random() < 0.5) {
    const SUMMIT_ITEMS = ['Regional Trade Pact','War Moratorium','Missing-Nin Bounties','Expand Chunin Exam']
    const approachingVillage = pk(G.villages || [])
    if (approachingVillage) {
      G.summitBlocOffer = {
        villageName: approachingVillage.n,
        agendaItem: pk(SUMMIT_ITEMS),
      }
      aL(approachingVillage.n + ' has proposed a summit voting alliance. Check the Exam → Summit tab.', 'warn')
    }
  }
  // Clear stale bloc offer after summit
  if (G.month === 7) G.summitBlocOffer = null

  // ── Per-Kage relations drift ───────────────────────────────────────────────
  if (!G.kageRelations) G.kageRelations = {};
  (G.villages || []).forEach(v => {
    if (!G.kageRelations[v.id]) G.kageRelations[v.id] = { villageName: v.n, rep: 50, lastEvent: null }
    const kr = G.kageRelations[v.id]
    // Drift toward village-level rel slowly
    const targetRel = v.rel || 50
    kr.rep = clamp(kr.rep + (targetRel > kr.rep ? 1 : -1), 0, 100)
  })

  // ── Legacy decisions (year 5+, every 3 years, random trigger) ────────────
  if (G.year >= 5 && G.month === 3 && !G.legacyDecisionPending) {
    const lastLegacyYear = (G.legacyDecisionHistory || []).slice(-1)[0]?.year || 0
    if (G.year - lastLegacyYear >= 3 && Math.random() < 0.6) {
      const used = (G.legacyDecisionHistory || []).map(d => d.id)
      const available = LEGACY_DECISIONS.filter(d => !used.includes(d.id))
      if (available.length) {
        G.legacyDecisionPending = pk(available)
        aL('A legacy moment has arisen. Check the Legacy panel.', 'warn')
      }
    }
  }

  // ── Successor development tracking ────────────────────────────────────────
  if (G.successorId) {
    const s = G.shinobi.find(x => x.id === G.successorId) || G.staff?.find(x => x.id === G.successorId)
    if (s) {
      // Each month successor is active, +1 continuity score
      G.dynastyContinuityScore = (G.dynastyContinuityScore || 0) + 1
      // If on mission → extra +1
      if (s.status === 'mission' || s.role) G.dynastyContinuityScore++
    } else {
      // Successor retired/gone — auto-clear
      G.successorId = null; G.successorType = null
      aL('Your designated successor has left the village. Appoint a new one in the Legacy panel.', 'warn')
    }
  }

  // ── Rival Kage relationship tick ──────────────────────────────────────────
  ensureKageRels(G)
  tickKageRels(G)
  G.worldReputationFlavor = getWorldReputationFlavor(G)

  // ── Tailed Beast monthly tick ─────────────────────────────────────────────
  applyBeastPairEffects(G)
  G.beasts.forEach(b => {
    const beastEvents = tickBeast(b, G)
    beastEvents.forEach(ev => {
      aL(ev.title + ': ' + ev.body.slice(0, 120) + (ev.body.length > 120 ? '…' : ''), ev.type === 'legend' ? 'good' : ev.type === 'lore' ? 'good' : ev.type === 'bad' || ev.type === 'critical' ? 'bad' : ev.type === 'warn' ? 'warn' : 'neutral')
      if (ev.type === 'legend') { addChronicle(ev.title, ev.body, 'legend', ev.narrative || null); addLegend(10) }
      if (ev.type === 'lore')   addChronicle(ev.title, ev.body, 'lore', ev.narrative || null)
    })
  })
  // Bloodline active-window expiry → post-use debuff (v2, flag-gated)
  if (G._ff_bloodlineActive) {
    G.beasts.forEach(b => {
      if (b.activeUntil && G.month >= b.activeUntil) {
        const jk = G.shinobi.find(s => s.id === b.jk)
        if (jk) jk._blDebuffUntil = G.month + DEBUFF_DURATION
        b.activeUntil = null
      }
    })
  }
  // Apply mission luck passive from beasts (Hanaku, etc.)


  // ── Beast extraction attempts by rival villages ───────────────────────────
  G.beasts.filter(b => b.sealed && b.jk).forEach(b => {
    if (!b._sealedMonth) b._sealedMonth = G.month
    const monthsSealed = (b.syncMonths || 0)
    // Extraction attempts begin 1-3 months after sealing, random trigger ~15% monthly chance
    if (monthsSealed >= 1 && monthsSealed <= 6 && Math.random() < 0.15) {
      const aggressors = G.villages.filter(v => v.personality === 'Aggressive' || v.personality === 'Militant')
      const attacker = aggressors.length ? pk(aggressors) : pk(G.villages)
      if (!attacker) return
      const extractStr = 40 + rnd(0, 30)
      const wD = (G.upgrades?.wall === 1 ? 15 : G.upgrades?.wall === 2 ? 35 : 0) + (G.upgrades?.seal === 1 ? 10 : G.upgrades?.seal === 2 ? 25 : 0) + (G.counterIntelRating || 2) + (G.reputation >= 60 ? 10 : 0)
      const defShinobi = G.shinobi.filter(s => s.status === 'available' && s.ri >= 2)
      const defPow = defShinobi.length ? Math.max(...defShinobi.map(s => sPow(s))) : 0

      if (defPow + wD >= extractStr) {
        aL(`⚠ Extraction squad from ${attacker.n} attempted to seize ${b.n}! They were repelled.`, 'warn')
        G.reputation = clamp(G.reputation + 3, 0, 999)
        attacker.rel = clamp((attacker.rel || 50) - 10, 0, 100)
        addChronicle(`Extraction Repelled — ${b.n}`, `${attacker.n} dispatched an extraction team targeting ${b.n}'s Jinchuriki. Village defenses held.`, 'war')
      } else {
        aL(`⚠ Extraction raid from ${attacker.n} penetrated defenses! ${b.n}'s Jinchuriki was threatened — seal barely held.`, 'bad')
        G.morale = clamp(G.morale - 8, 0, 100)
        G.reputation = clamp(G.reputation - 5, 0, 999)
        const jk = G.shinobi.find(s => s.id === b.jk)
        if (jk) { jk.injDays = Math.max(jk.injDays || 0, 2); jk.status = 'injured' }
        addChronicle(`Extraction Breach — ${b.n}`, `${attacker.n} extraction agents breached the village. ${b.n}'s Jinchuriki was injured in the struggle.`, 'war')
      }
      ntf(`Extraction attempt on ${b.n}!`)
    }
  })

  // Reset monthly beast ability flags
  G._hanakuLuckyUsed = false

  // ── Phase 1 engine ticks ──────────────────────────────────────────────────
  tickScouts(G)
  tickProspects(G)
  tickCareers(G)          // ages shinobi annually (Dec only), updates phases + declineMod
  refreshMissionBoard(G)  // prune expired missions, inject contextual + chain missions
  maybeSpawnChain(G)      // 8% chance to spawn a new mission chain
  evalDepth(G)            // detect depth gaps, flag emergency call-ups

  // ── Phase 4 ticks ─────────────────────────────────────────────────────────
  _tickContracts(G)
  _tickSeniorGroup(G)
  _tickDevLoans(G)
  _tickAnalyticsSnapshot(G)

  syncToServer(); rfM(); rfP()
  G.month++; if (G.month > 12) { G.month = 1; G.year++; addChronicle('New Year', 'Year ' + G.year + ' begins. Legend: ' + G.legend + '. Shinobi: ' + G.shinobi.length + '.', 'event') }
  upUI(); ntf('Month advanced → Y' + G.year + ' M' + G.month)
}

// ── Bond bonus for squad missions ────────────────────────────────────────
function _squadBondBonus(sq) {
  let bonus = 0
  const members = sq.members.map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
  members.forEach(m => {
    if (!m.bonds) return
    m.bonds.forEach(bnd => {
      if (sq.members.includes(bnd.otherId)) {
        if (bnd.type === 'Brothers-in-Arms') bonus += 0.03
        else if (bnd.type === 'Mentor/Student') bonus += 0.04
        else if (bnd.type === 'Rivals') bonus += 0.02
      }
    })
  })
  return Math.min(bonus, 0.12) // cap at +12%
}

export function resRaid() {
  if (!G.raid || G.raid.resolved) return
  const hL = G.upgrades.hospital
  const isobu = G.beasts?.find(b => b.n === 'Tairyuu' && b.sealed && b.jk)
  const isobuBonus = (isobu && getSyncStage(isobu) >= (BEAST_DATA['Tairyuu']?.uniqueAbility?.stage ?? 99)) ? 30 : 0
  const wD = (G.upgrades.wall === 1 ? 15 : G.upgrades.wall === 2 ? 35 : 0) + (G.upgrades.seal === 1 ? 10 : G.upgrades.seal === 2 ? 25 : 0) + (G.tempDef || 0) + isobuBonus
  const def = G.defSh ? G.shinobi.find(s => s.id === G.defSh) : null
  const jkB = G.beasts.filter(b => b.sealed && b.jk && G.shinobi.find(s => s.id === b.jk && s.status !== 'mission')).reduce((a, b) => a + Math.round(b.pow * 0.3), 0)
  const dP = (def ? sPow(def) * 3 : 0) + wD + jkB
  if (dP >= G.raid.str) {
    G.ryo += G.raid.ryo; G.reputation = clamp(G.reputation + G.raid.rep, 0, 999); G.morale = clamp(G.morale + 5, 0, 100)
    aL(G.raid.n + ' repelled! +' + fmt(G.raid.ryo) + ' ryo.', 'good')
    if (def) { def.wins++; def.status = 'available' }
  } else {
    const loss = Math.round(G.ryo * 0.15)
    G.ryo = clamp(G.ryo - loss, 0, Infinity); G.reputation = clamp(G.reputation - G.raid.rep, 0, 999); G.morale = clamp(G.morale - 15, 0, 100)
    aL(G.raid.n + ' breached! Lost ' + fmt(loss) + ' ryo.', 'bad')
    if (def) {
      if (hL < 1 && Math.random() < 0.2) {
        G.memorial.push({ name: sn(def), rank: ['Genin','Chunin','Jonin','ANBU','S-Rank'][def.ri], clan: def.clan, mission: 'Village Defense', year: G.year, month: G.month, wins: def.wins, lastWords: '"The village... I held the line."' })
        aL(sn(def) + ' fell defending the village.', 'bad')
        G.shinobi = G.shinobi.filter(s => s.id !== def.id)
      } else {
        def.injDays = rnd(1, 3); def.status = 'injured'; def.missId = null
      }
    }
  }
  G.raid.resolved = true; G.defSh = null
}

// ── Post-mission contribution scorer (Phase 4) ────────────────────────────────
function _buildMissionReport(sq, m, succeeded) {
  const ROLE_PRIMARY = { vanguard:'taijutsu', support:'ninjutsu', intel:'stealth', medical:'chakra', flex:null }
  const ROLE_SECONDARY = { vanguard:'speed', support:'chakra', intel:'intelligence', medical:'intelligence', flex:null }
  const scores = sq.members.map(id => {
    const s = G.shinobi.find(x => x.id === id)
    if (!s) return null
    const roleId = s.squadRole || 'flex'
    const p1 = ROLE_PRIMARY[roleId], p2 = ROLE_SECONDARY[roleId]
    const statVal = p1 ? ((s.stats[p1] || 0) * 0.65 + (s.stats[p2] || 0) * 0.35) : (Object.values(s.stats).reduce((a,b)=>a+b,0)/6)
    // Normalize vs mission rank baseline
    const baseline = { D:20, C:30, B:45, A:60, S:75 }[m.rk] || 40
    const ratio = statVal / baseline
    const grade = ratio >= 1.3 ? 'A' : ratio >= 1.0 ? 'B' : ratio >= 0.75 ? 'C' : 'D'
    const detail = grade === 'A' ? 'Exceptional' : grade === 'B' ? 'Solid' : grade === 'C' ? 'Below par' : 'Poor showing'
    return { id: s.id, name: sn(s), role: roleId, grade, detail, statVal: Math.round(statVal) }
  }).filter(Boolean)
  return { missionId: m.id, missionName: m.n, missionRk: m.rk, squadId: sq.id, squadName: sq.n, succeeded, year: G.year, month: G.month, scores }
}

// ── Phase 4 tick functions ─────────────────────────────────────────────────────

function _tickContracts(G) {
  if (!G.contractRenewalQueue) G.contractRenewalQueue = []
  G.shinobi.forEach(s => {
    if (!s.contractEnd) {
      // Backfill for existing shinobi
      s.contractEnd = G.year + rnd(1, 3)
    }
    if (s.contractRenewing) return  // already in queue

    const yearsLeft = s.contractEnd - G.year
    if (yearsLeft === 1 && G.month === 6) {
      // 6 months out — trigger renewal dialogue
      const perfMult = (s.wins || 0) >= 30 ? 1.4 : (s.wins || 0) >= 15 ? 1.2 : (s.wins || 0) >= 5 ? 1.05 : 1.0
      const demandSalary = Math.round(s.salary * perfMult * (1 + (s.ri * 0.1)))
      s.contractRenewing = true
      G.contractRenewalQueue.push({ shinobiId: s.id, demandSalary, year: G.year, month: G.month })
      aL(`${sn(s)}'s contract expires next year — they want ${fmt(demandSalary)} ryo/month to renew.`, 'warn')
    }
    if (G.year >= s.contractEnd && G.month === 1 && !s.contractRenewing) {
      // Contract lapsed without renewal action
      s.commitment = clamp((s.commitment || 60) - 20, 0, 100)
      s.transferListed = true
      aL(`${sn(s)}'s contract has expired. They're seeking a move.`, 'warn')
    }
  })
}

function _tickSeniorGroup(G) {
  // Top 3 shinobi by combined wins + commitment with 12+ months tenure
  const eligible = G.shinobi
    .filter(s => (s.months || 0) >= 12 && s.status !== 'retired')
    .sort((a, b) => ((b.wins || 0) + (b.commitment || 50)) - ((a.wins || 0) + (a.commitment || 50)))
    .slice(0, 3)

  G.seniorGroup = eligible.map(s => s.id)

  // Senior group morale: average commitment of group members
  if (eligible.length > 0) {
    const avgCommit = eligible.reduce((sum, s) => sum + (s.commitment || 50), 0) / eligible.length
    G.seniorGroupMorale = Math.round(avgCommit)
    // Senior group morale bleeds into village morale
    if (G.seniorGroupMorale < 40) {
      G.morale = clamp(G.morale - 2, 0, 100)
      if (!G._seniorGroupWarnedThisMonth) {
        aL('Senior group morale is critically low — unrest is spreading through the ranks.', 'warn')
        G._seniorGroupWarnedThisMonth = true
      }
    } else {
      G._seniorGroupWarnedThisMonth = false
    }
  }
}

function _tickDevLoans(G) {
  // Loaned-out Genin gain mock experience monthly
  if (!G.transferMarket?.loanOut) return
  G.transferMarket.loanOut.forEach(loan => {
    const s = G.shinobi.find(x => x.id === loan.shinobiId)
    if (!s || s.ri !== 0) return  // Genin only
    loan.devMonths = (loan.devMonths || 0) + 1
    // 30% chance per month to gain a mission win credit
    if (Math.random() < 0.30) {
      s.wins = (s.wins || 0) + 1
      s.winsB = (s.winsB || 0) + 1
      loan.winsGained = (loan.winsGained || 0) + 1
    }
    // Stat boost once every 3 months on loan
    if (loan.devMonths % 3 === 0 && sPow(s) < s.potential) {
      const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
      s.stats[k] = clamp(s.stats[k] + 1, 0, 99)
      loan.statsGained = (loan.statsGained || 0) + 1
    }
  })
}

function _tickAnalyticsSnapshot(G) {
  if (!G.analyticsHistory) G.analyticsHistory = []
  const avgPow = G.shinobi.length > 0
    ? Math.round(G.shinobi.reduce((sum, s) => sum + sPow(s), 0) / G.shinobi.length)
    : 0
  const missionWinRate = (() => {
    const recent = (G.log || []).filter(l => l.type === 'good' || l.type === 'warn').slice(-20)
    const wins   = recent.filter(l => l.type === 'good').length
    return recent.length > 0 ? Math.round(wins / recent.length * 100) : 0
  })()
  G.analyticsHistory.push({
    year: G.year, month: G.month,
    ryo: G.ryo, reputation: G.reputation,
    avgPow, rosterSize: G.shinobi.length,
    morale: G.morale, legend: G.legend,
    missionWinRate,
  })
  if (G.analyticsHistory.length > 60) G.analyticsHistory.shift()  // keep 5 years max
}

// ── No-confidence vote resolution (called from kage panel) ───────────────────
export function resolveNoConfidence(choice) {
  if (!G.noConfidenceVote) return
  G.noConfidenceVote = false
  if (choice === 'resign') {
    const { grade, score } = computeDynastyGrade(G)
    aL(`You resign as Kage. Dynasty Grade: ${grade} (${score} pts). Your legacy endures.`, 'neutral')
    addChronicle('Kage Resigned', `${G.kN || 'The Kage'} stepped down after a no-confidence vote. Dynasty Grade: ${grade}.`, 'legend')
    G.gameOver = { reason: 'resignation', grade, score, year: G.year }
    upUI(); return
  }
  // Fight the vote — costs ryo and morale, resets consecutive bad years counter
  const cost = 15000
  if (G.ryo >= cost) {
    G.ryo -= cost
    G.ownerMandate.confidence = clamp(G.ownerMandate.confidence + 20, 0, 100)
    G.ownerMandate.consecutiveBadYears = 0
    G.morale = clamp(G.morale - 10, 0, 100)
    aL(`You successfully defend your position — confidence restored to ${G.ownerMandate.confidence}. Cost: -${fmt(cost)} ryo, -10 morale.`, 'good')
    addChronicle('Vote Survived', `${G.kN || 'The Kage'} survived a no-confidence vote by rallying council support.`, 'legend')
  } else {
    aL('Not enough ryo to rally support — forced to resign.', 'bad')
    const { grade, score } = computeDynastyGrade(G)
    addChronicle('Kage Ousted', `${G.kN || 'The Kage'} was removed after losing a no-confidence vote. Dynasty Grade: ${grade}.`, 'legend')
    G.gameOver = { reason: 'ousted', grade, score, year: G.year }
  }
  upUI()
}

// ── Press Conference ─────────────────────────────────────────────────────────

export function queuePressConference(triggerId, ctx = {}) {
  if (G.pendingPress) return  // one at a time
  const q = hydrateQuestion(triggerId, ctx)
  if (!q) return

  // Auto-build ctx from live state when not supplied
  if (!ctx.rivalName && G.villages && G.villages.length) {
    const antagV = G.villages.reduce((a, b) => ((b.grudgeTicks || 0) > (a.grudgeTicks || 0) ? b : a), G.villages[0])
    if ((antagV.grudgeTicks || 0) > 0) ctx.rivalName = antagV.n
  }

  G.pendingPress = {
    id: q.id, trigger: triggerId,
    question: q.question, intro: q.intro,
    followUp: q.followUp || null,
    availableTones: q.availableTones || ['confident', 'humble', 'dismissive'],
    rivalName: ctx.rivalName || null,
  }
  G.inbox = G.inbox || []
  G.inbox.unshift({
    id: 'press_' + triggerId + '_' + G.year + '_' + G.month,
    cat: 'press', subject: 'Press Conference Request',
    body: q.intro + '\n\n"' + q.question + '"',
    year: G.year, month: G.month, action: 'press', pressId: q.id, read: false,
  })
  ntf('Press conference requested — check Inbox.')
}

export function resolvePressConference(toneId, calloutVillage) {
  const p = G.pendingPress; if (!p) return
  const tone = TONE_BY_ID[toneId]; if (!tone) return
  const m = { ...tone.mods }

  // Apply trigger-specific overrides
  const overrideKey = `${toneId}:${p.id}`
  const ov = TONE_TRIGGER_OVERRIDES[overrideKey]
  if (ov) {
    m.rep    = (m.rep    || 0) + (ov.repBonus    || 0)
    m.morale = (m.morale || 0) + (ov.moraleBonus || 0)
  }

  // Callout: hit the named rival hard
  const targetVillage = calloutVillage || p.rivalName
  if (toneId === 'callout' && targetVillage) {
    const tv = G.villages.find(v => v.n === targetVillage)
    if (tv) {
      tv.rel = clamp((tv.rel || 50) + m.rivalRel, 0, 100)
      tv.grudgeTicks = (tv.grudgeTicks || 0) + 6
      // Other villages get a mild diplomatic bump from the drama
      G.villages.filter(v => v.n !== targetVillage).forEach(v => { v.rel = clamp((v.rel || 50) + 3, 0, 100) })
    }
  } else {
    G.villages.forEach(v => { v.rel = clamp((v.rel || 50) + m.rivalRel, 0, 100) })
  }

  G.morale     = clamp((G.morale || 50) + m.morale, 0, 100)
  G.reputation = clamp((G.reputation || 0) + m.rep, 0, 999)

  const toneLabel = tone.label + (toneId === 'callout' && targetVillage ? ` (${targetVillage})` : '')
  const ovNote    = ov?.note || ''
  const logLine   = `Press conference — ${toneLabel}. Morale ${m.morale >= 0 ? '+' : ''}${m.morale}, Rep ${m.rep >= 0 ? '+' : ''}${m.rep}.${ovNote ? ' ' + ovNote : ''}`
  addChronicle('Press Conference', `Kage chose "${toneLabel}" responding to: "${p.question}"`, 'event')
  aL(logLine, m.morale >= 0 ? 'good' : 'warn')
  pushNarrative({ title: `Press: ${toneLabel}`, body: `"${p.question}" — Kage responded ${toneLabel.toLowerCase()}.${ovNote ? ' ' + ovNote : ''}`, tag: 'prestige', link: null }, [])
  G.pendingPress = null
  upUI()
}
