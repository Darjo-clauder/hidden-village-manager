/**
 * Alliance slice of the monthly tick.
 *
 * Pays out what the player's pacts are worth, drifts their standing, and
 * decides whether an ally calls on them this month. The call itself is routed
 * through the existing pending-decision channel so it BLOCKS the turn — an
 * obligation you can ignore is not an obligation.
 *
 * Same architecture as the other tick modules: operates on G, returns nothing.
 */
import { G, clamp, fmt, addChronicle } from '../state.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { aL, ntf } from '../ui.js'
import { addNewsItem } from '../news.js'
import {
  pactBenefits, shouldCall, buildObligation, driftStanding, resolveObligation, PACT_TYPES,
} from '../../../shared/utils/alliances.js'

export function tickAlliances() {
  const villages = G.villages || []
  const withPacts = villages.filter(v => v.pact)
  if (!withPacts.length) { G._pactBenefits = null; return }

  // ── Standing drift + monthly payout ──────────────────────────────────────
  for (const v of withPacts) v.pact.standing = driftStanding(v.pact)

  const ben = pactBenefits(villages)
  G._pactBenefits = ben          // read by war odds, the exam, and the Intel panel
  if (ben.monthlyRyo > 0) G.ryo += ben.monthlyRyo

  // ── Does anyone call this month? ─────────────────────────────────────────
  // Only ever one outstanding call: two at once would read as noise, and the
  // player should answer for one ally before the next asks.
  //
  // Deliberately NOT gated on the other pending-decision channels. An earlier
  // cut skipped the roll whenever a quick decision or world choice was open,
  // and those are pending most months — a trade pact went 34 months in a
  // driven game without ever invoking. Obligations live on their own channel
  // and _pendingState() already orders the blocking.
  if (G.pendingObligation) return

  for (const v of withPacts) {
    if (!shouldCall(v.pact, Math.random())) continue
    const ob = buildObligation(v, v.pact, { ryo: G.ryo })
    G.pendingObligation = { ...ob, pactType: v.pact.type, year: G.year, month: G.month }
    const def = PACT_TYPES[v.pact.type]
    aL(`${def?.icon || '🤝'} ${ob.label}.`, 'warn')
    ntf(`${def?.icon || '🤝'} ${ob.label}`)
    addChronicle('A Pact Invoked', `${ob.label}. ${ob.body}`, 'event')
    addNewsItem(`🤝 ${v.n} invokes its pact with ${G.vName}.`)
    break
  }
}

/**
 * Answer a standing obligation. Called from the inbox/decision UI.
 * Honouring costs what was asked; refusing costs standing, and a pact that
 * falls far enough is torn up by the ALLY — the player does not get to choose
 * that part.
 */
export function answerObligation(accept) {
  const ob = G.pendingObligation
  if (!ob) return
  const v = (G.villages || []).find(x => x.n === ob.villageName)
  if (!v?.pact) { G.pendingObligation = null; return }

  // Honouring has to be affordable — otherwise it is not a decision.
  if (accept && ob.cost > 0 && G.ryo < ob.cost) {
    ntf(tr('toast.ally.pactTooExpensive'))
    return
  }

  const out = resolveObligation(v.pact, !!accept)

  if (accept) {
    if (ob.cost > 0) G.ryo -= ob.cost
    if (ob.type === 'training' && ob.months) {
      // Lend someone real: the best available shinobi goes away for a season.
      const lent = (G.shinobi || [])
        .filter(s => s.status === 'available')
        .sort((a, b) => (b.potential || 0) - (a.potential || 0))[0]
      if (lent) {
        lent.status = 'lent'
        lent.lentMonthsLeft = ob.months
        lent.lentTo = v.n
        aL(`${lent.fn} ${lent.ln} departs for ${v.n} on secondment.`, 'neutral')
      }
    }
    aL(`Pact honoured with ${v.n}${ob.cost > 0 ? ` — ${fmt(ob.cost)} ryo` : ''}. ${out.note}`, 'good')
    addChronicle('Pact Honoured', `${G.vName} answered ${v.n}'s call.`, 'milestone')
  } else {
    aL(`You turned down ${v.n}. ${out.note}`, 'bad')
    addNewsItem(`🤝 ${G.vName} declined to answer ${v.n}'s call.`)
  }

  v.pact.standing = out.standing
  v.pact.honoured = out.honoured
  v.pact.refused = out.refused
  v.rel = clamp((v.rel || 50) + out.relDelta, 0, 100)
  G.reputation = clamp((G.reputation || 0) + out.repDelta, 0, 999)

  if (out.broken) {
    v.pact = null
    v.allied = false
    aL(`${v.n} has dissolved the pact.`, 'bad')
    addChronicle('Pact Dissolved', `${v.n} tore up its agreement with ${G.vName}.`, 'event')
    addNewsItem(`💔 ${v.n} dissolves its pact with ${G.vName}.`)
  }
  G.pendingObligation = null
}
