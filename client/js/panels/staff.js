import { G, ui, fmt, sn, rnd, pk, clamp, mStaff, genStaffCandidates } from '../state.js'
import { STAFF_ROLES, RANKS, FNAMES, LNAMES, STAFF_CONFLICT_RESPONSES } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { hvMeterHtml, openContextMenu, showHoverPreview, hideHoverPreview, hvInspectorHeadHtml, hvKeyNav } from '../uikit.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { staffTitle, xpForStaffLevel, STAFF_MAX_LEVEL } from '../../../shared/utils/staffDev.js'

// Right-click a staff card → verb menu (P1 entity grammar).
export function staffCtx(e, id) {
  e.preventDefault()
  const st = (G.staff || []).find(x => x.id === id); if (!st) return false
  const canBeAK = (st.monthsServed || 0) >= 12 && !st.asstKage && !(G.staff || []).some(x => x.asstKage)
  const canMeet = (st.monthsServed || 0) >= 6 && st.hiddenFlaw && !st.flawRevealed
  const items = [{ label: 'Inspect', fn: () => window.staffSelect && window.staffSelect(id) }]
  if (canBeAK) items.push({ label: 'Designate Asst. Warden', fn: () => window.designateAsstKage && window.designateAsstKage(id) })
  if (st.asstKage) items.push({ label: 'Remove Asst. Warden', fn: () => window.designateAsstKage && window.designateAsstKage(null) })
  if (canMeet) items.push({ label: '1-on-1 Meeting', fn: () => window.staffPersonalMeeting && window.staffPersonalMeeting(id) })
  if (items.length) items.push({ separator: true })
  items.push({ label: 'Release', danger: true, fn: () => { if (confirm(`Release ${st.fn} ${st.ln}? This cannot be undone.`)) window.releaseStaff && window.releaseStaff(id) } })
  openContextMenu(e.clientX, e.clientY, items)
  return false
}

export function staffHover(e, id) {
  const st = (G.staff || []).find(x => x.id === id); if (!st) return
  const role = STAFF_ROLES.find(r => r.id === st.role)
  const yrs = Math.floor((st.monthsServed || 0) / 12)
  const row = (k, v) => `<div class="hp-row"><span>${k}</span><b>${v}</b></div>`
  const stats = Object.entries(st.stats || {}).map(([k, v]) => `${k.slice(0, 3)} ${v}`).join(' · ')
  showHoverPreview(e.clientX, e.clientY, `
    <div class="hp-name">${st.fn} ${st.ln}${st.asstKage ? ' ★' : ''}</div>
    <div class="hp-sub">${role?.n || st.role} · ${yrs > 0 ? yrs + 'yr ' : ''}${st.monthsServed}mo</div>
    ${row('Rating', st.rating)}${row('Salary', fmt(st.salary) + '/mo')}
    ${row('Ambition', (st.ambition || 0) >= 14 ? 'High' : (st.ambition || 0) >= 10 ? 'Moderate' : 'Low')}
    ${st.hiddenFlaw && st.flawRevealed ? row('Flaw', st.hiddenFlaw) : ''}
    <div class="hp-row" style="margin-top:4px"><span style="font-size:var(--fs-micro);color:var(--text-faint)">${stats}</span></div>`)
}

let _hireRoleId = null
let _hireCandidates = []
let _scoutedIdx = null  // index of candidate being previewed after scouting

window._staffTab = 'roster'

export function staffTab(t) { window._staffTab = t; rSt() }

export function rSt() {
  const el = document.getElementById('stfl')
  if (!el) return

  const tabs = ['roster', 'legacy']
  const tabLabels = { roster: 'Staff Roster', legacy: 'Hall of Fame' }
  const conflictBadge = G.staffConflict ? 1 : 0
  const poachBadge = G.staffPoachOffer ? 1 : 0
  const badge = conflictBadge + poachBadge

  const inspScroll = document.getElementById('stf-inspector')?.scrollTop || 0
  let html = `<div class="tabs">
    ${tabs.map(t => `<button class="tab${window._staffTab===t?' active':''}" onclick="staffTab('${t}')">${tabLabels[t]}${t==='roster'&&badge>0?' ('+badge+')':''}</button>`).join('')}
  </div>
  ${window._staffTab === 'roster' ? _rosterTab() : _legacyTab()}`

  el.innerHTML = html
  if (window._staffTab === 'roster') {
    _renderStaffInspector()
    const insp = document.getElementById('stf-inspector'); if (insp && inspScroll) insp.scrollTop = inspScroll
  }
}

