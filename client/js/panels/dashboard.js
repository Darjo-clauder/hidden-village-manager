import { G, fmt } from '../state.js'
import { RANKS } from '../constants.js'
import { NATIONS, nationMods } from '../../../shared/constants/nations.js'
import { villageRevenue } from '../../../shared/utils/economy.js'
import { capStatus } from '../../../shared/constants/salaryCap.js'
import { getInboxDigest, getInboxCount } from './inbox.js'
import { xpForLevel, PATH_BY_ID } from '../../../shared/constants/kageDev.js'

// Compact Kage progression strip (clickable → Kage Path screen).
function _kageStrip() {
  const k = G.kageDev
  if (!k) return ''
  const xpNext = xpForLevel(k.level)
  const xpPct = Math.min(100, Math.round((k.xp / xpNext) * 100))
  const path = k.path ? PATH_BY_ID[k.path] : null
  return `<div onclick="sp('kagedev')" title="Open Kage Path" style="display:flex;align-items:center;gap:10px;background:var(--surface,#1a1814);border:1px solid var(--border);padding:7px 12px;margin-bottom:12px;cursor:pointer">
    <span style="font-size:11px;color:var(--accent);font-weight:bold">${G.kName || 'Kage'}</span>
    <span style="font-size:8px;color:#7a7060">Lvl ${k.level}${path ? ` · ${path.icon} ${path.n}` : ' · no path chosen'}</span>
    <div style="flex:1;max-width:160px;background:#0d0d0d;height:5px;border-radius:3px;overflow:hidden"><div style="height:5px;width:${xpPct}%;background:var(--accent)"></div></div>
    <span style="font-size:7px;color:#555;font-family:var(--font-num,'Courier New',monospace)">${k.xp}/${xpNext} XP</span>
    ${k.points > 0 ? `<span style="font-size:8px;color:#8fbc8f;margin-left:auto">● ${k.points} point${k.points !== 1 ? 's' : ''} to spend ▸</span>` : '<span style="font-size:8px;color:#3a3630;margin-left:auto">Kage Path ▸</span>'}
  </div>`
}

// P2 turn loop — Home surfaces the top pending decisions with a route to resolve.
function _decisionDigest() {
  const blocking = !!G.pendingChoiceEvent || !!G.pendingQuickDecision || G.examActive || G.warActive
  const items = getInboxDigest(4)
  const n = getInboxCount()
  if (!items.length && !blocking) {
    return `<div class="hd-digest is-clear"><div class="hd-digest-h">✓ No decisions pending</div>
      <div style="font-size:9px;color:var(--text-dim)">The village runs smoothly. End the turn when ready.</div></div>`
  }
  const blockRow = blocking
    ? `<div class="hd-item"><span class="hd-item-ico">⛔</span><span class="hd-item-t" style="color:var(--red)">${G.examActive ? 'Chunin Exam in progress' : G.warActive ? 'Nation War in progress' : 'A field decision must be resolved'}</span><button class="hd-item-go" onclick="sp('${G.examActive || G.warActive ? 'exam' : 'inbox'}')">Resolve ▸</button></div>`
    : ''
  return `<div class="hd-digest">
    <div class="hd-digest-h">⚑ Pending Decisions <span style="color:var(--text-dim)">— ${n}</span></div>
    ${blockRow}
    ${items.map(it => `<div class="hd-item">
      <span class="hd-item-ico">${it.icon || '•'}</span>
      <span class="hd-item-t">${it.title}</span>
      <button class="hd-item-go" onclick="sp('inbox')">Go ▸</button>
    </div>`).join('')}
  </div>`
}

export function dismissOnboarding() {
  G._onboardingDismissed = true
  rDash()
}

