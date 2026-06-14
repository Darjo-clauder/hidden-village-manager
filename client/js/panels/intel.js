import { G } from '../state.js'

export function rIn() {
  document.getElementById('itl').innerHTML = G.villages.map(v => {
    const rc = v.rel > 60 ? '#8fbc8f' : v.rel > 30 ? '#fa0' : '#f66'
    return `<div class="ke-card"><div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:6px">${v.ico} ${v.n} — ${v.kageRank} ${v.kage}</div><div style="display:flex;align-items:center;gap:7px;margin-bottom:3px"><div style="font-size:7px;color:#7a7060;width:60px;text-transform:uppercase;letter-spacing:1px">Relations</div><div class="bar" style="flex:1"><div class="fill" style="width:${v.rel}%;background:${rc}"></div></div><div style="font-size:9px;color:#7a7060">${v.rel}</div></div><div style="display:flex;align-items:center;gap:7px;margin-bottom:6px"><div style="font-size:7px;color:#7a7060;width:60px;text-transform:uppercase;letter-spacing:1px">Strength</div><div class="bar" style="flex:1"><div class="fill" style="width:${v.str}%"></div></div><div style="font-size:9px;color:#7a7060">${v.str}</div></div>${v.threat ? `<div style="font-size:8px;color:#f66">⚠ Threat: ${v.threat}</div>` : ''}${v.allied ? '<div style="font-size:8px;color:#8fbc8f">✓ Allied</div>' : ''}</div>`
  }).join('')
}
