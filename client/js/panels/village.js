import { G, fmt } from '../state.js'
import { PRESTIGE_TIERS, UPGRADES_DEF, WORLD_CLIMATES, DOCTRINE_BY_ID } from '../constants.js'
import { villageRevenue } from '../../../shared/utils/economy.js'

export function rVi() {
  const el = document.getElementById('vst')
  if (!el) return

  // ── Prestige progression ──────────────────────────────────────────────
  const legend  = G.legend || 0
  const curTier = [...PRESTIGE_TIERS].reverse().find(t => legend >= t.min) || PRESTIGE_TIERS[0]
  const nextTier = PRESTIGE_TIERS.find(t => t.min > legend) || null
  const tierProg = nextTier
    ? Math.round(((legend - curTier.min) / (nextTier.min - curTier.min)) * 100)
    : 100

  // ── Finances ──────────────────────────────────────────────────────────
  const sal   = G.shinobi.reduce((a, s) => a + (s.salary || 0), 0)
  const staffSal = (G.staff || []).reduce((a, s) => a + (s.salary || 0), 0)
  const trI   = G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0)
  const coI   = G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0)
  const vRev  = villageRevenue(G.reputation || 0, G.prestigeTier || 'D')
  const income = trI + coI + vRev
  const expense = sal + staffSal
  const net = income - expense

  // ── Roster health ─────────────────────────────────────────────────────
  const av = G.shinobi.filter(s => s.status === 'available').length
  const onM = G.shinobi.filter(s => s.status === 'mission').length
  const inj = G.shinobi.filter(s => s.status === 'injured').length
  const idle = av - (G.aM || []).filter(a => !a.isSquad && !a.isScout && !a.isDeepCover).length

  // ── Infrastructure ────────────────────────────────────────────────────
  const builtDistricts = (G.districts || []).filter(d => d.status === 'built').length
  const buildingD = (G.districts || []).find(d => d.status === 'building')

  const card = (title, body, span = 1) =>
    `<div class="vc" style="${span > 1 ? `grid-column:span ${span};` : ''}background:var(--surface,#1a1814);border:1px solid var(--border,#2e2a22);padding:11px 13px">
      <div class="vcl" style="font-size:7px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${title}</div>
      ${body}</div>`

  const bar = (pct, color) =>
    `<div style="background:#0d0d0d;height:5px;border-radius:2px;overflow:hidden;margin-top:4px"><div style="background:${color};height:5px;width:${Math.max(0, Math.min(100, pct))}%;transition:width .3s"></div></div>`

  const jump = (id, label) => `<button class="gb" style="font-size:8px;padding:4px 9px" onclick="sp('${id}')">${label} ►</button>`

  el.innerHTML =
    // Prestige
    card('Prestige Standing', `
      <div style="font-size:15px;color:${curTier.color};font-weight:bold">${curTier.n}</div>
      <div style="font-size:8px;color:#7a7060;margin-top:3px">Legend ${legend}${nextTier ? ` · ${nextTier.min - legend} to ${nextTier.id}` : ' · Max tier'}</div>
      ${bar(tierProg, curTier.color)}
      <div style="font-size:7px;color:#555;margin-top:6px">Scout slots: ${curTier.scoutSlots} · ${curTier.examHostEligible ? 'Exam-host eligible' : 'Cannot host exams yet'}</div>
    `, 2) +

    // Finances
    card('Monthly Finances', `
      <div style="display:flex;gap:18px;flex-wrap:wrap">
        <div><div style="font-size:7px;color:#7a7060">Income</div><div style="font-size:14px;color:#8fbc8f;font-family:'Courier New',monospace">+${fmt(income)}</div></div>
        <div><div style="font-size:7px;color:#7a7060">Expenses</div><div style="font-size:14px;color:#f66;font-family:'Courier New',monospace">-${fmt(expense)}</div></div>
        <div><div style="font-size:7px;color:#7a7060">Net</div><div style="font-size:14px;color:${net >= 0 ? '#8fbc8f' : '#f66'};font-family:'Courier New',monospace">${net >= 0 ? '+' : ''}${fmt(net)}</div></div>
      </div>
      <div style="font-size:7px;color:#555;margin-top:7px">Village revenue ${fmt(vRev)} · Trade ${fmt(trI)} · Contracts ${fmt(coI)} · Salaries -${fmt(sal)} · Staff -${fmt(staffSal)}</div>
      <div style="margin-top:8px">${jump('economy', 'Economy')} ${jump('finances', 'Finances')}</div>
    `, 2) +

    // Roster health
    card('Roster', `
      <div style="font-size:15px;color:#e8e0cc;font-family:'Courier New',monospace">${G.shinobi.length}</div>
      <div style="font-size:8px;color:#7a7060;margin-top:2px"><span style="color:#8fbc8f">${av} available</span> · <span style="color:#c9a84c">${onM} deployed</span>${inj ? ` · <span style="color:#f66">${inj} injured</span>` : ''}</div>
      ${idle > 0 ? `<div style="font-size:8px;color:#fa0;margin-top:4px">⚠ ${idle} idle — assign missions</div>` : '<div style="font-size:8px;color:#5a6a5a;margin-top:4px">✓ Fully deployed</div>'}
      <div style="margin-top:8px">${jump('roster', 'Roster')} ${jump('missions', 'Missions')}</div>
    `) +

    // Morale
    card('Morale & Standing', `
      <div style="font-size:15px;color:${G.morale > 70 ? '#8fbc8f' : G.morale > 40 ? '#c9a84c' : '#f66'};font-family:'Courier New',monospace">${G.morale}%</div>
      <div style="font-size:8px;color:#7a7060;margin-top:2px">${G.morale > 70 ? 'High morale' : G.morale > 40 ? 'Steady' : 'Discontent brewing'}</div>
      <div style="font-size:7px;color:#555;margin-top:4px">Reputation ${G.reputation} · ${G.squads.length} squads</div>
      ${bar(G.morale, G.morale > 70 ? '#8fbc8f' : G.morale > 40 ? '#c9a84c' : '#f66')}
    `) +

    // Infrastructure
    card('Infrastructure', `
      <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:8px">
        ${UPGRADES_DEF.map(u => {
          const lv = G.upgrades[u.id] || 0
          const max = u.levels.length - 1
          return `<span style="color:${lv >= max ? '#8fbc8f' : lv > 0 ? '#c9a84c' : '#555'}">${u.n} ${lv}/${max}</span>`
        }).join('<span style="color:#333">·</span>')}
      </div>
      <div style="font-size:8px;color:#7a7060;margin-top:6px">Districts: ${builtDistricts} built${buildingD ? ` · ⚒ ${buildingD.id} (${buildingD.buildMonthsLeft}mo)` : ''}</div>
      <div style="margin-top:8px">${jump('upgrades', 'Upgrades')}</div>
    `, 2) +

    // World climate + doctrine
    (() => {
      const eco = WORLD_CLIMATES.economy.find(x => x.id === G.worldClimate?.economy)
      const thr = WORLD_CLIMATES.threat.find(x => x.id === G.worldClimate?.threat)
      const doc = DOCTRINE_BY_ID[G.villageDoctrine]
      return card('World Climate', `
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          <div><div style="font-size:7px;color:#7a7060">Economy</div><div style="font-size:11px;color:#e8e0cc">${eco ? eco.icon + ' ' + eco.n : '—'}</div></div>
          <div><div style="font-size:7px;color:#7a7060">Region</div><div style="font-size:11px;color:#e8e0cc">${thr ? thr.icon + ' ' + thr.n : '—'}</div></div>
          <div><div style="font-size:7px;color:#7a7060">Doctrine</div><div style="font-size:11px;color:${doc ? 'var(--accent)' : '#7a7060'}">${doc ? doc.icon + ' ' + doc.n : 'None chosen'}</div></div>
        </div>
        <div style="font-size:7px;color:#555;margin-top:6px">${eco ? eco.desc : ''} ${thr ? thr.desc : ''}</div>
      `, 2)
    })() +

    // Jinchuriki
    card('Tailed Beasts', `
      <div style="font-size:15px;color:#cc7fb8;font-family:'Courier New',monospace">${G.beasts.filter(b => b.sealed && b.jk).length}<span style="font-size:9px;color:#555"> / ${G.beasts.filter(b => b.sealed).length} sealed</span></div>
      <div style="font-size:8px;color:#7a7060;margin-top:2px">${G.beasts.filter(b => b.sealed).length ? G.beasts.filter(b => b.sealed).map(b => b.n).join(', ') : 'None sealed'}</div>
      <div style="margin-top:8px">${jump('beasts', 'Beasts')}</div>
    `, 2)
}
