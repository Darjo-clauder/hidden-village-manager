import { G } from './state.js'
import { sp, cm, upUI, schEx, setNation, toggleColorblind, ntf } from './ui.js'
import { showSetup, selIcon, beginGame, restoreGame } from './setup.js'
import { adv } from './adv.js'
import { rRo, oDos, mkJK, treatTrauma, secondOpinion, specialistTreatment, dosTab, retireShinobi, retireToCoach, extendCareer, setTrainingFocus, toggleRestMonth, openContractRenewal, toggleJutsuLoadout, toggleNoTrade, toggleTwoWay, executeBuyout, rosSelect } from './panels/roster.js'
import { rSq, oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev, setFormation } from './panels/squads.js'
import { mTab, oA, doA, pickSq, rDef, openWorldChoice, setMissionPrep, simTemplate, missionLogFilter, assignBM } from './panels/missions.js'
import { rUp, buyUp, buildDistrict } from './panels/upgrades.js'
import { rAc, rec, oScout, doScout, oSensei, doSensei, setTrainingPlan, matchRivalOffer, exceedRivalOffer, declineRivalOffer, acTab } from './panels/academy.js'
import { eTab, tgTr, tgCo, doBl, acceptSponsorship, declineSponsorship } from './panels/economy.js'
import { rBe, lCap, beastTab, releaseJinchuriki, resolveEscape } from './panels/beasts.js'
import { rKa, resKE, sGift, propAl, rattle, resNCV, setCoachingPhilosophy } from './panels/kage.js'
import { rEx, tEC, startEx, runRound } from './panels/exam.js'
import { declareWarMP, propAllianceMP, respondAlliance, breakAllianceMP, launchRaidMP, sendGiftMP, dipAccept, dipDecline } from './world.js'
import { resolveChoiceEvent, resolveCouncilProposal, assignBlackMarket, resolveClanChain, establishSafehouse, assignDeepCoverOp, resolveWorldEventChoice, activateBloodline, resolvePressConference, resolveComplication, resolveRivalOffer, resolveQuickDecision, runTrainingCamp, gradeShinobi } from './adv.js'
import { rFi, setBudgetPriority } from './panels/finances.js'
import { rSt, openStaffHire, doStaffHire, releaseStaff, openRetireToStaff, doRetireToStaff, staffTab, designateAsstKage, resolveStaffConflict, scoutStaffCandidate, matchPoachOffer, dismissPoachOffer, staffPersonalMeeting } from './panels/staff.js'
import { rSco, assignScout, setScoutBudget, toggleWatchlist, trialDay, signProspect, draftSort } from './panels/scouting.js'
import { retainScout, dismissScout } from './scoutEngine.js'
import { setDepthSlot, clearDepthSlot, emergencyCallUp, setPromotionRule } from './panels/depthchart.js'
import { rYA, yaSetTrack, yaSetIntensity, yaSetSensei, yaSetAllTrack, yaSetAllIntensity, yaKageTraining, yaTab } from './panels/youthacademy.js'
import { rMeet, doMeeting, meetTab, resolveServiceAward, resolveReview, rumorAction, consultSeniorGroup } from './panels/meetings.js'
import { rTr, trTab, refreshTransferPool, openNegotiation, submitOffer, negConfirm, openPersonalTerms, confirmTransfer, poachAttempt, sellPressureBlock, sellPressureAccept, sellPressureLetDecide, sendLoan, recallLoan, bingoSuppress, bingoPromote, acceptCounter } from './panels/transfers.js'
import { rLeg, legTab, designateSuccessor, resolveLegacyDecision, triggerDynastyHandoff, sellDraftPick } from './panels/legacy.js'
import { intelTab, launchAnbu, shadowScout, ransomAnbu, abandonAnbu, upgradeCounterIntel } from './panels/intel.js'
import { exTab, sabotageSquad, bidSrank, protestJudge, acceptSummitBloc, declineSummitBloc } from './panels/exam.js'
import { musterWar, startWar, runWarRound } from './panels/war.js'
import { showLobby, createRoomFlow, joinRoomFlow, browseRooms, joinRoomByCode } from './setup.js'
import { rClans, clanGift, launchClanChain } from './panels/clans.js'
import { dismissOnboarding } from './panels/dashboard.js'
import { launchDeepCover } from './panels/safehouses.js'
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
  showSetup, showLobby, selIcon, beginGame, restoreGame,
  // room / lobby
  createRoomFlow, joinRoomFlow, browseRooms, joinRoomByCode,
  endTurn, kickPlayer, transferHost, pauseRoom, resumeRoom, toggleClose,
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
  oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev, setFormation,
  // missions
  mTab, oA, doA, pickSq, G_defShSet, G_defShClear, missionLogFilter, assignBM,
  // upgrades
  buyUp, buildDistrict,
  // academy
  rec, oScout, doScout, oSensei, doSensei, setTrainingPlan,
  matchRivalOffer, exceedRivalOffer, declineRivalOffer, acTab,
  // economy
  eTab, tgTr, tgCo, doBl, acceptSponsorship, declineSponsorship,
  // beasts
  lCap, beastTab, releaseJinchuriki, resolveEscape, activateBloodline,
  // kage
  resKE, sGift, propAl, rattle, resNCV, setCoachingPhilosophy,
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
  staffTab, designateAsstKage, resolveStaffConflict, scoutStaffCandidate, matchPoachOffer, dismissPoachOffer, staffPersonalMeeting,
  // roster injury actions
  secondOpinion, specialistTreatment,
  retireShinobi, retireToCoach, extendCareer,
  setTrainingFocus, toggleRestMonth, openContractRenewal,
  toggleNoTrade, toggleTwoWay, executeBuyout, rosSelect,
  // missions
  setMissionPrep, simTemplate,
  // scouting
  assignScout, setScoutBudget, setBudgetPriority, toggleWatchlist, trialDay, signProspect, draftSort,
  retainScout, dismissScout,
  // depth chart
  setDepthSlot, clearDepthSlot, emergencyCallUp, setPromotionRule,
  // youth academy
  yaSetTrack, yaSetIntensity, yaSetSensei, yaSetAllTrack, yaSetAllIntensity, yaKageTraining, yaTab,
  // people management
  doMeeting, meetTab, resolveServiceAward, resolveReview, rumorAction, consultSeniorGroup,
  // transfer market
  trTab, refreshTransferPool, openNegotiation, submitOffer, negConfirm, openPersonalTerms,
  confirmTransfer, poachAttempt, sellPressureBlock, sellPressureAccept, sellPressureLetDecide,
  sendLoan, recallLoan, bingoSuppress, bingoPromote, acceptCounter,
  // legacy + records
  legTab, designateSuccessor, resolveLegacyDecision, triggerDynastyHandoff, sellDraftPick,
  // intel
  intelTab, launchAnbu, shadowScout, ransomAnbu, abandonAnbu, upgradeCounterIntel,
  // exam tabs
  exTab, sabotageSquad, bidSrank, protestJudge, acceptSummitBloc, declineSummitBloc,
  // nation war
  musterWar, startWar, runWarRound,
  // clans
  clanGift, launchClanChain,
  // onboarding
  dismissOnboarding,
  // safehouses
  establishSafehouse, assignDeepCoverOp, launchDeepCover,
  // world calendar
  resolveWorldEventChoice,
})
