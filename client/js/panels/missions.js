import { G, ui, sPow, sqP, sn, fmt, clamp } from '../state.js'
import { RANKS, RKC } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { pCl } from './roster.js'
import { oSqA } from './squads.js'

export function mTab(t) {
  ui.MT = t
  ;['solo', 'squad', 'def'].forEach(x => {
    document.getElementById('ms-' + x).style.display = x === t ? '' : 'none'
    document.getElementById('mt-' + x).classList.toggle('active', x === t)
  })
}

export function rMi() { rRB(); rWCE(); rSoloM(); rSqM(); rDef() }

export function rWCE() {
  const el = document.getElementById('wce-banner')
  if (!el) return
  if (G.pendingChoiceEvent) {
    el.style.display = ''
    document.getElementById('wce-banner-name').textContent = G.pendingChoiceEvent.n
  } else {
    el.style.display = 'none'
  }
}

export function openWorldChoice() {
  const ev = G.pendingChoiceEvent; if (!ev) return
  document.getElementById('wce-title').textContent = ev.n
  document.getElementById('wce-desc').textContent = ev.desc
  document.getElementById('wce-choices').innerHTML = ev.choices.map(c =>
    `<button class="gb" style="display:block;width:100%;margin-bottom:6px;text-align:left" onclick="resolveChoiceEvent('${c.fn}')">${c.l}</button>`
  ).join('')
  document.getElementById('ov-worldchoice').classList.add('open')
}

export function rRB() {
  const b = document.getElementById('rdb'), d = document.getElementById('rdd')
  if (G.raid && !G.raid.resolved) {
    b.classList.add('on')
    d.textContent = G.raid.n + ': ' + G.raid.desc + ' ' + (G.raidW > 0 ? 'Arrives in ' + G.raidW + 'm.' : 'ARRIVING THIS MONTH!')
  } else b.classList.remove('on')
}

export function rSoloM() {
  const el = document.getElementById('ms-solo'), av = G.shinobi.filter(s => s.status === 'available')
  el.innerHTML = G.avM.filter(m => !m.sq).map(m => {
    const rc = 'mr-' + m.rk.toLowerCase(), aM = G.aM.find(a => a.missionId === m.id && !a.isSquad)
    return `<div class="mc"><div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px"><span class="mrb ${rc}">${m.rk}</span><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${m.n}</div></div><div style="display:flex;gap:12px;flex-wrap:wrap;font-size:8px;color:#7a7060;margin-bottom:7px"><span>Reward: <span style="color:#e8e0cc">${fmt(m.ryo)} ryo</span></span><span>Rep: <span style="color:#e8e0cc">+${m.rep}</span></span><span>Duration: <span style="color:#e8e0cc">${m.dur}m</span></span><span>Risk: <span style="color:#e8e0cc">${Math.round(m.risk * 100)}%</span></span><span>Min pwr: <span style="color:#e8e0cc">${m.mp}</span></span></div>${aM ? `<div style="font-size:9px;color:#fa0">⟳ ${sn(G.shinobi.find(s => s.id === aM.assignedTo) || { fn: '?', ln: '' })} — ${aM.daysLeft}m left</div>` : `<button class="gb" onclick="oA('${m.id}')" ${av.length ? '' : 'disabled'}>${av.length ? 'Assign ►' : 'No shinobi'}</button>`}</div>`
  }).join('')
}

export function rSqM() {
  const el = document.getElementById('ms-squad')
  el.innerHTML = G.avM.filter(m => m.sq).map(m => {
    const rc = 'mr-' + m.rk.toLowerCase(), aM = G.aM.find(a => a.missionId === m.id && a.isSquad)
    return `<div class="mc"><div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px"><span class="mrb ${rc}">${m.rk}</span><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${m.n} <span style="font-size:8px;color:#cc7fb8">Squad</span></div></div><div style="display:flex;gap:12px;flex-wrap:wrap;font-size:8px;color:#7a7060;margin-bottom:7px"><span>Reward: <span style="color:#e8e0cc">${fmt(m.ryo)} ryo</span></span><span>Min sq pwr: <span style="color:#e8e0cc">${m.mp}</span></span><span>Duration: <span style="color:#e8e0cc">${m.dur}m</span></span></div>${aM ? `<div style="font-size:9px;color:#fa0">⟳ Squad on mission — ${aM.daysLeft}m left</div>` : `<button class="gb" onclick="pickSq('${m.id}')">Assign Squad ►</button>`}</div>`
  }).join('') || '<div style="color:#7a7060;font-size:10px">No squad missions.</div>'
}

