// Rival-village simulation slice of the monthly tick, extracted from adv.js.
// Operates on the global G singleton (same architecture as adv.js) — no return value.
import { G, mS, genVillageRoster, sPow, sn, rnd, pk, clamp } from '../state.js'
import { aL, ntf } from '../ui.js'
import { tickRivalStrength, shouldFireRivalEvent, pickRivalEvent, computePlayerStrength } from '../../../shared/utils/rivalSim.js'
import { getPlayerTendency, applyCounterStrategy, explainStanceChange, rollMetaEvent, ensureRivalProfile } from '../../../shared/utils/adaptiveAI.js'
import { genCounterStrategyBlurb } from '../../../shared/utils/narrativeEngine.js'
import { pushNarrative } from './inbox.js'

// ── Rival village strength simulation ─────────────────────────────────────
export function tickRivalSim() {
  G.villages.forEach(v => {
    if (!v.strength) v.strength = 50 + Math.round(Math.random() * 40)
    if (!v.roster || !v.roster.length) v.roster = genVillageRoster(v)  // backfill rosters on older saves
    // Replenish war/mission losses so rivals stay viable — recruit fresh initiate toward a floor.
    if (v.roster.length < 40 && Math.random() < 0.5) {
      const recruit = mS(rnd(0, 1)); recruit.homeVillage = v.n; v.roster.push(recruit)
    }
    // Named aces — each January the village's two strongest elites become its
    // public faces (shown in previews/diplomacy; starred in exam duels). A new
    // #1 ace is world news: recurring characters the player learns to fear.
    if (G.month === 1 || !v.aces?.length) {
      const prevTop = v.aces?.[0]?.name
      const elites = (v.roster || []).filter(s => s.ri >= 2).sort((a, b) => sPow(b) - sPow(a)).slice(0, 2)
      v.aces = elites.map(s => ({ id: s.id, name: sn(s), pow: sPow(s), ri: s.ri }))
      const top = v.aces[0]
      if (top && prevTop && top.name !== prevTop) {
        pushNarrative({ title: `⭐ New ace in ${v.n}`, body: `${top.name} has overtaken ${prevTop} as ${v.n}'s ace — scouts rate them the banner threat this year.`, tag: 'intel', link: null }, [v.n])
      }
    }
    // Adaptive AI — rivals re-evaluate tactics each season (once per year minimum)
    ensureRivalProfile(v)
    if (G.month === 1 || !v.counterStrategy) {
      const tendency = getPlayerTendency(G.rivalTendencies || {})
      const { changed, strategy } = applyCounterStrategy(v, tendency)
      if (changed && strategy.id !== 'balanced') {
        const explainedDesc = explainStanceChange(v, strategy)
        pushNarrative(genCounterStrategyBlurb(v.n, strategy.label, explainedDesc), [v.n])
        v.rivalProfile.lastStance = strategy.id
        v.rivalProfile.stanceHistory = [...(v.rivalProfile.stanceHistory || []).slice(-4), { stance: strategy.id, year: G.year, month: G.month }]
      }
    }
    // Meta-event: once per year, ~8% chance of league-wide shift
    if (G.month === 6) {
      const meta = rollMetaEvent(G.villages, { year: G.year, month: G.month })
      if (meta.fired) pushNarrative({ title: 'League Shift', body: meta.desc, tag: 'intel', link: null }, [])
    }
    // Apply counter-strategy strength tick multiplier
    v._ctBonus = v.counterTickBonus ?? 1
    tickRivalStrength(v)
    // Soft decay above 150 — prevents aggressive villages from permanently walling at 200
    if (v.strength > 150 && Math.random() < 0.25) v.strength = Math.max(150, v.strength - rnd(2, 4))
    if (shouldFireRivalEvent(v)) {
      const ev = pickRivalEvent(v)
      const msg = ev.template.replace('{village}', v.n)
      if (ev.id === 'border_threat') v.rel = clamp((v.rel || 50) - 5, 0, 100)
      if (ev.id === 'internal_strife' || ev.id === 'natural_disaster') v.strength = Math.max(10, v.strength - 15)
      if (ev.id === 'poach_prospect') G.councilApproval && (G.councilApproval.academy = clamp((G.councilApproval.academy || 50) - 3, 0, 100))
      aL(msg, ev.severity)
    }
  })
  G._playerStrength = computePlayerStrength(G)
}

