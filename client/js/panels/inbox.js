import { G, fmt } from '../state.js'
import { sp } from '../ui.js'

// Priority: urgent > standard > info
const PRIORITY = { urgent: 0, standard: 1, info: 2 }

let _activeTab = 'active'
let _activeFilter = 'all'

export function inboxTab(tab) { _activeTab = tab; rInbox() }
export function inboxFilter(cat) { _activeFilter = cat; rInbox() }

/** Build a unified inbox item list from all G state sources. */
function buildItems() {
  const items = []

  // ── People management meetings ────────────────────────────────────────
  ;(G.meetingQueue || []).forEach(m => {
    items.push({
      id:       'meet_' + m.id,
      priority: 'standard',
      cat:      'People',
      icon:     '🤝',
      title:    m.title || 'Meeting Request',
      desc:     m.desc  || m.body || '',
      actions:  [{ label: 'View', fn: `sp('meetings')` }],
      archived: false,
    })
  })

  // ── Pending legacy decision ───────────────────────────────────────────
  if (G.legacyDecisionPending) {
    items.push({
      id:       'legacy_decision',
      priority: 'urgent',
      cat:      'Village',
      icon:     '📜',
      title:    G.legacyDecisionPending.n || 'Legacy Decision Pending',
      desc:     G.legacyDecisionPending.desc || 'A major decision awaits your judgement.',
      actions:  [{ label: 'View Legacy', fn: `sp('legacy')` }],
      archived: false,
    })
  }

  // ── Summit bloc offer ─────────────────────────────────────────────────
  if (G.summitBlocOffer) {
    items.push({
      id:       'summit_bloc',
      priority: 'urgent',
      cat:      'Diplomacy',
      icon:     '🤝',
      title:    `Summit Bloc — ${G.summitBlocOffer.villageName}`,
      desc:     `${G.summitBlocOffer.villageName} proposes a voting bloc for the upcoming summit. Agenda: ${G.summitBlocOffer.agendaItem || 'undisclosed'}.`,
      actions:  [{ label: 'View Exam', fn: `sp('exam')` }],
      archived: false,
    })
  }

  // ── Staff poach offer ─────────────────────────────────────────────────
  if (G.staffPoachOffer) {
    const offer = G.staffPoachOffer
    items.push({
      id:       'staff_poach',
      priority: 'urgent',
      cat:      'Staff',
      icon:     '🎯',
      title:    `Poach Offer — Staff Member`,
      desc:     `A rival village is offering ${fmt(offer.salary || 0)} ryo/month to your staff.`,
      actions:  [{ label: 'View Staff', fn: `sp('staff')` }],
      archived: false,
    })
  }

  // ── Emergency recruit window ──────────────────────────────────────────
  if (G.emergencyRecruitWindow) {
    items.push({
      id:       'emerg_recruit',
      priority: 'urgent',
      cat:      'Roster',
      icon:     '🆘',
      title:    'Emergency Recruitment Window Open',
      desc:     'Critical shinobi shortage detected. Emergency signings are available this month.',
      actions:  [{ label: 'Transfer Market', fn: `sp('transfers')` }],
      archived: false,
    })
  }

  // ── Low commitment warnings ───────────────────────────────────────────
  ;(G.shinobi || []).filter(s => (s.commitmentScore || 50) < 30).forEach(s => {
    items.push({
      id:       'commit_' + s.id,
      priority: 'urgent',
      cat:      'Roster',
      icon:     '⚠',
      title:    `${s.fn} ${s.ln} — Critical Commitment`,
      desc:     `Commitment score: ${s.commitmentScore}. At risk of requesting a transfer.`,
      actions:  [{ label: 'View Roster', fn: `sp('roster')` }],
      archived: false,
    })
  })

  // ── Injured shinobi ───────────────────────────────────────────────────
  ;(G.shinobi || []).filter(s => s.status === 'injured' && s.injuryMonths > 2).forEach(s => {
    items.push({
      id:       'injury_' + s.id,
      priority: 'standard',
      cat:      'Injuries',
      icon:     '🏥',
      title:    `${s.fn} ${s.ln} — Long-term Injury`,
      desc:     `Expected return: ${s.injuryMonths} month${s.injuryMonths !== 1 ? 's' : ''} remaining.`,
      actions:  [{ label: 'View Roster', fn: `sp('roster')` }],
      archived: false,
    })
  })

  // ── Prospect aging out ────────────────────────────────────────────────
  ;(G.prospects || []).filter(p => (p.age || 0) >= 16).forEach(p => {
    items.push({
      id:       'age_' + p.id,
      priority: 'urgent',
      cat:      'Academy',
      icon:     '⏳',
      title:    `${p.fn} ${p.ln} — Aging Out`,
      desc:     `This prospect is ${p.age} years old. Recruit or lose them permanently.`,
      actions:  [{ label: 'View Prospects', fn: `sp('academy')` }],
      archived: false,
    })
  })

  // ── Noticeboard items ─────────────────────────────────────────────────
  ;(G.noticeboard || []).filter(n => !n.dismissed).forEach(n => {
    items.push({
      id:       'notice_' + (n.id || Math.random()),
      priority: n.priority || 'info',
      cat:      n.cat || 'Info',
      icon:     n.icon || 'ℹ',
      title:    n.title || 'Notice',
      desc:     n.body || n.text || '',
      actions:  [],
      archived: false,
    })
  })

  // ── Academy students graduating soon ─────────────────────────────────
  ;(G.intakeClass || []).filter(s => (s.monthsEnrolled || 0) >= 10).forEach(s => {
    items.push({
      id:       'grad_' + s.id,
      priority: 'info',
      cat:      'Academy',
      icon:     '🎓',
      title:    `${s.fn} ${s.ln} — Graduating Soon`,
      desc:     `${12 - (s.monthsEnrolled || 0)} month(s) until graduation into the prospect pool.`,
      actions:  [{ label: 'Youth Academy', fn: `sp('youthacademy')` }],
      archived: false,
    })
  })

  // Sort by priority
  items.sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority])
  return items
}

