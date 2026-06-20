import { G, fmt } from '../state.js'
import { sp } from '../ui.js'
import { WE_BY_ID } from '../../../shared/constants/worldCalendar.js'
import { sortedThreads } from '../../../shared/utils/narrativeThreads.js'
import { TONE_BY_ID } from '../../../shared/utils/pressConference.js'

// Priority: urgent > standard > info
const PRIORITY = { urgent: 0, standard: 1, info: 2 }

let _activeTab = 'active'
let _activeFilter = 'all'
let _expandedThreadIds = new Set()

export function inboxTab(tab) { _activeTab = tab; rInbox() }
export function inboxFilter(cat) { _activeFilter = cat; rInbox() }
export function toggleThread(id) { _expandedThreadIds.has(id) ? _expandedThreadIds.delete(id) : _expandedThreadIds.add(id); rInbox() }

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
  ;(G.shinobi || []).filter(s => (s.commitment ?? 50) < 30).forEach(s => {
    items.push({
      id:       'commit_' + s.id,
      priority: 'urgent',
      cat:      'Roster',
      icon:     '⚠',
      title:    `${s.fn} ${s.ln} — Critical Commitment`,
      desc:     `Commitment: ${s.commitment ?? 50}. At risk of requesting a transfer.`,
      actions:  [{ label: 'View Roster', fn: `sp('roster')` }],
      archived: false,
    })
  })

  // ── Injured shinobi ───────────────────────────────────────────────────
  ;(G.shinobi || []).filter(s => s.status === 'injured' && (s.injDays || 0) > 60).forEach(s => {
    const months = Math.ceil((s.injDays || 0) / 30)
    items.push({
      id:       'injury_' + s.id,
      priority: 'standard',
      cat:      'Injuries',
      icon:     '🏥',
      title:    `${s.fn} ${s.ln} — Long-term Injury`,
      desc:     `Expected return: ~${months} month${months !== 1 ? 's' : ''} remaining.`,
      actions:  [{ label: 'View Dossier', fn: `oDos('${s.id}')` }],
      archived: false,
    })
  })

  // ── Bond formed events (support events — FE/DD alignment) ────────────
  ;(G.shinobi || []).forEach(s => {
    (s.bonds || []).forEach(bond => {
      if (!bond.formed) return
      const monthsAgo = (G.year - bond.formed.year) * 12 + (G.month - bond.formed.month)
      if (monthsAgo > 1) return  // only surface bonds from this month or last
      const partner = (G.shinobi || []).find(o => o.id === bond.otherId)
      if (!partner) return
      if (s.id > bond.otherId) return  // deduplicate — only emit once per pair
      const icons = { 'Brothers-in-Arms': '⚔', 'Mentor/Student': '📖', 'Rivals': '🔥', 'Battle-Scarred': '🩸' }
      const flavors = {
        'Brothers-in-Arms': "They've bled together. The bond goes beyond duty now.",
        'Mentor/Student': `${s.fn} is showing ${partner.fn} the ropes. A quiet investment in the next generation.`,
        'Rivals': "The rivalry is fierce, but it's making both of them sharper.",
        'Battle-Scarred': 'A shared near-death forged something neither of them expected.',
      }
      items.push({
        id:       `bond_${s.id}_${bond.otherId}`,
        priority: 'info',
        cat:      'Bonds',
        icon:     icons[bond.type] || '🤝',
        title:    `${s.fn} ${s.ln} & ${partner.fn} ${partner.ln} — ${bond.type}`,
        desc:     flavors[bond.type] || `A ${bond.type} bond has formed between these two.`,
        actions:  [
          { label: 'View ' + s.fn, fn: `oDos('${s.id}')` },
          { label: 'View ' + partner.fn, fn: `oDos('${partner.id}')` },
        ],
        archived: false,
      })
    })
  })

  // ── Active trauma events ──────────────────────────────────────────────
  ;(G.shinobi || []).filter(s => s.traumaStatus && (s.traumaMonths || 0) > 0).forEach(s => {
    items.push({
      id:       'trauma_' + s.id,
      priority: 'standard',
      cat:      'Trauma',
      icon:     '🌑',
      title:    `${s.fn} ${s.ln} — Psychological Trauma`,
      desc:     `Status: ${s.traumaStatus}. ${s.traumaMonths} month${s.traumaMonths !== 1 ? 's' : ''} remaining. Consider a rest month or counselling.`,
      actions:  [{ label: 'View Dossier', fn: `oDos('${s.id}')` }],
      archived: false,
    })
  })

  // ── Retirement eligible ───────────────────────────────────────────────
  ;(G.shinobi || []).filter(s => s.retirementOffered).forEach(s => {
    items.push({
      id:       'retire_' + s.id,
      priority: 'standard',
      cat:      'People',
      icon:     '🎖',
      title:    `${s.fn} ${s.ln} — Retirement Decision`,
      desc:     `Age ${s.age}, ${s.phase} phase. Decline penalty: ${Math.round((s.declineMod || 0) * 100)}%. Decide their next chapter.`,
      actions:  [
        { label: 'View Dossier', fn: `oDos('${s.id}')` },
        { label: 'Retire Honourably', fn: `confirm('Retire ${s.fn} ${s.ln} permanently?') && retireShinobi('${s.id}')` },
        { label: 'Move to Staff', fn: `confirm('Move ${s.fn} ${s.ln} to coaching staff?') && retireToCoach('${s.id}')` },
      ],
      archived: false,
    })
  })

  // ── Scout poach offers ────────────────────────────────────────────────
  ;(G.staff || []).filter(s => s.poachOffer).forEach(s => {
    const offer = s.poachOffer
    items.push({
      id:       'poach_' + s.id,
      priority: 'urgent',
      cat:      'Staff',
      icon:     '🕵',
      title:    `${s.fn} ${s.ln} — Poach Attempt`,
      desc:     `${offer.village} is trying to recruit your scout. Pay ${offer.retentionCost.toLocaleString()} ryo retention bonus or lose them. Expires Y${offer.expiresYear}·M${offer.expiresMonth}.`,
      actions:  [
        { label: `Retain — ${offer.retentionCost.toLocaleString()} ryo`, fn: `retainScout('${s.id}')` },
        { label: 'Let go', fn: `dismissScout('${s.id}')` },
      ],
      archived: false,
    })
  })

  // ── Active rival signing offers ───────────────────────────────────────
  ;(G.prospects || []).filter(p => p.rivalOffer).forEach(p => {
    const offer = p.rivalOffer
    items.push({
      id:       'rival_offer_' + p.id,
      priority: 'urgent',
      cat:      'Academy',
      icon:     '⚔',
      title:    `${p.fn} ${p.ln} — ${offer.village} Offer`,
      desc:     `${offer.village} is offering ${offer.offerRyo.toLocaleString()} ryo. Expires Y${offer.expiresYear}·M${offer.expiresMonth}. Match, exceed, or let them go.`,
      actions:  [{ label: 'View Academy', fn: `sp('academy')` }],
      archived: false,
    })
  })

  // ── Scout-sourced prospects expiring soon ─────────────────────────────
  ;(G.prospects || []).filter(p => p.fromRegion && (p.urgencyMonths || 0) > 0 && (p.urgencyMonths || 0) <= 2).forEach(p => {
    items.push({
      id:       'urgprospect_' + p.id,
      priority: 'urgent',
      cat:      'Scouting',
      icon:     '🌑',
      title:    `${p.fn} ${p.ln} — Rival Interest Closing`,
      desc:     `Scout-sourced prospect from ${p.fromRegion || 'unknown region'}. Only ${p.urgencyMonths}m before a rival village moves. Confidence: ${p.scoutConfidence || '?'}%.`,
      actions:  [{ label: 'View Scouting', fn: `sp('scouting')` }],
      archived: false,
    })
  })

  // ── Prospect aging out ────────────────────────────────────────────────
  ;(G.prospects || []).filter(p => !p.fromRegion && (p.age || 0) >= 16).forEach(p => {
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

  // ── Career milestones ─────────────────────────────────────────────────
  ;(G.shinobi || []).filter(s => s._milestoneNotice).forEach(s => {
    items.push({
      id:       'milestone_' + s.id + '_' + s.wins,
      priority: 'info',
      cat:      'People',
      icon:     '🏆',
      title:    `${s.fn} ${s.ln} — ${s.wins} Mission${s.wins !== 1 ? 's' : ''} Completed`,
      desc:     s._milestoneNotice,
      actions:  [{ label: 'View Dossier', fn: `oDos('${s.id}')` }],
      archived: false,
    })
  })

  // ── Noticeboard items ─────────────────────────────────────────────────
  ;(G.noticeboard || []).filter(n => !n.dismissed).forEach(n => {
    const retireActions = n.type === 'retirement' && n.shinobiId ? [
      { label: 'View Dossier',   fn: `oDos('${n.shinobiId}')` },
      { label: 'Retire',         fn: `confirm('Retire this shinobi permanently?') && retireShinobi('${n.shinobiId}')` },
      { label: 'Move to Staff',  fn: `confirm('Move this shinobi to coaching staff?') && retireToCoach('${n.shinobiId}')` },
    ] : []
    items.push({
      id:       'notice_' + (n.id || n.shinobiId || Math.random()),
      priority: n.type === 'retirement' ? 'standard' : (n.priority || 'info'),
      cat:      n.type === 'retirement' ? 'People' : (n.cat || 'Info'),
      icon:     n.type === 'retirement' ? '🎖' : (n.icon || 'ℹ'),
      title:    n.title || (n.type === 'retirement' ? 'Retirement Notice' : 'Notice'),
      desc:     n.body || n.text || '',
      actions:  retireActions,
      archived: false,
    })
  })

  // ── Academy students graduating soon ─────────────────────────────────
  ;(G.intakeClass || []).filter(s => (s.monthsInClass || 0) >= 10).forEach(s => {
    items.push({
      id:       'grad_' + s.id,
      priority: 'info',
      cat:      'Academy',
      icon:     '🎓',
      title:    `${s.fn} ${s.ln} — Graduating Soon`,
      desc:     `${12 - (s.monthsInClass || 0)} month(s) until graduation into the prospect pool.`,
      actions:  [{ label: 'Youth Academy', fn: `sp('youthacademy')` }],
      archived: false,
    })
  })

  // ── World Calendar active event ───────────────────────────────────────
  if (G.worldCalendar?.activeEvent) {
    const evDef = WE_BY_ID[G.worldCalendar.activeEvent.eventId]
    if (evDef) {
      items.push({
        id:       'world_event_' + evDef.id,
        priority: 'urgent',
        cat:      'World',
        icon:     evDef.icon || '🌍',
        title:    evDef.name + ' — Choose a Response',
        desc:     evDef.desc,
        actions:  [{ label: 'Open Calendar', fn: `sp('calendar')` }],
        archived: false,
      })
    }
  }

  // ── Council proposals ─────────────────────────────────────────────────
  if (G.councilProposal) {
    const prop = G.councilProposal
    items.push({
      id: 'council_' + prop.id,
      priority: 'urgent',
      cat: 'Council',
      icon: '🏛',
      title: `Council Proposal: ${prop.n}`,
      desc: prop.desc,
      actions: [
        { label: '✓ Approve', fn: `resolveCouncilProposal('yes')` },
        { label: '✗ Decline', fn: `resolveCouncilProposal('no')` },
      ],
      archived: false,
    })
  }

  // ── Press conference ───────────────────────────────────────────────────
  if (G.pendingPress) {
    const p = G.pendingPress
    const availTones = (p.availableTones || ['confident', 'humble', 'dismissive']).map(id => TONE_BY_ID[id]).filter(Boolean)
    // For callout tone: need a rival name — use stored one or let player pick
    const villages  = (G.villages || []).map(v => v.n)
    const calloutVillage = p.rivalName || villages[0] || ''
    const pressActions = availTones.map(tone => ({
      label: tone.label + (tone.hint ? ` — ${tone.hint}` : ''),
      fn: tone.id === 'callout'
        ? `resolvePressConference('callout','${calloutVillage}')`
        : `resolvePressConference('${tone.id}')`,
    }))
    const calloutNote = availTones.some(t => t.id === 'callout') && calloutVillage
      ? `<div style="font-size:7px;color:#f0a030;margin-top:4px">Callout target: <b>${calloutVillage}</b></div>`
      : ''
    const followUpHtml = p.followUp
      ? `<div style="margin-top:8px;font-size:8px;color:#7a7060;border-left:2px solid #3a3630;padding-left:8px;font-style:italic">Follow-up: "${p.followUp}"</div>`
      : ''
    items.push({
      id:       'press_' + p.id,
      priority: 'standard',
      cat:      'Media',
      icon:     '📰',
      title:    'Press Conference Request',
      desc:     (p.intro ? `<span style="color:#7a7060">${p.intro}</span><br><br>` : '') +
                `<em>"${p.question}"</em>${followUpHtml}${calloutNote}<br>Choose your response:`,
      actions:  pressActions,
      archived: false,
    })
  }

  // ── Narrative inbox (Pillars 1–3 blurbs) ─────────────────────────────────
  const TAG_ICONS = { success: '⚔', failure: '💥', kia: '🪦', injury: '🏥', transfer: '📜',
                      bond: '🤝', grudge: '⚡', promotion: '🎖', war: '🔥', exam: '🏟',
                      prestige: '✨', intel: '🕵', 'default': 'ℹ' }
  const TAG_CAT   = { success: 'Chronicle', failure: 'Chronicle', kia: 'Chronicle',
                      injury: 'Injuries', transfer: 'Transfers', bond: 'Bonds', grudge: 'Tensions',
                      promotion: 'People', war: 'Chronicle', exam: 'Chronicle',
                      prestige: 'Legacy', intel: 'Intel', 'default': 'Chronicle' }
  ;(G.narrativeInbox || []).filter(n => !n.dismissed).forEach(n => {
    // ── Mission complication ────────────────────────────────────────────
    if (n.type === 'complication') {
      const opts = (n.options || []).map(o => ({ label: o.label + (o.riskMod ? (o.riskMod > 0 ? ' ⚠' : ' ✓') : ''), fn: `resolveComplication('${n.id}','${o.id}')` }))
      items.push({ id: 'comp_' + n.id, priority: 'urgent', cat: 'Missions', icon: '⚔', title: n.title, desc: `<span style="color:#aaa;font-style:italic">${n.body}</span><br><span style="font-size:7px;color:#555">Y${n.year}·M${n.month}</span>`, actions: opts, archived: false })
      return
    }
    // ── Rival prospect bid ──────────────────────────────────────────────
    if (n.type === 'rival_bid') {
      items.push({ id: 'rvb_' + n.id, priority: 'urgent', cat: 'Academy', icon: '🏹', title: n.title, desc: `<span style="color:#aaa;font-style:italic">${n.body}</span><br><span style="font-size:7px;color:#555">Y${n.year}·M${n.month}</span>`, actions: [{ label: 'Block their approach', fn: `resolveRivalOffer('${n.id}',false)` }, { label: 'Let them sign', fn: `resolveRivalOffer('${n.id}',true)` }], archived: false })
      return
    }
    // ── Trade offer ────────────────────────────────────────────────────
    if (n.type === 'trade_offer') {
      items.push({ id: 'trd_' + n.id, priority: 'standard', cat: 'Transfers', icon: '📜', title: n.title, desc: `<span style="color:#aaa;font-style:italic">${n.body}</span><br><span style="font-size:7px;color:#555">Y${n.year}·M${n.month}</span>`, actions: [{ label: '✓ Accept trade', fn: `resolveRivalOffer('${n.id}',true)` }, { label: '✗ Decline', fn: `resolveRivalOffer('${n.id}',false)` }], archived: false })
      return
    }
    const icon = TAG_ICONS[n.tag] ?? TAG_ICONS.default
    const cat  = TAG_CAT[n.tag]  ?? TAG_CAT.default
    const actions = []
    if (n.link) actions.push({ label: 'Go →', fn: `sp('${n.link}')` })
    actions.push({ label: 'Dismiss', fn: `dismissNarrative('${n.id}')` })
    items.push({
      id:       'narr_' + n.id,
      priority: (n.tag === 'kia' || n.tag === 'grudge') ? 'standard' : 'info',
      cat,
      icon,
      title:    n.title,
      desc:     `<span style="color:#aaa;font-style:italic">${n.body}</span><br><span style="font-size:7px;color:#555">Y${n.year}·M${n.month}</span>`,
      actions,
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

  const threads = sortedThreads(G.narrativeThreads || [])
  const activeThreads = threads.filter(t => t.state === 'open' || t.state === 'escalating')
  const threadCount = activeThreads.length

  const all    = buildItems()
  const active = all.filter(i => !i.archived)
  const cats   = ['all', ...new Set(active.map(i => i.cat))]

  const filtered = active.filter(i => _activeFilter === 'all' || i.cat === _activeFilter)
  const urgentCount   = filtered.filter(i => i.priority === 'urgent').length
  const standardCount = filtered.filter(i => i.priority === 'standard').length
  const infoCount     = filtered.filter(i => i.priority === 'info').length

  const tabBar = `<div style="display:flex;gap:6px;margin-bottom:12px">
    <button class="tab${_activeTab !== 'threads' ? ' active' : ''}" style="padding:5px 10px;font-size:8px" onclick="inboxTab('active')">Inbox (${active.length})</button>
    <button class="tab${_activeTab === 'threads' ? ' active' : ''}" style="padding:5px 10px;font-size:8px" onclick="inboxTab('threads')">Story Threads${threadCount > 0 ? ' (' + threadCount + ')' : ''}</button>
  </div>`

  if (_activeTab === 'threads') {
    el.innerHTML = `<div class="pt">Inbox</div>${tabBar}${renderThreadsPanel(threads)}`
    return
  }

  el.innerHTML = `
    <div class="pt">Inbox</div>
    ${tabBar}

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

// ── Thread state metadata ─────────────────────────────────────────────────────
const THREAD_STATE_META = {
  open:       { label: 'Open',       color: '#87ceeb' },
  escalating: { label: 'Escalating', color: '#f0a030' },
  resolved:   { label: 'Resolved',   color: '#8fbc8f' },
  tragedy:    { label: 'Tragedy',    color: '#f66' },
}
const THREAD_TYPE_ICONS = {
  grudge: '⚡', bond: '🤝', rivalry: '⚔', redemption: '✨',
  kia_arc: '🪦', career: '🎖', faction: '🕵',
}

function renderThreadsPanel(threads) {
  if (!threads || threads.length === 0) {
    return `<div style="text-align:center;padding:40px 0;color:var(--text-dim);font-size:10px">
      <div style="font-size:28px;margin-bottom:8px">📖</div>
      No active story threads. Play missions to build them.
    </div>`
  }

  return threads.map(t => {
    const meta    = THREAD_STATE_META[t.state] || THREAD_STATE_META.open
    const icon    = THREAD_TYPE_ICONS[t.type] || 'ℹ'
    const expanded = _expandedThreadIds.has(t.id)
    const linkedBlurbs = (G.narrativeInbox || []).filter(n => n.threadId === t.id)
    const latestBlurb  = linkedBlurbs[linkedBlurbs.length - 1]

    const eventLines = expanded
      ? linkedBlurbs.map(n => `
          <div style="padding:5px 8px;border-left:2px solid #2a2a2a;margin-bottom:4px">
            <div style="font-size:8px;color:#b0a88a">${n.title}</div>
            <div style="font-size:8px;color:#7a7060;margin-top:2px">${n.body}</div>
            <div style="font-size:7px;color:#3a3630;margin-top:1px">Y${n.year}·M${n.month}</div>
          </div>`).join('')
      : ''

    return `<div style="border:1px solid #2a2a2a;border-left:3px solid ${meta.color};padding:10px 12px;margin-bottom:8px;background:#111">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:13px">${icon}</span>
          <span style="font-size:9px;color:#e8e0cc;font-weight:bold">${t.title}</span>
        </div>
        <span style="font-size:7px;color:${meta.color};text-transform:uppercase;letter-spacing:1px;padding:2px 6px;border:1px solid ${meta.color}44">${meta.label}</span>
      </div>
      <div style="display:flex;gap:12px;font-size:8px;color:#7a7060;margin-bottom:6px">
        <span>${t.events.length} event${t.events.length !== 1 ? 's' : ''}</span>
        <span>Since Y${t.openedYear}·M${t.openedMonth}</span>
        <span style="text-transform:capitalize">${t.type.replace('_', ' ')}</span>
      </div>
      ${latestBlurb && !expanded ? `<div style="font-size:8px;color:#7a7060;font-style:italic;margin-bottom:6px">${latestBlurb.body}</div>` : ''}
      ${expanded ? eventLines : ''}
      ${linkedBlurbs.length > 1 ? `
        <button class="gb" style="font-size:7px;padding:2px 8px;margin-top:4px" onclick="toggleThread('${t.id}')">
          ${expanded ? '▲ Collapse' : '▼ Show all ' + linkedBlurbs.length + ' events'}
        </button>` : ''}
    </div>`
  }).join('')
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
