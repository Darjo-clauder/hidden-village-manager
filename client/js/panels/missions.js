import { G, ui, sPow, sqP, sn, fmt, clamp } from '../state.js'
import { RANKS, RKC } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { pCl } from './roster.js'
import { oSqA } from './squads.js'
import { isEnabled } from '../../../config/features.js'
import { resolveMission } from '../../../shared/types/MissionTemplate.js'
import { BLACK_MARKET_MISSIONS, BM_MISSION_BY_ID, getUnderworldTier, UNDERWORLD_TIERS } from '../../../shared/constants/blackMarket.js'

export function mTab(t) {
  ui.MT = t
  ;['solo', 'squad', 'def', 'chains', 'templates', 'log', 'underground'].forEach(x => {
    const el = document.getElementById('ms-' + x)
    if (el) el.style.display = x === t ? '' : 'none'
    const btn = document.getElementById('mt-' + x)
    if (btn) btn.classList.toggle('active', x === t)
  })
}

export function rMi() { rRB(); rWCE(); rTacticalPrep(); rSoloM(); rSqM(); rDef(); rChains(); rMissionReport(); rTemplates(); rMissionLog(); rUnderground() }

export function rTacticalPrep() {
  const el = document.getElementById('ms-prep')
  if (!el) return
  const mode = G.missionPrepMode || 'standard'
  const modes = [
    { id:'aggressive', label:'Aggressive', icon:'⚔', desc:'+8% success, +4% KIA risk', color:'#f66' },
    { id:'standard',   label:'Standard',   icon:'⚖', desc:'Default — balanced risk/reward', color:'#c9a84c' },
    { id:'cautious',   label:'Cautious',   icon:'🛡', desc:'−6% success, −3% KIA risk', color:'#8fbc8f' },
  ]
  el.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:14px;align-items:stretch">
    ${modes.map(m => `
      <div onclick="setMissionPrep('${m.id}')" style="flex:1;padding:7px 8px;border:1px solid ${mode===m.id?m.color:'#333'};background:${mode===m.id?'rgba(0,0,0,.4)':'transparent'};cursor:pointer;text-align:center">
        <div style="font-size:12px;margin-bottom:2px">${m.icon}</div>
        <div style="font-size:8px;color:${mode===m.id?m.color:'#7a7060'};font-weight:${mode===m.id?'bold':'normal'}">${m.label}</div>
        <div style="font-size:7px;color:#3a3630;margin-top:2px">${m.desc}</div>
      </div>`).join('')}
  </div>`
}

export function setMissionPrep(mode) {
  G.missionPrepMode = mode
  rTacticalPrep()
}

export function rMissionReport() {
  const el = document.getElementById('ms-report')
  if (!el) return
  const r = G.lastMissionReport
  if (!r) { el.innerHTML = ''; return }
  const GRADE_COLOR = { A:'#c9a84c', B:'#8fbc8f', C:'#f0a030', D:'#f66' }
  el.innerHTML = `<div style="background:#0a0a0a;border:1px solid #333;padding:10px;margin-bottom:12px">
    <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:8px">
      Last Mission Report — ${r.missionName} (${r.missionRk}-Rank) · ${r.succeeded?'<span style="color:#8fbc8f">SUCCESS</span>':'<span style="color:#f66">FAILURE</span>'}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${r.scores.map(sc => `<div style="background:#111;border:1px solid ${GRADE_COLOR[sc.grade]}22;padding:6px 9px;min-width:80px">
        <div style="font-size:9px;color:#e8e0cc">${sc.name}</div>
        <div style="font-size:7px;color:#7a7060;margin-top:1px">${sc.role}</div>
        <div style="font-size:16px;font-weight:bold;color:${GRADE_COLOR[sc.grade]};margin-top:3px">${sc.grade}</div>
        <div style="font-size:7px;color:${GRADE_COLOR[sc.grade]};margin-top:1px">${sc.detail}</div>
      </div>`).join('')}
    </div>
  </div>`
}

export function rWCE() {
  const el = document.getElementById('wce-banner')
  if (!el) return
  if (G.pendingChoiceEvent) {
    el.style.display = ''
    document.getElementById('wce-banner-name').textContent = G.pendingChoiceEvent.n
  } else {
    el.style.display = 'none'
  }
}

export function openWorldChoice() {
  const ev = G.pendingChoiceEvent; if (!ev) return
  document.getElementById('wce-title').textContent = ev.n
  document.getElementById('wce-desc').textContent = ev.desc
  document.getElementById('wce-choices').innerHTML = ev.choices.map(c =>
    `<button class="gb" style="display:block;width:100%;margin-bottom:6px;text-align:left" onclick="resolveChoiceEvent('${c.fn}')">${c.l}</button>`
  ).join('')
  document.getElementById('ov-worldchoice').classList.add('open')
}

export function rRB() {
  const b = document.getElementById('rdb'), d = document.getElementById('rdd')
  if (G.raid && !G.raid.resolved) {
    b.classList.add('on')
    d.textContent = G.raid.n + ': ' + G.raid.desc + ' ' + (G.raidW > 0 ? 'Arrives in ' + G.raidW + 'm.' : 'ARRIVING THIS MONTH!')
  } else b.classList.remove('on')
}

function _expiryBadge(m) {
  if (!m.expiresMonth) return ''
  const addedYear = m.addedYear || G.year
  const monthsLeft = (m.expiresMonth - G.month) + (addedYear < G.year ? 0 : 0)
  // Clamp display
  const ml = Math.max(0, m.expiresMonth - G.month + (m.addedYear && m.addedYear < G.year ? (G.year - m.addedYear) * 12 * -1 : 0))
  const color = ml <= 1 ? '#f66' : ml <= 2 ? '#fa0' : '#7a7060'
  return `<span style="font-size:7px;color:${color};border:1px solid ${color};padding:1px 4px;margin-left:5px">Expires ${ml}m</span>`
}

function _chainBadge(m) {
  if (!m.chainId) return ''
  return `<span style="font-size:7px;color:#4a9eca;border:1px solid #4a9eca;padding:1px 4px;margin-left:5px" title="Chain: ${m.chainName}">⛓ ${m.chainName} ${m.chainStep + 1}/${m.chainTotal}</span>`
}

export function rSoloM() {
  const el = document.getElementById('ms-solo'), av = G.shinobi.filter(s => s.status === 'available')
  el.innerHTML = G.avM.filter(m => !m.sq).map(m => {
    const rc = 'mr-' + m.rk.toLowerCase(), aM = G.aM.find(a => a.missionId === m.id && !a.isSquad)
    return `<div class="mc">
      <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px">
        <span class="mrb ${rc}">${m.rk}</span>
        <div>
          <div style="font-size:11px;color:#e8e0cc;font-weight:bold">${m.n}</div>
          <div style="margin-top:3px">${_expiryBadge(m)}${_chainBadge(m)}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:8px;color:#7a7060;margin-bottom:7px">
        <span>Reward: <span style="color:#e8e0cc">${fmt(m.ryo)} ryo</span></span>
        <span>Rep: <span style="color:#e8e0cc">+${m.rep}</span></span>
        <span>Duration: <span style="color:#e8e0cc">${m.dur}m</span></span>
        <span>Risk: <span style="color:#e8e0cc">${Math.round(m.risk * 100)}%</span></span>
        <span>Min pwr: <span style="color:#e8e0cc">${m.mp}</span></span>
      </div>
      ${aM ? `<div style="font-size:9px;color:#fa0">⟳ ${sn(G.shinobi.find(s => s.id === aM.assignedTo) || { fn: '?', ln: '' })} — ${aM.daysLeft}m left</div>` : `<button class="gb" onclick="oA('${m.id}')" ${av.length ? '' : 'disabled'}>${av.length ? 'Assign ►' : 'No shinobi'}</button>`}
    </div>`
  }).join('')
}

export function rSqM() {
  const el = document.getElementById('ms-squad')
  el.innerHTML = G.avM.filter(m => m.sq).map(m => {
    const rc = 'mr-' + m.rk.toLowerCase(), aM = G.aM.find(a => a.missionId === m.id && a.isSquad)
    return `<div class="mc">
      <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px">
        <span class="mrb ${rc}">${m.rk}</span>
        <div>
          <div style="font-size:11px;color:#e8e0cc;font-weight:bold">${m.n} <span style="font-size:8px;color:#cc7fb8">Squad</span></div>
          <div style="margin-top:3px">${_expiryBadge(m)}${_chainBadge(m)}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:8px;color:#7a7060;margin-bottom:7px">
        <span>Reward: <span style="color:#e8e0cc">${fmt(m.ryo)} ryo</span></span>
        <span>Min sq pwr: <span style="color:#e8e0cc">${m.mp}</span></span>
        <span>Duration: <span style="color:#e8e0cc">${m.dur}m</span></span>
      </div>
      ${aM ? `<div style="font-size:9px;color:#fa0">⟳ Squad on mission — ${aM.daysLeft}m left</div>` : `<button class="gb" onclick="pickSq('${m.id}')">Assign Squad ►</button>`}
    </div>`
  }).join('') || '<div style="color:#7a7060;font-size:10px">No squad missions.</div>'
}

export function pickSq(mId) {
  const fq = G.squads.filter(sq => sq.members.every(id => { const s = G.shinobi.find(x => x.id === id); return s && s.status === 'available' }))
  if (!fq.length) { ntf('No available squads!'); return }
  ui.sqAT = fq[0].id; oSqA(fq[0].id)
}

export function rDef() {
  const el = document.getElementById('ms-def')
  if (!G.raid || G.raid.resolved) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No active threats.</div>'; return }
  const wD = (G.upgrades.wall === 1 ? 15 : G.upgrades.wall === 2 ? 35 : 0) + (G.upgrades.seal === 1 ? 10 : G.upgrades.seal === 2 ? 25 : 0) + (G.tempDef || 0)
  const def = G.defSh ? G.shinobi.find(s => s.id === G.defSh) : null
  const av = G.shinobi.filter(s => s.status === 'available')
  el.innerHTML = `<div style="background:#1a0000;border:1px solid #8b1a1a;padding:12px"><div style="font-size:9px;color:#f66;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">⚠ ${G.raid.n}</div><div style="font-size:10px;color:#f99;margin-bottom:10px">${G.raid.desc}</div><div style="display:flex;gap:18px;margin-bottom:10px"><div><div style="font-size:7px;color:#7a7060;letter-spacing:1px">THREAT</div><div style="font-size:18px;color:#f66;font-weight:bold">${G.raid.str}</div></div><div><div style="font-size:7px;color:#7a7060;letter-spacing:1px">WALL DEF</div><div style="font-size:18px;color:#8fbc8f;font-weight:bold">${wD}</div></div><div><div style="font-size:7px;color:#7a7060;letter-spacing:1px">ARRIVES IN</div><div style="font-size:18px;color:#fa0;font-weight:bold">${G.raidW}m</div></div></div>${def ? `<div style="font-size:10px;color:#8fbc8f;margin-bottom:7px">Defender: ${sn(def)} (Pwr ${sPow(def)})</div><button class="gb gb-r" onclick="G_defShClear()">Remove</button>` : av.map(s => `<div class="pi" onclick="G_defShSet('${s.id}')" style="margin-bottom:4px"><div style="font-size:10px;color:#e8e0cc">${sn(s)}</div><div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</div></div>`).join('') || '<div style="color:#7a7060;font-size:9px">No shinobi available.</div>'}</div>`
}

export function rChains() {
  const el = document.getElementById('ms-chains')
  if (!el) return
  const active    = G.missionChains || []
  const completed = (G.completedMissionChains || []).slice().reverse().slice(0, 10)

  const RK_COLORS = { D:'#8fbc8f', C:'#87ceeb', B:'#c9a84c', A:'#f0a030', S:'#f66' }

  const activeHtml = active.length === 0
    ? '<div style="color:#7a7060;font-size:9px;margin-bottom:12px">No active mission chains. They spawn randomly each month (8% chance).</div>'
    : active.map(chain => {
        const completedCount = chain.completedSteps.length
        const totalSteps = chain.steps.length
        const pct = Math.round(completedCount / totalSteps * 100)
        const currentStep = chain.steps[chain.currentStep]
        // Find if the current step is on the mission board
        const boardM = currentStep ? G.avM.find(m => m.chainId === chain.id && m.chainStep === chain.currentStep) : null
        const activeM = boardM ? G.aM.find(a => a.missionId === boardM.id) : null

        return `<div style="background:#0d1a0d;border:1px solid #2a4a2a;padding:10px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div>
              <div style="font-size:10px;color:#c9a84c;font-weight:bold">⛓ ${chain.n}</div>
              <div style="font-size:7px;color:#7a7060;margin-top:1px">Started Y${chain.startYear}·M${chain.startMonth}</div>
            </div>
            <div style="font-size:9px;color:#8fbc8f">${completedCount}/${totalSteps} complete</div>
          </div>
          <div style="background:#111;height:4px;border-radius:2px;margin-bottom:8px">
            <div style="background:#4a9a4a;height:4px;border-radius:2px;width:${pct}%"></div>
          </div>
          <div style="display:flex;gap:4px;margin-bottom:8px">
            ${chain.steps.map((step, i) => {
              const done   = chain.completedSteps.includes(i)
              const failed = chain.failedSteps.includes(i)
              const active = i === chain.currentStep
              const rkC    = RK_COLORS[step.rk] || '#999'
              return `<div style="flex:1;padding:4px;border:1px solid ${done?'#4a9a4a':failed?'#8b1a1a':active?rkC:'#333'};background:${done?'#0a1a0a':failed?'#1a0505':active?'rgba(0,0,0,.4)':'transparent'};text-align:center">
                <div style="font-size:6px;color:${done?'#8fbc8f':failed?'#f66':active?rkC:'#555'};text-transform:uppercase">${done?'✓':failed?'✗':active?'NOW':String(i+1)}</div>
                <div style="font-size:7px;color:${active?rkC:'#555'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${step.rk}-Rank</div>
              </div>`
            }).join('')}
          </div>
          ${currentStep ? `<div style="font-size:8px;color:#7a7060">
            Next: <span style="color:#e8e0cc">${currentStep.n}</span> (${currentStep.rk}-Rank · ${fmt(currentStep.ryo)} ryo)
            ${boardM ? ` · <span style="color:${activeM ? '#fa0' : '#4a9eca'}">
              ${activeM ? `⟳ In progress` : '📋 On mission board'}
            </span>` : ' · <span style="color:#7a7060">Generating…</span>'}
          </div>` : ''}
          ${chain.state && (chain.state.ryoAccumulated > 0 || chain.state.injuryEscalation > 0) ? `
          <div style="display:flex;gap:12px;font-size:7px;color:#7a7060;margin-top:5px;padding-top:5px;border-top:1px solid #1a2a1a">
            ${chain.state.ryoAccumulated > 0 ? `<span>Banked: <span style="color:#c9a84c">+${fmt(Math.round(chain.state.ryoAccumulated*0.5))} ryo</span> on completion</span>` : ''}
            ${chain.state.injuryEscalation > 0 ? `<span>Risk escalation: <span style="color:#f99">+${Math.round(chain.state.injuryEscalation*100)}%</span></span>` : ''}
          </div>` : ''}
        </div>`
      }).join('')

  const completedHtml = completed.length === 0
    ? '<div style="font-size:9px;color:#3a3630">No completed chains yet.</div>'
    : completed.map(chain => {
        const bonusRyo = chain.state ? Math.round(chain.state.ryoAccumulated * 0.5) : 0
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-left:2px solid #4a9a4a;margin-bottom:4px">
          <div>
            <div style="font-size:8px;color:#8fbc8f">✓ ${chain.n}</div>
            ${bonusRyo > 0 ? `<div style="font-size:7px;color:#c9a84c">${fmt(bonusRyo)} ryo chain bonus paid</div>` : ''}
          </div>
          <div style="font-size:7px;color:#3a3630">Y${chain.completedYear}·M${chain.completedMonth||'?'}</div>
        </div>`
      }).join('')

  el.innerHTML = `
    <div style="font-size:7px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Active Chains</div>
    ${activeHtml}
    <div style="font-size:7px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-top:14px;margin-bottom:8px">Completed Chains</div>
    ${completedHtml}
  `
}