// ── Rival GM moves — rivals act on the transfer market each month ─────────
export function tickRivalGMMoves() {
  if (!G.rivalOffers) G.rivalOffers = []
  // Rivals bid on unrecruted prospects (high-urgency or high-potential)
  if (G.prospects.length > 0 && Math.random() < 0.18) {
    const target = G.prospects.filter(p => (p.potential || 0) >= 50 || (p.urgencyMonths || 0) <= 2).sort((a, b) => (b.potential || 0) - (a.potential || 0))[0]
    if (target && !G.rivalOffers.find(o => o.prospectId === target.id)) {
      const bidder = pk(G.villages)
      const offerId = Math.random().toString(36).slice(2)
      G.rivalOffers.push({ id: offerId, type: 'prospect_bid', prospectId: target.id, village: bidder.n, expires: G.month + 2 > 12 ? 1 : G.month + 2, expiresYear: G.month + 2 > 12 ? G.year + 1 : G.year })
      G.narrativeInbox.push({ id: offerId, type: 'rival_bid', tag: 'academy', title: bidder.n + ' wants ' + (target.fn || 'your prospect'), body: bidder.n + ' has offered to recruit ' + (target.fn || '') + ' ' + (target.ln || '') + ' directly. Respond within 2 months or they sign elsewhere.', prospectId: target.id, village: bidder.n, year: G.year, month: G.month })
      if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
      ntf(bidder.n + ' is scouting ' + (target.fn || 'your prospect') + '!')
    }
  }
  // Expire rival prospect bids — remove prospect if player ignored
  G.rivalOffers = G.rivalOffers.filter(o => {
    const expired = o.expiresYear < G.year || (o.expiresYear === G.year && o.expires < G.month)
    if (expired && o.type === 'prospect_bid') {
      const p = G.prospects.find(x => x.id === o.prospectId)
      if (p) {
        G.prospects = G.prospects.filter(x => x.id !== o.prospectId)
        aL(o.village + ' signed ' + (p.fn || 'prospect') + ' — opportunity window closed.', 'bad')
      }
    }
    return !expired
  })
  // Rivals propose trades — offer one of their shinobi for one of yours (once per quarter)
  if (G.month % 3 === 0 && G.shinobi.length >= 4 && Math.random() < 0.25) {
    const rival = pk(G.villages)
    const theirOffer = rival.roster ? pk(rival.roster.filter(s => s.ri >= 1)) : null
    const yourTarget = G.shinobi.filter(s => s.ri >= 1 && s.status === 'available')[Math.floor(Math.random() * G.shinobi.filter(s => s.ri >= 1).length)]
    if (theirOffer && yourTarget) {
      const tradeId = Math.random().toString(36).slice(2)
      G.narrativeInbox.push({ id: tradeId, type: 'trade_offer', tag: 'people', title: 'Trade offer: ' + rival.n, body: rival.n + ' proposes trading ' + (theirOffer.fn || '') + ' ' + (theirOffer.ln || '') + ' (' + ['Initiate','Adept','Veteran','Shadow','Legend'][theirOffer.ri || 0] + ', Pow ' + (sPow(theirOffer) || '?') + ') for ' + sn(yourTarget) + '. Accept or decline.', rivalVillage: rival.n, offeredId: theirOffer.id, offeredName: (theirOffer.fn || '') + ' ' + (theirOffer.ln || ''), offeredRi: theirOffer.ri, offeredPow: sPow(theirOffer), targetId: yourTarget.id, targetName: sn(yourTarget), year: G.year, month: G.month })
      if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
      ntf(rival.n + ' proposes a trade!')
    }
  }
}
