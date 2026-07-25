import { G, ui, sPow, sqP, sn, fmt, clamp, getMissionSpecBonus } from '../state.js'
import { RANKS, RKC } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { pCl } from './roster.js'
import { oSqA } from './squads.js'
import { isEnabled } from '../../../config/features.js'
import { resolveMission } from '../../../shared/types/MissionTemplate.js'
import { BLACK_MARKET_MISSIONS, BM_MISSION_BY_ID, getUnderworldTier, UNDERWORLD_TIERS } from '../../../shared/constants/blackMarket.js'
import { MISSION_APPROACHES } from '../../../shared/utils/missionEngine.js'
import { openBattleViewer } from '../liveBattle.js'
import { t as tr } from '../../../shared/utils/i18n.js'

/** Replay the last mission as a live, watch-it-unfold battle. */
export function watchLastBattle() { if (G.lastMissionReport) openBattleViewer(G.lastMissionReport) }

/** Toggle auto-opening the live viewer after each squad mission resolves. */
export function toggleAutoWatch() {
  G._autoWatchBattles = !G._autoWatchBattles
  ntf(G._autoWatchBattles ? 'Auto-watch on — battles play live after each turn.' : 'Auto-watch off.')
  rMissionReport()
}

// Tactical approach picker — favored/mismatch highlighted against a mission's spec.
export function _approachPickerHtml(spec, selId, setterFn) {
  return `<div style="margin-bottom:10px">
    <div style="font-size:var(--fs-micro);letter-spacing:1px;color:var(--text-dim);text-transform:uppercase;margin-bottom:4px">Tactical Approach</div>
    <div style="display:flex;gap:5px">
      ${MISSION_APPROACHES.map(a => {
        const fav = spec && a.favors.includes(spec)
        const mis = spec && a.id !== 'balanced' && !a.favors.includes(spec)
        const sel = a.id === selId
        const tag = fav ? '<span style="color:var(--green)">▲ favored</span>' : mis ? '<span style="color:var(--red-soft)">▼ mismatch</span>' : '<span style="color:var(--text-faint)">—</span>'
        return `<div onclick="${setterFn}('${a.id}')" style="flex:1;text-align:center;padding:5px 4px;cursor:pointer;border:1px solid ${sel ? 'var(--gold)' : 'var(--border)'};background:${sel ? 'rgba(201,168,76,.10)' : 'transparent'}">
          <div style="font-size:var(--fs-lead)">${a.icon}</div>
          <div style="font-size:var(--fs-small);color:${sel ? 'var(--gold)' : 'var(--text-mid)'};font-weight:${sel ? 'bold' : 'normal'}">${a.label}</div>
          <div style="font-size:var(--fs-micro);margin-top:1px">${tag}</div>
        </div>`
      }).join('')}
    </div>
  </div>`
}

export function mTab(t) {
  ui.MT = t
  ;['solo', 'squad', 'def', 'chains', 'templates', 'log', 'underground'].forEach(x => {
    const el = document.getElementById('ms-' + x)
    if (el) el.style.display = x === t ? '' : 'none'
    const btn = document.getElementById('mt-' + x)
    if (btn) btn.classList.toggle('active', x === t)
  })
}

export function rMi() { rRB(); rWCE(); rTacticalPrep(); rSoloM(); rSqM(); rDef(); rChains(); rMissionReport(); rTemplates(); rMissionLog(); rUnderground(); rMissionInspector() }

// ── P3: Mission briefing inspector (right-side panel) ───────────────────────────
export function selectMission(id) { ui.msSel = id; rMissionInspector() }
export function setInspectorApproach(id) { ui.aApproach = id; rMissionInspector() }
export function deployFromInspector(sId) { ui.aT = ui.msSel; doA(sId) }