// ── Slot board + inspector (VISUAL_OVERHAUL §3.3) ───────────────────────────
// Every role slot is a row, filled or vacant, grouped Command / Field. The
// inspector holds the person's file — or, for a vacancy, the role and a Hire.
const _SECTIONS = [
  { sec: 'Command', roles: ['head_sensei','anbu_cmdr','council','treasurer','strategist'] },
  { sec: 'Field', roles: ['head_scout','team_sensei','scout_jonin','medical'] },
]
const _band = v => v >= 80 ? 5 : v >= 65 ? 4 : v >= 50 ? 3 : v >= 35 ? 2 : 1
const _ambition = s => (s.ambition||0) >= 14 ? ['High', 'var(--orange)'] : (s.ambition||0) >= 10 ? ['Moderate', 'var(--gold)'] : ['Low', 'var(--text-dim)']
function _slotRows() {
  const rows = []
  _SECTIONS.forEach(({ sec, roles }) => {
    rows.push({ group: sec })
    roles.forEach(roleId => {
      const role = STAFF_ROLES.find(r => r.id === roleId); if (!role) return
      const holders = (G.staff || []).filter(x => x.role === roleId)
      holders.forEach(h => rows.push({ id: h.id, role, staff: h }))
      for (let i = holders.length; i < role.max; i++) rows.push({ id: 'vacant:' + roleId + ':' + i, role, staff: null })
    })
  })
  return rows
}
function _slotRowHtml(r) {
  if (r.group) return `<tr class="hv-group"><td colspan="8">${r.group}</td></tr>`
  const sel = ui.staffSel === r.id ? ' class="sel"' : ''
  const role = r.role, s = r.staff
  if (!s) return `<tr data-id="${r.id}"${sel} onclick="staffSelect('${r.id}')">
    <td><span style="color:var(--text-dim);white-space:nowrap">${role.n}</span></td>
    <td colspan="6"><span style="color:var(--text-faint);font-style:italic">— Vacant —</span></td>
    <td class="ctr"><button class="gb" onclick="event.stopPropagation();openStaffHire('${role.id}')" style="padding:2px 8px;font-size:var(--fs-micro)">${tr('staff.hire')}</button></td>
  </tr>`
  const lvl = s.staffLevel || 1
  const yrs = Math.floor((s.monthsServed || 0) / 12)
  const [ambL, ambC] = _ambition(s)
  const flags = [s.asstKage ? '<span style="color:var(--blue)" title="Assistant Warden">★</span>' : '', s.hiddenFlaw && s.flawRevealed ? `<span style="color:var(--orange)" title="${s.hiddenFlaw}">⚠</span>` : '', s.fromShinobi ? '<span style="color:var(--gold)" title="Transitioned from active duty">↳</span>' : ''].filter(Boolean).join(' ')
  return `<tr data-id="${r.id}"${sel} onclick="staffSelect('${r.id}')" oncontextmenu="return staffCtx(event,'${s.id}')" onmousemove="staffHover(event,'${s.id}')" onmouseleave="hideHoverPreview()">
    <td><span style="color:var(--text-dim);white-space:nowrap">${role.n}</span></td>
    <td><div class="hv-cell-name">${s.fn} ${s.ln}</div></td>
    <td class="num"><span class="hv-attr b${_band(s.rating)}">${s.rating}</span></td>
    <td><span style="color:var(--green);white-space:nowrap">◆ ${staffTitle(lvl)}${lvl >= STAFF_MAX_LEVEL ? '' : ' L' + lvl}</span></td>
    <td class="num"><span style="color:var(--text-dim)">${yrs > 0 ? yrs + 'y ' : ''}${(s.monthsServed || 0) % 12}m</span></td>
    <td class="num"><span style="color:var(--text-faint)">${fmt(s.salary)}</span></td>
    <td><span style="color:${ambC}">${ambL}</span></td>
    <td class="ctr">${flags}</td>
  </tr>`
}
export function staffSelect(id) {
  ui.staffSel = ui.staffSel === id ? null : id
  document.querySelectorAll('#stfl .hv-table tbody tr[data-id]').forEach(r => r.classList.toggle('sel', r.dataset.id === ui.staffSel))
  _renderStaffInspector()
}
function _renderStaffInspector() {
  const el = document.getElementById('stf-inspector'); if (!el) return
  const grid = el.closest('.hv-split')
  const row = ui.staffSel ? _slotRows().find(r => r.id === ui.staffSel) : null
  if (!row) {
    ui.staffSel = null
    grid?.classList.remove('has-sel')
    el.innerHTML = `<div class="hv-inspector-hint">${tr('staff.inspect.hint')}</div>`
    return
  }
  grid?.classList.add('has-sel')
  const close = `<button class="gb" onclick="staffSelect('${row.id}')" title="Close (Esc)" aria-label="Close">×</button>`
  const role = row.role, s = row.staff
  if (!s) {
    el.innerHTML = hvInspectorHeadHtml({ name: role.n, sub: 'Vacant', actions: close }) + `<div class="hv-inspector-body">
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:6px">${role.desc}</div>
      <div style="font-size:var(--fs-small);color:var(--gold);font-style:italic;margin-bottom:12px">${role.effectDesc}</div>
      <button class="gb gb-g" onclick="openStaffHire('${role.id}')">${tr('staff.hire')} ▸</button>
    </div>`
    return
  }
  const lvl = s.staffLevel || 1, need = xpForStaffLevel(lvl)
  const pct = lvl >= STAFF_MAX_LEVEL ? 100 : Math.min(100, Math.round((s.staffXp || 0) / need * 100))
  const yrs = Math.floor((s.monthsServed || 0) / 12)
  const [ambL, ambC] = _ambition(s)
  const canBeAK = (s.monthsServed || 0) >= 12 && !s.asstKage && !(G.staff||[]).some(x => x.asstKage)
  const canMeet = (s.monthsServed || 0) >= 6 && s.hiddenFlaw && !s.flawRevealed
  el.innerHTML = hvInspectorHeadHtml({
    name: `${s.fn} ${s.ln}${s.asstKage ? ' <span style="color:var(--blue);font-size:var(--fs-small)">★ Asst. Warden</span>' : ''}`,
    sub: `${role.n} · ${yrs > 0 ? yrs + 'yr ' : ''}${s.monthsServed || 0}mo · ${fmt(s.salary)}/mo`,
    actions: close,
  }) + `<div class="hv-inspector-body">
    <div class="sect">Craft</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin-bottom:10px">
      ${Object.entries(s.stats || {}).map(([k, v]) => `<div style="text-align:center;background:var(--bg);padding:4px 3px">
        <div style="font-size:var(--fs-micro);color:var(--text-faint);text-transform:uppercase;letter-spacing:1px;margin-bottom:1px">${k.slice(0,5)}</div>
        <div style="font-size:var(--fs-lead);font-family:var(--font-num);color:${v>=15?'var(--gold)':v>=10?'var(--green)':'var(--text-dim)'};font-weight:bold">${v}</div>
      </div>`).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;font-size:var(--fs-small);margin-bottom:3px"><span style="color:var(--text-dim)">Rating <b style="color:var(--gold)">${s.rating}</b></span><span style="color:var(--green)">◆ ${staffTitle(lvl)}${lvl >= STAFF_MAX_LEVEL ? ' (max)' : ' L' + lvl}</span></div>
    ${hvMeterHtml({ bare: true, value: pct, color: 'var(--green)', style: 'margin-bottom:10px' })}
    <div style="font-size:var(--fs-small);color:${ambC};margin-bottom:4px">${ambL} ambition${(s.ambition||0)>=14&&role.id==='team_sensei'?' — watching for a head sensei opening':''}</div>
    ${s.hiddenFlaw && s.flawRevealed ? `<div style="font-size:var(--fs-small);color:var(--orange);margin-bottom:4px">⚠ ${s.hiddenFlaw}</div>` : ''}
    ${s.institutional > 0 ? `<div style="font-size:var(--fs-small);color:var(--purple);margin-bottom:4px">Legacy bonus: +${s.institutional} to next hire</div>` : ''}
    ${s.fromShinobi ? `<div style="font-size:var(--fs-small);color:var(--gold);margin-bottom:4px">↳ Transitioned from active duty</div>` : ''}
    <div class="sect" style="margin-top:12px">Role</div>
    <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:4px">${role.desc}</div>
    <div style="font-size:var(--fs-small);color:var(--gold);font-style:italic;margin-bottom:12px">${role.effectDesc}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      ${canBeAK ? `<button class="gb" onclick="designateAsstKage('${s.id}')" style="border-color:var(--blue);color:var(--blue)">${tr("staff.designateAK")}</button>` : ''}
      ${s.asstKage ? `<button class="gb" onclick="designateAsstKage(null)">${tr("staff.removeAK")}</button>` : ''}
      ${canMeet ? `<button class="gb" onclick="staffPersonalMeeting('${s.id}')" style="border-color:var(--gold);color:var(--gold)">${tr("staff.meeting")}</button>` : ''}
      <button class="gb gb-r" onclick="confirm('Release ${s.fn} ${s.ln}? This cannot be undone.') && releaseStaff('${s.id}')">${tr("staff.release")}</button>
    </div>
  </div>`
}
hvKeyNav({
  isActive: () => ui.CP === 'staff' && window._staffTab === 'roster',
  rows: '#stfl .hv-table tbody tr[data-id]',
  selected: () => ui.staffSel,
  select: id => { ui.staffSel = null; staffSelect(id) },
  close: () => staffSelect(ui.staffSel),
})

