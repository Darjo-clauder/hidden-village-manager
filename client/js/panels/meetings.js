import { G, sn, clamp, fmt, getLeadershipGroup, buildRelationshipWeb } from '../state.js'
import { MEETING_TYPES, RANKS, SERVICE_AWARDS, REVIEW_RESPONSES } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'

window._meetTab = 'overview'

export function rMeet() {
  const el = document.getElementById('meetl')
  if (!el) return
  const tabs = ['overview', 'web', 'rumors', 'board', 'awards']
  const tabLabels = { overview: 'Overview', web: 'Relationship Web', rumors: 'Rumors', board: 'Noticeboard', awards: 'Awards & Reviews' }
  const pendingBadge = (G.rumors||[]).filter(r=>!r.resolved).length + (G.serviceAwardQueue||[]).length + (G.reviewQueue||[]).length

  el.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      ${tabs.map(t => `<button onclick="meetTab('${t}')" style="background:${window._meetTab===t?'#2a2210':'#1a1a1a'};border:1px solid ${window._meetTab===t?'#c9a84c':'#333'};color:${window._meetTab===t?'#c9a84c':'#999'};border-radius:4px;padding:4px 10px;cursor:pointer;font-size:.78rem">${tabLabels[t]}${t==='awards'&&pendingBadge>0?' ('+pendingBadge+')':''}</button>`).join('')}
    </div>
    ${window._meetTab === 'overview' ? _overviewTab() :
      window._meetTab === 'web' ? _webTab() :
      window._meetTab === 'rumors' ? _rumorsTab() :
      window._meetTab === 'board' ? _boardTab() :
      _awardsTab()}
  `
}

export function meetTab(t) { window._meetTab = t; rMeet() }

// ── Overview tab (harmony, leadership, pending meetings, morale grid) ────────
function _overviewTab() {
  const queue = G.meetingQueue || []
  const harmony = G.harmonyScore ?? 70
  const harmonyColor = harmony >= 70 ? '#8fbc8f' : harmony >= 45 ? '#f0a030' : '#f66'
  const leaders = getLeadershipGroup()

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <!-- Dressing Room Harmony -->
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:12px">
        <div style="font-size:.8rem;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Dressing Room Harmony</div>
        <div style="font-size:2rem;color:${harmonyColor};font-weight:bold;margin-bottom:4px">${harmony}</div>
        <div style="background:#111;border-radius:3px;height:6px;overflow:hidden;margin-bottom:6px">
          <div style="background:${harmonyColor};width:${harmony}%;height:100%"></div>
        </div>
        <div style="font-size:.75rem;color:#666">
          ${harmony >= 70 ? '✓ Positive atmosphere — passive morale bonus active' :
            harmony >= 45 ? '⚠ Tension present — monitor carefully' :
            '✗ Crisis risk — harmony events may trigger'}
        </div>
      </div>
      <!-- Leadership Group -->
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:12px">
        <div style="font-size:.8rem;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Leadership Group</div>
        ${leaders.length === 0
          ? '<div style="color:#555;font-size:.8rem">No senior shinobi yet.</div>'
          : leaders.map(s => {
              const loyScore = (s.pMatrix?.loyalty || 0) + Math.floor(s.months / 12)
              return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:.8rem">
                <span style="color:#c9a84c;width:18px">${s.legendStatus ? '★' : '·'}</span>
                <span style="color:#e8d5a3;flex:1">${sn(s)}</span>
                <span style="color:#888">${RANKS[s.ri]}</span>
                <span style="color:${(s.pMatrix?.loyalty||0)>=14?'#8fbc8f':'#aaa'};font-size:.7rem">Loy ${s.pMatrix?.loyalty||'?'}</span>
              </div>`
            }).join('')}
        <div style="font-size:.7rem;color:#555;margin-top:6px">Top 5 by loyalty + tenure. High-loyalty leaders boost harmony and mediate losses.</div>
      </div>
    </div>

    <!-- Pending Meetings -->
    <div style="font-size:.85rem;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">
      Pending Meetings (${queue.length})
    </div>

    ${queue.length === 0
      ? '<div style="color:#555;text-align:center;padding:30px;font-size:.85rem">No pending meetings. Advance month — shinobi will request time as situations develop.</div>'
      : queue.map(mtg => {
          const s = (G.shinobi || []).find(x => x.id === mtg.shinobiId)
          if (!s) return ''
          const def = MEETING_TYPES.find(t => t.id === mtg.type)
          if (!def) return ''
          const urgencyColor = def.urgency === 'critical' ? '#f66' : def.urgency === 'medium' ? '#f0a030' : '#8fbc8f'
          const desc = def.desc.replace('%name%', s.fn)
          return `<div style="background:#1a1a1a;border:1px solid ${urgencyColor === '#f66' ? '#f66' : '#333'};border-radius:6px;padding:14px;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:1.4rem">${def.icon}</span>
              <div style="flex:1">
                <div style="color:#e8d5a3;font-weight:bold">${sn(s)} — ${def.n}</div>
                <div style="font-size:.75rem;color:#888">${RANKS[s.ri]} · Y${mtg.year}M${mtg.month} · <span style="color:${urgencyColor}">${def.urgency.toUpperCase()}</span></div>
              </div>
              <div style="text-align:right;font-size:.75rem;color:#aaa">
                <div>Morale: <span style="color:${(s.indMorale||70)>=60?'#8fbc8f':'#f66'}">${s.indMorale||70}</span></div>
                <div>Commit: <span style="color:${(s.commitment||70)>=40?'#c9a84c':'#f66'}">${s.commitment||70}</span></div>
              </div>
            </div>
            <div style="font-size:.82rem;color:#aaa;margin-bottom:10px;font-style:italic">"${desc}"</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
              ${def.responses.map(r => {
                const eff = r.effect
                const effectHints = [
                  eff.indMorale ? `Morale ${eff.indMorale > 0 ? '+' : ''}${eff.indMorale}` : null,
                  eff.commitment ? `Commit ${eff.commitment > 0 ? '+' : ''}${eff.commitment}` : null,
                  eff.promote ? '⬆ Promotes' : null,
                  eff.traumaClear ? '✓ Clears trauma' : null,
                  eff.reassign ? '↔ Reassigns' : null,
                  eff.ryo ? `${eff.ryo < 0 ? '-' : '+'}${fmt(Math.abs(eff.ryo))} ryo` : null,
                  eff.transfer ? '🚪 May transfer' : null,
                  eff.legend ? `+${eff.legend} legend` : null,
                ].filter(Boolean)
                const isBad = (eff.indMorale || 0) < 0 || (eff.commitment || 0) < -5
                const isGood = (eff.indMorale || 0) >= 10 || eff.promote || eff.traumaClear
                const btnColor = isGood ? '#1a2e1a' : isBad ? '#2e1a1a' : '#1a1a2e'
                const txtColor = isGood ? '#8fbc8f' : isBad ? '#f99' : '#87ceeb'
                return `<button onclick="doMeeting('${mtg.id}','${r.id}')" style="background:${btnColor};border:1px solid #333;border-radius:5px;padding:8px 6px;cursor:pointer;text-align:left;font-size:.75rem">
                  <div style="color:${txtColor};font-weight:bold;margin-bottom:3px">${r.n}</div>
                  <div style="color:#666;font-size:.7rem;margin-bottom:5px">${r.desc}</div>
                  ${effectHints.map(h => `<div style="font-size:.68rem;color:#777">${h}</div>`).join('')}
                </button>`
              }).join('')}
            </div>
          </div>`
        }).join('')
    }

    <!-- Village Morale summary -->
    <div style="margin-top:20px;background:#111;border:1px solid #333;border-radius:6px;padding:12px">
      <div style="font-size:.8rem;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Individual Morale Overview</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px">
        ${(G.shinobi || []).slice(0, 12).map(s => {
          const m = s.indMorale ?? 70
          const mColor = m >= 70 ? '#8fbc8f' : m >= 45 ? '#f0a030' : '#f66'
          const c = s.commitment ?? 70
          const cColor = c >= 50 ? '#c9a84c' : c >= 25 ? '#f0a030' : '#f66'
          return `<div style="background:#1a1a1a;border:1px solid #222;border-radius:4px;padding:6px;font-size:.75rem">
            <div style="color:#e8d5a3;margin-bottom:3px">${s.fn} ${s.ln}</div>
            <div style="display:flex;gap:8px;font-size:.7rem">
              <span>Mor: <span style="color:${mColor}">${m}</span></span>
              <span>Com: <span style="color:${cColor}">${c}</span></span>
              ${s.legendStatus ? '<span style="color:#c9a84c">★</span>' : ''}
            </div>
          </div>`
        }).join('')}
      </div>
    </div>
  `
}

// ── Relationship web tab ──────────────────────────────────────────────────────
function _webTab() {
  const { nodes, edges } = buildRelationshipWeb()
  if (!edges.length) {
    return '<div style="color:#555;text-align:center;padding:30px;font-size:.85rem">No bonds or rivalries have formed yet. They emerge as squads share missions together.</div>'
  }
  const positive = edges.filter(e => e.sign > 0)
  const negative = edges.filter(e => e.sign < 0)
  return `
    <div style="font-size:.8rem;color:#aaa;margin-bottom:10px">Visible fault lines and friendships across the roster — at a glance, where harmony is strong and where it might break.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="font-size:.78rem;color:#8fbc8f;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Bonds (${positive.length})</div>
        ${positive.length === 0 ? '<div style="color:#444;font-size:.8rem">None yet.</div>' : positive.map(e => `
          <div style="background:#13201a;border:1px solid #2a3a2a;border-radius:5px;padding:7px 10px;margin-bottom:6px;font-size:.8rem">
            <span style="color:#e8d5a3">${e.aName}</span> <span style="color:#8fbc8f">↔ ${e.type} ↔</span> <span style="color:#e8d5a3">${e.bName}</span>
          </div>`).join('')}
      </div>
      <div>
        <div style="font-size:.78rem;color:#f88;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Rivalries (${negative.length})</div>
        ${negative.length === 0 ? '<div style="color:#444;font-size:.8rem">None yet.</div>' : negative.map(e => `
          <div style="background:#201313;border:1px solid #3a2a2a;border-radius:5px;padding:7px 10px;margin-bottom:6px;font-size:.8rem">
            <span style="color:#e8d5a3">${e.aName}</span> <span style="color:#f88">⚡ Rivals ⚡</span> <span style="color:#e8d5a3">${e.bName}</span>
          </div>`).join('')}
      </div>
    </div>
    <div style="margin-top:16px;font-size:.72rem;color:#555">Squads with concentrated rivalries are fault lines for harmony crises. Squads dense with bonds resist them.</div>
  `
}

// ── Rumors tab ────────────────────────────────────────────────────────────────
function _rumorsTab() {
  const rumors = (G.rumors || []).filter(r => !r.resolved).slice().reverse()
  return `
    <div style="font-size:.8rem;color:#aaa;margin-bottom:12px">Unhappy shinobi talk. Rumors surface from sustained low commitment — an early warning, but not always reliable (some are baseless).</div>
    ${rumors.length === 0 ? '<div style="color:#555;text-align:center;padding:30px;font-size:.85rem">No active rumors.</div>' :
      rumors.map(r => `
        <div style="background:#1a1a1a;border:1px solid #443;border-radius:6px;padding:12px;margin-bottom:10px">
          <div style="font-size:.72rem;color:#888;margin-bottom:4px">Y${r.year}M${r.month}</div>
          <div style="font-size:.85rem;color:#e8d5a3;font-style:italic;margin-bottom:10px">"${r.text}"</div>
          <div style="display:flex;gap:8px">
            <button onclick="rumorAction('${r.id}','investigate')" style="background:#1a2e2e;border:1px solid #333;color:#87ceeb;border-radius:5px;padding:5px 10px;cursor:pointer;font-size:.75rem">Investigate</button>
            <button onclick="rumorAction('${r.id}','dismiss')" style="background:#222;border:1px solid #333;color:#999;border-radius:5px;padding:5px 10px;cursor:pointer;font-size:.75rem">Dismiss</button>
          </div>
        </div>`).join('')}
  `
}

// ── Noticeboard tab ───────────────────────────────────────────────────────────
function _boardTab() {
  const notices = (G.noticeboard || []).slice().reverse()
  const typeColor = { good: '#8fbc8f', bad: '#f66', warn: '#f0a030', neutral: '#999' }
  return `
    <div style="font-size:.8rem;color:#aaa;margin-bottom:10px">The village's living record — wins, losses, promotions, and rivalries, as the village itself would tell it.</div>
    <div style="max-height:520px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
      ${notices.length === 0 ? '<div style="color:#555;text-align:center;padding:30px;font-size:.85rem">Nothing posted yet.</div>' :
        notices.map(n => `<div style="background:#161616;border-left:3px solid ${typeColor[n.type]||'#555'};padding:7px 10px;font-size:.8rem;color:#ccc">
          <span style="color:#666;font-size:.72rem">Y${n.year}M${n.month}</span> — ${n.text}
        </div>`).join('')}
    </div>
  `
}

// ── Awards & Reviews tab ──────────────────────────────────────────────────────
function _awardsTab() {
  const awards = G.serviceAwardQueue || []
  const reviews = G.reviewQueue || []
  return `
    ${awards.length === 0 && reviews.length === 0
      ? '<div style="color:#555;text-align:center;padding:30px;font-size:.85rem">No pending service awards or reviews.</div>' : ''}
    ${awards.map(a => {
      const s = (G.shinobi || []).find(x => x.id === a.shinobiId)
      if (!s) return ''
      const def = SERVICE_AWARDS.find(sa => sa.years === a.years)
      if (!def) return ''
      const desc = def.desc.replace('%name%', s.fn)
      return `<div style="background:#1a1a1a;border:1px solid #c9a84c;border-radius:6px;padding:14px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:1.4rem">${def.icon}</span>
          <div style="flex:1">
            <div style="color:#e8d5a3;font-weight:bold">${sn(s)} — ${def.n}</div>
            <div style="font-size:.75rem;color:#888">${RANKS[s.ri]} · ${a.years} years of service</div>
          </div>
        </div>
        <div style="font-size:.82rem;color:#aaa;margin-bottom:10px;font-style:italic">"${desc}"</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${def.responses.map(r => `<button onclick="resolveServiceAward('${a.id}','${r.id}')" style="background:#1a1a2e;border:1px solid #333;border-radius:5px;padding:8px 6px;cursor:pointer;text-align:left;font-size:.75rem">
            <div style="color:#87ceeb;font-weight:bold;margin-bottom:3px">${r.n}</div>
            <div style="color:#666;font-size:.7rem">${r.desc}</div>
          </button>`).join('')}
        </div>
      </div>`
    }).join('')}
    ${reviews.map(rv => {
      const s = (G.shinobi || []).find(x => x.id === rv.shinobiId)
      if (!s) return ''
      const outcomeColor = rv.outcome === 'exceeded' ? '#8fbc8f' : rv.outcome === 'met' ? '#f0a030' : '#f66'
      const outcomeLabel = rv.outcome === 'exceeded' ? 'Exceeded Expectations' : rv.outcome === 'met' ? 'Met Expectations' : 'Disappointed'
      return `<div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:14px;margin-bottom:12px">
        <div style="color:#e8d5a3;font-weight:bold;margin-bottom:4px">${sn(s)} — Annual Review (Year ${rv.year})</div>
        <div style="font-size:.8rem;color:${outcomeColor};margin-bottom:10px">${outcomeLabel} · ${s.wins} mission wins this career</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${REVIEW_RESPONSES.map(r => `<button onclick="resolveReview('${rv.id}','${r.id}')" style="background:#1a1a2e;border:1px solid #333;border-radius:5px;padding:8px 6px;cursor:pointer;text-align:left;font-size:.75rem">
            <div style="color:#87ceeb;font-weight:bold;margin-bottom:3px">${r.n}</div>
            <div style="color:#666;font-size:.7rem">${r.desc}</div>
          </button>`).join('')}
        </div>
      </div>`
    }).join('')}
  `
}

export function doMeeting(meetingId, responseId) {
  const mtg = (G.meetingQueue || []).find(m => m.id === meetingId)
  if (!mtg) return
  const s = G.shinobi.find(x => x.id === mtg.shinobiId)
  if (!s) { G.meetingQueue = (G.meetingQueue || []).filter(m => m.id !== meetingId); rMeet(); return }
  const def = MEETING_TYPES.find(t => t.id === mtg.type)
  if (!def) return
  const resp = def.responses.find(r => r.id === responseId)
  if (!resp) return
  const eff = resp.effect

  // Apply effects
  if (eff.indMorale) s.indMorale = clamp((s.indMorale || 70) + eff.indMorale, 0, 100)
  if (eff.commitment) s.commitment = clamp((s.commitment || 70) + eff.commitment, 0, 100)
  if (eff.ryo) {
    if (G.ryo < Math.abs(eff.ryo) && eff.ryo < 0) { ntf('Not enough ryo!'); return }
    G.ryo += eff.ryo
  }
  if (eff.promote && s.ri < 4) {
    s.ri++
    const baseSal = 500 + s.ri * 400
    s.salary = Math.round(baseSal * (1 + (s.pers?.effect?.salary || 0)))
    aL(sn(s) + ' promoted to ' + RANKS[s.ri] + ' following the meeting.', 'good')
  }
  if (eff.traumaClear) { s.traumaStatus = null; s.traumaMonths = 0 }
  if (eff.reassign && s.squadId) {
    const sq = (G.squads || []).find(q => q.id === s.squadId)
    if (sq) {
      sq.members = sq.members.filter(id => id !== s.id)
      s.squadId = null
    }
  }
  if (eff.transfer) {
    // Will leave in 1-2 months if nothing changes
    s.commitment = clamp((s.commitment || 0) - 20, 0, 100)
  }
  if (eff.legend) {
    G.legend = (G.legend || 0) + eff.legend
  }

  // Remove from queue
  G.meetingQueue = (G.meetingQueue || []).filter(m => m.id !== meetingId)
  s.meetingCooldown = 4

  aL('Meeting with ' + sn(s) + ' (' + def.n + '): chose "' + resp.n + '".', 'neutral')
  rMeet()
  upUI()
}

export function resolveServiceAward(awardId, responseId) {
  const award = (G.serviceAwardQueue || []).find(a => a.id === awardId)
  if (!award) return
  const s = G.shinobi.find(x => x.id === award.shinobiId)
  const def = SERVICE_AWARDS.find(sa => sa.years === award.years)
  if (!s || !def) { G.serviceAwardQueue = (G.serviceAwardQueue||[]).filter(a=>a.id!==awardId); rMeet(); return }
  const resp = def.responses.find(r => r.id === responseId)
  if (!resp) return
  const eff = resp.effect
  if (eff.loyalty) s.pMatrix.loyalty = clamp(s.pMatrix.loyalty + eff.loyalty, 1, 20)
  if (eff.indMorale) s.indMorale = clamp((s.indMorale||70) + eff.indMorale, 0, 100)
  if (eff.commitment) s.commitment = clamp((s.commitment||70) + eff.commitment, 0, 100)
  if (eff.ryo) G.ryo += eff.ryo
  if (eff.legend) G.legend = (G.legend||0) + eff.legend
  G.serviceAwardQueue = (G.serviceAwardQueue||[]).filter(a=>a.id!==awardId)
  aL(sn(s) + '\'s ' + def.n + ' acknowledged: "' + resp.n + '".', 'neutral')
  rMeet(); upUI()
}

export function resolveReview(reviewId, responseId) {
  const rv = (G.reviewQueue || []).find(r => r.id === reviewId)
  if (!rv) return
  const s = G.shinobi.find(x => x.id === rv.shinobiId)
  if (!s) { G.reviewQueue = (G.reviewQueue||[]).filter(r=>r.id!==reviewId); rMeet(); return }
  const ambition = s.pMatrix?.ambition || 10
  let indMorale = 0, commitment = 0
  if (responseId === 'praise') { indMorale = 10; commitment = 8 }
  else if (responseId === 'standard') { indMorale = 2; commitment = 1 }
  else if (responseId === 'push') { indMorale = -2; commitment = 4 }
  // High-ambition shinobi react badly to "met expectations" being treated as routine
  if (rv.outcome === 'met' && ambition >= 15 && responseId !== 'praise') {
    indMorale -= 8; commitment -= 6
    aL(sn(s) + ' expected more recognition for meeting expectations — visibly frustrated.', 'warn')
  }
  if (rv.outcome === 'disappointed' && responseId === 'praise') {
    indMorale -= 4 // hollow praise after a bad year rings false
  }
  s.indMorale = clamp((s.indMorale||70) + indMorale, 0, 100)
  s.commitment = clamp((s.commitment||70) + commitment, 0, 100)
  G.reviewQueue = (G.reviewQueue||[]).filter(r=>r.id!==reviewId)
  aL(sn(s) + '\'s annual review (' + rv.outcome + ') resolved.', 'neutral')
  rMeet(); upUI()
}

export function rumorAction(rumorId, action) {
  const r = (G.rumors || []).find(x => x.id === rumorId)
  if (!r) return
  if (action === 'investigate') {
    const s = G.shinobi.find(x => x.id === r.shinobiId)
    if (s) {
      if (r.isFalse) ntf('Investigation finds no basis for the rumor about ' + sn(s) + '.')
      else ntf(sn(s) + ' — commitment currently ' + (s.commitment ?? '?') + '/100. The rumor has merit.')
    }
  }
  r.resolved = true
  rMeet(); upUI()
}
