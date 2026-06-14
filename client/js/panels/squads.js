import { G, ui, sPow, sqP, sn, fmt } from '../state.js'
import { RANKS, RKC } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'

export function rSq() {
  const el = document.getElementById('sql')
  if (!G.squads.length) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No squads.</div>'; return }
  el.innerHTML = G.squads.map(sq => {
    const mbs = sq.members.map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
    const leader = G.shinobi.find(s => s.id === sq.leaderId)
    const pw = sqP(sq) + (leader?.pers.n === 'Charismatic' ? 5 : 0)
    const allAv = mbs.every(s => s.status === 'available')
    const aM = G.aM.find(am => am.squadId === sq.id)
    return `<div class="card"><div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:3px">${sq.n} <span style="font-size:8px;color:#7a7060">Power ${pw}</span></div><div style="font-size:8px;color:#7a7060;margin-bottom:7px">Leader: ${leader ? sn(leader) : '-'} (${leader ? RANKS[leader.ri] : '-'})</div><div style="margin-bottom:8px">${mbs.map(s => `<span class="squad-mb">${sn(s)} <span style="color:#c9a84c">${RANKS[s.ri]}</span>${s.jk ? ' 🔮' : ''}</span>`).join('')}</div>${aM ? `<div style="font-size:9px;color:#fa0">⟳ On mission — ${aM.daysLeft}m left</div>` : `<div style="display:flex;gap:6px"><button class="gb" onclick="oSqA('${sq.id}')" ${allAv ? '' : 'disabled'}>Assign ►</button><button class="gb gb-r" onclick="disbSq('${sq.id}')">Disband</button></div>`}</div>`
  }).join('')
}

export function oCS() {
  ui.csL = null; ui.csM = []
  const j = G.shinobi.filter(s => s.ri >= 2 && s.status === 'available' && !G.squads.find(q => q.leaderId === s.id))
  document.getElementById('cs-l').innerHTML = j.map(s =>
    `<div class="pi" onclick="csSL('${s.id}',this)" id="csl-${s.id}"><div><div style="font-size:10px;color:#e8e0cc">${sn(s)}</div><div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}${s.pers.n === 'Charismatic' ? ' · +5 sq pwr' : ''}</div></div></div>`
  ).join('') || '<div style="color:#7a7060;font-size:9px">No available Jonin+.</div>'
  rCSM()
  document.getElementById('sqni').value = 'Squad ' + (G.squads.length + 1)
  document.getElementById('ov-csquad').classList.add('open')
}

export function csSL(id, el) {
  ui.csL = id
  document.querySelectorAll('[id^="csl-"]').forEach(e => e.style.background = '')
  el.style.background = 'rgba(201,168,76,0.1)'
  rCSM()
}

export function rCSM() {
  const av = G.shinobi.filter(s => s.status === 'available' && s.id !== ui.csL && !G.squads.some(q => q.members.includes(s.id)))
  document.getElementById('cs-m').innerHTML = av.map(s => {
    const sel = ui.csM.includes(s.id)
    return `<div class="pi" onclick="csMT('${s.id}')" style="${sel ? 'border-color:#c9a84c;background:rgba(201,168,76,0.08)' : ''}"><div><div style="font-size:10px;color:#e8e0cc">${sn(s)}</div><div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</div></div>${sel ? '<span style="color:#c9a84c;font-size:9px">✓</span>' : ''}</div>`
  }).join('')
}

export function csMT(id) {
  if (ui.csM.includes(id)) ui.csM = ui.csM.filter(x => x !== id)
  else if (ui.csM.length < 2) ui.csM.push(id)
  rCSM()
}

export function doCS() {
  if (!ui.csL) { ntf('Pick a leader!'); return }
  if (ui.csM.length !== 2) { ntf('Pick 2 members!'); return }
  const name = document.getElementById('sqni').value.trim() || 'Squad ' + (G.squads.length + 1)
  const all = [ui.csL, ...ui.csM]
  const sq = { id: Math.random().toString(36).slice(2), n: name, leaderId: ui.csL, members: all }
  G.squads.push(sq)
  all.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) s.squadId = sq.id })
  cm('csquad'); aL(name + ' formed.', 'neutral'); ntf(name + ' ready!'); upUI()
}

export function disbSq(id) {
  const sq = G.squads.find(q => q.id === id); if (!sq) return
  sq.members.forEach(mid => { const s = G.shinobi.find(x => x.id === mid); if (s) s.squadId = null })
  G.squads = G.squads.filter(q => q.id !== id)
  aL(sq.n + ' disbanded.', 'neutral'); upUI()
}

export function oSqA(sqId) {
  ui.sqAT = sqId
  const sq = G.squads.find(q => q.id === sqId)
  const pw = sqP(sq) + (G.shinobi.find(s => s.id === sq.leaderId)?.pers.n === 'Charismatic' ? 5 : 0)
  document.getElementById('msa-t').textContent = 'Assign ' + sq.n + ' (power ' + pw + ')'
  const sqMs = G.avM.filter(m => m.sq && !G.aM.find(a => a.missionId === m.id))
  document.getElementById('msa-l').innerHTML = sqMs.map(m => {
    const ok = pw >= m.mp, rc = 'mr-' + m.rk.toLowerCase()
    return `<div class="pi" onclick="${ok ? `doSqA('${m.id}')` : ''}" style="${ok ? '' : 'opacity:0.4;cursor:not-allowed'}"><div><div style="font-size:10px;color:#e8e0cc">${m.n} <span class="mrb ${rc}">${m.rk}</span></div><div style="font-size:8px;color:#7a7060">${fmt(m.ryo)} ryo · ${m.dur}m · Min ${m.mp}${ok ? '' : ` (need ${m.mp - pw} more)`}</div></div><span style="font-size:8px;color:${ok ? '#8fbc8f' : '#f66'}">${ok ? '✓' : '✗'}</span></div>`
  }).join('') || '<div style="color:#7a7060;font-size:9px">No squad missions.</div>'
  document.getElementById('ov-sqassign').classList.add('open')
}

export function doSqA(mId) {
  const sq = G.squads.find(q => q.id === ui.sqAT), m = G.avM.find(x => x.id === mId)
  if (!sq || !m) return
  sq.members.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) { s.status = 'mission'; s.missId = mId } })
  G.aM.push({ id: Math.random().toString(36).slice(2), missionId: mId, assignedTo: null, squadId: sq.id, daysLeft: m.dur, isSquad: true })
  cm('sqassign'); aL(sq.n + ' deployed on "' + m.n + '".', 'neutral'); ntf(sq.n + ' on mission!'); upUI()
}
