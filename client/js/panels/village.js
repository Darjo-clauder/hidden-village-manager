import { G, fmt } from '../state.js'

export function rVi() {
  const sal = G.shinobi.reduce((a, s) => a + s.salary, 0)
  const trI = G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0) + G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0)
  document.getElementById('vst').innerHTML =
    `<div class="vc"><div class="vcl">Treasury</div><div class="vcv">${fmt(G.ryo)}</div><div class="vcs">Ryo</div></div>` +
    `<div class="vc"><div class="vcl">Reputation</div><div class="vcv">${G.reputation}</div><div class="vcs">Standing</div></div>` +
    `<div class="vc"><div class="vcl">Shinobi</div><div class="vcv">${G.shinobi.length}</div><div class="vcs">${G.shinobi.filter(s => s.status === 'available').length} available</div></div>` +
    `<div class="vc"><div class="vcl">Squads</div><div class="vcv">${G.squads.length}</div><div class="vcs">Active teams</div></div>` +
    `<div class="vc"><div class="vcl">Morale</div><div class="vcv">${G.morale}%</div><div class="vcs">${G.morale > 70 ? 'High' : G.morale > 40 ? 'Normal' : 'Low'}</div></div>` +
    `<div class="vc"><div class="vcl">Jinchuriki</div><div class="vcv">${G.beasts.filter(b => b.sealed && b.jk).length}</div><div class="vcs">of ${G.beasts.filter(b => b.sealed).length} sealed</div></div>` +
    `<div class="vc" style="grid-column:span 2"><div class="vcl">Monthly Finances</div><div style="display:flex;gap:20px;margin-top:5px"><div><div style="font-size:8px;color:#7a7060">Salaries</div><div style="font-size:15px;color:#f66">-${fmt(sal)}</div></div><div><div style="font-size:8px;color:#7a7060">Trade income</div><div style="font-size:15px;color:#8fbc8f">+${fmt(trI)}</div></div><div><div style="font-size:8px;color:#7a7060">Net</div><div style="font-size:15px;color:${trI > sal ? '#8fbc8f' : '#f66'}">${fmt(trI - sal)}</div></div></div></div>`
}
