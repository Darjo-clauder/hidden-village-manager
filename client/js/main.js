import { G } from './state.js'
import { sp, cm, upUI, schEx, setNation, toggleColorblind, ntf, continueTurn } from './ui.js'
import { showSetup, selIcon, beginGame, restoreGame, selScenario } from './setup.js'
import { adv } from './adv.js'
import { rRo, oDos, mkJK, treatTrauma, secondOpinion, specialistTreatment, dosTab, retireShinobi, retireToCoach, extendCareer, setTrainingFocus, toggleRestMonth, openContractRenewal, toggleJutsuLoadout, toggleNoTrade, toggleTwoWay, executeBuyout, rosSelect, setDevPath, rosterSortBy, rosterToggleCol, rosterColMgr, rosterCtx, rosterHover } from './panels/roster.js'
import { rSq, oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev, setFormation, setSqApproach } from './panels/squads.js'
import { mTab, oA, doA, pickSq, rDef, openWorldChoice, setMissionPrep, simTemplate, missionLogFilter, assignBM, setMissionApproach, selectMission, setInspectorApproach, deployFromInspector, watchLastBattle } from './panels/missions.js'
import { skipBattleViewer, closeBattleViewer } from './liveBattle.js'
import { rUp, buyUp, buildDistrict, chooseDoctrine } from './panels/upgrades.js'
import { rAc, rec, oScout, doScout, oSensei, doSensei, setTrainingPlan, matchRivalOffer, exceedRivalOffer, declineRivalOffer, acTab, acCtx, acHover } from './panels/academy.js'
import { eTab, tgTr, tgCo, doBl, acceptSponsorship, declineSponsorship, secureRoute } from './panels/economy.js'
import { logFilter, logSearch } from './panels/log.js'
import { honorFallen } from './panels/memorial.js'
import { rBe, lCap, beastTab, releaseJinchuriki, resolveEscape, reinforceSeal } from './panels/beasts.js'
import { rKa, resKE, sGift, propAl, rattle, resNCV, setCoachingPhilosophy, payRivalDemand, refuseRivalDemand, demandTribute, appease } from './panels/kage.js'
import { rEx, tEC, startEx, runRound } from './panels/exam.js'
import { declareWarMP, propAllianceMP, respondAlliance, breakAllianceMP, launchRaidMP, sendGiftMP, dipAccept, dipDecline } from './world.js'
import { resolveChoiceEvent, resolveCouncilProposal, assignBlackMarket, resolveClanChain, establishSafehouse, assignDeepCoverOp, resolveWorldEventChoice, activateBloodline, resolvePressConference, resolveComplication, resolveRivalOffer, resolveQuickDecision, runTrainingCamp, gradeShinobi } from './adv.js'
import { rFi, setBudgetPriority } from './panels/finances.js'
import { rSt, openStaffHire, doStaffHire, releaseStaff, openRetireToStaff, doRetireToStaff, staffTab, designateAsstKage, resolveStaffConflict, scoutStaffCandidate, matchPoachOffer, dismissPoachOffer, staffPersonalMeeting, staffCtx, staffHover } from './panels/staff.js'
import { rSco, assignScout, setScoutBudget, toggleWatchlist, trialDay, signProspect, draftSort, scoutCtx, scoutHover } from './panels/scouting.js'
import { retainScout, dismissScout } from './scoutEngine.js'
import { setDepthSlot, clearDepthSlot, emergencyCallUp, setPromotionRule, depCtx, depHover } from './panels/depthchart.js'
import { rYA, yaSetTrack, yaSetIntensity, yaSetSensei, yaSetAllTrack, yaSetAllIntensity, yaKageTraining, yaTab } from './panels/youthacademy.js'
import { rMeet, doMeeting, meetTab, resolveServiceAward, resolveReview, rumorAction, consultSeniorGroup } from './panels/meetings.js'
import { rTr, trTab, refreshTransferPool, openNegotiation, submitOffer, negConfirm, openPersonalTerms, confirmTransfer, poachAttempt, sellPressureBlock, sellPressureAccept, sellPressureLetDecide, sendLoan, recallLoan, bingoSuppress, bingoPromote, acceptCounter, trSort, trCtx, trHover } from './panels/transfers.js'
import { rLeg, legTab, designateSuccessor, resolveLegacyDecision, triggerDynastyHandoff, sellDraftPick } from './panels/legacy.js'
import { rKageDev, spendKagePt, chooseKagePath } from './panels/kagedev.js'
import { intelTab, launchAnbu, shadowScout, ransomAnbu, abandonAnbu, upgradeCounterIntel, intelCtx } from './panels/intel.js'
import { exTab, sabotageSquad, bidSrank, protestJudge, acceptSummitBloc, declineSummitBloc, setExamPosture, exLeadersSort, watchMatchday } from './panels/exam.js'
import { musterWar, startWar, runWarRound, setWarCommand } from './panels/war.js'
import { showLobby, createRoomFlow, joinRoomFlow, browseRooms, joinRoomByCode } from './setup.js'
import { rClans, clanGift, launchClanChain, resolveClanCouncil } from './panels/clans.js'
import { dismissOnboarding } from './panels/dashboard.js'
import { launchDeepCover, abortDeepCover } from './panels/safehouses.js'
import { endTurn, kickPlayer, transferHost, pauseRoom, resumeRoom, toggleClose, setTimeout_, setMaxPlayers, voteAdvance, setAdvFn } from './room.js'
import { copyInvite } from './panels/lobby.js'
import { inboxTab, inboxFilter, toggleThread, dismissAllInfo, dismissNarrativeById } from './panels/inbox.js'
import { G as _G } from './state.js'
function dismissNarrative(id) { dismissNarrativeById(id) }

