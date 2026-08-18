import { G, ui, sPow, sqP, sn, rnd, pk, clamp, fmt, rfM, rfP, normalizeRecruit, KAGE_EVENTS, addChronicle, addLegend, genRegionProspect, genStudent, computeHarmony, genTransferPool, pDesc, genScoutNarrative, senseiStyle, genTrainingReport, revealDevCurve, getLeadershipGroup, addTrait, addRumor, addNotice, computeMarketValue, mS, getMissionSpecBonus } from './state.js'
import { RANKS, RAID_POOL, MONTHS, JUTSU_LIST, WORLD_CHOICE_EVENTS, INJURY_TYPES, RANK_INJ_CHANCE, RANK_WORKLOAD, RANK_INJ_POOL, TRAUMA_TRAITS, FINANCE_TIERS, FINANCIAL_EVENTS, MISSION_COMMISSION, BUILDING_MAINTENANCE, DAIMYO_BONUS, REGIONS, DEV_TRACKS, INTENSITY_LEVELS, STAFF_ROLES, MEETING_TYPES, TRANSFER_WINDOWS, BINGO_TIERS, HARMONY_EVENTS, REGION_EVENTS, DEV_CURVES, GROUP_EVENTS, SERVICE_AWARDS, RUMOR_TEMPLATES, DAIMYO_OBJECTIVES, SPONSORSHIP_OFFERS, EXAM_FORMATS, LEGACY_DECISIONS, PRESTIGE_TIERS, DOCTRINE_BY_ID, WORLD_CLIMATES } from './constants.js'
import { aL, ntf, upUI, schEx, cm } from './ui.js'
import { tickBeast, applyBeastPairEffects, getBeastPassives, BEAST_DATA, getSyncStage, captureChance } from './beastEngine.js'
import { tickKageRels, getWorldReputationFlavor, shiftKageRel, ensureKageRels } from './rivalKage.js'
import { syncToServer } from './socket.js'
import { pickNarrative, pickSquadNarrative, pickRankUpNarrative, DARK_MOMENT_POOL, LAST_WORDS_POOL } from './narratives.js'
import { sqSynergy, SQUAD_IDENTITIES } from './synergy.js'
import { tickScouts } from './scoutEngine.js'
import { tickProspects } from './prospectEngine.js'
import { tickCareers, ensureCareerFields } from './careerEngine.js'
import { refreshMissionBoard, maybeSpawnChain, advanceChain, applyElementalLayer } from './missionGen.js'
import { evalDepth, roleBonus } from './depthEngine.js'
import { jutsuLoadoutBonus } from '../../shared/jutsu/loadout.js'
import { DISTRICTS, getDistrictPassives } from '../../shared/constants/districts.js'
import { COUNCIL_FACTIONS, COUNCIL_PROPOSALS, getCouncilPerks } from '../../shared/constants/council.js'
import { initSeasonTable, playMatchday, seasonPressNotice, simMatch, styledScore, roundPairings, sortedTable } from '../../shared/utils/season.js'
import { identityFor } from '../../shared/constants/villageIdentity.js'
import { tacticMod } from '../../shared/constants/matchdayTactics.js'
import { resolvePromise, isPastDue } from '../../shared/utils/promises.js'
import { updateH2H, pickDerbyRival } from '../../shared/utils/rivalry.js'
import { MINOR_NATIONS, pickMinorNation, minorStrength, applyMinorOrigin, adjustMinorRel } from '../../shared/constants/minorNations.js'
import { runYouthCup, entrantRun, studentPower, rivalYouthPower, minorYouthPower } from '../../shared/utils/youthCup.js'
import { isHofWorthy, buildHofEntry } from '../../shared/utils/hallOfFame.js'
import { PROJECT_BY_ID, completedEffect } from '../../shared/constants/prestigeProjects.js'
import { eraFor, nextShiftIn, transitionLine } from '../../shared/constants/worldEras.js'
import { JOURNALIST_BY_ID, pickJournalist, adjustJournalistRel, toneRelDelta } from '../../shared/constants/journalists.js'
import { nextDeclineYears, findRelegation, pickPromotion } from '../../shared/utils/leagueMembership.js'
import { resolveBattleCall, callBeatIndex } from '../../shared/utils/battleCalls.js'
import { staminaStart, finishEffects, scrollOutcome } from '../../shared/utils/matchSim.js'
import { opportunityGrowthMod } from '../../shared/utils/depthPressure.js'
import { tickCadence, idleCohesionDecay, grindMod, grindCohesionPenalty } from '../../shared/utils/squadCadence.js'
import { normalizeAllocation, rampToward, allocationEffects, DEFAULT_ALLOCATION } from '../../shared/utils/budgetRamp.js'
import { sponsorMoodDelta, moodPayoutMult, applyMoodDelta, SPONSOR_QUIT_MOOD } from '../../shared/utils/sponsors.js'
import { supportDelta, revenueMult, applySupport, FESTIVAL_THRESH, UNREST_THRESH } from '../../shared/utils/populace.js'
import { effectivePlan, medQuality, recoveryStep, reinjuryChance, returningForm } from '../../shared/utils/medical.js'
import { addStaffXp, staffTitle, staffLevelBonus } from '../../shared/utils/staffDev.js'
import { genVillageRoster } from './state.js'
import { RIVAL_KAGE_NAMES, RIVAL_PERSONALITIES } from './constants.js'
import { addNewsItem } from './news.js'
import { villageRevenue } from '../../shared/utils/economy.js'
import { resolveMission, qualityEffects, missionApproachMod } from '../../shared/utils/missionEngine.js'
import { kageMod, kagePerk, addKageXp } from '../../shared/constants/kageDev.js'
import { DYNASTY_YEARS, computeDynastyGrade } from '../../shared/utils/dynasty.js'
import { bankTenure } from './legacyStore.js'
import { syncAchievements } from './achievementsStore.js'
import { turnBlocker } from '../../shared/utils/turnGate.js'
import { dlog } from '../../shared/utils/debug.js'
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
import { prestigeFromLegend } from '../../shared/constants/prestige.js'
import { pickMandates, evaluateMandates, MANDATE_BY_ID, CONFIDENCE_START, DISMISSAL_THRESHOLD } from '../../shared/utils/ownerMandate.js'
import { getPhilosophyMods } from '../../shared/constants/coachingPhilosophy.js'
import { snapshotSeasonStats, leagueLeaders } from '../../shared/utils/seasonStats.js'
import { computeAwards } from '../../shared/utils/awards.js'
import { PRESS_QUESTIONS, PRESS_TONES, TONE_BY_ID, TONE_TRIGGER_OVERRIDES, hydrateQuestion } from '../../shared/utils/pressConference.js'
import { updateConfidence, confidenceMod, formGrudge, grudgePenalty, pairChemistryBonus, assignRoleTag, setEmotionalState, tickEmotionalState, emotionalScMod, getArchetypeQuote } from '../../shared/utils/personality.js'
import { genMissionBlurb, genKIABlurb, genRankUpBlurb, genBondBlurb, genGrudgeBlurb } from '../../shared/utils/narrativeEngine.js'
import { recordPlayerTactic, rivalScPenalty, observePlayerTactic } from '../../shared/utils/adaptiveAI.js'
import { addMemory, decayMemories, memoryMoraleMod, memoryStateBlurb } from '../../shared/utils/memorySystem.js'
import { recordVendettaDeath, addVendetta, blameFor } from '../../shared/utils/legacyMemory.js'
import { tickMentorships } from '../../shared/utils/mentorship.js'
import { pushNarrative } from './tick/inbox.js'
import { tickRivalSim, tickRivalGMMoves } from './tick/rivals.js'
import { tickOffSeason } from './tick/offSeason.js'
import { tickWorldPassives } from './tick/worldPassives.js'
import { tickStaff } from './tick/staff.js'
import { tickFinance } from './tick/finance.js'
import { tickAlliances } from './tick/alliances.js'
import { tickAcademy } from './tick/academy.js'
import { tickMissions } from './tick/missions.js'
import { tickPeople } from './tick/people.js'
import { tickSeason } from './tick/season.js'
import { tickShinobi } from './tick/shinobi.js'
import { pushMissionLog, hasUniqueAbility, jkKIAImmune, pickInjuryType, applyInjury, applyTrauma, rollInjuryOnSuccess, addWorkload, fatiguePenalty, checkJutsu, tryFormBonds, maybeInduct, _bloodlineBonus, _formationMod, _formationRisk, _nationSuccessMod, _philosophySuccessMod, _philosophyKIAMod, _squadBondBonus, recordMissionCommission, queuePressConference } from './tick/missionHelpers.js'
import { t as tr } from '../../shared/utils/i18n.js'

function currentSeason() { return MONTHS[G.month - 1]?.season || 'Spring' }

// ── Narrative inbox + thread helper ───────────────────────────────────────────
// pushNarrative lives in ./tick/inbox.js (shared with extracted tick modules); imported above.

// ── Mission log ────────────────────────────────────────────────────────────────

// ── Beast unique ability helpers ───────────────────────────────────────────────
function getBeastForJK(shinobiId) {
  return G.beasts?.find(b => b.sealed && b.jk === shinobiId)
}

// ── Injury helpers ─────────────────────────────────────────────────────────────




export function gradeShinobi(s) {
  const pow = sPow(s)
  const pot = Math.max(1, s.potential || 50)
  let score = (pow / pot) * 100
  if ((s.streak || 0) >= 3) score += 8
  if ((s.lossStreak || 0) >= 3) score -= 8
  score -= (s.fatigue || 0) * 0.25
  if (s.declineMod) score += s.declineMod * 25
  if (score >= 82) return { label: 'S', color: 'var(--gold)' }
  if (score >= 66) return { label: 'A', color: 'var(--green)' }
  if (score >= 50) return { label: 'B', color: 'var(--blue)' }
  if (score >= 34) return { label: 'C', color: 'var(--text)' }
  if (score >= 18) return { label: 'D', color: 'var(--orange)' }
  return { label: 'F', color: 'var(--red)' }
}



export function recordScoutCost(amount) {
  if (!G.finances) return
  G.finances.scoutCostThisMonth = (G.finances.scoutCostThisMonth || 0) + amount
}

// ── Mid-mission field events ───────────────────────────────────────────────────
// Each event offers a real tradeoff. Effects applied to the assignment:
// scMod (success), ryoMod (reward %), riskMod (risk; raises KIA/fail), plus
// immediate repMod/moraleMod/ryoCost. Spec-tagged events bias toward matching
// missions; spec:[] events can fire anywhere.
const MISSION_EVENTS = [
  { id:'ambush', spec:['combat','siege'], title:'⚔ Ambush', body:'Enemy reinforcements have cut off your team\'s route out.', options:[
    { id:'fight',  label:'Fight through — +reward, higher risk', scMod:0.04, ryoMod:0.25, riskMod:0.08 },
    { id:'evade',  label:'Evade quietly — safer, less reward',   scMod:0.0,  ryoMod:-0.15, riskMod:-0.08 },
  ]},
  { id:'intel', spec:['intel','stealth'], title:'🕵 Intel Windfall', body:'Your team captured sensitive enemy documents mid-operation.', options:[
    { id:'exploit', label:'Exploit immediately — +success, +risk', scMod:0.12, ryoMod:0.10, riskMod:0.06 },
    { id:'extract', label:'Extract them to sell — +reward, steady', scMod:0.0,  ryoMod:0.30, riskMod:-0.04 },
  ]},
  { id:'wounded', spec:[], title:'⚕ Wounded Teammate', body:'A team member is hurt. Press on, or pull back to treat them?', options:[
    { id:'press',  label:'Press on — +success, +injury risk',     scMod:0.08, ryoMod:0.0, riskMod:0.10 },
    { id:'treat',  label:'Withdraw to treat — −success, −risk',    scMod:-0.10, ryoMod:0.0, riskMod:-0.12 },
  ]},
  { id:'civilian', spec:['escort','recovery'], title:'🙇 Civilians in Danger', body:'Trapped civilians are caught in the line of fire.', options:[
    { id:'save',      label:'Save them — +reputation, mission harder', scMod:-0.06, repMod:6, riskMod:0.04 },
    { id:'objective', label:'Objective first — +success, morale cost',  scMod:0.06, moraleMod:-4 },
  ]},
  { id:'cache', spec:[], title:'💰 Hidden Cache', body:'Your team stumbled on an unguarded supply cache.', options:[
    { id:'loot',  label:'Loot it — +reward, +exposure', scMod:0.0,  ryoMod:0.30, riskMod:0.06 },
    { id:'leave', label:'Stay focused — small edge',     scMod:0.03 },
  ]},
  { id:'backup', spec:[], title:'📣 Call for Backup?', body:'The objective is more contested than expected. Request village support?', options:[
    { id:'call', label:'Call backup — 3,000 ryo, lowers risk', scMod:0.05, riskMod:-0.10, ryoCost:3000 },
    { id:'solo', label:'Handle it ourselves — +reward, +risk', scMod:-0.02, ryoMod:0.15, riskMod:0.05 },
  ]},
]

