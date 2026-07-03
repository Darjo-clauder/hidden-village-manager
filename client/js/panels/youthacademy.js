import { G } from '../state.js'
import { DEV_TRACKS, INTENSITY_LEVELS, DEV_CURVES } from '../constants.js'
import { aL, ntf } from '../ui.js'
import { clamp } from '../state.js'
import { t as tr } from '../../../shared/utils/i18n.js'

window._yaTab = 'class'

export function rYA() {
  const el = document.getElementById('yal')
  if (!el) return
  const students = G.intakeClass || []
  const senseis = (G.staff || []).filter(st => st.role === 'team_sensei' || st.role === 'head_sensei')
  const nextIntakeYear = (G.lastIntakeYear || G.year - 1) + 1
  const isApril = G.month === 4
  const tabs = ['class', 'records', 'grads']

  el.innerHTML = `
    <h2 style="color:#c9a84c;margin:0 0 16px">🎓 Youth Academy</h2>

    <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:12px;margin-bottom:16px;display:flex;gap:20px;flex-wrap:wrap">
      <div><span style="color:#888;font-size:.8rem">Current Class</span><br><strong style="font-size:1.3rem;color:#e8d5a3">${students.length}</strong></div>
      <div><span style="color:#888;font-size:.8rem">Next Intake</span><br><strong style="color:#c9a84c">April Y${nextIntakeYear}</strong></div>
      <div><span style="color:#888;font-size:.8rem">Academy Level</span><br><strong style="color:#aaa">${G.upgrades?.academy || 0}</strong></div>
      <div><span style="color:#888;font-size:.8rem">Head Sensei</span><br><strong style="color:#aaa">${(G.staff||[]).find(s=>s.role==='head_sensei') ? (G.staff.find(s=>s.role==='head_sensei').fn + ' ' + G.staff.find(s=>s.role==='head_sensei').ln) : '— None —'}</strong></div>
      ${isApril ? '<div style="color:#c9a84c;font-size:.85rem;align-self:center">🌸 Intake month! New class arrives this advance.</div>' : ''}
    </div>

    ${(() => {
      const hist = (G.youthCupHistory || []).slice(-5).reverse()
      const held = hist[0]
      if (!hist.length) return `<div style="background:#111;border:1px solid #2a2a2a;border-radius:6px;padding:10px 12px;margin-bottom:16px;font-size:.78rem;color:#666">🎓 <b style="color:#8a7d5c">Youth Cup</b> — the academy-age tournament runs every June. Enrol a class and field your brightest for a shot at the cup.</div>`
      return `<div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:12px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="color:#c9a84c;font-size:.82rem;text-transform:uppercase;letter-spacing:.08em">🎓 Youth Cup</span>
          <span style="font-size:.78rem;color:${held.playerChampion ? '#8fbc8f' : '#888'}">Holder: <b>${held.championVillage || held.champion}</b> (Y${held.year})${held.playerChampion ? ' — you' : ''}</span>
        </div>
        <div style="display:grid;gap:2px">
          ${hist.map(h => `<div style="display:flex;gap:8px;font-size:.75rem;color:${h.playerChampion ? '#8fbc8f' : '#9a9080'}">
            <span style="color:#555;width:36px">Y${h.year}</span>
            <span>${h.playerChampion ? '🏆 ' : ''}${h.championVillage || h.champion}</span>
          </div>`).join('')}
        </div>
      </div>`
    })()}

    <div style="display:flex;gap:6px;margin-bottom:14px">
      ${tabs.map(t => `<button onclick="yaTab('${t}')" style="background:${window._yaTab===t?'#2a2210':'#1a1a1a'};border:1px solid ${window._yaTab===t?'#c9a84c':'#333'};color:${window._yaTab===t?'#c9a84c':'#999'};border-radius:4px;padding:4px 10px;cursor:pointer;font-size:.78rem">${t === 'class' ? 'Current Class' : t === 'records' ? 'Academy Records' : 'Graduate Tracking'}</button>`).join('')}
    </div>

    ${window._yaTab === 'class' ? _classTab(students, senseis) : window._yaTab === 'records' ? _recordsTab() : _gradsTab()}
  `
}

export function yaTab(t) { window._yaTab = t; rYA() }

function _classTab(students, senseis) {
  return `
    ${students.length === 0
      ? `<div style="color:#555;text-align:center;padding:40px;font-size:.9rem">
          No students currently enrolled.<br>
          <span style="font-size:.8rem;color:#444">Annual intake happens every April. Advance through April to enroll a new class.</span>
        </div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
          ${students.map(student => studentCard(student, senseis)).join('')}
        </div>`
    }

    ${students.length > 0 ? `
    <div style="margin-top:16px;background:#111;border:1px solid #333;border-radius:6px;padding:12px">
      <h3 style="color:#aaa;font-size:.82rem;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px">Bulk Actions</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div style="font-size:.8rem;color:#888">Set all track:
          ${DEV_TRACKS.map(t => `<button onclick="yaSetAllTrack('${t.id}')" style="background:#222;border:1px solid #444;color:#ccc;border-radius:4px;padding:2px 8px;cursor:pointer;margin:0 2px;font-size:.75rem">${t.icon} ${t.n}</button>`).join('')}
        </div>
        <div style="font-size:.8rem;color:#888;margin-top:6px">Set all intensity:
          ${INTENSITY_LEVELS.map(i => `<button onclick="yaSetAllIntensity('${i.id}')" style="background:#222;border:1px solid #444;color:#ccc;border-radius:4px;padding:2px 8px;cursor:pointer;margin:0 2px;font-size:.75rem">${i.n}</button>`).join('')}
        </div>
      </div>
    </div>
    ` : ''}
  `
}

