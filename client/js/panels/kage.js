import { G, ui, clamp, sn, fmt } from '../state.js'
import { aL, ntf, upUI } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { strengthRatio, rankStandings } from '../../../shared/utils/rivalSim.js'
import { MANDATE_BY_ID, DISMISSAL_THRESHOLD } from '../../../shared/utils/ownerMandate.js'
import { resolveNoConfidence } from '../adv.js'
import { COACHING_PHILOSOPHIES, PHILOSOPHY_BY_ID } from '../../../shared/constants/coachingPhilosophy.js'
import { kageMod, kagePerk } from '../../../shared/constants/kageDev.js'
import { identityFor, MATCH_STYLES } from '../../../shared/constants/villageIdentity.js'
import { h2hLabel } from '../../../shared/utils/rivalry.js'
import { opSuccessChance, opEffect, RIVAL_OP_COST } from '../../../shared/utils/rivalOps.js'
import { PACT_TYPES, PACT_LIST, PACT_REL_MIN, canProposePact, newPact, pactBenefits, pactStandingTier } from '../../../shared/utils/alliances.js'
import { answerObligation } from '../tick/alliances.js'

export function rKa() {
  const el = document.getElementById('kgl')
  const playerStr = G._playerStrength || 50
  const vH = G.villages.map(v => {
    const rc = v.rel > 60 ? 'var(--green)' : v.rel > 30 ? 'var(--orange)' : 'var(--red)'
    const vs = v.strength || 50
    const ratio = strengthRatio(playerStr, vs)
    const strColor = ratio >= 1.3 ? 'var(--green)' : ratio >= 0.8 ? 'var(--orange)' : 'var(--red)'
    const strLabel = ratio >= 1.5 ? 'Dominant' : ratio >= 1.2 ? 'Stronger' : ratio >= 0.8 ? 'Matched' : ratio >= 0.5 ? 'Weaker' : 'Outmatched'
    const idn = identityFor(v.n)
    const st = MATCH_STYLES[idn.style] || MATCH_STYLES.balanced
    const idLine = idn.id !== 'none' ? `<div style="font-size:var(--fs-small);color:var(--text-mid);margin-bottom:6px;font-style:italic" title="${st.label}: ${st.desc}">${st.icon} <b style="color:var(--gold);font-style:normal">${idn.label}</b> — ${idn.blurb}</div>` : ''
    const ace = v.aces?.[0]
    const aceLine = ace ? `<div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:6px">⭐ Ace: <b style="color:var(--text-hi)">${ace.name}</b> <span style="color:var(--text-faint)">(Pwr ${ace.pow})</span>${v.aces[1] ? ` · ${v.aces[1].name}` : ''}</div>` : ''
    const isDerby = v.n === G.derbyRival
    const derbyChip = isDerby ? `<span style="font-size:var(--fs-micro);border:1px solid var(--red);color:var(--red);padding:0 4px;margin-left:5px">🔥 DERBY RIVAL</span>` : ''
    const atLabel = h2hLabel(G.h2h, v.n)
    const h2hLine = atLabel ? `<div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:6px">⚔ League record vs you: <span style="color:var(--text-mid)">${atLabel}</span></div>` : ''
    return `<div class="ke-card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><div style="font-size:20px">${v.ico}</div><div><div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold">${v.n}</div><div style="font-size:var(--fs-small);color:var(--text-dim)">${v.kageRank} ${v.kage} · <span style="color:${rc}">${v.rel > 60 ? 'Allied' : v.rel > 30 ? 'Neutral' : 'Hostile'}</span>${v.pact ? ` · ${PACT_TYPES[v.pact.type]?.icon || ''} ${PACT_TYPES[v.pact.type]?.name || ''} (${pactStandingTier(v.pact.standing).label})` : v.allied ? ' ✓ Allied' : ''}${derbyChip}</div></div></div>${idLine}${aceLine}${h2hLine}<div style="display:flex;align-items:center;gap:7px;margin-bottom:3px"><div style="font-size:var(--fs-micro);color:var(--text-dim);width:6.5em;flex-shrink:0;text-transform:uppercase;letter-spacing:1px">Relations</div><div class="bar" style="flex:1"><div class="fill" style="width:${v.rel}%;background:${rc}"></div></div><div style="font-size:var(--fs-body);color:var(--text-dim)">${v.rel}</div></div><div style="display:flex;align-items:center;gap:7px;margin-bottom:6px"><div style="font-size:var(--fs-micro);color:var(--text-dim);width:6.5em;flex-shrink:0;text-transform:uppercase;letter-spacing:1px">Strength</div><div class="bar" style="flex:1"><div class="fill" style="width:${Math.min(100,vs/2)}%;background:${strColor}"></div></div><div style="font-size:var(--fs-small);color:${strColor}">${strLabel} (${Math.round(vs)})</div></div><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="gb gb-b" onclick="sGift('${v.n}')" ${G.ryo < 5000 ? 'disabled' : ''}>Send gifts +10 (5k ryo)</button>${!v.pact && v.rel >= PACT_REL_MIN ? PACT_LIST.map(pt => `<button class="gb gb-g" onclick="proposePact('${v.n}','${pt.id}')" ${G.ryo < 10000 ? 'disabled' : ''} title="${pt.blurb}&#10;&#10;BENEFIT: ${pt.benefit}&#10;OBLIGATION: ${pt.obligation} (${pt.callCost})">${pt.icon} ${pt.name} (10k)</button>`).join('') : ''}${v.rel < 60 && !v.allied ? `<button class="gb" onclick="demandTribute('${v.n}')" title="Strength-gated. Success extracts ryo; failure angers them.">Demand tribute</button>` : ''}${(v.threat || 0) > 0 ? `<button class="gb gb-b" onclick="appease('${v.n}')" ${G.ryo < 4000 ? 'disabled' : ''}>Appease −threat (4k)</button>` : ''}${v.rel < 30 ? `<button class="gb gb-r" onclick="rattle('${v.n}')">Rattle sabres</button>` : ''}<button class="gb" onclick="sabotageRival('${v.n}')" ${G.ryo < RIVAL_OP_COST ? 'disabled' : ''} title="Covert op (${fmt(RIVAL_OP_COST)} ryo): dent their strength so they slip in the league. Failure exposes you.">🗡 Disrupt (${fmt(RIVAL_OP_COST)})</button></div></div>`
  }).join('')
  const standings = rankStandings(playerStr, (G.vName || 'Your Village'), G.villages)
  const standingsHtml = `<div class="ke-card" style="margin-bottom:14px">
    <div style="font-size:var(--fs-body);letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px">${tr("kage.powerStandings")}</div>
    <table style="width:100%;border-collapse:collapse;font-size:var(--fs-body)">
      <thead><tr style="color:var(--text-dim);text-align:left"><th style="padding:2px 5px">#</th><th>Village</th><th style="text-align:right;padding:2px 5px">Strength</th></tr></thead>
      <tbody>${standings.map(r => `<tr style="${r.isPlayer ? 'color:var(--gold);font-weight:bold' : 'color:var(--text-hi)'}"><td style="padding:2px 5px">${r.rank}</td><td>${r.name}${r.isPlayer ? ' (you)' : ''}</td><td style="text-align:right;padding:2px 5px">${r.strength}</td></tr>`).join('')}</tbody>
    </table>
  </div>`
  el.innerHTML = (ui.pKE
    ? `<div class="ke-card" style="border-color:var(--gold);margin-bottom:14px"><div style="font-size:var(--fs-body);letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px">⚡ Warden Event</div><div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold;margin-bottom:5px">${ui.pKE.n}</div><div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:12px;line-height:1.5">${ui.pKE.desc}</div><div style="display:flex;flex-direction:column;gap:6px">${ui.pKE.choices.map((c, i) => `<button class="gb" onclick="resKE(${i})">${c.l}</button>`).join('')}</div></div>`
    : '') + _obligationHtml() + _pactSummaryHtml() + _rivalDemandHtml() + _noConfidenceHtml() + _mandateHtml() + _philosophyHtml() + standingsHtml + vH
}