export function rMissionInspector() {
  const el = document.getElementById('ms-inspector'); if (!el) return
  const m = (G.avM || []).find(x => x.id === ui.msSel && !x.sq)
  if (!m) {
    el.innerHTML = `<div style="border:1px solid var(--border);background:var(--sunken);padding:14px;font-size:var(--fs-small);color:var(--text-faint);text-align:center;line-height:1.6">${tr('mission.inspector.empty')}</div>`
    return
  }
  if (!ui.aApproach) ui.aApproach = 'balanced'
  const av = G.shinobi.filter(s => s.status === 'available')
  const ranked = av.map(s => ({ s, sc: _previewSc(s, m), pw: sPow(s) }))
    .filter(c => c.pw >= m.mp).sort((a, b) => b.sc - a.sc).slice(0, 4)
  const aM = G.aM.find(a => a.missionId === m.id && !a.isSquad)
  el.innerHTML = `
    <div style="border:1px solid var(--accent-border);background:var(--sunken);padding:12px">
      <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:6px">${tr('mission.briefing')}</div>
      <div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold;margin-bottom:3px">${m.n}</div>
      <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:8px">${m.rk}-Rank · ${fmt(m.ryo)} ryo · +${m.rep} rep · ${m.dur}m · Risk ${Math.round(m.risk * 100)}% · Min pwr ${m.mp}</div>
      ${_missionIntel(m)}
      ${aM
        ? `<div style="font-size:var(--fs-body);color:var(--orange);margin-top:8px">⟳ ${sn(G.shinobi.find(s => s.id === aM.assignedTo) || { fn: '?', ln: '' })} deployed — ${aM.daysLeft}m left</div>`
        : `<div style="font-size:var(--fs-micro);letter-spacing:1px;color:var(--text-dim);text-transform:uppercase;margin:8px 0 4px">Tactical Approach</div>
           ${_approachPickerHtml(m.spec, ui.aApproach, 'setInspectorApproach')}
           <div style="font-size:var(--fs-micro);letter-spacing:1px;color:var(--text-dim);text-transform:uppercase;margin:8px 0 4px">Best-Fit Squad</div>
           ${ranked.length ? ranked.map(c => {
             const col = c.sc >= 0.65 ? 'var(--green)' : c.sc >= 0.4 ? 'var(--orange)' : 'var(--red)'
             return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--surface)">
               <div style="flex:1"><div style="font-size:var(--fs-body);color:var(--text-hi)">${sn(c.s)}</div><div style="font-size:var(--fs-micro);color:var(--text-faint)">${RANKS[c.s.ri]} · Pwr ${c.pw}</div></div>
               <span style="font-size:var(--fs-body);color:${col};font-family:var(--font-num,'Courier New',monospace)">${Math.round(c.sc * 100)}%</span>
               <button class="gb" style="font-size:var(--fs-micro);padding:2px 7px" onclick="deployFromInspector('${c.s.id}')">${tr('mission.deploy')}</button>
             </div>`
           }).join('') : `<div style="font-size:var(--fs-small);color:var(--red)">No eligible shinobi (need power ${m.mp}+).</div>`}`}
    </div>`
}

export function rTacticalPrep() {
  const el = document.getElementById('ms-prep')
  if (!el) return
  const mode = G.missionPrepMode || 'standard'
  const modes = [
    { id:'aggressive', label:'Aggressive', icon:'⚔', desc:'+8% success, +4% KIA risk', color:'var(--red)' },
    { id:'standard',   label:'Standard',   icon:'⚖', desc:'Default — balanced risk/reward', color:'var(--gold)' },
    { id:'cautious',   label:'Cautious',   icon:'🛡', desc:'−6% success, −3% KIA risk', color:'var(--green)' },
  ]
  el.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:14px;align-items:stretch">
    ${modes.map(m => `
      <div onclick="setMissionPrep('${m.id}')" style="flex:1;padding:7px 8px;border:1px solid ${mode===m.id?m.color:'var(--border)'};background:${mode===m.id?'rgba(0,0,0,.4)':'transparent'};cursor:pointer;text-align:center">
        <div style="font-size:var(--fs-lead);margin-bottom:2px">${m.icon}</div>
        <div style="font-size:var(--fs-small);color:${mode===m.id?m.color:'var(--text-dim)'};font-weight:${mode===m.id?'bold':'normal'}">${m.label}</div>
        <div style="font-size:var(--fs-micro);color:var(--border-hi);margin-top:2px">${m.desc}</div>
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
  const GRADE_COLOR = { A:'var(--gold)', B:'var(--green)', C:'var(--orange)', D:'var(--red)' }
  const QUALITY_LABEL = { decisive:'Decisive', narrow:'Narrow', costly:'Costly', disaster:'Disaster' }
  // Play-by-play: the three contested beats of the operation.
  const beatHtml = (r.phases && r.phases.length) ? `
    <div style="display:flex;gap:6px;margin-bottom:8px">
      ${r.phases.map(p => {
        const c = p.won ? 'var(--green)' : 'var(--red)'
        return `<div style="flex:1;border:1px solid ${c}44;background:${p.won?'rgba(143,188,143,.06)':'rgba(255,102,102,.06)'};padding:5px 7px;text-align:center">
          <div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">${p.name}</div>
          <div style="font-size:var(--fs-lead);color:${c};font-weight:bold;margin-top:2px">${p.won ? '✓' : '✕'}</div>
        </div>`
      }).join('')}
    </div>
    ${r.quality ? `<div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:8px">Outcome: <b style="color:${r.succeeded ? 'var(--green)' : 'var(--red)'}">${QUALITY_LABEL[r.quality] || r.quality}</b>${r.margin != null ? ` · margin ${r.margin > 0 ? '+' : ''}${r.margin}` : ''}</div>` : ''}` : ''
  el.innerHTML = `<div style="background:var(--bg);border:1px solid var(--border);padding:10px;margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase">
        Last Mission Report — ${r.missionName} (${r.missionRk}-Rank) · ${r.succeeded?'<span style="color:var(--green)">SUCCESS</span>':'<span style="color:var(--red)">FAILURE</span>'}
      </div>
      ${(r.phases && r.phases.length) ? `<div style="display:flex;align-items:center;gap:8px">
        <button class="gb" style="font-size:var(--fs-micro);padding:2px 8px;border-color:var(--gold);color:var(--gold)" onclick="watchLastBattle()">▶ Watch</button>
        <label style="font-size:var(--fs-micro);color:${G._autoWatchBattles ? 'var(--green)' : 'var(--text-dim)'};cursor:pointer;user-select:none;display:flex;align-items:center;gap:3px" onclick="toggleAutoWatch()">${G._autoWatchBattles ? '☑' : '☐'} Auto-watch</label>
      </div>` : ''}
    </div>
    ${beatHtml}
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${r.scores.map(sc => `<div style="background:var(--sunken);border:1px solid ${GRADE_COLOR[sc.grade]}22;padding:6px 9px;min-width:80px">
        <div style="font-size:var(--fs-body);color:var(--text-hi)">${sc.name}</div>
        <div style="font-size:var(--fs-micro);color:var(--text-dim);margin-top:1px">${sc.role}</div>
        <div style="font-size:var(--fs-head);font-weight:bold;color:${GRADE_COLOR[sc.grade]};margin-top:3px">${sc.grade}</div>
        <div style="font-size:var(--fs-micro);color:${GRADE_COLOR[sc.grade]};margin-top:1px">${sc.detail}</div>
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
  const color = ml <= 1 ? 'var(--red)' : ml <= 2 ? 'var(--orange)' : 'var(--text-dim)'
  return `<span style="font-size:var(--fs-micro);color:${color};border:1px solid ${color};padding:1px 4px;margin-left:5px">Expires ${ml}m</span>`
}

// Risk-tier color so danger reads at a glance when scanning the board:
// green ≤15% (safe), amber ≤30% (moderate), red >30% (dangerous).
function _riskColor(risk) {
  const pct = risk * 100
  return pct <= 15 ? 'var(--green)' : pct <= 30 ? 'var(--orange)' : 'var(--red)'
}

function _chainBadge(m) {
  if (!m.chainId) return ''
  return `<span style="font-size:var(--fs-micro);color:var(--blue);border:1px solid var(--blue);padding:1px 4px;margin-left:5px" title="Chain: ${m.chainName}">⛓ ${m.chainName} ${m.chainStep + 1}/${m.chainTotal}</span>`
}

// ── Route B: Mission Intel Phase ─────────────────────────────────────────────
const _TERRAIN_MAP  = { stealth:'Forest / Urban', combat:'Open Field / Ruins', intel:'Enemy Territory', escort:'Road Network', siege:'Fortification', recovery:'Hostile Zone' }
const _CLAN_POOL    = ['Kageha (Fire)','Shiromi (Taijutsu)','Kagero (Shadow)','Tsuchida (Body)','Tamashii (Genjutsu)','Okamura (Pack)','Mushiba (Hive)','Fuma (Seal)','Mori (Nature)']
const _SPEC_ADV_LBL = { stealth:'Stealth specialists', combat:'Combat-heavy squads', intel:'Intel specialists', escort:'High-speed units', siege:'Heavy jutsu users', recovery:'Medical/support shinobi' }

function _missionIntel(m) {
  const terrain   = _TERRAIN_MAP[m.spec] || 'Varied Terrain'
  const seed      = m.id ? m.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 7
  const clan      = _CLAN_POOL[seed % _CLAN_POOL.length]
  const adv       = m.spec ? `${_SPEC_ADV_LBL[m.spec]} +15% success` : 'No unit-type advantage'
  const dangerCol = m.rk === 'S' ? 'var(--red)' : m.rk === 'A' ? 'var(--orange)' : m.rk === 'B' ? '#a09080' : 'var(--text-faint)'
  const danger    = m.rk === 'S' ? 'Extreme' : m.rk === 'A' ? 'High' : m.rk === 'B' ? 'Medium' : 'Low'
  return `<div style="background:rgba(0,0,0,.3);border-left:2px solid var(--surface-3);padding:5px 8px;margin-bottom:7px;font-size:var(--fs-small)">
    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:2px">
      <span style="color:var(--text-faint)">🗺 <span style="color:var(--text-mid)">${terrain}</span></span>
      <span style="color:var(--text-faint)">⚔ <span style="color:var(--text-mid)">${clan}</span></span>
      <span style="color:var(--text-faint)">☠ <span style="color:${dangerCol}">${danger}</span></span>
    </div>
    <div style="color:#5a7a50">▲ ${adv}</div>
  </div>`
}

export function rSoloM() {
  const el = document.getElementById('ms-solo'), av = G.shinobi.filter(s => s.status === 'available')
  if (G.isOffSeason) { el.innerHTML = _offSeasonBlock(); return }

  const solo    = G.avM.filter(m => !m.sq)
  const main    = solo.filter(m => m.rk !== 'D')
  const civilian = solo.filter(m => m.rk === 'D')
  const idle    = av.length - (G.aM || []).filter(a => !a.isSquad && !a.isScout).length

  const SPEC_LABEL = { stealth:'Stealth', combat:'Combat', intel:'Intel', escort:'Escort', siege:'Siege', recovery:'Recovery' }
  const _mCard = m => {
    const rc  = 'mr-' + m.rk.toLowerCase()
    const aM  = G.aM.find(a => a.missionId === m.id && !a.isSquad)
    // Tags row
    const crisisTag   = m.isCrisis   ? `<span style="font-size:var(--fs-micro);padding:1px 4px;border:1px solid var(--red);color:var(--red-soft);border-radius:2px;margin-right:3px">⚠ URGENT</span>` : ''
    const seasonalTag = m.seasonal   ? `<span style="font-size:var(--fs-micro);padding:1px 4px;border:1px solid var(--gold);color:#e8c86a;border-radius:2px;margin-right:3px">Seasonal</span>` : ''
    const followUpTag = m.isFollowUp ? `<span style="font-size:var(--fs-micro);padding:1px 4px;border:1px solid var(--blue-hi);color:var(--blue-hi);border-radius:2px;margin-right:3px">Recovery</span>` : ''
    const specTag     = m.spec       ? `<span style="font-size:var(--fs-micro);padding:1px 4px;border:1px solid #6a8fa0;color:var(--blue-hi);border-radius:2px">${SPEC_LABEL[m.spec]}</span>` : ''
    // Best-fit preview (highest sc eligible shinobi)
    let bestFitBtn = ''
    if (!aM && av.length) {
      const best = av
        .filter(s => sPow(s) >= m.mp && !(s.pers.effect.rankFilter && ['D','C'].includes(m.rk)))
        .sort((a, b) => _previewSc(b, m) - _previewSc(a, m))[0]
      if (best) {
        const sc = _previewSc(best, m)
        const col = sc >= 0.65 ? 'var(--green)' : sc >= 0.40 ? 'var(--orange)' : 'var(--red)'
        bestFitBtn = `<button class="gb" onclick="doA('${best.id}');oA('${m.id}')" style="background:var(--green-bg);border-color:var(--green-hi);color:var(--green);margin-right:4px" title="Quick-assign ${sn(best)} (${Math.round(sc*100)}%)">★ ${sn(best)} <span style="color:${col}">${Math.round(sc*100)}%</span></button>`
      }
    }
    return `<div class="mc" style="${m.isCrisis ? 'border-left:2px solid var(--red);' : m.seasonal ? 'border-left:2px solid var(--gold);' : ''}">
      <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px">
        <span class="mrb ${rc}">${m.rk}</span>
        <div style="flex:1">
          <div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold;cursor:pointer" onclick="selectMission('${m.id}')" title="View briefing ▸">${m.n}</div>
          <div style="margin-top:3px">${crisisTag}${seasonalTag}${followUpTag}${specTag} ${_expiryBadge(m)}${_chainBadge(m)}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:var(--fs-small);color:var(--text-dim);margin-bottom:7px">
        <span>Reward: <span style="color:var(--gold);font-weight:bold">${fmt(m.ryo)} ryo</span></span>
        <span>Rep: <span style="color:var(--text-hi)">+${m.rep}</span></span>
        <span>Duration: <span style="color:var(--text-hi)">${m.dur}m</span></span>
        <span>Risk: <span style="color:${_riskColor(m.risk)};font-weight:bold">${Math.round(m.risk * 100)}%</span></span>
        <span>Min pwr: <span style="color:var(--text-hi)">${m.mp}</span></span>
      </div>
      ${_missionIntel(m)}
      ${aM
        ? `<div style="font-size:var(--fs-body);color:var(--orange)">⟳ ${sn(G.shinobi.find(s => s.id === aM.assignedTo) || {fn:'?',ln:''})} — ${aM.daysLeft}m left</div>`
        : `<div style="display:flex;gap:4px;flex-wrap:wrap">${bestFitBtn}<button class="gb" onclick="oA('${m.id}')" ${av.length ? '' : 'disabled'}>${tr('mission.assign')}</button></div>`
      }
    </div>`
  }

  // Split A/S rank missions by whether any shinobi is within 20% of min power
  const maxPow = av.length ? Math.max(...av.map(s => sPow(s))) : 0
  const actionable  = main.filter(m => maxPow >= m.mp * 0.80)
  const aspirational= main.filter(m => maxPow < m.mp * 0.80)

  const idleBadge = idle > 0
    ? `<div style="font-size:var(--fs-small);color:var(--orange);margin-bottom:10px">⚠ ${idle} shinobi idle — assign missions below</div>`
    : ''

  const civilianSection = civilian.length === 0 ? '' : `
    <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--border-hi);text-transform:uppercase;margin:14px 0 6px">${tr('mission.civilianContracts')}</div>
    <div style="opacity:0.7">${civilian.map(_mCard).join('')}</div>`

  const aspirationalSection = aspirational.length === 0 ? '' : `
    <details style="margin-top:14px">
      <summary style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--border-hi);text-transform:uppercase;cursor:pointer;user-select:none">
        Future Ops — ${aspirational.length} mission${aspirational.length>1?'s':''} (need more power)
      </summary>
      <div style="opacity:0.45;margin-top:8px">${aspirational.map(_mCard).join('')}</div>
    </details>`

  el.innerHTML = idleBadge + actionable.map(_mCard).join('') + civilianSection + aspirationalSection
}

function _offSeasonBlock() {
  const campCost   = 8000
  const canAfford  = (G.ryo || 0) >= campCost
  const available  = G.shinobi.filter(s => s.status === 'available').length
  const onMission  = G.shinobi.filter(s => s.status === 'mission').length
  const injured    = G.shinobi.filter(s => s.status === 'injured').length
  const highFatigue= G.shinobi.filter(s => (s.fatigue || 0) >= 15).length
  const avgFatigue = G.shinobi.length
    ? Math.round(G.shinobi.reduce((a,s) => a + (s.fatigue||0), 0) / G.shinobi.length)
    : 0

  // Season preview — what's coming M4
  const nextSeasonMissions = (G.avM || []).filter(m => !m.sq).length
  const monthsLeft = 4 - ((G.month - 1) % 3 + 1)

  // D-rank civilian contracts available even off-season
  const dRankPool = (G.avM || []).filter(m => !m.sq && m.rk === 'D')
  const dSection = dRankPool.length > 0 ? `
    <div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--surface-3)">
      <div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Civilian Contracts — available year-round</div>
      ${dRankPool.map(m => {
        const aM  = (G.aM||[]).find(a => a.missionId === m.id)
        const av2 = G.shinobi.filter(s => s.status === 'available')
        const best = av2.sort((a,b) => sPow(b)-sPow(a))[0]
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border:1px solid var(--surface-3);background:var(--bg);margin-bottom:4px">
          <div>
            <div style="font-size:var(--fs-body);color:var(--text-hi)">${m.n}</div>
            <div style="font-size:var(--fs-micro);color:var(--text-dim)">${fmt(m.ryo)} ryo · ${m.dur}m · Risk <span style="color:${_riskColor(m.risk)}">${Math.round(m.risk*100)}%</span></div>
          </div>
          ${aM
            ? `<div style="font-size:var(--fs-small);color:var(--orange)">⟳ ${sn(G.shinobi.find(s=>s.id===aM.assignedTo)||{fn:'?',ln:''})} — ${aM.daysLeft}m</div>`
            : best ? `<button class="gb" style="font-size:var(--fs-micro)" onclick="doA('${best.id}');rSoloM()">▶ ${sn(best)}</button>` : '<span style="font-size:var(--fs-micro);color:var(--text-faint)">No shinobi</span>'
          }
        </div>`
      }).join('')}
    </div>` : ''

  return `<div style="border:1px solid #4a8080;background:rgba(0,80,80,.12);padding:16px;margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div>
        <div style="font-size:var(--fs-sub);color:var(--blue);font-weight:bold">⛄ Off-Season — Month ${G.month}</div>
        <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:3px">Full missions resume Month 4 · ${monthsLeft > 0 ? monthsLeft + 'm remaining' : 'last month of rest'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:var(--fs-small);color:var(--text-dim)">Avg fatigue</div>
        <div style="font-size:var(--fs-sub);color:${avgFatigue>15?'var(--orange)':'var(--green)'};font-weight:bold">${avgFatigue}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">
      <div style="background:var(--surface);padding:8px;border:1px solid var(--border);text-align:center">
        <div style="font-size:var(--fs-sub);color:var(--green);font-weight:bold">${available}</div>
        <div style="font-size:var(--fs-micro);color:var(--text-faint)">Resting</div>
      </div>
      <div style="background:var(--surface);padding:8px;border:1px solid var(--border);text-align:center">
        <div style="font-size:var(--fs-sub);color:var(--orange);font-weight:bold">${onMission}</div>
        <div style="font-size:var(--fs-micro);color:var(--text-faint)">On mission</div>
      </div>
      <div style="background:var(--surface);padding:8px;border:1px solid var(--border);text-align:center">
        <div style="font-size:var(--fs-sub);color:${injured>0?'var(--red)':'var(--text-faint)'};font-weight:bold">${injured}</div>
        <div style="font-size:var(--fs-micro);color:var(--text-faint)">Injured</div>
      </div>
      <div style="background:var(--surface);padding:8px;border:1px solid var(--border);text-align:center">
        <div style="font-size:var(--fs-sub);color:${highFatigue>0?'var(--red-soft)':'var(--text-faint)'};font-weight:bold">${highFatigue}</div>
        <div style="font-size:var(--fs-micro);color:var(--text-faint)">High fatigue</div>
      </div>
    </div>

    <div style="font-size:var(--fs-body);color:var(--text);font-weight:bold;margin-bottom:8px">Off-Season Actions</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="border:1px solid #3a5050;padding:10px;background:#0d1a1a">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:var(--fs-body);color:var(--blue);font-weight:bold">🏕 Training Camp</div>
            <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">Reset fatigue, +1 stat for each shinobi, +5 morale · 8,000 ryo${canAfford ? '' : ' <span style="color:var(--red)">(insufficient funds)</span>'}</div>
          </div>
          <button class="gb" onclick="runTrainingCamp()" ${canAfford ? '' : 'disabled'} style="white-space:nowrap">${canAfford ? 'Run Camp ►' : 'Need ryo'}</button>
        </div>
      </div>
      <div style="border:1px solid var(--border-hi);padding:10px;background:var(--sunken)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:var(--fs-body);color:var(--text-hi);font-weight:bold">🎓 Youth Academy</div>
            <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">Review and graduate incoming prospects.</div>
          </div>
          <button class="gb" onclick="sp('academy')">View Academy ►</button>
        </div>
      </div>
      <div style="border:1px solid var(--border-hi);padding:10px;background:var(--sunken)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:var(--fs-body);color:var(--text-hi);font-weight:bold">🛒 Free Agent Market</div>
            <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">Sign available shinobi before the season opens.</div>
          </div>
          <button class="gb" onclick="sp('transfers')">Open Market ►</button>
        </div>
      </div>
      <div style="border:1px solid var(--border-hi);padding:10px;background:var(--sunken)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:var(--fs-body);color:var(--text-hi);font-weight:bold">📋 Contract Renewals</div>
            <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">Review salaries and renew contracts now.</div>
          </div>
          <button class="gb" onclick="sp('roster')">Open Roster ►</button>
        </div>
      </div>
      <div style="border:1px solid var(--border-hi);padding:10px;background:var(--sunken)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:var(--fs-body);color:var(--text-hi);font-weight:bold">🌍 Diplomacy</div>
            <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">Negotiate trade routes and village relations during the quiet season.</div>
          </div>
          <button class="gb" onclick="sp('diplomacy')">Open ►</button>
        </div>
      </div>
    </div>
    ${dSection}
  </div>`
}

export function rSqM() {
  const el = document.getElementById('ms-squad')
  if (G.isOffSeason) { el.innerHTML = ''; return }
  el.innerHTML = G.avM.filter(m => m.sq).map(m => {
    const rc = 'mr-' + m.rk.toLowerCase(), aM = G.aM.find(a => a.missionId === m.id && a.isSquad)
    return `<div class="mc">
      <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px">
        <span class="mrb ${rc}">${m.rk}</span>
        <div>
          <div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold">${m.n} <span style="font-size:var(--fs-small);color:var(--purple)">Squad</span></div>
          <div style="margin-top:3px">${_expiryBadge(m)}${_chainBadge(m)}</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:var(--fs-small);color:var(--text-dim);margin-bottom:7px">
        <span>Reward: <span style="color:var(--gold);font-weight:bold">${fmt(m.ryo)} ryo</span></span>
        <span>Min sq pwr: <span style="color:var(--text-hi)">${m.mp}</span></span>
        <span>Duration: <span style="color:var(--text-hi)">${m.dur}m</span></span>
        ${m.risk != null ? `<span>Risk: <span style="color:${_riskColor(m.risk)};font-weight:bold">${Math.round(m.risk * 100)}%</span></span>` : ''}
      </div>
      ${aM ? `<div style="font-size:var(--fs-body);color:var(--orange)">⟳ Squad on mission — ${aM.daysLeft}m left</div>` : `<button class="gb" onclick="pickSq('${m.id}')">${tr('mission.assignSquad')}</button>`}
    </div>`
  }).join('') || '<div style="color:var(--text-dim);font-size:var(--fs-body)">No squad missions.</div>'
}

export function pickSq(mId) {
  const fq = G.squads.filter(sq => sq.members.every(id => { const s = G.shinobi.find(x => x.id === id); return s && s.status === 'available' }))
  if (!fq.length) { ntf(tr('toast.missions.noSquads')); return }
  ui.sqAT = fq[0].id; oSqA(fq[0].id)
}

export function rDef() {
  const el = document.getElementById('ms-def')
  if (!G.raid || G.raid.resolved) { el.innerHTML = `<div style="color:var(--text-dim);font-size:var(--fs-body)">${tr('mission.noThreats')}</div>`; return }
  const wD = (G.upgrades.wall === 1 ? 15 : G.upgrades.wall === 2 ? 35 : 0) + (G.upgrades.seal === 1 ? 10 : G.upgrades.seal === 2 ? 25 : 0) + (G.tempDef || 0)
  const def = G.defSh ? G.shinobi.find(s => s.id === G.defSh) : null
  const av = G.shinobi.filter(s => s.status === 'available')
  el.innerHTML = `<div style="background:#1a0000;border:1px solid var(--red);padding:12px"><div style="font-size:var(--fs-body);color:var(--red);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">⚠ ${G.raid.n}</div><div style="font-size:var(--fs-body);color:var(--red-soft);margin-bottom:10px">${G.raid.desc}</div><div style="display:flex;gap:18px;margin-bottom:10px"><div><div style="font-size:var(--fs-micro);color:var(--text-dim);letter-spacing:1px">THREAT</div><div style="font-size:var(--fs-head);color:var(--red);font-weight:bold">${G.raid.str}</div></div><div><div style="font-size:var(--fs-micro);color:var(--text-dim);letter-spacing:1px">WALL DEF</div><div style="font-size:var(--fs-head);color:var(--green);font-weight:bold">${wD}</div></div><div><div style="font-size:var(--fs-micro);color:var(--text-dim);letter-spacing:1px">ARRIVES IN</div><div style="font-size:var(--fs-head);color:var(--orange);font-weight:bold">${G.raidW}m</div></div></div>${def ? `<div style="font-size:var(--fs-body);color:var(--green);margin-bottom:7px">Defender: ${sn(def)} (Pwr ${sPow(def)})</div><button class="gb gb-r" onclick="G_defShClear()">Remove</button>` : av.map(s => `<div class="pi" onclick="G_defShSet('${s.id}')" style="margin-bottom:4px"><div style="font-size:var(--fs-body);color:var(--text-hi)">${sn(s)}</div><div style="font-size:var(--fs-small);color:var(--text-dim)">${RANKS[s.ri]} · Pwr ${sPow(s)}</div></div>`).join('') || '<div style="color:var(--text-dim);font-size:var(--fs-body)">No shinobi available.</div>'}</div>`
}

export function rChains() {
  const el = document.getElementById('ms-chains')
  if (!el) return
  const active    = G.missionChains || []
  const completed = (G.completedMissionChains || []).slice().reverse().slice(0, 10)

  const RK_COLORS = { D:'var(--green)', C:'var(--blue)', B:'var(--gold)', A:'var(--orange)', S:'var(--red)' }

  const activeHtml = active.length === 0
    ? `<div style="color:var(--text-dim);font-size:var(--fs-body);margin-bottom:12px">${tr('mission.chains.none')}</div>`
    : active.map(chain => {
        const completedCount = chain.completedSteps.length
        const totalSteps = chain.steps.length
        const pct = Math.round(completedCount / totalSteps * 100)
        const currentStep = chain.steps[chain.currentStep]
        // Find if the current step is on the mission board
        const boardM = currentStep ? G.avM.find(m => m.chainId === chain.id && m.chainStep === chain.currentStep) : null
        const activeM = boardM ? G.aM.find(a => a.missionId === boardM.id) : null

        return `<div style="background:#0d1a0d;border:1px solid var(--green-bg);padding:10px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div>
              <div style="font-size:var(--fs-body);color:var(--gold);font-weight:bold">⛓ ${chain.n}</div>
              <div style="font-size:var(--fs-micro);color:var(--text-dim);margin-top:1px">Started Y${chain.startYear}·M${chain.startMonth}</div>
            </div>
            <div style="font-size:var(--fs-body);color:var(--green)">${completedCount}/${totalSteps} complete</div>
          </div>
          <div style="background:var(--sunken);height:4px;border-radius:2px;margin-bottom:8px">
            <div style="background:var(--green);height:4px;border-radius:2px;width:${pct}%"></div>
          </div>
          <div style="display:flex;gap:4px;margin-bottom:8px">
            ${chain.steps.map((step, i) => {
              const done   = chain.completedSteps.includes(i)
              const failed = chain.failedSteps.includes(i)
              const active = i === chain.currentStep
              const rkC    = RK_COLORS[step.rk] || 'var(--text-mid)'
              return `<div style="flex:1;padding:4px;border:1px solid ${done?'var(--green)':failed?'var(--red)':active?rkC:'var(--border)'};background:${done?'#0a1a0a':failed?'var(--red-bg)':active?'rgba(0,0,0,.4)':'transparent'};text-align:center">
                <div style="font-size:var(--fs-micro);color:${done?'var(--green)':failed?'var(--red)':active?rkC:'var(--text-faint)'};text-transform:uppercase">${done?'✓':failed?'✗':active?'NOW':String(i+1)}</div>
                <div style="font-size:var(--fs-micro);color:${active?rkC:'var(--text-faint)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${step.rk}-Rank</div>
              </div>`
            }).join('')}
          </div>
          ${currentStep ? `<div style="font-size:var(--fs-small);color:var(--text-dim)">
            Next: <span style="color:var(--text-hi)">${currentStep.n}</span> (${currentStep.rk}-Rank · ${fmt(currentStep.ryo)} ryo)
            ${boardM ? ` · <span style="color:${activeM ? 'var(--orange)' : 'var(--blue)'}">
              ${activeM ? `⟳ In progress` : '📋 On mission board'}
            </span>` : ' · <span style="color:var(--text-dim)">Generating…</span>'}
          </div>` : ''}
          ${chain.state && (chain.state.ryoAccumulated > 0 || chain.state.injuryEscalation > 0) ? `
          <div style="display:flex;gap:12px;font-size:var(--fs-micro);color:var(--text-dim);margin-top:5px;padding-top:5px;border-top:1px solid var(--green-bg)">
            ${chain.state.ryoAccumulated > 0 ? `<span>Banked: <span style="color:var(--gold)">+${fmt(Math.round(chain.state.ryoAccumulated*0.5))} ryo</span> on completion</span>` : ''}
            ${chain.state.injuryEscalation > 0 ? `<span>Risk escalation: <span style="color:var(--red-soft)">+${Math.round(chain.state.injuryEscalation*100)}%</span></span>` : ''}
          </div>` : ''}
        </div>`
      }).join('')

  const completedHtml = completed.length === 0
    ? '<div style="font-size:var(--fs-body);color:var(--border-hi)">No completed chains yet.</div>'
    : completed.map(chain => {
        const bonusRyo = chain.state ? Math.round(chain.state.ryoAccumulated * 0.5) : 0
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;border-left:2px solid var(--green);margin-bottom:4px">
          <div>
            <div style="font-size:var(--fs-small);color:var(--green)">✓ ${chain.n}</div>
            ${bonusRyo > 0 ? `<div style="font-size:var(--fs-micro);color:var(--gold)">${fmt(bonusRyo)} ryo chain bonus paid</div>` : ''}
          </div>
          <div style="font-size:var(--fs-micro);color:var(--border-hi)">Y${chain.completedYear}·M${chain.completedMonth||'?'}</div>
        </div>`
      }).join('')

  el.innerHTML = `
    <div style="font-size:var(--fs-micro);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">${tr('mission.chains.active')}</div>
    ${activeHtml}
    <div style="font-size:var(--fs-micro);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-top:14px;margin-bottom:8px">${tr('mission.chains.completed')}</div>
    ${completedHtml}
  `
}