function studentCard(student, senseis) {
  const track = DEV_TRACKS.find(t => t.id === student.devTrack) || DEV_TRACKS[0]
  const intensity = INTENSITY_LEVELS.find(i => i.id === student.intensity) || INTENSITY_LEVELS[1]
  const sensei = senseis.find(s => s.id === student.sensei)
  const progress = Math.min(100, Math.round((student.monthsInClass / 12) * 100))
  const milestonesDone = student.milestones || []
  const reports = student.trainingReports || []
  const lastReport = reports[reports.length - 1]
  const curve = student.devCurveRevealed ? DEV_CURVES.find(c => c.id === student.devCurve) : null

  return `<div style="background:#1a1a1a;border:1px solid ${student.burnout?'#f66':'#333'};border-radius:6px;padding:12px">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
      <div>
        <strong style="color:#e8d5a3">${student.fn} ${student.ln}</strong>
        ${student.clan ? `<span style="color:#c9a84c;font-size:.72rem;margin-left:6px">[${student.clan}]</span>` : ''}
      </div>
      <span style="font-size:.72rem;color:#666">${student.monthsInClass}mo</span>
    </div>

    ${student.burnout ? `<div style="background:#3a0000;border-radius:4px;padding:3px 6px;font-size:.73rem;color:#f99;margin-bottom:6px">⚠ Burnout — ${student.burnoutTrait||'Withdrawn'}</div>` : ''}
    ${student.traits?.length ? `<div style="font-size:.72rem;color:#c9a84c;margin-bottom:4px">${student.traits.join(' · ')}</div>` : ''}
    <div style="font-size:.71rem;color:#9cf;margin-bottom:4px">Development Curve: ${curve ? curve.n + ' (peaks ~' + curve.peakAge + ')' : 'Unknown — needs an experienced sensei or elite scout to assess'}</div>

    <!-- Progress bar -->
    <div style="margin-bottom:8px">
      <div style="font-size:.7rem;color:#666;margin-bottom:2px">Progress: ${progress}% · Pot: ${student.potential}</div>
      <div style="background:#111;border-radius:3px;height:5px;overflow:hidden">
        <div style="background:#c9a84c;width:${progress}%;height:100%"></div>
      </div>
      <div style="display:flex;gap:2px;margin-top:3px">
        ${[3,6,9,12].map(m => `<span style="font-size:.65rem;color:${milestonesDone.includes(m)?'#c9a84c':'#333'}">${m}m${milestonesDone.includes(m)?'✓':'○'}</span>`).join(' ')}
      </div>
    </div>

    <!-- Monthly training report -->
    ${lastReport ? `<div style="font-size:.72rem;color:#888;font-style:italic;border-left:2px solid #444;padding-left:7px;margin-bottom:8px">"${lastReport.text}"</div>` : ''}

    <!-- Track selector -->
    <div style="margin-bottom:6px">
      <label style="font-size:.72rem;color:#777">Track:</label>
      <select onchange="yaSetTrack('${student.id}',this.value)" style="background:#222;color:#e8d5a3;border:1px solid #444;border-radius:4px;font-size:.73rem;padding:1px 4px;margin-left:4px">
        ${DEV_TRACKS.map(t => `<option value="${t.id}" ${student.devTrack===t.id?'selected':''}>${t.icon} ${t.n}</option>`).join('')}
      </select>
    </div>

    <!-- Intensity selector -->
    <div style="margin-bottom:6px">
      <label style="font-size:.72rem;color:#777">Intensity:</label>
      <select onchange="yaSetIntensity('${student.id}',this.value)" style="background:#222;color:#e8d5a3;border:1px solid #444;border-radius:4px;font-size:.73rem;padding:1px 4px;margin-left:4px">
        ${INTENSITY_LEVELS.map(i => `<option value="${i.id}" ${student.intensity===i.id?'selected':''}>${i.n}</option>`).join('')}
      </select>
    </div>

    <!-- Sensei selector -->
    <div style="margin-bottom:8px">
      <label style="font-size:.72rem;color:#777">Sensei:</label>
      <select onchange="yaSetSensei('${student.id}',this.value)" style="background:#222;color:#e8d5a3;border:1px solid #444;border-radius:4px;font-size:.73rem;padding:1px 4px;margin-left:4px">
        <option value="">— None —</option>
        ${senseis.map(s => `<option value="${s.id}" ${student.sensei===s.id?'selected':''}>${s.fn} ${s.ln} (Ped:${s.stats.pedagogy||'?'})</option>`).join('')}
      </select>
    </div>

    <!-- Warden training button -->
    ${(!student.kageTraining && (G.kageTrainingUsedYear||0) < G.year)
      ? `<button onclick="yaKageTraining('${student.id}')" style="width:100%;background:#2a1f00;border:1px solid #c9a84c;color:#c9a84c;border-radius:4px;padding:4px;cursor:pointer;font-size:.75rem">⚔ Warden Personal Sparring</button>`
      : student.kageTraining ? `<div style="font-size:.73rem;color:#c9a84c;text-align:center">★ Warden Training Queued</div>`
      : `<div style="font-size:.73rem;color:#555;text-align:center">Warden training used this year</div>`
    }
  </div>`
}