function _rosterTab() {
  let html = ''

  // ── Active alerts ─────────────────────────────────────────────────────────
  if (G.staffConflict) {
    const hs = (G.staff||[]).find(x => x.id === G.staffConflict.headSenseiId)
    const ts = (G.staff||[]).find(x => x.id === G.staffConflict.teamSenseiId)
    if (hs && ts) {
      html += `<div style="border:1px solid var(--red);background:#1a0a0a;padding:10px;margin-bottom:14px">
        <div style="font-size:var(--fs-body);color:var(--red);font-weight:bold;margin-bottom:4px">⚠ STAFF CONFLICT — Mediation Required</div>
        <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:8px">${hs.fn} ${hs.ln} (Head Sensei) and ${ts.fn} ${ts.ln} (Team Sensei) have reached a breaking point.</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${STAFF_CONFLICT_RESPONSES.map(r => `<button class="gb" style="font-size:var(--fs-micro);border-color:${r.id==='back_head'?'var(--blue)':r.id==='back_team'?'var(--gold)':'var(--green)'};color:${r.id==='back_head'?'var(--blue)':r.id==='back_team'?'var(--gold)':'var(--green)'}" onclick="resolveStaffConflict('${r.id}')">${r.n} ▸</button>`).join('')}
        </div>
      </div>`
    }
  }

  if (G.staffPoachOffer) {
    const offer = G.staffPoachOffer
    html += `<div style="border:1px solid var(--orange);background:#1a1205;padding:10px;margin-bottom:14px">
      <div style="font-size:var(--fs-body);color:var(--orange);font-weight:bold;margin-bottom:4px">⚠ RIVAL RECRUITMENT OFFER — Expires Month ${offer.expiresMonth}</div>
      <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:8px">${offer.village} is offering ${offer.staffName} a position. Respond before they accept.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="gb gb-g" onclick="matchPoachOffer()" style="font-size:var(--fs-micro)">Match Offer (${fmt(offer.matchCost)} ryo retention bonus) ▸</button>
        <button class="gb" onclick="confirm('Let ${offer.staffName} go to ${offer.village}?') && dismissPoachOffer('let')" style="font-size:var(--fs-micro);border-color:var(--green);color:var(--green)">Let Them Go ▸</button>
        <button class="gb gb-r" onclick="confirm('Block ${offer.village}? This costs −10 relations.') && dismissPoachOffer('block')" style="font-size:var(--fs-micro)">Block (−10 rel with ${offer.village}) ▸</button>
      </div>
    </div>`
  }

  // ── Slot board ─────────────────────────────────────────────────────────────
  const slots = _slotRows()
  const filled = slots.filter(r => r.staff).length, total = slots.filter(r => !r.group).length
  html += `<div class="hv-split" style="margin-bottom:16px">
    <div>
      <div class="ros-toolbar">
        <div class="sect" style="margin:0">Staff <span style="color:var(--text-faint)">— ${filled} of ${total} posts filled · ${fmt((G.staff||[]).reduce((a, s) => a + (s.salary || 0), 0))}/mo</span></div>
        <span class="ros-legend">right-click a person for actions</span>
      </div>
      <table class="hv-table">
        <thead><tr><th>Post</th><th>Name</th><th class="num">Rating</th><th>Mastery</th><th class="num">Tenure</th><th class="num">Salary</th><th>Ambition</th><th class="ctr"></th></tr></thead>
        <tbody>${slots.map(_slotRowHtml).join('')}</tbody>
      </table>
    </div>
    <aside class="hv-inspector" id="stf-inspector" aria-label="Inspector"></aside>
  </div>`

  // ── Retire to Staff ───────────────────────────────────────────────────────
  html += `<div class="pt" style="margin-top:14px">${tr("staff.retireToStaff")}</div>
    <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:8px">Shinobi with 20+ wins can transition to a staff role upon retirement.</div>`
  const eligible = G.shinobi.filter(s => s.wins >= 20 && s.ri >= 2)
  if (eligible.length === 0) {
    html += `<div style="font-size:var(--fs-small);color:var(--text-faint);font-style:italic">No eligible shinobi — requires Veteran+ with 20+ wins.</div>`
  } else {
    eligible.forEach(s => {
      html += `<div style="border:1px solid var(--border);padding:8px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:var(--fs-body);color:var(--text-hi)">${sn(s)}</div>
          <div style="font-size:var(--fs-small);color:var(--text-dim)">${RANKS[s.ri]} · ${s.wins} wins · Power ${Math.round(Object.values(s.stats).reduce((a,b)=>a+b,0)/6)}</div>
        </div>
        <button class="gb gb-g" onclick="openRetireToStaff('${s.id}')" style="font-size:var(--fs-micro);padding:3px 7px">Retire ▸</button>
      </div>`
    })
  }

  // ── Assistant Warden log ────────────────────────────────────────────────────
  const akLog = G.asstKageLog || []
  if (akLog.length > 0) {
    html += `<div class="pt" style="margin-top:14px">${tr("staff.akDecisions")}</div>
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:6px">${tr("staff.akAutonomous")}</div>`
    html += akLog.slice(0, 8).map(entry =>
      `<div style="font-size:var(--fs-small);color:var(--text-dim);border-left:2px solid var(--border);padding:4px 8px;margin-bottom:4px"><span style="color:var(--text-faint)">Yr${entry.year}·M${entry.month}</span> ${entry.text}</div>`
    ).join('')
  }

  return html
}

