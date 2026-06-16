import { G, sn, clamp, fmt } from '../state.js'
import { MEETING_TYPES, RANKS } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'

export function rMeet() {
  const el = document.getElementById('meetl')
  if (!el) return
  const queue = G.meetingQueue || []
  const harmony = G.harmonyScore ?? 70
  const harmonyColor = harmony >= 70 ? '#8fbc8f' : harmony >= 45 ? '#f0a030' : '#f66'

  // Leadership group
  const leaders = (G.shinobi || [])
    .slice()
    .sort((a, b) => ((b.pMatrix?.loyalty || 0) + Math.floor(b.months / 12)) - ((a.pMatrix?.loyalty || 0) + Math.floor(a.months / 12)))
    .slice(0, 5)

  el.innerHTML = `
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
