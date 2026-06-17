import { G } from './state.js'
import { sp, cm, upUI, schEx } from './ui.js'
import { showSetup, selIcon, beginGame, restoreGame } from './setup.js'
import { adv } from './adv.js'
import { rRo, oDos, mkJK, treatTrauma, secondOpinion, specialistTreatment, dosTab, retireShinobi, retireToCoach, extendCareer, setTrainingFocus, toggleRestMonth, openContractRenewal } from './panels/roster.js'
import { rSq, oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev } from './panels/squads.js'
import { mTab, oA, doA, pickSq, rDef, openWorldChoice, setMissionPrep, simTemplate } from './panels/missions.js'
import { rUp, buyUp } from './panels/upgrades.js'
import { rAc, rec, oScout, doScout, oSensei, doSensei, setTrainingPlan, matchRivalOffer, exceedRivalOffer, declineRivalOffer } from './panels/academy.js'
import { eTab, tgTr, tgCo, doBl, acceptSponsorship, declineSponsorship } from './panels/economy.js'
import { rBe, lCap, beastTab, releaseJinchuriki, resolveEscape } from './panels/beasts.js'
import { rKa, resKE, sGift, propAl, rattle } from './panels/kage.js'
import { rEx, tEC, startEx, runRound } from './panels/exam.js'
import { declareWarMP, propAllianceMP, respondAlliance, breakAllianceMP, launchRaidMP, sendGiftMP, dipAccept, dipDecline } from './world.js'
import { resolveChoiceEvent } from './adv.js'
import { rFi } from './panels/finances.js'
import { rSt, openStaffHire, doStaffHire, releaseStaff, openRetireToStaff, doRetireToStaff, staffTab, designateAsstKage, resolveStaffConflict, scoutStaffCandidate, matchPoachOffer, dismissPoachOffer, staffPersonalMeeting } from './panels/staff.js'
import { rSco, assignScout, setScoutBudget, toggleWatchlist, trialDay, signProspect, draftSort } from './panels/scouting.js'
import { retainScout, dismissScout } from './scoutEngine.js'
import { setDepthSlot, clearDepthSlot, emergencyCallUp } from './panels/depthchart.js'
import { rYA, yaSetTrack, yaSetIntensity, yaSetSensei, yaSetAllTrack, yaSetAllIntensity, yaKageTraining, yaTab } from './panels/youthacademy.js'
import { rMeet, doMeeting, meetTab, resolveServiceAward, resolveReview, rumorAction, consultSeniorGroup } from './panels/meetings.js'
import { rTr, trTab, refreshTransferPool, openNegotiation, submitOffer, negConfirm, openPersonalTerms, confirmTransfer, poachAttempt, sellPressureBlock, sellPressureAccept, sellPressureLetDecide, sendLoan, recallLoan, bingoSuppress, bingoPromote, acceptCounter } from './panels/transfers.js'
import { rLeg, legTab, designateSuccessor, resolveLegacyDecision } from './panels/legacy.js'
import { intelTab, launchAnbu, shadowScout, ransomAnbu, abandonAnbu, upgradeCounterIntel } from './panels/intel.js'
import { exTab, sabotageSquad, bidSrank, protestJudge, acceptSummitBloc, declineSummitBloc } from './panels/exam.js'
import { showLobby, createRoomFlow, joinRoomFlow, browseRooms, joinRoomByCode } from './setup.js'
import { endTurn, kickPlayer, transferHost, pauseRoom, resumeRoom, toggleClose, setTimeout_, setMaxPlayers, voteAdvance, setAdvFn } from './room.js'
import { copyInvite } from './panels/lobby.js'
import { inboxTab, inboxFilter } from './panels/inbox.js'
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
  sp, cm, adv, toggleNav,
  // inbox
  inboxTab, inboxFilter,
  // chronicles
  chrFilter, chrSearch,
  // roster
  oDos, mkJK, treatTrauma, dosTab,
  // squads
  oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev,
  // missions
  mTab, oA, doA, pickSq, G_defShSet, G_defShClear,
  // upgrades
  buyUp,
  // academy
  rec, oScout, doScout, oSensei, doSensei, setTrainingPlan,
  matchRivalOffer, exceedRivalOffer, declineRivalOffer,
  // economy
  eTab, tgTr, tgCo, doBl, acceptSponsorship, declineSponsorship,
  // beasts
  lCap, beastTab, releaseJinchuriki, resolveEscape,
  // kage
  resKE, sGift, propAl, rattle,
  // exam
  tEC, startEx, runRound, schEx,
  // world / diplomacy
  declareWarMP, propAllianceMP, respondAlliance, breakAllianceMP, launchRaidMP, sendGiftMP,
  dipAccept, dipDecline,
  // world choice events
  resolveChoiceEvent, openWorldChoice,
  // staff
  openStaffHire, doStaffHire, releaseStaff, openRetireToStaff, doRetireToStaff,
  staffTab, designateAsstKage, resolveStaffConflict, scoutStaffCandidate, matchPoachOffer, dismissPoachOffer, staffPersonalMeeting,
  // roster injury actions
  secondOpinion, specialistTreatment,
  retireShinobi, retireToCoach, extendCareer,
  setTrainingFocus, toggleRestMonth, openContractRenewal,
  // missions
  setMissionPrep, simTemplate,
  // scouting
  assignScout, setScoutBudget, toggleWatchlist, trialDay, signProspect, draftSort,
  retainScout, dismissScout,
  // depth chart
  setDepthSlot, clearDepthSlot, emergencyCallUp,
  // youth academy
  yaSetTrack, yaSetIntensity, yaSetSensei, yaSetAllTrack, yaSetAllIntensity, yaKageTraining, yaTab,
  // people management
  doMeeting, meetTab, resolveServiceAward, resolveReview, rumorAction, consultSeniorGroup,
  // transfer market
  trTab, refreshTransferPool, openNegotiation, submitOffer, negConfirm, openPersonalTerms,
  confirmTransfer, poachAttempt, sellPressureBlock, sellPressureAccept, sellPressureLetDecide,
  sendLoan, recallLoan, bingoSuppress, bingoPromote, acceptCounter,
  // legacy
  legTab, designateSuccessor, resolveLegacyDecision,
  // intel
  intelTab, launchAnbu, shadowScout, ransomAnbu, abandonAnbu, upgradeCounterIntel,
  // exam tabs
  exTab, sabotageSquad, bidSrank, protestJudge, acceptSummitBloc, declineSummitBloc,
})