// Lightweight preview success-chance used in the assignment picker.
// Intentionally approximate (full formula is in adv.js); directionally correct for decision-making.
function _previewSc(s, m) {
  const pw       = sPow(s)
  const fatMod   = -(s.fatigue || 0) * 0.004
  const confMod  = ((s.confidence || 50) - 50) * 0.002
  const specBonus= getMissionSpecBonus(s, m)
  const ceiling  = m.rk === 'S' ? 0.82 : m.rk === 'A' ? 0.88 : 0.95
  return clamp(1 - m.risk + (pw - m.mp) * 0.01 + specBonus + confMod + fatMod, 0.08, ceiling)
}

function _scBadge(sc) {
  const pct = Math.round(sc * 100)
  const col = sc >= 0.65 ? 'var(--green)' : sc >= 0.40 ? 'var(--orange)' : 'var(--red)'
  return `<span style="font-size:var(--fs-micro);padding:1px 5px;border:1px solid ${col};color:${col};border-radius:2px">${pct}%</span>`
}

function _fatigueBar(s) {
  const f = s.fatigue || 0
  const pct = Math.round(f * 4)   // fatigue 0-25 → 0-100%
  const col = f <= 8 ? 'var(--green)' : f <= 16 ? 'var(--orange)' : 'var(--red)'
  return `<span style="font-size:var(--fs-micro);color:${col}">⚡${pct}%</span>`
}

