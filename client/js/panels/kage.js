import { G, ui, clamp, sn, fmt } from '../state.js'
import { aL, ntf, upUI } from '../ui.js'
import { strengthRatio, rankStandings } from '../../../shared/utils/rivalSim.js'
import { MANDATE_BY_ID, DISMISSAL_THRESHOLD } from '../../../shared/utils/ownerMandate.js'
import { resolveNoConfidence } from '../adv.js'
import { COACHING_PHILOSOPHIES, PHILOSOPHY_BY_ID } from '../../../shared/constants/coachingPhilosophy.js'

export function rKa() {
  const el = document.getElementById('kgl')
  const playerStr = G._playerStrength || 50
  const vH = G.villages.map(v => {
    const rc = v.rel > 60 ? '#8fbc8f' : v.rel > 30 ? '#fa0' : '#f66'
    const vs = v.strength || 50
    const ratio = strengthRatio(playerStr, vs)
    const strColor = ratio >= 1.3 ? '#8fbc8f' : ratio >= 0.8 ? '#fa0' : '#f66'
    const strLabel = ratio >= 1.5 ? 'Dominant' : ratio >= 1.2 ? 'Stronger' : ratio >= 0.8 ? 'Matched' : ratio >= 0.5 ? 'Weaker' : 'Outmatched'
    return `<div class="ke-card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><div style="font-size:20px">${v.ico}</div><div><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${v.n}</div><div style="font-size:8px;color:#7a7060">${v.kageRank} ${v.kage} · <span style="color:${rc}">${v.rel > 60 ? 'Allied' : v.rel > 30 ? 'Neutral' : 'Hostile'}</span>${v.allied ? ' ✓ Allied' : ''}</div></div></div><div style="display:flex;align-items:center;gap:7px;margin-bottom:3px"><div style="font-size:7px;color:#7a7060;width:60px;text-transform:uppercase;letter-spacing:1px">Relations</div><div class="bar" style="flex:1"><div class="fill" style="width:${v.rel}%;background:${rc}"></div></div><div style="font-size:9px;color:#7a7060">${v.rel}</div></div><div style="display:flex;align-items:center;gap:7px;margin-bottom:6px"><div style="font-size:7px;color:#7a7060;width:60px;text-transform:uppercase;letter-spacing:1px">Strength</div><div class="bar" style="flex:1"><div class="fill" style="width:${Math.min(100,vs/2)}%;background:${strColor}"></div></div><div style="font-size:8px;color:${strColor}">${strLabel} (${Math.round(vs)})</div></div><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="gb gb-b" onclick="sGift('${v.n}')" ${G.ryo < 5000 ? 'disabled' : ''}>Send gifts +10 (5k ryo)</button>${v.rel > 60 && !v.allied ? `<button class="gb gb-g" onclick="propAl('${v.n}')" ${G.ryo < 10000 ? 'disabled' : ''}>Propose alliance (10k)</button>` : ''}${v.rel < 60 && !v.allied ? `<button class="gb" onclick="demandTribute('${v.n}')" title="Strength-gated. Success extracts ryo; failure angers them.">Demand tribute</button>` : ''}${(v.threat || 0) > 0 ? `<button class="gb gb-b" onclick="appease('${v.n}')" ${G.ryo < 4000 ? 'disabled' : ''}>Appease −threat (4k)</button>` : ''}${v.rel < 30 ? `<button class="gb gb-r" onclick="rattle('${v.n}')">Rattle sabres</button>` : ''}</div></div>`
  }).join('')
  const standings = rankStandings(playerStr, (G.vName || 'Your Village'), G.villages)
  const standingsHtml = `<div class="ke-card" style="margin-bottom:14px">
    <div style="font-size:9px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Power Standings</div>
    <table style="width:100%;border-collapse:collapse;font-size:9px">
      <thead><tr style="color:#7a7060;text-align:left"><th style="padding:2px 5px">#</th><th>Village</th><th style="text-align:right;padding:2px 5px">Strength</th></tr></thead>
      <tbody>${standings.map(r => `<tr style="${r.isPlayer ? 'color:#c9a84c;font-weight:bold' : 'color:#e8e0cc'}"><td style="padding:2px 5px">${r.rank}</td><td>${r.name}${r.isPlayer ? ' (you)' : ''}</td><td style="text-align:right;padding:2px 5px">${r.strength}</td></tr>`).join('')}</tbody>
    </table>
  </div>`
  el.innerHTML = (ui.pKE
    ? `<div class="ke-card" style="border-color:#c9a84c;margin-bottom:14px"><div style="font-size:9px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">⚡ Kage Event</div><div style="font-size:12px;color:#e8e0cc;font-weight:bold;margin-bottom:5px">${ui.pKE.n}</div><div style="font-size:10px;color:#7a7060;margin-bottom:12px;line-height:1.5">${ui.pKE.desc}</div><div style="display:flex;flex-direction:column;gap:6px">${ui.pKE.choices.map((c, i) => `<button class="gb" onclick="resKE(${i})">${c.l}</button>`).join('')}</div></div>`
    : '') + _rivalDemandHtml() + _noConfidenceHtml() + _mandateHtml() + _philosophyHtml() + standingsHtml + vH
}

