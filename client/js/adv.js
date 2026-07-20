import { G, ui, sPow, sqP, sn, rnd, pk, clamp, fmt, rfM, rfP, KAGE_EVENTS, addChronicle, addLegend, genRegionProspect, genStudent, computeHarmony, genTransferPool, pDesc, genScoutNarrative, senseiStyle, genTrainingReport, revealDevCurve, getLeadershipGroup, addTrait, addRumor, addNotice, computeMarketValue, mS, getMissionSpecBonus } from './state.js'
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
import { refreshMissionBoard, maybeSpawnChain, advanceChain } from './missionGen.js'
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
import { tickMentorships } from '../../shared/utils/mentorship.js'
import { pushNarrative } from './tick/inbox.js'
import { tickRivalSim, tickRivalGMMoves } from './tick/rivals.js'
import { tickOffSeason } from './tick/offSeason.js'
import { t as tr } from '../../shared/utils/i18n.js'

function currentSeason() { return MONTHS[G.month - 1]?.season || 'Spring' }

// ── Narrative inbox + thread helper ───────────────────────────────────────────
// pushNarrative lives in ./tick/inbox.js (shared with extracted tick modules); imported above.

// ── Mission log ────────────────────────────────────────────────────────────────
function pushMissionLog(entry) {
  if (!G.missionLog) G.missionLog = []
  G.missionLog.push({ id: Math.random().toString(36).slice(2), ...entry, year: G.year, month: G.month })
  if (G.missionLog.length > 30) G.missionLog.splice(0, G.missionLog.length - 30)
  G.lifetimeMissions = (G.lifetimeMissions || 0) + 1
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
  // Sakeru Sand Armor and Kureni Ninth Primal Mode both grant KIA immunity once per year
  if (b.n !== 'Sakeru' && b.n !== 'Kureni') return false
  if (!G._jkKIAImmuneYear) G._jkKIAImmuneYear = {}
  if (G._jkKIAImmuneYear[b.n] === G.year) return false
  G._jkKIAImmuneYear[b.n] = G.year
  aL(tr('toast.adv.jkDeflect', { name: sn(s), beast: b.n, mode: b.n === 'Kureni' ? 'Ninth Primal Mode' : 'Sand Armor' }), 'good')
  return true
}

// ── Injury helpers ─────────────────────────────────────────────────────────────
function pickInjuryType(mRk) {
  const pool = RANK_INJ_POOL[mRk] || ['muscle']
  return INJURY_TYPES.find(t => t.id === pool[Math.floor(Math.random() * pool.length)])
}