/**
 * A pact has been invoked. Rendered at the very top and blocking the turn,
 * because the whole point of an obligation is that it interrupts you.
 */
function _obligationHtml() {
  const ob = G.pendingObligation
  if (!ob) return ''
  const def = PACT_TYPES[ob.pactType]
  const affordable = !ob.cost || G.ryo >= ob.cost
  return `<div class="surf" style="background:var(--surface);border:1px solid var(--seal);border-left:3px solid var(--seal);padding:var(--sp-3);margin-bottom:var(--sp-3)">
    <div style="font-size:var(--fs-micro);letter-spacing:var(--ls-caps);color:var(--seal-hi);text-transform:uppercase;margin-bottom:var(--sp-2)">${def?.icon || '🤝'} Pact Invoked</div>
    <div style="font-size:var(--fs-sub);color:var(--text-hi);font-weight:600;margin-bottom:3px">${ob.label}</div>
    <div style="font-size:var(--fs-body);color:var(--text-dim);line-height:1.5;margin-bottom:var(--sp-2)">${ob.body}</div>
    <div style="font-size:var(--fs-small);color:var(--text-mid);margin-bottom:var(--sp-3)">
      ${ob.cost > 0 ? `Cost to honour: <b style="color:${affordable ? 'var(--gold)' : 'var(--red)'}">${fmt(ob.cost)} ryo</b>` : ''}
      ${ob.months ? `Cost to honour: <b style="color:var(--gold)">one shinobi for ${ob.months} months</b>` : ''}
      · Refusing costs standing, and a pact that falls far enough is torn up.
    </div>
    <div style="display:flex;gap:6px">
      <button class="gb gb-g" onclick="answerPact(true)" ${affordable ? '' : 'disabled'}>Honour the pact</button>
      <button class="gb gb-r" onclick="answerPact(false)">Refuse</button>
    </div>
  </div>`
}

