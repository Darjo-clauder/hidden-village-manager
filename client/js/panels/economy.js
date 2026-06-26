import { G, ui, fmt } from '../state.js'
import { BLACK_MARKET } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'

export function eTab(t) {
  ui.ET = t
  ;['trade', 'contracts', 'black'].forEach(x => {
    document.getElementById('ec-' + x).style.display = x === t ? '' : 'none'
    document.getElementById('et-' + x).classList.toggle('active', x === t)
  })
}

export function rEc() { rTr(); rCo(); rBl() }

export function rTr() {
  document.getElementById('ec-trade').innerHTML = G.tradeRoutes.map(r => {
    const jkR = r.req === 'jk' && !G.beasts.some(b => b.sealed && b.jk)
    const inR = r.req === 'intel' && G.upgrades.intel < 1
    const bl = jkR || inR
    const secureCost = Math.round((r._fullIncome || r.income * 2) * 0.6)
    const disruptedTag = r.disrupted ? ' <span style="color:#f66;font-size:8px">⚠ DISRUPTED</span>' : ''
    const statusTag = r.active && !r.disrupted ? ' <span style="color:#8fbc8f;font-size:8px">● Active</span>' : ''
    const incomeLine = r.disrupted
      ? `<span>Monthly: <span style="color:#f66">+${fmt(r.income)} ryo</span> <span style="color:#7a7060">(was +${fmt(r._fullIncome || r.income * 2)})</span></span>`
      : `<span>Monthly: <span style="color:#8fbc8f">+${fmt(r.income)} ryo</span></span>`
    return `<div class="tr-card" style="${r.disrupted ? 'border-left:2px solid #f66' : ''}"><div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:3px">${r.n}${statusTag}${disruptedTag}</div><div style="font-size:9px;color:#7a7060;margin-bottom:7px">${r.desc}${bl ? ` <span style="color:#f66">(Requires ${r.req === 'jk' ? 'Jinchuriki' : 'Intel Network'})</span>` : ''}</div><div style="display:flex;gap:14px;font-size:8px;color:#7a7060;margin-bottom:7px">${r.cost > 0 ? `<span>Setup: <span style="color:#e8e0cc">${fmt(r.cost)} ryo</span></span>` : ''}${incomeLine}</div>${r.disrupted ? `<button class="gb gb-g" onclick="secureRoute('${r.id}')" ${G.ryo < secureCost ? 'disabled' : ''}>Secure Route — ${fmt(secureCost)} ryo ►</button> ` : ''}${r.active ? `<button class="gb gb-r" onclick="tgTr('${r.id}',false)">${tr("economy.closeRoute")}</button>` : `<button class="gb gb-g" onclick="tgTr('${r.id}',true)" ${G.ryo < r.cost || bl ? 'disabled' : ''}>Open Route${r.cost > 0 ? ' — ' + fmt(r.cost) + ' ryo' : ' (free)'} ►</button>`}</div>`
  }).join('')
}

export function secureRoute(id) {
  const r = G.tradeRoutes.find(x => x.id === id); if (!r || !r.disrupted) return
  const cost = Math.round((r._fullIncome || r.income * 2) * 0.6)
  if (G.ryo < cost) { ntf(tr('toast.economy.notEnoughSecure')); return }
  G.ryo -= cost
  r.income = r._fullIncome || r.income * 2
  delete r._fullIncome
  r.disrupted = false
  aL(tr('toast.economy.routeSecured', { name: r.n }), 'good')
  ntf(tr('toast.economy.routeSecuredShort'))
  upUI()
}

export function tgTr(id, on) {
  const r = G.tradeRoutes.find(x => x.id === id); if (!r) return
  if (on) { if (G.ryo < r.cost) { ntf(tr('toast.common.notEnoughRyo')); return }; G.ryo -= r.cost; r.active = true; aL(tr('toast.economy.routeOpened', { name: r.n }), 'good'); ntf(tr('toast.economy.routeOpenedShort')) }
  else { r.active = false; aL(tr('toast.economy.routeClosed', { name: r.n }), 'neutral') }
  upUI()
}

export function rCo() {
  document.getElementById('ec-contracts').innerHTML = G.contracts.map(c =>
    `<div class="tr-card"><div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:3px">${c.n}${c.active ? ' <span style="color:#8fbc8f;font-size:8px">● Active</span>' : ''}</div><div style="font-size:9px;color:#7a7060;margin-bottom:7px">${c.desc}</div><div style="display:flex;gap:14px;font-size:8px;color:#7a7060;margin-bottom:7px"><span>Setup: <span style="color:#e8e0cc">${fmt(c.cost)} ryo</span></span><span>Monthly: <span style="color:#8fbc8f">+${fmt(c.income)} ryo</span></span></div>${c.active ? `<button class="gb gb-r" onclick="tgCo('${c.id}',false)">${tr("btn.cancel")}</button>` : `<button class="gb gb-g" onclick="tgCo('${c.id}',true)" ${G.ryo < c.cost ? 'disabled' : ''}>Sign — ${fmt(c.cost)} ryo ►</button>`}</div>`
  ).join('')
}

export function tgCo(id, on) {
  const c = G.contracts.find(x => x.id === id); if (!c) return
  if (on) { if (G.ryo < c.cost) { ntf(tr('toast.common.notEnoughRyo')); return }; G.ryo -= c.cost; c.active = true; aL(tr('toast.economy.contractSigned', { name: c.n }), 'good') }
  else { c.active = false; aL(tr('toast.economy.contractCancelled', { name: c.n }), 'neutral') }
  upUI()
}

