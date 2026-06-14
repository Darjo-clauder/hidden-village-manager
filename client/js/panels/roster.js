import { G, sPow, clamp, sn, fmt } from '../state.js'
import { RANKS, RKC } from '../constants.js'
// circular-dep with ui.js is safe — all uses are inside function bodies called at runtime
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
  document.getElementById('dos-c').innerHTML =
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px"><div><div style="font-size:14px;color:#e8e0cc;font-weight:bold">${sn(s)}</div><div style="font-size:9px;color:#7a7060;margin-top:2px">${RANKS[s.ri]} · ${s.clan ? s.clan + ' Clan' : s.spec} · Age ${s.age}</div>${jkB ? `<div style="font-size:9px;color:#c9a84c;margin-top:2px">Jinchuriki of ${jkB.n} (${jkB.tails} tails)</div>` : ''}${sq ? `<div style="font-size:9px;color:#cc7fb8;margin-top:2px">Member of ${sq.n}</div>` : ''}</div><span class="rk ${RKC[s.ri]}" style="font-size:10px">${RANKS[s.ri]}</span></div><div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Stats</div><div class="sg">${sBars(s)}</div></div><div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Personality</div><span class="trait-tag ${pCl(s.pers)}">${s.pers.n}</span><div style="font-size:9px;color:#7a7060;margin-top:5px">${s.pers.desc}</div></div><div><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Background</div><div class="dossier">${s.backstory}</div></div><div style="margin-top:10px;display:flex;gap:10px;font-size:9px;color:#7a7060"><span>Power: <b style="color:#e8e0cc">${sPow(s)}</b></span><span>Potential: <b style="color:#c9a84c">${s.pers.effect.hidePot && s.ri < 2 ? '???' : s.potential}</b></span><span>Wins: <b style="color:#8fbc8f">${s.wins}</b></span></div>${s.status === 'available' && !jkB && G.beasts.some(b => b.sealed && !b.jk) ? `<div style="margin-top:10px"><div style="font-size:9px;color:#7a7060;margin-bottom:6px">Assign as Jinchuriki:</div>${G.beasts.filter(b => b.sealed && !b.jk).map(b => `<button class="gb gb-g" onclick="mkJK('${s.id}','${b.n}')" style="margin-right:5px">Seal ${b.n} ►</button>`).join('')}</div>` : ''}`
  document.getElementById('ov-dossier').classList.add('open')
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
