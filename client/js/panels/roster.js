import { G, sPow, clamp, sn, fmt } from '../state.js'
import { RANKS, RKC, JUTSU_LIST, INJURY_TYPES } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'

export function sBars(s) {
  return ['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'].map(k =>
    `<div class="sr"><div class="sl">${k.slice(0,5)}</div><div class="sw"><div class="bar"><div class="fill" style="width:${s.stats[k]}%"></div></div><div class="sn">${s.stats[k]}</div></div></div>`
  ).join('')
}

export function pCl(p) { return p.cat === 'pos' ? 'trait-pos' : p.cat === 'neg' ? 'trait-neg' : 'trait-neu' }

export function rRo() {
  const el = document.getElementById('rl')
  if (!G.shinobi.length) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No shinobi. Recruit from Academy.</div>'; return }
  el.innerHTML = G.shinobi.map(s => {
    const sq = G.squads.find(q => q.members.includes(s.id))
    const stT = s.status === 'available' ? '<span class="st st-a">Available</span>' : s.status === 'mission' ? '<span class="st st-m">Mission</span>' : s.status === 'injured' ? `<span class="st st-i">Injured ${s.injDays}m</span>` : '<span class="st st-e">Exam</span>'
    return `<div class="card" onclick="oDos('${s.id}')"><div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px"><div style="flex:1"><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${sn(s)}${s.jk ? ` <span style="font-size:8px;color:#c9a84c">[${s.jk} JK]</span>` : ''}</div><div style="font-size:8px;color:#7a7060">${s.clan ? s.clan + ' · ' + s.trait : s.spec} · Age ${s.age}${sq ? ' · ' + sq.n : ''}</div></div><span class="rk ${RKC[s.ri]}">${RANKS[s.ri]}</span></div><div class="sg">${sBars(s)}</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px"><div style="display:flex;align-items:center;gap:5px">${stT}<span class="trait-tag ${pCl(s.pers)}">${s.pers.n}</span></div><div style="font-size:8px;color:#7a7060">Pwr ${sPow(s)} · ${fmt(s.salary)}/mo</div></div></div>`
  }).join('')
}