// ── Rival-initiated demand (quarterly) ────────────────────────────────────────
function _diploQuarter() { return `Y${G.year}Q${Math.ceil(G.month / 3)}` }

function _rivalDemandHtml() {
  // Surface an existing pending demand, or generate one this quarter from a strong hostile rival.
  if (!G.rivalDemand || G.rivalDemand.resolvedQuarter) {
    if (G.rivalDemand?.quarter === _diploQuarter()) return ''  // already handled this quarter
    const playerStr = G._playerStrength || 50
    const aggressors = (G.villages || []).filter(v => v.rel < 40 && (v.strength || 50) > playerStr * 1.05 && !v.allied)
    if (!aggressors.length) return ''
    const v = aggressors.sort((a, b) => (b.strength || 50) - (a.strength || 50))[0]
    const amount = Math.round(3000 + (v.strength || 50) * 120)
    G.rivalDemand = { villageName: v.n, icon: v.ico, amount, quarter: _diploQuarter(), resolvedQuarter: null }
  }
  const d = G.rivalDemand
  if (!d || d.resolvedQuarter) return ''
  return `<div class="ke-card" style="border-color:#8b1a1a;background:#160808;margin-bottom:14px">
    <div style="font-size:9px;letter-spacing:2px;color:#f66;text-transform:uppercase;margin-bottom:6px">⚠ Tribute Demand — ${_diploQuarter()}</div>
    <div style="font-size:11px;color:#e8e0cc;margin-bottom:8px">${d.icon || ''} <b>${d.villageName}</b> demands <b style="color:#fa0">${fmt(d.amount)} ryo</b> in tribute, or relations sour and their war footing grows.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="gb gb-b" onclick="payRivalDemand()" ${G.ryo < d.amount ? 'disabled' : ''}>Pay tribute (${fmt(d.amount)} ryo, +12 rel)</button>
      <button class="gb gb-r" onclick="refuseRivalDemand()">Refuse (−15 rel, +25 their threat)</button>
    </div>
  </div>`
}

export function payRivalDemand() {
  const d = G.rivalDemand; if (!d || d.resolvedQuarter) return
  if (G.ryo < d.amount) { ntf('Not enough ryo.'); return }
  G.ryo -= d.amount
  const v = G.villages.find(x => x.n === d.villageName)
  if (v) v.rel = clamp(v.rel + 12, 0, 100)
  d.resolvedQuarter = _diploQuarter()
  aL(`Paid ${fmt(d.amount)} ryo tribute to ${d.villageName}. Tensions ease.`, 'neutral')
  ntf('Tribute paid.'); upUI()
}

