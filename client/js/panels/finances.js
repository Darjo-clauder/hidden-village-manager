import { G, fmt } from '../state.js'
import { FINANCE_TIERS, MISSION_COMMISSION, BUILDING_MAINTENANCE, DAIMYO_BONUS, STAFF_ROLES, DAIMYO_OBJECTIVES, SPONSORSHIP_OFFERS } from '../constants.js'
import { nationMods } from '../../../shared/constants/nations.js'
import { villageRevenue } from '../../../shared/utils/economy.js'
import { capStatus, SALARY_CAP } from '../../../shared/constants/salaryCap.js'

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
  const jkI = G.beasts.filter(b => b.sealed && b.n === 'Niryuu' && b.jk).length * 3000
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

  const villageRev = villageRevenue(G.reputation || 0, G.prestigeTier || 'D')
  const _baseIncome = villageRev + trI + coI + jkI + daimyoB + (fin.examFees||0) + (fin.loanFees||0)
  const natBonus = G._ff_nationHud ? Math.round(_baseIncome * nationMods(G.nationId).ryoMod) : 0
  const totalIncome = _baseIncome + natBonus
  const totalExpend = shinobiSal + staffSal + maintenance
  const netNow = totalIncome - totalExpend

  // Shinobi breakdown by rank
  const rankSal = [
    { n:'Genin',   ri:0, sal:500 },
    { n:'Chunin',  ri:1, sal:900 },
    { n:'Jonin',   ri:2, sal:1300 },
    { n:'ANBU',    ri:3, sal:1700 },
    { n:'Sannin',  ri:4, sal:2100 },
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
      ${row('Village Revenue (tax base · rep ' + (G.reputation||0) + ')', '+' + fmt(villageRev), '#8fbc8f')}
      ${row('Trade Routes (' + G.tradeRoutes.filter(r=>r.active).length + ' active)', '+' + fmt(trI), '#8fbc8f')}
      ${row('Contracts (' + G.contracts.filter(c=>c.active).length + ' active)', '+' + fmt(coI), '#8fbc8f')}
      ${jkI > 0 ? row('Jinchuriki (Niryuu)', '+' + fmt(jkI), '#c9a84c') : ''}
      ${daimyoB > 0 ? row('Daimyo Bonus (' + daimyoLbl + ')', '+' + fmt(daimyoB), '#c9a84c') : ''}
      ${fin.examFees > 0 ? row('Exam Hosting Fees', '+' + fmt(fin.examFees), '#8fbc8f') : ''}
      ${fin.loanFees > 0 ? row('Loan Fees Received', '+' + fmt(fin.loanFees), '#8fbc8f') : ''}
      ${natBonus !== 0 ? row('Nation Bonus', (natBonus >= 0 ? '+' : '') + fmt(natBonus), natBonus >= 0 ? '#c9a84c' : '#fa0') : ''}
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

    <!-- Salary cap -->
    ${_capHtml(shinobiSal + staffSal)}
    ${_budgetPriorityHtml()}

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
    <div style="background:#1a1814;border:1px solid #2e2a22;padding:12px;margin-bottom:14px">
      <div style="font-size:8px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:6px">Monthly History (last ${hist.length})</div>
      ${hist.map(h => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #111;font-size:8px">
        <span style="color:#3a3630">Y${h.year}M${h.month}</span>
        <span style="color:#7a7060">+${fmt(h.totalIncome)} income</span>
        <span style="color:#7a7060">-${fmt(h.totalExpend)} exp</span>
        <span style="color:${h.net>=0?'#8fbc8f':'#f66'};font-weight:bold">${h.net>=0?'+':''}${fmt(h.net)}</span>
      </div>`).join('')}
      ${sparkline}
    </div>` : ''}

    <!-- 6-month financial projection -->
    ${_projectionHtml(hist, netNow)}

    <!-- Daimyo objectives -->
    ${_daimyoObjectivesHtml()}

    <!-- Sponsorship -->
    ${_sponsorshipHtml()}

    <!-- Black market ledger -->
    ${_blackLedgerHtml()}

    <!-- Analytics snapshot -->
    ${_analyticsHtml()}

    <!-- End of year report -->
    ${_yearEndHtml()}
  `
}

function _budgetPriorityHtml() {
  const bp = G.budgetPriority || { training: 33, warPrep: 33, infra: 34 }
  const total = (bp.training || 0) + (bp.warPrep || 0) + (bp.infra || 0)
  const totalColor = total === 100 ? '#8fbc8f' : '#f66'
  const descs = {
    training: `Dev speed ×${(1 + ((bp.training - 33) / 100) * 0.5).toFixed(2)}`,
    warPrep:  `War pow ×${(1 + ((bp.warPrep  - 33) / 100) * 0.4).toFixed(2)}`,
    infra:    `Maintenance ×${(1 - (bp.infra / 100) * 0.3).toFixed(2)}`,
  }
  return `<div style="background:#1a1814;border:1px solid #2e2a22;padding:12px 14px;margin-bottom:14px">
    <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Budget Priority</div>
    ${['training','warPrep','infra'].map(k => {
      const labels = { training:'Training', warPrep:'War Prep', infra:'Infrastructure' }
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:8px;color:#7a7060;margin-bottom:3px">
          <span>${labels[k]}</span>
          <span style="color:#e8e0cc">${bp[k]}% <span style="color:#555;font-size:7px">— ${descs[k]}</span></span>
        </div>
        <input type="range" min="0" max="100" value="${bp[k]}"
          oninput="setBudgetPriority('${k}', this.value)"
          style="width:100%;accent-color:#c9a84c">
      </div>`
    }).join('')}
    <div style="font-size:7px;color:${totalColor}">Total: ${total}% ${total !== 100 ? '(must equal 100%)' : '✓'}</div>
  </div>`
}

export function setBudgetPriority(key, value) {
  if (!G.budgetPriority) G.budgetPriority = { training: 33, warPrep: 33, infra: 34 }
  G.budgetPriority[key] = Number(value)
  rFi()
}

function _capHtml(payroll) {
  const cs = capStatus(G.prestigeTier || 'D', payroll)
  const pctW = Math.min(100, Math.round(cs.pct * 100))
  const nextTier = { D:'C', C:'B', B:'A', A:'S', S:null }[G.prestigeTier || 'D']
  const nextCap = nextTier ? SALARY_CAP[nextTier] : null
  return `<div style="background:#1a1814;border:1px solid ${cs.color}44;padding:12px;margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-size:8px;letter-spacing:2px;color:${cs.color};text-transform:uppercase">Salary Cap · Prestige ${G.prestigeTier||'D'}</div>
      <div style="font-size:9px;color:${cs.color};font-weight:bold">${cs.label}</div>
    </div>
    <div style="background:#111;border-radius:3px;overflow:hidden;height:8px;margin-bottom:6px">
      <div style="height:100%;width:${pctW}%;background:${cs.color};transition:width .3s"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:8px;color:#7a7060;margin-bottom:4px">
      <span>Payroll: <b style="color:#e8e0cc">${fmt(payroll)}</b></span>
      <span>Cap: <b style="color:#e8e0cc">${fmt(cs.cap)}</b></span>
      <span>${pctW}% used</span>
    </div>
    ${cs.overBy > 0 ? `<div style="font-size:8px;color:#f99;margin-top:4px">Over cap by ${fmt(cs.overBy)} ryo → luxury tax: <b>-${fmt(cs.luxuryTax)}/mo</b></div>` : ''}
    ${cs.hardBlock ? `<div style="font-size:8px;color:#f44;margin-top:4px;font-weight:bold">⛔ Hard cap exceeded — new signings blocked until payroll drops below ${fmt(Math.round(cs.cap * 1.30))}.</div>` : ''}
    ${nextCap ? `<div style="font-size:7px;color:#444;margin-top:4px">Raise prestige to ${nextTier} to unlock ${fmt(nextCap)} cap.</div>` : ''}
  </div>`
}

function _projectionHtml(hist, netNow) {
  const trend = hist.length >= 2 ? (hist[hist.length-1].net - hist[0].net) / hist.length : 0
  const months = []
  for (let i = 1; i <= 6; i++) months.push(Math.round(netNow + trend * i))
  const finalRyo = months.reduce((a,m) => a + m, G.ryo)
  return `<div style="background:#1a1814;border:1px solid #2e2a22;padding:12px;margin-bottom:14px">
    <div style="font-size:8px;letter-spacing:2px;color:#87ceeb;text-transform:uppercase;margin-bottom:8px">6-Month Projection</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
      ${months.map((m,i) => `<div style="flex:1;min-width:60px;background:#111;border-radius:3px;padding:5px;text-align:center">
        <div style="font-size:7px;color:#555">+${i+1}mo</div>
        <div style="font-size:9px;color:${m>=0?'#8fbc8f':'#f66'};font-weight:bold">${m>=0?'+':''}${fmt(m)}</div>
      </div>`).join('')}
    </div>
    <div style="font-size:8px;color:#7a7060">Projected treasury in 6 months: <b style="color:#c9a84c">${fmt(finalRyo)}</b> ryo (based on current contracts, salaries, and trade routes; trend-extrapolated).</div>
  </div>`
}

function _analyticsHtml() {
  const hist = G.analyticsHistory || []
  if (hist.length < 2) return ''
  const last = hist.slice(-12)

  function sparkBar(values, color, maxOverride) {
    const max = maxOverride || Math.max(1, ...values)
    return `<div style="display:flex;align-items:flex-end;gap:2px;height:28px">
      ${values.map((v, i) => {
        const h = Math.max(2, Math.round((v / max) * 26))
        return `<div style="flex:1;background:${color};height:${h}px;opacity:${0.5 + 0.5*(i/values.length)}" title="${Math.round(v)}"></div>`
      }).join('')}
    </div>`
  }

  const ryoVals = last.map(s => s.ryo || 0)
  const repVals = last.map(s => s.rep || 0)
  const powVals = last.map(s => s.avgPow || 0)
  const morVals = last.map(s => s.morale || 0)
  const legVals = last.map(s => s.legend || 0)

  const statBlock = (label, color, vals) => `
    <div style="background:#111;border:1px solid #222;border-radius:4px;padding:8px">
      <div style="font-size:7px;color:${color};text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px">${label}</div>
      ${sparkBar(vals, color)}
      <div style="display:flex;justify-content:space-between;font-size:7px;color:#555;margin-top:3px">
        <span>${Math.round(Math.min(...vals))}</span>
        <span style="color:${color}">${Math.round(vals[vals.length-1])}</span>
        <span>${Math.round(Math.max(...vals))}</span>
      </div>
    </div>`

  return `<div style="background:#1a1814;border:1px solid #2e2a22;padding:12px;margin-bottom:14px">
    <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:10px">📊 Analytics Snapshot (last ${last.length} months)</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">
      ${statBlock('Treasury', '#c9a84c', ryoVals)}
      ${statBlock('Reputation', '#87ceeb', repVals)}
      ${statBlock('Avg Power', '#9cf', powVals)}
      ${statBlock('Morale', '#8fbc8f', morVals)}
      ${statBlock('Legend', '#f0a030', legVals)}
    </div>
    <div style="font-size:7px;color:#444;margin-top:6px">Min / Current / Max over period. Updates each month.</div>
  </div>`
}

function _daimyoObjectivesHtml() {
  const obj = G.daimyoObjectives
  if (!obj) return ''
  const defs = obj.ids.map(id => DAIMYO_OBJECTIVES.find(o => o.id === id)).filter(Boolean)
  return `<div style="background:#1a1814;border:1px solid #c9a84c44;padding:12px;margin-bottom:14px">
    <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Daimyo Objectives — Year ${obj.year}</div>
    ${defs.map(d => `<div style="padding:4px 0;border-bottom:1px solid #111"><div style="font-size:9px;color:#e8e0cc">${d.n}</div><div style="font-size:8px;color:#7a7060">${d.desc}</div></div>`).join('')}
    <div style="font-size:8px;color:#7a7060;margin-top:8px">Budget multiplier: <b style="color:${(G.daimyoBudgetMult||1)>=1?'#8fbc8f':'#f66'}">${(G.daimyoBudgetMult||1).toFixed(2)}x</b>. Meet all 3 by December for a budget increase — miss any for a cut.</div>
  </div>`
}

function _sponsorshipHtml() {
  const offer = G.sponsorshipOffer
  const active = G.sponsorship
  if (!offer && !active) return ''
  return `<div style="background:#1a1814;border:1px solid #cc7fb844;padding:12px;margin-bottom:14px">
    <div style="font-size:8px;letter-spacing:2px;color:#cc7fb8;text-transform:uppercase;margin-bottom:8px">Sponsorship</div>
    ${active ? `<div style="font-size:9px;color:#e8e0cc;margin-bottom:4px">${active.n} — active</div>
      <div style="font-size:8px;color:#8fbc8f;margin-bottom:4px">+${fmt(active.monthlyRyo)} ryo/month</div>
      <div style="font-size:8px;color:#7a7060">Obligation: ${active.obligation}</div>` : ''}
    ${offer ? `<div style="font-size:9px;color:#e8e0cc;margin-bottom:4px">${offer.n} — offer pending</div>
      <div style="font-size:8px;color:#8fbc8f;margin-bottom:4px">+${fmt(offer.monthlyRyo)} ryo/month</div>
      <div style="font-size:8px;color:#7a7060;margin-bottom:8px">${offer.desc} Obligation: ${offer.obligation}</div>
      <div style="display:flex;gap:6px"><button class="gb" onclick="acceptSponsorship()">Accept</button><button class="gb gb-r" onclick="declineSponsorship()">Decline</button></div>` : ''}
  </div>`
}

function _blackLedgerHtml() {
  const ledger = G.blackLedger || { balance: 0, history: [] }
  if (ledger.balance === 0 && ledger.history.length === 0) return ''
  return `<div style="background:#1a0d0d;border:1px solid #74444;padding:12px;margin-bottom:14px">
    <div style="font-size:8px;letter-spacing:2px;color:#f66;text-transform:uppercase;margin-bottom:8px">Black Market Ledger (Off-Books)</div>
    <div style="font-size:9px;color:#e8e0cc;margin-bottom:6px">Accumulated exposure: <b style="color:#f0a030">${fmt(ledger.balance)}</b></div>
    <div style="font-size:8px;color:#7a7060;margin-bottom:6px">Higher balances raise the monthly chance rival intel exposes your dealings — a major diplomatic and financial penalty.</div>
    ${ledger.history.slice(-5).reverse().map(h => `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:8px;color:#7a7060"><span>Y${h.year}M${h.month}</span><span style="color:${h.amount>=0?'#8fbc8f':'#f66'}">${h.amount>=0?'+':''}${fmt(h.amount)}</span></div>`).join('')}
  </div>`
}

function _yearEndHtml() {
  const reports = G.yearEndReports || []
  if (!reports.length) return ''
  const r = reports[reports.length - 1]
  return `<div style="background:#1a1814;border:1px solid #2e2a22;padding:12px;margin-bottom:14px">
    <div style="font-size:8px;letter-spacing:2px;color:#8fbc8f;text-transform:uppercase;margin-bottom:8px">Year ${r.year} Financial Report</div>
    <div style="display:flex;gap:14px;margin-bottom:8px">
      <div><div style="font-size:7px;color:#7a7060">Income</div><div style="font-size:12px;color:#8fbc8f;font-weight:bold">${fmt(r.totalIncome)}</div></div>
      <div><div style="font-size:7px;color:#7a7060">Expenditure</div><div style="font-size:12px;color:#f66;font-weight:bold">${fmt(r.totalExpend)}</div></div>
      <div><div style="font-size:7px;color:#7a7060">Net</div><div style="font-size:12px;color:${r.net>=0?'#8fbc8f':'#f66'};font-weight:bold">${r.net>=0?'+':''}${fmt(r.net)}</div></div>
    </div>
    <div style="font-size:8px;color:#7a7060;margin-bottom:6px">
      Trade: ${fmt(r.streams.tradeRoutes)} · Contracts: ${fmt(r.streams.contracts)} · Daimyo: ${fmt(r.streams.daimyoBonus)} · Missions: ${fmt(r.streams.missionCommissions)} · Sponsorship: ${fmt(r.streams.sponsorship)} · Wages: -${fmt(r.streams.wages)} · Maintenance: -${fmt(r.streams.maintenance)}
    </div>
    <div style="font-size:9px;color:#c9a84c;font-style:italic">"${r.daimyoReaction}"</div>
  </div>`
}