export function oDos(id) {
  const s = G.shinobi.find(x => x.id === id); if (!s) return
  const jkB = s.jk ? G.beasts.find(b => b.n === s.jk) : null
  const sq = G.squads.find(q => q.members.includes(s.id))
  document.getElementById('dos-t').textContent = sn(s) + ' — Dossier'
  // Build jutsu section
  const knownJutsu = (s.jutsu || []).map(jId => JUTSU_LIST.find(j => j.id === jId)).filter(Boolean)
  const jutsuHtml = knownJutsu.length
    ? `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Jutsu</div>
       ${knownJutsu.map(j => `<div style="margin-bottom:4px"><span style="font-size:9px;color:${j.tier==='rare'?'#cc7fb8':j.tier==='uncommon'?'#c9a84c':'#87ceeb'};font-weight:bold">${j.n}</span> <span style="font-size:7px;color:#3a3630;text-transform:uppercase">[${j.tier}]</span><div style="font-size:8px;color:#7a7060">${j.desc}</div></div>`).join('')}</div>`
    : ''
  // Build bonds section
  const bondsHtml = (s.bonds || []).length
    ? `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Bonds</div>
       ${s.bonds.map(bnd => { const other = G.shinobi.find(x => x.id === bnd.otherId); return other ? `<div style="font-size:9px;color:#c9a84c;margin-bottom:2px">${bnd.type} — ${sn(other)}</div>` : '' }).filter(Boolean).join('')}</div>`
    : ''
  // Dark moment
  const darkHtml = s.darkMoment
    ? `<div style="margin-bottom:10px;padding:6px 8px;border-left:2px solid #f66;background:rgba(255,80,80,0.04)"><div style="font-size:7px;color:#f66;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px">Dark Moment</div><div style="font-size:8px;color:#7a7060;font-style:italic">${s.darkMoment}</div></div>`
    : ''

  // Injury & availability panel
  const injTypeDef = s.injuryType ? INJURY_TYPES.find(t => t.id === s.injuryType) : null
  const workload = s.workload || 0
  const wColor = workload >= 80 ? '#f44' : workload >= 60 ? '#f99' : workload >= 40 ? '#fa0' : '#8fbc8f'
  const workloadBar = `<div style="background:#222;height:5px;border-radius:2px;overflow:hidden"><div style="width:${workload}%;height:100%;background:${wColor};transition:width .3s"></div></div>`
  const injuryHtml = `<div style="margin-bottom:10px">
    <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Availability & Workload</div>
    ${s.status === 'injured' && injTypeDef
      ? `<div style="padding:7px 9px;border:1px solid ${injTypeDef.color};background:rgba(0,0,0,.3);margin-bottom:6px">
           <div style="font-size:9px;color:${injTypeDef.color};font-weight:bold">${injTypeDef.n}</div>
           <div style="font-size:8px;color:#7a7060;margin-top:2px">${injTypeDef.desc}</div>
           <div style="font-size:8px;color:#7a7060;margin-top:4px">Expected return: <b style="color:#e8e0cc">${s.injDays} month${s.injDays!==1?'s':''}</b></div>
           ${(s.returningForm||100) < 100 ? `<div style="font-size:8px;color:#fa0;margin-top:2px">Post-recovery form: ${s.returningForm}% (builds over 2–3 missions)</div>` : ''}
         </div>`
      : s.status === 'injured'
      ? `<div style="font-size:8px;color:#f44">Injured — ${s.injDays} month${s.injDays!==1?'s':''} remaining</div>`
      : `<div style="font-size:8px;color:#2d5;margin-bottom:4px">${s.status === 'available' ? 'Available' : s.status}</div>`
    }
    ${s.traumaStatus ? `<div style="padding:5px 7px;border:1px solid #cc7fb8;margin-bottom:6px">
      <div style="font-size:8px;color:#cc7fb8">⚠ Psychological Trauma: <b>${s.traumaStatus}</b> (${s.traumaMonths||0} months remaining)</div>
      <div style="font-size:8px;color:#7a7060;margin-top:2px">Stat penalty active. ${s.traumaCount >= 2 ? '<b style="color:#f66">High defection risk</b>' : 'Assign medical ninja for faster recovery.'}</div>
      ${(G.staff||[]).some(st=>st.role==='medical') ? `<button class="gb gb-g" style="margin-top:5px;font-size:7px" onclick="treatTrauma('${s.id}')">Treat Trauma (5,000 ryo) ▸</button>` : ''}
    </div>` : ''}
    <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
      <div style="font-size:7px;color:#7a7060;text-transform:uppercase;width:60px">Workload</div>
      <div style="flex:1">${workloadBar}</div>
      <div style="font-size:8px;color:${wColor};min-width:28px;text-align:right">${workload}%</div>
    </div>
    <div style="font-size:7px;color:#3a3630;margin-top:2px">High workload (60%+) increases injury risk.</div>
    ${(s.consecutiveMissions||0) >= 2 ? `<div style="font-size:7px;color:#fa0;margin-top:2px">⚠ ${s.consecutiveMissions} consecutive missions — overuse risk +10%</div>` : ''}
  </div>`
  document.getElementById('dos-c').innerHTML =
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px"><div><div style="font-size:14px;color:#e8e0cc;font-weight:bold">${sn(s)}</div><div style="font-size:9px;color:#7a7060;margin-top:2px">${RANKS[s.ri]} · ${s.clan ? s.clan + ' Clan' : s.spec} · Age ${s.age}${s.prodigy ? ' · <span style="color:#c9a84c">✦ Prodigy</span>' : ''}</div>${jkB ? `<div style="font-size:9px;color:#c9a84c;margin-top:2px">Jinchuriki of ${jkB.n} (${jkB.tails} tails)</div>` : ''}${sq ? `<div style="font-size:9px;color:#cc7fb8;margin-top:2px">Member of ${sq.n}</div>` : ''}</div><span class="rk ${RKC[s.ri]}" style="font-size:10px">${RANKS[s.ri]}</span></div><div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Stats</div><div class="sg">${sBars(s)}</div></div>${injuryHtml}<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Personality</div><span class="trait-tag ${pCl(s.pers)}">${s.pers.n}</span><div style="font-size:9px;color:#7a7060;margin-top:5px">${s.pers.desc}</div></div><div>${s.archetype ? `<div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Archetype</div><div style="font-size:9px;color:#cc7fb8;margin-bottom:3px">${s.archetype.n}</div><div style="font-size:9px;color:#7a7060;margin-bottom:10px;font-style:italic">${s.archetype.flavor}</div>` : ''}</div>${darkHtml}${jutsuHtml}${bondsHtml}<div><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Background</div><div class="dossier">${s.backstory}</div></div><div style="margin-top:10px;display:flex;gap:10px;font-size:9px;color:#7a7060"><span>Power: <b style="color:#e8e0cc">${sPow(s)}</b></span><span>Potential: <b style="color:#c9a84c">${s.scouted === false ? '???' : s.potential}</b></span><span>Wins: <b style="color:#8fbc8f">${s.wins}</b></span><span>Streak: <b style="color:${(s.streak||0)>=3?'#c9a84c':'#7a7060'}">${s.streak||0}</b></span></div>${s.status === 'available' && !jkB && G.beasts.some(b => b.sealed && !b.jk) ? `<div style="margin-top:10px"><div style="font-size:9px;color:#7a7060;margin-bottom:6px">Assign as Jinchuriki:</div>${G.beasts.filter(b => b.sealed && !b.jk).map(b => `<button class="gb gb-g" onclick="mkJK('${s.id}','${b.n}')" style="margin-right:5px">Seal ${b.n} ►</button>`).join('')}</div>` : ''}`
  document.getElementById('ov-dossier').classList.add('open')
}

export function treatTrauma(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s || !s.traumaStatus) return
  if (G.ryo < 5000) { ntf('Not enough ryo (5,000 needed)'); return }
  G.ryo -= 5000
  s.traumaStatus = null
  s.traumaMonths = 0
  aL(sn(s) + '\'s psychological trauma has been treated. 5,000 ryo spent on medical care.', 'good')
  cm('dossier'); upUI()
}

export function mkJK(sId, bN) {
  const s = G.shinobi.find(x => x.id === sId), b = G.beasts.find(x => x.n === bN)
  if (!s || !b) return
  s.jk = bN; b.jk = sId
  const bst = { ninjutsu: 8, taijutsu: 8, chakra: 15, speed: 8 }
  Object.keys(bst).forEach(k => { s.stats[k] = clamp(s.stats[k] + bst[k], 0, 99) })
  if (bN === 'Kurama') G.reputation = clamp(G.reputation + 30, 0, 999)
  aL(sn(s) + ' becomes Jinchuriki of ' + bN + '!', 'good')
  cm('dossier'); upUI(); ntf(s.fn + '\'s jinchuriki is now ' + bN + '!')
}