/** Standing of every live pact, so neglect is visible before it costs you. */
function _pactSummaryHtml() {
  const pacts = (G.villages || []).filter(v => v.pact)
  if (!pacts.length) return ''
  const ben = pactBenefits(G.villages)
  const parts = [
    ben.monthlyRyo && `${fmt(ben.monthlyRyo)} ryo/mo`,
    ben.warBonus && `+${ben.warBonus} war strength`,
    ben.examBonus && `+${ben.examBonus} exam preparation`,
  ].filter(Boolean)
  return `<div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:var(--sp-3);margin-bottom:var(--sp-3)">
    <div class="sect">Standing Pacts</div>
    ${pacts.map(v => {
      const p = v.pact, def = PACT_TYPES[p.type], tier = pactStandingTier(p.standing)
      return `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:var(--fs-small)">
        <span style="min-width:1.4em">${def?.icon || '🤝'}</span>
        <span style="color:var(--text-hi);min-width:9em">${v.n}</span>
        <span style="color:var(--text-dim);min-width:10em">${def?.name || p.type}</span>
        <span style="color:${tier.color};min-width:5em">${tier.label}</span>
        <span style="color:var(--text-faint)">honoured ${p.honoured || 0} · refused ${p.refused || 0}</span>
      </div>`
    }).join('')}
    ${parts.length ? `<div style="font-size:var(--fs-micro);color:var(--green);margin-top:var(--sp-2)">Currently worth: ${parts.join(' · ')}</div>` : ''}
  </div>`
}

/** Answer a live pact call. Window-bound in main.js. */
export function answerPact(accept) {
  answerObligation(!!accept)
  upUI()
  rKa()
}

/** Propose a pact of a chosen type. */
export function proposePact(villageName, typeId) {
  const v = G.villages.find(x => x.n === villageName)
  const gate = canProposePact(v)
  if (!gate.ok) { ntf(gate.why); return }
  const cost = Math.round(10000 * (kagePerk(G) === 'alliance' ? 0.7 : 1))
  if (G.ryo < cost) { ntf(tr('toast.common.notEnoughRyo')); return }
  G.ryo -= cost
  v.rel = clamp(v.rel + 15 + Math.round(15 * kageMod(G, 'diplomacy')), 0, 100)
  v.allied = true
  v.pact = newPact(typeId, G.year, G.month)
  const def = PACT_TYPES[v.pact.type]
  aL(`${def.icon} ${def.name} signed with ${villageName} — ${fmt(cost)} ryo.`, 'good')
  ntf(`${def.icon} ${def.name} with ${villageName}`)
  upUI(); rKa()
}

// ── Rival-initiated demand (quarterly) ────────────────────────────────────────
function _diploQuarter() { return `Y${G.year}Q${Math.ceil(G.month / 3)}` }

