import { G, sPow, sn, fmt } from '../state.js'
import { RANKS, RKC } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'
import { sBars, pCl } from './roster.js'

export function rAc() {
  document.getElementById('acl').innerHTML = G.prospects.map(p =>
    `<div class="card"><div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:7px"><div style="flex:1"><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${sn(p)}</div><div style="font-size:8px;color:#7a7060">${p.clan ? p.clan + ' · ' + p.trait : p.spec} · Age ${p.age}</div></div><span class="rk ${RKC[p.ri]}">${RANKS[p.ri]}</span></div><div class="sg">${sBars(p)}</div><div style="margin-top:7px;display:flex;align-items:center;justify-content:space-between"><span class="trait-tag ${pCl(p.pers)}">${p.pers.n}</span><div style="font-size:8px;color:#7a7060">Pwr ${sPow(p)} · Pot ${p.pers.effect.hidePot ? '???' : p.potential}</div></div><div style="font-size:8px;color:#7a7060;margin-top:5px;font-style:italic">${p.backstory.slice(0, 80)}…</div><button class="gb gb-g" onclick="rec('${p.id}')" style="margin-top:8px" ${G.ryo < 2000 ? 'disabled' : ''}>Recruit — 2,000 ryo ►</button></div>`
  ).join('') || '<div style="color:#7a7060;font-size:10px">No prospects. Advance month.</div>'
}

export function rec(id) {
  if (G.ryo < 2000) { ntf('Not enough ryo!'); return }
  const p = G.prospects.find(x => x.id === id); if (!p) return
  G.ryo -= 2000
  G.shinobi.push({ ...p, status: 'available' })
  G.prospects = G.prospects.filter(x => x.id !== id)
  aL(sn(p) + ' recruited.', 'good'); ntf(p.fn + ' joins!'); upUI()
}