export function oA(mId) {
  ui.aT = mId
  const m = G.avM.find(x => x.id === mId)
  const SPEC_LABEL = { stealth:'Stealth', combat:'Combat', intel:'Intel', escort:'Escort', siege:'Siege', recovery:'Recovery' }
  const specTag     = m.spec     ? `<span style="font-size:var(--fs-micro);padding:1px 5px;border:1px solid #6a8fa0;color:var(--blue-hi);border-radius:2px">${SPEC_LABEL[m.spec]}</span> ` : ''
  const crisisTag   = m.isCrisis ? `<span style="font-size:var(--fs-micro);padding:1px 5px;border:1px solid var(--red);color:var(--red-soft);border-radius:2px">URGENT</span> ` : ''
  const seasonalTag = m.seasonal ? `<span style="font-size:var(--fs-micro);padding:1px 5px;border:1px solid var(--gold);color:#e8c86a;border-radius:2px">Seasonal</span> ` : ''
  document.getElementById('ma-t').innerHTML = crisisTag + seasonalTag + specTag + 'Assign: ' + m.n
  document.getElementById('ma-d').textContent = m.rk + '-Rank · ' + fmt(m.ryo) + ' ryo · Risk ' + Math.round(m.risk * 100) + '% · Min pwr ' + m.mp

  const av = G.shinobi.filter(s => s.status === 'available')

  // Compute preview SC for all candidates to find best fit
  const candidates = av.map(s => {
    const pw  = sPow(s)
    const ok  = pw >= m.mp
    const ref = s.pers.effect.rankFilter && ['D', 'C'].includes(m.rk)
    const sc  = (!ok || ref) ? null : _previewSc(s, m)
    const specMatch = m.spec && getMissionSpecBonus(s, m) > 0
    return { s, pw, ok, ref, sc, specMatch }
  })

  // Best-fit = highest sc among eligible
  const bestFitId = candidates
    .filter(c => c.sc !== null)
    .sort((a, b) => b.sc - a.sc)[0]?.s.id ?? null

  const bestFitBtn = bestFitId
    ? `<button onclick="doA('${bestFitId}')" style="width:100%;margin-bottom:10px;background:var(--green-bg);border:1px solid var(--green);color:var(--green);padding:5px;border-radius:3px;cursor:pointer;font-size:var(--fs-small)">★ Best Fit — auto-assign highest chance</button>`
    : ''

  if (!ui.aApproach) ui.aApproach = 'balanced'
  const approachHtml = _approachPickerHtml(m.spec, ui.aApproach, 'setMissionApproach')
  document.getElementById('ma-l').innerHTML = approachHtml + bestFitBtn + candidates.map(({ s, pw, ok, ref, sc, specMatch }) => {
    const eligible = ok && !ref
    const specBadge = specMatch ? `<span style="font-size:var(--fs-micro);color:var(--blue-hi);margin-left:3px">▲${m.spec}</span>` : ''
    return `<div class="pi" onclick="${eligible ? `doA('${s.id}')` : ''}" style="${eligible ? '' : 'opacity:0.4;cursor:not-allowed'}">
      <div>
        <div style="font-size:var(--fs-body);color:var(--text-hi)">${sn(s)} <span class="trait-tag ${pCl(s.pers)}" style="font-size:var(--fs-micro)">${s.pers.n}</span>${specBadge}</div>
        <div style="font-size:var(--fs-small);color:var(--text-dim)">${RANKS[s.ri]} · Pwr ${pw}${ref ? ' · Refuses low-rank' : !ok ? ` (need ${m.mp - pw} more)` : ''} · ${_fatigueBar(s)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
        ${sc !== null ? _scBadge(sc) : '<span style="font-size:var(--fs-small);color:var(--red)">✗</span>'}
        ${eligible && s.id === bestFitId ? '<span style="font-size:var(--fs-micro);color:var(--green)">★best</span>' : ''}
      </div>
    </div>`
  }).join('') || '<div style="color:var(--text-dim);font-size:var(--fs-body)">No available shinobi.</div>'
  document.getElementById('ov-assign').classList.add('open')
}