function _rivalDemandHtml() {
  // Surface an existing pending demand, or generate one this quarter from a strong hostile rival.
  if (!G.rivalDemand || G.rivalDemand.resolvedQuarter) {
    if (G.rivalDemand?.quarter === _diploQuarter()) return ''  // already handled this quarter
    const playerStr = G._playerStrength || 50
    const nowM = (G.year - 1) * 12 + G.month
    // A blackmailed Warden stays quiet until their suppression window lapses.
    const aggressors = (G.villages || []).filter(v => v.rel < 40 && (v.strength || 50) > playerStr * 1.05 && !v.allied && !((v.demandsSuppressedUntil || 0) > nowM))
    if (!aggressors.length) return ''
    const v = aggressors.sort((a, b) => (b.strength || 50) - (a.strength || 50))[0]
    const amount = Math.round(3000 + (v.strength || 50) * 120)
    G.rivalDemand = { villageName: v.n, icon: v.ico, amount, quarter: _diploQuarter(), resolvedQuarter: null }
  }
  const d = G.rivalDemand
  if (!d || d.resolvedQuarter) return ''
  return `<div class="ke-card" style="border-color:var(--red);background:#160808;margin-bottom:14px">
    <div style="font-size:var(--fs-body);letter-spacing:2px;color:var(--red);text-transform:uppercase;margin-bottom:6px">⚠ Tribute Demand — ${_diploQuarter()}</div>
    <div style="font-size:var(--fs-lead);color:var(--text-hi);margin-bottom:8px">${d.icon || ''} <b>${d.villageName}</b> demands <b style="color:var(--orange)">${fmt(d.amount)} ryo</b> in tribute, or relations sour and their war footing grows.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="gb gb-b" onclick="payRivalDemand()" ${G.ryo < d.amount ? 'disabled' : ''}>Pay tribute (${fmt(d.amount)} ryo, +12 rel)</button>
      <button class="gb gb-r" onclick="refuseRivalDemand()">Refuse (−15 rel, +25 their threat)</button>
    </div>
  </div>`
}

export function payRivalDemand() {
  const d = G.rivalDemand; if (!d || d.resolvedQuarter) return
  if (G.ryo < d.amount) { ntf(tr('toast.common.notEnoughRyoDot')); return }
  G.ryo -= d.amount
  const v = G.villages.find(x => x.n === d.villageName)
  if (v) v.rel = clamp(v.rel + 12, 0, 100)
  d.resolvedQuarter = _diploQuarter()
  aL(tr('toast.kage.tributePaid', { amount: fmt(d.amount), village: d.villageName }), 'neutral')
  ntf(tr('toast.kage.tributePaidShort')); upUI()
}

export function refuseRivalDemand() {
  const d = G.rivalDemand; if (!d || d.resolvedQuarter) return
  const v = G.villages.find(x => x.n === d.villageName)
  if (v) { v.rel = clamp(v.rel - 15, 0, 100); v.threat = clamp((v.threat || 0) + 25, 0, 100) }
  d.resolvedQuarter = _diploQuarter()
  aL(tr('toast.kage.tributeRefused', { village: d.villageName }), 'warn')
  ntf(tr('toast.kage.demandRefused')); upUI()
}

export function demandTribute(n) {
  const v = G.villages.find(x => x.n === n); if (!v) return
  const playerStr = G._playerStrength || 50
  const edge = playerStr / ((v.strength || 50) || 1)
  if (edge >= 1.1 && Math.random() < clamp(0.35 + (edge - 1) * 0.6, 0.2, 0.85)) {
    const gain = Math.round(2500 + (v.strength || 50) * 90)
    G.ryo += gain; v.rel = clamp(v.rel - 8, 0, 100)
    aL(tr('toast.kage.demandYielded', { village: n, gain: fmt(gain) }), 'good')
    ntf(tr('toast.kage.tributeExtracted', { gain: fmt(gain) }))
  } else {
    v.rel = clamp(v.rel - 12, 0, 100); v.threat = clamp((v.threat || 0) + 18, 0, 100)
    aL(tr('toast.kage.demandRebuffed', { village: n }), 'bad')
    ntf(tr('toast.kage.demandRebuffedShort'))
  }
  upUI()
}

export function appease(n) {
  if (G.ryo < 4000) { ntf(tr('toast.common.notEnoughRyo')); return }
  const v = G.villages.find(x => x.n === n); if (!v) return
  G.ryo -= 4000
  v.threat = clamp((v.threat || 0) - 30, 0, 100); v.rel = clamp(v.rel + 5, 0, 100)
  aL(tr('toast.kage.appeased', { village: n }), 'good'); ntf(tr('toast.kage.tensionsReduced')); upUI()
}

export function resKE(i) {
  if (!ui.pKE) return
  ui.pKE.choices[i].fn(G, aL)
  ui.pKE = null; upUI(); ntf(tr('toast.kage.decisionMade'))
}