function applyInjury(s, injType, hL, extraReduction = 0) {
  const medics = (G.staff || []).filter(st => st.role === 'medical')
  // R26: seasoned medics recover shinobi faster (level bonus on the base reduction).
  const medReduction = medics.reduce((a, st) => a + 0.5 * staffLevelBonus(st.staffLevel), 0)
  let dur = rnd(injType.minMo, injType.maxMo)
  const resist = s.injuryResist ? 1 : 0  // R25: careful rehab leaves lingering resistance (one-shot)
  dur = Math.max(1, Math.round(dur - (s.pers?.effect?.injReduct || 0) - hL - medReduction - extraReduction - resist))
  s.injuryResist = 0
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
    aL(tr('toast.adv.injuryProne', { name: sn(s), count: s.injuryCount }), 'warn')
    addNotice(sn(s) + '\'s repeated injuries are becoming a pattern — scouts will take note.', 'warn')
  }

  if (injType.id === 'severe' && injType.statLoss && Math.random() < 0.3) {
    const k = pk(['ninjutsu','taijutsu','speed','chakra'])
    s.stats[k] = Math.max(5, s.stats[k] - rnd(1, 3))
    aL(tr('toast.adv.permStatLoss', { name: sn(s) }), 'bad')
  }
  // Career-threatening injury personality evolution (severe, 3+ months)
  if (injType.id === 'severe' && dur >= 3) {
    if (s.pers?.n === 'Reckless' && Math.random() < 0.40) {
      s.pers = { n:'Careful', cat:'pos', desc:'A serious injury changed everything. They now calculate before acting.', effect:{ riskMod:-0.10 } }
      aL(tr('toast.adv.recklessBurnout', { name: sn(s) }), 'warn')
      addNotice(sn(s) + ' is a changed shinobi after their injury.', 'neutral')
    } else {
      const roll = Math.random()
      if (roll < 0.30) {
        if (addTrait(s, 'Resilient')) aL(tr('toast.adv.resilientTrait', { name: sn(s) }), 'good')
      } else if (roll < 0.50) {
        if (addTrait(s, 'Fragile')) {
          // Fragile: minor permanent stat reduction
          const k = pk(['ninjutsu','taijutsu','speed'])
          s.stats[k] = Math.max(5, s.stats[k] - 2)
          aL(tr('toast.adv.fragileTrait', { name: sn(s) }), 'bad')
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
  aL(tr('toast.adv.trauma', { name: sn(s), status: s.traumaStatus }), 'warn')
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
      aL(tr('toast.adv.missionInjury', { name: sn(s), injury: injType.n, mission: m.n }), 'warn')
    }
  }
}

function addWorkload(s, mRk) {
  s.workload = clamp((s.workload || 0) + (RANK_WORKLOAD[mRk] || 10), 0, 100)
  s.fatigue = clamp((s.fatigue || 0) + ({ S: 25, A: 18, B: 12, C: 8, D: 4 }[mRk] || 8), 0, 100)
  s.consecutiveMissions = (s.consecutiveMissions || 0) + 1
}
function fatiguePenalty(s) {
  const f = s.fatigue || 0
  return f >= 80 ? -0.15 : f >= 60 ? -0.09 : f >= 40 ? -0.04 : 0
}
export function gradeShinobi(s) {
  const pow = sPow(s)
  const pot = Math.max(1, s.potential || 50)
  let score = (pow / pot) * 100
  if ((s.streak || 0) >= 3) score += 8
  if ((s.lossStreak || 0) >= 3) score -= 8
  score -= (s.fatigue || 0) * 0.25
  if (s.declineMod) score += s.declineMod * 25
  if (score >= 82) return { label: 'S', color: '#c9a84c' }
  if (score >= 66) return { label: 'A', color: '#8fbc8f' }
  if (score >= 50) return { label: 'B', color: '#87ceeb' }
  if (score >= 34) return { label: 'C', color: '#b0a88a' }
  if (score >= 18) return { label: 'D', color: '#fa0' }
  return { label: 'F', color: '#f44' }
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
  const base = villageRevenue(G.reputation || 0, G.prestigeTier || 'D')
  return Math.round(base * (G._citizenRevMult || 1))
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
    aL(tr('toast.adv.learnedJutsu', { name: sn(s), jutsu: j.n, tier: j.tier, desc: j.desc }), 'good')
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
      aL(tr('toast.adv.bondFormed', { a: sn(a), b: sn(b), type }), 'good')
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

// Hall of Fame — induct a departing shinobi (retirement/death) if their career
// clears the threshold. Idempotent per shinobi. Returns the entry or null.
export function maybeInduct(s, how) {
  if (!s || !isHofWorthy(s)) return null
  G.hallOfFame = G.hallOfFame || []
  if (G.hallOfFame.some(e => e.id === s.id)) return null
  const entry = buildHofEntry(s, how, G.year)
  G.hallOfFame.push(entry)
  addChronicle('Hall of Fame — ' + entry.name, `${entry.name} is inducted into the Hall of Fame (${entry.reason}).`, 'milestone')
  aL(tr('toast.adv.hofInducted', { name: entry.name, reason: entry.reason }), 'good')
  addLegend(3)
  return entry
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
  if (!v.ok) { aL(tr('toast.adv.cannotChannel', { beast: beastName, reason: v.reason.replace('_', ' ') }), 'bad'); return }
  G.ryo -= ACTIVATION_COST
  b.activeUntil = G.month + ACTIVE_DURATION
  b.cooldownUntil = G.month + COOLDOWN
  if (s) s._aggro = (s._aggro || 0) + AGGRO_INCREASE
  aL(tr('toast.adv.channels', { name: sn(s), beast: beastName, cost: fmt(ACTIVATION_COST) }), 'good')
  upUI()
}

export function adv() {
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
        aL(tr('toast.adv.districtComplete', { name: def?.n || d.id }), 'good')
        ntf(tr('toast.adv.districtBuilt', { icon: def?.icon || '🏗', name: def?.n || d.id }))
      }
    }
  })
  if (dp.monthlyRyo > 0) G.ryo += dp.monthlyRyo

  // ── Persistent world flag tick-down ─────────────────────────────────────
  Object.keys(G.worldFlags || {}).forEach(k => {
    G.worldFlags[k]--
    if (G.worldFlags[k] <= 0) { delete G.worldFlags[k]; aL(tr('toast.adv.flagEnded', { flag: k }), 'neutral') }
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
  // ── Pillar 6a: Tier-based rep floor + softened decay ─────────────────────
  const TIER_REP_FLOOR = { D: 5, C: 15, B: 25, A: 40, S: 60 }
  const TIER_MORALE_FLOOR = { D: 20, C: 30, B: 40, A: 50, S: 60 }
  const tierKey = G.prestigeTier || 'D'
  const repFloor = TIER_REP_FLOOR[tierKey] || 5
  const moraleFloor = (TIER_MORALE_FLOOR[tierKey] || 20) + completedEffect(G.prestigeCompleted, 'moraleFloor')
  if ((G.reputation || 0) < repFloor) G.reputation = Math.min(repFloor, (G.reputation || 0) + 2)
  // Hard morale floor — tier prestige + completed monuments buy resilience.
  G._moraleFloor = moraleFloor
  if ((G.morale || 50) < moraleFloor) G.morale = clamp(moraleFloor, 0, 100)

  // ── Prestige projects — advance multi-year monument builds ────────────────
  G.prestigeBuilds = G.prestigeBuilds || []
  G.prestigeCompleted = G.prestigeCompleted || []
  if (G.prestigeBuilds.length) {
    const stillBuilding = []
    for (const b of G.prestigeBuilds) {
      b.monthsDone = (b.monthsDone || 0) + 1
      const def = PROJECT_BY_ID[b.id]
      if (def && b.monthsDone >= def.buildMonths) {
        G.prestigeCompleted.push(b.id)
        if (def.effect?.legend) addLegend(def.effect.legend)
        G.morale = clamp((G.morale || 50) + 5, 0, 100)
        aL(tr('toast.adv.projectComplete', { icon: def.icon, name: def.name }), 'good')
        addChronicle(def.name + ' Completed', `The ${def.name} stands complete — ${def.desc}`, 'milestone')
        addNewsItem(`${def.icon} ${G.vName} completed the ${def.name}.`)
      } else stillBuilding.push(b)
    }
    G.prestigeBuilds = stillBuilding
  }

  // ── Citizen morale — village population sentiment ─────────────────────────
  if (!G.citizenMorale) G.citizenMorale = 60
  const _cm = G.citizenMorale
  // Win streaks lift spirits; KIA and loss streaks erode trust
  const _recentWins = (G.winStreak || 0)
  const _recentLoss = (G.lossStreak || 0)
  const _kiaThisMonth = (G._kiaThisMonth || 0)
  let _cmDelta = 0
  if (_recentWins >= 3) _cmDelta += 2
  else if (_recentWins >= 1) _cmDelta += 1
  if (_recentLoss >= 3) _cmDelta -= 3
  else if (_recentLoss >= 1) _cmDelta -= 1
  if (_kiaThisMonth > 0) _cmDelta -= _kiaThisMonth * 2
  if ((G.reputation || 0) >= 50) _cmDelta += 1
  // Slow drift toward 50 when nothing is happening
  if (_cmDelta === 0) _cmDelta = G.citizenMorale > 50 ? -1 : G.citizenMorale < 50 ? 1 : 0
  G.citizenMorale = clamp(G.citizenMorale + _cmDelta, 0, 100)
  G._kiaThisMonth = 0
  // Citizen morale multiplies village revenue
  G._citizenRevMult = 0.7 + (G.citizenMorale / 100) * 0.6  // 0.7x at 0 morale, 1.3x at 100
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
    { id:'scroll', options:[{ id:'study', effect: g => { g.shinobi.filter(s=>s.status==='available').slice(0,3).forEach(s=>{const k=pk(['ninjutsu','taijutsu','genjutsu','chakra']);s.stats[k]=clamp((s.stats[k]||0)+3,0,99)}); aL(tr('toast.adv.scrollStudied2'),'good') } }, { id:'sell', effect: g => { g.ryo+=4500; aL('Scroll sold — 4,500 ryo.','good') } }] },
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
        maybeInduct(s, 'retired')
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
          maybeInduct(s, 'retired')
          s.status = 'retired'
          return
        }
      }
    }

    // Ensure new fields on existing shinobi
    if (s.workload === undefined) s.workload = 0
    if (s.fatigue === undefined) s.fatigue = 0
    if (s.consecutiveMissions === undefined) s.consecutiveMissions = 0
    if (s.traumaStatus === undefined) s.traumaStatus = null
    if (s.traumaCount === undefined) s.traumaCount = 0
    if (s.returningForm === undefined) s.returningForm = 100
    if (s.injuryType === undefined) s.injuryType = null

    if (s.status === 'injured') {
      // R25: rehab plan governs speed / re-injury risk / returning form.
      const _hasMedic = (G.staff || []).some(st => st.role === 'medical')
      const _plan = effectivePlan(s.rehabPlan, _hasMedic)
      const _q = medQuality((G.staff || []).filter(st => st.role === 'medical').length, G.upgrades.hospital || 0)
      if (_plan === 'rush' && Math.random() < reinjuryChance(_plan, _q)) {
        s.injDays += rnd(1, 2); s.morale = clamp((s.morale || 50) - 4, 0, 100)
        aL(sn(s) + ' aggravated the injury rushing back — recovery extended.', 'warn')
      } else {
        s.injDays = Math.max(0, s.injDays - recoveryStep(_plan))
      }
      if (s.injDays === 0) {
        s.status = 'available'
        s.injuryType = null
        s.returningForm = Math.min(s.returningForm ?? 100, returningForm(_plan))
        if (_plan === 'careful') s.injuryResist = 1  // shrugs off the next injury a bit
        s.rehabPlan = null
        aL(sn(s) + ' recovered from injury.', 'good')
      }
    }
    if (s.status === 'available') {
      // Workload + fatigue recovery
      s.workload = Math.max(0, s.workload - 10)
      s.fatigue = Math.max(0, (s.fatigue || 0) - (s.restMonth ? 20 : 8))
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
          aL(tr('toast.adv.defected', { name: sn(s) }), 'bad')
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
      const mentorBoost = 1 + mentorGrowthBonus(s, G.shinobi) + (cp.growthBonus || 0) + (dp.statGrowthBonus || 0) + ((DOCTRINE_BY_ID[G.villageDoctrine]?.growthMod) || 0) + kageMod(G, 'mentorship')
      if (Math.random() < 0.25 * tgM * mentorBoost * opportunityGrowthMod(s.workload)) {
        const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
        const kG = k === 'intelligence' && s.pers.n === 'Bookworm' ? 2 : 1
        if (sPow(s) < s.potential) s.stats[k] = clamp(s.stats[k] + rnd(1, kG * 2), 0, 99)
      }
      if (s.pers.n === 'Ambitious' && Math.random() < 0.15) {
        const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
        s.stats[k] = clamp(s.stats[k] + 1, 0, 99)
      }

      // ── Route C: Dev path stat bias ────────────────────────────────────
      if (s.devPath && Math.random() < 0.22 && sPow(s) < s.potential) {
        const _pathFocus = { anbu:['ninjutsu','genjutsu'], anchor:['taijutsu','chakra'], machine:['intelligence','speed'] }
        const fk = _pathFocus[s.devPath]
        if (fk) s.stats[pk(fk)] = clamp(s.stats[pk(fk)] + 1, 0, 99)
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
    // Annual salary raise — seniority scaling so cap bites after 5+ years
    if (s.months > 0 && s.months % 12 === 0 && s.status !== 'retired') {
      s.salary = Math.round((s.salary || 500) * 1.05)
    }
    const pw = sPow(s), thresh = [0, 30, 55, 78, 90]
    if (s.ri < 4 && pw >= thresh[s.ri + 1] && s.months >= (s.ri + 1) * 12 && s.status === 'available') {
      s.ri++; s.salary = Math.round((s.salary || 500) * 1.1) // promotion bump on top of seniority
      const newRankName = RANKS[s.ri]
      aL(sn(s) + ' promoted to ' + newRankName + '! ' + pickRankUpNarrative(sn(s), newRankName), 'good')
      pushNarrative(genRankUpBlurb(sn(s), s.ri))
      addLegend(s.ri * 3)
    }
  })
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
      if (!Number.isFinite(best.salary)) best.salary = 500
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
        aL(tr('toast.adv.intelConfirmed', { name: sn(prospect), potential: prospect.potential, suffix: degraded ? ' ⚠ degraded.' : '.' }), degraded ? 'warn' : 'good')
        ntf(prospect.fn + '\'s potential revealed' + (degraded ? ' (degraded!)' : '') + '!')
      } else {
        aL(tr('toast.adv.prospectMovedOn'), 'neutral')
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
        aL(b.n + ' captured! Assign a Vessel.', 'good'); ntf(b.n + ' sealed!')
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
      const _appMod = missionApproachMod(am.approach, m.spec)  // tactical approach vs mission spec
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
      const sqFatigueMod = sq.members.reduce((acc, id) => { const mb = G.shinobi.find(x => x.id === id); return acc + (mb ? fatiguePenalty(mb) : 0) }, 0) / Math.max(1, sq.members.length)
      const sqGrindMod = grindMod(sq.consecutiveDeployMonths || 0)
      const sc = clamp(1 - m.risk - prepRiskMod + (pw - m.mp) * 0.005 + iB + syn.successMod + bondBonus + sb.missionSuccessBonus + sb.squadMissionBonus + anbuBon + rB2.missionBonus - rB2.riskReduction + chemBonus + prepMod + sqJutsuMod + dp.missionRiskReduction + cp.successMod + sqBondMod + clP.successMod + shP.opSuccessBonus + sqDeclineMod + _bloodlineBonus(sq.members) + _formationMod(sq) + _nationSuccessMod() + _philosophySuccessMod() + (am._scMod || 0) + sqFatigueMod + sqGrindMod + _appMod.sc - _appMod.risk - (am._riskMod || 0) + kageMod(G, 'command'), 0.1, successCeiling(m.rk))

      const _mev = resolveMission(sc)
      const _mq = qualityEffects(_mev.quality)
      G._formThisMonth.marginSum += _mev.margin
      if (_mev.success) {
        G._formThisMonth.wins++
        const _bonusRyo = Math.round(m.ryo * _mq.ryoMult * (1 + (am._ryoMod || 0)))
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
          if (m.rk === 'S') {
            s.winsS = (s.winsS || 0) + 1; s._seasonSRankWins = (s._seasonSRankWins || 0) + 1
            if (s.winsS === 1) {
              aL(tr('toast.adv.firstSrank', { name: sn(s) }), 'good')
              G.narrativeInbox = G.narrativeInbox || []
              G.narrativeInbox.push({ id: Math.random().toString(36).slice(2), type: 'milestone', tag: 'career', title: `First S-Rank: ${sn(s)}`, body: `${sn(s)} has cleared their first S-rank mission. This is the moment careers are made of.`, year: G.year, month: G.month })
            }
          }
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
              if (sA && sB) aL(tr('toast.adv.fieldChemistry', { a: sn(sA), b: sn(sB) }), 'good')
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
        G.lastMissionReport = _buildMissionReport(sq, m, true, _mev, _bonusRyo)
        G._battleReportFresh = true   // arms the auto-watch viewer for this turn
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
              aL(tr('toast.adv.bondEvent', { text: ev.text.replace('{a}', sn(sA)).replace('{b}', sn(sB)) }), 'good')
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
            maybeInduct(s, 'fallen'); G._kiaThisMonth = (G._kiaThisMonth || 0) + 1; G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: m.n, year: G.year, month: G.month, wins: s.wins, lastWords })
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
              aL(tr('toast.adv.lastWords', { quote, name: sn(survivor) }), 'warn')
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
        sq.cohesion = Math.max(0, (sq.cohesion ?? 0) + (hadKIA ? -15 : -4) - grindCohesionPenalty(sq.consecutiveDeployMonths || 0))
        sq.losses++
        const _sqFailNarr = pickSquadNarrative(m.rk, 'failure', sq.n)
        const _sqFailTag = _mev.quality === 'disaster' ? '💥 Disaster — ' : ''
        aL(_sqFailTag + '"' + m.n + '" squad mission failed. ' + _sqFailNarr, 'bad')
        recordPlayerTactic(G.rivalTendencies, m.rk, _mev.quality, true)
        G.villages.forEach(v => observePlayerTactic(v, m.rk, true))
        if (_mev.quality === 'disaster') pushNarrative(genMissionBlurb(sq.n, 2, m.n, 'disaster'))
        pushMissionLog({ missionName: m.n, rank: m.rk, success: false, ryo: 0, rep: 0, narrative: _sqFailNarr, quality: _mev.quality })
        G.morale = clamp(G.morale - 5 + _mq.morale, 0, 100)
        G.lastMissionReport = _buildMissionReport(sq, m, false, _mev)
        G._battleReportFresh = true   // arms the auto-watch viewer for this turn
      }
    } else {
      const s = G.shinobi.find(x => x.id === am.assignedTo); if (!s) return
      const pw = sPow(s), rM = s.pers.effect.riskMod || 0, sM = pw < m.mp ? (s.pers.effect.sucMod || 0) : 0, sB = s.pers.effect.soloBonus || 0
      const soloFormMod = ((s.returningForm || 100) < 100) ? ((s.returningForm - 100) / 500) : 0
      const soloAnbuBon = (m.rk === 'S' || m.rk === 'A') ? sb.anbuMissionBonus : 0
      const beastLuck = G._beastMissionLuck || 0
      ensureCareerFields(s)
      const soloPrepMod = G.missionPrepMode === 'aggressive' ? 0.08 : G.missionPrepMode === 'cautious' ? -0.06 : 0
      const _soloAppMod = missionApproachMod(am.approach, m.spec)  // tactical approach vs mission spec
      const jLB = jutsuLoadoutBonus(s, JUTSU_LIST)
      const bMB = bondMissionBonus(s, G.shinobi)
      const sc = clamp(1 - m.risk - rM + (pw - m.mp) * 0.01 + iB + sM + sB + sb.missionSuccessBonus + soloAnbuBon + soloFormMod + beastLuck + (s.declineMod || 0) + soloPrepMod + jLB.successMod + jLB.powerMod * 0.5 + dp.missionRiskReduction + cp.successMod + bMB.successMod + clP.successMod + shP.opSuccessBonus + _bloodlineBonus([s.id]) + _nationSuccessMod() + _philosophySuccessMod() + confidenceMod(s) + rivalScPenalty(G.villages, m.rk) + (am._scMod || 0) + fatiguePenalty(s) + getMissionSpecBonus(s, m) + _soloAppMod.sc - _soloAppMod.risk - (am._riskMod || 0) + kageMod(G, 'command'), 0.08, successCeiling(m.rk))
      const rB = ['A','S'].includes(m.rk) && s.pers.n === 'Honorable' ? 2 : 0

      addWorkload(s, m.rk)
      // Hanaku Lucky Scales: failed mission becomes marginal success once per month
      const chomeiActive = hasUniqueAbility(s.id, 'Hanaku') && !G._hanakuLuckyUsed
      const rollResult = Math.random()
      const missionPassed = rollResult < sc || (rollResult >= sc && chomeiActive && (() => { G._hanakuLuckyUsed = true; aL(tr('toast.adv.hanakuLucky', { name: sn(s) }), 'good'); return true })())
      const _mev = resolveMission(sc, Math.random, { success: missionPassed })
      const _mq = qualityEffects(_mev.quality)
      G._formThisMonth.marginSum += _mev.margin
      if (missionPassed) G._formThisMonth.wins++; else G._formThisMonth.losses++
      if (missionPassed) {
        const _bonusRyo = Math.round(m.ryo * _mq.ryoMult * (1 + (am._ryoMod || 0)))
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
        // R8+: solo missions get the live viewer + micro-call too (single-member squad shim).
        G.lastMissionReport = _buildMissionReport({ id: 'solo_' + s.id, n: sn(s), members: [s.id] }, m, true, _mev, _bonusRyo)
      } else {
        s.streak = 0
        s._seasonMissions = (s._seasonMissions || 0) + 1
        const kR = clamp((hL >= 2 ? 0.02 : hL >= 1 ? 0.04 : 0.08) + dp.kiaRiskMod + _philosophyKIAMod(), 0.005, 0.15)
        if (Math.random() < kR && !jkKIAImmune(s)) {
          const lastWords = pk(LAST_WORDS_POOL)
          aL(sn(s) + ' KIA on "' + m.n + '". ' + lastWords, 'bad')
          maybeInduct(s, 'fallen'); G._kiaThisMonth = (G._kiaThisMonth || 0) + 1; G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: m.n, year: G.year, month: G.month, wins: s.wins, lastWords })
          pushNarrative(genKIABlurb(sn(s), s.ri, m.n))
          if (s.wins >= 50) addChronicle('Fallen Veteran', sn(s) + ' died on "' + m.n + '" after ' + s.wins + ' missions. ' + lastWords, 'shinobi')
          G._mandateKIAThisYear = (G._mandateKIAThisYear || 0) + 1
          const ripple = kiaRipple(s.id, G.shinobi.filter(x => x.id !== s.id))
          ripple.forEach(r => {
            const affected = G.shinobi.find(x => x.id === r.shinobiId)
            if (affected) { affected.morale = clamp((affected.morale || 50) + r.delta, 0, 100); aL(tr('toast.adv.shakenByLoss', { name: sn(affected), fallen: sn(s) }), 'bad') }
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
            aL(tr('toast.adv.missionFailedInjury', { mission: m.n, name: sn(s), injury: injType.n, days: s.injDays, narrative: pickNarrative(m.rk, 'failure', sn(s), s.pers.n, { wins: s.wins, streak: s.streak, season }) }), 'bad')
          }
          // Re-injury risk for those returning from long absence
          if ((s.returningForm || 100) < 80 && Math.random() < 0.20) {
            aL(sn(s) + ' re-injured themselves — too soon to return to active duty.', 'warn')
          }
          // R8+: a surviving solo shinobi's failed mission is watchable too.
          G.lastMissionReport = _buildMissionReport({ id: 'solo_' + s.id, n: sn(s), members: [s.id] }, m, false, _mev, 0)
        }
        updateConfidence(s, _mev.quality)
        addMemory(s, 'mission_disaster', m.id || m.n, { year: G.year, month: G.month })
        if (_mev.quality === 'disaster') {
          setEmotionalState(s, 'fearful')
          // Aftermath inbox item — gives the player narrative context on the failure
          G.narrativeInbox.push({
            id: Math.random().toString(36).slice(2),
            title: 'Debrief: ' + m.n,
            body: sn(s) + ' returned from "' + m.n + '" with nothing to show. ' +
              (m.rk === 'S' ? 'The Daimyo will want answers.' : m.rk === 'A' ? 'The village felt the setback.' : 'Morale has taken a hit.'),
            tag: 'mission', link: 'missions', priority: 2,
            year: G.year, month: G.month, actorIds: [s.id],
          })
        }
        // Costly/failed: recovery op spawns on costly (30%) or any other failure (10%)
        const _recoveryChance = _mev.quality === 'costly' ? 0.30 : 0.10
        if (!m.isFollowUp && Math.random() < _recoveryChance) {
          G.avM.push({
            ...m,
            id: Math.random().toString(36).slice(2),
            n: '[Recovery] ' + m.n,
            ryo: Math.round(m.ryo * 0.55),
            rep: Math.max(1, Math.ceil(m.rep / 2)),
            risk: Math.max(0.05, m.risk - 0.08),
            dur: Math.max(1, m.dur - 1),
            expiresMonth: (G.month || 1) + 2,
            addedYear: G.year || 1,
            isFollowUp: true,
          })
          aL(tr('toast.adv.recoveryOp'), 'neutral')
        }
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
    const _climateRaid = Math.max(0, 1 + ((G.worldClimate?.raidMod) || 0))  // calm halves, volatile near-doubles
    if (Math.random() < (0.12 + aggressiveBonus) * _climateRaid) {
      const ev = pk(RAID_POOL), warn = G.upgrades.intel >= 2 ? 2 : G.upgrades.intel >= 1 ? 1 : 0
      G.raid = { ...ev, resolved: false }; G.raidW = warn
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
    // Matchday tactic (player pick, persists monthly): a good read on this
    // fixture's opponent style swings the player's effective strength ±.
    const _pairs = roundPairings(names, G.season.round)
    const _myFx = _pairs.find(([a, b]) => a === playerName || b === playerName)
    const _myOpp = _myFx ? (_myFx[0] === playerName ? _myFx[1] : _myFx[0]) : null
    const _tMod = _myOpp ? tacticMod(G.matchdayTactic || 'standard', identityFor(_myOpp).style) : 0
    const strOf = name => name === playerName
      ? Math.max(10, Math.round(((G._playerStrength || 50) + formBonus) * (1 + _tMod)))
      : ((G.villages.find(v => v.n === name)?.strength) || 50)
    // Matchday styles: rivals play to their village identity; the player's style
    // follows their coaching philosophy (aggressive→blitz, defensive→fortress).
    const _philStyle = { aggressive: 'blitz', defensive: 'fortress' }[G.coachingPhilosophy] || 'balanced'
    const styleOf = name => name === playerName ? _philStyle : identityFor(name).style
    playMatchday(G.season, names, strOf, Math.random, styleOf)

    // ── Rivalry: all-time head-to-head + the derby fixture ───────────────────
    // Each January the most hostile rival becomes the year's derby; derby
    // results swing morale/reputation beyond the points and feed the press.
    if (G.month === 1 || !G.derbyRival) {
      const dv = pickDerbyRival(G.villages, G.derbyRival)
      if (dv && dv.n !== G.derbyRival) {
        G.derbyRival = dv.n
        aL(tr('toast.adv.derbyNamed', { ico: dv.ico, village: dv.n }), 'ev')
        addNotice(`${dv.ico} ${dv.n} named this year's derby rival — those fixtures now carry the village's pride.`, 'warn')
      } else if (dv) G.derbyRival = dv.n
    }
    G.h2h = G.h2h || {}
    const _myMatch = (G.season.lastResults || []).find(m => m.a === playerName || m.b === playerName)
    if (_myMatch) {
      updateH2H(G.h2h, playerName, _myMatch)
      const _mOpp = _myMatch.a === playerName ? _myMatch.b : _myMatch.a
      if (_mOpp === G.derbyRival) {
        const _dps = _myMatch.a === playerName ? _myMatch.scoreA : _myMatch.scoreB
        const _dos = _myMatch.a === playerName ? _myMatch.scoreB : _myMatch.scoreA
        if (_myMatch.winner === playerName) {
          G.morale = clamp(G.morale + 3, 0, 100)
          G.reputation = clamp(G.reputation + 2, 0, 999)
          aL(tr('toast.adv.derbyWin', { village: _mOpp, ps: _dps, os: _dos }), 'good')
        } else if (_myMatch.winner) {
          G.morale = clamp(G.morale - 3, 0, 100)
          aL(tr('toast.adv.derbyLoss', { village: _mOpp, ps: _dps, os: _dos }), 'bad')
          if (!G.pendingPress && Math.random() < 0.3) queuePressConference('rivalry_heat', { rivalName: _mOpp })
        } else {
          aL(tr('toast.adv.derbyDraw', { village: _mOpp, ps: _dps, os: _dos }), 'neutral')
        }
      }
    }

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

    // Mid-season pressure: standings-driven noticeboard items (title race / slump /
    // council heat). Throttled to once every 2 months, and never repeats the same
    // kind back-to-back, so it reads as narrative beats rather than spam.
    const _notice = seasonPressNotice(G.season.table, playerName, G.season.round, 11)
    if (_notice && G.month - (G._lastSeasonPressMonth || -99) >= 2 && _notice.kind !== G._lastSeasonPressKind) {
      G.noticeboard = G.noticeboard || []
      G.noticeboard.unshift({
        id: 'seasonpress_' + G.year + '_' + G.month,
        cat: 'Standings', icon: _notice.icon, priority: _notice.priority,
        title: _notice.title, body: _notice.body, dismissed: false,
      })
      G._lastSeasonPressMonth = G.month
      G._lastSeasonPressKind = _notice.kind
      ntf(tr('toast.adv.noticeNtf', { title: _notice.title }))
    }
  }

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

  // ── Staff tick ────────────────────────────────────────────────────────────
  if (!G.staff) G.staff = [];
  (G.staff || []).forEach(st => {
    st.monthsServed = (st.monthsServed || 0) + 1
    // R26: on-the-job experience — level up toward mastery, sharpening their craft.
    const _xpRes = addStaffXp(st, 4 + (st.asstKage ? 2 : 0))
    if (_xpRes.leveledUp) {
      const _r = STAFF_ROLES.find(r => r.id === st.role)
      if (_r && _r.stats[0]) st.stats[_r.stats[0]] = clamp((st.stats[_r.stats[0]] || 10) + 1, 1, 20)
      aL(`${st.fn} ${st.ln} reached ${staffTitle(st.staffLevel)} (staff level ${st.staffLevel}).`, 'good')
    }
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
      aL(tr('toast.adv.staffConflict', { a: `${headSensei.fn} ${headSensei.ln}`, b: `${clashCandidate.fn} ${clashCandidate.ln}` }), 'warn')
      ntf(tr('toast.adv.staffConflictShort'))
      addNotice('A conflict between your Head Sensei and a Team Sensei has escalated. Mediation needed.', 'warn')
    }
  }

  // Staff poaching by rival villages
  if (!G.staffPoachOffer) {
    const poachTargets = (G.staff || []).filter(st => st.rating >= 14 && !st.asstKage)
    if (poachTargets.length > 0 && Math.random() < 0.04) {
      const target = poachTargets.sort((a, b) => b.rating - a.rating)[0]
      const poachVillage = (pk(G.villages || []) || {}).n || 'a rival village'
      const matchCost = Math.round(target.salary * rnd(12, 18))
      const expMonth = G.month === 12 ? 1 : G.month + 1
      const expYear = G.month === 12 ? G.year + 1 : G.year
      G.staffPoachOffer = { staffId: target.id, staffName: target.fn + ' ' + target.ln, village: poachVillage, matchCost, expiresMonth: expMonth, expiresYear: expYear }
      aL(tr('toast.adv.staffPoach', { village: poachVillage, name: `${target.fn} ${target.ln}` }), 'warn')
      ntf(tr('toast.adv.staffPoachShort'))
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

  // Assistant Warden autonomous meeting handling
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
        aL(tr('toast.adv.akLog', { text: logText }), 'neutral')
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

  // ── Economy & Finance snapshot ────────────────────────────────────────────
  const trI = Math.round(G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0) * sb.tradeIncomeMultiplier)
  const coI = Math.round(G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0) * sb.tradeIncomeMultiplier)
  const jkI = G.beasts.filter(b => b.sealed && b.n === 'Niryuu' && b.jk).length * 3000
    + (G._kurenigykiBonus ? 5000 : 0) // Kureni+Hachitsuno trade bonus
  const daimyoB = Math.round(computeDaimyoBonus() * (G.daimyoBudgetMult || 1))
  const villageRev = Math.round(computeVillageRevenue() * (G.daimyoBudgetMult || 1) * revenueMult(G.populace?.support))
  if (!G.budgetPriority) G.budgetPriority = { training: 33, warPrep: 33, infra: 34 }
  const _infraPct = (G.budgetPriority.infra || 34) / 100
  const maintenance = Math.round(computeMaintenance() * (1 - _infraPct * 0.3))
  // twoWay players (farm-assigned) don't count against the salary cap payroll
  const shinobiSal = G.shinobi.reduce((a, s) => a + (s.salary || 0), 0)
  const capPayroll = G.shinobi.filter(s => !s.twoWay).reduce((a, s) => a + (s.salary || 0), 0)
  const staffSal = (G.staff || []).reduce((a, st) => a + (st.salary || 0), 0)
  const commI = Object.entries(G.finances?.missionCommissions || {}).reduce((a,[,v]) => a + v * 0, 0) // commissions already applied to G.ryo
  const examFeeAmt = G.finances?.examFees || 0
  const loanFeeAmt = G.finances?.loanFees || 0

  const _natIncMult = G._ff_nationHud ? (1 + nationMods(G.nationId).ryoMod) : 1
  // Climate + doctrine economic modifiers (variable playthroughs)
  const _docInc = (DOCTRINE_BY_ID[G.villageDoctrine]?.incomeMod) || 0
  const _climateInc = (G.worldClimate?.economyMod) || 0
  const _econMult = Math.max(0.3, 1 + _climateInc + _docInc + kageMod(G, 'administration'))
  const _kageStipend = kagePerk(G) === 'stipend' ? 600 : 0
  const totalIncome = Math.round((trI + coI + jkI + daimyoB + villageRev + examFeeAmt + loanFeeAmt + sponsorshipIncome + _kageStipend) * _natIncMult * _econMult)
  const totalExpend = shinobiSal + staffSal + maintenance
  const monthlyNet = totalIncome - totalExpend

  // Apply economy flows
  G.ryo += totalIncome  // nation-adjusted (see _natIncMult)
  G.ryo -= shinobiSal + staffSal + maintenance

  // ── Salary cap check ─────────────────────────────────────────────────────
  // Cap counts shinobi payroll only — staff are exempt infrastructure (see salaryCap.js).
  const _cs = capStatus(G.prestigeTier || 'D', capPayroll)
  G.capStatus = _cs
  G._capHardBlock = _cs.hardBlock
  // Luxury tax is a real treasury outflow, so fold it into the recorded net below —
  // otherwise every displayed "monthly net" understates the true burn by the tax.
  const luxuryTax = _cs.overBy > 0 ? _cs.luxuryTax : 0
  const netAfterTax = monthlyNet - luxuryTax
  if (_cs.overBy > 0) {
    G._mandateLuxTaxMonths = (G._mandateLuxTaxMonths || 0) + 1
    G.ryo = Math.max(0, G.ryo - _cs.luxuryTax)
    if (_cs.hardBlock) {
      aL(tr('toast.adv.hardCapExceeded', { pct: Math.round(_cs.pct * 100), tax: fmt(_cs.luxuryTax) }), 'bad')
    } else {
      aL(tr('toast.adv.luxuryTax', { tax: fmt(_cs.luxuryTax), label: _cs.label }), 'warn')
    }
  }

  // #12 Optional debt/overdraft (flag-gated): accrue interest instead of an implicit hole
  if (G._ff_debt && G.ryo < 0) {
    const d = applyDebt(G.ryo)
    G.ryo = d.ryo; G.debt = d.debt
    if (d.interestCharged > 0) aL(tr('toast.adv.arrears', { interest: fmt(d.interestCharged), debt: fmt(d.debt) }), 'bad')
  }

  // Record finance snapshot
  if (!G.finances) G.finances = { history:[], deficitMonths:0, healthTier:'Stable', lastMonthNet:0, missionCommissions:{D:0,C:0,B:0,A:0,S:0}, examFees:0, loanFees:0, scoutCostThisMonth:0 }
  const commByRank = G.finances.missionCommissions || {D:0,C:0,B:0,A:0,S:0}
  const commTotal = Object.entries(commByRank).reduce((a,[rk,cnt]) => a + cnt * (MISSION_COMMISSION[rk]||0), 0)
  const snap = {
    year: G.year, month: G.month,
    income: { tradeRoutes:trI, contracts:coI, vessel:jkI, daimyoBonus:daimyoB, villageRevenue:villageRev, missionCommissions:commTotal, examFees:examFeeAmt, loanFees:loanFeeAmt, sponsorship:sponsorshipIncome, nationBonus: totalIncome - (trI + coI + jkI + daimyoB + villageRev + examFeeAmt + loanFeeAmt + sponsorshipIncome) },
    expenditure: { shinobiWages:shinobiSal, staffWages:staffSal, maintenance, luxuryTax, scoutCost:G.finances.scoutCostThisMonth||0 },
    totalIncome, totalExpend: totalExpend + luxuryTax, net:netAfterTax,
    missionBreakdown: { ...commByRank },
    shinobiByRank: {
      Initiate: G.shinobi.filter(s=>s.ri===0).length,
      Adept: G.shinobi.filter(s=>s.ri===1).length,
      Veteran: G.shinobi.filter(s=>s.ri===2).length,
      Shadow: G.shinobi.filter(s=>s.ri===3).length,
      'S-Rank': G.shinobi.filter(s=>s.ri===4).length,
    }
  }
  G.finances.history.push(snap)
  if (G.finances.history.length > 12) G.finances.history.shift()
  G.finances.lastMonthNet = netAfterTax

  // Determine health tier — on the true net, so "Stable" can't hide a luxury-tax drain.
  const tier = computeFinanceTier(netAfterTax)
  G.finances.healthTier = tier.n
  if (tier.morale !== 0) G.morale = clamp(G.morale + tier.morale, 0, 100)

  // Telemetry (side-effect-only buffer; never alters game logic)
  emit('economy_tick', { year: G.year, month: G.month, ryo: G.ryo, net: netAfterTax, deficitMonths: G.finances.deficitMonths, tier: tier.n })
  emit('integrity_check', integrityCheck(G))

  // Deficit tracking & debt spiral
  if (netAfterTax < 0) {
    G.finances.deficitMonths = (G.finances.deficitMonths || 0) + 1
    if (G.finances.deficitMonths >= 3 && Math.random() < 0.25) {
      const ev = pk(FINANCIAL_EVENTS)
      G.ryo = Math.max(0, G.ryo + ev.ryo)
      if (ev.rep) G.reputation = clamp(G.reputation + ev.rep, 0, 999)
      if (ev.morale) G.morale = clamp(G.morale + ev.morale, 0, 100)
      aL(tr('toast.adv.financialCrisis', { name: ev.n, desc: ev.desc }), 'bad')
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

    // ── Season Review special — the year, stitched into one story ────────────
    // Pure assembly of data the systems already record: standings, exam champion,
    // awards, invitational, the fallen. Lands as a long-form inbox feature.
    {
      const order = sortedTable(_table)
      const pos = order.findIndex(r => r.name === G.vName) + 1
      const me = order[pos - 1]
      const parts = []
      if (order.length && me) {
        const leader = order[0]
        const posTxt = pos === 1 ? 'top of the table' : `${pos}${pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'} of ${order.length}`
        const verdict = pos === 1 ? 'A campaign to be proud of.' : pos <= Math.ceil(order.length / 2) ? 'A solid year with more to take.' : pos >= order.length ? 'A season the village wants to forget.' : 'A middling year — the council expects better.'
        parts.push(`<b>League:</b> ${G.vName} finished ${posTxt} (${me.w}W–${me.d}D–${me.l}L, ${me.pts} pts)${pos > 1 ? `, behind ${leader.name}` : ''}. ${verdict}`)
      }
      if (G.examChampion?.year === G.year) {
        parts.push(`<b>Adept Exam:</b> ${G.examChampion.player ? `${G.vName} took the championship — the academy pipeline delivered.` : `${G.examChampion.ico || ''} ${G.examChampion.village} claimed the exam championship.`}`)
      }
      const inv = (G.invitationalHistory || []).find(h => h.year === G.year)
      if (inv) {
        parts.push(`<b>Invitational:</b> ${inv.playerResult === 'champion' ? `champions — the cup sits in ${G.vName}.` : inv.playerResult === 'runner-up' ? `runners-up to ${inv.champion}.` : `out in the semifinals; ${inv.champion} took the cup.`}`)
      }
      const aw = G.seasonAwards?.[G.year] || {}
      const awLines = ['mvp', 'rookieOfYear', 'warHero', 'ironwall'].map(k => aw[k]).filter(a => a?.name).map(a => `${a.label}: <b>${a.name}</b>`)
      if (awLines.length) parts.push(`<b>Honors:</b> ${awLines.join(' · ')}`)
      const fallen = (G.memorial || []).filter(m => m.year === G.year && !m.transfer)
      if (fallen.length) parts.push(`<b>The fallen:</b> ${fallen.slice(0, 6).map(f => f.name).join(', ')}${fallen.length > 6 ? ` and ${fallen.length - 6} more` : ''} — remembered at the memorial stone.`)
      if (G.warSched || G.warActive) parts.push(`<b>Ahead:</b> the Grand Tournament musters — the year is not finished writing itself.`)
      if (parts.length) {
        pushNarrative({
          title: `📜 Year ${G.year} in Review`,
          body: parts.join('<br><br>'),
          tag: 'season', link: 'exam',
        })
        addChronicle(`Year ${G.year} in Review`, parts.join(' ').replace(/<[^>]+>/g, ''), 'milestone')
      }
    }
  }

  // Reset monthly accumulators
  G.finances.missionCommissions = { D:0, C:0, B:0, A:0, S:0 }
  G.finances.examFees = 0
  G.finances.loanFees = 0
  G.finances.scoutCostThisMonth = 0

  // When debt is enabled, the overdraft mechanic owns the negative balance (no implicit zero-floor).
  if (!G._ff_debt && G.ryo < 0) { aL(tr('toast.adv.treasuryEmpty'), 'bad'); G.morale = clamp(G.morale - 8, 0, 100); G.ryo = 0 }
  else if (G._ff_debt && G.ryo < 0) { G.morale = clamp(G.morale - 4, 0, 100) }

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

  // ── Annual intake (April = month 4) ───────────────────────────────────────
  if (G.month === 4 && (G.lastIntakeYear || 0) < G.year) {
    G.lastIntakeYear = G.year
    if (!G.intakeClass) G.intakeClass = []
    const acLv = (G.upgrades.academy || 0) + completedEffect(G.prestigeCompleted, 'academyBoost')
    const headSensei = (G.staff || []).find(st => st.role === 'head_sensei')
    const hsRating = headSensei?.rating || 0
    // Draft pick bonus: pick #1 gets full class, last pick gets slightly smaller class and lower base quality
    const _draftPick = G._draftPlayerPick || 3
    const _pickBonus = Math.max(0, (3 - _draftPick) * 0.08)  // #1 pick = +16%, #2 = +8%, #3+ = 0
    const classSize = rnd(14, 20) + Math.floor(acLv * 2)
    const prodigyIdx = Math.random() < (0.01 + _pickBonus * 0.5) * classSize ? rnd(0, classSize - 1) : -1
    for (let i = 0; i < classSize; i++) {
      const student = genStudent(acLv + (_pickBonus > 0 ? 1 : 0), hsRating)
      if (i === prodigyIdx) {
        student.potential = Math.min(99, student.potential + rnd(15, 25))
        student.trait = 'Prodigy'
        aL(tr('toast.adv.prodigyEntered'), 'good')
        addChronicle('Prodigy Intake', student.fn + ' ' + student.ln + ' shows extraordinary talent.', 'shinobi')
        addLegend(5)
      }
      G.intakeClass.push(student)
    }
    aL(tr('toast.adv.annualIntake', { n: classSize, year: G.year }), 'good')
    ntf(tr('toast.adv.annualIntakeShort', { n: classSize }))
  }

  // ── Mid-year walk-ins (October = month 10) ────────────────────────────────
  if (G.month === 10 && (G.lastMidIntakeYear || 0) < G.year) {
    G.lastMidIntakeYear = G.year
    if (!G.intakeClass) G.intakeClass = []
    const acLv = G.upgrades.academy || 0
    const walkInCount = rnd(5, 9)
    for (let i = 0; i < walkInCount; i++) G.intakeClass.push(genStudent(acLv, 0))
    aL(walkInCount + ' transfer students arrived mid-year.', 'neutral')
  }

  // ── Minimum prospect pool guarantee ──────────────────────────────────────
  if (G.prospects.length < 6 && G.month % 2 === 0) {
    const acLv = G.upgrades.academy || 0
    for (let _wi = 0; _wi < 2; _wi++) {
      const walkIn = genStudent(acLv, 0)
      walkIn.status = 'prospect'
      G.prospects.push(walkIn)
      aL(sn(walkIn) + ' arrived at the village gates looking for a path.', 'neutral')
    }
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
    // Warden personal sparring (once per year, if G.kageTrainingUsedYear < G.year and student is flagged)
    if (student.kageTraining && (G.kageTrainingUsedYear || 0) < G.year) {
      G.kageTrainingUsedYear = G.year
      student.kageTraining = false
      const gainKey = pk(['ninjutsu','taijutsu','speed','chakra'])
      student.stats[gainKey] = clamp(student.stats[gainKey] + rnd(3, 6), 0, 99)
      student.potential = Math.min(99, student.potential + rnd(2, 5))
      aL(tr('toast.adv.kageSpar', { name: sn(student) }), 'good')
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
          aL(tr('toast.adv.newRecord', { name: sn(student), stat: k, value: v }), 'good')
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

  // ── Youth Cup — the annual academy-age tournament (Month 6) ────────────────
  // The player's brightest students face rival + minor-nation juniors. A deep
  // run is a career milestone (and a growth spark) the kid carries for life.
  if (G.month === 6 && (G.intakeClass || []).length) {
    const mine = [...G.intakeClass].sort((a, b) => studentPower(b) - studentPower(a)).slice(0, 3)
    const entrants = mine.map(s => ({ id: s.id, name: sn(s), village: G.vName, ico: G.vIcon, power: studentPower(s), isPlayer: true }))
    ;(G.villages || []).slice(0, 4).forEach(v => entrants.push({ name: `${v.n} Junior`, village: v.n, ico: v.ico, power: rivalYouthPower(v.strength), isPlayer: false }))
    let _mnGuard = 0
    while (entrants.length < 8 && _mnGuard++ < 12) {
      const mn = pickMinorNation()
      entrants.push({ name: `${mn.n} Junior`, village: mn.n, ico: mn.ico, power: minorYouthPower(minorStrength(mn)), isPlayer: false })
    }
    const cup = runYouthCup(entrants)
    G.youthCupHistory = G.youthCupHistory || []
    G.youthCupHistory.push({ year: G.year, champion: cup.champion?.name, championVillage: cup.champion?.village, playerChampion: cup.champion?.village === G.vName })
    if (G.youthCupHistory.length > 10) G.youthCupHistory.shift()

    // Record the deepest player entrant's path as viewer beats — powers the
    // "Watch the Youth Cup" academy-day replay on the training-ground pitch.
    const _bestRun = mine.map(s => sn(s))
      .map(nm => ({ nm, phases: cup.rounds.map(r => { const m2 = r.matches.find(x => x.a.name === nm || x.b.name === nm); return m2 ? { name: r.stage, won: m2.winner.name === nm } : null }).filter(Boolean) }))
      .filter(r => r.phases.length)
      .sort((a, b) => b.phases.filter(p => p.won).length - a.phases.filter(p => p.won).length)[0]
    if (_bestRun) G._youthCupRun = { year: G.year, entrant: _bestRun.nm, phases: _bestRun.phases, champion: cup.champion?.name === _bestRun.nm, championVillage: cup.champion?.village }

    const _summ = []
    mine.forEach(s => {
      const run = entrantRun(cup, sn(s))
      let bump = 0, potBump = 0
      if (run.exit === 'Champion') { bump = 3; potBump = 4; addLegend(3) }
      else if (run.exit === 'Final') { bump = 2; potBump = 2 }
      else if (run.exit === 'Semifinal') { bump = 1; potBump = 1 }
      if (bump) Object.keys(s.stats).forEach(k => { s.stats[k] = clamp(s.stats[k] + bump, 0, 99) })
      if (potBump) s.potential = clamp((s.potential || 50) + potBump, 0, 99)
      if (run.exit === 'Champion') {
        s.milestones = s.milestones || []
        s.milestones.push({ label: `Youth Cup champion (Y${G.year})`, year: G.year, month: G.month })
        s.youthCupWins = (s.youthCupWins || 0) + 1
      }
      _summ.push(`${sn(s)}: ${run.exit === 'Champion' ? '🏆 Champion' : run.exit === 'Did not play' ? 'did not feature' : `out at the ${run.exit}`}`)
    })
    const champ = cup.champion
    pushNarrative({
      title: `🎓 Youth Cup — Year ${G.year}`,
      body: `${champ?.village === G.vName ? `<b>${G.vName} win the Youth Cup!</b>` : `${champ?.ico || ''} ${champ?.village} won the Youth Cup.`}<br><br>Your entrants — ${_summ.join('; ') || 'none fielded'}.`,
      tag: 'academy', link: 'youthacademy',
    })
    addNewsItem(`🎓 ${champ?.ico || ''} ${champ?.village || 'A hidden village'} lifted the Youth Cup.`)
    addChronicle(`Youth Cup Y${G.year}`, `${champ?.village} won the academy-age Youth Cup. ${_summ.join('; ')}.`, champ?.village === G.vName ? 'milestone' : 'event')
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
        aL(tr('toast.adv.homegrownPride', { name: sn(s) }), 'good')
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
      else if (s.status === 'available' && (s.workload || 0) < 15 && s.months > 3 && Math.random() < 0.22) {
        mType = 'underused'
        // Escalation: second underuse offense in 6 months → demand transfer
        if ((s._underusedCount || 0) >= 2) { mType = 'leaving'; s.commitment = clamp(s.commitment - 20, 0, 100) }
        s._underusedCount = (s._underusedCount || 0) + 1
      }
      else if (s.months > 12 && s.ri < 4 && (s.pMatrix.ambition || 10) >= 13 && Math.random() < 0.18) mType = 'promotion'
      else if (s.squadId && (s.pMatrix.temperament || 10) < 7 && Math.random() < 0.15) mType = 'squad_clash'
      else if (s.wins > 0 && s.wins % 25 === 0 && Math.random() < 0.55) mType = 'milestone'
      if (mType) {
        G.meetingQueue.push({ id: Math.random().toString(36).slice(2), shinobiId: s.id, type: mType, month: G.month, year: G.year })
        s.meetingCooldown = 3
        aL(sn(s) + ' has requested a one-on-one meeting — check People Management!', 'ev')
        ntf(tr('toast.adv.meetingRequest', { name: sn(s) }))
      }
    }

    // ── Promises ledger — resolve this shinobi's open promises ───────────────
    G.promises = G.promises || []
    for (const pr of G.promises) {
      if (pr.status !== 'open' || pr.shinobiId !== s.id) continue
      // Promotion promise KEPT the moment their rank rises past the promised baseline.
      if (pr.type === 'promotion' && pr.riAt != null && s.ri > pr.riAt) {
        resolvePromise(G.promises, pr.id, 'kept', G.year)
        s.promotionDeadline = null
        s.commitment = clamp(s.commitment + 10, 0, 100)
        s.indMorale = clamp(s.indMorale + 8, 0, 100)
        aL(tr('toast.adv.promiseKeptPromo', { name: sn(s) }), 'good')
      }
      // Deployment guarantee reviewed at its due date: kept unless breaches piled up.
      if (pr.type === 'deployment' && isPastDue(pr, G.year, G.month)) {
        const broken = (s._rgBreaches || 0) >= 5
        resolvePromise(G.promises, pr.id, broken ? 'broken' : 'kept', G.year)
        if (broken) {
          s.roleGuarantee = false
          s.commitment = clamp(s.commitment - 12, 0, 100)
          s.indMorale = clamp(s.indMorale - 8, 0, 100)
          aL(tr('toast.adv.promiseBrokenRole', { name: sn(s) }), 'bad')
          addNotice(sn(s) + ' was promised regular deployment and spent the year on the bench.', 'bad')
        } else {
          s.commitment = clamp(s.commitment + 5, 0, 100)
          aL(tr('toast.adv.promiseKeptRole', { name: sn(s) }), 'good')
        }
        s._rgBreaches = 0
      }
    }

    // Promotion deadline missed — personality evolution: feeling overlooked breeds resentment
    if (s.promotionDeadline && G.month >= s.promotionDeadline && G.year >= (s.promotionDeadlineYear || G.year)) {
      s.commitment = clamp(s.commitment - 15, 0, 100)
      s.indMorale = clamp(s.indMorale - 10, 0, 100)
      s.promotionDeadline = null
      const _brk = (G.promises || []).find(p => p.status === 'open' && p.shinobiId === s.id && p.type === 'promotion')
      if (_brk) resolvePromise(G.promises, _brk.id, 'broken', G.year)
      aL(sn(s) + '\'s promised promotion deadline passed — they are deeply disappointed.', 'bad')
      if (addTrait(s, 'Resentful')) {
        aL(sn(s) + ' has grown Resentful after being passed over.', 'warn')
        addNotice(sn(s) + ' feels overlooked by village leadership.', 'bad')
      }
    }

    // Role guarantee breach — counted toward the ledger's due-date review
    if (s.roleGuarantee && s.status === 'available' && (s.workload || 0) < 10 && s.months > 1) {
      s.commitment = clamp(s.commitment - 3, 0, 100)
      s.indMorale = clamp(s.indMorale - 4, 0, 100)
      s._rgBreaches = (s._rgBreaches || 0) + 1
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
        ntf(tr('toast.adv.rumorCirculating', { name: sn(s) }))
      }
    } else {
      s.lowCommitMonths = 0
    }

    // Transfer at zero commitment (loyalty check)
    if (s.commitment <= 0 && !s.legendStatus) {
      const loyRoll = s.pMatrix.loyalty || 10
      if (loyRoll < 10 && Math.random() < 0.40) {
        aL(sn(s) + ' has submitted a transfer request and left the village!', 'bad')
        G._kiaThisMonth = (G._kiaThisMonth || 0) + 1; G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, year: G.year, month: G.month, wins: s.wins, lastWords: 'Submitted a transfer request.', transfer: true })
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
  upUI(); ntf(tr('toast.adv.monthAdvanced', { year: G.year, month: G.month }))
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
        G.shinobi = G.shinobi.filter(s => s.id !== def.id)
      } else {
        def.injDays = rnd(1, 3); def.status = 'injured'; def.missId = null
      }
    }
  }
  G.raid.resolved = true; G.defSh = null
}