function _legacyTab() {
  const hof = G.staffHallOfFame || []
  if (hof.length === 0) {
    return `<div style="color:var(--text-faint);text-align:center;padding:40px;font-size:.85rem">No inductees yet. Staff who serve 8+ years before retiring earn a permanent legacy entry.</div>`
  }
  let html = `<div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:10px">${tr("staff.hallNote")}</div>`
  html += hof.map(entry => {
    const roleDef = STAFF_ROLES.find(r => r.id === entry.role)
    return `<div class="surf" style="border:1px solid var(--border);background:var(--surface);padding:11px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:var(--fs-lead);color:var(--gold);font-weight:bold">${entry.fn} ${entry.ln}</div>
          <div style="font-size:var(--fs-body);color:var(--text-dim);margin-top:2px">${roleDef?.n || entry.role} · ${entry.yearsServed} years of service · Peak Rating ${entry.peakRating}</div>
          <div style="font-size:var(--fs-small);color:var(--text-faint);margin-top:2px">Inducted Year ${entry.year}${entry.fromShinobi ? ' · Transitioned from active duty' : ''}</div>
        </div>
        <div style="font-size:var(--fs-sub);color:var(--gold)">⭐</div>
      </div>
    </div>`
  }).join('')
  return html
}

export function openStaffHire(roleId) {
  _hireRoleId = roleId
  _scoutedIdx = null
  const legacy = (G.staff || []).filter(st => st.role === roleId && st.institutional > 0)
  const legacyBoost = legacy.reduce((a, st) => a + st.institutional, 0)
  _hireCandidates = genStaffCandidates(roleId, 3).map(c => {
    if (legacyBoost > 0) {
      Object.keys(c.stats).forEach(k => { c.stats[k] = clamp(c.stats[k] + legacyBoost, 1, 20) })
      c.rating = Math.round(Object.values(c.stats).reduce((a,b)=>a+b,0)/Object.keys(c.stats).length)
      c.salary = Math.round(STAFF_ROLES.find(r=>r.id===roleId)?.salBase * (0.7 + c.rating * 0.04))
    }
    return c
  })
  const roleDef = STAFF_ROLES.find(r => r.id === roleId)
  document.getElementById('sh-title').textContent = 'Hire ' + roleDef?.n
  document.getElementById('sh-desc').textContent = roleDef?.desc + (legacyBoost > 0 ? ' (Legacy bonus: +' + legacyBoost + ' to all stats)' : '')
  _renderHireCandidates()
  document.getElementById('ov-staffhire').classList.add('open')
}

