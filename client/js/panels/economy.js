import { G, ui, fmt } from '../state.js'
import { BLACK_MARKET } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'

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
    return `<div class="tr-card"><div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:3px">${r.n}${r.active ? ' <span style="color:#8fbc8f;font-size:8px">● Active</span>' : ''}</div><div style="font-size:9px;color:#7a7060;margin-bottom:7px">${r.desc}${bl ? ` <span style="color:#f66">(Requires ${r.req === 'jk' ? 'Jinchuriki' : 'Intel Network'})</span>` : ''}</div><div style="display:flex;gap:14px;font-size:8px;color:#7a7060;margin-bottom:7px">${r.cost > 0 ? `<span>Setup: <span style="color:#e8e0cc">${fmt(r.cost)} ryo</span></span>` : ''}<span>Monthly: <span style="color:#8fbc8f">+${fmt(r.income)} ryo</span></span></div>${r.active ? `<button class="gb gb-r" onclick="tgTr('${r.id}',false)">Close Route</button>` : `<button class="gb gb-g" onclick="tgTr('${r.id}',true)" ${G.ryo < r.cost || bl ? 'disabled' : ''}>Open Route${r.cost > 0 ? ' — ' + fmt(r.cost) + ' ryo' : ' (free)'} ►</button>`}</div>`
  }).join('')
}

export function tgTr(id, on) {
  const r = G.tradeRoutes.find(x => x.id === id); if (!r) return
  if (on) { if (G.ryo < r.cost) { ntf('Not enough ryo!'); return }; G.ryo -= r.cost; r.active = true; aL('"' + r.n + '" opened.', 'good'); ntf('Trade route opened!') }
  else { r.active = false; aL('"' + r.n + '" closed.', 'neutral') }
  upUI()
}

export function rCo() {
  document.getElementById('ec-contracts').innerHTML = G.contracts.map(c =>
    `<div class="tr-card"><div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:3px">${c.n}${c.active ? ' <span style="color:#8fbc8f;font-size:8px">● Active</span>' : ''}</div><div style="font-size:9px;color:#7a7060;margin-bottom:7px">${c.desc}</div><div style="display:flex;gap:14px;font-size:8px;color:#7a7060;margin-bottom:7px"><span>Setup: <span style="color:#e8e0cc">${fmt(c.cost)} ryo</span></span><span>Monthly: <span style="color:#8fbc8f">+${fmt(c.income)} ryo</span></span></div>${c.active ? `<button class="gb gb-r" onclick="tgCo('${c.id}',false)">Cancel</button>` : `<button class="gb gb-g" onclick="tgCo('${c.id}',true)" ${G.ryo < c.cost ? 'disabled' : ''}>Sign — ${fmt(c.cost)} ryo ►</button>`}</div>`
  ).join('')
}

export function tgCo(id, on) {
  const c = G.contracts.find(x => x.id === id); if (!c) return
  if (on) { if (G.ryo < c.cost) { ntf('Not enough ryo!'); return }; G.ryo -= c.cost; c.active = true; aL('"' + c.n + '" signed.', 'good') }
  else { c.active = false; aL('"' + c.n + '" cancelled.', 'neutral') }
  upUI()
}

export function rBl() {
  const hon = G.shinobi.some(s => s.pers.n === 'Honorable')
  const ledger = G.blackLedger || { balance: 0, history: [] }
  const ledgerHtml = ledger.history.length ? `
    <div style="margin-bottom:14px;padding:10px 12px;border:1px solid #5a2a1a;background:#0d0905">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:9px;color:#fa0;letter-spacing:1px;text-transform:uppercase">Off-Books Ledger</span>
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
  document.getElementById('ec-black').innerHTML =
    `<div style="font-size:9px;color:#fa0;margin-bottom:10px;padding:8px;border:1px solid #8b1a1a;background:#0d0905">⚠ Black market dealings risk your reputation.${hon ? ' An Honorable shinobi may expose you.' : ''}</div>` +
    ledgerHtml +
    BLACK_MARKET.map(bm =>
      `<div class="bm-card"><div style="font-size:11px;color:#fa0;font-weight:bold;margin-bottom:3px">${bm.n}</div><div style="font-size:9px;color:#7a7060;margin-bottom:7px">${bm.desc}</div><div style="display:flex;gap:14px;font-size:8px;margin-bottom:7px"><span style="color:#fa0">Gain: ${fmt(bm.ryoGain)} ryo</span><span style="color:#f66">Rep loss: -${bm.repLoss}</span><span style="color:#7a7060">Exposure: ${Math.round(bm.risk * 100)}%</span></div><button class="gb" style="border-color:#fa0;color:#fa0" onclick="doBl('${bm.id}')">Execute ►</button></div>`
    ).join('')
}

export function doBl(id) {
  const bm = BLACK_MARKET.find(x => x.id === id); if (!bm) return
  if (G.shinobi.some(s => s.pers.n === 'Honorable')) { aL('Honorable shinobi exposed the deal!', 'bad'); G.reputation = Math.max(0, G.reputation - 10); upUI(); ntf('Deal exposed!'); return }
  G.ryo += bm.ryoGain; G.reputation = Math.max(0, G.reputation - bm.repLoss)
  // Off-books ledger — separate hidden tracker, accumulates exposure risk over time
  if (!G.blackLedger) G.blackLedger = { balance: 0, history: [] }
  G.blackLedger.balance += bm.ryoGain
  G.blackLedger.history.push({ year: G.year, month: G.month, type: bm.n, amount: bm.ryoGain })
  if (G.blackLedger.history.length > 30) G.blackLedger.history.shift()
  if (Math.random() < bm.risk) { G.reputation = Math.max(0, G.reputation - bm.repLoss * 2); aL('"' + bm.n + '" exposed! Double penalty.', 'bad'); ntf('Exposed!') }
  else { aL('"' + bm.n + '" completed. +' + fmt(bm.ryoGain) + ' ryo.', 'warn') }
  upUI()
}

export function acceptSponsorship() {
  if (!G.sponsorshipOffer) return
  G.sponsorship = G.sponsorshipOffer
  G.sponsorshipOffer = null
  aL('Sponsorship deal with ' + G.sponsorship.n + ' accepted.', 'good')
  ntf('Sponsorship accepted: ' + G.sponsorship.n)
  upUI()
}

export function declineSponsorship() {
  if (!G.sponsorshipOffer) return
  aL('Declined sponsorship offer from ' + G.sponsorshipOffer.n + '.', 'neutral')
  G.sponsorshipOffer = null
  upUI()
}