export function oA(mId) {
  ui.aT = mId
  const m = G.avM.find(x => x.id === mId)
  document.getElementById('ma-t').textContent = 'Assign to: ' + m.n
  document.getElementById('ma-d').textContent = m.rk + '-Rank · ' + fmt(m.ryo) + ' ryo · Risk ' + Math.round(m.risk * 100) + '% · Min pwr ' + m.mp
  const av = G.shinobi.filter(s => s.status === 'available')
  document.getElementById('ma-l').innerHTML = av.map(s => {
    const pw = sPow(s), ok = pw >= m.mp, ref = s.pers.effect.rankFilter && ['D', 'C'].includes(m.rk)
    return `<div class="pi" onclick="${ok && !ref ? `doA('${s.id}')` : ''}" style="${ok && !ref ? '' : 'opacity:0.4;cursor:not-allowed'}"><div><div style="font-size:10px;color:#e8e0cc">${sn(s)} <span class="trait-tag ${pCl(s.pers)}" style="font-size:7px">${s.pers.n}</span></div><div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${pw}${ref ? ' · Refuses low-rank' : !ok ? ` (need ${m.mp - pw} more)` : ''}</div></div><span style="font-size:8px;color:${ok && !ref ? '#8fbc8f' : '#f66'}">${ok && !ref ? '✓' : '✗'}</span></div>`
  }).join('') || '<div style="color:#7a7060;font-size:9px">No available shinobi.</div>'
  document.getElementById('ov-assign').classList.add('open')
}