function _renderHireCandidates() {
  const list = document.getElementById('sh-candidates')
  if (!list) return
  list.innerHTML = _hireCandidates.map((c, i) => {
    const statEntries = Object.entries(c.stats)
    const scouted = c.flawRevealed
    return `<div style="border:1px solid ${scouted?'var(--blue)':'var(--border)'};background:var(--bg);padding:10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
        <span style="font-size:var(--fs-body);color:var(--text-hi);font-weight:bold">${c.fn} ${c.ln}</span>
        <span style="font-size:var(--fs-body);color:var(--gold)">Rating ${c.rating} · ${fmt(c.salary)}/mo</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin-bottom:7px">
        ${statEntries.map(([k,v]) => `<div style="text-align:center;background:var(--sunken);padding:3px">
          <div style="font-size:var(--fs-micro);color:var(--text-faint);text-transform:uppercase">${k.slice(0,5)}</div>
          <div style="font-size:var(--fs-body);color:${v>=15?'var(--gold)':v>=10?'var(--green)':'var(--text-dim)'};font-weight:bold">${v}</div>
        </div>`).join('')}
      </div>
      ${scouted && c.hiddenFlaw ? `<div style="font-size:var(--fs-small);color:var(--red-soft);margin-bottom:6px;padding:4px 6px;border:1px solid var(--red);background:#0d0505">⚠ Scout Report: Hidden flaw detected — "${c.hiddenFlaw}"</div>` : ''}
      ${scouted && !c.hiddenFlaw ? `<div style="font-size:var(--fs-small);color:var(--green);margin-bottom:6px;padding:4px 6px;border:1px solid #1a3a1a;background:#050d05">✓ Scout Report: No concerns — well-regarded by former colleagues.</div>` : ''}
      <div style="display:flex;gap:6px">
        <button class="gb gb-g" onclick="doStaffHire(${i})" style="font-size:var(--fs-micro)">${tr("staff.hire")}</button>
        ${!scouted ? `<button class="gb" onclick="scoutStaffCandidate(${i})" style="font-size:var(--fs-micro);border-color:var(--blue);color:var(--blue)">${tr("staff.scout")}</button>` : ''}
      </div>
    </div>`
  }).join('')
}

