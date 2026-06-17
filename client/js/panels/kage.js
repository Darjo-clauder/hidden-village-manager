import { G, ui, clamp, sn, fmt } from '../state.js'
import { aL, ntf, upUI } from '../ui.js'
import { strengthRatio } from '../../../shared/utils/rivalSim.js'

export function rKa() {
  const el = document.getElementById('kgl')
  const playerStr = G._playerStrength || 50
  const vH = G.villages.map(v => {
    const rc = v.rel > 60 ? '#8fbc8f' : v.rel > 30 ? '#fa0' : '#f66'
    const vs = v.strength || 50
    const ratio = strengthRatio(playerStr, vs)
    const strColor = ratio >= 1.3 ? '#8fbc8f' : ratio >= 0.8 ? '#fa0' : '#f66'
    const strLabel = ratio >= 1.5 ? 'Dominant' : ratio >= 1.2 ? 'Stronger' : ratio >= 0.8 ? 'Matched' : ratio >= 0.5 ? 'Weaker' : 'Outmatched'
    return `<div class="ke-card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:5px"><div style="font-size:20px">${v.ico}</div><div><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${v.n}</div><div style="font-size:8px;color:#7a7060">${v.kageRank} ${v.kage} · <span style="color:${rc}">${v.rel > 60 ? 'Allied' : v.rel > 30 ? 'Neutral' : 'Hostile'}</span>${v.allied ? ' ✓ Allied' : ''}</div></div></div><div style="display:flex;align-items:center;gap:7px;margin-bottom:3px"><div style="font-size:7px;color:#7a7060;width:60px;text-transform:uppercase;letter-spacing:1px">Relations</div><div class="bar" style="flex:1"><div class="fill" style="width:${v.rel}%;background:${rc}"></div></div><div style="font-size:9px;color:#7a7060">${v.rel}</div></div><div style="display:flex;align-items:center;gap:7px;margin-bottom:6px"><div style="font-size:7px;color:#7a7060;width:60px;text-transform:uppercase;letter-spacing:1px">Strength</div><div class="bar" style="flex:1"><div class="fill" style="width:${Math.min(100,vs/2)}%;background:${strColor}"></div></div><div style="font-size:8px;color:${strColor}">${strLabel} (${Math.round(vs)})</div></div><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="gb gb-b" onclick="sGift('${v.n}')" ${G.ryo < 5000 ? 'disabled' : ''}>Send gifts +10 (5k ryo)</button>${v.rel > 60 && !v.allied ? `<button class="gb gb-g" onclick="propAl('${v.n}')" ${G.ryo < 10000 ? 'disabled' : ''}>Propose alliance (10k)</button>` : ''}${v.rel < 30 ? `<button class="gb gb-r" onclick="rattle('${v.n}')">Rattle sabres</button>` : ''}</div></div>`
  }).join('')
  el.innerHTML = (ui.pKE
    ? `<div class="ke-card" style="border-color:#c9a84c;margin-bottom:14px"><div style="font-size:9px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">⚡ Kage Event</div><div style="font-size:12px;color:#e8e0cc;font-weight:bold;margin-bottom:5px">${ui.pKE.n}</div><div style="font-size:10px;color:#7a7060;margin-bottom:12px;line-height:1.5">${ui.pKE.desc}</div><div style="display:flex;flex-direction:column;gap:6px">${ui.pKE.choices.map((c, i) => `<button class="gb" onclick="resKE(${i})">${c.l}</button>`).join('')}</div></div>`
    : '') + vH
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