function pickMissionEvent(spec) {
  const eligible = MISSION_EVENTS.filter(e => !e.spec.length || (spec && e.spec.includes(spec)))
  return pk(eligible.length ? eligible : MISSION_EVENTS)
}

export function recordExamFee(amount) {
  if (!G.finances) return
  G.finances.examFees = (G.finances.examFees || 0) + amount
}

// ── Jutsu unlock check ─────────────────────────────────────────────────────

// ── Bond formation ─────────────────────────────────────────────────────────

// ── Age-based stat decline ─────────────────────────────────────────────────

// ── Resolve world choice event ─────────────────────────────────────────────
export function resolveChoiceEvent(fnKey) {
  const ev = G.pendingChoiceEvent
  G.pendingChoiceEvent = null
  if (!ev) return
  if (fnKey.endsWith('_aid'))    { G.ryo -= 8000; G.morale = clamp(G.morale + 10, 0, 100); G.reputation = clamp(G.reputation + 5, 0, 999); G.worldFlags[ev.effects?.worldFlag || 'event'] = 0; aL(tr('toast.adv.aidDistributed'), 'good') }
  else if (fnKey.endsWith('_partial')) { G.ryo -= 3000; G.morale = clamp(G.morale + 3, 0, 100); aL(tr('toast.adv.partialAid'), 'neutral') }
  else if (fnKey.endsWith('_none'))  { G.morale = clamp(G.morale - 8, 0, 100); G.reputation = clamp(G.reputation - 5, 0, 999); aL(tr('toast.adv.noAction'), 'bad') }
  else if (fnKey.endsWith('_cure'))  { G.ryo -= 10000; G.reputation = clamp(G.reputation + 8, 0, 999); G.morale = clamp(G.morale + 6, 0, 100); aL(tr('toast.adv.plagueContained'), 'good') }
  else if (fnKey.endsWith('_quar'))  { G.ryo -= 5000; G.morale = clamp(G.morale - 3, 0, 100); aL(tr('toast.adv.quarantined'), 'neutral') }
  else if (fnKey === 'sage_accept')  { const eli = G.shinobi.filter(s => s.ri >= 2); if (eli.length) { const s = pk(eli); if (!s.jutsu) s.jutsu = []; const rare = JUTSU_LIST.filter(j => j.tier === 'rare' && !s.jutsu.includes(j.id)); if (rare.length) { const j = pk(rare); s.jutsu.push(j.id); aL(tr('toast.adv.sageTaught', { name: sn(s), jutsu: j.n }), 'good'); addChronicle('Sage Taught', sn(s) + ' received rare jutsu from a Wandering Sage.', 'legend') } } }
  else if (fnKey === 'sage_honor')   { G.reputation = clamp(G.reputation + 5, 0, 999); G.villages.forEach(v => v.rel = clamp(v.rel + 10, 0, 100)); aL(tr('toast.adv.sageHonored'), 'good') }
  else if (fnKey === 'eclipse_fest') { G.morale = clamp(G.morale + 5, 0, 100); G.ryo -= 2000; aL(tr('toast.adv.eclipseFest'), 'good') }
  else if (fnKey === 'eclipse_def')  { G.tempDef = 20; aL(tr('toast.adv.eclipseDef'), 'neutral') }
  else if (fnKey === 'scroll_study') { const eli = G.shinobi.filter(s => s.ri >= 1); if (eli.length) { const s = pk(eli); if (!s.jutsu) s.jutsu = []; const avail = JUTSU_LIST.filter(j => !s.jutsu.includes(j.id) && (!j.clan || s.clan === j.clan)); if (avail.length) { const j = pk(avail); s.jutsu.push(j.id); aL(tr('toast.adv.scrollStudy', { name: sn(s), jutsu: j.n }), 'good') } } }
  else if (fnKey === 'scroll_sell')  { G.ryo += 15000; aL(tr('toast.adv.scrollSell'), 'good') }
  else if (fnKey === 'scroll_destroy') { G.reputation = clamp(G.reputation + 5, 0, 999); aL(tr('toast.adv.scrollDestroy'), 'good') }
  cm('worldchoice')   // dismiss the modal — resolving clears the block, the overlay must close too
  upUI()
}

export function assignBlackMarket(missionId, shinobiId) {
  const bm = BM_MISSION_BY_ID[missionId]
  if (!bm) return
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!s) return
  if (s.status !== 'available') { ntf(tr('toast.adv.mustBeAvailable')); return }
  if ((s.ri || 0) < bm.reqRi) { ntf(tr('toast.adv.requiresRank', { rank: ['Initiate','Adept','Veteran','Shadow','S-Rank'][bm.reqRi] })); return }
  if (bm.reqAnbu && s.ri < 3) { ntf(tr('toast.adv.anbuRequired')); return }
  s.status = 'mission'
  s.missId = 'bm_' + missionId
  if (!G.aM) G.aM = []
  G.aM.push({ id: 'bm_' + Date.now(), missionId: 'bm_' + missionId, assignedTo: shinobiId, isBM: true, bmId: missionId, daysLeft: 1 })
  aL(tr('toast.adv.bmAssigned', { name: sn(s), mission: bm.n }), 'warn')
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
    aL(tr('toast.adv.bmCompleted', { name: sn(s), mission: bm.n, ryo: bm.ryo.toLocaleString() }), 'good')
    if (bm.rewardJutsu) {
      if (!s.jutsu) s.jutsu = []
      const rare = JUTSU_LIST.filter(j => j.tier === 'rare' && !s.jutsu.includes(j.id))
      if (rare.length) { const j = pk(rare); s.jutsu.push(j.id); aL(tr('toast.adv.bmScroll', { name: sn(s), jutsu: j.n }), 'good') }
    }
    if (bm.rewardIntel) {
      const v = pk(G.villages || [])
      if (v) aL(tr('toast.adv.bmIntel', { village: v.n, strength: Math.round(v.strength || 50), disposition: v.rel > 60 ? 'Allied' : v.rel > 30 ? 'Neutral' : 'Hostile' }), 'good')
    }
    pushMissionLog({ missionName: bm.n, rank: bm.rk, success: true, ryo: bm.ryo, rep: 0, narrative: 'Underground contract completed.' })
  } else {
    const kR = clamp(bm.kiaBonus, 0.01, 0.15)
    if (Math.random() < kR && !jkKIAImmune(s)) {
      aL(tr('toast.adv.bmKia', { name: sn(s), mission: bm.n }), 'bad')
      maybeInduct(s, 'fallen'); G._kiaThisMonth = (G._kiaThisMonth || 0) + 1; G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: bm.n, year: G.year, month: G.month, wins: s.wins, lastWords: '"No witnesses."' })
      G.shinobi = G.shinobi.filter(x => x.id !== s.id)
    } else {
      s.status = 'available'; s.missId = null
      aL(tr('toast.adv.bmFailed', { name: sn(s), mission: bm.n }), 'bad')
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
    aL(tr('toast.adv.bmDiscovered', { mission: bm.n, rep: bm.repLoss }), 'bad')
  }

  G.aM = G.aM.filter(x => x.id !== assignmentId)
  upUI()
}

export function establishSafehouse(locationId) {
  const loc = SH_LOCATION_BY_ID[locationId]
  if (!loc) return
  if ((G.ryo || 0) < SAFEHOUSE_COST) { ntf(tr('toast.adv.needSafehouse', { cost: SAFEHOUSE_COST.toLocaleString() })); return }
  if (!G.safehouses) G.safehouses = []
  if (G.safehouses.filter(s => s.status === 'active').length >= MAX_SAFEHOUSES) { ntf(tr('toast.adv.maxSafehouses')); return }
  if (G.safehouses.find(s => s.locationId === locationId && s.status === 'active')) { ntf(tr('toast.adv.safehouseActiveThere')); return }
  G.ryo -= SAFEHOUSE_COST
  G.safehouses.push({ id: 'sh_' + locationId + '_' + Date.now(), locationId, status: 'active', established: G.year * 12 + G.month })
  aL(tr('toast.adv.safehouseEstablished', { icon: loc.icon, name: loc.name }), 'good')
  upUI()
}

export function assignDeepCoverOp(opId, shinobiId, safehouseId) {
  const op = DC_OP_BY_ID[opId]
  if (!op) return
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!s || s.status !== 'available') { ntf(tr('toast.adv.notAvailable')); return }
  if ((s.ri || 0) < op.reqRi) { ntf(tr('toast.adv.requiresRank', { rank: ['Initiate','Adept','Veteran','Shadow','S-Rank'][op.reqRi] })); return }
  const sh = (G.safehouses || []).find(x => x.id === safehouseId && x.status === 'active')
  if (!sh) { ntf(tr('toast.adv.invalidSafehouse')); return }
  s.status = 'mission'; s.missId = opId
  if (!G.aM) G.aM = []
  G.aM.push({ id: 'dc_' + Date.now(), missionId: opId, assignedTo: shinobiId, isDeepCover: true, opId, safehouseId, daysLeft: op.daysActive })
  aL(tr('toast.adv.deployedOp', { name: sn(s), op: op.n, safehouse: SH_LOCATION_BY_ID[sh.locationId]?.name || 'safehouse' }), 'warn')
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

  const sc = clamp(0.60 + (s.ri || 0) * 0.05 + shBonus + kageMod(G, 'espionage'), 0.20, 0.95)
  s.status = 'available'; s.missId = null

  if (Math.random() < sc) {
    G.ryo = (G.ryo || 0) + op.ryo
    G.reputation = clamp((G.reputation || 0) + op.rep, 0, 999)
    if (op.id === 'dc_infiltrate') {
      const v = pk(G.villages || [])
      if (v) aL(tr('toast.adv.deepCoverIntel', { village: v.n, strength: Math.round(v.strength || 50) }), 'good')
    }
    if (op.id === 'dc_recruit') {
      aL(tr('toast.adv.doubleAgent'), 'good')
    }
    aL(tr('toast.adv.opCompleted', { name: sn(s), op: op.n, ryo: op.ryo.toLocaleString() }), 'good')
  } else {
    aL(tr('toast.adv.opFailed', { name: sn(s), op: op.n }), 'bad')
  }

  G.aM = G.aM.filter(x => x.id !== assignmentId)
  upUI()
}