export function refuseRivalDemand() {
  const d = G.rivalDemand; if (!d || d.resolvedQuarter) return
  const v = G.villages.find(x => x.n === d.villageName)
  if (v) { v.rel = clamp(v.rel - 15, 0, 100); v.threat = clamp((v.threat || 0) + 25, 0, 100) }
  d.resolvedQuarter = _diploQuarter()
  aL(`Refused ${d.villageName}'s tribute demand. They will not forget this.`, 'warn')
  ntf('Demand refused.'); upUI()
}

export function demandTribute(n) {
  const v = G.villages.find(x => x.n === n); if (!v) return
  const playerStr = G._playerStrength || 50
  const edge = playerStr / ((v.strength || 50) || 1)
  if (edge >= 1.1 && Math.random() < clamp(0.35 + (edge - 1) * 0.6, 0.2, 0.85)) {
    const gain = Math.round(2500 + (v.strength || 50) * 90)
    G.ryo += gain; v.rel = clamp(v.rel - 8, 0, 100)
    aL(`${n} yielded to your demand — extracted ${fmt(gain)} ryo. They resent it.`, 'good')
    ntf(`Tribute extracted: +${fmt(gain)} ryo`)
  } else {
    v.rel = clamp(v.rel - 12, 0, 100); v.threat = clamp((v.threat || 0) + 18, 0, 100)
    aL(`${n} rebuffed your demand — relations worsen and their hostility grows.`, 'bad')
    ntf('Demand rebuffed.')
  }
  upUI()
}

export function appease(n) {
  if (G.ryo < 4000) { ntf('Not enough ryo!'); return }
  const v = G.villages.find(x => x.n === n); if (!v) return
  G.ryo -= 4000
  v.threat = clamp((v.threat || 0) - 30, 0, 100); v.rel = clamp(v.rel + 5, 0, 100)
  aL(`Appeased ${n} — their war footing eases.`, 'good'); ntf('Tensions reduced.'); upUI()
}

export function resKE(i) {
  if (!ui.pKE) return
  ui.pKE.choices[i].fn(G, aL)
  ui.pKE = null; upUI(); ntf('Decision made.')
}

export function sGift(n) {
  if (G.ryo < 5000) { ntf('Not enough ryo!'); return }
  const v = G.villages.find(x => x.n === n); G.ryo -= 5000; v.rel = clamp(v.rel + 10, 0, 100)
  aL('Gifts sent to ' + n + '.', 'good'); ntf('Relations improved!'); upUI()
}

export function propAl(n) {
  if (G.ryo < 10000) { ntf('Not enough ryo!'); return }
  const v = G.villages.find(x => x.n === n); G.ryo -= 10000; v.rel = clamp(v.rel + 25, 0, 100); v.allied = true
  aL('Alliance with ' + n + '!', 'good'); ntf('Allied with ' + n + '!'); upUI()
}

export function rattle(n) {
  const v = G.villages.find(x => x.n === n); v.rel = clamp(v.rel - 15, 0, 100); v.threat = clamp((v.threat || 0) + 20, 0, 100)
  aL('Rattled sabres at ' + n + '.', 'warn'); upUI()
}