export function rDash() {
  const el = document.getElementById('p-dashboard')
  if (!el) return

  const now = { y: G.year, m: G.month }

  // ── Roster counts by rank ─────────────────────────────────────────────
  const byRank = [0, 0, 0, 0, 0]  // G, C, B(J), A, S
  const injured   = G.shinobi.filter(s => s.status === 'injured').length
  const available = G.shinobi.filter(s => s.status === 'available').length
  const onMission = G.shinobi.filter(s => s.status === 'mission').length
  G.shinobi.forEach(s => { if (s.ri >= 0 && s.ri <= 4) byRank[s.ri]++ })

  // ── Financial snapshot ────────────────────────────────────────────────
  const tradeIncome = (G.tradeRoutes || []).filter(r => r.active).reduce((a, r) => a + r.income, 0)
  const contractIncome = (G.contracts || []).filter(c => c.active).reduce((a, c) => a + c.income, 0)
  const staffCost   = (G.staff   || []).reduce((a, s) => a + (s.salary || 0), 0)
  const shinobiSal  = (G.shinobi || []).reduce((a, s) => a + (s.salary || 0), 0)
  const villageRev = villageRevenue(G.reputation || 0, G.prestigeTier || 'D')
  // Cap counts shinobi payroll only (staff exempt); luxury tax is a real outflow.
  const capPayroll = (G.shinobi || []).filter(s => !s.twoWay).reduce((a, s) => a + (s.salary || 0), 0)
  const luxuryTax = capStatus(G.prestigeTier || 'D', capPayroll).luxuryTax
  const scoutCost = G.finances?.scoutCostThisMonth || 0
  const monthlyNet = villageRev + tradeIncome + contractIncome - staffCost - shinobiSal - luxuryTax - scoutCost
  const financeHealth = G.ryo > 50000 ? 'strong' : G.ryo > 15000 ? 'stable' : G.ryo > 3000 ? 'tight' : 'critical'
  const financeColor = { strong: 'var(--green)', stable: 'var(--gold)', tight: 'var(--orange)', critical: 'var(--red)' }[financeHealth]

  // ── At-risk alerts ────────────────────────────────────────────────────
  const alerts = []
  G.shinobi.forEach(s => {
    if ((s.commitment ?? 50) < 25)
      alerts.push({ icon: '⚠', title: `${s.fn} ${s.ln} — commitment critical`, sub: `Score: ${s.commitment ?? 0}`, urgency: 'urgent' })
    else if ((s.commitment ?? 50) < 40)
      alerts.push({ icon: '⚡', title: `${s.fn} ${s.ln} — low commitment`, sub: `Score: ${s.commitment ?? 0}`, urgency: 'warn' })
  })
  if (G.staffPoachOffer) alerts.push({ icon: '🎯', title: 'Staff poach offer pending', sub: 'A rival village is targeting your staff.', urgency: 'urgent' })
  if (G.legacyDecisionPending) alerts.push({ icon: '📜', title: 'Legacy decision pending', sub: 'A major decision awaits your judgement.', urgency: 'warn' })
  if (G.summitBlocOffer) alerts.push({ icon: '🤝', title: 'Summit bloc offer', sub: `${G.summitBlocOffer.villageName} proposes a voting bloc.`, urgency: 'warn' })
  if (injured > 3) alerts.push({ icon: '🏥', title: `${injured} shinobi injured`, sub: 'Roster depth is being tested.', urgency: 'warn' })
  if (G.ryo < 5000) alerts.push({ icon: '💸', title: 'Treasury critically low', sub: `${fmt(G.ryo)} ryo remaining.`, urgency: 'urgent' })
  ;(G.prospects || []).forEach(p => {
    if ((p.age || 0) >= 16) alerts.push({ icon: '⏳', title: `${p.fn} ${p.ln} — aging out`, sub: 'Recruit now or lose this prospect.', urgency: 'warn' })
  })

  // ── Monthly summary (last turn log entries) ───────────────────────────
  const recentLog = (G.log || []).slice(-8).reverse()

  // ── Active world events (from noticeboard) ────────────────────────────
  const activeEvents = (G.noticeboard || []).filter(n => !n.dismissed).slice(0, 4)

  // ── Upcoming calendar ─────────────────────────────────────────────────
  const calendar = []
  // Chunin exam
  const nextExam = G.month <= 4 ? { m: 4, label: 'Chunin Exam', tag: 'EXAM' }
                 : G.month <= 10 ? { m: 10, label: 'Chunin Exam', tag: 'EXAM' }
                 : { m: 4, label: 'Chunin Exam (next year)', tag: 'EXAM', nextYear: true }
  calendar.push(nextExam)
  // Summit
  const nextSummit = G.month <= 6 ? { m: 6, label: 'Five-Village Summit', tag: 'SUMMIT' }
                   : { m: 6, label: 'Five-Village Summit (next year)', tag: 'SUMMIT', nextYear: true }
  calendar.push(nextSummit)
  // Academy intake
  const nextIntake = G.month <= 4 ? { m: 4, label: 'Academy Intake', tag: 'ACADEMY' }
                   : { m: 4, label: 'Academy Intake (next year)', tag: 'ACADEMY', nextYear: true }
  calendar.push(nextIntake)
  // Loan expiries
  ;(G.shinobi || []).filter(s => s.loanDuration > 0).forEach(s => {
    const expM = ((G.month - 1 + (s.loanDuration || 0)) % 12) + 1
    calendar.push({ m: expM, label: `${s.fn} ${s.ln} — loan expires`, tag: 'LOAN' })
  })
  calendar.sort((a, b) => {
    const am = a.nextYear ? a.m + 12 : a.m
    const bm = b.nextYear ? b.m + 12 : b.m
    return am - bm
  })

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  el.innerHTML = `
    <div class="pt">Dashboard — Y${G.year} M${G.month}</div>

    ${_kageStrip()}
    ${_decisionDigest()}

    ${G._ff_nationHud ? `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      <span style="font-size:8px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Nation</span>
      ${Object.entries(NATIONS).map(([id, n]) => `
        <button onclick="setNation('${id}')" style="font-size:8px;padding:3px 9px;cursor:pointer;background:${G.nationId === id ? n.accent : 'transparent'};color:${G.nationId === id ? '#0d0d0f' : n.accent};border:1px solid ${n.accent}">${n.crest} ${n.name}${G._a11yColorblind ? ' ·' + n.pattern : ''}</button>`).join('')}
      <button onclick="toggleColorblind()" title="Colorblind mode: show pattern tags" style="font-size:8px;padding:3px 9px;cursor:pointer;background:transparent;color:var(--text-dim);border:1px solid var(--border)">${G._a11yColorblind ? '◑ CB on' : '◐ CB'}</button>
      ${G.nationId ? (() => { const m = nationMods(G.nationId); const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%'; const parts = [m.successMod !== 0 && `${pct(m.successMod)} success`, m.ryoMod !== 0 && `${pct(m.ryoMod)} income`].filter(Boolean); return `<span style="font-size:8px;color:var(--text-dim)">${parts.length ? parts.join(' · ') : '— no stat bonus'}</span>` })() : '<span style="font-size:8px;color:var(--text-dim)">— pick a nation for bonuses</span>'}
    </div>` : ''}

    <!-- Tactics quick-bar -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <span style="font-size:7px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-right:2px">Stance</span>
      ${[['aggressive','⚔','#c9a84c','suc +8% kia +4%'],['balanced','⚖','#8fbc8f','default'],['defensive','🛡','#87ceeb','suc −6% kia −3%']].map(([id,icon,col,hint]) =>
        `<button onclick="setMissionPrep('${id}')" style="font-size:8px;padding:3px 10px;cursor:pointer;border:1px solid ${G.missionPrep===id ? col : '#3a3630'};background:${G.missionPrep===id ? col+'22' : 'transparent'};color:${G.missionPrep===id ? col : '#7a7060'}">${icon} ${id.charAt(0).toUpperCase()+id.slice(1)}<span style="font-size:7px;color:#555;margin-left:4px">${hint}</span></button>`
      ).join('')}
      ${G.citizenMorale !== undefined ? `<span style="font-size:8px;color:#7a7060;margin-left:8px">Citizens <b style="color:${G.citizenMorale>=70?'#8fbc8f':G.citizenMorale>=40?'#fa0':'#f66'}">${G.citizenMorale}%</b></span>` : ''}
      ${G.isOffSeason ? `<span style="font-size:8px;color:#c9a84c;margin-left:8px">⛄ Off-season</span>` : ''}
    </div>

    <!-- Health snapshot -->
    <div class="dash-grid">
      <div class="dash-card ${G.ryo < 5000 ? 'alert' : G.ryo > 50000 ? 'good' : ''}">
        <div class="dash-card-title">Treasury</div>
        <div class="dash-stat" style="color:${financeColor}">${fmt(G.ryo)}</div>
        <div class="dash-stat-sub" style="color:${monthlyNet >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${monthlyNet >= 0 ? '+' : ''}${fmt(monthlyNet)} / month
        </div>
        ${monthlyNet < 0 ? (() => {
          // Runway — the single most useful number for a new GM: how many months the
          // treasury lasts at the current burn. Run missions (or trim staff) to extend it.
          const months = Math.floor(G.ryo / -monthlyNet)
          const col = months < 3 ? 'var(--red)' : months < 6 ? 'var(--orange)' : 'var(--text-dim)'
          return `<div class="dash-stat-sub" style="margin-top:2px;color:${col}">~${months} mo runway · missions extend it</div>`
        })() : ''}
        <div class="dash-stat-sub" style="margin-top:3px;text-transform:uppercase;font-size:7px;letter-spacing:1px;color:${financeColor}">${financeHealth}</div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">Roster Depth</div>
        <div class="dash-stat">${G.shinobi.length}</div>
        <div class="dash-stat-sub">
          <span style="color:var(--green)">${available} available</span> ·
          <span style="color:var(--orange)">${onMission} deployed</span> ·
          <span style="color:var(--red)">${injured} injured</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;font-size:8px;flex-wrap:wrap">
          ${['G','C','J','A','S'].map((r,i) => `<span style="color:var(--text-dim)">${r}: <b style="color:var(--text)">${byRank[i]}</b></span>`).join('')}
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">Academy</div>
        <div class="dash-stat">${(G.intakeClass || []).length}</div>
        <div class="dash-stat-sub">students in training</div>
        <div class="dash-stat-sub" style="margin-top:3px">
          ${(G.prospects || []).length} prospects available
        </div>
      </div>

      <div class="dash-card ${injured > 3 ? 'alert' : ''}">
        <div class="dash-card-title">Morale</div>
        <div class="dash-stat" style="color:${(G.morale||75)>=70?'var(--green)':(G.morale||75)>=45?'var(--gold)':'var(--red)'}">${G.morale || 75}</div>
        <div class="dash-stat-sub">Reputation: ${G.reputation} · Prestige: ${G.prestigeTier || 'D'}</div>
        <div class="dash-stat-sub" style="margin-top:3px">Legend: ${G.legend || 0}${G._moraleFloor ? ` · Floor: ${G._moraleFloor}` : ''}</div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">Social</div>
        <div class="dash-stat" style="color:${(G.citizenMorale||60)>=70?'var(--green)':(G.citizenMorale||60)>=40?'var(--gold)':'var(--red)'}">${G.citizenMorale || 60}<span style="font-size:9px;color:#555">%</span></div>
        <div class="dash-stat-sub">Citizens · Rev ×${((G._citizenRevMult||1)).toFixed(2)}</div>
        <div class="dash-stat-sub" style="margin-top:3px">Alumni: ${(G.alumni||[]).length} · Sponsor: ${G.sponsorship ? G.sponsorship.n.slice(0,12) : 'none'}</div>
      </div>
    </div>

    <!-- Two-column layout: alerts + calendar -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">

      <!-- At-risk alerts -->
      <div style="background:var(--surface);border:1px solid var(--border);padding:13px">
        <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">At-Risk Alerts</div>
        ${alerts.length === 0
          ? '<div style="font-size:9px;color:var(--text-dim);padding:6px 0">No alerts — village is in good standing.</div>'
          : alerts.slice(0,6).map(a => `
          <div class="alert-item ${a.urgency}">
            <div class="alert-icon">${a.icon}</div>
            <div class="alert-text">
              <div class="alert-title">${a.title}</div>
              <div class="alert-sub">${a.sub}</div>
            </div>
          </div>`).join('')
        }
      </div>

      <!-- Upcoming calendar -->
      <div style="background:var(--surface);border:1px solid var(--border);padding:13px">
        <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">Upcoming Events</div>
        ${calendar.slice(0,6).map(e => `
          <div class="cal-item">
            <div class="cal-date">${MONTH_NAMES[(e.m-1)%12]}</div>
            <div class="cal-event">${e.label}</div>
            <div class="cal-tag">${e.tag}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Monthly summary -->
    <div style="background:var(--surface);border:1px solid var(--border);padding:13px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">Last Month's Events</div>
      ${recentLog.length === 0
        ? '<div style="font-size:9px;color:var(--text-dim)">No events recorded yet. Advance a month to begin.</div>'
        : recentLog.map(e => {
            const col = e.t === 'good' ? 'var(--green)' : e.t === 'bad' ? 'var(--red)' : e.t === 'warn' ? 'var(--orange)' : 'var(--text-dim)'
            return `<div style="padding:4px 0;border-bottom:1px solid var(--border-dim);font-size:9px;color:${col}">${e.msg}</div>`
          }).join('')
      }
    </div>

    <!-- Active world events -->
    ${activeEvents.length > 0 ? `
    <div style="background:var(--surface);border:1px solid var(--border);padding:13px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">Active World Events</div>
      ${activeEvents.map(n => `
        <div style="padding:5px 0;border-bottom:1px solid var(--border-dim);font-size:9px;color:var(--blue)">${n.text || n.msg || ''}</div>
      `).join('')}
    </div>` : ''}

    <!-- First-run onboarding guide -->
    ${(!G._onboardingDismissed && G.year === 1 && G.month <= 4) ? `
    <div style="background:#0a1208;border:1px solid #2a4020;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:7px;letter-spacing:2px;color:#8fbc8f;text-transform:uppercase">Getting Started</div>
        <button onclick="dismissOnboarding()" style="font-size:7px;padding:2px 8px;background:transparent;color:#5a7050;border:1px solid #2a4020;cursor:pointer">Dismiss</button>
      </div>
      <div style="font-size:9px;color:#7a9070;margin-bottom:10px">Your village is young. Here are the key actions for your first few months:</div>
      <div style="display:grid;gap:6px">
        ${[
          { done: (G.shinobi||[]).some(s=>s.status==='mission'||s.wins>0), label: 'Assign a shinobi to a mission', tab: 'roster', hint: 'Open Roster → select a shinobi → assign a mission.' },
          { done: (G.prospects||[]).length === 0 && (G.intakeClass||[]).length > 0, label: 'Recruit a prospect from the Academy', tab: 'academy', hint: 'Open Academy → click Recruit on a prospect.' },
          { done: (G.staff||[]).some(s=>s.regionAssigned), label: 'Assign a scout to a region', tab: 'staff', hint: 'Open Staff → select your scout → assign a region.' },
          { done: Object.keys(G.clanApproval||{}).length > 0 || (G.shinobi||[]).some(s=>s.clan), label: 'Check your clan standing', tab: 'clans', hint: 'Open Clans — see which bloodlines are active in your village.' },
          { done: (G.tradeRoutes||[]).some(r=>r.active)||(G.contracts||[]).some(c=>c.active), label: 'Establish a trade route or contract', tab: 'finances', hint: 'Open Finances → activate a trade route to start earning income.' },
          { done: (G.lifetimeMissions||0) >= 3, label: 'Mind your runway — you start at a deficit', tab: 'finances', hint: 'A young village spends more than its tax base earns. Run missions for ryo (or release a scout in Staff) before the treasury runs dry.' },
        ].map(item => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid #1a2818">
            <div style="font-size:10px;color:${item.done?'#8fbc8f':'#3a5030'};min-width:14px;margin-top:1px">${item.done?'✓':'○'}</div>
            <div style="flex:1">
              <div style="font-size:9px;color:${item.done?'#5a7050':'#c9c0a8'};text-decoration:${item.done?'line-through':'none'}">${item.label}</div>
              ${!item.done ? `<div style="font-size:7px;color:#4a5a40;margin-top:2px">${item.hint}</div>` : ''}
            </div>
            ${!item.done ? `<button onclick="sp('${item.tab}')" style="font-size:7px;padding:2px 6px;background:#0d1a0a;color:#8fbc8f;border:1px solid #2a4020;cursor:pointer;white-space:nowrap">Open ▸</button>` : ''}
          </div>`).join('')}
      </div>
    </div>` : ''}
  `
}