export function setMissionApproach(id) { ui.aApproach = id; if (ui.aT) oA(ui.aT) }

export function doA(sId) {
  const m = G.avM.find(x => x.id === ui.aT), s = G.shinobi.find(x => x.id === sId)
  if (!m || !s) return
  s.status = 'mission'; s.missId = m.id
  G.aM.push({ id: Math.random().toString(36).slice(2), missionId: m.id, assignedTo: sId, squadId: null, daysLeft: m.dur, isSquad: false, approach: ui.aApproach || 'balanced' })
  cm('assign'); aL(sn(s) + ' dispatched on "' + m.n + '".', 'neutral'); ntf(s.fn + ' deployed!'); upUI()
}

// ── Mission Template picker (Phase 1) ─────────────────────────────────────────
export function rTemplates() {
  const el = document.getElementById('ms-templates')
  if (!el) return
  if (!isEnabled('MISSION_TEMPLATES')) {
    el.innerHTML = '<div style="color:var(--text-faint);font-size:.8rem;padding:20px">Mission templates are disabled (feature flag).</div>'
    return
  }
  const templates = G.missionTemplates || []
  if (!templates.length) {
    el.innerHTML = '<div style="color:var(--text-faint);font-size:.8rem;padding:20px">No templates loaded. Call seedPhase1(G) in the console to load sample templates.</div>'
    return
  }

  const RANK_COLOR = { D:'var(--green)', C:'var(--green)', B:'var(--orange)', A:'var(--red)', S:'var(--gold)' }
  const avgPow = G.shinobi.length
    ? Math.round(G.shinobi.filter(s => s.status === 'available').reduce((a, s) => a + (s.stats ? Object.values(s.stats).reduce((x, v) => x + v, 0) / Object.keys(s.stats).length : 30), 0) / Math.max(1, G.shinobi.filter(s => s.status === 'available').length))
    : 25

  el.innerHTML = `
    <div style="font-size:.72rem;color:var(--text-faint);margin-bottom:12px">
      Mission templates define reusable mission profiles. Click <b>Simulate</b> to preview an expected outcome based on your current squad power (avg: <span style="color:var(--gold)">${avgPow}</span>).
    </div>
    <div style="display:grid;gap:10px">
      ${templates.map(t => {
        const rc = RANK_COLOR[t.baseDifficulty] || 'var(--text-mid)'
        return `
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:12px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
              <span style="font-size:.7rem;padding:1px 6px;border:1px solid ${rc};color:${rc}">${t.baseDifficulty}</span>
              <span style="color:var(--gold-hi);font-weight:bold">${t.name}</span>
              <span style="color:var(--text-faint);font-size:.72rem;margin-left:auto;text-transform:capitalize">${t.type}</span>
            </div>
            <div style="font-size:.75rem;color:var(--text-mid);margin-bottom:6px">${t.description}</div>
            <div style="display:flex;gap:12px;font-size:.72rem;color:var(--text-dim);margin-bottom:8px">
              <span>Reward: <span style="color:var(--gold)">${fmt(t.rewardRange.min)}–${fmt(t.rewardRange.max)}</span></span>
              <span>Injury: <span style="color:var(--orange)">${Math.round(t.riskProfile.injuryChance * 100)}%</span></span>
              <span>Roles: <span style="color:var(--blue-hi)">${t.requiredRoles.join(', ') || 'any'}</span></span>
            </div>
            <button onclick="simTemplate('${t.id}')" style="background:var(--surface-2);border:1px solid var(--blue-bg);color:var(--blue-hi);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:.72rem">▶ Simulate</button>
            <span id="sim-${t.id}" style="font-size:.72rem;color:var(--text-dim);margin-left:8px"></span>
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

  // Match replay archive — re-watch recent matches on the animated board.
  const archive = G.matchArchive || []
  const archiveHtml = archive.length ? `<div style="border:1px solid var(--border);background:var(--bg);padding:8px 10px;margin-bottom:12px">
    <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:6px">📼 Match Replays</div>
    <div style="display:grid;gap:3px">
      ${archive.map((a, i) => {
        const res = a.kind === 'league' ? (a.result === 'win' ? 'W' : a.result === 'draw' ? 'D' : 'L')
          : a.kind === 'tournament' ? (a.champion ? '🏆' : '—') : (a.succeeded ? '✓' : '✕')
        const rc = (res === 'W' || res === '✓' || res === '🏆') ? 'var(--green)' : res === 'D' ? 'var(--gold)' : 'var(--red)'
        return `<div style="display:flex;align-items:center;gap:8px;font-size:var(--fs-small);padding:2px 4px">
          <span style="color:var(--text-faint);width:34px">Y${a.year}M${a.month}</span>
          <span style="flex:1;color:var(--text-hi)">${a.missionName}${a.oppVillage ? ` <span style="color:var(--text-dim)">vs ${a.oppVillage}</span>` : ''}</span>
          <span style="color:${rc};font-weight:bold;width:14px;text-align:center">${res}</span>
          <button class="gb" style="font-size:var(--fs-micro);padding:1px 7px;border-color:var(--gold);color:var(--gold)" onclick="watchArchivedMatch(${i})">▶ Replay</button>
        </div>`
      }).join('')}
    </div>
  </div>` : ''

  el.innerHTML = archiveHtml + `
    <div style="display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap">
      ${filters.map(f => `
        <button onclick="missionLogFilter('${f.id}')"
          style="font-size:var(--fs-small);padding:3px 8px;border:1px solid ${filter===f.id?'var(--gold)':'var(--border)'};
          background:${filter===f.id?'rgba(201,168,76,.15)':'transparent'};color:${filter===f.id?'var(--gold)':'var(--text-dim)'};cursor:pointer">
          ${f.label}
        </button>`).join('')}
    </div>
    ${visible.length === 0 ? `<div style="color:var(--text-dim);font-size:var(--fs-body)">${tr('mission.log.none')}</div>` : ''}
    ${visible.map(e => {
      const statusColor = e.success ? 'var(--green)' : 'var(--red)'
      const rankColor = e.rank === 'S' ? 'var(--gold)' : e.rank === 'A' ? 'var(--blue)' : e.rank === 'B' ? 'var(--green)' : 'var(--text-dim)'
      return `
        <div style="border:1px solid var(--border);padding:8px;margin-bottom:6px;background:var(--surface)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
            <div>
              <span style="font-size:var(--fs-small);color:${rankColor};font-weight:bold">${e.rank}-rank</span>
              <span style="font-size:var(--fs-body);color:var(--text-hi);margin-left:6px">${e.missionName}</span>
              ${e.chainName ? `<span style="font-size:var(--fs-micro);color:var(--gold);margin-left:5px">⛓ ${e.chainName}</span>` : ''}
            </div>
            <div style="font-size:var(--fs-micro);color:var(--text-dim)">${e.year} Y${e.month}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:3px;flex-wrap:wrap">
            <span style="font-size:var(--fs-small);color:${statusColor}">${e.success ? '✓ Success' : '✗ Failed'}</span>
            ${(() => { const q=e.quality; if(!q||q==='narrow'&&e.success)return ''; const qc={decisive:'var(--gold)',narrow:'var(--orange)',costly:'var(--red-soft)',disaster:'var(--red)'}; const ql={decisive:'⚔ Decisive',narrow:'⚡ Narrow',costly:'💸 Costly',disaster:'💥 Disaster'}; return `<span style="font-size:var(--fs-micro);padding:1px 5px;border:1px solid ${qc[q]||'var(--text-dim)'};color:${qc[q]||'var(--text-dim)'};border-radius:2px">${ql[q]||q}</span>` })()}
            ${e.success ? `<span style="font-size:var(--fs-small);color:var(--gold)">+${e.ryo.toLocaleString()} ryo</span>` : ''}
            ${e.success ? `<span style="font-size:var(--fs-small);color:var(--text-dim)">+${e.rep} rep</span>` : ''}
          </div>
          ${e.injuryName ? `<div style="font-size:var(--fs-micro);color:var(--red);margin-bottom:2px">🩸 Injury: ${e.injuryName}</div>` : ''}
          ${e.chainBonus ? `<div style="font-size:var(--fs-micro);color:var(--gold);margin-bottom:2px">⛓ Chain bonus: +${e.chainBonus.toLocaleString()} ryo</div>` : ''}
          ${e.narrative ? `<div style="font-size:var(--fs-micro);color:var(--text-dim);font-style:italic">${e.narrative}</div>` : ''}
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
  el.style.color = result.success ? 'var(--green)' : 'var(--red)'
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
    <div style="background:#0a0802;border:1px solid var(--gold-bg);padding:10px;margin-bottom:12px">
      <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--gold-2);text-transform:uppercase;margin-bottom:6px">Underworld Standing</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:var(--fs-sub);color:var(--gold);font-weight:bold">${tier.label}</div>
        <div style="font-size:var(--fs-small);color:var(--gold-2)">Rep: ${bmRep}${nextTier ? ` / ${nextTier.minRep} → ${nextTier.label}` : ' (MAX)'}</div>
        ${tier.passiveRyo ? `<div style="font-size:var(--fs-small);color:var(--green)">+${tier.passiveRyo.toLocaleString()} ryo/mo passive</div>` : ''}
      </div>
    </div>
    ${activeBM.length ? `<div style="font-size:var(--fs-small);color:var(--gold-2);margin-bottom:8px">Active contracts: ${activeBM.map(a => `<span style="color:var(--gold)">${BM_MISSION_BY_ID?.[a.bmId]?.n || a.bmId}</span>`).join(', ')}</div>` : ''}
    <div style="display:grid;gap:8px">
    ${BLACK_MARKET_MISSIONS.map(bm => {
      const locked = tier.id === 'unknown' && bm.id !== 'bm_sabotage' && bm.id !== 'bm_theft'
        ? false  // unlock all once contacted
        : bm.id === 'bm_bounty' && !tier.unlocksBounty
      const canAssign = available.filter(s => (s.ri || 0) >= bm.reqRi && (!bm.reqAnbu || s.ri >= 3))
      const RKC2 = { S:'#ff6b6b', A:'var(--gold)', B:'var(--green)', C:'var(--text-mid)' }
      return `
        <div style="background:#0d0a06;border:1px solid ${locked?'var(--border-dim)':'var(--gold-bg)'};padding:10px;opacity:${locked?0.4:1}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
              <span style="font-size:var(--fs-body);color:var(--text-hi)">${bm.icon} ${bm.n}</span>
              <span style="font-size:var(--fs-small);color:${RKC2[bm.rk]||'var(--text-mid)'};margin-left:6px">[${bm.rk}-Rank]</span>
            </div>
            <div style="text-align:right">
              <div style="font-size:var(--fs-body);color:var(--green)">+${bm.ryo.toLocaleString()} ryo</div>
              ${bm.repLoss ? `<div style="font-size:var(--fs-micro);color:var(--red)">Discovery: −${bm.repLoss} rep</div>` : ''}
            </div>
          </div>
          <div style="font-size:var(--fs-micro);color:var(--gold-2);margin-bottom:8px">${bm.desc}</div>
          ${locked ? '<div style="font-size:var(--fs-micro);color:var(--text-faint)">Requires higher underworld standing.</div>' :
            canAssign.length === 0 ? '<div style="font-size:var(--fs-micro);color:var(--text-faint)">No eligible shinobi available.</div>' : `
            <select id="bm-sel-${bm.id}" style="font-size:var(--fs-small);padding:3px;background:var(--sunken);color:var(--text-hi);border:1px solid var(--gold-bg);margin-right:6px">
              <option value="">— assign shinobi —</option>
              ${canAssign.map(s => `<option value="${s.id}">${sn(s)} [${RANKS[s.ri]}]</option>`).join('')}
            </select>
            <button onclick="assignBM('${bm.id}')" style="font-size:var(--fs-small);padding:3px 8px;background:var(--gold-bg);color:var(--gold);border:1px solid #5a4010;cursor:pointer">Send</button>
          `}
        </div>`
    }).join('')}
    </div>`
}

export function assignBM(missionId) {
  const sel = document.getElementById('bm-sel-' + missionId)
  if (!sel?.value) { ntf(tr('toast.missions.selectShinobi')); return }
  window.assignBlackMarket(missionId, sel.value)
}
