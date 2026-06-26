import { G, fmt } from '../state.js'
import { UPGRADES_DEF, BUILDING_MAINTENANCE, VILLAGE_DOCTRINES, DOCTRINE_BY_ID } from '../constants.js'
import { DISTRICTS, getDistrictPassives } from '../../../shared/constants/districts.js'
import { t } from '../../../shared/utils/i18n.js'
import { aL, ntf, upUI } from '../ui.js'

// ── Village Doctrine — one-time mutually-exclusive specialization ──────────────
function _doctrineHtml() {
  const chosen = G.villageDoctrine ? DOCTRINE_BY_ID[G.villageDoctrine] : null
  return `<div style="margin-bottom:18px">
    <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px">
      Village Doctrine ${chosen ? `<span style="color:var(--accent);margin-left:6px">${chosen.icon} ${chosen.n} — locked in</span>` : '<span style="color:var(--orange);margin-left:6px">choose one (permanent)</span>'}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
      ${VILLAGE_DOCTRINES.map(d => {
        const sel = G.villageDoctrine === d.id
        const locked = G.villageDoctrine && !sel
        return `<div style="border:1px solid ${sel ? 'var(--accent)' : 'var(--border)'};background:${sel ? 'var(--accent-bg)' : 'transparent'};padding:9px;opacity:${locked ? 0.45 : 1}">
          <div style="font-size:10px;color:${sel ? 'var(--accent)' : 'var(--text-hi)'};font-weight:bold;margin-bottom:3px">${d.icon} ${d.n}</div>
          <div style="font-size:7px;color:var(--text-dim);margin-bottom:7px;line-height:1.4">${d.desc}</div>
          ${sel ? '<div style="font-size:8px;color:var(--accent)">✓ Active</div>'
                : G.villageDoctrine ? '<div style="font-size:7px;color:var(--text-dim)">— not chosen</div>'
                : `<button class="gb gb-g" style="font-size:7px" onclick="chooseDoctrine('${d.id}')">Adopt ►</button>`}
        </div>`
      }).join('')}
    </div>
  </div>`
}

export function chooseDoctrine(id) {
  if (G.villageDoctrine) { ntf(t('toast.upgrades.doctrineLocked')); return }
  const d = DOCTRINE_BY_ID[id]; if (!d) return
  G.villageDoctrine = id
  aL(t('toast.upgrades.doctrineAdopted', { icon: d.icon, name: d.n }), 'good')
  ntf(t('toast.upgrades.doctrineAdoptedShort', { name: d.n }))
  upUI()
}

// Real defense contribution (mirrors raid resolution in adv.js)
function _defenseRating() {
  const wD = G.upgrades.wall === 2 ? 35 : G.upgrades.wall === 1 ? 15 : 0
  const sD = G.upgrades.seal === 2 ? 25 : G.upgrades.seal === 1 ? 10 : 0
  const doc = (DOCTRINE_BY_ID[G.villageDoctrine]?.defBonus) || 0
  return { wall: wD, seal: sD, temp: G.tempDef || 0, doc, total: wD + sD + (G.tempDef || 0) + doc }
}

function _monthlyMaintenance() {
  return UPGRADES_DEF.reduce((sum, u) => sum + (BUILDING_MAINTENANCE[u.id] || 400) * (G.upgrades[u.id] || 0), 0)
}

