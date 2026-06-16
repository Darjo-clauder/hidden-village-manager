import { G } from '../state.js'
import { DEV_TRACKS, INTENSITY_LEVELS } from '../constants.js'
import { aL, ntf } from '../ui.js'
import { clamp } from '../state.js'

export function rYA() {
  const el = document.getElementById('yal')
  if (!el) return
  const students = G.intakeClass || []
  const senseis = (G.staff || []).filter(st => st.role === 'team_sensei' || st.role === 'head_sensei')
  const nextIntakeYear = (G.lastIntakeYear || G.year - 1) + 1
  const isApril = G.month === 4

  el.innerHTML = `
    <h2 style="color:#c9a84c;margin:0 0 16px">🎓 Youth Academy</h2>

    <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:12px;margin-bottom:16px;display:flex;gap:20px;flex-wrap:wrap">
      <div><span style="color:#888;font-size:.8rem">Current Class</span><br><strong style="font-size:1.3rem;color:#e8d5a3">${students.length}</strong></div>
      <div><span style="color:#888;font-size:.8rem">Next Intake</span><br><strong style="color:#c9a84c">April Y${nextIntakeYear}</strong></div>
      <div><span style="color:#888;font-size:.8rem">Academy Level</span><br><strong style="color:#aaa">${G.upgrades?.academy || 0}</strong></div>
      <div><span style="color:#888;font-size:.8rem">Head Sensei</span><br><strong style="color:#aaa">${(G.staff||[]).find(s=>s.role==='head_sensei') ? (G.staff.find(s=>s.role==='head_sensei').fn + ' ' + G.staff.find(s=>s.role==='head_sensei').ln) : '— None —'}</strong></div>
      ${isApril ? '<div style="color:#c9a84c;font-size:.85rem;align-self:center">🌸 Intake month! New class arrives this advance.</div>' : ''}
    </div>

    ${students.length === 0
      ? `<div style="color:#555;text-align:center;padding:40px;font-size:.9rem">
          No students currently enrolled.<br>
          <span style="font-size:.8rem;color:#444">Annual intake happens every April. Advance through April to enroll a new class.</span>
        </div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
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

    <!-- Graduates info -->
    ${G.prospects.filter(p => p.milestones?.length > 0).length > 0 ? `
    <h3 style="color:#aaa;font-size:.85rem;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.08em">Recent Graduates (in Prospect Pool)</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
      ${G.prospects.filter(p => p.milestones?.length > 0).slice(0,6).map(p => `
        <div style="background:#1a1a1a;border:1px solid #333;border-radius:5px;padding:8px;font-size:.8rem">
          <div style="color:#e8d5a3;font-weight:bold">${p.fn} ${p.ln}</div>
          <div style="color:#999">Pot: ${p.potential}</div>
          ${p.traits?.length ? `<div style="color:#c9a84c;font-size:.72rem">${p.traits.join(', ')}</div>` : ''}
        </div>`
      ).join('')}
    </div>` : ''}
  `
}

function studentCard(student, senseis) {
  const track = DEV_TRACKS.find(t => t.id === student.devTrack) || DEV_TRACKS[0]
  const intensity = INTENSITY_LEVELS.find(i => i.id === student.intensity) || INTENSITY_LEVELS[1]
  const sensei = senseis.find(s => s.id === student.sensei)
  const progress = Math.min(100, Math.round((student.monthsInClass / 12) * 100))
  const milestonesDone = student.milestones || []
  const burnoutColor = student.burnout ? '#f66' : '#8fbc8f'

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

    <!-- Kage training button -->
    ${(!student.kageTraining && (G.kageTrainingUsedYear||0) < G.year)
      ? `<button onclick="yaKageTraining('${student.id}')" style="width:100%;background:#2a1f00;border:1px solid #c9a84c;color:#c9a84c;border-radius:4px;padding:4px;cursor:pointer;font-size:.75rem">⚔ Kage Personal Sparring</button>`
      : student.kageTraining ? `<div style="font-size:.73rem;color:#c9a84c;text-align:center">★ Kage Training Queued</div>`
      : `<div style="font-size:.73rem;color:#555;text-align:center">Kage training used this year</div>`
    }
  </div>`
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
  if ((G.kageTrainingUsedYear || 0) >= G.year) { ntf('Kage already sparred this year.'); return }
  const s = (G.intakeClass || []).find(st => st.id === studentId)
  if (!s) return
  s.kageTraining = true
  ntf(s.fn + ' ' + s.ln + ' will receive Kage training next advance.')
  rYA()
}
