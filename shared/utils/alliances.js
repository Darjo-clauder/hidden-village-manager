/**
 * Alliance pacts — the first diplomatic verb with teeth.
 *
 * `v.allied` was a boolean that did nothing. It gated a chip in the Intel
 * panel and fed one dynasty score, and that was the whole of it: no benefit,
 * no cost, no way for the relationship to go wrong. The world model underneath
 * (grudges, personalities, h2h, memories) was rich and entirely read-only.
 *
 * A pact here is an opt-in agreement with TERMS. Each type pays out every month
 * in a way you can point at, and each one can call on you — and being called on
 * is the point. Honouring a call costs something real; refusing costs standing,
 * and an ally whose standing collapses tears the pact up and remembers it.
 *
 * Pure: no G mutation, no RNG of its own (callers pass a roll), no UI.
 */

const n = v => Number(v) || 0
const clamp01 = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export const PACT_TYPES = {
  defence: {
    id: 'defence', name: 'Mutual Defence', icon: '🛡',
    blurb: 'Their strength stands behind yours — and yours behind theirs.',
    benefit: 'War odds improve while the pact holds; rivals think twice about raiding you.',
    obligation: 'When they go to war, you are called to it.',
    callCost: 'Commits ryo and puts shinobi in harm\'s way.',
  },
  trade: {
    id: 'trade', name: 'Trade Compact', icon: '⚖',
    blurb: 'Open roads, shared markets, a cut of each other\'s prosperity.',
    benefit: 'A monthly share of their trade, scaled to their strength.',
    obligation: 'When their economy falters they ask you to cover the shortfall.',
    callCost: 'A one-off subsidy from your treasury.',
  },
  training: {
    id: 'training', name: 'Training Accord', icon: '🎓',
    blurb: 'Shared drills, shared doctrine, shared exam preparation.',
    benefit: 'Your squads enter the Adept Exam better prepared.',
    obligation: 'They ask to borrow a shinobi for a season.',
    callCost: 'One shinobi is unavailable for several months.',
  },
}

export const PACT_LIST = Object.values(PACT_TYPES)

/** Relations needed before a village will even discuss a pact. */
export const PACT_REL_MIN = 60
/** Standing at or below which the ally tears the pact up. */
export const PACT_BREAK_STANDING = 25
export const PACT_START_STANDING = 60

export function pactStandingTier(standing) {
  const s = n(standing)
  if (s >= 80) return { id: 'staunch', label: 'Staunch', color: 'var(--green)' }
  if (s >= 55) return { id: 'solid', label: 'Solid', color: 'var(--gold)' }
  if (s >= 35) return { id: 'strained', label: 'Strained', color: 'var(--orange)' }
  return { id: 'failing', label: 'Failing', color: 'var(--red)' }
}

export function canProposePact(v) {
  if (!v) return { ok: false, why: 'No such village.' }
  if (v.pact) return { ok: false, why: 'Already in a pact with you.' }
  if (v.atWar) return { ok: false, why: 'You are at war.' }
  if (n(v.rel) < PACT_REL_MIN) return { ok: false, why: `Relations must reach ${PACT_REL_MIN}.` }
  return { ok: true, why: '' }
}

/** A fresh pact record, stored on the village as `v.pact`. */
export function newPact(typeId, year, month) {
  return {
    type: PACT_TYPES[typeId] ? typeId : 'trade',
    since: { year: n(year) || 1, month: n(month) || 1 },
    standing: PACT_START_STANDING,
    honoured: 0, refused: 0,
  }
}

/**
 * Everything the player's active pacts are currently worth, aggregated.
 * Benefits scale with standing, so a neglected ally is worth less than a
 * staunch one without needing a separate mechanic to say so.
 */
