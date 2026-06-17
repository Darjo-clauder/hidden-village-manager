import { G, fmt } from '../state.js'
import { UPGRADES_DEF } from '../constants.js'
import { DISTRICTS, getDistrictPassives } from '../../../shared/constants/districts.js'
import { aL, ntf, upUI } from '../ui.js'

export function rUp() {
  if (!G.districts) G.districts = []
  const dp = getDistrictPassives(G)
  const builtCount = G.districts.filter(d => d.status === 'built').length
  const building = G.districts.find(d => d.status === 'building')

  const districtHtml = `
    <div style="margin-top:18px">
      <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px">
        Village Districts
        ${builtCount > 0 ? `<span style="color:var(--green);margin-left:8px">${builtCount} built</span>` : ''}
        ${building ? `<span style="color:var(--gold);margin-left:8px">⚒ ${building.id} — ${building.buildMonthsLeft}mo left</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${DISTRICTS.map(d => {
          const state = G.districts.find(x => x.id === d.id)
          const isBuilt = state?.status === 'built'
          const isBuilding = state?.status === 'building'
          const canBuild = !state && !building && G.ryo >= d.cost
          const borderColor = isBuilt ? 'var(--green)' : isBuilding ? 'var(--gold)' : 'var(--border)'
          const effectStr = Object.entries(d.effect).map(([k,v]) => {
            const labels = { statGrowthBonus:`+${Math.round(v*100)}% growth`, injDayReduction:`-${v}mo injury`, kiaRiskMod:`${Math.round(v*100)}% KIA`, anbuSuccessBonus:`+${Math.round(v*100)}% ANBU`, scoutConfidenceBonus:`+${Math.round(v*100)}% scout`, missionRiskReduction:`+${Math.round(v*100)}% missions`, powerFlat:`+${v} power`, monthlyRyo:`+${v.toLocaleString()} ryo/mo` }
            return labels[k] || k
          }).join(', ')
          return `
            <div style="border:1px solid ${borderColor};padding:8px;background:${isBuilt?'rgba(143,188,143,0.05)':'transparent'}">
              <div style="font-size:10px;margin-bottom:2px">${d.icon} <span style="color:var(--text-hi);font-weight:bold">${d.n}</span></div>
              <div style="font-size:7px;color:var(--text-dim);margin-bottom:4px">${d.desc}</div>
              <div style="font-size:7px;color:${d.color};margin-bottom:5px">${effectStr}</div>
              ${isBuilt ? `<div style="font-size:8px;color:var(--green)">✓ Active</div>`
              : isBuilding ? `<div style="font-size:8px;color:var(--gold)">⚒ Building — ${state.buildMonthsLeft}mo remaining</div>`
              : `<button class="gb gb-g" onclick="buildDistrict('${d.id}')" ${canBuild ? '' : 'disabled'}
                  style="font-size:7px">
                  Build — ${fmt(d.cost)} ryo (${d.buildMonths}mo)
                </button>`}
            </div>`
        }).join('')}
      </div>
    </div>`

  document.getElementById('upl').innerHTML =
    UPGRADES_DEF.map(u => {
      const lv = G.upgrades[u.id] || 0, maxed = lv >= u.levels.length - 1
      return `<div class="card"><div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:2px">${u.n}</div><div class="upg-lv">Level ${lv}/${u.levels.length - 1}: ${u.levels[lv]}</div>${maxed ? '<div style="font-size:8px;color:#8fbc8f">✓ Fully Upgraded</div>' : `<div style="font-size:8px;color:#7a7060;margin-bottom:5px">Next: ${u.levels[lv + 1]} — ${fmt(u.cost[lv + 1])} ryo</div><button class="gb gb-g" onclick="buyUp('${u.id}')" ${G.ryo < u.cost[lv + 1] ? 'disabled' : ''}>Upgrade ► ${fmt(u.cost[lv + 1])} ryo</button>`}</div>`
    }).join('') + districtHtml
}

export function buildDistrict(id) {
  if (!G.districts) G.districts = []
  if (G.districts.find(d => d.id === id)) { ntf('Already built or building.'); return }
  if (G.districts.find(d => d.status === 'building')) { ntf('Already constructing a district — wait for it to finish.'); return }
  const def = DISTRICTS.find(d => d.id === id)
  if (!def) return
  if (G.ryo < def.cost) { ntf('Not enough ryo!'); return }
  G.ryo -= def.cost
  G.districts.push({ id, status: 'building', buildMonthsLeft: def.buildMonths })
  aL(`Construction of ${def.n} has begun — completes in ${def.buildMonths} month${def.buildMonths > 1 ? 's' : ''}.`, 'good')
  ntf(`${def.icon} ${def.n} — construction started!`)
  upUI()
}

export function buyUp(id) {
  const u = UPGRADES_DEF.find(x => x.id === id), lv = G.upgrades[id], cost = u.cost[lv + 1]
  if (G.ryo < cost) { ntf('Not enough ryo!'); return }
  G.ryo -= cost; G.upgrades[id]++
  aL(u.n + ' upgraded to Lv' + G.upgrades[id] + '.', 'good'); ntf(u.n + ' upgraded!'); upUI()
}