export function rUp() {
  if (!G.districts) G.districts = []
  const dp = getDistrictPassives(G)
  const builtCount = G.districts.filter(d => d.status === 'built').length
  const building = G.districts.find(d => d.status === 'building')

  const def = _defenseRating()
  const maint = _monthlyMaintenance()
  const defColor = def.total >= 50 ? '#8fbc8f' : def.total >= 25 ? '#c9a84c' : def.total > 0 ? '#fa0' : '#f66'
  const summaryHtml = `
    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px;padding:10px 13px;background:var(--surface,#1a1814);border:1px solid var(--border,#2e2a22)">
      <div>
        <div style="font-size:7px;color:#555;text-transform:uppercase;letter-spacing:1px">${t("upgrades.defenseRating")}</div>
        <div style="font-size:16px;color:${defColor};font-family:'Courier New',monospace">${def.total}</div>
        <div style="font-size:7px;color:#7a7060;margin-top:2px">Walls +${def.wall} · Seals +${def.seal}${def.temp ? ` · Temp +${def.temp}` : ''}${def.doc ? ` · Doctrine ${def.doc > 0 ? '+' : ''}${def.doc}` : ''}</div>
      </div>
      <div>
        <div style="font-size:7px;color:#555;text-transform:uppercase;letter-spacing:1px">${t("upgrades.upkeep")}</div>
        <div style="font-size:16px;color:#f66;font-family:'Courier New',monospace">-${fmt(maint)}</div>
        <div style="font-size:7px;color:#7a7060;margin-top:2px">${t("upgrades.maintNote")}</div>
      </div>
      <div>
        <div style="font-size:7px;color:#555;text-transform:uppercase;letter-spacing:1px">${t("upgrades.districts")}</div>
        <div style="font-size:16px;color:#87ceeb;font-family:'Courier New',monospace">${builtCount}</div>
        <div style="font-size:7px;color:#7a7060;margin-top:2px">${building ? `⚒ ${building.id} (${building.buildMonthsLeft}mo)` : 'None under construction'}</div>
      </div>
      <div style="margin-left:auto;align-self:center;max-width:200px;font-size:7px;color:#7a7060;text-align:right">
        Defense reduces raid losses. Every building level adds monthly upkeep — weigh the payoff against your net income.
      </div>
    </div>`

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
    summaryHtml +
    _doctrineHtml() +
    UPGRADES_DEF.map(u => {
      const lv = G.upgrades[u.id] || 0, maxed = lv >= u.levels.length - 1
      const upkeep = (BUILDING_MAINTENANCE[u.id] || 400) * lv
      const upkeepTag = lv > 0 ? `<span style="font-size:7px;color:#f66;float:right">-${fmt(upkeep)}/mo</span>` : ''
      return `<div class="card"><div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:2px">${u.n}${upkeepTag}</div><div class="upg-lv">Level ${lv}/${u.levels.length - 1}: ${u.levels[lv]}</div>${maxed ? '<div style="font-size:8px;color:#8fbc8f">✓ Fully Upgraded</div>' : `<div style="font-size:8px;color:#7a7060;margin-bottom:5px">Next: ${u.levels[lv + 1]} — ${fmt(u.cost[lv + 1])} ryo · +${fmt(BUILDING_MAINTENANCE[u.id] || 400)}/mo upkeep</div><button class="gb gb-g" onclick="buyUp('${u.id}')" ${G.ryo < u.cost[lv + 1] ? 'disabled' : ''}>Upgrade ► ${fmt(u.cost[lv + 1])} ryo</button>`}</div>`
    }).join('') + districtHtml
}

export function buildDistrict(id) {
  if (!G.districts) G.districts = []
  if (G.districts.find(d => d.id === id)) { ntf(t('toast.upgrades.alreadyBuilt')); return }
  if (G.districts.find(d => d.status === 'building')) { ntf(t('toast.upgrades.alreadyConstructing')); return }
  const def = DISTRICTS.find(d => d.id === id)
  if (!def) return
  if (G.ryo < def.cost) { ntf(t('toast.common.notEnoughRyo')); return }
  G.ryo -= def.cost
  G.districts.push({ id, status: 'building', buildMonthsLeft: def.buildMonths })
  aL(t('toast.upgrades.constructionBegun', { name: def.n, n: def.buildMonths }), 'good')
  ntf(t('toast.upgrades.constructionStarted', { icon: def.icon, name: def.n }))
  upUI()
}

export function buyUp(id) {
  const u = UPGRADES_DEF.find(x => x.id === id), lv = G.upgrades[id], cost = u.cost[lv + 1]
  if (G.ryo < cost) { ntf(t('toast.common.notEnoughRyo')); return }
  G.ryo -= cost; G.upgrades[id]++
  aL(t('toast.upgrades.upgraded', { name: u.n, lv: G.upgrades[id] }), 'good'); ntf(t('toast.upgrades.upgradedShort', { name: u.n })); upUI()
}
