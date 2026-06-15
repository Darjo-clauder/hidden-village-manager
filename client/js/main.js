import { G } from './state.js'
import { sp, cm, upUI, schEx } from './ui.js'
import { showSetup, selIcon, beginGame } from './setup.js'
import { adv } from './adv.js'
import { rRo, oDos, mkJK } from './panels/roster.js'
import { rSq, oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev } from './panels/squads.js'
import { mTab, oA, doA, pickSq, rDef, openWorldChoice } from './panels/missions.js'
import { rUp, buyUp } from './panels/upgrades.js'
import { rAc, rec, oScout, doScout, oSensei, doSensei } from './panels/academy.js'
import { eTab, tgTr, tgCo, doBl } from './panels/economy.js'
import { rBe, lCap } from './panels/beasts.js'
import { rKa, resKE, sGift, propAl, rattle } from './panels/kage.js'
import { rEx, tEC, startEx, runRound } from './panels/exam.js'
import { declareWarMP, propAllianceMP, respondAlliance, breakAllianceMP, launchRaidMP, sendGiftMP, dipAccept, dipDecline } from './world.js'
import { resolveChoiceEvent } from './adv.js'

// defender shorthand helpers used from inline HTML
function G_defShSet(id) { G.defSh = id; rDef() }
function G_defShClear() { G.defSh = null; rDef() }

// Expose all functions that are called from inline onclick handlers in the HTML
Object.assign(window, {
  // screens
  showSetup, selIcon, beginGame,
  // navigation & modals
  sp, cm, adv,
  // roster
  oDos, mkJK,
  // squads
  oCS, csSL, csMT, doCS, disbSq, oSqA, doSqA, rSynPrev,
  // missions
  mTab, oA, doA, pickSq, G_defShSet, G_defShClear,
  // upgrades
  buyUp,
  // academy
  rec, oScout, doScout, oSensei, doSensei,
  // economy
  eTab, tgTr, tgCo, doBl,
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
})
