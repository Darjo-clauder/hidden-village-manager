import { G, fmt } from '../state.js'
import { RANKS } from '../constants.js'
import { NATIONS, nationMods } from '../../../shared/constants/nations.js'
import { villageRevenue } from '../../../shared/utils/economy.js'
import { capStatus } from '../../../shared/constants/salaryCap.js'
import { getInboxDigest, getInboxCount } from './inbox.js'
import { xpForLevel, PATH_BY_ID } from '../../../shared/constants/kageDev.js'
import { t } from '../../../shared/utils/i18n.js'
import { supportTier, revenueMult } from '../../../shared/utils/populace.js'
import { saveToSlot, listSlots } from '../save.js'
import { aL, ntf } from '../ui.js'
import { onboardingState, shouldShowOnboarding } from '../../../shared/utils/onboarding.js'

// Manual save slots — write the current game to a slot or load another (R: save slots).
export function saveGameSlot(n) {
  if (saveToSlot(n)) { aL(`Game saved to slot ${n}.`, 'good'); if (window.upUI) window.upUI() }
  else ntf(t('toast.dash.saveFailed'))
}

function _saveSlotsCard() {
  const slots = listSlots()
  return `<div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:10px 12px;margin-bottom:12px">
    <div style="font-size:var(--fs-small);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px">💾 Save Slots</div>
    ${slots.map(s => {
      const m = s.meta
      const when = m ? new Date(m.savedAt).toLocaleDateString() : null
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="font-size:var(--fs-body);color:var(--text-dim);width:14px">${s.n}</span>
        <span style="flex:1;font-size:var(--fs-small);color:${m ? 'var(--text-hi)' : 'var(--text-faint)'}">${m ? `${m.vIcon || ''} ${m.vName} — Y${m.year} · ${m.prestige || 'D'}-tier · ${when}` : 'Empty slot'}</span>
        <button class="gb" style="font-size:var(--fs-micro);padding:2px 7px" onclick="saveGameSlot(${s.n})">Save</button>
        ${m ? `<button class="gb" style="font-size:var(--fs-micro);padding:2px 7px;border-color:var(--green);color:var(--green)" onclick="if(confirm('Load slot ${s.n}? Unsaved progress is lost.'))restoreSlot(${s.n})">Load</button>` : ''}
      </div>`
    }).join('')}
  </div>`
}

// Compact populace-support strip (R27) — civilian mood + its gate-revenue effect.
function _populaceStrip() {
  const sup = G.populace?.support
  if (sup == null) return ''
  const tier = supportTier(sup)
  const mult = revenueMult(sup)
  return `<div class="strip" title="Civilian support shifts gate revenue and can spark festivals or unrest">
    <span style="font-size:var(--fs-lead)">🎏</span>
    <span style="font-size:var(--fs-body);color:${tier.color};font-weight:bold">Populace: ${tier.label}</span>
    <div style="flex:1;max-width:160px;background:var(--bg);height:5px;border-radius:3px;overflow:hidden"><div style="height:5px;width:${Math.round(sup)}%;background:${tier.color}"></div></div>
    <span style="font-size:var(--fs-small);color:var(--text-dim);margin-left:auto">Gate revenue ${mult > 1 ? '+' : ''}${Math.round((mult - 1) * 100)}%</span>
  </div>`
}

// Compact Warden progression strip (clickable → Warden Path screen).
function _kageStrip() {
  const k = G.kageDev
  if (!k) return ''
  const xpNext = xpForLevel(k.level)
  const xpPct = Math.min(100, Math.round((k.xp / xpNext) * 100))
  const path = k.path ? PATH_BY_ID[k.path] : null
  return `<div class="strip" onclick="sp('kagedev')" title="Open Warden Path" style="cursor:pointer">
    <span style="font-size:var(--fs-lead);color:var(--accent);font-weight:bold">${G.kName || 'Warden'}</span>
    <span style="font-size:var(--fs-small);color:var(--text-dim)">Lvl ${k.level}${path ? ` · ${path.icon} ${path.n}` : ' · no path chosen'}</span>
    <div style="flex:1;max-width:160px;background:var(--bg);height:5px;border-radius:3px;overflow:hidden"><div style="height:5px;width:${xpPct}%;background:var(--accent)"></div></div>
    <span style="font-size:var(--fs-micro);color:var(--text-faint);font-family:var(--font-num,'Courier New',monospace)">${k.xp}/${xpNext} XP</span>
    ${k.points > 0 ? `<span style="font-size:var(--fs-small);color:var(--green);margin-left:auto">● ${k.points} point${k.points !== 1 ? 's' : ''} to spend ▸</span>` : '<span style="font-size:var(--fs-small);color:var(--text-faint);margin-left:auto">Warden Path ▸</span>'}
  </div>`
}

// P2 turn loop — Home surfaces the top pending decisions with a route to resolve.
function _decisionDigest() {
  const blocking = !!G.pendingChoiceEvent || !!G.pendingQuickDecision || G.examActive || G.warActive
  const items = getInboxDigest(4)
  const n = getInboxCount()
  if (!items.length && !blocking) {
    return `<div class="hd-digest is-clear"><div class="hd-digest-h">${t('digest.clearTitle')}</div>
      <div style="font-size:var(--fs-body);color:var(--text-dim)">${t('digest.clearSub')}</div></div>`
  }
  const blockRow = blocking
    ? `<div class="hd-item"><span class="hd-item-ico">⛔</span><span class="hd-item-t" style="color:var(--red)">${G.examActive ? t('digest.examInProgress') : G.warActive ? t('digest.warInProgress') : t('digest.fieldDecision')}</span><button class="hd-item-go" onclick="sp('${G.examActive || G.warActive ? 'exam' : 'inbox'}')">${t('digest.resolve')}</button></div>`
    : ''
  return `<div class="hd-digest">
    <div class="hd-digest-h">${t('digest.header')} <span style="color:var(--text-dim)">— ${n}</span></div>
    ${blockRow}
    ${items.map(it => `<div class="hd-item">
      <span class="hd-item-ico">${it.icon || '•'}</span>
      <span class="hd-item-t">${it.title}</span>
      <button class="hd-item-go" onclick="sp('inbox')">${t('digest.go')}</button>
    </div>`).join('')}
  </div>`
}

/**
 * First-year guidance, grouped into three phases.
 *
 * The previous version disappeared at month 4 — before the player had ever met
 * the council mandates that can dismiss them in December. This runs the whole
 * first year, and the phase the player is currently working through is opened
 * while the others collapse to a progress count, so a ten-step list doesn't
 * read as a wall on turn one.
 */
function _onboardingCard() {
  if (!shouldShowOnboarding(G)) return ''
  const st = onboardingState(G)
  const activePhase = st.next ? st.next.phase : null

  const row = s => `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-dim)">
      <span style="color:${s.ok ? 'var(--green)' : 'var(--text-faint)'};min-width:1.2em;margin-top:1px">${s.ok ? '✓' : '○'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--fs-body);color:${s.ok ? 'var(--text-dim)' : 'var(--text-hi)'};text-decoration:${s.ok ? 'line-through' : 'none'}">${s.label}</div>
        ${!s.ok ? `<div style="font-size:var(--fs-micro);color:var(--text-dim);margin-top:2px;line-height:1.5">${s.hint}</div>` : ''}
      </div>
      ${!s.ok ? `<button class="gb" style="font-size:var(--fs-micro);padding:2px 8px;white-space:nowrap" onclick="sp('${s.panel}')">Open ▸</button>` : ''}
    </div>`

  const phase = p => {
    const open = p.id === activePhase
    return `<div style="margin-bottom:${open ? 'var(--sp-3)' : 'var(--sp-1)'}">
      <div style="display:flex;align-items:baseline;gap:8px">
        <span style="font-size:var(--fs-micro);letter-spacing:var(--ls-caps);text-transform:uppercase;color:${open ? 'var(--accent)' : 'var(--text-dim)'}">${p.label}</span>
        <span style="font-size:var(--fs-micro);color:var(--text-faint)">${p.done}/${p.total}</span>
      </div>
      ${open ? `<div style="font-size:var(--fs-micro);color:var(--text-dim);margin:2px 0 4px;font-style:italic">${p.blurb}</div>
        ${p.steps.map(row).join('')}` : ''}
    </div>`
  }

  return `<div class="surf" style="background:var(--surface);border:1px solid var(--border);border-left:2px solid var(--accent);padding:var(--sp-3);margin-bottom:var(--sp-3)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-2)">
      <div style="font-size:var(--fs-micro);letter-spacing:var(--ls-caps);color:var(--accent);text-transform:uppercase">Your First Year — ${st.done}/${st.total}</div>
      <button class="gb" style="font-size:var(--fs-micro);padding:2px 8px" onclick="dismissOnboarding()">Dismiss</button>
    </div>
    ${st.byPhase.map(phase).join('')}
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
  // Adept exam
  const nextExam = G.month <= 4 ? { m: 4, label: 'Adept Exam', tag: 'EXAM' }
                 : G.month <= 10 ? { m: 10, label: 'Adept Exam', tag: 'EXAM' }
                 : { m: 4, label: 'Adept Exam (next year)', tag: 'EXAM', nextYear: true }
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
    <div class="pt">${t('dash.title', { year: G.year, month: G.month })}</div>

    ${_kageStrip()}
    ${_populaceStrip()}
    ${_decisionDigest()}

    ${G._ff_nationHud ? `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      <span style="font-size:var(--fs-small);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">${t('dash.nation')}</span>
      ${Object.entries(NATIONS).map(([id, n]) => `
        <button onclick="setNation('${id}')" style="font-size:var(--fs-small);padding:3px 9px;cursor:pointer;background:${G.nationId === id ? n.accent : 'transparent'};color:${G.nationId === id ? '#0d0d0f' : n.accent};border:1px solid ${n.accent}">${n.crest} ${n.name}${G._a11yColorblind ? ' ·' + n.pattern : ''}</button>`).join('')}
      <button onclick="toggleColorblind()" title="Colorblind mode: show pattern tags" style="font-size:var(--fs-small);padding:3px 9px;cursor:pointer;background:transparent;color:var(--text-dim);border:1px solid var(--border)">${G._a11yColorblind ? '◑ CB on' : '◐ CB'}</button>
      ${G.nationId ? (() => { const m = nationMods(G.nationId); const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%'; const parts = [m.successMod !== 0 && `${pct(m.successMod)} success`, m.ryoMod !== 0 && `${pct(m.ryoMod)} income`].filter(Boolean); return `<span style="font-size:var(--fs-small);color:var(--text-dim)">${parts.length ? parts.join(' · ') : '— no stat bonus'}</span>` })() : '<span style="font-size:var(--fs-small);color:var(--text-dim)">— pick a nation for bonuses</span>'}
    </div>` : ''}

    <!-- Tactics quick-bar -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      <span style="font-size:var(--fs-micro);color:var(--text-faint);text-transform:uppercase;letter-spacing:1px;margin-right:2px">${t('dash.stance')}</span>
      ${[['aggressive','⚔','var(--gold)','suc +8% kia +4%'],['balanced','⚖','var(--green)','default'],['defensive','🛡','var(--blue)','suc −6% kia −3%']].map(([id,icon,col,hint]) =>
        `<button onclick="setMissionPrep('${id}')" style="font-size:var(--fs-small);padding:3px 10px;cursor:pointer;border:1px solid ${G.missionPrep===id ? col : 'var(--border-hi)'};background:${G.missionPrep===id ? col+'22' : 'transparent'};color:${G.missionPrep===id ? col : 'var(--text-dim)'}">${icon} ${id.charAt(0).toUpperCase()+id.slice(1)}<span style="font-size:var(--fs-micro);color:var(--text-faint);margin-left:4px">${hint}</span></button>`
      ).join('')}
      ${G.citizenMorale !== undefined ? `<span style="font-size:var(--fs-small);color:var(--text-dim);margin-left:8px">Citizens <b style="color:${G.citizenMorale>=70?'var(--green)':G.citizenMorale>=40?'var(--orange)':'var(--red)'}">${G.citizenMorale}%</b></span>` : ''}
      ${G.isOffSeason ? `<span style="font-size:var(--fs-small);color:var(--gold);margin-left:8px">⛄ Off-season</span>` : ''}
    </div>

    <!-- Health snapshot -->
    <div class="dash-grid">
      <div class="dash-card ${G.ryo < 5000 ? 'alert' : G.ryo > 50000 ? 'good' : ''}">
        <div class="dash-card-title">${t('card.treasury')}</div>
        <div class="dash-stat" style="color:${financeColor}">${fmt(G.ryo)}</div>
        <div class="dash-stat-sub" style="color:${monthlyNet >= 0 ? 'var(--green)' : 'var(--red)'}">
          ${monthlyNet >= 0 ? '+' : ''}${fmt(monthlyNet)} ${t('dash.perMonth')}
        </div>
        ${(() => {
          // Runway — the single most useful number for a new GM: how many months the
          // treasury lasts at the current burn. Only shown when the deficit is steep
          // enough to actually matter (< 24mo); a near-break-even drain isn't a warning.
          if (monthlyNet >= 0) return ''
          const months = Math.floor(G.ryo / -monthlyNet)
          if (months >= 24) return ''
          const col = months < 3 ? 'var(--red)' : months < 6 ? 'var(--orange)' : 'var(--text-dim)'
          return `<div class="dash-stat-sub" style="margin-top:2px;color:${col}">~${months} mo runway · missions extend it</div>`
        })()}
        <div class="dash-stat-sub" style="margin-top:3px;text-transform:uppercase;font-size:var(--fs-micro);letter-spacing:1px;color:${financeColor}">${financeHealth}</div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">${t('card.rosterDepth')}</div>
        <div class="dash-stat">${G.shinobi.length}</div>
        <div class="dash-stat-sub">
          <span style="color:var(--green)">${available} available</span> ·
          <span style="color:var(--orange)">${onMission} deployed</span> ·
          <span style="color:var(--red)">${injured} injured</span>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;font-size:var(--fs-small);flex-wrap:wrap">
          ${['G','C','J','A','S'].map((r,i) => `<span style="color:var(--text-dim)">${r}: <b style="color:var(--text)">${byRank[i]}</b></span>`).join('')}
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">${t('card.academy')}</div>
        <div class="dash-stat">${(G.intakeClass || []).length}</div>
        <div class="dash-stat-sub">${t('card.academy.students')}</div>
        <div class="dash-stat-sub" style="margin-top:3px">
          ${t('card.academy.prospects', { n: (G.prospects || []).length })}
        </div>
      </div>

      <div class="dash-card ${injured > 3 ? 'alert' : ''}">
        <div class="dash-card-title">${t('card.morale')}</div>
        <div class="dash-stat" style="color:${(G.morale||75)>=70?'var(--green)':(G.morale||75)>=45?'var(--gold)':'var(--red)'}">${G.morale || 75}</div>
        <div class="dash-stat-sub">Reputation: ${G.reputation} · Prestige: ${G.prestigeTier || 'D'}</div>
        <div class="dash-stat-sub" style="margin-top:3px">Legend: ${G.legend || 0}${G._moraleFloor ? ` · Floor: ${G._moraleFloor}` : ''}</div>
      </div>

      <div class="dash-card">
        <div class="dash-card-title">${t('card.social')}</div>
        <div class="dash-stat" style="color:${(G.citizenMorale||60)>=70?'var(--green)':(G.citizenMorale||60)>=40?'var(--gold)':'var(--red)'}">${G.citizenMorale || 60}<span style="font-size:var(--fs-body);color:var(--text-faint)">%</span></div>
        <div class="dash-stat-sub">Citizens · Rev ×${((G._citizenRevMult||1)).toFixed(2)}</div>
        <div class="dash-stat-sub" style="margin-top:3px">Alumni: ${(G.alumni||[]).length} · Sponsor: ${G.sponsorship ? G.sponsorship.n.slice(0,12) : 'none'}</div>
      </div>
    </div>

    <!-- Two-column layout: alerts + calendar -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">

      <!-- At-risk alerts -->
      <div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:13px">
        <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">${t('section.alerts')}</div>
        ${alerts.length === 0
          ? `<div style="font-size:var(--fs-body);color:var(--text-dim);padding:6px 0">${t('section.alerts.none')}</div>`
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
      <div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:13px">
        <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">${t('section.events')}</div>
        ${calendar.slice(0,6).map(e => `
          <div class="cal-item">
            <div class="cal-date">${MONTH_NAMES[(e.m-1)%12]}</div>
            <div class="cal-event">${e.label}</div>
            <div class="cal-tag">${e.tag}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Monthly summary -->
    <div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:13px;margin-bottom:12px">
      <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">${t('section.lastMonth')}</div>
      ${recentLog.length === 0
        ? `<div style="font-size:var(--fs-body);color:var(--text-dim)">${t('section.lastMonth.none')}</div>`
        : recentLog.map(e => {
            const col = e.t === 'good' ? 'var(--green)' : e.t === 'bad' ? 'var(--red)' : e.t === 'warn' ? 'var(--orange)' : 'var(--text-dim)'
            return `<div style="padding:4px 0;border-bottom:1px solid var(--border-dim);font-size:var(--fs-body);color:${col}">${e.msg}</div>`
          }).join('')
      }
    </div>

    <!-- Active world events -->
    ${activeEvents.length > 0 ? `
    <div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:13px;margin-bottom:12px">
      <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">${t('section.worldEvents')}</div>
      ${activeEvents.map(n => `
        <div style="padding:5px 0;border-bottom:1px solid var(--border-dim);font-size:var(--fs-body);color:var(--blue)">${n.text || n.msg || ''}</div>
      `).join('')}
    </div>` : ''}

    ${_onboardingCard()}

    ${_saveSlotsCard()}
  `
}
