import { G, sPow, sn } from '../state.js'
import { RANKS, SQUAD_ROLES } from '../constants.js'
import { ensureDepthEntry, assignDepthSlot, toggleDepthLock, evalDepth, resolveActiveShinobi } from '../depthEngine.js'
import { aL, ntf, upUI } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { openContextMenu, showHoverPreview, hideHoverPreview } from '../uikit.js'

const RANK_LABELS = RANKS
const RANK_RI     = [0, 1, 2, 3, 4]

// ── P1 kit grammar for roster-tier slots — right-click verbs + hover stat card ──
export function depCtx(e, id) {
  e.preventDefault()
  const s = (G.shinobi || []).find(x => x.id === id); if (!s) return false
  openContextMenu(e.clientX, e.clientY, [
    { label: 'Open Dossier', fn: () => window.oDos && window.oDos(id) },
    { label: 'Squads Panel', fn: () => window.sp && window.sp('squads') },
  ])
  return false
}

export function depHover(e, id) {
  const s = (G.shinobi || []).find(x => x.id === id); if (!s) return
  const row = (k, v) => `<div class="hp-row"><span>${k}</span><b>${v}</b></div>`
  const statAvg = s.stats ? Math.round(Object.values(s.stats).reduce((a, b) => a + b, 0) / Object.values(s.stats).length) : 0
  showHoverPreview(e.clientX, e.clientY, `
    <div class="hp-name">${sn(s)}</div>
    <div class="hp-sub">${RANKS[s.ri]} · ${s.phase || 'prime'}</div>
    ${row('Power', sPow(s))}
    ${row('Stat avg', statAvg)}
    ${row('Status', s.status)}
    ${s.clan ? row('Clan', s.clan) : ''}`)
}

export function rDep() {
  const el = document.getElementById('p-depth')
  if (!el) return
  evalDepth(G)

  const tiers = RANK_RI.map((ri, idx) => {
    const all       = G.shinobi.filter(s => s.ri === ri)
    const available = all.filter(s => s.status === 'available')
    const onMission = all.filter(s => s.status === 'mission')
    const injured   = all.filter(s => s.status === 'injured')
    const onExam    = all.filter(s => s.status === 'exam')
    return { ri, label: RANK_LABELS[idx], all, available, onMission, injured, onExam }
  })

  const graduating = (G.intakeClass || []).filter(s => (s.monthsInClass || s.monthsEnrolled || 0) >= 10)
  const gaps = G.depthGaps || []
  const criticalGaps = gaps.filter(g => g.severity === 'critical').length
  const warnGaps = gaps.filter(g => g.severity === 'warn').length

  el.innerHTML = `
    <div class="pt">${tr("nav.depth")}</div>

    ${(criticalGaps + warnGaps > 0) ? `
    <div style="margin-bottom:12px;padding:9px 12px;background:${criticalGaps > 0 ? '#1a0505' : '#1a1305'};border:1px solid ${criticalGaps > 0 ? '#8b1a1a' : '#5a4800'}">
      <div style="font-size:9px;color:${criticalGaps > 0 ? '#f66' : '#f0a030'};margin-bottom:4px">${criticalGaps > 0 ? '⚠ Critical gaps detected' : '⚠ Depth gaps detected'}</div>
      ${gaps.map(g => `<div style="font-size:8px;color:${g.severity === 'critical' ? '#f99' : g.severity === 'emergency' ? '#f66' : '#f0a030'};margin-top:2px">
        ${g.squadName} — ${g.roleName}: ${g.reason}
        ${g.nearGradIds?.length ? `<button onclick="emergencyCallUp('${g.nearGradIds[0]}')" style="margin-left:8px;background:#1a2e1a;border:1px solid #4a7a4a;color:#8fbc8f;font-size:7px;padding:1px 5px;cursor:pointer">Call Up ►</button>` : ''}
      </div>`).join('')}
    </div>` : ''}

    <!-- Per-squad role depth table -->
    ${G.squads.length === 0 ? `<div style="color:var(--text-dim);font-size:9px;padding:12px 0">${tr("depthchart.noSquads")}</div>` : ''}
    ${G.squads.map(sq => _squadDepthTable(sq)).join('')}

    <!-- Roster tier summary -->
    <div style="margin-top:16px;background:var(--surface);border:1px solid var(--border);padding:13px">
      <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">Full Roster — Tier Summary</div>
      ${tiers.map(t => `
        <div class="depth-tier" style="margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">
            <div style="font-size:8px;color:var(--text-hi);min-width:56px">${t.label}</div>
            <div style="font-size:8px;color:var(--text-dim)">
              ${t.all.length} total ·
              <span style="color:var(--green)">${t.available.length} ready</span>
              ${t.onMission.length ? ` · <span style="color:var(--orange)">${t.onMission.length} deployed</span>` : ''}
              ${t.injured.length ? ` · <span style="color:var(--red)">${t.injured.length} injured</span>` : ''}
            </div>
          </div>
          ${t.all.length > 0 ? `<div class="depth-row">
            ${t.available.map(s => _slotHtml(s, 'available')).join('')}
            ${t.onMission.map(s => _slotHtml(s, 'on-mission')).join('')}
            ${t.injured.map(s => _slotHtml(s, 'injured')).join('')}
            ${t.onExam.map(s => _slotHtml(s, 'exam')).join('')}
          </div>` : `<div style="border:1px dashed var(--border);padding:6px 10px;font-size:8px;color:var(--text-dim)">No ${t.label} on roster</div>`}
        </div>
      `).join('')}
    </div>

    <!-- Academy pipeline -->
    <div style="background:var(--surface);border:1px solid var(--border);padding:13px;margin-top:10px">
      <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px">Academy Pipeline → Initiate</div>
      <div style="font-size:9px;color:var(--text-dim);margin-bottom:6px">
        ${(G.intakeClass||[]).length} students enrolled
        ${graduating.length > 0 ? ` · <span style="color:var(--green)">↑ ${graduating.length} graduating soon</span>` : ''}
      </div>
      ${(G.intakeClass||[]).length === 0 ? `<div style="font-size:9px;color:var(--text-dim)">${tr("depthchart.noStudents")}</div>` : `
        <div class="depth-row">
          ${(G.intakeClass||[]).map(s => {
            const mLeft = 12 - (s.monthsInClass || s.monthsEnrolled || 0)
            return `<div class="depth-slot ${mLeft <= 2 ? 'available' : 'incoming'}">
              <div style="font-size:9px;color:var(--text-hi)">${s.fn} ${s.ln}</div>
              <div style="font-size:7px;color:var(--text-dim);margin-top:2px">${mLeft}mo to grad</div>
              ${s.devCurveRevealed && s.devCurve ? `<div style="font-size:7px;color:var(--gold)">${s.devCurve}</div>` : ''}
            </div>`
          }).join('')}
        </div>
      `}
    </div>
  `
}