function _mandateHtml() {
  const m = G.ownerMandate
  if (!m || !m.ids?.length) return ''
  const conf = m.confidence ?? 75
  const confColor = conf >= 60 ? '#8fbc8f' : conf >= DISMISSAL_THRESHOLD ? '#fa0' : '#f44'
  const confPct = conf
  const mandateRows = m.ids.map(id => {
    const def = MANDATE_BY_ID[id]
    if (!def) return ''
    return `<div style="padding:5px 0;border-bottom:1px solid #111">
      <div style="font-size:9px;color:#e8e0cc">${def.n}</div>
      <div style="font-size:8px;color:#7a7060">${def.desc}</div>
      <div style="font-size:8px;color:#555;margin-top:2px">+${def.confidenceGain} if met · -${def.confidenceLoss} if missed</div>
    </div>`
  }).join('')
  const history = (m.history || []).slice(-3).reverse().map(h => {
    const net = h.delta >= 0 ? `+${h.delta}` : `${h.delta}`
    const c = h.delta >= 0 ? '#8fbc8f' : '#f66'
    const icons = h.results.map(r => r.met ? '✓' : '✗').join(' ')
    return `<div style="font-size:8px;color:#7a7060;padding:2px 0">Y${h.year}: ${icons} → confidence <span style="color:${c}">${net}</span> → ${h.confidenceAfter}</div>`
  }).join('')

  return `<div class="ke-card" style="border-color:${confColor}44;margin-bottom:14px">
    <div style="font-size:9px;letter-spacing:2px;color:${confColor};text-transform:uppercase;margin-bottom:8px">Council Mandate · Year ${G.year}</div>
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:8px;color:#7a7060;margin-bottom:4px">
        <span>Council Confidence</span>
        <span style="color:${confColor};font-weight:bold">${conf}/100</span>
      </div>
      <div style="background:#111;border-radius:3px;overflow:hidden;height:8px">
        <div style="height:100%;width:${confPct}%;background:${confColor};transition:width .3s"></div>
      </div>
      ${conf < DISMISSAL_THRESHOLD
        ? `<div style="font-size:8px;color:#f44;margin-top:4px">⚠ Confidence critically low. Two consecutive bad years triggers a no-confidence vote.</div>`
        : `<div style="font-size:8px;color:#555;margin-top:4px">Evaluated each December. Drops below ${DISMISSAL_THRESHOLD} for 2+ years → no-confidence vote.</div>`}
    </div>
    ${mandateRows}
    ${history ? `<div style="margin-top:8px;border-top:1px solid #222;padding-top:6px"><div style="font-size:7px;color:#555;text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px">Recent history</div>${history}</div>` : ''}
  </div>`
}

function _noConfidenceHtml() {
  if (!G.noConfidenceVote) return ''
  return `<div class="ke-card" style="border-color:#f44;background:rgba(255,68,68,0.06);margin-bottom:14px">
    <div style="font-size:10px;letter-spacing:2px;color:#f44;text-transform:uppercase;margin-bottom:8px">⚠ No-Confidence Vote</div>
    <div style="font-size:11px;color:#e8e0cc;margin-bottom:8px">The council demands a change of leadership after consecutive mandate failures.</div>
    <div style="font-size:9px;color:#7a7060;margin-bottom:12px">You may resign with honour or spend 15,000 ryo to rally council support and fight the vote.</div>
    <div style="display:flex;gap:8px">
      <button class="gb gb-r" onclick="resNCV('resign')">Resign (end dynasty)</button>
      <button class="gb gb-g" onclick="resNCV('fight')" ${(G.ryo||0) < 15000 ? 'disabled title="Need 15,000 ryo"' : ''}>Fight the vote (15k ryo)</button>
    </div>
  </div>`
}

export function resNCV(choice) { resolveNoConfidence(choice) }

export function setCoachingPhilosophy(id) {
  if (!PHILOSOPHY_BY_ID[id]) return
  G.coachingPhilosophy = id
  ntf('Coaching philosophy: ' + PHILOSOPHY_BY_ID[id].n)
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
    `<button class="btn${ph.id === current ? ' act' : ''}" style="font-size:8px;padding:3px 8px" onclick="setCoachingPhilosophy('${ph.id}')">${ph.n}</button>`
  ).join('')
  return `<div class="ke-card" style="margin-bottom:14px">
    <div style="font-size:9px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Coaching Philosophy</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">${buttons}</div>
    <div style="font-size:9px;color:#e8e0cc;margin-bottom:3px">${p.n} — ${p.desc}</div>
    ${modLine ? `<div style="font-size:8px;color:#7a7060">${modLine}</div>` : `<div style="font-size:8px;color:#555">No stat modifiers.</div>`}
  </div>`
}
