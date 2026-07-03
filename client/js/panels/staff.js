import { G, fmt, sn, rnd, pk, clamp, mStaff, genStaffCandidates } from '../state.js'
import { STAFF_ROLES, RANKS, FNAMES, LNAMES, STAFF_CONFLICT_RESPONSES } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { openContextMenu, showHoverPreview, hideHoverPreview } from '../uikit.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { staffTitle, xpForStaffLevel, STAFF_MAX_LEVEL } from '../../../shared/utils/staffDev.js'

// Right-click a staff card → verb menu (P1 entity grammar).
export function staffCtx(e, id) {
  e.preventDefault()
  const st = (G.staff || []).find(x => x.id === id); if (!st) return false
  const canBeAK = (st.monthsServed || 0) >= 12 && !st.asstKage && !(G.staff || []).some(x => x.asstKage)
  const canMeet = (st.monthsServed || 0) >= 6 && st.hiddenFlaw && !st.flawRevealed
  const items = []
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
    <div class="hp-row" style="margin-top:4px"><span style="font-size:7px;color:#555">${stats}</span></div>`)
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

  let html = `<div style="display:flex;gap:6px;margin-bottom:14px">
    ${tabs.map(t => `<button onclick="staffTab('${t}')" style="background:${window._staffTab===t?'#2a2210':'#1a1a1a'};border:1px solid ${window._staffTab===t?'#c9a84c':'#333'};color:${window._staffTab===t?'#c9a84c':'#999'};border-radius:4px;padding:4px 10px;cursor:pointer;font-size:.78rem">${tabLabels[t]}${t==='roster'&&badge>0?' ('+badge+')':''}</button>`).join('')}
  </div>
  ${window._staffTab === 'roster' ? _rosterTab() : _legacyTab()}`

  el.innerHTML = html
}

function _rosterTab() {
  let html = ''

  // ── Active alerts ─────────────────────────────────────────────────────────
  if (G.staffConflict) {
    const hs = (G.staff||[]).find(x => x.id === G.staffConflict.headSenseiId)
    const ts = (G.staff||[]).find(x => x.id === G.staffConflict.teamSenseiId)
    if (hs && ts) {
      html += `<div style="border:1px solid #f44;background:#1a0a0a;padding:10px;margin-bottom:14px">
        <div style="font-size:9px;color:#f44;font-weight:bold;margin-bottom:4px">⚠ STAFF CONFLICT — Mediation Required</div>
        <div style="font-size:8px;color:#7a7060;margin-bottom:8px">${hs.fn} ${hs.ln} (Head Sensei) and ${ts.fn} ${ts.ln} (Team Sensei) have reached a breaking point.</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${STAFF_CONFLICT_RESPONSES.map(r => `<button class="gb" style="font-size:7px;border-color:${r.id==='back_head'?'#87ceeb':r.id==='back_team'?'#c9a84c':'#8fbc8f'};color:${r.id==='back_head'?'#87ceeb':r.id==='back_team'?'#c9a84c':'#8fbc8f'}" onclick="resolveStaffConflict('${r.id}')">${r.n} ▸</button>`).join('')}
        </div>
      </div>`
    }
  }

  if (G.staffPoachOffer) {
    const offer = G.staffPoachOffer
    html += `<div style="border:1px solid #f0a030;background:#1a1205;padding:10px;margin-bottom:14px">
      <div style="font-size:9px;color:#f0a030;font-weight:bold;margin-bottom:4px">⚠ RIVAL RECRUITMENT OFFER — Expires Month ${offer.expiresMonth}</div>
      <div style="font-size:8px;color:#7a7060;margin-bottom:8px">${offer.village} is offering ${offer.staffName} a position. Respond before they accept.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="gb gb-g" onclick="matchPoachOffer()" style="font-size:7px">Match Offer (${fmt(offer.matchCost)} ryo retention bonus) ▸</button>
        <button class="gb" onclick="confirm('Let ${offer.staffName} go to ${offer.village}?') && dismissPoachOffer('let')" style="font-size:7px;border-color:#8fbc8f;color:#8fbc8f">Let Them Go ▸</button>
        <button class="gb gb-r" onclick="confirm('Block ${offer.village}? This costs −10 relations.') && dismissPoachOffer('block')" style="font-size:7px">Block (−10 rel with ${offer.village}) ▸</button>
      </div>
    </div>`
  }

  // ── Staff by section ─────────────────────────────────────────────────────
  const staffBySec = [
    { sec: 'Command', roles: ['head_sensei','anbu_cmdr','council','treasurer','strategist'] },
    { sec: 'Field', roles: ['head_scout','team_sensei','scout_jonin','medical'] },
  ]

  staffBySec.forEach(({ sec, roles }) => {
    html += `<div class="pt" style="margin-top:${html.includes('div class="pt"')?'14px':'0'}">${sec}</div>`
    roles.forEach(roleId => {
      const roleDef = STAFF_ROLES.find(r => r.id === roleId)
      if (!roleDef) return
      const current = (G.staff || []).filter(st => st.role === roleId)
      const slots = roleDef.max
      const isFull = current.length >= slots

      html += `<div style="border:1px solid #2e2a22;background:#1a1814;padding:11px;margin-bottom:7px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div>
            <div style="font-size:11px;color:#e8e0cc;font-weight:bold">${roleDef.n} <span style="font-size:8px;color:#7a7060">(${current.length}/${slots})</span></div>
            <div style="font-size:9px;color:#7a7060;margin-top:2px">${roleDef.desc}</div>
            <div style="font-size:8px;color:#c9a84c;margin-top:2px;font-style:italic">${roleDef.effectDesc}</div>
          </div>
          ${!isFull ? `<button class="gb" onclick="openStaffHire('${roleId}')">${tr("staff.hire")}</button>` : ''}
        </div>`

      if (current.length === 0) {
        html += `<div style="font-size:8px;color:#3a3630;font-style:italic;padding:4px 0">— Vacant —</div>`
      } else {
        current.forEach(st => {
          const statEntries = Object.entries(st.stats || {})
          const ambColor = (st.ambition||0) >= 14 ? '#f0a030' : (st.ambition||0) >= 10 ? '#c9a84c' : '#7a7060'
          const ambLabel = (st.ambition||0) >= 14 ? '▲ High Ambition' : (st.ambition||0) >= 10 ? 'Moderate Ambition' : 'Low Ambition'
          const isAsstKage = st.asstKage
          const yearsServed = Math.floor((st.monthsServed || 0) / 12)
          const canBeAK = (st.monthsServed || 0) >= 12 && !isAsstKage && !(G.staff||[]).some(x => x.asstKage)

          html += `<div style="border:1px solid #2e2820;padding:8px;margin-top:6px;background:#111" oncontextmenu="return staffCtx(event,'${st.id}')">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
              <div onmousemove="staffHover(event,'${st.id}')" onmouseleave="hideHoverPreview()">
                <div style="font-size:10px;color:#e8e0cc;font-weight:bold">${st.fn} ${st.ln}${isAsstKage ? ' <span style="color:#87ceeb;font-size:8px">★ Asst. Warden</span>' : ''}</div>
                <div style="font-size:8px;color:#7a7060">Rating: <span style="color:#c9a84c;font-weight:bold">${st.rating}</span> · ${yearsServed > 0 ? yearsServed + 'yr ' : ''}${st.monthsServed}mo · ${fmt(st.salary)}/mo</div>
                ${(() => { const lvl = st.staffLevel || 1; const need = xpForStaffLevel(lvl); const pct = lvl >= STAFF_MAX_LEVEL ? 100 : Math.min(100, Math.round((st.staffXp || 0) / need * 100)); return `<div style="display:flex;align-items:center;gap:5px;margin-top:2px"><span style="font-size:7px;color:#8fbc8f" title="Staff mastery — improves their craft as they gain experience">◆ ${staffTitle(lvl)}${lvl >= STAFF_MAX_LEVEL ? ' (max)' : ' L' + lvl}</span><div style="flex:1;max-width:70px;height:3px;background:#222;border-radius:2px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#8fbc8f"></div></div></div>` })()}
                <div style="font-size:7px;color:${ambColor};margin-top:2px">${ambLabel}${(st.ambition||0)>=14&&roleId==='team_sensei'?' — watching for head sensei opening':''}${st.hiddenFlaw&&st.flawRevealed?' · ⚠ '+st.hiddenFlaw:''}</div>
                ${st.institutional > 0 ? `<div style="font-size:8px;color:#cc7fb8">Legacy bonus: +${st.institutional} to next hire</div>` : ''}
                ${st.fromShinobi ? `<div style="font-size:8px;color:#c9a84c">↳ Transitioned from active duty</div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
                <button class="gb gb-r" onclick="confirm('Release ${st.fn} ${st.ln}? This cannot be undone.') && releaseStaff('${st.id}')" style="font-size:7px;padding:3px 7px">${tr("staff.release")}</button>
                ${canBeAK ? `<button class="gb" onclick="designateAsstKage('${st.id}')" style="font-size:7px;padding:3px 7px;border-color:#87ceeb;color:#87ceeb">${tr("staff.designateAK")}</button>` : ''}
                ${isAsstKage ? `<button class="gb" onclick="designateAsstKage(null)" style="font-size:7px;padding:3px 7px;border-color:#555;color:#555">${tr("staff.removeAK")}</button>` : ''}
                ${(st.monthsServed||0) >= 6 && st.hiddenFlaw && !st.flawRevealed ? `<button class="gb" onclick="staffPersonalMeeting('${st.id}')" style="font-size:7px;padding:3px 7px;border-color:#c9a84c;color:#c9a84c">${tr("staff.meeting")}</button>` : ''}
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px">
              ${statEntries.map(([k, v]) => `<div style="text-align:center;background:#0d0d0d;padding:3px">
                <div style="font-size:7px;color:#3a3630;text-transform:uppercase;letter-spacing:1px;margin-bottom:1px">${k.slice(0,5)}</div>
                <div style="font-size:11px;color:${v>=15?'#c9a84c':v>=10?'#8fbc8f':'#7a7060'};font-weight:bold">${v}</div>
              </div>`).join('')}
            </div>
          </div>`
        })
      }
      html += `</div>`
    })
  })

  // ── Retire to Staff ───────────────────────────────────────────────────────
  html += `<div class="pt" style="margin-top:14px">${tr("staff.retireToStaff")}</div>
    <div style="font-size:9px;color:#7a7060;margin-bottom:8px">Shinobi with 20+ wins can transition to a staff role upon retirement.</div>`
  const eligible = G.shinobi.filter(s => s.wins >= 20 && s.ri >= 2)
  if (eligible.length === 0) {
    html += `<div style="font-size:8px;color:#3a3630;font-style:italic">No eligible shinobi — requires Veteran+ with 20+ wins.</div>`
  } else {
    eligible.forEach(s => {
      html += `<div style="border:1px solid #2e2820;padding:8px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:10px;color:#e8e0cc">${sn(s)}</div>
          <div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · ${s.wins} wins · Power ${Math.round(Object.values(s.stats).reduce((a,b)=>a+b,0)/6)}</div>
        </div>
        <button class="gb gb-g" onclick="openRetireToStaff('${s.id}')" style="font-size:7px;padding:3px 7px">Retire ▸</button>
      </div>`
    })
  }

  // ── Assistant Warden log ────────────────────────────────────────────────────
  const akLog = G.asstKageLog || []
  if (akLog.length > 0) {
    html += `<div class="pt" style="margin-top:14px">${tr("staff.akDecisions")}</div>
      <div style="font-size:9px;color:#7a7060;margin-bottom:6px">${tr("staff.akAutonomous")}</div>`
    html += akLog.slice(0, 8).map(entry =>
      `<div style="font-size:8px;color:#7a7060;border-left:2px solid #2e2820;padding:4px 8px;margin-bottom:4px"><span style="color:#3a3630">Yr${entry.year}·M${entry.month}</span> ${entry.text}</div>`
    ).join('')
  }

  return html
}