export function resolveWorldEventChoice(choiceId) {
  const ae = G.worldCalendar?.activeEvent
  if (!ae) { ntf(tr('toast.adv.noWorldEvent')); return }
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
    aL(tr('toast.adv.clanChainSuccess', { icon: clan?.icon || '', chain: chain.n, ryo: chain.ryo.toLocaleString(), rep: chain.rep }), 'good')
  } else {
    aL(tr('toast.adv.clanChainFailed', { icon: clan?.icon || '', chain: chain.n }), 'bad')
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
    if (prop.id === 'war_footing')    { G._warFooting = true; aL(tr('toast.adv.warFooting'), 'warn') }
    else if (prop.id === 'trade_treaty')  { if (G.ryo >= 8000) { G.ryo -= 8000; if (!G.districts) G.districts = []; G.districts.push({ id: '_trade_route', status: 'built', effect: { monthlyRyo: 1500 } }); aL(tr('toast.adv.tradeRoute'), 'good') } else { aL(tr('toast.adv.notEnoughTreaty'), 'bad'); G.councilApproval[prop.faction] = clamp(G.councilApproval[prop.faction] - 5, 0, 100) } }
    else if (prop.id === 'exam_funding')  { if (G.ryo >= 5000) { G.ryo -= 5000; G._examFundingBonus = true; aL(tr('toast.adv.examFunding'), 'good') } else { aL(tr('toast.common.notEnoughRyoDot'), 'bad') } }
    else if (prop.id === 'curfew')        { G.morale = clamp(G.morale - 5, 0, 100); G.reputation = clamp(G.reputation + 8, 0, 999); aL(tr('toast.adv.curfew'), 'neutral') }
    else if (prop.id === 'arms_stockpile'){ if (G.ryo >= 12000) { G.ryo -= 12000; G.tempDef = (G.tempDef || 0) + 10; aL(tr('toast.adv.armsStockpile'), 'good') } else { aL(tr('toast.common.notEnoughRyoDot'), 'bad') } }
    else if (prop.id === 'market_day')    { G.ryo += 3000; G.morale = clamp(G.morale + 5, 0, 100); aL(tr('toast.adv.marketDay'), 'good') }
    aL(tr('toast.adv.proposalApproved', { faction: faction?.n || '' }), 'good')
  } else {
    aL(tr('toast.adv.proposalDeclined', { faction: faction?.n || '' }), 'neutral')
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

// #8 Tactical formation (flag-gated; 0 when off or no formation set)

// Nation identity success modifier (flag-gated; 0 when off or neutral nation)

// Hall of Fame — induct a departing shinobi (retirement/death) if their career
// clears the threshold. Idempotent per shinobi. Returns the entry or null.


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
  if (!v.ok) { aL(tr('toast.adv.cannotChannel', { beast: beastName, reason: v.reason.replace('_', ' ') }), 'bad'); return }
  G.ryo -= ACTIVATION_COST
  b.activeUntil = G.month + ACTIVE_DURATION
  b.cooldownUntil = G.month + COOLDOWN
  if (s) s._aggro = (s._aggro || 0) + AGGRO_INCREASE
  aL(tr('toast.adv.channels', { name: sn(s), beast: beastName, cost: fmt(ACTIVATION_COST) }), 'good')
  upUI()
}

