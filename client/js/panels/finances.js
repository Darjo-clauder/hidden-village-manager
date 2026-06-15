import { G, fmt } from '../state.js'
import { FINANCE_TIERS, MISSION_COMMISSION, BUILDING_MAINTENANCE, DAIMYO_BONUS, STAFF_ROLES } from '../constants.js'

function tierColor(name) {
  const t = FINANCE_TIERS.find(x => x.n === name)
  return t ? t.color : '#8fbc8f'
}

function daimyoLabel() {
  const leg = G.legend || 0
  for (const t of DAIMYO_BONUS) { if (leg >= t.at) return t.label }
  return null
}

function row(label, value, color) {
  return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1a1814">
    <span style="font-size:9px;color:#7a7060">${label}</span>
    <span style="font-size:9px;color:${color || '#e8e0cc'};font-weight:bold">${value}</span>
  </div>`
}

export function rFi() {
  const fin = G.finances
  if (!fin) { document.getElementById('fil').innerHTML = '<div style="color:#7a7060;font-size:9px">No financial data yet.</div>'; return }

  const snap = fin.history[fin.history.length - 1]
  const tier = FINANCE_TIERS.find(t => t.n === fin.healthTier) || FINANCE_TIERS[1]
  const tc = tier.color

  // Income breakdown
  const trI = G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0)
  const coI = G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0)
  const jkI = G.beasts.filter(b => b.sealed && b.n === 'Matatabi' && b.jk).length * 3000
  const leg = G.legend || 0
  let daimyoB = 0
  let daimyoLbl = daimyoLabel()
  for (const t of DAIMYO_BONUS) { if (leg >= t.at) { daimyoB = t.amount; break } }

  const commByRank = fin.missionCommissions || {D:0,C:0,B:0,A:0,S:0}
  const commissions = Object.entries(MISSION_COMMISSION).map(([rk, amt]) => {
    const cnt = commByRank[rk] || 0
    return cnt > 0 ? `<span style="font-size:8px;color:#7a7060">${rk}×${cnt}=+${fmt(cnt*amt)}</span>` : null
  }).filter(Boolean).join(' ')

  // Expenditure breakdown
  const shinobiSal = G.shinobi.reduce((a, s) => a + s.salary, 0)
  const staffSal = (G.staff || []).reduce((a, st) => a + st.salary, 0)
  let maintenance = 0
  Object.keys(G.upgrades).forEach(k => {
    const lv = G.upgrades[k]
    if (lv > 0) maintenance += (BUILDING_MAINTENANCE[k] || 400) * lv
  })

  const totalIncome = trI + coI + jkI + daimyoB + (fin.examFees||0) + (fin.loanFees||0)
  const totalExpend = shinobiSal + staffSal + maintenance
  const netNow = totalIncome - totalExpend

  // Shinobi breakdown by rank
  const rankSal = [
    { n:'Genin',   ri:0, sal:500 },
    { n:'Chunin',  ri:1, sal:900 },
    { n:'Jonin',   ri:2, sal:1300 },
    { n:'ANBU',    ri:3, sal:1700 },
    { n:'S-Rank',  ri:4, sal:2100 },
  ].filter(r => G.shinobi.filter(s => s.ri === r.ri).length > 0)
    .map(r => {
      const grp = G.shinobi.filter(s => s.ri === r.ri)
      const total = grp.reduce((a, s) => a + s.salary, 0)
      return `<div style="padding:2px 0 2px 12px;font-size:8px;color:#7a7060">└ ${grp.length}× ${r.n} = <span style="color:#f66">-${fmt(total)}</span></div>`
    }).join('')

  // History sparkline (last 6 months net)
  const hist = fin.history.slice(-6)
  const maxAbs = Math.max(1, ...hist.map(h => Math.abs(h.net)))
  const sparkline = hist.length > 1
    ? `<div style="display:flex;align-items:flex-end;gap:3px;height:30px;margin-top:8px">
        ${hist.map(h => {
          const pct = Math.abs(h.net) / maxAbs
          const ht = Math.max(2, Math.round(pct * 28))
          const c = h.net >= 0 ? '#8fbc8f' : '#f66'
          return `<div style="flex:1;background:${c};height:${ht}px;min-width:8px" title="Y${h.year}M${h.month}: ${h.net>=0?'+':''}${fmt(h.net)}"></div>`
        }).join('')}
      </div>`
    : ''

  document.getElementById('fil').innerHTML = `
    <!-- Health tier -->
    <div style="background:rgba(${tc==='#c9a84c'?'201,168,76':tc==='#8fbc8f'?'143,188,143':tc==='#f0a030'?'240,160,48':tc==='#f99'?'255,153,153':'255,102,102'},0.08);border:1px solid ${tc};padding:12px 14px;margin-bottom:14px">
      <div style="font-size:8px;letter-spacing:2px;color:${tc};text-transform:uppercase;margin-bottom:3px">Financial Health</div>
      <div style="font-size:18px;font-weight:bold;color:${tc}">${fin.healthTier}</div>
      <div style="font-size:9px;color:#7a7060;margin-top:3px">${tier.desc}</div>
      ${fin.deficitMonths > 0 ? `<div style="margin-top:6px;font-size:9px;color:#f99">⚠ Deficit streak: ${fin.deficitMonths} month${fin.deficitMonths!==1?'s':''} — debt spiral triggers at 3.</div>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">

    <!-- INCOME -->
    <div style="background:#1a1814;border:1px solid #2e2a22;padding:12px">
      <div style="font-size:8px;letter-spacing:2px;color:#8fbc8f;text-transform:uppercase;margin-bottom:8px">Income / Month</div>
      ${row('Trade Routes (' + G.tradeRoutes.filter(r=>r.active).length + ' active)', '+' + fmt(trI), '#8fbc8f')}
      ${row('Contracts (' + G.contracts.filter(c=>c.active).length + ' active)', '+' + fmt(coI), '#8fbc8f')}
      ${jkI > 0 ? row('Jinchuriki (Matatabi)', '+' + fmt(jkI), '#c9a84c') : ''}
      ${daimyoB > 0 ? row('Daimyo Bonus (' + daimyoLbl + ')', '+' + fmt(daimyoB), '#c9a84c') : ''}
      ${fin.examFees > 0 ? row('Exam Hosting Fees', '+' + fmt(fin.examFees), '#8fbc8f') : ''}
      ${fin.loanFees > 0 ? row('Loan Fees Received', '+' + fmt(fin.loanFees), '#8fbc8f') : ''}
      <div style="padding:4px 0;margin-top:2px;border-top:1px solid #2e2a22;display:flex;justify-content:space-between">
        <span style="font-size:9px;color:#e8e0cc;font-weight:bold">TOTAL</span>
        <span style="font-size:9px;color:#8fbc8f;font-weight:bold">+${fmt(totalIncome)}</span>
      </div>
      ${commissions ? `<div style="margin-top:6px;font-size:8px;color:#7a7060;letter-spacing:1px">MISSIONS THIS MONTH:</div><div style="margin-top:3px">${commissions}</div>` : ''}
    </div>

    <!-- EXPENDITURE -->
    <div style="background:#1a1814;border:1px solid #2e2a22;padding:12px">
      <div style="font-size:8px;letter-spacing:2px;color:#f66;text-transform:uppercase;margin-bottom:8px">Expenditure / Month</div>
      ${row('Shinobi Wages (' + G.shinobi.length + ' active)', '-' + fmt(shinobiSal), '#f66')}
      ${rankSal}
      ${staffSal > 0 ? row('Staff Salaries (' + (G.staff||[]).length + ' staff)', '-' + fmt(staffSal), '#f99') : ''}
      ${maintenance > 0 ? row('Building Maintenance', '-' + fmt(maintenance), '#fa0') : ''}
      ${(fin.scoutCostThisMonth||0) > 0 ? row('Scout Costs', '-' + fmt(fin.scoutCostThisMonth), '#fa0') : ''}
      <div style="padding:4px 0;margin-top:2px;border-top:1px solid #2e2a22;display:flex;justify-content:space-between">
        <span style="font-size:9px;color:#e8e0cc;font-weight:bold">TOTAL</span>
        <span style="font-size:9px;color:#f66;font-weight:bold">-${fmt(totalExpend)}</span>
      </div>
    </div>

    </div>

    <!-- Net -->
    <div style="background:#0d0b08;border:1px solid ${netNow>=0?'#8fbc8f':'#f66'};padding:12px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:8px;letter-spacing:2px;color:#7a7060;text-transform:uppercase">Monthly Net</div>
        <div style="font-size:22px;font-weight:bold;color:${netNow>=0?'#8fbc8f':'#f66'}">${netNow>=0?'+':''}${fmt(netNow)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:8px;color:#7a7060">Treasury</div>
        <div style="font-size:16px;color:#c9a84c;font-weight:bold">${fmt(G.ryo)}</div>
      </div>
    </div>

    <!-- Transfer vs Wage budget summary -->
    <div style="background:#1a1814;border:1px solid #2e2a22;padding:12px;margin-bottom:14px">
      <div style="font-size:8px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:8px">Budget Pools</div>
      <div style="display:flex;gap:16px">
        <div>
          <div style="font-size:7px;color:#7a7060;margin-bottom:2px">WAGE BUDGET</div>
          <div style="font-size:14px;color:#f99;font-weight:bold">-${fmt(shinobiSal + staffSal)}</div>
          <div style="font-size:8px;color:#7a7060">${G.shinobi.length} shinobi · ${(G.staff||[]).length} staff</div>
        </div>
        <div>
          <div style="font-size:7px;color:#7a7060;margin-bottom:2px">TRANSFER BUDGET</div>
          <div style="font-size:14px;color:#fa0;font-weight:bold">-${fmt(maintenance + (fin.scoutCostThisMonth||0))}</div>
          <div style="font-size:8px;color:#7a7060">Maintenance · Scouts</div>
        </div>
        <div>
          <div style="font-size:7px;color:#7a7060;margin-bottom:2px">PASSIVE INCOME</div>
          <div style="font-size:14px;color:#8fbc8f;font-weight:bold">+${fmt(trI + coI + jkI + daimyoB)}</div>
          <div style="font-size:8px;color:#7a7060">Routes · Contracts · Bonuses</div>
        </div>
      </div>
    </div>

    <!-- History -->
    ${hist.length > 0 ? `
    <div style="background:#1a1814;border:1px solid #2e2a22;padding:12px">
      <div style="font-size:8px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:6px">Monthly History (last ${hist.length})</div>
      ${hist.map(h => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #111;font-size:8px">
        <span style="color:#3a3630">Y${h.year}M${h.month}</span>
        <span style="color:#7a7060">+${fmt(h.totalIncome)} income</span>
        <span style="color:#7a7060">-${fmt(h.totalExpend)} exp</span>
        <span style="color:${h.net>=0?'#8fbc8f':'#f66'};font-weight:bold">${h.net>=0?'+':''}${fmt(h.net)}</span>
      </div>`).join('')}
      ${sparkline}
    </div>` : ''}
  `
}
