import { G, fmt } from '../state.js'
import { UPGRADES_DEF } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'

export function rUp() {
  document.getElementById('upl').innerHTML = UPGRADES_DEF.map(u => {
    const lv = G.upgrades[u.id] || 0, maxed = lv >= u.levels.length - 1
    return `<div class="card"><div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:2px">${u.n}</div><div class="upg-lv">Level ${lv}/${u.levels.length - 1}: ${u.levels[lv]}</div>${maxed ? '<div style="font-size:8px;color:#8fbc8f">✓ Fully Upgraded</div>' : `<div style="font-size:8px;color:#7a7060;margin-bottom:5px">Next: ${u.levels[lv + 1]} — ${fmt(u.cost[lv + 1])} ryo</div><button class="gb gb-g" onclick="buyUp('${u.id}')" ${G.ryo < u.cost[lv + 1] ? 'disabled' : ''}>Upgrade ► ${fmt(u.cost[lv + 1])} ryo</button>`}</div>`
  }).join('')
}

export function buyUp(id) {
  const u = UPGRADES_DEF.find(x => x.id === id), lv = G.upgrades[id], cost = u.cost[lv + 1]
  if (G.ryo < cost) { ntf('Not enough ryo!'); return }
  G.ryo -= cost; G.upgrades[id]++
  aL(u.n + ' upgraded to Lv' + G.upgrades[id] + '.', 'good'); ntf(u.n + ' upgraded!'); upUI()
}