// ── Mentorship actions ────────────────────────────────────────────────────────
import { createMentorship, removeMentorship, isMentorEligible, isStudentEligible } from '../../shared/utils/mentorship.js'

function assignMentor(mentorId, studentId) {
  if (!_G.mentorships) _G.mentorships = []
  const mentor  = _G.shinobi.find(s => s.id === mentorId)
  const student = _G.shinobi.find(s => s.id === studentId)
  if (!mentor || !student) return
  if (!isMentorEligible(mentor, _G.mentorships)) { ntf('That shinobi cannot mentor right now.'); return }
  if (!isStudentEligible(student, _G.mentorships)) { ntf('That student already has a mentor.'); return }
  _G.mentorships.push(createMentorship(mentorId, studentId, { year: _G.year, month: _G.month }))
  ntf(`${mentor.fn} is now mentoring ${student.fn}.`)
  upUI()
}

function releaseMentor(shinobiId) {
  if (!_G.mentorships) return
  const removed = removeMentorship(_G.mentorships, shinobiId)
  if (removed) { ntf('Mentorship ended.'); upUI() }
}
import { chrFilter, chrSearch } from './panels/chronicles.js'
import { roleBonus } from './depthEngine.js'

// Expose roleBonus for inline use in squads overlay
window._depthEngine = { roleBonus }

// ── i18n bootstrap (L10N P0/P1) ─────────────────────────────────────────────────
import { t, setLocale, getLocale, registerLocale, makePseudoLocale, formatNum, formatRyo } from '../../shared/utils/i18n.js'
import { en } from '../../shared/i18n/en.js'
import { ipName, setIpOverrides } from '../../shared/i18n/ipNames.js'
registerLocale('en', en)
registerLocale('en-XA', makePseudoLocale(en))   // pseudo-locale for +30% truncation QA
setLocale('en')
// Exposed for inline handlers, console QA (`setLocale('en-XA')`), and a future IP-neutral build.
Object.assign(window, { t, setLocale, getLocale, ipName, setIpOverrides, _i18nFmt: { formatNum, formatRyo } })

// Inject adv into room.js to break circular dep
setAdvFn(adv)

// Toggle sidebar nav section collapse
function toggleNav(section) {
  const el = document.getElementById('nsg-' + section)
  if (el) el.classList.toggle('collapsed')
}

// defender shorthand helpers used from inline HTML
function G_defShSet(id) { G.defSh = id; rDef() }
function G_defShClear() { G.defSh = null; rDef() }