function _recordsTab() {
  const records = G.academyRecords || {}
  const keys = Object.keys(records)
  if (!keys.length) return '<div style="color:#555;font-size:.85rem;padding:20px 0">No academy records set yet. Records are set when students graduate.</div>'
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
    ${keys.map(k => `<div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:10px">
      <div style="font-size:.72rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${k}</div>
      <div style="font-size:1.1rem;color:#c9a84c;font-weight:bold;margin-bottom:2px">${records[k].value}</div>
      <div style="font-size:.72rem;color:#999">${records[k].name} — Year ${records[k].year}</div>
    </div>`).join('')}
  </div>`
}

function _gradsTab() {
  const grads = (G.gradTracking || []).slice().reverse()
  if (!grads.length) return '<div style="color:#555;font-size:.85rem;padding:20px 0">No graduates tracked yet.</div>'
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem">
    <tr style="color:#888;border-bottom:1px solid #333">
      <th style="text-align:left;padding:4px 8px">Name</th>
      <th style="text-align:left;padding:4px 8px">Graduated</th>
      <th style="text-align:left;padding:4px 8px">Status</th>
      <th style="text-align:left;padding:4px 8px">Rank</th>
      <th style="text-align:left;padding:4px 8px">Missions</th>
    </tr>
    ${grads.map(g => {
      const active = G.shinobi.find(s => s.id === g.id)
      const memorial = G.memorial?.find(m => m.name === g.name)
      const inProspects = G.prospects.find(p => p.id === g.id)
      let status = 'Unknown', statusColor = '#666', rank = '—', missions = '—'
      if (active) {
        status = 'Active'; statusColor = '#8fbc8f'
        rank = ['Initiate','Adept','Veteran','Shadow','S-Rank'][active.ri] || '—'
        missions = active.wins || 0
      } else if (memorial) {
        status = memorial.transfer ? 'Transferred' : 'KIA'; statusColor = memorial.transfer ? '#f0a030' : '#f66'
        rank = memorial.rank || '—'; missions = memorial.wins || 0
      } else if (inProspects) {
        status = 'In Prospect Pool'; statusColor = '#9cf'
      }
      return `<tr style="border-bottom:1px solid #1e1e1e">
        <td style="padding:4px 8px;color:#e8d5a3">${g.name}${g.clan ? ` <span style="color:#c9a84c;font-size:.7rem">[${g.clan}]</span>` : ''}</td>
        <td style="padding:4px 8px;color:#888">Y${g.gradYear}M${g.gradMonth}</td>
        <td style="padding:4px 8px;color:${statusColor}">${status}</td>
        <td style="padding:4px 8px;color:#aaa">${rank}</td>
        <td style="padding:4px 8px;color:#aaa">${missions}</td>
      </tr>`
    }).join('')}
  </table></div>`
}

export function yaSetTrack(studentId, trackId) {
  const s = (G.intakeClass || []).find(st => st.id === studentId)
  if (s) { s.devTrack = trackId; rYA() }
}

export function yaSetIntensity(studentId, intensityId) {
  const s = (G.intakeClass || []).find(st => st.id === studentId)
  if (s) { s.intensity = intensityId; rYA() }
}

export function yaSetSensei(studentId, senseiId) {
  const s = (G.intakeClass || []).find(st => st.id === studentId)
  if (s) { s.sensei = senseiId || null; rYA() }
}

export function yaSetAllTrack(trackId) {
  ;(G.intakeClass || []).forEach(s => { s.devTrack = trackId })
  rYA()
}

export function yaSetAllIntensity(intensityId) {
  ;(G.intakeClass || []).forEach(s => { s.intensity = intensityId })
  rYA()
}

export function yaKageTraining(studentId) {
  if ((G.kageTrainingUsedYear || 0) >= G.year) { ntf(tr('toast.youthacademy.alreadySparred')); return }
  const s = (G.intakeClass || []).find(st => st.id === studentId)
  if (!s) return
  s.kageTraining = true
  ntf(s.fn + ' ' + s.ln + ' will receive Warden training next advance.')
  rYA()
}