export function scoutStaffCandidate(idx) {
  if (G.ryo < 2000) { ntf(tr('toast.common.notEnoughRyoNeed', { need: '2,000' })); return }
  const c = _hireCandidates[idx]
  if (!c || c.flawRevealed) return
  G.ryo -= 2000
  c.flawRevealed = true  // mark as scouted — flaw (or lack thereof) is now visible
  if (c.hiddenFlaw && Math.random() > 0.70) {
    // 30% chance to miss the flaw even with a scout
    c.hiddenFlaw = null
    aL(tr('toast.staff.scoutClean', { name: `${c.fn} ${c.ln}` }), 'neutral')
  } else if (c.hiddenFlaw) {
    aL(tr('toast.staff.scoutFlaw', { name: `${c.fn} ${c.ln}`, flaw: c.hiddenFlaw }), 'warn')
  } else {
    aL(tr('toast.staff.scoutCleanRecord', { name: `${c.fn} ${c.ln}` }), 'good')
  }
  upUI()
  _renderHireCandidates()
}

export function doStaffHire(idx) {
  const candidate = _hireCandidates[idx]
  if (!candidate || !_hireRoleId) return
  if (!G.staff) G.staff = []
  const roleDef = STAFF_ROLES.find(r => r.id === _hireRoleId)
  const current = G.staff.filter(st => st.role === _hireRoleId)
  if (current.length >= (roleDef?.max || 1)) {
    ntf(tr('toast.staff.noOpenSlotsFor', { role: roleDef?.n }))
    cm('staffhire')
    return
  }
  G.staff.filter(st => st.role === _hireRoleId).forEach(st => { st.institutional = 0 })
  G.staff.push(candidate)
  aL(tr('toast.staff.hired', { name: `${candidate.fn} ${candidate.ln}`, role: roleDef?.n, rating: candidate.rating }), 'good')
  ntf(tr('toast.staff.joins', { name: candidate.fn, role: roleDef?.n }))
  cm('staffhire')
  upUI()
}

