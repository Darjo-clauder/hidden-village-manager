import { G } from '../state.js'
import { DEV_TRACKS, INTENSITY_LEVELS, DEV_CURVES } from '../constants.js'
import { aL, ntf } from '../ui.js'
import { clamp } from '../state.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { openBattleViewer } from '../liveBattle.js'
import { arenaFor } from '../../../shared/constants/arenas.js'

/** Replay the last Youth Cup as an academy-day match on the training ground. */
export function watchYouthCup() {
  const run = G._youthCupRun
  if (!run || !run.phases?.length) return
  const verdict = run.champion
    ? `${run.entrant} won the Youth Cup — a name to remember.`
    : `${run.entrant} bowed out; ${run.championVillage || 'a rival'} took the cup.`
  openBattleViewer({
    missionName: `Year ${run.year} Youth Cup — ${run.entrant}`, missionRk: 'Academy Day',
    kind: 'academy', phases: run.phases, succeeded: run.champion, verdict,
    arena: arenaFor('academy'),
  })
}

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
    <h2 style="color:var(--gold);margin:0 0 16px">🎓 Youth Academy</h2>

    <div class="surf" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:16px;display:flex;gap:20px;flex-wrap:wrap">
      <div><span style="color:var(--text-dim);font-size:.8rem">Current Class</span><br><strong style="font-size:1.3rem;color:var(--gold-hi)">${students.length}</strong></div>
      <div><span style="color:var(--text-dim);font-size:.8rem">Next Intake</span><br><strong style="color:var(--gold)">April Y${nextIntakeYear}</strong></div>
      <div><span style="color:var(--text-dim);font-size:.8rem">Academy Level</span><br><strong style="color:var(--text-mid)">${G.upgrades?.academy || 0}</strong></div>
      <div><span style="color:var(--text-dim);font-size:.8rem">Head Sensei</span><br><strong style="color:var(--text-mid)">${(G.staff||[]).find(s=>s.role==='head_sensei') ? (G.staff.find(s=>s.role==='head_sensei').fn + ' ' + G.staff.find(s=>s.role==='head_sensei').ln) : '— None —'}</strong></div>
      ${isApril ? '<div style="color:var(--gold);font-size:.85rem;align-self:center">🌸 Intake month! New class arrives this advance.</div>' : ''}
    </div>

    ${(() => {
      const hist = (G.youthCupHistory || []).slice(-5).reverse()
      const held = hist[0]
      if (!hist.length) return `<div style="background:var(--sunken);border:1px solid var(--surface-3);border-radius:6px;padding:10px 12px;margin-bottom:16px;font-size:.78rem;color:var(--text-faint)">🎓 <b style="color:var(--text-mid)">Youth Cup</b> — the academy-age tournament runs every June. Enrol a class and field your brightest for a shot at the cup.</div>`
      return `<div class="surf" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="color:var(--gold);font-size:.82rem;text-transform:uppercase;letter-spacing:.08em">🎓 Youth Cup</span>
          <span style="display:flex;align-items:center;gap:8px;font-size:.78rem;color:${held.playerChampion ? 'var(--green)' : 'var(--text-dim)'}">
            ${G._youthCupRun?.phases?.length ? `<button class="gb" style="font-size:.65rem;padding:2px 8px;border-color:var(--gold);color:var(--gold)" onclick="watchYouthCup()">▶ Watch</button>` : ''}
            Holder: <b>${held.championVillage || held.champion}</b> (Y${held.year})${held.playerChampion ? ' — you' : ''}</span>
        </div>
        <div style="display:grid;gap:2px">
          ${hist.map(h => `<div style="display:flex;gap:8px;font-size:.75rem;color:${h.playerChampion ? 'var(--green)' : 'var(--text-mid)'}">
            <span style="color:var(--text-faint);width:36px">Y${h.year}</span>
            <span>${h.playerChampion ? '🏆 ' : ''}${h.championVillage || h.champion}</span>
          </div>`).join('')}
        </div>
      </div>`
    })()}

    <div style="display:flex;gap:6px;margin-bottom:14px">
      ${tabs.map(t => `<button onclick="yaTab('${t}')" style="background:${window._yaTab===t?'var(--gold-bg)':'var(--surface)'};border:1px solid ${window._yaTab===t?'var(--gold)':'var(--border)'};color:${window._yaTab===t?'var(--gold)':'var(--text-mid)'};border-radius:4px;padding:4px 10px;cursor:pointer;font-size:.78rem">${t === 'class' ? 'Current Class' : t === 'records' ? 'Academy Records' : 'Graduate Tracking'}</button>`).join('')}
    </div>

    ${window._yaTab === 'class' ? _classTab(students, senseis) : window._yaTab === 'records' ? _recordsTab() : _gradsTab()}
  `
}

export function yaTab(t) { window._yaTab = t; rYA() }

function _classTab(students, senseis) {
  return `
    ${students.length === 0
      ? `<div style="color:var(--text-faint);text-align:center;padding:40px;font-size:.9rem">
          No students currently enrolled.<br>
          <span style="font-size:.8rem;color:var(--border-hi)">Annual intake happens every April. Advance through April to enroll a new class.</span>
        </div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
          ${students.map(student => studentCard(student, senseis)).join('')}
        </div>`
    }

    ${students.length > 0 ? `
    <div class="well" style="margin-top:16px;background:var(--sunken);border:1px solid var(--border);border-radius:6px;padding:12px">
      <h3 style="color:var(--text-mid);font-size:.82rem;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px">Bulk Actions</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div style="font-size:.8rem;color:var(--text-dim)">Set all track:
          ${DEV_TRACKS.map(t => `<button onclick="yaSetAllTrack('${t.id}')" style="background:var(--border-dim);border:1px solid var(--border-hi);color:var(--text-hi);border-radius:4px;padding:2px 8px;cursor:pointer;margin:0 2px;font-size:.75rem">${t.icon} ${t.n}</button>`).join('')}
        </div>
        <div style="font-size:.8rem;color:var(--text-dim);margin-top:6px">Set all intensity:
          ${INTENSITY_LEVELS.map(i => `<button onclick="yaSetAllIntensity('${i.id}')" style="background:var(--border-dim);border:1px solid var(--border-hi);color:var(--text-hi);border-radius:4px;padding:2px 8px;cursor:pointer;margin:0 2px;font-size:.75rem">${i.n}</button>`).join('')}
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

  return `<div style="background:var(--surface);border:1px solid ${student.burnout?'var(--red)':'var(--border)'};border-radius:6px;padding:12px">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">
      <div>
        <strong style="color:var(--gold-hi)">${student.fn} ${student.ln}</strong>
        ${student.clan ? `<span style="color:var(--gold);font-size:.72rem;margin-left:6px">[${student.clan}]</span>` : ''}
      </div>
      <span style="font-size:.72rem;color:var(--text-faint)">${student.monthsInClass}mo</span>
    </div>

    ${student.burnout ? `<div style="background:#3a0000;border-radius:4px;padding:3px 6px;font-size:.73rem;color:var(--red-soft);margin-bottom:6px">⚠ Burnout — ${student.burnoutTrait||'Withdrawn'}</div>` : ''}
    ${student.traits?.length ? `<div style="font-size:.72rem;color:var(--gold);margin-bottom:4px">${student.traits.join(' · ')}</div>` : ''}
    <div style="font-size:.71rem;color:var(--blue-hi);margin-bottom:4px">Development Curve: ${curve ? curve.n + ' (peaks ~' + curve.peakAge + ')' : 'Unknown — needs an experienced sensei or elite scout to assess'}</div>

    <!-- Progress bar -->
    <div style="margin-bottom:8px">
      <div style="font-size:.7rem;color:var(--text-faint);margin-bottom:2px">Progress: ${progress}% · Pot: ${student.potential}</div>
      <div style="background:var(--sunken);border-radius:3px;height:5px;overflow:hidden">
        <div style="background:var(--gold);width:${progress}%;height:100%"></div>
      </div>
      <div style="display:flex;gap:2px;margin-top:3px">
        ${[3,6,9,12].map(m => `<span style="font-size:.65rem;color:${milestonesDone.includes(m)?'var(--gold)':'var(--border)'}">${m}m${milestonesDone.includes(m)?'✓':'○'}</span>`).join(' ')}
      </div>
    </div>

    <!-- Monthly training report -->
    ${lastReport ? `<div style="font-size:.72rem;color:var(--text-dim);font-style:italic;border-left:2px solid var(--border-hi);padding-left:7px;margin-bottom:8px">"${lastReport.text}"</div>` : ''}

    <!-- Track selector -->
    <div style="margin-bottom:6px">
      <label style="font-size:.72rem;color:var(--text-dim)">Track:</label>
      <select onchange="yaSetTrack('${student.id}',this.value)" style="background:var(--border-dim);color:var(--gold-hi);border:1px solid var(--border-hi);border-radius:4px;font-size:.73rem;padding:1px 4px;margin-left:4px">
        ${DEV_TRACKS.map(t => `<option value="${t.id}" ${student.devTrack===t.id?'selected':''}>${t.icon} ${t.n}</option>`).join('')}
      </select>
    </div>

    <!-- Intensity selector -->
    <div style="margin-bottom:6px">
      <label style="font-size:.72rem;color:var(--text-dim)">Intensity:</label>
      <select onchange="yaSetIntensity('${student.id}',this.value)" style="background:var(--border-dim);color:var(--gold-hi);border:1px solid var(--border-hi);border-radius:4px;font-size:.73rem;padding:1px 4px;margin-left:4px">
        ${INTENSITY_LEVELS.map(i => `<option value="${i.id}" ${student.intensity===i.id?'selected':''}>${i.n}</option>`).join('')}
      </select>
    </div>

    <!-- Sensei selector -->
    <div style="margin-bottom:8px">
      <label style="font-size:.72rem;color:var(--text-dim)">Sensei:</label>
      <select onchange="yaSetSensei('${student.id}',this.value)" style="background:var(--border-dim);color:var(--gold-hi);border:1px solid var(--border-hi);border-radius:4px;font-size:.73rem;padding:1px 4px;margin-left:4px">
        <option value="">— None —</option>
        ${senseis.map(s => `<option value="${s.id}" ${student.sensei===s.id?'selected':''}>${s.fn} ${s.ln} (Ped:${s.stats.pedagogy||'?'})</option>`).join('')}
      </select>
    </div>

    <!-- Warden training button -->
    ${(!student.kageTraining && (G.kageTrainingUsedYear||0) < G.year)
      ? `<button onclick="yaKageTraining('${student.id}')" style="width:100%;background:#2a1f00;border:1px solid var(--gold);color:var(--gold);border-radius:4px;padding:4px;cursor:pointer;font-size:.75rem">⚔ Warden Personal Sparring</button>`
      : student.kageTraining ? `<div style="font-size:.73rem;color:var(--gold);text-align:center">★ Warden Training Queued</div>`
      : `<div style="font-size:.73rem;color:var(--text-faint);text-align:center">Warden training used this year</div>`
    }
  </div>`
}

function _recordsTab() {
  const records = G.academyRecords || {}
  const keys = Object.keys(records)
  if (!keys.length) return '<div style="color:var(--text-faint);font-size:.85rem;padding:20px 0">No academy records set yet. Records are set when students graduate.</div>'
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
    ${keys.map(k => `<div class="surf" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:10px">
      <div style="font-size:.72rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${k}</div>
      <div style="font-size:1.1rem;color:var(--gold);font-weight:bold;margin-bottom:2px">${records[k].value}</div>
      <div style="font-size:.72rem;color:var(--text-mid)">${records[k].name} — Year ${records[k].year}</div>
    </div>`).join('')}
  </div>`
}

