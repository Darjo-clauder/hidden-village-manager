import { G, ui, sPow, sqP, sn, fmt } from '../state.js'
import { RANKS, RKC, SQUAD_ROLES } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { sqSynergy, cohesionLabel, calcChemistry } from '../synergy.js'
import { bondThresholdInfo } from '../../../shared/bonds/bondTypes.js'
import { FORMATIONS } from '../../../shared/utils/formation.js'

export function setFormation(squadId, formation) {
  if (!G._ff_tacticalFormation) return
  const sq = G.squads.find(q => q.id === squadId); if (!sq) return
  sq.formation = formation
  upUI(); rSq()
}

export function rSq() {
  const el = document.getElementById('sql')
  if (!G.squads.length) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No squads.</div>'; return }
  el.innerHTML = G.squads.map(sq => {
    const mbs = sq.members.map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
    const leader = G.shinobi.find(s => s.id === sq.leaderId)
    const rawPw = sqP(sq) + (leader?.pers.n === 'Charismatic' ? 5 : 0)
    const syn = sqSynergy(sq, G.shinobi)
    const pw = Math.round(rawPw * syn.powerMult)
    const allAv = mbs.every(s => s.status === 'available')
    const aM = G.aM.find(am => am.squadId === sq.id)
    const cohesion = sq.cohesion ?? 0
    const cohesionPct = cohesion + '%'
    const chem = calcChemistry(sq, G.shinobi)

    const synHtml = syn.bonuses.length
      ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${syn.bonuses.map(b =>
          `<span title="${b.desc}" style="font-size:7px;padding:2px 6px;border:1px solid ${b.color};color:${b.color};cursor:help">${b.label}</span>`
        ).join('')}</div>`
      : ''

    return `<div class="card">
      <div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:3px">
        ${sq.n}
        ${sq.identity ? `<span style="font-size:8px;color:#c9a84c;margin-left:5px">"${sq.identity.title}"</span>` : ''}
        <span style="font-size:8px;color:#7a7060">Power ${pw}${syn.powerMult > 1 ? ` <span style="color:#8fbc8f">(+${Math.round((syn.powerMult - 1) * 100)}%)</span>` : ''}</span>
      </div>
      ${sq.identity ? `<div style="font-size:8px;color:#7a7060;margin-bottom:3px;font-style:italic">${sq.identity.desc}</div>` : ''}
      <div style="font-size:8px;color:#7a7060;margin-bottom:5px">Leader: ${leader ? sn(leader) : '-'} (${leader ? RANKS[leader.ri] : '-'})</div>
      <div style="margin-bottom:6px">${mbs.map(s => {
        const roleDef = SQUAD_ROLES.find(r => r.id === (s.squadRole || 'flex'))
        const depthEntry = G.depthChart?.[sq.id]
        const isStarter = depthEntry && Object.values(depthEntry).some(slot => slot.starter === s.id)
        return `<span class="squad-mb">${sn(s)} <span style="color:#c9a84c">${RANKS[s.ri]}</span>${s.jk ? ' 🔮' : ''}${roleDef ? ` <span title="${roleDef.n}" style="font-size:7px;padding:1px 4px;border:1px solid ${roleDef.color};color:${roleDef.color};margin-left:3px">${roleDef.icon}${isStarter ? ' S' : ''}</span>` : ''}</span>`
      }).join('')}</div>
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:8px;color:#7a7060;margin-bottom:3px">
          <span>Cohesion — <span style="color:#e8e0cc">${cohesionLabel(cohesion)}</span></span>
          <span style="color:#c9a84c">${cohesion}/100</span>
        </div>
        <div style="background:#2e2a22;height:3px;border-radius:2px"><div style="background:#c9a84c;height:3px;border-radius:2px;width:${cohesionPct}"></div></div>
      </div>
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:8px;color:#7a7060;margin-bottom:3px">
          <span>Chemistry — <span style="color:${chem.color}">${chem.tier}</span></span>
          <span style="color:${chem.color}">${chem.score}/100</span>
        </div>
        <div style="background:#2e2a22;height:3px;border-radius:2px"><div style="background:${chem.color};height:3px;border-radius:2px;width:${chem.score}%"></div></div>
      </div>
      ${synHtml}
      <div style="display:flex;gap:10px;font-size:8px;color:#7a7060;margin-top:6px">
        <span>W: <b style="color:#8fbc8f">${sq.wins||0}</b></span>
        <span>L: <b style="color:#f66">${sq.losses||0}</b></span>
        <span>Active: <b style="color:#c9a84c">${sq.monthsActive||0}m</b></span>
        ${(() => { const bi = bondThresholdInfo(sq); return bi.eligible
          ? '<span style="color:#c9a84c">🤝 Bonds active</span>'
          : `<span>🤝 Bond in <b style="color:#87ceeb">${bi.away}</b>W</span>` })()}
      </div>
      ${G._ff_tacticalFormation ? `<div style="display:flex;gap:5px;align-items:center;margin-top:6px">
        <span style="font-size:7px;color:#7a7060;text-transform:uppercase;letter-spacing:1px">Formation</span>
        ${Object.entries(FORMATIONS).map(([fid, f]) => `<button onclick="setFormation('${sq.id}','${fid}')" style="font-size:7px;padding:2px 7px;cursor:pointer;background:${(sq.formation || 'balanced') === fid ? '#c9a84c' : 'transparent'};color:${(sq.formation || 'balanced') === fid ? '#0d0d0f' : '#c9a84c'};border:1px solid #c9a84c">${f.name}</button>`).join('')}
      </div>` : ''}
      ${(sq.fallen||[]).length ? `<div style="margin-top:5px;font-size:7px;color:#7a7060;letter-spacing:1px;text-transform:uppercase">Fallen</div>
        ${sq.fallen.map(f => `<div style="font-size:7px;color:#f66;margin-top:1px">✦ ${f.name} · ${f.rank} · Y${f.year}M${f.month} — "${f.mission}"</div>`).join('')}` : ''}
      ${aM
        ? `<div style="font-size:9px;color:#fa0;margin-top:6px">⟳ On mission — ${aM.daysLeft}m left</div>`
        : `<div style="display:flex;gap:6px;margin-top:8px"><button class="gb" onclick="oSqA('${sq.id}')" ${allAv ? '' : 'disabled'}>Assign ►</button><button class="gb gb-r" onclick="disbSq('${sq.id}')">Disband</button></div>`
      }
    </div>`
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
  rCSM(); rSynPrev()
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
  rSynPrev()
}

export function rSynPrev() {
  const el = document.getElementById('cs-synergy')
  if (!el) return
  const all = [ui.csL, ...ui.csM].filter(Boolean)
  if (all.length < 2) { el.innerHTML = ''; return }
  const fakeSq = { id: '_prev', members: all, leaderId: ui.csL, cohesion: 0 }
  const syn = sqSynergy(fakeSq, G.shinobi)
  if (!syn.bonuses.length) { el.innerHTML = '<div style="font-size:8px;color:#3a3630">No synergy detected.</div>'; return }
  el.innerHTML = `<div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Synergy Preview</div>` +
    syn.bonuses.map(b =>
      `<div style="margin-bottom:4px"><span style="font-size:8px;color:${b.color};font-weight:bold">${b.label}</span><div style="font-size:8px;color:#7a7060">${b.desc}</div></div>`
    ).join('')
}

export function doCS() {
  if (!ui.csL) { ntf('Pick a leader!'); return }
  if (ui.csM.length !== 2) { ntf('Pick 2 members!'); return }
  const name = document.getElementById('sqni').value.trim() || 'Squad ' + (G.squads.length + 1)
  const all = [ui.csL, ...ui.csM]
  const sq = { id: Math.random().toString(36).slice(2), n: name, leaderId: ui.csL, members: all, cohesion: 0 }
  G.squads.push(sq)
  all.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) s.squadId = sq.id })
  cm('csquad'); aL(name + ' formed.', 'neutral'); ntf(name + ' ready!'); upUI()
}

export function disbSq(id) {
  const sq = G.squads.find(q => q.id === id); if (!sq) return
  sq.members.forEach(mid => { const s = G.shinobi.find(x => x.id === mid); if (s) s.squadId = null })
  G.squads = G.squads.filter(q => q.id !== id)
  if (sq.identity) {
    sq.cohesion = Math.max(0, (sq.cohesion || 0) - 20)
    aL('"' + sq.identity.title + '" (' + sq.n + ') has been disbanded. After ' + (sq.wins||0) + ' missions together, the unit dissolves. Some bonds don\'t survive bureaucracy.', 'warn')
  } else {
    aL(sq.n + ' disbanded.', 'neutral')
  }
  upUI()
}

export function oSqA(sqId) {
  ui.sqAT = sqId
  const sq = G.squads.find(q => q.id === sqId)
  const pw = sqP(sq) + (G.shinobi.find(s => s.id === sq.leaderId)?.pers.n === 'Charismatic' ? 5 : 0)

  // Role bonus preview from depth chart
  const { roleBonus } = window._depthEngine || {}
  const rB = roleBonus ? roleBonus(sq) : { missionBonus: 0, riskReduction: 0, injReduction: 0 }
  const bonusLines = []
  if (rB.missionBonus  > 0) bonusLines.push(`+${Math.round(rB.missionBonus*100)}% success`)
  if (rB.riskReduction > 0) bonusLines.push(`−${Math.round(rB.riskReduction*100)}% KIA risk`)
  if (rB.injReduction  > 0) bonusLines.push(`−${Math.round(rB.injReduction*100*0.5)}% injury severity`)
  const bonusHtml = bonusLines.length
    ? `<div style="font-size:7px;color:#4a9a4a;margin-top:3px">⚔ Depth chart bonuses: ${bonusLines.join(' · ')}</div>`
    : `<div style="font-size:7px;color:#3a3630;margin-top:3px">No depth chart bonuses assigned.</div>`

  document.getElementById('msa-t').textContent = 'Assign ' + sq.n + ' (power ' + pw + ')'
  const header = document.getElementById('msa-t')
  const bonusEl = document.getElementById('msa-bonus')
  if (bonusEl) bonusEl.innerHTML = bonusHtml
  else header.insertAdjacentHTML('afterend', `<div id="msa-bonus">${bonusHtml}</div>`)

  const sqMs = G.avM.filter(m => m.sq && !G.aM.find(a => a.missionId === m.id))
  document.getElementById('msa-l').innerHTML = sqMs.map(m => {
    const ok = pw >= m.mp, rc = 'mr-' + m.rk.toLowerCase()
    const effectiveSc = Math.round((1 - m.risk + rB.missionBonus - rB.riskReduction) * 100)
    return `<div class="pi" onclick="${ok ? `doSqA('${m.id}')` : ''}" style="${ok ? '' : 'opacity:0.4;cursor:not-allowed'}">
      <div>
        <div style="font-size:10px;color:#e8e0cc">${m.n} <span class="mrb ${rc}">${m.rk}</span></div>
        <div style="font-size:8px;color:#7a7060">${fmt(m.ryo)} ryo · ${m.dur}m · Min ${m.mp}${ok ? '' : ` (need ${m.mp - pw} more)`}</div>
        ${ok && bonusLines.length ? `<div style="font-size:7px;color:#4a9a4a">Est. success: ~${Math.min(97, effectiveSc)}%</div>` : ''}
      </div>
      <span style="font-size:8px;color:${ok ? '#8fbc8f' : '#f66'}">${ok ? '✓' : '✗'}</span>
    </div>`
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