export function doA(sId) {
  const m = G.avM.find(x => x.id === ui.aT), s = G.shinobi.find(x => x.id === sId)
  if (!m || !s) return
  s.status = 'mission'; s.missId = m.id
  G.aM.push({ id: Math.random().toString(36).slice(2), missionId: m.id, assignedTo: sId, squadId: null, daysLeft: m.dur, isSquad: false })
  cm('assign'); aL(sn(s) + ' dispatched on "' + m.n + '".', 'neutral'); ntf(s.fn + ' deployed!'); upUI()
}

// ── Mission Template picker (Phase 1) ─────────────────────────────────────────
export function rTemplates() {
  const el = document.getElementById('ms-templates')
  if (!el) return
  if (!isEnabled('MISSION_TEMPLATES')) {
    el.innerHTML = '<div style="color:#555;font-size:.8rem;padding:20px">Mission templates are disabled (feature flag).</div>'
    return
  }
  const templates = G.missionTemplates || []
  if (!templates.length) {
    el.innerHTML = '<div style="color:#555;font-size:.8rem;padding:20px">No templates loaded. Call seedPhase1(G) in the console to load sample templates.</div>'
    return
  }

  const RANK_COLOR = { D:'#8fbc8f', C:'#8fbc8f', B:'#f0a030', A:'#f66', S:'#c9a84c' }
  const avgPow = G.shinobi.length
    ? Math.round(G.shinobi.filter(s => s.status === 'available').reduce((a, s) => a + (s.stats ? Object.values(s.stats).reduce((x, v) => x + v, 0) / Object.keys(s.stats).length : 30), 0) / Math.max(1, G.shinobi.filter(s => s.status === 'available').length))
    : 25

  el.innerHTML = `
    <div style="font-size:.72rem;color:#666;margin-bottom:12px">
      Mission templates define reusable mission profiles. Click <b>Simulate</b> to preview an expected outcome based on your current squad power (avg: <span style="color:#c9a84c">${avgPow}</span>).
    </div>
    <div style="display:grid;gap:10px">
      ${templates.map(t => {
        const rc = RANK_COLOR[t.baseDifficulty] || '#aaa'
        return `
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:12px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
              <span style="font-size:.7rem;padding:1px 6px;border:1px solid ${rc};color:${rc}">${t.baseDifficulty}</span>
              <span style="color:#e8d5a3;font-weight:bold">${t.name}</span>
              <span style="color:#666;font-size:.72rem;margin-left:auto;text-transform:capitalize">${t.type}</span>
            </div>
            <div style="font-size:.75rem;color:#aaa;margin-bottom:6px">${t.description}</div>
            <div style="display:flex;gap:12px;font-size:.72rem;color:#888;margin-bottom:8px">
              <span>Reward: <span style="color:#c9a84c">${fmt(t.rewardRange.min)}–${fmt(t.rewardRange.max)}</span></span>
              <span>Injury: <span style="color:#f0a030">${Math.round(t.riskProfile.injuryChance * 100)}%</span></span>
              <span>Roles: <span style="color:#9cf">${t.requiredRoles.join(', ') || 'any'}</span></span>
            </div>
            <button onclick="simTemplate('${t.id}')" style="background:#1a1a2e;border:1px solid #4a4a8a;color:#9cf;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:.72rem">▶ Simulate</button>
            <span id="sim-${t.id}" style="font-size:.72rem;color:#888;margin-left:8px"></span>
          </div>`
      }).join('')}
    </div>
  `
}