export function pactBenefits(villages) {
  const out = { warBonus: 0, monthlyRyo: 0, examBonus: 0, raidDeterrence: 0, pacts: 0 }
  for (const v of Array.isArray(villages) ? villages : []) {
    if (!v?.pact) continue
    const p = v.pact
    const weight = clamp01(n(p.standing) / 100, 0, 1)
    const strength = n(v.strength || v.str) || 50
    out.pacts++
    if (p.type === 'defence') {
      out.warBonus += Math.round(strength * 0.12 * weight)
      out.raidDeterrence += Math.round(10 * weight)
    } else if (p.type === 'trade') {
      out.monthlyRyo += Math.round(strength * 22 * weight)
    } else if (p.type === 'training') {
      out.examBonus += Math.round(6 * weight)
    }
  }
  return out
}

/** Base monthly chance that a given pact calls on the player. */
export function obligationChance(pact) {
  if (!pact) return 0
  // Defence pacts are the most demanding; that is the trade for the biggest benefit.
  const base = { defence: 0.07, trade: 0.05, training: 0.05 }[pact.type] ?? 0.05
  // A staunch ally leans on you slightly less often.
  return base * (n(pact.standing) >= 80 ? 0.7 : 1)
}

/**
 * Decide whether a pact calls this month. `roll` is a 0..1 value from the
 * caller so this stays deterministic under test.
 */
export function shouldCall(pact, roll) {
  return n(roll) < obligationChance(pact)
}

/** The demand itself, sized against the player's means. */
export function buildObligation(v, pact, { ryo = 0 } = {}) {
  const type = pact?.type || 'trade'
  const strength = n(v?.strength || v?.str) || 50
  if (type === 'defence') {
    return { type, villageName: v?.n, cost: Math.round(4000 + strength * 60),
      label: `${v?.n} calls on your Mutual Defence pact`,
      body: `${v?.n} has gone to war and invokes the pact. Sending support costs ryo and risks your shinobi.` }
  }
  if (type === 'trade') {
    // Scaled to their need, but capped against the player's treasury so it is
    // always a real choice rather than an automatic refusal.
    const ask = Math.round(3000 + strength * 45)
    return { type, villageName: v?.n, cost: Math.min(ask, Math.max(2000, Math.round(n(ryo) * 0.25))),
      label: `${v?.n} requests a trade subsidy`,
      body: `A shortfall has hit ${v?.n}. Under the Trade Compact they ask you to cover it.` }
  }
  return { type, villageName: v?.n, cost: 0, months: 3,
    label: `${v?.n} asks to borrow a shinobi`,
    body: `Under the Training Accord, ${v?.n} requests one of your shinobi for three months.` }
}

/**
 * Consequences of answering a call.
 *
 * Honouring is deliberately not free — it costs whatever the obligation asked —
 * but it builds standing, which raises every benefit that pact pays. Refusing
 * is survivable once and corrosive if it becomes a habit; a pact that falls
 * past PACT_BREAK_STANDING is torn up by the ally, not by the player.
 */
export function resolveObligation(pact, accepted) {
  const p = pact || {}
  if (accepted) {
    const standing = clamp01(n(p.standing) + 12, 0, 100)
    return { standing, relDelta: 5, repDelta: 2, broken: false,
      honoured: n(p.honoured) + 1, refused: n(p.refused),
      note: 'The pact holds, and they will remember it.' }
  }
  const standing = clamp01(n(p.standing) - 30, 0, 100)
  const broken = standing <= PACT_BREAK_STANDING
  return { standing, relDelta: broken ? -30 : -12, repDelta: broken ? -8 : -3, broken,
    honoured: n(p.honoured), refused: n(p.refused) + 1,
    note: broken
      ? 'They consider the agreement void. Word of it travels.'
      : 'They will not forget being turned down.' }
}

/** Slow drift back toward solid ground while nothing is asked of you. */
export function driftStanding(pact) {
  if (!pact) return null
  const s = n(pact.standing)
  if (s === PACT_START_STANDING) return s
  return s < PACT_START_STANDING ? Math.min(PACT_START_STANDING, s + 1) : Math.max(PACT_START_STANDING, s - 1)
}