// ── Post-mission contribution scorer (Phase 4) ────────────────────────────────
function _buildMissionReport(sq, m, succeeded, mev, payout = 0) {
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
    return { id: s.id, name: sn(s), role: roleId, grade, detail, statVal: Math.round(statVal), element: s.element || null }
  }).filter(Boolean)
  const rep = { missionId: m.id, missionName: m.n, missionRk: m.rk, squadId: sq.id, squadName: sq.n, succeeded, year: G.year, month: G.month, scores,
    spec: m.spec || null,   // drives the animated pitch's mission layout (stealth compound, siege works...)
    phases: mev?.phases || null, quality: mev?.quality || null, margin: mev?.margin ?? null }
  // R8 live-battle micro-call: let the player bet on the final beat during the viewer.
  // The outcome is fixed; only the quality band + a small reward delta move. The
  // closure (dropped on save, live-only by design) applies the deltas exactly once.
  const bi = callBeatIndex(rep.phases)
  if (bi >= 0) {
    rep.baseQuality = rep.quality
    rep.microCall = { beatIndex: bi, payout }
    rep.applyCall = call => {
      if (rep._callDone) return rep._callResult
      const r = resolveBattleCall({ call, pivotalWon: !!rep.phases[bi].won, succeeded: rep.succeeded, baseQuality: rep.baseQuality })
      const bonusRyo = Math.round(payout * r.ryoMult)
      if (bonusRyo) G.ryo = Math.max(0, G.ryo + bonusRyo)
      if (r.moraleDelta) G.morale = clamp(G.morale + r.moraleDelta, 0, 100)
      if (r.legendDelta) addLegend(r.legendDelta)
      rep.quality = r.quality
      rep._callDone = call
      rep._callResult = { ...r, bonusRyo }
      const tone = r.kind === 'clutch' ? 'good' : r.kind === 'overcommit' ? 'warn' : 'info'
      aL(`${sq.n}: ${r.label} — ${r.note}${bonusRyo ? ` (${bonusRyo > 0 ? '+' : ''}${fmt(bonusRyo)} ryo)` : ''}`, tone)
      upUI()
      return rep._callResult
    }
  }
  // Match-condition layer: each member enters the viewer with stamina from their
  // REAL condition (chakra reserves, carried fatigue). The touchline-tactic sim
  // drains it beat by beat; how they finish becomes real post-match fatigue and
  // morale via applyCondition (live-only closure, same pattern as applyCall).
  rep.matchStamina = sq.members.map(id => {
    const s = G.shinobi.find(x => x.id === id)
    if (!s) return null
    return { id: s.id, name: sn(s), role: s.squadRole || 'flex', stamina: staminaStart({ chakra: s.stats?.chakra || 30, workload: s.workload || 0 }) }
  }).filter(Boolean)
  rep.applyCondition = avgStamina => {
    if (rep._condDone) return rep._condResult
    const fx = finishEffects(avgStamina)
    if (fx.workloadDelta) sq.members.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) s.workload = clamp((s.workload || 0) + fx.workloadDelta, 0, 100) })
    if (fx.moraleDelta) G.morale = clamp(G.morale + fx.moraleDelta, 0, 100)
    rep._condDone = true
    rep._condResult = fx
    if (fx.id !== 'worked') aL(`${sq.n}: ${fx.label} — ${fx.note}`, fx.id === 'fresh' ? 'good' : 'warn')
    upUI()
    return fx
  }
  // Capture-the-scroll: the objective token on the board is a real bonus. Hold it
  // (win more exchanges than lost) → an intel bounty. Side reward only; the
  // mission's win/loss is untouched. Applied once by the viewer at the finish.
  rep.applyScroll = () => {
    if (rep._scrollDone) return rep._scrollResult
    const won = (rep.phases || []).filter(p => p.won).length
    const lost = (rep.phases || []).length - won
    const r = scrollOutcome({ beatsWon: won, beatsLost: lost, rank: m.rk })
    if (r.held) {
      G.ryo = Math.max(0, G.ryo + r.ryo)
      if (r.legend) addLegend(r.legend)
      if (r.morale) G.morale = clamp(G.morale + r.morale, 0, 100)
      aL(`${sq.n}: 📜 ${r.note}`, 'good')
    }
    rep._scrollDone = true
    rep._scrollResult = r
    upUI()
    return r
  }
  return rep
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
    aL(tr('toast.adv.defendPosition', { conf: G.ownerMandate.confidence, cost: fmt(cost) }), 'good')
    addChronicle('Vote Survived', `${G.kN || 'The Warden'} survived a no-confidence vote by rallying council support.`, 'legend')
  } else {
    aL(tr('toast.adv.forcedResign'), 'bad')
    const { grade, score } = computeDynastyGrade(G)
    addChronicle('Warden Ousted', `${G.kN || 'The Warden'} was removed after losing a no-confidence vote. Dynasty Grade: ${grade}.`, 'legend')
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

  const _journo = pickJournalist()
  G.pendingPress = {
    id: q.id, trigger: triggerId,
    question: q.question, intro: q.intro,
    followUp: q.followUp || null,
    availableTones: q.availableTones || ['confident', 'humble', 'dismissive'],
    rivalName: ctx.rivalName || null,
    journalistId: _journo.id,
  }
  G.inbox = G.inbox || []
  G.inbox.unshift({
    id: 'press_' + triggerId + '_' + G.year + '_' + G.month,
    cat: 'press', subject: 'Press Conference Request',
    body: q.intro + '\n\n"' + q.question + '"',
    year: G.year, month: G.month, action: 'press', pressId: q.id, read: false,
  })
  ntf(tr('toast.adv.pressRequested'))
}

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