function _squadDepthTable(sq) {
  const entry = ensureDepthEntry(sq.id)
  const available = G.shinobi.filter(s => s.status === 'available' && !G.squads.some(q => q.id !== sq.id && q.members.includes(s.id)))

  return `
    <div style="background:var(--surface);border:1px solid var(--border);padding:13px;margin-bottom:10px">
      <div style="font-size:10px;color:var(--gold);font-weight:bold;margin-bottom:10px">${sq.n} — Depth Chart</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">
        ${SQUAD_ROLES.map(role => {
          const slot = entry[role.id] || { starter: null, backup: null, emergency: null, locked: false }
          const gap = (G.depthGaps || []).find(g => g.squadId === sq.id && g.roleId === role.id)
          const activeId = resolveActiveShinobi(sq.id, role.id)
          const promotionRule = slot.promotionRule || 'auto'
          const ruleColor = { auto:'#87ceeb', seniority:'#c9a84c', power:'#f0a030', manual:'#888' }[promotionRule]
          return `
            <div style="border:1px solid ${gap?.severity === 'critical' ? 'var(--red)' : gap?.severity === 'warn' ? 'var(--orange)' : 'var(--border)'};padding:7px;min-height:120px">
              <div style="font-size:8px;color:${role.color};font-weight:bold;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center">
                <span>${role.icon} ${role.n}</span>
                ${role.missionBonus || role.riskReduction || role.injReduction ? `<span style="font-size:7px;color:var(--text-dim)" title="${role.desc}">+${Math.round((role.missionBonus||role.riskReduction||0)*100)}%</span>` : ''}
              </div>
              <div style="margin-bottom:5px">
                <select onchange="setPromotionRule('${sq.id}','${role.id}',this.value)"
                  style="font-size:6px;background:var(--surface-2);border:1px solid ${ruleColor};color:${ruleColor};width:100%;padding:1px 2px;border-radius:2px">
                  ${['auto','seniority','power','manual'].map(r =>
                    `<option value="${r}" ${promotionRule===r?'selected':''}>${r.charAt(0).toUpperCase()+r.slice(1)}</option>`
                  ).join('')}
                </select>
              </div>
              ${activeId ? (() => {
                const active = G.shinobi.find(s => s.id === activeId)
                return active ? `<div style="font-size:7px;color:var(--green);margin-bottom:4px">▶ ${active.fn} ${active.ln}</div>` : ''
              })() : `<div style="font-size:7px;color:var(--red);margin-bottom:4px">▶ No active starter</div>`}
              ${['starter','backup','emergency'].map(slotKey => {
                const sid = slot[slotKey]
                const s = sid ? G.shinobi.find(x => x.id === sid) : null
                const statusColor = s ? (s.status === 'available' ? 'var(--green)' : s.status === 'injured' ? 'var(--red)' : 'var(--orange)') : 'var(--text-dim)'
                const slotLabel = slotKey === 'starter' ? 'S' : slotKey === 'backup' ? 'B' : 'E'
                return `
                  <div style="margin-bottom:4px">
                    <div style="font-size:7px;color:var(--text-dim);margin-bottom:2px">${slotKey.toUpperCase()}</div>
                    ${s ? `
                      <div style="font-size:8px;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.fn} ${s.ln}</div>
                      <div style="font-size:7px;color:${statusColor}">${s.status}</div>
                      <button onclick="clearDepthSlot('${sq.id}','${role.id}','${slotKey}')" style="font-size:6px;background:none;border:1px solid var(--border);color:var(--text-dim);padding:1px 4px;cursor:pointer;margin-top:2px">✕</button>
                    ` : `
                      <select onchange="setDepthSlot('${sq.id}','${role.id}','${slotKey}',this.value)" style="font-size:7px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);width:100%;padding:2px">
                        <option value="">— assign —</option>
                        ${available.map(s => `<option value="${s.id}">${s.fn} ${s.ln} (P${sPow(s)})</option>`).join('')}
                      </select>
                    `}
                  </div>`
              }).join('')}
            </div>
          `
        }).join('')}
      </div>
    </div>
  `
}