export function rMissionLog() {
  const el = document.getElementById('ms-log')
  if (!el) return
  const log = (G.missionLog || []).slice().reverse()
  const filter = G._missionLogFilter || 'all'

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'chains', label: '⛓ Chains' },
    { id: 'injuries', label: '🩸 Injuries' },
    { id: 's-rank', label: '★ S-Rank' },
  ]

  const visible = log.filter(e => {
    if (filter === 'chains') return !!e.chainName
    if (filter === 'injuries') return !!e.injuryName
    if (filter === 's-rank') return e.rank === 'S'
    return true
  })

  el.innerHTML = `
    <div style="display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap">
      ${filters.map(f => `
        <button onclick="missionLogFilter('${f.id}')"
          style="font-size:8px;padding:3px 8px;border:1px solid ${filter===f.id?'var(--gold)':'var(--border)'};
          background:${filter===f.id?'rgba(201,168,76,.15)':'transparent'};color:${filter===f.id?'var(--gold)':'var(--text-dim)'};cursor:pointer">
          ${f.label}
        </button>`).join('')}
    </div>
    ${visible.length === 0 ? '<div style="color:var(--text-dim);font-size:9px">No missions logged yet.</div>' : ''}
    ${visible.map(e => {
      const statusColor = e.success ? 'var(--green)' : 'var(--red)'
      const rankColor = e.rank === 'S' ? '#c9a84c' : e.rank === 'A' ? '#87ceeb' : e.rank === 'B' ? '#8fbc8f' : '#888'
      return `
        <div style="border:1px solid var(--border);padding:8px;margin-bottom:6px;background:var(--surface)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
            <div>
              <span style="font-size:8px;color:${rankColor};font-weight:bold">${e.rank}-rank</span>
              <span style="font-size:9px;color:var(--text-hi);margin-left:6px">${e.missionName}</span>
              ${e.chainName ? `<span style="font-size:7px;color:var(--gold);margin-left:5px">⛓ ${e.chainName}</span>` : ''}
            </div>
            <div style="font-size:7px;color:var(--text-dim)">${e.year} Y${e.month}</div>
          </div>
          <div style="display:flex;gap:10px;margin-bottom:3px">
            <span style="font-size:8px;color:${statusColor}">${e.success ? '✓ Success' : '✗ Failed'}</span>
            ${e.success ? `<span style="font-size:8px;color:var(--gold)">+${e.ryo.toLocaleString()} ryo</span>` : ''}
            ${e.success ? `<span style="font-size:8px;color:var(--text-dim)">+${e.rep} rep</span>` : ''}
          </div>
          ${e.injuryName ? `<div style="font-size:7px;color:var(--red);margin-bottom:2px">🩸 Injury: ${e.injuryName}</div>` : ''}
          ${e.chainBonus ? `<div style="font-size:7px;color:var(--gold);margin-bottom:2px">⛓ Chain bonus: +${e.chainBonus.toLocaleString()} ryo</div>` : ''}
          ${e.narrative ? `<div style="font-size:7px;color:var(--text-dim);font-style:italic">${e.narrative}</div>` : ''}
        </div>`
    }).join('')}
  `
}