export function adv() {
  // The month does not advance over an unanswered decision.
  //
  // This guard used to exist only in ui.js continueTurn(), which meant any
  // other caller — endTurn(), an inline handler, a QA harness, a future
  // server-driven tick — walked straight past an invoked pact or a council
  // mandate and produced state the player was never shown. Both endTurn and
  // adv are reachable from window, so the UI was never a real gate.
  const _blocked = turnBlocker(G)
  if (_blocked) { dlog('[adv] refused — ' + _blocked.id + ': ' + _blocked.label); return false }

  // Off-season phase: months 1–3 are recovery/prep. Flag used by UI.
  G.isOffSeason = G.month >= 1 && G.month <= 3

  // ── Per-shinobi activity log (P4 ActivityGrid) — record this month's state ──
  G.shinobi.forEach(s => {
    const act = s.status === 'mission' ? 'mission'
      : s.status === 'injured' ? 'injured'
      : s.status === 'exam' ? 'exam'
      : s.status === 'war' ? 'war'
      : s.restMonth ? 'rest'
      : s.trainingFocus ? 'training'
      : 'available'
    ;(s.activityLog = s.activityLog || []).push({ m: G.month, state: act })
    if (s.activityLog.length > 12) s.activityLog.shift()
  })
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

  // ── World passives (season, districts, flags, council, floors, monuments,
  //    civilian mood) — see ./tick/worldPassives.js
  tickWorldPassives({ monthDef, dp, cp })
  // ── Monthly quick-decision events (Pillar 4) ──────────────────────────────
  if (!G.pendingQuickDecision && Math.random() < 0.55) {
    const QUICK_EVENTS = [
      { id:'merchant', title:'Merchant Caravan Passing', body:'A wealthy caravan requests safe passage through your territory. You can tax them or wave them through as goodwill.', options:[
        { id:'tax', label:'Collect road tax', effect: g => { g.ryo += 2500; aL(tr('toast.adv.roadTax'), 'good') } },
        { id:'goodwill', label:'Wave them through', effect: g => { g.villages.forEach(v => { v.rel = clamp((v.rel||50)+3,0,100) }); g.reputation = clamp((g.reputation||0)+2,0,999); aL(tr('toast.adv.goodwillRep2'), 'neutral') } },
      ]},
      { id:'gifted_child', title:'Gifted Child at the Gates', body:'A child prodigy with no clan has appeared, seeking training. Recruit them now or wait for the next academy intake.', options:[
        { id:'recruit_now', label:'Accept immediately', effect: g => { const s = mS(0); s.potential = clamp(s.potential + 15, 0, 99); s.homegrown = true; s.salary = 300; g.shinobi.push(s); aL(sn(s) + ' recruited — prodigy with +15 potential.', 'good') } },
        { id:'academy_track', label:'Direct to academy', effect: g => { const st = genStudent(g.upgrades.academy || 0, 0); st.potential = clamp(st.potential + 10, 0, 99); g.intakeClass.push(st); aL(tr('toast.adv.prodigyAcademy'), 'neutral') } },
      ]},
      { id:'festival', title:'Village Festival Proposal', body:'The civilian council wants to fund a celebration. It lifts morale but costs ryo.', options:[
        { id:'fund', label:'Fund the festival', effect: g => { g.ryo = Math.max(0, g.ryo - 3000); g.morale = clamp((g.morale||50)+12,0,100); g.citizenMorale = clamp((g.citizenMorale||60)+8,0,100); aL(tr('toast.adv.festivalFunded'), 'good') } },
        { id:'skip', label:'Save the ryo', effect: g => { g.morale = clamp((g.morale||50)-4,0,100); aL(tr('toast.adv.festivalSkipped'), 'warn') } },
      ]},
      { id:'defector', title:'Rival Village Defector', body:'An enemy adept appeared at the gates claiming to have intelligence on a rival village\'s plans. Accept the risk or turn them away.', options:[
        { id:'accept', label:'Accept their intel', effect: g => { g.reputation = clamp((g.reputation||0)+5,0,999); if (!g.intelLog) g.intelLog = []; g.intelLog.push({ text:'Defector intel: rival village plans revealed.', year:g.year, month:g.month }); aL(tr('toast.adv.defectorIntel'), 'good') } },
        { id:'turnaway', label:'Turn them away', effect: g => { const rv = pk(g.villages); rv.rel = clamp((rv.rel||50)+5,0,100); aL(tr('toast.adv.defectorTurned', { village: rv.n }), 'neutral') } },
      ]},
      { id:'sparring_incident', title:'Sparring Incident', body:'Two initiate pushed too hard in training — one is bruised. Handle it officially or let them sort it between themselves.', options:[
        { id:'official', label:'Official reprimand', effect: g => { g.morale = clamp((g.morale||50)-3,0,100); const s = g.shinobi.find(x => x.ri === 0 && x.status === 'available'); if (s) { s.injDays = 2; s.status = 'injured'; aL(sn(s) + ' benched 2 months — official reprimand.', 'warn') } } },
        { id:'let_go', label:'Let them settle it', effect: g => { g.morale = clamp((g.morale||50)+3,0,100); aL(tr('toast.adv.sparringRespected'), 'good') } },
      ]},
      { id:'scroll', title:'Ancient Scroll Recovered', body:'A scout returned with a forgotten jutsu scroll. Study it to boost training or sell it to a collector for quick ryo.', options:[
        { id:'study', label:'Research the scroll', effect: g => { g.shinobi.filter(s => s.status === 'available').slice(0,3).forEach(s => { const k = pk(['ninjutsu','taijutsu','genjutsu','chakra']); s.stats[k] = clamp((s.stats[k]||0)+3,0,99) }); aL(tr('toast.adv.scrollStudied'), 'good') } },
        { id:'sell', label:'Sell the scroll', effect: g => { g.ryo += 4500; aL(tr('toast.adv.scrollSold'), 'good') } },
      ]},
      { id:'border_scare', title:'Border Skirmish Alert', body:'Scouts report unusual activity near the border. Deploy a patrol now or issue a diplomatic warning first.', options:[
        { id:'patrol', label:'Deploy patrol', effect: g => { const s = g.shinobi.find(x => x.ri >= 1 && x.status === 'available'); if (s) { s.workload = clamp((s.workload||0)+15,0,100); s.fatigue = clamp((s.fatigue||0)+10,0,100) }; g.reputation = clamp((g.reputation||0)+3,0,999); aL(tr('toast.adv.patrolDeployed'), 'neutral') } },
        { id:'diplomacy', label:'Diplomatic warning', effect: g => { const rv = pk(g.villages); rv.rel = clamp((rv.rel||50)-8,0,100); aL(tr('toast.adv.diploWarning', { village: rv.n }), 'warn') } },
      ]},
    ]
    const ev = pk(QUICK_EVENTS)
    const eid = Math.random().toString(36).slice(2)
    G.pendingQuickDecision = { id: eid, eventId: ev.id, title: ev.title, body: ev.body, options: ev.options.map(o => ({ id: o.id, label: o.label })), year: G.year, month: G.month }
    G.narrativeInbox.push({ id: eid, type: 'quick_decision', tag: 'event', title: '⚡ Decision: ' + ev.title, body: ev.body, eventId: ev.id, options: ev.options.map(o => ({ id: o.id, label: o.label })), year: G.year, month: G.month })
    if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
  }
  // Store event pool on state for resolveQuickDecision to look up
  if (!G._quickEventPool) G._quickEventPool = [
    { id:'merchant', options:[{ id:'tax', effect: g => { g.ryo += 2500; aL(tr('toast.adv.roadTax'), 'good') } }, { id:'goodwill', effect: g => { g.villages.forEach(v => { v.rel = clamp((v.rel||50)+3,0,100) }); g.reputation = clamp((g.reputation||0)+2,0,999); aL(tr('toast.adv.goodwill2'), 'neutral') } }] },
    { id:'gifted_child', options:[{ id:'recruit_now', effect: g => { const s = mS(0); s.potential = clamp(s.potential+15,0,99); s.homegrown=true; s.salary=300; g.shinobi.push(s); aL(tr('toast.adv.prodigyRecruited', { name: sn(s) }), 'good') } }, { id:'academy_track', effect: g => { const st = genStudent(g.upgrades.academy||0,0); st.potential=clamp(st.potential+10,0,99); g.intakeClass.push(st); aL(tr('toast.adv.prodigyAcademy2'),'neutral') } }] },
    { id:'festival', options:[{ id:'fund', effect: g => { g.ryo=Math.max(0,g.ryo-3000); g.morale=clamp((g.morale||50)+12,0,100); g.citizenMorale=clamp((g.citizenMorale||60)+8,0,100); aL(tr('toast.adv.festivalFunded2'),'good') } }, { id:'skip', effect: g => { g.morale=clamp((g.morale||50)-4,0,100); aL(tr('toast.adv.festivalSkipped2'),'warn') } }] },
    { id:'defector', options:[{ id:'accept', effect: g => { g.reputation=clamp((g.reputation||0)+5,0,999); aL(tr('toast.adv.defectorIntel2'),'good') } }, { id:'turnaway', effect: g => { const rv=pk(g.villages); rv.rel=clamp((rv.rel||50)+5,0,100); aL(tr('toast.adv.defectorTurned2'),'neutral') } }] },
    { id:'sparring_incident', options:[{ id:'official', effect: g => { g.morale=clamp((g.morale||50)-3,0,100); const s=g.shinobi.find(x=>x.ri===0&&x.status==='available'); if(s){s.injDays=2;s.status='injured';aL(tr('toast.adv.benched', { name: sn(s) }),'warn')} } }, { id:'let_go', effect: g => { g.morale=clamp((g.morale||50)+3,0,100); aL(tr('toast.adv.sparringRespected2'),'good') } }] },
    { id:'scroll', options:[{ id:'study', effect: g => { g.shinobi.filter(s=>s.status==='available').slice(0,3).forEach(s=>{const k=pk(['ninjutsu','taijutsu','genjutsu','chakra']);s.stats[k]=clamp((s.stats[k]||0)+3,0,99)}); aL(tr('toast.adv.scrollStudied2'),'good') } }, { id:'sell', effect: g => { g.ryo+=4500; aL(tr('toast.adv.scrollSold'),'good') } }] },
    { id:'border_scare', options:[{ id:'patrol', effect: g => { const s=g.shinobi.find(x=>x.ri>=1&&x.status==='available'); if(s){s.workload=clamp((s.workload||0)+15,0,100);s.fatigue=clamp((s.fatigue||0)+10,0,100)}; g.reputation=clamp((g.reputation||0)+3,0,999); aL(tr('toast.adv.patrolDeployed2'),'neutral') } }, { id:'diplomacy', effect: g => { const rv=pk(g.villages); rv.rel=clamp((rv.rel||50)-8,0,100); aL(tr('toast.adv.diploWarning2', { village: rv.n }),'warn') } }] },
  ]

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
      aL(tr('toast.adv.safehouseProspect', { name: lead.name, source: lead.source }), 'good')
    }
  }
  // ── World Events Calendar ────────────────────────────────────────────────
  if (!G.worldCalendar) G.worldCalendar = {}
  // Advance notice — 1 month before the event fires
  const upcoming = getUpcomingEvent(G.month)
  if (upcoming && !G.worldCalendar[`noticed_${G.year}_${upcoming.id}`]) {
    G.worldCalendar[`noticed_${G.year}_${upcoming.id}`] = true
    G.worldCalendar.pendingEvent = { eventId: upcoming.id, dueYear: G.year, dueMonth: upcoming.month }
    aL(tr('toast.adv.eventNotice', { icon: upcoming.icon, name: upcoming.name }), 'warn')
  }
  // Fire the event if it's this month and player hasn't resolved it yet
  const thisEvent = getEventForMonth(G.month)
  if (thisEvent) {
    const key = `fired_${G.year}_${thisEvent.id}`
    if (!G.worldCalendar[key]) {
      G.worldCalendar[key] = true
      if (!G.worldCalendar.activeEvent || G.worldCalendar.activeEvent.eventId !== thisEvent.id) {
        G.worldCalendar.activeEvent = { eventId: thisEvent.id, year: G.year, month: G.month }
        aL(tr('toast.adv.eventArrived', { icon: thisEvent.icon, name: thisEvent.name }), 'warn')
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
      aL(tr('toast.adv.councilProposes', { icon: f?.icon || '', faction: f?.n || '', prop: prop.n }), 'warn')
    }
  }
  // Low-approval crisis at < 20
  COUNCIL_FACTIONS.forEach(f => {
    const ap = G.councilApproval[f.id] ?? 50
    if (ap < 20 && !G[`_crisisNotice_${f.id}`]) {
      G[`_crisisNotice_${f.id}`] = true
      aL(tr('toast.adv.councilCrisis', { faction: f.n, approval: ap }), 'bad')
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
        aL(tr('toast.adv.clanChainsAvailable', { icon: clan.icon, clan: clan.name, n: runnable.length }), 'warn')
      }
    }
  }

  // ── Per-shinobi monthly tick — training, ageing, retirement ── see ./tick/shinobi.js
  tickShinobi({ tgM, dp, cp })
  // ── Alumni roster — capture retirees before filter ───────────────────────
  if (!G.alumni) G.alumni = []
  G.shinobi.filter(s => s.status === 'retired').forEach(s => {
    if (!G.alumni.find(a => a.id === s.id)) {
      G.alumni.push({ id: s.id, fn: s.fn, ln: s.ln, ri: s.ri, clan: s.clan, wins: s.wins, age: s.age, retiredY: G.year, lastContactY: G.year })
    }
  })
  G.shinobi = G.shinobi.filter(s => s.status !== 'retired')

  // ── Pillar 5a: Alumni network — retired shinobi send word ─────────────────
  if (G.alumni.length > 0 && Math.random() < 0.18) {
    const al = pk(G.alumni)
    al.lastContactY = G.year
    const ALUMNI_MSGS = [
      { body: `${al.fn} ${al.ln} sent a gift from retirement — ryo and warm wishes.`, effect: g => { g.ryo += 1500; g.morale = clamp((g.morale||50)+3,0,100) }, label: '+1,500 ryo · morale +3' },
      { body: `${al.fn} ${al.ln} dropped by to train the initiate — an old master's lesson.`, effect: g => { const s = g.shinobi.filter(x => x.ri === 0 && x.status === 'available')[Math.floor(Math.random() * g.shinobi.filter(x=>x.ri===0).length)]; if (s) { const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed']); s.stats[k] = clamp((s.stats[k]||0)+3,0,99); aL(s.fn + ' got a lesson from ' + al.fn + ' — ' + k + ' +3.', 'good') } }, label: 'training +3 to a initiate stat' },
      { body: `${al.fn} ${al.ln} passed along field intelligence from their travels.`, effect: g => { g.reputation = clamp((g.reputation||0)+4,0,999); aL(tr('toast.adv.alumniIntel'), 'good') }, label: 'rep +4' },
      { body: `${al.fn} ${al.ln} vouched for the village to a passing merchant.`, effect: g => { g.ryo += 3000; aL(al.fn + '\'s endorsement brought trade — +3,000 ryo.', 'good') }, label: '+3,000 ryo' },
    ]
    const msg = pk(ALUMNI_MSGS)
    msg.effect(G)
    G.narrativeInbox.push({ id: Math.random().toString(36).slice(2), type: 'alumni', tag: 'people', title: 'Word from ' + al.fn + ' ' + al.ln, body: msg.body + ' (' + msg.label + ')', year: G.year, month: G.month })
    if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
  }

  // ── Pillar 5b: Fan/civic events — citizen morale drives street-level events ─
  if (Math.random() < 0.28) {
    const cm = G.citizenMorale || 60
    if (cm >= 70) {
      const HIGH_EVENTS = [
        () => { G.ryo += 2000; aL(tr('toast.adv.civilianFundraiser'), 'good'); G.narrativeInbox.push({ id: Math.random().toString(36).slice(2), type:'civic', tag:'prestige', title:'Citizen Fundraiser', body:'High morale turned to action — civilians raised 2,000 ryo for the village.', year:G.year, month:G.month }) },
        () => { const st = genStudent(G.upgrades.academy||0, 0); G.intakeClass.push(st); aL(tr('toast.adv.volunteerEnrolled'), 'good') },
        () => { G.reputation = clamp((G.reputation||0)+3,0,999); aL(tr('toast.adv.publicCeremony'), 'good') },
      ]
      pk(HIGH_EVENTS)()
    } else if (cm <= 35) {
      const LOW_EVENTS = [
        () => { G.morale = clamp((G.morale||50)-5,0,100); aL(tr('toast.adv.civilianProtest'), 'bad'); G.narrativeInbox.push({ id: Math.random().toString(36).slice(2), type:'civic', tag:'prestige', title:'Civilian Protest', body:'Low citizen morale boiled over — a protest in the market drained village morale.', year:G.year, month:G.month }) },
        () => { const target = G.shinobi.find(s => (s.commitment||50) < 55 && s.status==='available'); if (target) { target.commitment = clamp((target.commitment||50)-8,0,100); aL(sn(target) + ' rattled by public unrest — commitment −8.', 'warn') } },
        () => { G.ryo = Math.max(0, G.ryo - 1500); aL(tr('toast.adv.vandalism'), 'warn') },
      ]
      pk(LOW_EVENTS)()
    }
    if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
  }

  // ── Pillar 5c: Sponsor inbox bridge — route existing sponsorship offers through inbox ──
  if (G.sponsorshipOffer && !G._sponsorInboxFired) {
    G._sponsorInboxFired = true
    const sp = G.sponsorshipOffer
    const sid = Math.random().toString(36).slice(2)
    G.narrativeInbox.push({ id: sid, type:'sponsor_offer', tag:'prestige', title:'Sponsorship: ' + sp.n, body:(sp.desc||'A sponsorship deal is available.') + ' +' + sp.monthlyRyo + ' ryo/month. View in Finances to accept.', year:G.year, month:G.month })
    if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
  }
  if (!G.sponsorshipOffer) G._sponsorInboxFired = false

  // ── Pillar: Rumor mill — rival intel blurbs surfaced monthly ────────────────
  if (Math.random() < 0.32) {
    const rv = pk(G.villages)
    const RUMOR_TEMPLATES = [
      () => `Sources say ${rv.n} is quietly shopping one of their veterans — a trade may be imminent.`,
      () => `Intel suggests ${rv.n} is investing heavily in their academy. Expect stronger initiate next season.`,
      () => `Whispers from ${rv.n}: a senior veteran is considering retirement. Their roster depth is at risk.`,
      () => `${rv.n} appears to be hoarding ryo — a big signing or upgrade could be coming.`,
      () => `Reports from border scouts: ${rv.n} has been running high-intensity S-rank drills. War readiness is up.`,
      () => `Word on the road: ${rv.n} finished last season ${rv.strength >= 120 ? 'stronger than ever' : 'in disarray'}.`,
      () => `A defector claims ${rv.n} lost a key veteran to injury — their next exam showing may suffer.`,
    ]
    const rumor = pk(RUMOR_TEMPLATES)()
    G.narrativeInbox.push({ id: Math.random().toString(36).slice(2), type: 'rumor', tag: 'intel', title: 'Rumor: ' + rv.n, body: rumor, village: rv.n, year: G.year, month: G.month })
    if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
  }

  // ── Pillar: Monthly intel report — performance grades summary ────────────────
  if (G.month % 3 === 0 && G.shinobi.length > 0) {
    const graded = G.shinobi.map(s => ({ s, g: gradeShinobi(s) }))
    const sGrade  = graded.filter(x => x.g.label === 'S').map(x => sn(x.s))
    const fGrade  = graded.filter(x => x.g.label === 'F').map(x => sn(x.s))
    const peaking = G.shinobi.filter(s => s.peakAge && Math.abs((s.age || 0) - s.peakAge) <= 1)
    const declining = G.shinobi.filter(s => s.peakAge && (s.age || 0) > s.peakAge + 3 && (s.declineMod || 0) < -0.05)
    const lines = []
    if (sGrade.length)    lines.push(sGrade.join(', ') + (sGrade.length === 1 ? ' is' : ' are') + ' performing at elite level.')
    if (fGrade.length)    lines.push('⚠ Underperformers: ' + fGrade.join(', ') + '.')
    if (peaking.length)   lines.push(peaking.map(s => sn(s)).join(', ') + (peaking.length === 1 ? ' is' : ' are') + ' in peak years — deploy them.')
    if (declining.length) lines.push('Declining: ' + declining.map(s => sn(s)).join(', ') + ' — consider succession planning.')
    if (lines.length > 0) {
      G.narrativeInbox.push({ id: Math.random().toString(36).slice(2), type: 'intel_report', tag: 'intel', title: 'Quarterly Performance Report — Y' + G.year + ' M' + G.month, body: lines.join(' '), year: G.year, month: G.month })
      if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
    }
  }

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
    aL(tr('toast.adv.injuryCrisis', { n: injuredCount }), 'bad')
    addChronicle('Injury Crisis', injuredCount + ' shinobi injured at the same time. Emergency recruitment authorised by the Daimyo.', 'event')
    addNotice('CRISIS: ' + injuredCount + ' shinobi are injured. Emergency recruitment window is open.', 'bad')
    ntf(tr('toast.adv.injuryCrisisShort'))
  }
  // Close emergency window when time expires or injuries drop
  if (G.emergencyRecruitWindow && G.emergencyWindowEnd) {
    const expired = G.year > G.emergencyWindowEnd.year || (G.year === G.emergencyWindowEnd.year && G.month >= G.emergencyWindowEnd.month)
    if (expired || injuredCount < 2) {
      G.emergencyRecruitWindow = false
      G.emergencyWindowEnd = null
      aL(tr('toast.adv.emergencyClosed'), 'neutral')
    }
  }

  // ── Route E: Clan synergy passive ─────────────────────────────────────────
  {
    const _cc = {}
    G.shinobi.forEach(s => { if (s.clan) _cc[s.clan] = (_cc[s.clan] || 0) + 1 })
    const _top = Object.entries(_cc).sort((a, b) => b[1] - a[1])[0]
    if (_top) {
      const [topClan, topCount] = _top
      if (topCount >= 7) {
        G.ryo += 500
        G.morale = clamp((G.morale || 75) + 1, 0, 100)
        if (G.month === 1) aL(tr('toast.adv.clanLegendary', { clan: topClan }), 'good')
      } else if (topCount >= 5) {
        G.ryo += 250
        if (G.month === 1) aL(tr('toast.adv.clanIdentity', { clan: topClan }), 'good')
      } else if (topCount >= 3) {
        G.morale = clamp((G.morale || 75) + 1, 0, 100)
        if (G.month === 1) aL(tr('toast.adv.clanSynergy', { clan: topClan }), 'neutral')
      }
    }
  }

  // ── Economy: black-market heat decay + rival route piracy ──────────────────
  {
    // Underworld heat cools ~6 points/month
    if ((G.blackMarketHeat || 0) > 0) G.blackMarketHeat = Math.max(0, G.blackMarketHeat - 6)
    // Quarterly chance a rival disrupts an active trade route (income halved until secured)
    if (G.month % 3 === 0) {
      const liveRoutes = G.tradeRoutes.filter(r => r.active && !r.disrupted)
      if (liveRoutes.length && Math.random() < 0.35) {
        const r = pk(liveRoutes)
        r._fullIncome = r.income
        r.income = Math.round(r.income / 2)
        r.disrupted = true
        aL(tr('toast.adv.routeDisrupted', { route: r.n }), 'warn')
        addNotice(`Trade route "${r.n}" disrupted — secure it from the Economy panel.`, 'warn')
      }
    }
  }

  // ── Squad monthly tick (monthsActive, anniversary, deployment cadence) ────
  G.squads.forEach(sq => {
    sq.monthsActive = (sq.monthsActive || 0) + 1
    if (sq.monthsActive > 0 && sq.monthsActive % 12 === 0) {
      const years = sq.monthsActive / 12
      aL(sq.n + ' marks ' + years + ' year' + (years > 1 ? 's' : '') + ' as a unit.', 'ev')
      addChronicle('Squad Anniversary', sq.n + ' has been together for ' + years + ' year' + (years > 1 ? 's' : '') + '. Cohesion: ' + (sq.cohesion || 0) + '.', 'squad')
    }
    sq.deployedThisMonth = G.aM.some(am => am.isSquad && am.squadId === sq.id)
    const cadence = tickCadence(sq)
    sq.consecutiveDeployMonths = cadence.consecutiveDeployMonths
    sq.idleMonths = cadence.idleMonths
    const decay = idleCohesionDecay(sq.idleMonths)
    if (decay > 0 && (sq.cohesion || 0) > 0) {
      sq.cohesion = Math.max(0, (sq.cohesion || 0) - decay)
      if (sq.idleMonths === 2) aL(sq.n + ' has gone quiet — cohesion is starting to slip.', 'warn')
    }
  })

  // ── Prospect aging ──────────────────────────────────────────────────────
  G.prospects = G.prospects.filter(p => {
    if ((p.monthsWaiting || 0) >= 24) {
      aL(sn(p) + ' lost patience and left the academy.', 'neutral')
      // 10% chance dropout becomes a missing-nin event
      if (Math.random() < 0.10) {
        aL(tr('toast.adv.turnedRogue', { name: sn(p) }), 'warn')
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
    if (activeRoster < 14 && G.prospects.length > 0) {
      const best = G.prospects.reduce((a, b) => (b.potential || 0) > (a.potential || 0) ? b : a)
      best.status = 'available'
      // Academy graduates enter with salary deleted (genStudent) — default it so the
      // 0.85× homegrown discount doesn't compute Math.round(undefined*0.85) === NaN,
      // which would poison the whole treasury (a summed s.salary).
      if (best.academyOrigin) { best.homegrown = true; best.salary = Math.round((best.salary || 500) * 0.85) }
      // …and every other roster counter a prospect never had. `months` was the
      // next one to bite: undefined++ → NaN → the shinobi never ages again.
      normalizeRecruit(best)
      G.shinobi.push(best)
      G.prospects = G.prospects.filter(x => x.id !== best.id)
      aL(sn(best) + ' signed on — the village needed them.', 'good')
      addChronicle('Roster Crisis Signing', sn(best) + ' joined amid a roster shortage.', 'shinobi')
    }
  }

  // ── Mid-mission field events — fire around the midpoint so the player's ────
  // choice lands BEFORE resolution (never on the resolving tick).
  if (!G.pendingComplications) G.pendingComplications = []
  G.aM.filter(am => !am.isScout && !am.isBM && !am.isClanChain && !am.isDeepCover && !am.isBeastCapture && !am._complicationFired).forEach(am => {
    const m = G.avM?.find(x => x.id === am.missionId)
    if (!m) return
    const dur = m.dur || 1
    const fireAt = Math.max(2, Math.ceil(dur / 2))   // guarantees ≥1 month before resolution; dur=1 never fires
    if ((am.daysLeft || 1) !== fireAt) return
    am._complicationFired = true
    if (Math.random() > 0.42) return                 // ~42% of eligible missions get an event
    const ev = pickMissionEvent(m.spec)
    const compId = Math.random().toString(36).slice(2)
    G.pendingComplications.push({ id: compId, assignmentId: am.id, missionName: m.n, choice: null, options: ev.options, created: { year: G.year, month: G.month } })
    G.narrativeInbox.push({ id: compId, type: 'complication', tag: 'mission', title: ev.title + ' — ' + m.n, body: ev.body, assignmentId: am.id, missionName: m.n, options: ev.options, year: G.year, month: G.month })
    if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
    ntf(tr('toast.adv.fieldDecision', { mission: m.n }))
  })
  // Apply resolved complication choices to the assignment + immediate effects.
  G.pendingComplications.forEach(pc => {
    if (!pc.choice || pc.applied) return
    const am = G.aM.find(x => x.id === pc.assignmentId)
    const opt = pc.options.find(o => o.id === pc.choice)
    if (am && opt) {
      am._scMod = (am._scMod || 0) + (opt.scMod || 0)
      am._ryoMod = (am._ryoMod || 0) + (opt.ryoMod || 0)
      am._riskMod = (am._riskMod || 0) + (opt.riskMod || 0)
      if (opt.ryoCost) G.ryo = Math.max(0, G.ryo - opt.ryoCost)
      if (opt.repMod) G.reputation = clamp((G.reputation || 0) + opt.repMod, 0, 999)
      if (opt.moraleMod) G.morale = clamp((G.morale || 75) + opt.moraleMod, 0, 100)
    }
    pc.applied = true
  })
  G.pendingComplications = G.pendingComplications.filter(pc => !pc.applied && ((G.year * 12 + G.month) - (pc.created.year * 12 + pc.created.month)) < 3)

  // ── Mission resolution — injuries, death, reports ── see ./tick/missions.js
  //    Runs AFTER worldPassives and the roster floor by design; see that file.
  tickMissions({ hL, dp, sb, iB, cp, clP, shP, season })

  // ── Raid system ──────────────────────────────────────────────────────────
  if (G.raid && !G.raid.resolved) { if (G.raidW <= 0) resRaid(); else G.raidW-- }
  if (!G.raid) {
    // Aggressive villages raise raid chance
    const aggressiveV = G.villages.filter(v => v.personality === 'Aggressive' && v.rel < 40)
    const aggressiveBonus = aggressiveV.length * 0.02
    const _climateRaid = Math.max(0, 1 + ((G.worldClimate?.raidMod) || 0))  // calm halves, volatile near-doubles
    if (Math.random() < (0.12 + aggressiveBonus) * _climateRaid) {
      const ev = pk(RAID_POOL), warn = G.upgrades.intel >= 2 ? 2 : G.upgrades.intel >= 1 ? 1 : 0
      // Name whose raid this is. Aggressive villages already drive the raid rate
      // above, so one of them is the natural instigator — and unlike a mission, a
      // raid on your own walls has a real attacker, which makes any death here
      // the most legible vendetta in the game. Chosen deterministically (worst
      // relation first) so this adds no RNG draw to the tick.
      const _inst = blameFor(aggressiveV.length ? aggressiveV : G.villages)
      G.raid = { ...ev, resolved: false, instigator: _inst?.n || null }; G.raidW = warn
      aL(tr('toast.adv.threat', { name: ev.n, arrival: warn > 0 ? 'Arrives in ' + warn + 'm.' : 'Arriving now!' }), 'warn')
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

  // ── Rival village strength simulation + GM moves (see ./tick/rivals.js) ────
  tickRivalSim()
  tickRivalGMMoves()

  // ── Season league table — the regular-season spine ── see ./tick/season.js
  tickSeason({ season })

  // ── Off-season slate (friendlies + Invitational, months 1–3) — see tick/offSeason.js
  tickOffSeason()


  // ── Minor-nation prodigy — the wider world produces talent worth fighting for ──
  // Any month, ~8%: a high-potential prospect surfaces from a minor nation with a
  // short signing window; rivals will be circling (rival bids already target
  // high-potential prospects in tickRivalGMMoves).
  if (Math.random() < 0.08 && (G.prospects?.length || 0) < 16) {
    const nat = pickMinorNation()
    const prodigy = mS(0)
    applyMinorOrigin(prodigy, nat)
    prodigy.potential = rnd(78, 96)
    prodigy.urgencyMonths = rnd(3, 5)
    prodigy.rivalInterest = 2
    G.prospects.push(prodigy)
    aL(tr('toast.adv.minorProdigy', { ico: nat.ico, nation: nat.n, name: sn(prodigy) }), 'ev')
    pushNarrative({
      title: `${nat.ico} Prodigy out of ${nat.n}`,
      body: `${sn(prodigy)}, a ${prodigy.age}-year-old talent from ${nat.n}, is shopping for a great village. Scouts rate the ceiling exceptional — but the window is short.`,
      tag: 'academy', link: 'academy',
    })
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

  // ── Staff: levelling, mentorships, sensei clashes, poaching ── see ./tick/staff.js
  tickStaff()

  // ── Daimyo seasonal objectives (set January, evaluated December) ───────────
  if (!G.daimyoObjectives && G.month !== 1) {
    // Backfill for old saves mid-year — assign on next January naturally
  }
  if (G.month === 1) {
    const ids = [...DAIMYO_OBJECTIVES].sort(() => Math.random() - 0.5).slice(0, 3).map(o => o.id)
    G.daimyoObjectives = { ids, year: G.year, startRel: G.villages.map(v => ({ n: v.n, rel: v.rel })) }
    aL(tr('toast.adv.daimyoObjectives'), 'ev')
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
      aL(tr('toast.adv.daimyoPleased'), 'good')
      addChronicle('Daimyo Satisfied', 'All 3 objectives met this year. Daimyo budget multiplier now ' + G.daimyoBudgetMult.toFixed(2) + 'x.', 'milestone')
    } else {
      G.daimyoBudgetMult = clamp((G.daimyoBudgetMult || 1) - 0.10, 0.5, 2)
      G.reputation = clamp(G.reputation - 5, 0, 999)
      aL(tr('toast.adv.daimyoDisappointed'), 'bad')
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
    aL(tr('toast.adv.councilMandate', { year: G.year, names }), 'ev')
    addChronicle('Council Mandate', `Year ${G.year} mandates: ${names}.`, 'event')
  }
  // A year closed with nobody lost. Counted here because the KIA tally is
  // per-year and resets each January ("Everyone Comes Home").
  if (G.month === 12 && (G._mandateKIAThisYear || 0) === 0) G._cleanYears = (G._cleanYears || 0) + 1
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
      aL(tr('toast.adv.councilReviewAll', { prev, conf: G.ownerMandate.confidence, summary }), 'good')
      addChronicle('Mandate Review', `Year ${G.year}: all mandates met. Confidence ${G.ownerMandate.confidence}.`, 'milestone')
    } else {
      aL(tr('toast.adv.councilReviewPartial', { met: metCount, total: results.length, prev, conf: G.ownerMandate.confidence, summary }), badYear ? 'bad' : 'neutral')
      addChronicle('Mandate Review', `Year ${G.year}: ${metCount}/${results.length} mandates met. Confidence ${G.ownerMandate.confidence}.`, 'event')
    }
    // No-confidence trigger
    if (G.ownerMandate.confidence < DISMISSAL_THRESHOLD && G.ownerMandate.consecutiveBadYears >= 2) {
      G.noConfidenceVote = true
      aL(tr('toast.adv.noConfidence'), 'bad')
      ntf(tr('toast.adv.noConfidenceShort'))
      addChronicle('No-Confidence Vote', `After ${G.ownerMandate.consecutiveBadYears} consecutive poor years, the council demands a change of leadership.`, 'legend')
    } else if (G.ownerMandate.confidence < DISMISSAL_THRESHOLD) {
      aL(tr('toast.adv.confidenceLow', { conf: G.ownerMandate.confidence }), 'bad')
      addNotice(`Council confidence: ${G.ownerMandate.confidence}/100. Meet mandates next year or face a vote.`, 'bad')
    }
  }

  // ── Sponsorship deals ────────────────────────────────────────────────────────
  if (!G.sponsorship && !G.sponsorshipOffer && Math.random() < 0.06) {
    const eligible = SPONSORSHIP_OFFERS.filter(o => G.shinobi.some(s => s.ri >= o.minRi))
    if (eligible.length) {
      G.sponsorshipOffer = pk(eligible)
      aL(G.sponsorshipOffer.n + ' has offered a sponsorship deal — check Finances.', 'ev')
      ntf(tr('toast.adv.sponsorOffer', { name: G.sponsorshipOffer.n }))
    }
  }
  let sponsorshipIncome = 0
  if (G.sponsorship) {
    const obligationBroken = G.sponsorship.id === 'iron_merchants' && !G.shinobi.some(s => s.ri >= 3 && s.status !== 'retired')
    if (obligationBroken) {
      aL(G.sponsorship.n + ' pulled out — obligation unmet.', 'bad')
      G.sponsorship = null
    } else {
      // R14: mood drifts with how the village is doing and shifts the payout.
      if (G.sponsorship.mood == null) G.sponsorship.mood = 60
      G.sponsorship.mood = applyMoodDelta(G.sponsorship.mood, sponsorMoodDelta({ obligationMet: true, lowMorale: (G.morale || 50) < 40, title: G.examChampion === G.vName, seasonWin: (G._formThisMonth?.wins || 0) > 0 }))
      if (G.sponsorship.mood <= SPONSOR_QUIT_MOOD) {
        aL(G.sponsorship.n + ' ended the sponsorship — they lost faith in the village.', 'bad')
        G.sponsorship = null
      } else {
        sponsorshipIncome = Math.round(G.sponsorship.monthlyRyo * moodPayoutMult(G.sponsorship.mood))
      }
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
      aL(tr('toast.adv.bmUncovered'), 'bad')
      addChronicle('Black Market Exposed', 'Off-books dealings exposed. Penalty: ' + fmt(penalty) + ' ryo, relations and reputation damaged.', 'event')
      G.blackLedger.history.push({ year: G.year, month: G.month, type: 'caught', amount: -penalty })
      G.blackLedger.balance = 0
    }
  }

  // ── Populace support (R27) — civilian mood feeds the gate; extremes fire events ─
  if (G.populace == null) G.populace = { support: 60 }
  {
    const won = (G._formThisMonth?.wins || 0) > 0
    const _revert = G.populace.support > 58 ? -1 : G.populace.support < 52 ? 1 : 0
    G.populace.support = applySupport(G.populace.support, supportDelta({
      wonThisMonth: won,
      title: G.examChampion === G.vName,
      treasuryDeficit: (G.ryo || 0) < 0,
      treasurySurplus: (G.ryo || 0) > 60000,
    }) + _revert)
    if (G.populace.support >= FESTIVAL_THRESH && Math.random() < 0.30) {
      const boon = 3000 + (G.reputation || 0) * 10
      G.ryo += boon; G.morale = clamp((G.morale || 50) + 3, 0, 100)
      G.populace.support = applySupport(G.populace.support, -8)  // festival spends goodwill
      aL(`🎏 The village throws a festival — the people celebrate. +${fmt(boon)} ryo, morale lifts.`, 'good')
    } else if (G.populace.support <= UNREST_THRESH && Math.random() < 0.30) {
      G.morale = clamp((G.morale || 50) - 5, 0, 100); G.reputation = clamp((G.reputation || 0) - 4, 0, 999)
      G.populace.support = applySupport(G.populace.support, 6)  // unrest vents, then eases
      aL(`⚠ Civil unrest — the populace has lost patience. Morale and reputation dip.`, 'bad')
    }
  }

  // ── Finance: monthly snapshot, salary cap, year-end report ── see ./tick/finance.js
  tickFinance({ sb, season, sponsorshipIncome })
  // ── Alliance pacts: payout, standing drift, and calls ── see ./tick/alliances.js
  tickAlliances()

  // ── Diplomacy drift ──────────────────────────────────────────────────────
  G.villages.forEach(v => {
    if (Math.random() < 0.10) {
      // Mercantile villages drift toward positive rel; feared villages drift less negatively
      const fearMod = Math.floor((v.fear || 0) / 20)  // +0 to +5 dampening of negative drift
      let dir = v.personality === 'Mercantile' ? rnd(-3, 8) : v.personality === 'Isolationist' ? rnd(-3, 3) : rnd(-7, 7)
      if (dir < 0) dir = Math.min(0, dir + fearMod)  // fear reduces hostility drift
      v.rel = clamp(v.rel + dir, 0, 100)
      if (Math.abs(dir) > 4) aL(tr('toast.adv.diploShift', { village: v.n, delta: (dir > 0 ? '+' : '') + dir }), 'neutral')
    }
  })

  // ── Warden events ──────────────────────────────────────────────────────────
  G.keCD = (G.keCD || 0) - 1
  if (!ui.pKE && G.keCD <= 0 && Math.random() < 0.25) {
    const ev = G.keQ.shift()
    if (ev) { ui.pKE = ev; G.keCD = rnd(4, 7); aL(tr('toast.adv.kageEvent', { name: ev.n }), 'ev'); ntf(tr('toast.adv.kageEventShort')) }
    if (!G.keQ.length) G.keQ = [...KAGE_EVENTS].sort(() => Math.random() - 0.5)
  }

  // ── World choice events ───────────────────────────────────────────────────
  if (!G.pendingChoiceEvent && Math.random() < 0.06) {
    const ev = pk(WORLD_CHOICE_EVENTS)
    G.pendingChoiceEvent = ev
    if (ev.effects?.worldFlag) G.worldFlags[ev.effects.worldFlag] = rnd(3, 6)
    aL(tr('toast.adv.worldEventMissions', { name: ev.n }), 'ev')
    ntf(tr('toast.adv.worldEventShort'))
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

  // ── Youth academy: intake, development, Youth Cup ── see ./tick/academy.js
  //    Runs AFTER the roster floor by design; see that file for why.
  tickAcademy()
  // ── Morale, commitment and people management ── see ./tick/people.js
  tickPeople()
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
        ntf(tr('toast.adv.wageTension', { name: sn(vet) }))
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
    aL(tr('toast.adv.dressingRoom', { name: ev.n, desc: ev.desc }), 'bad')
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
        aL(tr('toast.adv.deadlinePanic', { village: rivalV?.n || 'a rival village', name: sn(victim) }), 'warn')
        addNotice('Deadline-day panic signing: ' + sn(victim) + ' has joined ' + (rivalV?.n || 'a rival village') + '.', 'warn')
      }
    }
    if (G.transferMarket.windowMonthsLeft <= 0) {
      G.transferMarket.windowOpen = false
      G.transferMarket.windowSeason = null
      G.transferMarket.deadlinePressure = false
      aL(tr('toast.adv.windowClosed'), 'neutral')
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
        aL(tr('toast.adv.assassination', { name: sn(s), tier: bTier.n }), 'bad')
        if (Math.random() < 0.30) {
          const injType = pickInjuryType(s.ri >= 4 ? 'S' : 'A')
          if (injType) { applyInjury(s, injType, hL); aL(sn(s) + ' was injured in the assassination attempt.', 'bad') }
        }
      }
    }
  })

  // ── Prodigy event (1% per month in rfP) — handled in rfP ────────────────
  if (G.tempDef > 0) G.tempDef = Math.max(0, G.tempDef - 5)
  if (G.examSched && G.month === G.examMonth) { aL(tr('toast.adv.chuninNow'), 'ev'); ntf(tr('toast.adv.chuninNowShort')) }

  // ── Grand Tournament — the deadly year-end playoff, seeded by the season ───
  if (G.month === 12 && !G.warActive && G.warDoneYear !== G.year) {
    G.warSched = true
    aL(tr('toast.adv.tournamentBegins'), 'ev')
    ntf(tr('toast.adv.tournamentBeginsShort'))
  }

  // ── Prestige tier tick ──────────────────────────────────────────────────────
  const newPTier = prestigeFromLegend(G.legend)
  if (newPTier !== G.prestigeTier) {
    const was = G.prestigeTier; G.prestigeTier = newPTier
    addChronicle('Prestige Milestone', `${G.vName} has risen to Prestige Tier ${newPTier} (from ${was}). Legend: ${G.legend}.`, 'milestone')
    aL(tr('toast.adv.prestigeTier', { tier: newPTier }), 'good')
  }
  if (G.dynastyRecords) G.dynastyRecords.peakLegend = Math.max(G.dynastyRecords.peakLegend || 0, G.legend || 0)

  // ── Warden reputation tick ────────────────────────────────────────────────────
  if (!G.kageRep) G.kageRep = 1
  const repScore = (G.reputation || 0)
  const legendScore = (G.legend || 0)
  // Warden rep target: weighted blend of rep score + legend tier (so a Legendary village can't stay at ★☆☆☆☆)
  const legendBonus = legendScore >= 500 ? 2 : legendScore >= 300 ? 1 : legendScore >= 150 ? 1 : 0
  const targetRep = clamp((repScore >= 250 ? 5 : repScore >= 150 ? 4 : repScore >= 80 ? 3 : repScore >= 30 ? 2 : 1) + legendBonus, 1, 5)
  if (G.kageRep < targetRep && Math.random() < 0.3) G.kageRep = Math.min(5, G.kageRep + 1)
  if (G.kageRep > targetRep && Math.random() < 0.15) G.kageRep = Math.max(1, G.kageRep - 1)

  // ── Hall of Legends — check retiring shinobi ────────────────────────────────
  // ── Dynasty milestone notifications ────────────────────────────────────────
  if (G.year === DYNASTY_YEARS && G.month === 1 && !G.dynastyComplete) {
    const { grade } = computeDynastyGrade(G)
    aL(tr('toast.adv.dynastyReached', { years: DYNASTY_YEARS, grade }), 'good')
    ntf(tr('toast.adv.dynastyReachedShort', { years: DYNASTY_YEARS }))
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
    aL(tr('toast.adv.generationalReport', { year: G.year, grade }), 'good')
  }

  // ── Intel report expiry ─────────────────────────────────────────────────────
  if (G.intelReports) {
    const now = (G.year - 1) * 12 + G.month
    G.intelReports = G.intelReports.filter(r => r.expiresMonth > now)
  }

  // ── Shadow ops tick ───────────────────────────────────────────────────────────
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
      aL(tr('toast.adv.anbuCaught', { village: targetV?.n || 'enemy', status }), 'bad')
      addChronicle('Shadow Incident', `Our ${op.type} operative was ${status} by ${targetV?.n || 'enemy forces'}.`, 'bad')
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
      aL(tr('toast.adv.anbuComplete', { op: op.type, village: targetV?.n || 'target' }), 'good')
    }
    return false
  })

  // ── War arc tick ────────────────────────────────────────────────────────────
  if (G.warState) {
    G.warState.monthsLeft = (G.warState.monthsLeft || 1) - 1
    const warV = (G.villages || []).find(v => v.id === G.warState.villageId)
    if (G.warState.phase === 'mobilization') {
      aL(tr('toast.adv.warMobilization', { village: warV?.n || 'enemy' }), 'warn')
      if (G.warState.monthsLeft <= 0) { G.warState.phase = 'conflict'; G.warState.monthsLeft = 3 }
    } else if (G.warState.phase === 'conflict') {
      // Monthly combat exchange
      const myStr = G.shinobi.filter(s => s.status === 'available').length * 5 + (G.upgrades?.wall || 0) * 10
      const theirStr = rnd(20, 60)
      if (myStr >= theirStr) {
        G.reputation = clamp(G.reputation + 3, 0, 999); addLegend(2)
        G.warState.playerWins = (G.warState.playerWins || 0) + 1
        aL(tr('toast.adv.combatVictory', { village: warV?.n || 'enemy' }), 'good')
      } else {
        G.morale = clamp(G.morale - 5, 0, 100)
        G.warState.playerLosses = (G.warState.playerLosses || 0) + 1
        aL(tr('toast.adv.combatLoss', { village: warV?.n || 'enemy' }), 'bad')
      }
      if (G.warState.monthsLeft <= 0) { G.warState.phase = 'ceasefire'; G.warState.monthsLeft = 1 }
    } else if (G.warState.phase === 'ceasefire') {
      aL(tr('toast.adv.ceasefire', { village: warV?.n || 'enemy' }), 'neutral')
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
          if (ambitious.length) aL(tr('toast.adv.warDefeatMorale', { names: ambitious.map(s => sn(s)).join(', ') }), 'bad')
          aL(tr('toast.adv.warDefeatPrestige', { tier: newTier }), 'bad')
          addLegend(-15)
        } else {
          // Winner bonus
          addLegend(20); G.reputation = clamp(G.reputation + 30, 0, 999)
          aL(tr('toast.adv.warVictory', { village: warV?.n || 'enemy' }), 'good')
        }
        G.warState = null
      }
    }
  }

  // ── Five Warden Summit tick (month 6 each year) ───────────────────────────────
  if (G.month === 6) {
    const prestige = G.prestigeTier || 'D'
    const presOrd = { D:0, C:1, B:2, A:3, S:4 }
    const myOrd = presOrd[prestige] || 0
    // Pick 3 random agenda items
    const SUMMIT_AGENDA = [
      { id:'trade_pact', n:'Regional Trade Pact', minVotes:3, effect:'ryo_bonus' },
      { id:'war_ban', n:'War Moratorium', minVotes:4, effect:'peace' },
      { id:'missing_bounty', n:'Missing-Nin Bounties', minVotes:2, effect:'bounty' },
      { id:'beast_protocol', n:'Primal Protocol', minVotes:3, effect:'beast_truce' },
      { id:'exam_expand', n:'Expand Adept Exam', minVotes:3, effect:'exam_expand' },
    ]
    const items = [...SUMMIT_AGENDA].sort(() => Math.random() - 0.5).slice(0, 3)
    const results = []
    items.forEach(item => {
      const myVote = myOrd >= 2 ? 1 : (Math.random() < 0.5 ? 1 : 0)
      const npcVotes = rnd(0, 4)
      const total = myVote + npcVotes
      const passed = total >= item.minVotes
      if (passed) {
        if (item.effect === 'ryo_bonus') { G.ryo += 1500; aL(tr('toast.adv.summitTradePact'), 'good') }
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
      aL(tr('toast.adv.summitFavor', { village: G.pendingSummitFavor.villageName }), 'warn')
      G.pendingSummitFavor = null
    }
    addChronicle('Five Warden Summit Y' + G.year, results.map(r => `${r.item}: ${r.passed ? 'PASSED' : 'FAILED'}`).join('; ') + (blocEntry ? ` [Bloc: ${blocEntry}]` : ''), 'event')
    aL(tr('toast.adv.summitComplete'), 'neutral')
  }

  // ── S-rank contract rotation (month 1, 4, 7, 10) ───────────────────────────
  if ([1, 4, 7, 10].includes(G.month)) {
    const SCONTRACTS = [
      { id:'escort_kage', n:'Escort the Five Warden', baseRyo:35000, rep:50, prestige:15, risk:0.45 },
      { id:'seal_primal', n:'Seal a Rampaging Beast', baseRyo:40000, rep:60, prestige:20, risk:0.50 },
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
        aL(tr('toast.adv.warConsequencesFaded'), 'neutral')
      }
    }
  }

  // ── Summit pre-approach (month 5 — bloc offer before summit in month 6) ─────
  if (G.month === 5 && !G.summitBlocOffer && Math.random() < 0.5) {
    const SUMMIT_ITEMS = ['Regional Trade Pact','War Moratorium','Missing-Nin Bounties','Expand Adept Exam']
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

  // ── Per-Warden relations drift ───────────────────────────────────────────────
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
        aL(tr('toast.adv.legacyMoment'), 'warn')
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
      aL(tr('toast.adv.successorLeft'), 'warn')
    }
  }

  // ── Rival Warden relationship tick ──────────────────────────────────────────
  ensureKageRels(G)
  tickKageRels(G)
  G.worldReputationFlavor = getWorldReputationFlavor(G)

  // ── Primal monthly tick ─────────────────────────────────────────────
  applyBeastPairEffects(G)
  G.beasts.forEach(b => {
    const beastEvents = tickBeast(b, G)
    beastEvents.forEach(ev => {
      aL(ev.title + ': ' + ev.body.slice(0, 120) + (ev.body.length > 120 ? '…' : ''), ev.type === 'legend' ? 'good' : ev.type === 'lore' ? 'good' : ev.type === 'bad' || ev.type === 'critical' ? 'bad' : ev.type === 'warn' ? 'warn' : 'neutral')
      if (ev.type === 'legend') { addChronicle(ev.title, ev.body, 'legend', ev.narrative || null); addLegend(10) }
      if (ev.type === 'lore')   addChronicle(ev.title, ev.body, 'lore', ev.narrative || null)
    })
  })
  // ── Vessel control / instability (host risk-reward) ────────────────────
  G.beasts.filter(b => b.sealed && b.jk).forEach(b => {
    const host = G.shinobi.find(s => s.id === b.jk)
    if (!host) return
    if (b.control === undefined) b.control = 55
    const stage = getSyncStage(b)
    // Control gravitates toward a ceiling set by sync stage + host commitment.
    const target = clamp(stage * 18 + ((host.commitment ?? 50) - 50) * 0.4, 10, 100)
    b.control = clamp(Math.round(b.control + (target - b.control) * 0.25), 0, 100)
    // Channeling the beast strains the seal.
    if ((b.activeUntil || 0) > G.month) b.control = clamp(b.control - 6, 0, 100)
    // Low control risks an instability incident (scales with tails).
    if (b.control < 35) {
      const incidentChance = (35 - b.control) / 100 + b.tails * 0.01
      if (Math.random() < incidentChance) {
        const morHit = 4 + Math.floor(b.tails / 2)
        G.morale = clamp((G.morale || 75) - morHit, 0, 100)
        b.control = clamp(b.control + 8, 0, 100)  // partial settle after the outburst
        let detail = `${b.n}'s chakra surged beyond ${sn(host)}'s control. Village morale −${morHit}.`
        if (host.status === 'available' && Math.random() < 0.35) {
          host.status = 'injured'; host.injDays = rnd(1, 2); host.injuryType = 'chakra_burn'
          detail += ` ${sn(host)} was hurt containing it and is sidelined ${host.injDays}mo.`
        }
        ;(b.escapeHistory = b.escapeHistory || []).push({ year: G.year, month: G.month, kind: 'instability' })
        aL(tr('toast.adv.sealInstability', { detail }), 'bad')
        addNotice(`${b.n} instability — reinforce the seal in the Beasts panel.`, 'bad')
        addChronicle('Seal Instability', detail, 'event')
      }
    }
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
        aL(tr('toast.adv.extractionRepelled', { attacker: attacker.n, beast: b.n }), 'warn')
        G.reputation = clamp(G.reputation + 3, 0, 999)
        attacker.rel = clamp((attacker.rel || 50) - 10, 0, 100)
        addChronicle(`Extraction Repelled — ${b.n}`, `${attacker.n} dispatched an extraction team targeting ${b.n}'s Vessel. Village defenses held.`, 'war')
      } else {
        aL(tr('toast.adv.extractionPenetrated', { attacker: attacker.n, beast: b.n }), 'bad')
        G.morale = clamp(G.morale - 8, 0, 100)
        G.reputation = clamp(G.reputation - 5, 0, 999)
        const jk = G.shinobi.find(s => s.id === b.jk)
        if (jk) { jk.injDays = Math.max(jk.injDays || 0, 2); jk.status = 'injured' }
        addChronicle(`Extraction Breach — ${b.n}`, `${attacker.n} extraction agents breached the village. ${b.n}'s Vessel was injured in the struggle.`, 'war')
      }
      ntf(tr('toast.adv.extractionAttempt', { beast: b.n }))
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

  // Hard floors enforced at end-of-tick after all events have settled
  if (G._moraleFloor && (G.morale || 0) < G._moraleFloor) G.morale = G._moraleFloor

  // ── Auto-prune old non-actionable narrative inbox items (older than 6 months) ─
  if (G.narrativeInbox) {
    const absNow = (G.year - 1) * 12 + G.month
    const SAFE_TO_PRUNE = new Set(['alumni', 'civic', 'rumor', 'intel_report', 'mission'])
    G.narrativeInbox = G.narrativeInbox.filter(n => {
      if (n.dismissed) return false
      if (!SAFE_TO_PRUNE.has(n.type) && n.type !== undefined) return true  // keep actionable
      if (!n.year) return true
      const absItem = (n.year - 1) * 12 + (n.month || 1)
      return (absNow - absItem) < 6
    })
  }

  syncToServer(); rfM(); rfP()
  // AFTER rfM: it rebuilds the board wholesale, so the elemental layer has to
  // be applied to the board the player will actually see.
  applyElementalLayer(G)
  // ── Warden development XP — base + this month's mission wins + queued events ──
  {
    const wins = (G._formThisMonth?.wins) || 0
    const xp = 4 + wins * 2 + (G._kageXpPending || 0)
    G._kageXpPending = 0
    const res = addKageXp(G, xp)
    if (res.leveled) {
      aL(tr('toast.adv.kageLevel', { level: res.newLevel, points: res.levels * 2 }), 'good')
      addNotice(`Warden Level ${res.newLevel} — spend development points on the Warden Path screen.`, 'good')
      ntf(tr('toast.adv.kageLevelShort', { level: res.newLevel }))
    }
  }

  // Spymaster perk — free monthly recon on a random un-scouted rival.
  if (kagePerk(G) === 'recon' && (G.villages || []).length) {
    const now = (G.year - 1) * 12 + G.month
    G.intelReports = G.intelReports || []
    const target = pk(G.villages.filter(v => !G.intelReports.some(r => r.villageId === (v.id || v.n) && r.type === 'recon')))
    if (target) {
      G.intelReports.push({ villageId: target.id || target.n, type: 'recon', data: { rosterSize: (target.roster || []).length || rnd(8, 18), economyLevel: rnd(1, 4) }, expiresMonth: now + 3 })
    }
  }

  G.month++; if (G.month > 12) {
    G.month = 1; G.year++
    addChronicle('New Year', 'Year ' + G.year + ' begins. Legend: ' + G.legend + '. Shinobi: ' + G.shinobi.length + '.', 'event')
    // ── World era shift — the climate re-rolls every few years ──────────────
    if (G._nextEraShift == null) G._nextEraShift = G.year + nextShiftIn()   // seed on first rollover
    else if (G.year >= G._nextEraShift) {
      const _eco = pk(WORLD_CLIMATES.economy), _thr = pk(WORLD_CLIMATES.threat)
      const prevName = G.worldEra?.name || null
      const era = eraFor(_eco.id, _thr.id)
      G.worldClimate = { economy: _eco.id, economyMod: _eco.incomeMod, threat: _thr.id, raidMod: _thr.raidMod }
      G.worldEra = { name: era.name, blurb: era.blurb, economy: _eco.id, threat: _thr.id, startYear: G.year }
      G.eraHistory = G.eraHistory || []
      G.eraHistory.push({ year: G.year, name: era.name })
      if (G.eraHistory.length > 12) G.eraHistory.shift()
      G._nextEraShift = G.year + nextShiftIn()
      const line = transitionLine(prevName, era)
      addChronicle('A New Era — ' + era.name, line, 'milestone')
      addNewsItem(`🌍 ${line}`)
      pushNarrative({ title: `🌍 ${era.name}`, body: `${line}<br><br>Economy: <b>${_eco.n}</b> · Region: <b>${_thr.n}</b>.`, tag: 'intel', link: null })
    }

    // ── Dynamic league membership — a collapsed power falls, a minor nation rises ──
    G.villages.forEach(v => { v.declineYears = nextDeclineYears(v.declineYears, v.strength) })
    const _releg = findRelegation(G.villages)
    if (_releg) {
      const _names = [G.vName, ...G.villages.map(v => v.n)]
      const _promo = pickPromotion(MINOR_NATIONS, _names, m => minorStrength(m, () => 0.5))
      if (_promo) {
        G.villages = G.villages.filter(v => v.n !== _releg.n)
        const nv = {
          n: _promo.n, ico: _promo.ico, kageRank: 'Warden', kage: pk(RIVAL_KAGE_NAMES),
          personality: pk(RIVAL_PERSONALITIES), str: rnd(55, 72), strength: rnd(55, 72),
          rel: rnd(25, 50), threat: 0, grudgeTicks: 0, heldBeasts: [], declineYears: 0,
          identityIntensity: 1, promoted: true,
        }
        nv.roster = genVillageRoster(nv)
        G.villages.push(nv)
        G.season = null   // rebuild the league table for the new membership
        const relLine = `${_releg.ico || ''} ${_releg.n} has collapsed and dropped out of the great villages. ${_promo.ico} ${_promo.n} rises from the minor nations to take their place among the powers.`
        addChronicle('The World Turns', relLine, 'milestone')
        addNewsItem(`🌍 ${relLine}`)
        pushNarrative({ title: '🌍 A Power Falls, A Power Rises', body: relLine, tag: 'intel', link: null })
      }
    }
  }
  // Achievements last, so the month's results are already settled. Cheap once
  // the set stops growing — every unlocked entry is skipped.
  syncAchievements()
  upUI(); ntf(tr('toast.adv.monthAdvanced', { year: G.year, month: G.month }))
}