export function rBl() {
  const hon = G.shinobi.some(s => s.pers.n === 'Honorable')
  const ledger = G.blackLedger || { balance: 0, history: [] }
  const ledgerHtml = ledger.history.length ? `
    <div style="margin-bottom:14px;padding:10px 12px;border:1px solid #5a2a1a;background:#0d0905">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:9px;color:#fa0;letter-spacing:1px;text-transform:uppercase">${tr("economy.offBooksLedger")}</span>
        <span style="font-size:10px;color:#fa0;font-weight:bold">${fmt(ledger.balance)} ryo accumulated</span>
      </div>
      <div style="max-height:120px;overflow-y:auto">
        ${[...ledger.history].reverse().map(e => `
          <div style="display:flex;justify-content:space-between;font-size:8px;padding:3px 0;border-bottom:1px solid #2a1a0a">
            <span style="color:#7a7060">Y${e.year} M${e.month} — ${e.type}</span>
            <span style="color:${e.amount > 0 ? '#fa0' : '#f66'}">${e.amount > 0 ? '+' : ''}${fmt(e.amount)}</span>
          </div>`).join('')}
      </div>
    </div>` : ''
  const heat = G.blackMarketHeat || 0
  const heatColor = heat >= 70 ? '#f44' : heat >= 40 ? '#fa0' : '#8fbc8f'
  const heatMult = 1 + heat / 100
  const heatHtml = `
    <div style="margin-bottom:12px;padding:9px 12px;border:1px solid #5a2a1a;background:#0d0905">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:8px;color:#fa0;letter-spacing:1px;text-transform:uppercase">${tr("economy.underworldHeat")}</span>
        <span style="font-size:9px;color:${heatColor}">${heat}/100 · exposure ×${heatMult.toFixed(2)}</span>
      </div>
      <div style="background:#000;height:5px;border-radius:2px;overflow:hidden"><div style="background:${heatColor};height:5px;width:${heat}%"></div></div>
      <div style="font-size:7px;color:#7a7060;margin-top:5px">Each deal raises heat and multiplies exposure risk. Heat cools ~6/month if you lie low.</div>
    </div>`
  document.getElementById('ec-black').innerHTML =
    `<div style="font-size:9px;color:#fa0;margin-bottom:10px;padding:8px;border:1px solid #8b1a1a;background:#0d0905">⚠ Black market dealings risk your reputation.${hon ? ' An Honorable shinobi may expose you.' : ''}</div>` +
    heatHtml +
    ledgerHtml +
    BLACK_MARKET.map(bm => {
      const effRisk = Math.min(0.95, bm.risk * heatMult)
      return `<div class="bm-card"><div style="font-size:11px;color:#fa0;font-weight:bold;margin-bottom:3px">${bm.n}</div><div style="font-size:9px;color:#7a7060;margin-bottom:7px">${bm.desc}</div><div style="display:flex;gap:14px;font-size:8px;margin-bottom:7px"><span style="color:#fa0">Gain: ${fmt(bm.ryoGain)} ryo</span><span style="color:#f66">Rep loss: -${bm.repLoss}</span><span style="color:#7a7060">Exposure: <span style="color:${effRisk > bm.risk ? '#f66' : '#7a7060'}">${Math.round(effRisk * 100)}%</span>${effRisk > bm.risk ? ` (base ${Math.round(bm.risk*100)}%)` : ''}</span></div><button class="gb" style="border-color:#fa0;color:#fa0" onclick="doBl('${bm.id}')">Execute ►</button></div>`
    }).join('')
}

export function doBl(id) {
  const bm = BLACK_MARKET.find(x => x.id === id); if (!bm) return
  if (G.shinobi.some(s => s.pers.n === 'Honorable')) { aL(tr('toast.economy.dealExposedHonor'), 'bad'); G.reputation = Math.max(0, G.reputation - 10); upUI(); ntf(tr('toast.economy.dealExposedShort')); return }
  G.ryo += bm.ryoGain; G.reputation = Math.max(0, G.reputation - bm.repLoss)
  // Off-books ledger — separate hidden tracker, accumulates exposure risk over time
  if (!G.blackLedger) G.blackLedger = { balance: 0, history: [] }
  G.blackLedger.balance += bm.ryoGain
  G.blackLedger.history.push({ year: G.year, month: G.month, type: bm.n, amount: bm.ryoGain })
  if (G.blackLedger.history.length > 30) G.blackLedger.history.shift()
  // Underworld heat scales exposure risk and rises with each deal
  const heatMult = 1 + (G.blackMarketHeat || 0) / 100
  const effRisk = Math.min(0.95, bm.risk * heatMult)
  if (Math.random() < effRisk) { G.reputation = Math.max(0, G.reputation - bm.repLoss * 2); aL(tr('toast.economy.dealExposedDouble', { name: bm.n }), 'bad'); ntf(tr('toast.economy.exposed')) }
  else { aL(tr('toast.economy.dealDone', { name: bm.n, ryo: fmt(bm.ryoGain) }), 'warn') }
  G.blackMarketHeat = Math.min(100, (G.blackMarketHeat || 0) + bm.repLoss + 8)
  upUI()
}

export function acceptSponsorship() {
  if (!G.sponsorshipOffer) return
  G.sponsorship = G.sponsorshipOffer
  G.sponsorshipOffer = null
  aL(tr('toast.economy.sponsorAccepted', { name: G.sponsorship.n }), 'good')
  ntf(tr('toast.economy.sponsorAcceptedShort', { name: G.sponsorship.n }))
  upUI()
}

export function declineSponsorship() {
  if (!G.sponsorshipOffer) return
  aL(tr('toast.economy.sponsorDeclined', { name: G.sponsorshipOffer.n }), 'neutral')
  G.sponsorshipOffer = null
  upUI()
}