function _slotHtml(s, cls) {
  const { PHASE_META } = window._phaseMeta || {}
  const statAvg = s.stats ? Math.round(Object.values(s.stats).reduce((a,b)=>a+b,0)/Object.values(s.stats).length) : 0
  const statusLabel = { available: '', 'on-mission': 'deployed', injured: `${s.injDays||0}mo`, exam: 'exam' }[cls] || ''
  const statusColor = { available: 'var(--green)', 'on-mission': 'var(--orange)', injured: 'var(--red)', exam: 'var(--gold)' }[cls]
  const phaseColors = { developing:'var(--blue)', prime:'var(--green)', veteran:'var(--gold)', declining:'var(--red)' }
  const phaseIcons  = { developing:'↑', prime:'★', veteran:'◆', declining:'↓' }
  const phase = s.phase || 'prime'
  return `
    <div class="depth-slot ${cls}" title="${s.fn} ${s.ln}" oncontextmenu="return depCtx(event,'${s.id}')" onmousemove="depHover(event,'${s.id}')" onmouseleave="hideHoverPreview()">
      <div style="font-size:9px;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.fn} ${s.ln}</div>
      <div style="font-size:7px;color:var(--text-dim);margin-top:2px">Avg: ${statAvg}</div>
      <div style="font-size:7px;color:${phaseColors[phase]};margin-top:1px">${phaseIcons[phase]} ${phase}</div>
      ${statusLabel ? `<div style="font-size:7px;color:${statusColor};margin-top:1px">${statusLabel}</div>` : ''}
    </div>`
}

// ── Exposed actions ────────────────────────────────────────────────────────────
export function setDepthSlot(squadId, roleId, slot, shinobiId) {
  assignDepthSlot(squadId, roleId, slot, shinobiId || null)
  rDep()
}

export function clearDepthSlot(squadId, roleId, slot) {
  assignDepthSlot(squadId, roleId, slot, null)
  rDep()
}

export function setPromotionRule(squadId, roleId, rule) {
  const entry = ensureDepthEntry(squadId)
  if (!entry[roleId]) return
  entry[roleId].promotionRule = rule
  rDep()
}

export function emergencyCallUp(studentId) {
  const s = (G.intakeClass || []).find(x => x.id === studentId)
  if (!s) { ntf(tr('toast.depthchart.studentNotFound')); return }
  if (G.ryo < 0) { ntf(tr('toast.depthchart.treasuryEmpty')); return }
  // Graduate early
  s.status = 'available'; s.ri = 0; s.salary = 500; s.wins = 0; s.winsB = 0; s.winsS = 0
  s.streak = 0; s.injDays = 0; s.missId = null; s.months = 0
  G.shinobi.push({ ...s })
  G.intakeClass = G.intakeClass.filter(x => x.id !== studentId)
  aL(tr('toast.depthchart.calledUp', { name: `${s.fn} ${s.ln}` }), 'warn')
  ntf(tr('toast.depthchart.calledUpShort', { name: `${s.fn} ${s.ln}` }))
  evalDepth(G)
  rDep()
}