// Expose all functions that are called from inline onclick handlers in the HTML
Object.assign(window, {
  // screens
  showSetup, showLobby, selIcon, beginGame, restoreGame, selScenario,
  // room / lobby
  createRoomFlow, joinRoomFlow, browseRooms, joinRoomByCode,
  endTurn, continueTurn, kickPlayer, transferHost, pauseRoom, resumeRoom, toggleClose,
  setTimeout_, setMaxPlayers, voteAdvance, copyInvite,
  // navigation & modals
  sp, cm, adv, toggleNav, setNation, toggleColorblind,
  // inbox
  inboxTab, inboxFilter,
  // chronicles
  chrFilter, chrSearch,
  // roster
  oDos, mkJK, treatTrauma, dosTab, toggleJutsuLoadout,
  // squads
  oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev, setFormation, setSqApproach,
  // missions
  mTab, oA, doA, pickSq, G_defShSet, G_defShClear, missionLogFilter, assignBM, setMissionApproach,
  selectMission, setInspectorApproach, deployFromInspector,
  watchLastBattle, skipBattleViewer, closeBattleViewer,
  // upgrades
  buyUp, buildDistrict, chooseDoctrine,
  // academy
  rec, oScout, doScout, oSensei, doSensei, setTrainingPlan,
  matchRivalOffer, exceedRivalOffer, declineRivalOffer, acTab, acCtx, acHover,
  // economy
  eTab, tgTr, tgCo, doBl, acceptSponsorship, declineSponsorship, secureRoute,
  // log + memorial
  logFilter, logSearch, honorFallen,
  // beasts
  lCap, beastTab, releaseJinchuriki, resolveEscape, reinforceSeal, activateBloodline,
  // kage
  resKE, sGift, propAl, rattle, resNCV, setCoachingPhilosophy,
  payRivalDemand, refuseRivalDemand, demandTribute, appease,
  // exam
  tEC, startEx, runRound, schEx,
  // world / diplomacy
  declareWarMP, propAllianceMP, respondAlliance, breakAllianceMP, launchRaidMP, sendGiftMP,
  dipAccept, dipDecline,
  // world choice events + press
  resolveChoiceEvent, openWorldChoice, resolveCouncilProposal, assignBlackMarket, resolveClanChain,
  resolvePressConference,
  resolveComplication, resolveRivalOffer, resolveQuickDecision,
  runTrainingCamp, gradeShinobi,
  dismissNarrative, dismissAllInfo,
  // mentorship
  assignMentor, releaseMentor,
  // inbox threads
  toggleThread,
  // staff
  openStaffHire, doStaffHire, releaseStaff, openRetireToStaff, doRetireToStaff,
  staffTab, designateAsstKage, resolveStaffConflict, scoutStaffCandidate, matchPoachOffer, dismissPoachOffer, staffPersonalMeeting, staffCtx, staffHover,
  // roster injury actions
  secondOpinion, specialistTreatment,
  retireShinobi, retireToCoach, extendCareer,
  setTrainingFocus, toggleRestMonth, openContractRenewal,
  toggleNoTrade, toggleTwoWay, executeBuyout, rosSelect, setDevPath,
  rosterSortBy, rosterToggleCol, rosterColMgr, rosterCtx, rosterHover,
  // missions
  setMissionPrep, simTemplate,
  // scouting
  assignScout, setScoutBudget, setBudgetPriority, toggleWatchlist, trialDay, signProspect, draftSort, scoutCtx, scoutHover,
  retainScout, dismissScout,
  // depth chart
  setDepthSlot, clearDepthSlot, emergencyCallUp, setPromotionRule, depCtx, depHover,
  // youth academy
  yaSetTrack, yaSetIntensity, yaSetSensei, yaSetAllTrack, yaSetAllIntensity, yaKageTraining, yaTab,
  // people management
  doMeeting, meetTab, resolveServiceAward, resolveReview, rumorAction, consultSeniorGroup,
  // transfer market
  trTab, refreshTransferPool, openNegotiation, submitOffer, negConfirm, openPersonalTerms,
  trSort, trCtx, trHover,
  confirmTransfer, poachAttempt, sellPressureBlock, sellPressureAccept, sellPressureLetDecide,
  sendLoan, recallLoan, bingoSuppress, bingoPromote, acceptCounter,
  // legacy + records
  legTab, designateSuccessor, resolveLegacyDecision, triggerDynastyHandoff, sellDraftPick,
  spendKagePt, chooseKagePath,
  // intel
  intelTab, launchAnbu, shadowScout, ransomAnbu, abandonAnbu, upgradeCounterIntel, intelCtx,
  // exam tabs
  exTab, sabotageSquad, bidSrank, protestJudge, acceptSummitBloc, declineSummitBloc, setExamPosture, exLeadersSort, watchMatchday,
  // nation war
  musterWar, startWar, runWarRound, setWarCommand,
  // clans
  clanGift, launchClanChain, resolveClanCouncil,
  // onboarding
  dismissOnboarding,
  // safehouses
  establishSafehouse, assignDeepCoverOp, launchDeepCover, abortDeepCover,
  // world calendar
  resolveWorldEventChoice,
})

// ── Accessibility init (P5) — tag overlays as modal dialogs for assistive tech ──
function _a11yInit() {
  document.querySelectorAll('.ov').forEach(ov => {
    ov.setAttribute('role', 'dialog')
    ov.setAttribute('aria-modal', 'true')
  })
  const cont = document.getElementById('btn-end-turn')
  if (cont) cont.setAttribute('aria-keyshortcuts', 'Enter')
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _a11yInit)
else _a11yInit()
