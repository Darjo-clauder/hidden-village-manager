import { G, sPow, sn } from '../state.js'
import { RANKS } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'

export function rBe() {
  document.getElementById('bstl').innerHTML = G.beasts.map(b => {
    const jkS = b.jk ? G.shinobi.find(s => s.id === b.jk) : null
    const capM = G.aM.find(am => am.isBeastCapture && am.beastName === b.n)
    return `<div class="tb-card ${b.sealed ? 'tb-sealed' : ''}"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px"><div><div class="tb-name">${b.n}</div><div class="tb-tails">${'◆'.repeat(b.tails)} ${b.tails}-Tail${b.tails > 1 ? 's' : ''} · ${b.element}</div></div><div style="font-size:8px;padding:2px 7px;border:1px solid;${b.sealed ? 'color:#8fbc8f;border-color:#8fbc8f' : 'color:#7a7060;border-color:#2e2a22'}">${b.sealed ? 'Sealed' : 'Wild'}</div></div><div class="tb-bar-row"><div class="tb-lbl">Raw Power</div><div class="bar" style="flex:1"><div class="fill" style="width:${b.pow}%"></div></div><div style="font-size:9px;color:#7a7060;min-width:20px;text-align:right">${b.pow}</div></div><div style="font-size:9px;color:#7a7060;margin-top:6px;line-height:1.5">${b.benefit}</div>${jkS ? `<div style="font-size:8px;padding:2px 7px;border:1px solid #c9a84c;color:#c9a84c;margin-top:6px;display:inline-block">Jinchuriki: ${sn(jkS)}</div>` : ''}${b.sealed && !b.jk ? '<div style="font-size:9px;color:#fa0;margin-top:6px">Assign a Jinchuriki from the Roster (click any shinobi).</div>' : ''}${b.sealed || capM ? '' : `<button class="gb" style="margin-top:8px" onclick="lCap('${b.n}')" ${G.shinobi.filter(s => s.ri >= 3 && s.status === 'available').length < 1 ? 'disabled title="Need ANBU+"' : ''}>Launch Capture (ANBU+) ►</button>`}${capM ? `<div style="font-size:9px;color:#c9a84c;margin-top:7px">⟳ Capture mission — ${capM.daysLeft}m remaining</div>` : ''}</div>`
  }).join('')
}

export function lCap(bN) {
  const b = G.beasts.find(x => x.n === bN); if (!b) return
  const sh = G.shinobi.filter(s => s.ri >= 3 && s.status === 'available')
  if (!sh.length) { ntf('Need ANBU or higher!'); return }
  const s = sh[0]; s.status = 'mission'; s.missId = 'beast-' + bN
  G.aM.push({ id: Math.random().toString(36).slice(2), missionId: 'beast-' + bN, assignedTo: s.id, squadId: null, daysLeft: 3, isSquad: false, isBeastCapture: true, beastName: bN })
  aL(sn(s) + ' launched to capture ' + bN + '!', 'warn'); ntf(bN + ' capture begun!'); upUI()
}