function _gradsTab() {
  const grads = (G.gradTracking || []).slice().reverse()
  if (!grads.length) return '<div style="color:var(--text-faint);font-size:.85rem;padding:20px 0">No graduates tracked yet.</div>'
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem">
    <tr style="color:var(--text-dim);border-bottom:1px solid var(--border)">
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
      let status = 'Unknown', statusColor = 'var(--text-faint)', rank = '—', missions = '—'
      if (active) {
        status = 'Active'; statusColor = 'var(--green)'
        rank = ['Initiate','Adept','Veteran','Shadow','S-Rank'][active.ri] || '—'
        missions = active.wins || 0
      } else if (memorial) {
        status = memorial.transfer ? 'Transferred' : 'KIA'; statusColor = memorial.transfer ? 'var(--orange)' : 'var(--red)'
        rank = memorial.rank || '—'; missions = memorial.wins || 0
      } else if (inProspects) {
        status = 'In Prospect Pool'; statusColor = 'var(--blue-hi)'
      }
      return `<tr style="border-bottom:1px solid #1e1e1e">
        <td style="padding:4px 8px;color:var(--gold-hi)">${g.name}${g.clan ? ` <span style="color:var(--gold);font-size:.7rem">[${g.clan}]</span>` : ''}</td>
        <td style="padding:4px 8px;color:var(--text-dim)">Y${g.gradYear}M${g.gradMonth}</td>
        <td style="padding:4px 8px;color:${statusColor}">${status}</td>
        <td style="padding:4px 8px;color:var(--text-mid)">${rank}</td>
        <td style="padding:4px 8px;color:var(--text-mid)">${missions}</td>
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