// ── Bond bonus for squad missions ────────────────────────────────────────

export function resRaid() {
  if (!G.raid || G.raid.resolved) return
  const hL = G.upgrades.hospital
  const isobu = G.beasts?.find(b => b.n === 'Tairyuu' && b.sealed && b.jk)
  const isobuBonus = (isobu && getSyncStage(isobu) >= (BEAST_DATA['Tairyuu']?.uniqueAbility?.stage ?? 99)) ? 30 : 0
  const wD = (G.upgrades.wall === 1 ? 15 : G.upgrades.wall === 2 ? 35 : 0) + (G.upgrades.seal === 1 ? 10 : G.upgrades.seal === 2 ? 25 : 0) + (G.tempDef || 0) + isobuBonus + ((DOCTRINE_BY_ID[G.villageDoctrine]?.defBonus) || 0)
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
        maybeInduct(def, 'fallen'); G._kiaThisMonth = (G._kiaThisMonth || 0) + 1; G.memorial.push({ name: sn(def), rank: ['Initiate','Adept','Veteran','Shadow','S-Rank'][def.ri], clan: def.clan, mission: 'Village Defense', year: G.year, month: G.month, wins: def.wins, lastWords: '"The village... I held the line."' })
        aL(sn(def) + ' fell defending the village.', 'bad')
        // The one death in the game with an unambiguous killer: the whole roster
        // watched the walls, so the whole roster carries it.
        const _rWhen = { year: G.year, month: G.month }
        const _rBlame = G.raid.instigator || blameFor(G.villages)?.n
        if (_rBlame) {
          G.vendettas = G.vendettas || {}
          recordVendettaDeath(G.vendettas, _rBlame, { name: sn(def), rank: RANKS[def.ri], mission: 'Village Defense' }, _rWhen)
          G.shinobi.filter(s => s.id !== def.id).forEach(s => {
            addMemory(s, 'witness_kia', 'village_defense', _rWhen)
            addVendetta(s, _rBlame, sn(def), _rWhen)
          })
          addNotice(`${sn(def)} died holding the wall against ${_rBlame}. The village will not let that stand.`, 'warn')
        }
        G.shinobi = G.shinobi.filter(s => s.id !== def.id)
      } else {
        def.injDays = rnd(1, 3); def.status = 'injured'; def.missId = null
      }
    }
  }
  G.raid.resolved = true; G.defSh = null
}