export function sGift(n) {
  if (G.ryo < 5000) { ntf(tr('toast.common.notEnoughRyo')); return }
  const v = G.villages.find(x => x.n === n); G.ryo -= 5000
  const gain = Math.round(10 * (1 + kageMod(G, 'diplomacy')))   // Warden Diplomacy boosts goodwill
  v.rel = clamp(v.rel + gain, 0, 100)
  aL(tr('toast.kage.giftsSent', { village: n, gain }), 'good'); ntf(tr('toast.kage.relationsImproved')); upUI()
}

export function propAl(n) {
  const cost = Math.round(10000 * (kagePerk(G) === 'alliance' ? 0.7 : 1))   // Diplomat signature
  if (G.ryo < cost) { ntf(tr('toast.common.notEnoughRyo')); return }
  const v = G.villages.find(x => x.n === n); G.ryo -= cost
  v.rel = clamp(v.rel + 25 + Math.round(25 * kageMod(G, 'diplomacy')), 0, 100); v.allied = true
  aL(tr('toast.kage.alliance', { village: n, cost: fmt(cost) }), 'good'); ntf(tr('toast.kage.alliedWith', { village: n })); upUI()
}

export function rattle(n) {
  const v = G.villages.find(x => x.n === n); v.rel = clamp(v.rel - 15, 0, 100); v.threat = clamp((v.threat || 0) + 20, 0, 100)
  aL(tr('toast.kage.rattled', { village: n }), 'warn'); upUI()
}

// Covert disruption op — dent a rival's strength so they slip in the league.
// Costs ryo; success shaves their strength + relations, failure exposes you.
export function sabotageRival(n) {
  const v = G.villages.find(x => x.n === n); if (!v) return
  if (G.ryo < RIVAL_OP_COST) { ntf(tr('toast.kage.opNoRyo')); return }
  G.ryo -= RIVAL_OP_COST
  const espBonus = kageMod(G, 'espionage') || 0
  const chance = opSuccessChance(G._playerStrength || 50, v.strength || 50, identityFor(n).style, espBonus)
  const success = Math.random() < chance
  const eff = opEffect(success)
  v.strength = Math.max(10, (v.strength || 50) + eff.strengthDelta)
  v.rel = clamp((v.rel || 50) + eff.relDelta, 0, 100)
  v.threat = clamp((v.threat || 0) + eff.threatDelta, 0, 100)
  if (success) aL(tr('toast.kage.opSuccess', { village: n, drop: -eff.strengthDelta }), 'good')
  else aL(tr('toast.kage.opFailed', { village: n }), 'bad')
  upUI()
}

function _mandateHtml() {
  const m = G.ownerMandate
  if (!m || !m.ids?.length) return ''
  const conf = m.confidence ?? 75
  const confColor = conf >= 60 ? 'var(--green)' : conf >= DISMISSAL_THRESHOLD ? 'var(--orange)' : 'var(--red)'
  const confPct = conf
  const mandateRows = m.ids.map(id => {
    const def = MANDATE_BY_ID[id]
    if (!def) return ''
    return `<div style="padding:5px 0;border-bottom:1px solid var(--sunken)">
      <div style="font-size:var(--fs-body);color:var(--text-hi)">${def.n}</div>
      <div style="font-size:var(--fs-small);color:var(--text-dim)">${def.desc}</div>
      <div style="font-size:var(--fs-small);color:var(--text-faint);margin-top:2px">+${def.confidenceGain} if met · -${def.confidenceLoss} if missed</div>
    </div>`
  }).join('')
  const history = (m.history || []).slice(-3).reverse().map(h => {
    const net = h.delta >= 0 ? `+${h.delta}` : `${h.delta}`
    const c = h.delta >= 0 ? 'var(--green)' : 'var(--red)'
    const icons = h.results.map(r => r.met ? '✓' : '✗').join(' ')
    return `<div style="font-size:var(--fs-small);color:var(--text-dim);padding:2px 0">Y${h.year}: ${icons} → confidence <span style="color:${c}">${net}</span> → ${h.confidenceAfter}</div>`
  }).join('')

  return `<div class="ke-card" style="border-color:${confColor}44;margin-bottom:14px">
    <div style="font-size:var(--fs-body);letter-spacing:2px;color:${confColor};text-transform:uppercase;margin-bottom:8px">Council Mandate · Year ${G.year}</div>
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:var(--fs-small);color:var(--text-dim);margin-bottom:4px">
        <span>${tr("kage.councilConfidence")}</span>
        <span style="color:${confColor};font-weight:bold">${conf}/100</span>
      </div>
      <div style="background:var(--sunken);border-radius:3px;overflow:hidden;height:8px">
        <div style="height:100%;width:${confPct}%;background:${confColor};transition:width .3s"></div>
      </div>
      ${conf < DISMISSAL_THRESHOLD
        ? `<div style="font-size:var(--fs-small);color:var(--red);margin-top:4px">⚠ Confidence critically low. Two consecutive bad years triggers a no-confidence vote.</div>`
        : `<div style="font-size:var(--fs-small);color:var(--text-faint);margin-top:4px">Evaluated each December. Drops below ${DISMISSAL_THRESHOLD} for 2+ years → no-confidence vote.</div>`}
    </div>
    ${mandateRows}
    ${history ? `<div style="margin-top:8px;border-top:1px solid var(--border-dim);padding-top:6px"><div style="font-size:var(--fs-micro);color:var(--text-faint);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px">${tr("kage.recentHistory")}</div>${history}</div>` : ''}
  </div>`
}