export function missionLogFilter(f) {
  G._missionLogFilter = f
  rMissionLog()
}

export function simTemplate(templateId) {
  const t = (G.missionTemplates || []).find(x => x.id === templateId)
  if (!t) return
  const available = G.shinobi.filter(s => s.status === 'available')
  const avgPow = available.length
    ? available.reduce((a, s) => a + (s.stats ? Object.values(s.stats).reduce((x, v) => x + v, 0) / Object.keys(s.stats).length : 25), 0) / available.length
    : 25
  const result = resolveMission(t, avgPow)
  const el = document.getElementById('sim-' + templateId)
  if (!el) return
  el.style.color = result.success ? '#8fbc8f' : '#f66'
  el.textContent = result.success
    ? `✓ Success — est. ${fmt(result.ryo)} ryo, +${result.repGain} rep`
    : `✗ Fail — 0 ryo, ${result.repGain} rep`
}

export function rUnderground() {
  const el = document.getElementById('ms-underground')
  if (!el) return
  const bmRep = G.blackMarketRep || 0
  const tier = getUnderworldTier(bmRep)
  const nextTier = UNDERWORLD_TIERS.find(t => t.minRep > bmRep)
  const available = G.shinobi.filter(s => s.status === 'available')
  const activeBM = (G.aM || []).filter(a => a.isBM)

  el.innerHTML = `
    <div style="background:#0a0802;border:1px solid #3a2800;padding:10px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:#7a5030;text-transform:uppercase;margin-bottom:6px">Underworld Standing</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:13px;color:#c9a84c;font-weight:bold">${tier.label}</div>
        <div style="font-size:8px;color:#7a5030">Rep: ${bmRep}${nextTier ? ` / ${nextTier.minRep} → ${nextTier.label}` : ' (MAX)'}</div>
        ${tier.passiveRyo ? `<div style="font-size:8px;color:#8fbc8f">+${tier.passiveRyo.toLocaleString()} ryo/mo passive</div>` : ''}
      </div>
    </div>
    ${activeBM.length ? `<div style="font-size:8px;color:#7a5030;margin-bottom:8px">Active contracts: ${activeBM.map(a => `<span style="color:#c9a84c">${BM_MISSION_BY_ID?.[a.bmId]?.n || a.bmId}</span>`).join(', ')}</div>` : ''}
    <div style="display:grid;gap:8px">
    ${BLACK_MARKET_MISSIONS.map(bm => {
      const locked = tier.id === 'unknown' && bm.id !== 'bm_sabotage' && bm.id !== 'bm_theft'
        ? false  // unlock all once contacted
        : bm.id === 'bm_bounty' && !tier.unlocksBounty
      const canAssign = available.filter(s => (s.ri || 0) >= bm.reqRi && (!bm.reqAnbu || s.ri >= 3))
      const RKC2 = { S:'#ff6b6b', A:'#c9a84c', B:'#8fbc8f', C:'#aaa' }
      return `
        <div style="background:#0d0a06;border:1px solid ${locked?'#222':'#3a2800'};padding:10px;opacity:${locked?0.4:1}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
              <span style="font-size:9px;color:#e8e0cc">${bm.icon} ${bm.n}</span>
              <span style="font-size:8px;color:${RKC2[bm.rk]||'#aaa'};margin-left:6px">[${bm.rk}-Rank]</span>
            </div>
            <div style="text-align:right">
              <div style="font-size:9px;color:#8fbc8f">+${bm.ryo.toLocaleString()} ryo</div>
              ${bm.repLoss ? `<div style="font-size:7px;color:#f66">Discovery: −${bm.repLoss} rep</div>` : ''}
            </div>
          </div>
          <div style="font-size:7px;color:#7a5030;margin-bottom:8px">${bm.desc}</div>
          ${locked ? '<div style="font-size:7px;color:#555">Requires higher underworld standing.</div>' :
            canAssign.length === 0 ? '<div style="font-size:7px;color:#555">No eligible shinobi available.</div>' : `
            <select id="bm-sel-${bm.id}" style="font-size:8px;padding:3px;background:#111;color:#e8e0cc;border:1px solid #3a2800;margin-right:6px">
              <option value="">— assign shinobi —</option>
              ${canAssign.map(s => `<option value="${s.id}">${sn(s)} [${RANKS[s.ri]}]</option>`).join('')}
            </select>
            <button onclick="assignBM('${bm.id}')" style="font-size:8px;padding:3px 8px;background:#3a2800;color:#c9a84c;border:1px solid #5a4010;cursor:pointer">Send</button>
          `}
        </div>`
    }).join('')}
    </div>`
}

export function assignBM(missionId) {
  const sel = document.getElementById('bm-sel-' + missionId)
  if (!sel?.value) { ntf('Select a shinobi first.'); return }
  window.assignBlackMarket(missionId, sel.value)
}
