import { G } from './state.js'
import { sp, cm, upUI, schEx } from './ui.js'
import { showSetup, selIcon, beginGame, restoreGame } from './setup.js'
import { adv } from './adv.js'
import { rRo, oDos, mkJK, treatTrauma, secondOpinion, specialistTreatment } from './panels/roster.js'
import { rSq, oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev } from './panels/squads.js'
import { mTab, oA, doA, pickSq, rDef, openWorldChoice } from './panels/missions.js'
import { rUp, buyUp } from './panels/upgrades.js'
import { rAc, rec, oScout, doScout, oSensei, doSensei } from './panels/academy.js'
import { eTab, tgTr, tgCo, doBl, acceptSponsorship, declineSponsorship } from './panels/economy.js'
import { rBe, lCap } from './panels/beasts.js'
import { rKa, resKE, sGift, propAl, rattle } from './panels/kage.js'
import { rEx, tEC, startEx, runRound } from './panels/exam.js'
import { declareWarMP, propAllianceMP, respondAlliance, breakAllianceMP, launchRaidMP, sendGiftMP, dipAccept, dipDecline } from './world.js'
import { resolveChoiceEvent } from './adv.js'
import { rFi } from './panels/finances.js'
import { rSt, openStaffHire, doStaffHire, releaseStaff, openRetireToStaff, doRetireToStaff, staffTab, designateAsstKage, resolveStaffConflict, scoutStaffCandidate, matchPoachOffer, dismissPoachOffer } from './panels/staff.js'
import { rSco, assignScout, setScoutBudget, toggleWatchlist } from './panels/scouting.js'
import { rYA, yaSetTrack, yaSetIntensity, yaSetSensei, yaSetAllTrack, yaSetAllIntensity, yaKageTraining, yaTab } from './panels/youthacademy.js'
import { rMeet, doMeeting, meetTab, resolveServiceAward, resolveReview, rumorAction } from './panels/meetings.js'
import { rTr, trTab, refreshTransferPool, openNegotiation, submitOffer, negConfirm, openPersonalTerms, confirmTransfer, poachAttempt, sellPressureBlock, sellPressureAccept, sellPressureLetDecide, sendLoan, recallLoan, bingoSuppress, bingoPromote, acceptCounter } from './panels/transfers.js'
import { rLeg, legTab, designateSuccessor, resolveLegacyDecision } from './panels/legacy.js'
import { intelTab, launchAnbu, shadowScout, ransomAnbu, abandonAnbu } from './panels/intel.js'
import { exTab, sabotageSquad, bidSrank, protestJudge, acceptSummitBloc, declineSummitBloc } from './panels/exam.js'

// defender shorthand helpers used from inline HTML
function G_defShSet(id) { G.defSh = id; rDef() }
function G_defShClear() { G.defSh = null; rDef() }

// Expose all functions that are called from inline onclick handlers in the HTML
Object.assign(window, {
  // screens
  showSetup, selIcon, beginGame, restoreGame,
  // navigation & modals
  sp, cm, adv,
  // roster
  oDos, mkJK, treatTrauma,
  // squads
  oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev,
  // missions
  mTab, oA, doA, pickSq, G_defShSet, G_defShClear,
  // upgrades
  buyUp,
  // academy
  rec, oScout, doScout, oSensei, doSensei,
  // economy
  eTab, tgTr, tgCo, doBl, acceptSponsorship, declineSponsorship,
  // beasts
  lCap,
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
  staffTab, designateAsstKage, resolveStaffConflict, scoutStaffCandidate, matchPoachOffer, dismissPoachOffer,
  // roster injury actions
  secondOpinion, specialistTreatment,
  // scouting
  assignScout, setScoutBudget, toggleWatchlist,
  // youth academy
  yaSetTrack, yaSetIntensity, yaSetSensei, yaSetAllTrack, yaSetAllIntensity, yaKageTraining, yaTab,
  // people management
  doMeeting, meetTab, resolveServiceAward, resolveReview, rumorAction,
  // transfer market
  trTab, refreshTransferPool, openNegotiation, submitOffer, negConfirm, openPersonalTerms,
  confirmTransfer, poachAttempt, sellPressureBlock, sellPressureAccept, sellPressureLetDecide,
  sendLoan, recallLoan, bingoSuppress, bingoPromote, acceptCounter,
  // legacy
  legTab, designateSuccessor, resolveLegacyDecision,
  // intel
  intelTab, launchAnbu, shadowScout, ransomAnbu, abandonAnbu,
  // exam tabs
  exTab, sabotageSquad, bidSrank, protestJudge, acceptSummitBloc, declineSummitBloc,
})