function _legacyTab() {
  const hof = G.staffHallOfFame || []
  if (hof.length === 0) {
    return `<div style="color:#555;text-align:center;padding:40px;font-size:.85rem">No inductees yet. Staff who serve 8+ years before retiring earn a permanent legacy entry.</div>`
  }
  let html = `<div style="font-size:9px;color:#7a7060;margin-bottom:10px">${tr("staff.hallNote")}</div>`
  html += hof.map(entry => {
    const roleDef = STAFF_ROLES.find(r => r.id === entry.role)
    return `<div style="border:1px solid #2e2a22;background:#1a1814;padding:11px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:11px;color:#c9a84c;font-weight:bold">${entry.fn} ${entry.ln}</div>
          <div style="font-size:9px;color:#7a7060;margin-top:2px">${roleDef?.n || entry.role} · ${entry.yearsServed} years of service · Peak Rating ${entry.peakRating}</div>
          <div style="font-size:8px;color:#3a3630;margin-top:2px">Inducted Year ${entry.year}${entry.fromShinobi ? ' · Transitioned from active duty' : ''}</div>
        </div>
        <div style="font-size:14px;color:#c9a84c">⭐</div>
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
    return `<div style="border:1px solid ${scouted?'#87ceeb':'#2e2820'};background:#0d0d0d;padding:10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
        <span style="font-size:10px;color:#e8e0cc;font-weight:bold">${c.fn} ${c.ln}</span>
        <span style="font-size:9px;color:#c9a84c">Rating ${c.rating} · ${fmt(c.salary)}/mo</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin-bottom:7px">
        ${statEntries.map(([k,v]) => `<div style="text-align:center;background:#111;padding:3px">
          <div style="font-size:7px;color:#3a3630;text-transform:uppercase">${k.slice(0,5)}</div>
          <div style="font-size:10px;color:${v>=15?'#c9a84c':v>=10?'#8fbc8f':'#7a7060'};font-weight:bold">${v}</div>
        </div>`).join('')}
      </div>
      ${scouted && c.hiddenFlaw ? `<div style="font-size:8px;color:#f99;margin-bottom:6px;padding:4px 6px;border:1px solid #8b1a1a;background:#0d0505">⚠ Scout Report: Hidden flaw detected — "${c.hiddenFlaw}"</div>` : ''}
      ${scouted && !c.hiddenFlaw ? `<div style="font-size:8px;color:#8fbc8f;margin-bottom:6px;padding:4px 6px;border:1px solid #1a3a1a;background:#050d05">✓ Scout Report: No concerns — well-regarded by former colleagues.</div>` : ''}
      <div style="display:flex;gap:6px">
        <button class="gb gb-g" onclick="doStaffHire(${i})" style="font-size:7px">${tr("staff.hire")}</button>
        ${!scouted ? `<button class="gb" onclick="scoutStaffCandidate(${i})" style="font-size:7px;border-color:#87ceeb;color:#87ceeb">${tr("staff.scout")}</button>` : ''}
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
        <div style="font-size:10px;color:#e8e0cc">${r.n}</div>
        <div style="font-size:8px;color:#7a7060">${r.effectDesc}</div>
        <div style="font-size:8px;color:#c9a84c">Est. rating: ${Math.max(5, derivedRating)} · Salary: ~${fmt(Math.round(r.salBase*(0.7+Math.max(5,derivedRating)*0.04)))}/mo</div>
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