export function getInboxCount() {
  return buildItems().filter(i => !i.archived && i.priority !== 'info').length
}

export function rInbox() {
  const el = document.getElementById('p-inbox')
  if (!el) return

  const all    = buildItems()
  const active = all.filter(i => !i.archived)
  const cats   = ['all', ...new Set(active.map(i => i.cat))]

  const filtered = active.filter(i => _activeFilter === 'all' || i.cat === _activeFilter)
  const urgentCount   = filtered.filter(i => i.priority === 'urgent').length
  const standardCount = filtered.filter(i => i.priority === 'standard').length
  const infoCount     = filtered.filter(i => i.priority === 'info').length

  el.innerHTML = `
    <div class="pt">Inbox</div>

    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
      ${cats.map(c => `
        <button class="tab${_activeFilter === c ? ' active' : ''}" style="padding:5px 10px;font-size:8px" onclick="inboxFilter('${c}')">
          ${c === 'all' ? 'All (' + filtered.length + ')' : c}
        </button>
      `).join('')}
    </div>

    ${urgentCount > 0 ? `
      <div style="font-size:7px;letter-spacing:2px;color:var(--red);text-transform:uppercase;margin-bottom:7px;display:flex;align-items:center;gap:6px">
        <span>⚠</span> Urgent (${urgentCount})
      </div>
      ${filtered.filter(i => i.priority === 'urgent').map(item => renderItem(item)).join('')}
    ` : ''}

    ${standardCount > 0 ? `
      <div style="font-size:7px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin:${urgentCount > 0 ? '14px 0 7px' : '0 0 7px'};display:flex;align-items:center;gap:6px">
        Standard (${standardCount})
      </div>
      ${filtered.filter(i => i.priority === 'standard').map(item => renderItem(item)).join('')}
    ` : ''}

    ${infoCount > 0 ? `
      <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin:${urgentCount + standardCount > 0 ? '14px 0 7px' : '0 0 7px'}">
        Info (${infoCount})
      </div>
      ${filtered.filter(i => i.priority === 'info').map(item => renderItem(item)).join('')}
    ` : ''}

    ${filtered.length === 0 ? `
      <div style="text-align:center;padding:40px 0;color:var(--text-dim);font-size:10px">
        <div style="font-size:28px;margin-bottom:8px">📬</div>
        Inbox clear — no pending items.
      </div>
    ` : ''}
  `
}

function renderItem(item) {
  const borderCol = item.priority === 'urgent' ? 'var(--red)' : item.priority === 'standard' ? 'var(--gold)' : 'var(--border)'
  return `
    <div class="inbox-item ${item.priority}" style="border-left-color:${borderCol}">
      <div class="inbox-header">
        <span style="font-size:14px">${item.icon}</span>
        <span class="inbox-title">${item.title}</span>
        <span class="inbox-cat">${item.cat}</span>
      </div>
      ${item.desc ? `<div class="inbox-desc">${item.desc}</div>` : ''}
      ${item.actions.length > 0 ? `
        <div class="inbox-actions">
          ${item.actions.map(a => `<button class="gb" style="font-size:8px;margin-top:0;padding:3px 9px" onclick="${a.fn}">${a.label} ▸</button>`).join('')}
        </div>` : ''}
    </div>
  `
}