export function pickSq(mId) {
  const fq = G.squads.filter(sq => sq.members.every(id => { const s = G.shinobi.find(x => x.id === id); return s && s.status === 'available' }))
  if (!fq.length) { ntf('No available squads!'); return }
  ui.sqAT = fq[0].id; oSqA(fq[0].id)
}

export function rDef() {
  const el = document.getElementById('ms-def')
  if (!G.raid || G.raid.resolved) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No active threats.</div>'; return }
  const wD = (G.upgrades.wall === 1 ? 15 : G.upgrades.wall === 2 ? 35 : 0) + (G.upgrades.seal === 1 ? 10 : G.upgrades.seal === 2 ? 25 : 0) + (G.tempDef || 0)
  const def = G.defSh ? G.shinobi.find(s => s.id === G.defSh) : null
  const av = G.shinobi.filter(s => s.status === 'available')
  el.innerHTML = `<div style="background:#1a0000;border:1px solid #8b1a1a;padding:12px"><div style="font-size:9px;color:#f66;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">⚠ ${G.raid.n}</div><div style="font-size:10px;color:#f99;margin-bottom:10px">${G.raid.desc}</div><div style="display:flex;gap:18px;margin-bottom:10px"><div><div style="font-size:7px;color:#7a7060;letter-spacing:1px">THREAT</div><div style="font-size:18px;color:#f66;font-weight:bold">${G.raid.str}</div></div><div><div style="font-size:7px;color:#7a7060;letter-spacing:1px">WALL DEF</div><div style="font-size:18px;color:#8fbc8f;font-weight:bold">${wD}</div></div><div><div style="font-size:7px;color:#7a7060;letter-spacing:1px">ARRIVES IN</div><div style="font-size:18px;color:#fa0;font-weight:bold">${G.raidW}m</div></div></div>${def ? `<div style="font-size:10px;color:#8fbc8f;margin-bottom:7px">Defender: ${sn(def)} (Pwr ${sPow(def)})</div><button class="gb gb-r" onclick="G_defShClear()">Remove</button>` : av.map(s => `<div class="pi" onclick="G_defShSet('${s.id}')" style="margin-bottom:4px"><div style="font-size:10px;color:#e8e0cc">${sn(s)}</div><div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</div></div>`).join('') || '<div style="color:#7a7060;font-size:9px">No shinobi available.</div>'}</div>`
}

export function oA(mId) {
  ui.aT = mId
  const m = G.avM.find(x => x.id === mId)
  document.getElementById('ma-t').textContent = 'Assign to: ' + m.n
  document.getElementById('ma-d').textContent = m.rk + '-Rank · ' + fmt(m.ryo) + ' ryo · Risk ' + Math.round(m.risk * 100) + '% · Min pwr ' + m.mp
  const av = G.shinobi.filter(s => s.status === 'available')
  document.getElementById('ma-l').innerHTML = av.map(s => {
    const pw = sPow(s), ok = pw >= m.mp, ref = s.pers.effect.rankFilter && ['D', 'C'].includes(m.rk)
    return `<div class="pi" onclick="${ok && !ref ? `doA('${s.id}')` : ''}" style="${ok && !ref ? '' : 'opacity:0.4;cursor:not-allowed'}"><div><div style="font-size:10px;color:#e8e0cc">${sn(s)} <span class="trait-tag ${pCl(s.pers)}" style="font-size:7px">${s.pers.n}</span></div><div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${pw}${ref ? ' · Refuses low-rank' : !ok ? ` (need ${m.mp - pw} more)` : ''}</div></div><span style="font-size:8px;color:${ok && !ref ? '#8fbc8f' : '#f66'}">${ok && !ref ? '✓' : '✗'}</span></div>`
  }).join('') || '<div style="color:#7a7060;font-size:9px">No available shinobi.</div>'
  document.getElementById('ov-assign').classList.add('open')
}

export function doA(sId) {
  const m = G.avM.find(x => x.id === ui.aT), s = G.shinobi.find(x => x.id === sId)
  if (!m || !s) return
  s.status = 'mission'; s.missId = m.id
  G.aM.push({ id: Math.random().toString(36).slice(2), missionId: m.id, assignedTo: sId, squadId: null, daysLeft: m.dur, isSquad: false })
  cm('assign'); aL(sn(s) + ' dispatched on "' + m.n + '".', 'neutral'); ntf(s.fn + ' deployed!'); upUI()
}