// ── Post-mission contribution scorer (Phase 4) ────────────────────────────────

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
      aL(tr('toast.adv.contractExpiring', { name: sn(s), salary: fmt(demandSalary) }), 'warn')
    }
    if (G.year >= s.contractEnd && G.month === 1 && !s.contractRenewing) {
      // Contract lapsed without renewal action
      s.commitment = clamp((s.commitment || 60) - 20, 0, 100)
      s.transferListed = true
      aL(tr('toast.adv.contractExpired', { name: sn(s) }), 'warn')
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
        aL(tr('toast.adv.seniorUnrest'), 'warn')
        G._seniorGroupWarnedThisMonth = true
      }
    } else {
      G._seniorGroupWarnedThisMonth = false
    }
  }
}

function _tickDevLoans(G) {
  // Loaned-out Initiate gain mock experience monthly
  if (!G.transferMarket?.loanOut) return
  G.transferMarket.loanOut.forEach(loan => {
    const s = G.shinobi.find(x => x.id === loan.shinobiId)
    if (!s || s.ri !== 0) return  // Initiate only
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
    aL(tr('toast.adv.resign', { grade, score }), 'neutral')
    addChronicle('Warden Resigned', `${G.kN || 'The Warden'} stepped down after a no-confidence vote. Dynasty Grade: ${grade}.`, 'legend')
    const banked = bankTenure(G, 'dismissed')
    G.gameOver = { reason: 'resignation', grade, score, year: G.year, legacy: banked.record, legacyTotal: banked.store.points }
    upUI(); return
  }
  // Fight the vote — costs ryo and morale, resets consecutive bad years counter
  const cost = 15000
  if (G.ryo >= cost) {
    G.ryo -= cost
    G.ownerMandate.confidence = clamp(G.ownerMandate.confidence + 20, 0, 100)
    G.ownerMandate.consecutiveBadYears = 0
    G.morale = clamp(G.morale - 10, 0, 100)
    aL(tr('toast.adv.defendPosition', { conf: G.ownerMandate.confidence, cost: fmt(cost) }), 'good')
    addChronicle('Vote Survived', `${G.kN || 'The Warden'} survived a no-confidence vote by rallying council support.`, 'legend')
  } else {
    aL(tr('toast.adv.forcedResign'), 'bad')
    const { grade, score } = computeDynastyGrade(G)
    addChronicle('Warden Ousted', `${G.kN || 'The Warden'} was removed after losing a no-confidence vote. Dynasty Grade: ${grade}.`, 'legend')
    const banked = bankTenure(G, 'dismissed')
    G.gameOver = { reason: 'ousted', grade, score, year: G.year, legacy: banked.record, legacyTotal: banked.store.points }
  }
  upUI()
}

// ── Press Conference ─────────────────────────────────────────────────────────


export function resolvePressConference(toneId, calloutVillage) {
  const p = G.pendingPress; if (!p) return
  const tone = TONE_BY_ID[toneId]; if (!tone) return
  const m = { ...tone.mods }

  // The reporter who asked remembers how you treated them.
  if (p.journalistId) {
    const jr = JOURNALIST_BY_ID[p.journalistId]
    G.journalistRel = G.journalistRel || {}
    const delta = toneRelDelta(jr?.persona, toneId)
    if (delta) {
      const now = adjustJournalistRel(G.journalistRel, p.journalistId, delta)
      if (delta <= -6 && now < 40) addNotice(`${jr.name} of ${jr.outlet} left the press room unimpressed. Their coverage will bite.`, 'warn')
    }
  }

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
  addChronicle('Press Conference', `Warden chose "${toneLabel}" responding to: "${p.question}"`, 'event')
  aL(logLine, m.morale >= 0 ? 'good' : 'warn')
  pushNarrative({ title: `Press: ${toneLabel}`, body: `"${p.question}" — Warden responded ${toneLabel.toLowerCase()}.${ovNote ? ' ' + ovNote : ''}`, tag: 'prestige', link: null }, [])
  G.pendingPress = null
  upUI()
}

export function resolveComplication(compId, choiceId) {
  if (!G.pendingComplications) return
  const pc = G.pendingComplications.find(x => x.id === compId)
  if (!pc) return
  pc.choice = choiceId
  const opt = pc.options.find(o => o.id === choiceId)
  if (opt) aL(tr('toast.adv.fieldDecisionMade', { label: opt.label, desc: opt.desc }), 'neutral')
  if (G.narrativeInbox) G.narrativeInbox.forEach(n => { if (n.id === compId) n.dismissed = true })
  upUI()
}

export function resolveRivalOffer(offerId, accept) {
  if (!G.rivalOffers) return
  const offer = G.rivalOffers.find(o => o.id === offerId)
  if (!offer) return
  if (offer.type === 'prospect_bid') {
    if (!accept) {
      G.rivalOffers = G.rivalOffers.filter(o => o.id !== offerId)
      aL(tr('toast.adv.blockedApproach', { village: offer.village }), 'good')
    } else {
      const p = G.prospects?.find(x => x.id === offer.prospectId)
      if (p) { G.prospects = G.prospects.filter(x => x.id !== offer.prospectId); aL(offer.village + ' signed ' + (p.fn || 'prospect') + '.', 'neutral') }
      G.rivalOffers = G.rivalOffers.filter(o => o.id !== offerId)
    }
  } else if (offer.type === 'trade_proposal') {
    if (accept) {
      const theirs = G.villages.find(v => v.n === offer.rivalVillage)?.roster?.find(s => s.id === offer.offeredId)
      const mine = G.shinobi.find(s => s.id === offer.targetId)
      if (theirs && mine) {
        G.shinobi = G.shinobi.filter(s => s.id !== mine.id)
        G.memorial.push({ name: sn(mine), rank: RANKS[mine.ri], clan: mine.clan, year: G.year, month: G.month, wins: mine.wins, lastWords: 'Transferred to ' + offer.rivalVillage + '.', transfer: true })
        theirs.homeVillage = G.vName; theirs.status = 'available'; theirs.salary = Math.round(sPow(theirs) * 6)
        normalizeRecruit(theirs)   // rival rosters are built by a different generator
        G.shinobi.push(theirs)
        if (theirs.homeVillage !== G.vName) { const rv = G.villages.find(v => v.n === offer.rivalVillage); if (rv?.roster) rv.roster = rv.roster.filter(s => s.id !== theirs.id) }
        aL(tr('toast.adv.tradeCompleted', { name: offer.offeredName }), 'good')
      }
    } else aL(tr('toast.adv.tradeDeclined'), 'neutral')
    G.rivalOffers = G.rivalOffers.filter(o => o.id !== offerId)
  }
  if (G.narrativeInbox) G.narrativeInbox.forEach(n => { if (n.id === offerId) n.dismissed = true })
  upUI()
}

export function resolveQuickDecision(eventId, choiceId) {
  if (!G.pendingQuickDecision) return
  const pool = G._quickEventPool || []
  const ev = pool.find(e => e.id === eventId)
  const opt = ev?.options?.find(o => o.id === choiceId)
  if (opt?.effect) opt.effect(G)
  if (G.narrativeInbox) G.narrativeInbox.forEach(n => { if (n.id === G.pendingQuickDecision?.id) n.dismissed = true })
  G.pendingQuickDecision = null
  upUI()
}

export function runTrainingCamp() {
  const cost = 8000
  if ((G.ryo || 0) < cost) { if (typeof ntf === 'function') ntf(tr('toast.adv.needTrainingCamp')); return }
  G.ryo -= cost
  let boosted = 0
  G.shinobi.filter(s => s.status === 'available' || s.status === 'injured').forEach(s => {
    s.fatigue = Math.max(0, (s.fatigue || 0) - 30)
    s.workload = Math.max(0, (s.workload || 0) - 15)
    const statKeys = Object.keys(s.stats || {})
    if (statKeys.length) {
      const k = statKeys[Math.floor(Math.random() * statKeys.length)]
      s.stats[k] = clamp((s.stats[k] || 0) + rnd(1, 3), 0, 100)
    }
    boosted++
  })
  G.morale = clamp((G.morale || 50) + 5, 0, 100)
  G.narrativeInbox = G.narrativeInbox || []
  G.narrativeInbox.push({ id: Math.random().toString(36).slice(2), type: 'intel_report', tag: 'intel', title: 'Training Camp Complete', body: `${boosted} shinobi reset fatigue and received targeted stat training. Morale +5.`, year: G.year, month: G.month })
  if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
  upUI()
}