function _noConfidenceHtml() {
  if (!G.noConfidenceVote) return ''
  return `<div class="ke-card" style="border-color:var(--red);background:rgba(255,68,68,0.06);margin-bottom:14px">
    <div style="font-size:var(--fs-body);letter-spacing:2px;color:var(--red);text-transform:uppercase;margin-bottom:8px">⚠ No-Confidence Vote</div>
    <div style="font-size:var(--fs-lead);color:var(--text-hi);margin-bottom:8px">The council demands a change of leadership after consecutive mandate failures.</div>
    <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:12px">You may resign with honour or spend 15,000 ryo to rally council support and fight the vote.</div>
    <div style="display:flex;gap:8px">
      <button class="gb gb-r" onclick="resNCV('resign')">${tr("kage.resign")}</button>
      <button class="gb gb-g" onclick="resNCV('fight')" ${(G.ryo||0) < 15000 ? 'disabled title="Need 15,000 ryo"' : ''}>Fight the vote (15k ryo)</button>
    </div>
  </div>`
}

export function resNCV(choice) { resolveNoConfidence(choice) }

export function setCoachingPhilosophy(id) {
  if (!PHILOSOPHY_BY_ID[id]) return
  G.coachingPhilosophy = id
  ntf(tr('toast.kage.philosophy', { name: PHILOSOPHY_BY_ID[id].n }))
  upUI()
}

function _philosophyHtml() {
  const current = G.coachingPhilosophy || 'balanced'
  const p = PHILOSOPHY_BY_ID[current] || PHILOSOPHY_BY_ID.balanced
  const m = p.mods
  const modLine = [
    m.missionSuccess !== 0 ? `Mission ${m.missionSuccess > 0 ? '+' : ''}${Math.round(m.missionSuccess * 100)}%` : null,
    m.kiaRisk !== 0 ? `KIA risk ${m.kiaRisk > 0 ? '+' : ''}${Math.round(m.kiaRisk * 100)}%` : null,
    m.morale !== 0 ? `Morale ${m.morale > 0 ? '+' : ''}${m.morale}/mo` : null,
    m.prospectGrowth !== 0 ? `Dev ${m.prospectGrowth > 0 ? '+' : ''}${Math.round(m.prospectGrowth * 100)}%` : null,
    m.academyCostMult !== 1 ? `Academy cost ×${m.academyCostMult}` : null,
  ].filter(Boolean).join(' · ')
  const buttons = COACHING_PHILOSOPHIES.map(ph =>
    `<button class="btn${ph.id === current ? ' act' : ''}" style="font-size:var(--fs-small);padding:3px 8px" onclick="setCoachingPhilosophy('${ph.id}')">${ph.n}</button>`
  ).join('')
  return `<div class="ke-card" style="margin-bottom:14px">
    <div style="font-size:var(--fs-body);letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px">${tr("kage.coachingPhilosophy")}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">${buttons}</div>
    <div style="font-size:var(--fs-body);color:var(--text-hi);margin-bottom:3px">${p.n} — ${p.desc}</div>
    ${modLine ? `<div style="font-size:var(--fs-small);color:var(--text-dim)">${modLine}</div>` : `<div style="font-size:var(--fs-small);color:var(--text-faint)">${tr("kage.noStatMods")}</div>`}
  </div>`
}