export function releaseStaff(staffId) {
  if (!G.staff) return
  const st = G.staff.find(x => x.id === staffId)
  if (!st) return
  G.staff = G.staff.filter(x => x.id !== staffId)
  aL(tr('toast.staff.released', { name: `${st.fn} ${st.ln}` }), 'neutral')
  upUI(); rSt()
}

export function designateAsstKage(staffId) {
  if (!G.staff) return
  // Clear existing AK
  G.staff.forEach(st => { st.asstKage = false })
  if (staffId) {
    const st = G.staff.find(x => x.id === staffId)
    if (st) {
      st.asstKage = true
      aL(tr('toast.staff.akDesignated', { name: `${st.fn} ${st.ln}` }), 'good')
      ntf(tr('toast.staff.akNow', { name: st.fn }))
    }
  } else {
    aL(tr('toast.staff.akRemoved'), 'neutral')
  }
  upUI(); rSt()
}

export function resolveStaffConflict(choice) {
  if (!G.staffConflict) return
  const hs = (G.staff||[]).find(x => x.id === G.staffConflict.headSenseiId)
  const ts = (G.staff||[]).find(x => x.id === G.staffConflict.teamSenseiId)

  if (choice === 'back_head') {
    if (ts) {
      // Team sensei leaves
      G.staff = G.staff.filter(x => x.id !== ts.id)
      aL(tr('toast.staff.backedHead', { name: `${ts.fn} ${ts.ln}` }), 'warn')
      ntf(tr('toast.staff.resigned', { name: ts.fn }))
      addChronicle('Staff Conflict Resolution', 'Backed Head Sensei — ' + ts.fn + ' ' + ts.ln + ' resigned.', 'staff')
    }
  } else if (choice === 'back_team') {
    if (hs) {
      hs.stats && Object.keys(hs.stats).forEach(k => { hs.stats[k] = Math.max(1, hs.stats[k] - 1) })
      hs.rating = Math.max(1, hs.rating - 1)
      aL(tr('toast.staff.backedTeam', { name: `${hs.fn} ${hs.ln}` }), 'warn')
      addChronicle('Staff Conflict Resolution', 'Backed Team Sensei — Head Sensei ' + hs.fn + ' ' + hs.ln + ' demotivated.', 'staff')
    }
  } else if (choice === 'restructure') {
    if (G.ryo < 5000) { ntf(tr('toast.staff.notEnoughRestructure')); return }
    G.ryo -= 5000
    // Both stay, slight harmony boost, mild stats loss
    if (hs) hs.stats && Object.keys(hs.stats).forEach(k => { hs.stats[k] = clamp(hs.stats[k] - 1, 1, 20) })
    G.harmonyScore = clamp((G.harmonyScore || 70) - 5, 0, 100)
    aL(tr('toast.staff.restructured'), 'neutral')
    addChronicle('Staff Conflict Resolution', 'Roles restructured — both staff remain. Tension lingers.', 'staff')
  }

  G.staffConflict = null
  upUI(); rSt()
}

export function matchPoachOffer() {
  if (!G.staffPoachOffer) return
  const offer = G.staffPoachOffer
  if (G.ryo < offer.matchCost) { ntf(tr('toast.common.notEnoughRyoNeed', { need: fmt(offer.matchCost) })); return }
  G.ryo -= offer.matchCost
  const st = (G.staff||[]).find(x => x.id === offer.staffId)
  if (st) {
    st.salary = Math.round(st.salary * 1.10)  // small permanent salary bump
    aL(tr('toast.staff.matchedPoach', { village: offer.village, name: offer.staffName, cost: fmt(offer.matchCost) }), 'good')
    ntf(tr('toast.staff.retained', { name: offer.staffName }))
  }
  G.staffPoachOffer = null
  upUI(); rSt()
}

