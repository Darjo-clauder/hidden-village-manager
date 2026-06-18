/**
 * Rival Kage Personal Relationship System
 * Tracks personal grudges/respect between your Kage and rival village Kage,
 * independent of village-level diplomatic standing.
 */

import { getSyncStage } from './beastEngine.js'

// Personal relationship descriptors by score bracket
const REL_TIERS = [
  { min: 80, label: 'Deep Respect',    tone: 'warm',     color: 'var(--green)' },
  { min: 60, label: 'Mutual Respect',  tone: 'cordial',  color: 'var(--green)' },
  { min: 40, label: 'Professional',    tone: 'neutral',  color: 'var(--text-mid)' },
  { min: 20, label: 'Cold',            tone: 'terse',    color: 'var(--orange)' },
  { min:  0, label: 'Personal Grudge', tone: 'hostile',  color: 'var(--red)' },
]

export function getKageTier(personalRel) {
  return REL_TIERS.find(t => personalRel >= t.min) || REL_TIERS[REL_TIERS.length - 1]
}

/** Called when initializing a village — seeds personal Kage relationship. */
export function initKageRel(village) {
  if (village.kagePersonalRel === undefined) {
    village.kagePersonalRel = 50 // Start professional
    village.kageHistory = []     // Events that shaped this relationship
  }
}

/** Ensure all villages have Kage relationship data. */
export function ensureKageRels(G) {
  ;(G.villages || []).forEach(v => initKageRel(v))
}

/**
 * Modify personal Kage relationship. Reason is logged to kageHistory.
 * Returns the event text for aL().
 */
export function shiftKageRel(village, delta, reason, G) {
  initKageRel(village)
  const prev = village.kagePersonalRel
  village.kagePersonalRel = Math.max(0, Math.min(100, prev + delta))
  const tier = getKageTier(village.kagePersonalRel)
  village.kageHistory.push({
    year: G.year, month: G.month,
    delta, reason, result: village.kagePersonalRel,
  })
  if (village.kageHistory.length > 20) village.kageHistory.shift()
  return `Personal relationship with ${village.kage || village.n}: ${prev} → ${village.kagePersonalRel} (${tier.label}). Reason: ${reason}`
}

/**
 * Personal relationship modifier on negotiation success chance.
 * Hostile kage = harder negotiations; deep respect = easier.
 */
export function kageRelNegotiationMod(village) {
  const r = village.kagePersonalRel ?? 50
  if (r >= 80) return  0.12
  if (r >= 60) return  0.06
  if (r >= 40) return  0.00
  if (r >= 20) return -0.06
  return -0.14
}

/**
 * Diplomatic tone descriptor used in negotiation dialogue.
 */
export function kageToneDialogue(village, context = 'offer') {
  const tier = getKageTier(village.kagePersonalRel ?? 50)
  const kage = village.kage || `The ${village.kageRank || 'Kage'}`
  const dialogue = {
    warm: {
      offer: `${kage} receives your envoy with a rare warmth. "I have always found your village honorable. Let us discuss."`,
      reject: `${kage} declines respectfully. "The timing isn't right. But I respect the offer."`,
      accept: `${kage} agrees without hesitation. "Between us, this was always the right move."`,
    },
    cordial: {
      offer: `${kage} receives your envoy. "Your village has earned a hearing. Continue."`,
      reject: `${kage} shakes their head. "Not what we need right now. Perhaps another time."`,
      accept: `${kage} nods. "A reasonable arrangement. You have a deal."`,
    },
    neutral: {
      offer: `${kage} listens without expression. "Your proposal. State it."`,
      reject: `${kage} waves a dismissal. "The terms don't work for us."`,
      accept: `${kage} signs without ceremony. "Done."`,
    },
    terse: {
      offer: `${kage} crosses their arms. "Say what you came to say and be quick about it."`,
      reject: `${kage} cuts you off. "No. Tell your Kage I said no."`,
      accept: `${kage} accepts grudgingly. "Only because the numbers work. Don't read more into it."`,
    },
    hostile: {
      offer: `${kage} doesn't look up. "An envoy from your village. How persistent." A long pause. "Fine. Talk."`,
      reject: `${kage} laughs — not kindly. "Your Kage actually sent this offer? Send it back."`,
      accept: `${kage} accepts with barely concealed contempt. "This changes nothing between us personally. You understand."`,
    },
  }[tier.tone] || {}
  return dialogue[context] || ''
}

/**
 * World reputation flavor text — monthly descriptor of how the world views your village.
 * Based on: reputation score, prestige tier, legend, active beasts, war history, morale.
 */
export function getWorldReputationFlavor(G) {
  const rep  = G.reputation || 0
  const leg  = G.legend     || 0
  const pres = G.prestigeTier || 'D'
  const beasts = (G.beasts || []).filter(b => b.sealed && b.jk)
  const atWar = G.warState?.phase === 'active'
  const vName = G.vName || 'the village'

  // Beast-specific override
  if (beasts.some(b => b.n === 'Kurama') && getSyncStage(beasts.find(b => b.n === 'Kurama')) >= 4) {
    return `The world watches ${vName} with something between fear and awe. The Nine-Tails has been tamed — or so it appears.`
  }
  if (beasts.length >= 2) {
    return `Multiple bijuu sealed within ${vName}. The other great villages count their ANBU assignments twice before looking away.`
  }

  if (atWar) return `${vName} is at war. Every other village watches the conflict carefully — and quietly prepares.`

  if (rep >= 300 && leg >= 200) return `The name of ${vName} is spoken with reverence. Shinobi across the land compete to train under its banner.`
  if (rep >= 200 && pres === 'S') return `${vName} stands at the summit of the shinobi world. Its Kage's word carries the weight of mountains.`
  if (rep >= 150) return `${vName} has risen to become a genuine great power. Rivals study its movements. Allies count themselves lucky.`
  if (rep >= 100) return `${vName} is recognized as a serious force in the region. Its name no longer requires explanation.`
  if (rep >= 60)  return `${vName} has earned a reputation for competence. Merchants and clients seek it out with increasing frequency.`
  if (rep >= 30)  return `${vName} is gaining recognition. Still building — but the world has started to notice the work being done.`
  if (rep >= 10)  return `${vName} is a village in formation. Known to neighbors but not yet feared or sought after.`

  // Low rep / struggling
  const morale = G.morale || 75
  if (morale < 30) return `Reports from ${vName} speak of a village in quiet crisis. The world doesn't invade — it waits.`
  return `${vName} remains largely unknown. This has advantages — no one is paying attention yet.`
}

/**
 * Monthly tick for Kage personal relationships — slight drift toward neutrality
 * and event-driven shifts from diplomacy actions.
 */
export function tickKageRels(G) {
  ;(G.villages || []).forEach(v => {
    initKageRel(v)
    // Slow drift toward 50 (neutral)
    const drift = v.kagePersonalRel > 50 ? -0.5 : v.kagePersonalRel < 50 ? 0.5 : 0
    v.kagePersonalRel = Math.max(0, Math.min(100, v.kagePersonalRel + drift))
  })
}
