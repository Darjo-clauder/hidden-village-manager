import { G, fmt, sn, rnd, pk, clamp, mStaff, genStaffCandidates } from '../state.js'
import { STAFF_ROLES, RANKS, RKC, FNAMES, LNAMES } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'

let _hireRoleId = null
let _hireCandidates = []

export function rSt() {
  const el = document.getElementById('stfl')
  if (!el) return

  const staffBySec = [
    { sec: 'Command', roles: ['head_sensei','anbu_cmdr','council','treasurer','strategist'] },
    { sec: 'Field', roles: ['head_scout','team_sensei','scout_jonin','medical'] },
  ]

  let html = ''
  staffBySec.forEach(({ sec, roles }) => {
    html += `<div class="pt" style="margin-top:${html?'14px':'0'}">${sec}</div>`
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
          ${!isFull ? `<button class="gb" onclick="openStaffHire('${roleId}')">Hire ▸</button>` : ''}
        </div>`

      if (current.length === 0) {
        html += `<div style="font-size:8px;color:#3a3630;font-style:italic;padding:4px 0">— Vacant —</div>`
      } else {
        current.forEach(st => {
          const statEntries = Object.entries(st.stats)
          html += `<div style="border:1px solid #2e2820;padding:8px;margin-top:6px;background:#111">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
              <div>
                <div style="font-size:10px;color:#e8e0cc;font-weight:bold">${st.fn} ${st.ln}</div>
                <div style="font-size:8px;color:#7a7060">Rating: <span style="color:#c9a84c;font-weight:bold">${st.rating}</span> · Tenure: ${st.monthsServed}mo · Salary: ${fmt(st.salary)}/mo</div>
                ${st.institutional > 0 ? `<div style="font-size:8px;color:#cc7fb8">Legacy bonus: +${st.institutional} to next hire</div>` : ''}
                ${st.fromShinobi ? `<div style="font-size:8px;color:#c9a84c">↳ Transitioned from active duty</div>` : ''}
              </div>
              <button class="gb gb-r" onclick="releaseStaff('${st.id}')" style="font-size:7px;padding:3px 7px">Release</button>
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

  // Transition from retired shinobi (show eligible retired shinobis)
  html += `<div class="pt" style="margin-top:14px">Retire to Staff</div>
    <div style="font-size:9px;color:#7a7060;margin-bottom:8px">Shinobi with 20+ wins can transition to a staff role upon retirement. Their career stats inform their rating.</div>`

  const eligible = G.shinobi.filter(s => s.wins >= 20 && s.ri >= 2)
  if (eligible.length === 0) {
    html += `<div style="font-size:8px;color:#3a3630;font-style:italic">No eligible shinobi — requires Jonin+ with 20+ wins.</div>`
  } else {
    eligible.forEach(s => {
      html += `<div style="border:1px solid #2e2820;padding:8px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:10px;color:#e8e0cc">${sn(s)}</div>
          <div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · ${s.wins} wins · Power ${Math.round(Object.values(s.stats).reduce((a,b)=>a+b,0)/6)}</div>
        </div>
        <div style="display:flex;gap:5px">
          <button class="gb gb-g" onclick="openRetireToStaff('${s.id}')" style="font-size:7px;padding:3px 7px">Retire ▸</button>
        </div>
      </div>`
    })
  }

  el.innerHTML = html
}

export function openStaffHire(roleId) {
  _hireRoleId = roleId
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
  const list = document.getElementById('sh-candidates')
  list.innerHTML = _hireCandidates.map((c, i) => {
    const statEntries = Object.entries(c.stats)
    return `<div class="pi" onclick="doStaffHire(${i})" style="flex-direction:column;align-items:flex-start;padding:10px">
      <div style="display:flex;justify-content:space-between;width:100%;margin-bottom:5px">
        <span style="font-size:10px;color:#e8e0cc;font-weight:bold">${c.fn} ${c.ln}</span>
        <span style="font-size:9px;color:#c9a84c">Rating ${c.rating} · ${fmt(c.salary)}/mo</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;width:100%">
        ${statEntries.map(([k,v]) => `<div style="text-align:center;background:#111;padding:3px">
          <div style="font-size:7px;color:#3a3630;text-transform:uppercase">${k.slice(0,5)}</div>
          <div style="font-size:10px;color:${v>=15?'#c9a84c':v>=10?'#8fbc8f':'#7a7060'};font-weight:bold">${v}</div>
        </div>`).join('')}
      </div>
    </div>`
  }).join('')
  document.getElementById('ov-staffhire').classList.add('open')
}

export function doStaffHire(idx) {
  const candidate = _hireCandidates[idx]
  if (!candidate || !_hireRoleId) return
  if (!G.staff) G.staff = []
  const roleDef = STAFF_ROLES.find(r => r.id === _hireRoleId)
  const current = G.staff.filter(st => st.role === _hireRoleId)
  if (current.length >= (roleDef?.max || 1)) {
    ntf('No open slots for ' + roleDef?.n)
    cm('staffhire')
    return
  }
  // Clear any institutional bonus that was used
  G.staff.filter(st => st.role === _hireRoleId).forEach(st => { st.institutional = 0 })
  G.staff.push(candidate)
  aL(candidate.fn + ' ' + candidate.ln + ' hired as ' + roleDef?.n + ' (Rating ' + candidate.rating + ').', 'good')
  ntf(candidate.fn + ' joins as ' + roleDef?.n)
  cm('staffhire')
  upUI()
}

export function releaseStaff(staffId) {
  if (!G.staff) return
  const st = G.staff.find(x => x.id === staffId)
  if (!st) return
  G.staff = G.staff.filter(x => x.id !== staffId)
  aL(st.fn + ' ' + st.ln + ' was released from their position.', 'neutral')
  upUI()
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
  if (current.length >= (roleDef?.max || 1)) { ntf('No open slots.'); cm('retiretostaff'); return }

  const avgStat = Math.round(Object.values(s.stats).reduce((a,b)=>a+b,0)/6)
  const derivedRating = Math.max(5, Math.min(20, Math.round(avgStat / 5)))
  const staffMember = mStaff(roleId, derivedRating)
  staffMember.fn = s.fn
  staffMember.ln = s.ln
  staffMember.fromShinobi = shinobiId

  G.staff.push(staffMember)
  G.shinobi = G.shinobi.filter(x => x.id !== shinobiId)
  aL(sn(s) + ' retired from active duty and joined the staff as ' + roleDef?.n + ' (Rating ' + derivedRating + ').', 'good')
  addChronicle?.('Staff Transition', sn(s) + ' transitioned to ' + roleDef?.n + ' after ' + s.wins + ' missions.', 'shinobi')
  cm('retiretostaff')
  upUI()
}

function addChronicle(title, body, type) {
  if (!G.chronicles) return
  G.chronicles.push({ year: G.year, month: G.month, title, body, type })
  if (G.chronicles.length > 80) G.chronicles.shift()
}