export function dismissPoachOffer(mode) {
  if (!G.staffPoachOffer) return
  const offer = G.staffPoachOffer
  if (mode === 'let') {
    const st = (G.staff||[]).find(x => x.id === offer.staffId)
    if (st) {
      aL(tr('toast.staff.letGo', { name: offer.staffName, village: offer.village }), 'neutral')
      addChronicle('Staff Departure', offer.staffName + ' left for ' + offer.village + ' amicably.', 'staff')
      G.staff = G.staff.filter(x => x.id !== offer.staffId)
    }
  } else if (mode === 'block') {
    const v = G.villages.find(x => x.n === offer.village)
    if (v) v.rel = clamp(v.rel - 10, 0, 100)
    aL(tr('toast.staff.blocked', { village: offer.village }), 'warn')
  }
  G.staffPoachOffer = null
  upUI(); rSt()
}

export function openRetireToStaff(shinobiId) {
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!s) return
  document.getElementById('rts-title').textContent = 'Retire ' + sn(s) + ' to Staff'
  const avgStat = Math.round(Object.values(s.stats).reduce((a,b)=>a+b,0)/6)
  const derivedRating = Math.min(20, Math.round(avgStat / 5))

  const roles = STAFF_ROLES.filter(r => {
    const current = (G.staff || []).filter(st => st.role === r.id)
    return current.length < r.max
  })

  document.getElementById('rts-roles').innerHTML = roles.map(r => `
    <div class="pi" onclick="doRetireToStaff('${shinobiId}','${r.id}')">
      <div>
        <div style="font-size:var(--fs-body);color:var(--text-hi)">${r.n}</div>
        <div style="font-size:var(--fs-small);color:var(--text-dim)">${r.effectDesc}</div>
        <div style="font-size:var(--fs-small);color:var(--gold)">Est. rating: ${Math.max(5, derivedRating)} · Salary: ~${fmt(Math.round(r.salBase*(0.7+Math.max(5,derivedRating)*0.04)))}/mo</div>
      </div>
    </div>
  `).join('')

  document.getElementById('ov-retiretostaff').classList.add('open')
}

export function doRetireToStaff(shinobiId, roleId) {
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!s) return
  if (!G.staff) G.staff = []
  const roleDef = STAFF_ROLES.find(r => r.id === roleId)
  const current = G.staff.filter(st => st.role === roleId)
  if (current.length >= (roleDef?.max || 1)) { ntf(tr('toast.staff.noOpenSlots')); cm('retiretostaff'); return }

  const avgStat = Math.round(Object.values(s.stats).reduce((a,b)=>a+b,0)/6)
  const derivedRating = Math.max(5, Math.min(20, Math.round(avgStat / 5)))
  const staffMember = mStaff(roleId, derivedRating)
  staffMember.fn = s.fn
  staffMember.ln = s.ln
  staffMember.fromShinobi = shinobiId

  G.staff.push(staffMember)
  G.shinobi = G.shinobi.filter(x => x.id !== shinobiId)
  aL(tr('toast.staff.retiredToStaff', { name: sn(s), role: roleDef?.n, rating: derivedRating }), 'good')
  addChronicle('Staff Transition', sn(s) + ' transitioned to ' + roleDef?.n + ' after ' + s.wins + ' missions.', 'shinobi')
  cm('retiretostaff')
  upUI()
}

export function staffPersonalMeeting(staffId) {
  const st = (G.staff || []).find(x => x.id === staffId)
  if (!st || st.flawRevealed || !st.hiddenFlaw || (st.monthsServed || 0) < 6) return
  st.flawRevealed = true
  if (Math.random() < 0.65) {
    aL(tr('toast.staff.meetingFlaw', { name: `${st.fn} ${st.ln}`, flaw: st.hiddenFlaw }), 'warn')
    ntf(tr('toast.staff.flawRevealed', { name: `${st.fn} ${st.ln}` }))
  } else {
    st.hiddenFlaw = null
    aL(tr('toast.staff.meetingClear', { name: `${st.fn} ${st.ln}` }), 'good')
    ntf(tr('toast.staff.cleared', { name: `${st.fn} ${st.ln}` }))
  }
  rSt()
}

function addChronicle(title, body, type) {
  if (!G.chronicles) return
  G.chronicles.push({ year: G.year, month: G.month, title, body, type })
  if (G.chronicles.length > 80) G.chronicles.shift()
}
