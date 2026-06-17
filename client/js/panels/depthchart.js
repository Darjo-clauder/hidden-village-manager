import { G } from '../state.js'

const RANK_LABELS = ['Genin', 'Chunin', 'Jonin', 'ANBU', 'S-Rank']
const RANK_KEYS   = ['g', 'c', 'j', 'a', 's']
const RANK_RI     = [0, 1, 2, 3, 4]

export function rDep() {
  const el = document.getElementById('p-depth')
  if (!el) return

  // Build roster tiers
  const tiers = RANK_RI.map((ri, idx) => {
    const all       = G.shinobi.filter(s => s.ri === ri)
    const available = all.filter(s => s.status === 'available')
    const onMission = all.filter(s => s.status === 'mission')
    const injured   = all.filter(s => s.status === 'injured')
    const onExam    = all.filter(s => s.status === 'exam')
    const onLoan    = all.filter(s => s.loanOut)
    return { ri, label: RANK_LABELS[idx], all, available, onMission, injured, onExam, onLoan }
  })

  // Academy pipeline (graduating students become Genin prospects)
  const graduating = (G.intakeClass || []).filter(s => (s.monthsEnrolled || 0) >= 10)
  const inTraining = (G.intakeClass || []).length

  // Scouts deployed
  const scouts = (G.shinobi || []).filter(s => s.role === 'scout' || s.scouting)

  el.innerHTML = `
    <div class="pt">Depth Chart</div>

    <div style="margin-bottom:16px">
      ${tiers.map(t => `
        <div class="depth-tier">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">
            <div class="depth-tier-label">${t.label}</div>
            <div style="font-size:8px;color:var(--text-dim)">
              ${t.all.length} total ·
              <span style="color:var(--green)">${t.available.length} ready</span> ·
              <span style="color:var(--orange)">${t.onMission.length} deployed</span>
              ${t.injured.length ? ` · <span style="color:var(--red)">${t.injured.length} injured</span>` : ''}
              ${t.onExam.length ? ` · <span style="color:var(--gold)">${t.onExam.length} exam</span>` : ''}
              ${t.onLoan.length ? ` · <span style="color:var(--blue)">${t.onLoan.length} loaned</span>` : ''}
            </div>
          </div>

          ${t.all.length === 0 ? `
            <div style="border:1px dashed var(--border);padding:8px 12px;font-size:8px;color:var(--text-dim);letter-spacing:1px">
              No ${t.label} on roster
              ${t.ri > 0 ? `<span style="margin-left:8px;font-size:7px;color:var(--text-dim)">— promote ${RANK_LABELS[t.ri-1]}s to fill</span>` : ''}
            </div>
          ` : `
            <div class="depth-row">
              ${t.available.map(s => _slotHtml(s, 'available')).join('')}
              ${t.onMission.map(s => _slotHtml(s, 'on-mission')).join('')}
              ${t.injured.map(s => _slotHtml(s, 'injured')).join('')}
              ${t.onExam.map(s => _slotHtml(s, 'exam')).join('')}
            </div>
          `}
        </div>
      `).join('')}
    </div>

    <!-- Academy pipeline -->
    <div style="background:var(--surface);border:1px solid var(--border);padding:13px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">Academy Pipeline → Genin</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;font-size:9px;color:var(--text-dim)">
        <span>${inTraining} students in training</span>
        ${graduating.length > 0 ? `<span style="color:var(--green)">↑ ${graduating.length} graduating soon</span>` : ''}
      </div>
      ${inTraining === 0 ? `
        <div style="font-size:9px;color:var(--text-dim)">No students enrolled. Open Academy intake in April.</div>
      ` : `
        <div class="depth-row">
          ${(G.intakeClass || []).map(s => {
            const mLeft = 12 - (s.monthsEnrolled || 0)
            const cls = mLeft <= 2 ? 'available' : 'incoming'
            return `
              <div class="depth-slot ${cls}">
                <div style="font-size:9px;color:var(--text-hi)">${s.fn} ${s.ln}</div>
                <div style="font-size:7px;color:var(--text-dim);margin-top:2px">${mLeft}mo to grad</div>
                ${s.archetype ? `<div style="font-size:7px;color:var(--text-dim)">${s.archetype}</div>` : ''}
              </div>`
          }).join('')}
        </div>
      `}
    </div>

    <!-- Summary table -->
    <div style="background:var(--surface);border:1px solid var(--border);padding:13px">
      <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">Roster Summary</div>
      <table style="width:100%;border-collapse:collapse;font-size:9px">
        <thead>
          <tr style="color:var(--text-dim);font-size:7px;letter-spacing:1px;text-transform:uppercase">
            <th style="text-align:left;padding:4px 6px;border-bottom:1px solid var(--border)">Rank</th>
            <th style="text-align:center;padding:4px;border-bottom:1px solid var(--border)">Total</th>
            <th style="text-align:center;padding:4px;border-bottom:1px solid var(--border);color:var(--green)">Ready</th>
            <th style="text-align:center;padding:4px;border-bottom:1px solid var(--border);color:var(--orange)">Deployed</th>
            <th style="text-align:center;padding:4px;border-bottom:1px solid var(--border);color:var(--red)">Injured</th>
          </tr>
        </thead>
        <tbody>
          ${tiers.map(t => `
            <tr style="border-bottom:1px solid var(--border-dim)">
              <td style="padding:5px 6px;color:var(--text-hi)">${t.label}</td>
              <td style="text-align:center;padding:5px 4px;color:var(--text)">${t.all.length}</td>
              <td style="text-align:center;padding:5px 4px;color:${t.available.length>0?'var(--green)':'var(--text-dim)'}">${t.available.length}</td>
              <td style="text-align:center;padding:5px 4px;color:${t.onMission.length>0?'var(--orange)':'var(--text-dim)'}">${t.onMission.length}</td>
              <td style="text-align:center;padding:5px 4px;color:${t.injured.length>0?'var(--red)':'var(--text-dim)'}">${t.injured.length}</td>
            </tr>
          `).join('')}
          <tr style="border-top:1px solid var(--border)">
            <td style="padding:5px 6px;color:var(--gold);font-weight:bold">TOTAL</td>
            <td style="text-align:center;padding:5px 4px;color:var(--text-hi);font-weight:bold">${G.shinobi.length}</td>
            <td style="text-align:center;padding:5px 4px;color:var(--green)">${G.shinobi.filter(s=>s.status==='available').length}</td>
            <td style="text-align:center;padding:5px 4px;color:var(--orange)">${G.shinobi.filter(s=>s.status==='mission').length}</td>
            <td style="text-align:center;padding:5px 4px;color:var(--red)">${G.shinobi.filter(s=>s.status==='injured').length}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
}

function _slotHtml(s, cls) {
  const statAvg = s.stats ? Math.round(Object.values(s.stats).reduce((a,b)=>a+b,0)/Object.values(s.stats).length) : 0
  const statusLabel = { available: '', 'on-mission': 'deployed', injured: `${s.injuryMonths||1}mo`, exam: 'exam' }[cls] || ''
  const statusColor = { available: 'var(--green)', 'on-mission': 'var(--orange)', injured: 'var(--red)', exam: 'var(--gold)' }[cls]
  return `
    <div class="depth-slot ${cls}" title="${s.fn} ${s.ln}">
      <div style="font-size:9px;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.fn} ${s.ln}</div>
      <div style="font-size:7px;color:var(--text-dim);margin-top:2px">Avg: ${statAvg}</div>
      ${statusLabel ? `<div style="font-size:7px;color:${statusColor};margin-top:1px">${statusLabel}</div>` : ''}
      ${s.traits?.length ? `<div style="font-size:7px;color:var(--purple);margin-top:1px">${s.traits[0]}</div>` : ''}
    </div>`
}
