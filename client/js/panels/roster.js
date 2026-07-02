import { G, sPow, clamp, rnd, sn, fmt, pDesc, personalityJudge, computeMarketValue } from '../state.js'
import { gradeShinobi } from '../adv.js'
import { memoryStateBlurb, mostSalientMemory } from '../../../shared/utils/memorySystem.js'
import { getArchetypeQuote } from '../../../shared/utils/personality.js'
import { mentorshipSummary, isMentorEligible, isStudentEligible } from '../../../shared/utils/mentorship.js'
import { RANKS, RKC, JUTSU_LIST, INJURY_TYPES, EVOLVED_TRAITS } from '../constants.js'
import { jutsuLoadoutBonus, toggleLoadoutSlot, LOADOUT_MAX } from '../../../shared/jutsu/loadout.js'
import { BOND_TYPES } from '../../../shared/bonds/bondTypes.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { PHASE_META, ensureCareerFields } from '../careerEngine.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { computeStrain, strainBand } from '../../../shared/utils/strain.js'
import { openContextMenu, showHoverPreview, hideHoverPreview, tblSort, tblToggleSort, tblHidden, tblToggleCol, tblSortRows, tblHeaderHtml, tblColumnManagerHtml, tblToggleColumnManager, activityGridHtml } from '../uikit.js'

const _ROSTER_DEFAULT_SORT = { key: 'power', dir: 'desc' }
const _GRADE_ORDER = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 }
const _rankColor = ri => ['#7a7060', '#87ceeb', '#8fbc8f', '#cc7fb8', '#c9a84c'][ri] || '#7a7060'

export function sBars(s) {
  const st = s.stats || {}
  return ['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'].map(k =>
    `<div class="sr"><div class="sl">${k.slice(0,5)}</div><div class="sw"><div class="bar"><div class="fill" style="width:${st[k]||0}%"></div></div><div class="sn">${st[k]||0}</div></div></div>`
  ).join('')
}

export function pCl(p) { return p.cat === 'pos' ? 'trait-pos' : p.cat === 'neg' ? 'trait-neg' : 'trait-neu' }

// ── Power → star rating (1–5 stars) ─────────────────────────────────────────
function _stars(val, max = 100) {
  const count = Math.max(1, Math.min(5, Math.ceil((val / max) * 5)))
  return '★'.repeat(count) + '☆'.repeat(5 - count)
}
function _starsHtml(val, max = 100) {
  const count = Math.max(0, Math.min(5, Math.ceil((val / max) * 5)))
  const col = count >= 4 ? '#c9a84c' : count >= 3 ? '#8fbc8f' : count >= 2 ? '#7a7060' : '#444'
  return `<span style="color:${col};letter-spacing:-1px;font-size:10px">${'★'.repeat(count)}${'☆'.repeat(5-count)}</span>`
}

// ── Route E: Clan Concentration ──────────────────────────────────────────────
function _clanBar() {
  const counts = {}
  G.shinobi.forEach(s => { if (s.clan) counts[s.clan] = (counts[s.clan] || 0) + 1 })
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!ranked.length) return ''
  const [topClan, topCount] = ranked[0]
  const tier = topCount >= 7 ? { label:'LEGENDARY', col:'var(--accent)' }
             : topCount >= 5 ? { label:'IDENTITY',   col:'#8fbc8f' }
             : topCount >= 3 ? { label:'SYNERGY',     col:'#87ceeb' }
             : null
  return `<div style="background:#0d0c0a;border:1px solid var(--accent-border);padding:8px 10px;margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:${tier?'4px':'0'}">
      <span style="font-size:7px;letter-spacing:1px;color:#555;text-transform:uppercase">${tr('roster.clanComposition')}</span>
      ${ranked.slice(0, 5).map(([n, c]) => `<span style="font-size:8px;color:#8a8070">${n} <b style="color:#e8e0cc">${c}</b></span>`).join('<span style="color:#333;font-size:8px"> · </span>')}
      ${ranked.length > 5 ? `<span style="font-size:8px;color:#444">+${ranked.length - 5} more</span>` : ''}
    </div>
    ${tier ? `<div style="font-size:8px;color:${tier.col}">▲ ${topClan} at <b>${tier.label}</b> threshold (${topCount} members) — monthly passive bonus active</div>` : ''}
  </div>`
}

// ── Route C: Dev Path Selector ────────────────────────────────────────────────
const _DEV_PATHS = [
  { id:'anbu',    label:'Shadow Track',          icon:'🗡', desc:'↑ Ninjutsu/Genjutsu growth · S-rank specialist', focus:['ninjutsu','genjutsu'] },
  { id:'anchor',  label:'Squad Anchor',         icon:'🛡', desc:'↑ Taijutsu/Chakra growth · Squad synergy bonus',  focus:['taijutsu','chakra'] },
  { id:'machine', label:'Mission Specialist',   icon:'⚙', desc:'↑ Intelligence/Speed · Faster rank advancement',  focus:['intelligence','speed'] },
]

function _devPathSelector(s) {
  const cur = s.devPath || null
  return `<div style="margin-top:8px">
    <div style="font-size:7px;letter-spacing:1px;color:#555;text-transform:uppercase;margin-bottom:5px">${tr('roster.developmentPath')}</div>
    <div style="display:grid;gap:3px">
      ${_DEV_PATHS.map(p => `<div onclick="setDevPath('${s.id}','${p.id}')" style="padding:5px 8px;border:1px solid ${cur===p.id?'var(--accent)':'#2a2520'};background:${cur===p.id?'var(--accent-bg)':'transparent'};cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:11px">${p.icon}</span>
        <div style="flex:1">
          <div style="font-size:8px;color:${cur===p.id?'var(--accent)':'#a09080'};font-weight:${cur===p.id?'bold':'normal'}">${p.label}</div>
          <div style="font-size:7px;color:#444">${p.desc}</div>
        </div>
        ${cur===p.id?`<span style="font-size:9px;color:var(--accent)">✓</span>`:''}
      </div>`).join('')}
    </div>
  </div>`
}

// ── Potential: capped stat average as proxy for ceiling ──────────────────────
function _potential(s) {
  const st = s.stats || {}
  const keys = ['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed']
  const avg = keys.reduce((a, k) => a + (st[k] || 0), 0) / keys.length
  const potFactor = s.potential !== undefined ? s.potential : avg
  return Math.round(potFactor)
}

export function rRo() {
  const el = document.getElementById('rl')
  if (!G.shinobi.length) { el.innerHTML = `<div style="color:#7a7060;font-size:10px;padding:12px">${tr('roster.none')}</div>`; return }

  // Sort: by rank desc, then power desc
  const sorted = [...G.shinobi].sort((a, b) => (b.ri - a.ri) || (sPow(b) - sPow(a)))

  // Active-assignments panel: shinobi on missions
  const active = sorted.filter(s => s.status === 'mission' || s.status === 'exam' || s.status === 'injured')

  const assignedHtml = active.length === 0
    ? `<div style="font-size:8px;color:#555;padding:10px 0">${tr('roster.noAssignments')}</div>`
    : active.map(s => {
        const sq = G.squads.find(q => q.members.includes(s.id))
        const mission = s.missId ? (G.missions || []).find(m => m.id === s.missId) : null
        const rankLabel = RANKS[s.ri]
        const rankCol = ['#7a7060','#87ceeb','#8fbc8f','#cc7fb8','#c9a84c'][s.ri] || '#7a7060'

        let label, detail, progress, barColor
        if (s.status === 'mission' && mission) {
          label = mission.n
          detail = mission.rk + '-rank · ' + (sq ? sq.n : 'Solo')
          progress = mission.duration ? Math.min(100, Math.round(((mission.duration - (s.missionMonthsLeft || mission.duration)) / mission.duration) * 100)) : 50
          barColor = '#c9a84c'
        } else if (s.status === 'injured') {
          label = 'Recovering from injury'
          detail = `${s.injDays || '?'} months remaining`
          progress = s.injuryMax ? Math.min(100, Math.round((1 - s.injDays / s.injuryMax) * 100)) : 30
          barColor = '#f66'
        } else if (s.status === 'exam') {
          label = 'Adept Exam'
          detail = 'In progress'
          progress = 50
          barColor = '#87ceeb'
        } else {
          label = s.status
          detail = ''
          progress = 50
          barColor = '#555'
        }

        return `<div style="background:#1a1814;border:1px solid #2e2a22;padding:10px 12px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:8px;font-weight:bold;color:${rankCol};background:${rankCol}22;padding:1px 5px;border:1px solid ${rankCol}44">${rankLabel.slice(0,3).toUpperCase()}</span>
            <span style="font-size:10px;color:#e8e0cc;font-weight:bold;cursor:pointer" onclick="oDos('${s.id}')">${sn(s)}</span>
            ${s.jk ? `<span style="font-size:7px;color:#c9a84c">[JK]</span>` : ''}
            <span style="font-size:8px;color:#555;margin-left:auto">${label}</span>
          </div>
          <div style="background:#111;border-radius:2px;height:4px;margin-bottom:4px">
            <div style="height:4px;border-radius:2px;background:${barColor};width:${progress}%;transition:width .3s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:7px;color:#555">
            <span>${detail}</span>
            <span style="color:#7a7060">${progress}% complete</span>
          </div>
        </div>`
      }).join('')

  // ── Main roster table — sortable headers + customizable columns (P1 kit) ──
  const _statusCell = s => s.status === 'available' ? `<span style="color:#8fbc8f;font-size:8px" title="Available">●</span>`
    : s.status === 'mission' ? `<span style="color:#c9a84c;font-size:8px" title="On mission">▶</span>`
    : s.status === 'injured' ? `<span style="color:#f66;font-size:8px" title="Injured ${s.injDays}m">✕</span>`
    : `<span style="color:#87ceeb;font-size:8px" title="Exam">⚑</span>`
  const _nameCell = s => {
    const nt = s.noTrade ? `<span style="font-size:6px;color:#f99;border:1px solid #744;padding:0 3px;margin-left:3px">NT</span>` : ''
    const tw = s.twoWay  ? `<span style="font-size:6px;color:#87ceeb;border:1px solid #468;padding:0 3px;margin-left:2px">2W</span>` : ''
    const peak = s.peakAge && Math.abs((s.age||0) - s.peakAge) <= 1 ? `<span style="font-size:6px;color:#c9a84c;border:1px solid #c9a84c66;padding:0 3px;margin-left:3px" title="Peak years">★</span>`
      : s.peakAge && (s.age||0) > s.peakAge + 3 ? `<span style="font-size:6px;color:#f66;border:1px solid #f6644;padding:0 3px;margin-left:3px" title="Past peak">↘</span>` : ''
    return `<div style="font-size:9px;color:#e8e0cc;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px">${sn(s)}${s.jk ? '<span style="font-size:7px;color:#c9a84c"> ⚡</span>' : ''}${nt}${tw}${peak}</div><div style="font-size:7px;color:#555">${s.clan || s.spec || '—'}</div>`
  }
  const COLS = [
    { key: 'rank', label: 'Rank', align: 'left', hideable: false, sortVal: s => s.ri,
      render: s => `<span style="font-size:8px;font-weight:bold;color:${_rankColor(s.ri)};background:${_rankColor(s.ri)}22;padding:1px 5px;border:1px solid ${_rankColor(s.ri)}44">${RANKS[s.ri].slice(0,3).toUpperCase()}</span>` },
    { key: 'name', label: 'Name', align: 'left', hideable: false, sortVal: s => sn(s), render: _nameCell },
    { key: 'age', label: 'Age', align: 'center', sortVal: s => s.age || 0, render: s => `<span style="font-size:8px;color:#7a7060">${s.age}</span>` },
    { key: 'power', label: 'Ability', align: 'center', sortVal: s => sPow(s), render: s => _starsHtml(sPow(s)) },
    { key: 'potential', label: 'Potential', align: 'center', sortVal: s => _potential(s), render: s => _starsHtml(_potential(s)) },
    { key: 'status', label: 'Sts', align: 'center', sortVal: s => s.status, render: _statusCell },
    { key: 'grade', label: 'Grd', align: 'center', sortVal: s => _GRADE_ORDER[gradeShinobi(s).label] ?? 0,
      render: s => { const g = gradeShinobi(s); return `<span style="font-size:9px;font-weight:bold;color:${g.color};background:${g.color}22;padding:1px 5px;border:1px solid ${g.color}44">${g.label}</span>` } },
    { key: 'salary', label: 'Salary', align: 'right', sortVal: s => s.salary || 0, render: s => `<span style="font-size:8px;color:#555">${fmt(s.salary)}</span>` },
  ]
  const _sort = tblSort('roster', _ROSTER_DEFAULT_SORT)
  const _hidden = new Set(tblHidden('roster'))
  const _visCols = COLS.filter(c => !_hidden.has(c.key))
  const _rosterRows = tblSortRows(G.shinobi, _sort, COLS)

  const tableRows = _rosterRows.map((s, i) => {
    const isSelected = window._rosSelId === s.id
    return `<tr style="background:${isSelected ? '#1e1c16' : i%2===0 ? '#0f0e0c' : '#000'};cursor:pointer;border-bottom:1px solid #111"
      onclick="rosSelect('${s.id}')" oncontextmenu="return rosterCtx(event,'${s.id}')"
      onmousemove="rosterHover(event,'${s.id}')" onmouseleave="hideHoverPreview()">
      ${_visCols.map(c => `<td style="padding:5px 6px;text-align:${c.align || 'left'}">${c.render(s)}</td>`).join('')}
    </tr>`
  }).join('')

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 280px;gap:12px;align-items:start">

      <!-- Left: roster table -->
      <div>
        ${_clanBar()}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;position:relative">
          <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase">${tr('roster.header', { n: G.shinobi.length })}</div>
          <div style="margin-left:auto;display:flex;gap:10px;align-items:center;font-size:8px;color:#555">
            <span><span style="color:#8fbc8f">●</span> Avail</span>
            <span><span style="color:#c9a84c">▶</span> Mission</span>
            <span><span style="color:#f66">✕</span> Injured</span>
            <span><span style="color:#87ceeb">⚑</span> Exam</span>
            <button class="tbl-colbtn" onclick="rosterColMgr()" title="Show / hide columns">⚙ Columns</button>
            ${tblColumnManagerHtml('roster', COLS, 'rosterToggleCol')}
          </div>
        </div>
        <div style="font-size:7px;color:#3a3630;margin-bottom:4px">Click a column to sort · right-click a shinobi for actions</div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#0a0908;border-bottom:1px solid #2e2a22">${tblHeaderHtml(_visCols, _sort, 'rosterSortBy')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>

      <!-- Right: active assignments + selected dossier -->
      <div>
        <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:8px">
          Active Assignments <span style="color:#444">— ${active.length}/${G.shinobi.length}</span>
        </div>
        ${assignedHtml}
        <div id="ros-detail"></div>
      </div>
    </div>`

  // Render selected shinobi quick-view if one is selected
  if (window._rosSelId) _renderRosDetail(window._rosSelId)
}

export function rosSelect(id) {
  window._rosSelId = (window._rosSelId === id) ? null : id
  rRo()
}

// ── Table kit wrappers (P1) ────────────────────────────────────────────────────
export function rosterSortBy(key) { tblToggleSort('roster', key, _ROSTER_DEFAULT_SORT); rRo() }
export function rosterToggleCol(key) { tblToggleCol('roster', key); rRo() }
export function rosterColMgr() { tblToggleColumnManager('roster') }

let _hoverId = null
export function rosterHover(e, id) {
  if (_hoverId === id && document.querySelector('.hover-preview')) { _moveHover(e); return }
  _hoverId = id
  const s = G.shinobi.find(x => x.id === id); if (!s) return
  const st = s.stats || {}
  const g = gradeShinobi(s)
  const age = s.age || 20
  const traj = age < 22 ? 'Ascending' : age < 27 ? 'Prime' : age < 31 ? 'Late Career' : 'Declining'
  const row = (k, v) => `<div class="hp-row"><span>${k}</span><b>${v}</b></div>`
  const html = `
    <div class="hp-name">${sn(s)}${s.jk ? ' ⚡' : ''}</div>
    <div class="hp-sub">${RANKS[s.ri]} · ${s.clan || s.spec || '—'} · Age ${age}</div>
    ${row('Ability', sPow(s))}
    ${row('Potential', _potential(s))}
    ${row('Grade', g.label)}
    ${row('Trajectory', traj)}
    ${row('Nin / Tai / Gen', `${st.ninjutsu||0}/${st.taijutsu||0}/${st.genjutsu||0}`)}
    ${row('Cha / Int / Spd', `${st.chakra||0}/${st.intelligence||0}/${st.speed||0}`)}
    ${row('Salary', fmt(s.salary))}`
  showHoverPreview(e.clientX, e.clientY, html)
}
function _moveHover(e) { const el = document.querySelector('.hover-preview'); if (el) { el.style.left = Math.min(e.clientX + 14, window.innerWidth - el.offsetWidth - 8) + 'px'; el.style.top = Math.min(e.clientY + 14, window.innerHeight - el.offsetHeight - 8) + 'px' } }

export function rosterCtx(e, id) {
  e.preventDefault()
  const s = G.shinobi.find(x => x.id === id); if (!s) return false
  openContextMenu(e.clientX, e.clientY, [
    { label: 'Open Dossier', fn: () => window.oDos && window.oDos(id) },
    { label: 'Select / Inspect', fn: () => window.rosSelect && window.rosSelect(id) },
    { separator: true },
    { label: 'Set Path: Shadow Track', fn: () => window.setDevPath && window.setDevPath(id, 'anbu') },
    { label: 'Set Path: Squad Anchor', fn: () => window.setDevPath && window.setDevPath(id, 'anchor') },
    { label: 'Set Path: Mission Spec', fn: () => window.setDevPath && window.setDevPath(id, 'machine') },
    { separator: true },
    { label: 'Renew Contract', fn: () => window.openContractRenewal && window.openContractRenewal(id) },
    { label: s.noTrade ? 'Remove No-Trade' : 'Add No-Trade', fn: () => window.toggleNoTrade && window.toggleNoTrade(id) },
    { separator: true },
    { label: 'Retire', danger: true, fn: () => window.retireShinobi && window.retireShinobi(id) },
  ])
  return false
}

function _renderRosDetail(id) {
  const el = document.getElementById('ros-detail'); if (!el) return
  const s = G.shinobi.find(x => x.id === id); if (!s) return
  const pw  = sPow(s)
  const pot = _potential(s)
  const sq  = G.squads.find(q => q.members.includes(s.id))
  const rankCol = ['#7a7060','#87ceeb','#8fbc8f','#cc7fb8','#c9a84c'][s.ri] || '#7a7060'

  el.innerHTML = `
    <div style="background:#1a1814;border:1px solid #2e2a22;padding:12px;margin-top:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:9px;font-weight:bold;color:${rankCol};background:${rankCol}22;padding:2px 7px;border:1px solid ${rankCol}44">${RANKS[s.ri]}</span>
        <div>
          <div style="font-size:11px;color:#e8e0cc;font-weight:bold">${sn(s)}</div>
          <div style="font-size:8px;color:#555">${s.clan || s.spec || ''} · Age ${s.age}</div>
        </div>
        <button class="gb" style="margin-left:auto;font-size:7px;padding:2px 8px" onclick="oDos('${s.id}')">${tr('roster.fullDossier')}</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
        ${['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'].map(k => {
          const v = s.stats?.[k] || 0
          return `<div>
            <div style="display:flex;justify-content:space-between;font-size:7px;color:#555;margin-bottom:2px">
              <span>${k.slice(0,5)}</span><span>${v}</span>
            </div>
            <div style="background:#111;height:3px;border-radius:1px">
              <div style="background:#c9a84c;height:3px;border-radius:1px;width:${v}%"></div>
            </div>
          </div>`
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;font-size:8px;margin-bottom:10px;flex-wrap:wrap">
        <span style="color:#7a7060">Pwr <b style="color:#e8e0cc">${pw}</b></span>
        <span style="color:#7a7060">Salary <b style="color:#f66">${fmt(s.salary)}</b></span>
        <span style="color:#7a7060">Wins <b style="color:#e8e0cc">${s.wins||0}</b></span>
        ${(() => { const total = (s.wins||0) + (s.losses||0); const pct = total > 0 ? Math.round((s.wins||0)/total*100) : null; return pct !== null ? `<span style="color:#7a7060">Win% <b style="color:${pct>=70?'#8fbc8f':pct>=50?'#e8e0cc':'#f88'}">${pct}%</b></span>` : '' })()}
        ${(s.winsS||0) > 0 ? `<span style="font-size:7px;color:#c9a84c">★ ${s.winsS} S-rank</span>` : ''}
        ${sq ? `<span style="color:#7a7060">Squad <b style="color:#87ceeb">${sq.n}</b></span>` : ''}
      </div>
      ${(() => {
        const age = s.age || 20
        const trajectory = age < 22 ? 'Ascending' : age < 27 ? 'Prime' : age < 31 ? 'Late Career' : 'Declining'
        const trajCol = age < 22 ? '#87ceeb' : age < 27 ? '#8fbc8f' : age < 31 ? '#fa0' : '#f66'
        const peakCeil = Math.round((s.potential || 50) * 0.92)
        return `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-top:1px solid #1a1814;margin-top:5px;font-size:8px">
          <span style="color:#555">Peak Ceiling <b style="color:#e8e0cc">${peakCeil}</b></span>
          <span style="color:#555">Trajectory <b style="color:${trajCol}">${trajectory}</b></span>
        </div>`
      })()}
      ${_devPathSelector(s)}
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">
        ${s.noTrade ? `<span style="font-size:7px;color:#f99;border:1px solid #744;padding:1px 5px">No-Trade</span>` : ''}
        ${s.twoWay  ? `<span style="font-size:7px;color:#87ceeb;border:1px solid #468;padding:1px 5px">Two-Way</span>` : ''}
        ${s.buyoutCost ? `<span style="font-size:7px;color:#555">Buyout: ${fmt(s.buyoutCost)}</span>` : ''}
      </div>
      <div style="margin-top:10px;display:flex;gap:5px;flex-wrap:wrap">
        <button class="gb gb-b" style="font-size:7px;padding:2px 8px" onclick="toggleNoTrade('${s.id}')">
          ${s.noTrade ? 'Remove No-Trade' : 'Add No-Trade'}
        </button>
        <button class="gb gb-b" style="font-size:7px;padding:2px 8px" onclick="toggleTwoWay('${s.id}')">
          ${s.twoWay ? 'Remove Two-Way' : 'Add Two-Way'}
        </button>
        ${s.buyoutCost ? `<button class="gb gb-r" style="font-size:7px;padding:2px 8px" onclick="executeBuyout('${s.id}')" ${(window.G?.ryo||G.ryo||0)<s.buyoutCost?'disabled':''}>Release (${fmt(s.buyoutCost)})</button>` : ''}
      </div>
    </div>`
}

export function oDos(id) {
  window._dosActiveId = id
  const s = G.shinobi.find(x => x.id === id); if (!s) return
  const jkB = s.jk ? G.beasts.find(b => b.n === s.jk) : null
  const sq = G.squads.find(q => q.members.includes(s.id))
  document.getElementById('dos-t').textContent = sn(s) + ' — Dossier'
  // Build jutsu section
  const knownJutsu = (s.jutsu || []).map(jId => JUTSU_LIST.find(j => j.id === jId)).filter(Boolean)
  const loadout = s.jutsuLoadout || []
  const jlb = jutsuLoadoutBonus(s, JUTSU_LIST)
  const tierColor = t => t === 'rare' ? '#cc7fb8' : t === 'uncommon' ? '#c9a84c' : '#87ceeb'
  const jutsuHtml = knownJutsu.length
    ? `<div style="margin-bottom:10px">
        <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">
          Jutsu Loadout <span style="color:#444;font-size:7px">(${loadout.length}/${LOADOUT_MAX} active)</span>
          ${jlb.powerMod > 0 || jlb.successMod > 0 ? `<span style="color:var(--green);font-size:7px;margin-left:6px">+${Math.round((jlb.powerMod*0.5+jlb.successMod)*100)}% mission</span>` : ''}
        </div>
        ${knownJutsu.map(j => {
          const active = loadout.includes(j.id)
          const canAdd = !active && loadout.length < LOADOUT_MAX
          const bonusStr = [j.bonus?.powerMod ? `+${Math.round(j.bonus.powerMod*100)}% pow` : '', j.bonus?.successMod ? `+${Math.round(j.bonus.successMod*100)}% sc` : ''].filter(Boolean).join(' ')
          return `<div style="margin-bottom:4px;padding:4px 6px;border:1px solid ${active?'var(--green)':'var(--border)'};background:${active?'rgba(143,188,143,0.08)':'transparent'}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:9px;color:${tierColor(j.tier)};font-weight:bold">${j.n}</span>
              <button onclick="toggleJutsuLoadout('${s.id}','${j.id}')"
                style="font-size:6px;padding:1px 5px;border:1px solid ${active?'var(--green)':'var(--border)'};background:${active?'rgba(143,188,143,0.15)':'transparent'};color:${active?'var(--green)':canAdd?'var(--text-dim)':'#333'};cursor:${canAdd||active?'pointer':'default'}">
                ${active ? '✓ Active' : canAdd ? '+ Equip' : '— Full'}
              </button>
            </div>
            <div style="font-size:7px;color:#3a3630;margin-top:1px">${bonusStr} · ${j.desc}</div>
          </div>`
        }).join('')}
      </div>`
    : ''
  // Build bonds section
  const bondsHtml = (s.bonds || []).length
    ? `<div style="margin-bottom:10px">
        <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Bonds</div>
        ${s.bonds.map(bnd => {
          const other = G.shinobi.find(x => x.id === bnd.otherId)
          if (!other) return ''
          const def = BOND_TYPES[bnd.type]
          const typeColor = bnd.type === 'Rivals' ? 'var(--red)' : bnd.type === 'Mentor/Student' ? '#87ceeb' : bnd.type === 'Battle-Scarred' ? '#cc7fb8' : '#c9a84c'
          return `<div style="margin-bottom:5px;padding:4px 6px;border-left:2px solid ${typeColor}">
            <div style="font-size:9px;color:${typeColor};font-weight:bold">${bnd.type} — ${sn(other)}</div>
            ${def ? `<div style="font-size:7px;color:var(--text-dim)">${def.desc}</div>` : ''}
          </div>`
        }).filter(Boolean).join('')}
      </div>`
    : ''
  // Dark moment
  const darkHtml = s.darkMoment
    ? `<div style="margin-bottom:10px;padding:6px 8px;border-left:2px solid #f66;background:rgba(255,80,80,0.04)"><div style="font-size:7px;color:#f66;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px">Dark Moment</div><div style="font-size:8px;color:#7a7060;font-style:italic">${s.darkMoment}</div></div>`
    : ''

  // Injury & availability panel
  const injTypeDef = s.injuryType ? INJURY_TYPES.find(t => t.id === s.injuryType) : null
  const workload = s.workload || 0
  const wColor = workload >= 80 ? '#f44' : workload >= 60 ? '#f99' : workload >= 40 ? '#fa0' : '#8fbc8f'
  const workloadBar = `<div style="background:#222;height:5px;border-radius:2px;overflow:hidden"><div style="width:${workload}%;height:100%;background:${wColor};transition:width .3s"></div></div>`
  // Second opinion & specialist treatment options
  const hasMedical = (G.staff||[]).some(st => st.role === 'medical')
  const alliedVillages = G.villages.filter(v => v.rel >= 50)
  const bestAlly = alliedVillages.sort((a,b) => b.rel - a.rel)[0]
  const canSecondOpinion = s.status === 'injured' && s.injDays >= 2 && hasMedical && !s.secondOpinionUsed
  const canSpecialist = s.status === 'injured' && s.injDays >= 3 && bestAlly && !s.specialistTreated

  const injuryHtml = `<div style="margin-bottom:10px">
    <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Availability & Workload</div>
    ${s.status === 'injured' && injTypeDef
      ? `<div style="padding:7px 9px;border:1px solid ${injTypeDef.color};background:rgba(0,0,0,.3);margin-bottom:6px">
           <div style="font-size:9px;color:${injTypeDef.color};font-weight:bold">${injTypeDef.n}</div>
           <div style="font-size:8px;color:#7a7060;margin-top:2px">${injTypeDef.desc}</div>
           <div style="font-size:8px;color:#7a7060;margin-top:4px">Expected return: <b style="color:#e8e0cc">${s.injDays} month${s.injDays!==1?'s':''}</b>${s.secondOpinionUsed ? ' <span style="color:#87ceeb">(reviewed)</span>' : ''}</div>
           ${(s.returningForm||100) < 100 ? `<div style="font-size:8px;color:#fa0;margin-top:2px">Post-recovery form: ${s.returningForm}% (builds over 2–3 missions)</div>` : ''}
           <div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">
             ${canSecondOpinion ? `<button class="gb" style="font-size:7px;border-color:#87ceeb;color:#87ceeb" onclick="secondOpinion('${s.id}')">Second Opinion (3,000 ryo) ▸</button>` : ''}
             ${canSpecialist ? `<button class="gb gb-g" style="font-size:7px" onclick="specialistTreatment('${s.id}','${bestAlly.n}')">Specialist Treatment via ${bestAlly.n} (12,000 ryo) ▸</button>` : ''}
           </div>
         </div>`
      : s.status === 'injured'
      ? `<div style="font-size:8px;color:#f44">Injured — ${s.injDays} month${s.injDays!==1?'s':''} remaining</div>`
      : `<div style="font-size:8px;color:#2d5;margin-bottom:4px">${s.status === 'available' ? 'Available' : s.status}</div>`
    }
    ${s.traumaStatus ? `<div style="padding:5px 7px;border:1px solid #cc7fb8;margin-bottom:6px">
      <div style="font-size:8px;color:#cc7fb8">⚠ Psychological Trauma: <b>${s.traumaStatus}</b> (${s.traumaMonths||0} months remaining)</div>
      <div style="font-size:8px;color:#7a7060;margin-top:2px">Stat penalty active. ${s.traumaCount >= 2 ? '<b style="color:#f66">High defection risk</b>' : 'Assign medical ninja for faster recovery.'}</div>
      ${hasMedical ? `<button class="gb gb-g" style="margin-top:5px;font-size:7px" onclick="treatTrauma('${s.id}')">Treat Trauma (5,000 ryo) ▸</button>` : ''}
    </div>` : ''}
    <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
      <div style="font-size:7px;color:#7a7060;text-transform:uppercase;width:60px">Workload</div>
      <div style="flex:1">${workloadBar}</div>
      <div style="font-size:8px;color:${wColor};min-width:28px;text-align:right">${workload}%</div>
    </div>
    <div style="font-size:7px;color:#3a3630;margin-top:2px">High workload (60%+) increases injury risk.</div>
    ${(s.consecutiveMissions||0) >= 2 ? `<div style="font-size:7px;color:#fa0;margin-top:2px">⚠ ${s.consecutiveMissions} consecutive missions — overuse risk +10%</div>` : ''}
    ${(() => { const f = s.fatigue||0; const fc = f >= 80 ? '#f44' : f >= 60 ? '#f99' : f >= 40 ? '#fa0' : '#555'; return `<div style="display:flex;align-items:center;gap:8px;margin-top:5px"><div style="font-size:7px;color:#7a7060;text-transform:uppercase;width:60px">Fatigue</div><div style="flex:1;background:#222;height:4px;border-radius:2px;overflow:hidden"><div style="width:${f}%;height:100%;background:${fc};transition:width .3s"></div></div><div style="font-size:8px;color:${fc};min-width:28px;text-align:right">${f}%</div></div>${f >= 40 ? `<div style="font-size:7px;color:${fc};margin-top:2px">${f >= 80 ? '⚠ Exhausted — mission penalty −15%' : f >= 60 ? '⚠ Very tired — mission penalty −9%' : 'Fatigued — mission penalty −4%'}</div>` : ''}` })()}
  </div>
  ${(s.injuryHistory||[]).length > 0 ? `<div style="margin-bottom:10px">
    <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Injury History (${s.injuryHistory.length})</div>
    ${s.injuryHistory.slice().reverse().slice(0,6).map(h => {
      const tDef = INJURY_TYPES.find(t => t.id === h.type)
      return `<div style="display:flex;gap:6px;font-size:8px;margin-bottom:3px;align-items:baseline">
        <span style="color:#3a3630;min-width:50px">Yr${h.year}·M${h.month}</span>
        <span style="color:${tDef?.color||'#f99'}">${h.typeName||h.type}</span>
        <span style="color:#7a7060">${h.duration}mo</span>
        ${h.treatment !== 'standard' ? `<span style="color:#87ceeb;font-size:7px">[${h.treatment}]</span>` : ''}
      </div>`
    }).join('')}
    ${s.injuryHistory.length > 6 ? `<div style="font-size:7px;color:#3a3630">+${s.injuryHistory.length-6} earlier entries</div>` : ''}
  </div>` : ''}`
  // Personality matrix section
  const judgeLevel = personalityJudge()
  const pm = s.pMatrix || {}
  const pmTraits = ['loyalty','ambition','professionalism','temperament','adaptability']
  const pmHtml = `<div style="margin-bottom:10px">
    <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Character Read ${judgeLevel >= 16 ? '(Precise)' : judgeLevel >= 11 ? '(General)' : judgeLevel >= 6 ? '(Broad)' : '(Unknown)'}</div>
    ${pmTraits.map(k => {
      const val = pm[k] !== undefined ? pm[k] : 10
      const desc = pDesc(val, k, judgeLevel)
      const color = judgeLevel < 6 ? '#3a3630' : val >= 13 ? '#8fbc8f' : val >= 8 ? '#aaa' : '#f99'
      return `<div style="display:flex;gap:6px;font-size:8px;margin-bottom:3px"><span style="color:#7a7060;width:80px;text-transform:capitalize">${k}</span><span style="color:${color}">${desc}</span></div>`
    }).join('')}
    ${judgeLevel < 6 ? '<div style="font-size:7px;color:#3a3630;margin-top:4px">Hire a Council Advisor or Head Sensei to read character more accurately.</div>' : ''}
  </div>`
  // Evolved traits (gained through events, not fixed at creation)
  const evolvedHtml = (s.traits || []).length
    ? `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Evolved Traits</div>
       ${s.traits.map(t => `<div style="margin-bottom:4px"><span class="trait-tag ${t==='Resilient'||t==='Confident'?'trait-pos':t==='Resentful'||t==='Haunted'?'trait-neg':'trait-neu'}">${t}</span><div style="font-size:8px;color:#7a7060;margin-top:2px">${EVOLVED_TRAITS[t] || ''}</div></div>`).join('')}</div>`
    : ''
  // Individual morale & commitment bars
  const indMor = s.indMorale ?? 70
  const commit = s.commitment ?? 70
  const mColor = indMor >= 70 ? '#8fbc8f' : indMor >= 45 ? '#f0a030' : '#f66'
  const cColor = commit >= 60 ? '#c9a84c' : commit >= 30 ? '#f0a030' : '#f66'
  const moraleCommitHtml = `<div style="margin-bottom:10px">
    <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">State of Mind</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div style="font-size:7px;color:#7a7060;width:70px">Individual Morale</div>
      <div style="flex:1;background:#222;height:4px;border-radius:2px"><div style="width:${indMor}%;height:100%;background:${mColor}"></div></div>
      <div style="font-size:8px;color:${mColor};min-width:24px">${indMor}</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div style="font-size:7px;color:#7a7060;width:70px">Commitment</div>
      <div style="flex:1;background:#222;height:4px;border-radius:2px"><div style="width:${commit}%;height:100%;background:${cColor}"></div></div>
      <div style="font-size:8px;color:${cColor};min-width:24px">${commit}</div>
    </div>
    ${(() => { const st = computeStrain(s), b = strainBand(st); return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div style="font-size:7px;color:#7a7060;width:70px">Strain</div>
      <div style="flex:1;background:#222;height:4px;border-radius:2px"><div style="width:${st}%;height:100%;background:${b.color}"></div></div>
      <div style="font-size:8px;color:${b.color};min-width:50px">${st} ${b.label}</div>
    </div>` })()}
    ${s.legendStatus ? '<div style="font-size:8px;color:#c9a84c;margin-top:2px">★ Village Legend — exceptionally loyal</div>' : ''}
    ${commit <= 25 ? '<div style="font-size:7px;color:#f66;margin-top:2px">⚠ Low commitment — transfer risk! Consider a 1-on-1 meeting.</div>' : ''}
    ${s.roleGuarantee ? '<div style="font-size:7px;color:#87ceeb;margin-top:2px">Role guarantee promised — must deploy regularly.</div>' : ''}
    ${s.promotionDeadline ? '<div style="font-size:7px;color:#f0a030;margin-top:2px">⏳ Promotion deadline: month ' + s.promotionDeadline + '</div>' : ''}
    ${s.bingoBookPresence > 0 ? '<div style="font-size:7px;color:#f0a030;margin-top:2px">📖 Bingo Book: ' + ['','Listed','Featured','Legendary'][s.bingoBookPresence] + (s.bingoBookSuppressed ? ' (suppressed)' : '') + '</div>' : ''}
  </div>`

  const marketVal = computeMarketValue(s)
  const dosGrade = gradeShinobi(s)
  const dosActiveTab = window._dosTab || 'profile'
  ensureCareerFields(s)

  // ── Phase 4: Training focus + rest toggle + contract + pair chemistry ─────────
  const STAT_OPTIONS = ['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed']
  const contractYearsLeft = s.contractEnd ? (s.contractEnd - (window.G?.year || 1)) : null
  const contractColor = contractYearsLeft !== null && contractYearsLeft <= 1 ? '#f66' : contractYearsLeft === 2 ? '#f0a030' : '#8fbc8f'

  // Pair chemistry: find pairs with 5+ missions
  const provenPairs = []
  if (window.G?.pairChemistryLog) {
    G.shinobi.forEach(other => {
      if (other.id === s.id) return
      const key = [s.id, other.id].sort().join('_')
      const count = G.pairChemistryLog[key] || 0
      if (count >= 5) provenPairs.push({ name: sn(other), count })
    })
  }

  const phase4Html = `<div style="margin-bottom:12px;background:#1a1a0d;border:1px solid #444;padding:10px">
    <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:8px">Field Management</div>

    <div style="margin-bottom:8px">
      <div style="font-size:8px;color:#7a7060;margin-bottom:4px">Training Focus <span style="color:#3a3630">(+1–3 stat/month, +12% workload)</span></div>
      <select onchange="setTrainingFocus('${s.id}',this.value)" style="background:#111;border:1px solid #444;color:#e8e0cc;font-size:8px;padding:3px 6px;width:100%">
        <option value="" ${!s.trainingFocus?'selected':''}>— None —</option>
        ${STAT_OPTIONS.map(st => `<option value="${st}" ${s.trainingFocus===st?'selected':''}>${st.charAt(0).toUpperCase()+st.slice(1)}</option>`).join('')}
      </select>
    </div>

    <div style="margin-bottom:8px;display:flex;align-items:center;gap:10px">
      <div>
        <div style="font-size:8px;color:#7a7060;margin-bottom:3px">Rest Month <span style="color:#3a3630">(skip deployment, −30% workload)</span></div>
        <button onclick="toggleRestMonth('${s.id}')" style="font-size:8px;padding:3px 10px;background:${s.restMonth?'#1a2e1a':'#111'};border:1px solid ${s.restMonth?'#8fbc8f':'#444'};color:${s.restMonth?'#8fbc8f':'#7a7060'};cursor:pointer">
          ${s.restMonth ? '✓ Resting' : '○ Set Rest'}
        </button>
      </div>
      ${contractYearsLeft !== null ? `<div>
        <div style="font-size:8px;color:#7a7060;margin-bottom:3px">Contract</div>
        <div style="font-size:8px;color:${contractColor}">${contractYearsLeft <= 0 ? 'EXPIRED' : contractYearsLeft === 1 ? 'Final year' : `${contractYearsLeft}yr remaining`}</div>
        ${contractYearsLeft <= 1 && !s.contractRenewing ? `<button onclick="openContractRenewal('${s.id}')" style="font-size:7px;margin-top:3px;background:#1a1a2e;border:1px solid #4a4a8a;color:#9cf;padding:2px 7px;cursor:pointer">Offer Renewal ▸</button>` : ''}
        ${s.contractRenewing ? `<div style="font-size:7px;color:#f0a030;margin-top:2px">⏳ Renewal pending</div>` : ''}
      </div>` : ''}
      <div>
        <div style="font-size:8px;color:#7a7060;margin-bottom:3px">Contract Clauses</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:3px">
          <button onclick="toggleNoTrade('${s.id}')" style="font-size:7px;padding:2px 6px;background:${s.noTrade?'#1a2a1a':'#111'};border:1px solid ${s.noTrade?'#8fbc8f':'#444'};color:${s.noTrade?'#8fbc8f':'#555'};cursor:pointer">
            ${s.noTrade?'✓ ':''} No-Trade
          </button>
          <button onclick="toggleTwoWay('${s.id}')" style="font-size:7px;padding:2px 6px;background:${s.twoWay?'#1a1a2e':'#111'};border:1px solid ${s.twoWay?'#87ceeb':'#444'};color:${s.twoWay?'#87ceeb':'#555'};cursor:pointer">
            ${s.twoWay?'✓ ':''} Two-Way
          </button>
        </div>
        ${s.buyoutCost ? `<div style="font-size:7px;color:#7a7060">Buyout: <span style="color:#c9a84c">${s.buyoutCost.toLocaleString()} ryo</span>
          <button onclick="executeBuyout('${s.id}')" style="margin-left:4px;font-size:7px;padding:1px 5px;background:#1a0505;border:1px solid #744;color:#f99;cursor:pointer" ${(window.G?.ryo||0)<s.buyoutCost?'disabled':''}>Release (buyout)</button>
        </div>` : ''}
        ${s.twoWay ? `<div style="font-size:7px;color:#87ceeb;margin-top:2px">Two-way: not counted against salary cap</div>` : ''}
      </div>
    </div>

    ${provenPairs.length > 0 ? `<div style="margin-top:6px">
      <div style="font-size:7px;color:#4a9a4a;margin-bottom:3px">⚗ Proven chemistry:</div>
      ${provenPairs.map(p => `<span style="font-size:7px;color:#8fbc8f;margin-right:8px">${p.name} (${p.count} missions)</span>`).join('')}
    </div>` : ''}
  </div>`

  // ── Career arc section ────────────────────────────────────────────────────────
  const phase     = s.phase || 'prime'
  const pMeta     = PHASE_META[phase]
  const peakAge   = s.peakAge || 26
  const yearsLeft = phase === 'developing' ? (peakAge - 4) - s.age
                  : phase === 'prime'      ? (peakAge + 2) - s.age
                  : phase === 'veteran'    ? (peakAge + 7) - s.age
                  : null
  const decMod    = s.declineMod || 0
  const PHASES    = ['developing','prime','veteran','declining']
  const phaseIdx  = PHASES.indexOf(phase)
  const arcHtml = `<div style="margin-bottom:12px;background:var(--surface,#1a1a1a);border:1px solid var(--border,#333);padding:10px">
    <div style="font-size:7px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Career Arc</div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='developing'?'rgba(100,150,255,.12)':'transparent'};border:1px solid ${PHASE_META.developing.color};opacity:${phaseIdx===0?1:.35}">
        <div style="font-size:8px;color:${PHASE_META.developing.color}">${PHASE_META.developing.icon}</div>
        <div style="font-size:7px;color:${PHASE_META.developing.color}">Developing</div>
      </div>
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='prime'?'rgba(80,200,120,.12)':'transparent'};border:1px solid ${PHASE_META.prime.color};opacity:${phaseIdx===1?1:.35}">
        <div style="font-size:8px;color:${PHASE_META.prime.color}">${PHASE_META.prime.icon}</div>
        <div style="font-size:7px;color:${PHASE_META.prime.color}">Prime</div>
      </div>
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='veteran'?'rgba(201,168,76,.12)':'transparent'};border:1px solid ${PHASE_META.veteran.color};opacity:${phaseIdx===2?1:.35}">
        <div style="font-size:8px;color:${PHASE_META.veteran.color}">${PHASE_META.veteran.icon}</div>
        <div style="font-size:7px;color:${PHASE_META.veteran.color}">Veteran</div>
      </div>
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='declining'?'rgba(255,80,80,.12)':'transparent'};border:1px solid ${PHASE_META.declining.color};opacity:${phaseIdx===3?1:.35}">
        <div style="font-size:8px;color:${PHASE_META.declining.color}">${PHASE_META.declining.icon}</div>
        <div style="font-size:7px;color:${PHASE_META.declining.color}">Declining</div>
      </div>
    </div>
    <div style="display:flex;gap:16px;font-size:8px;flex-wrap:wrap;margin-bottom:6px">
      <span>Age: <b style="color:#e8e0cc">${s.age}</b></span>
      <span>Peak age: <b style="color:#c9a84c">${peakAge}</b></span>
      <span>Phase: <b style="color:${pMeta.color}">${pMeta.label}</b></span>
      ${yearsLeft !== null && yearsLeft > 0 ? `<span style="color:#7a7060">${yearsLeft}yr${yearsLeft!==1?'s':''} in phase</span>` : ''}
    </div>
    ${decMod < 0 ? `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;font-size:7px;color:#7a7060;margin-bottom:2px">
        <span>Decline penalty</span><span style="color:#f66">${Math.round(decMod*100)}%</span>
      </div>
      <div style="background:#2a1a1a;height:4px;border-radius:2px">
        <div style="background:#f66;height:4px;border-radius:2px;width:${Math.min(100,Math.abs(decMod)/0.18*100)}%"></div>
      </div>
    </div>` : ''}
    ${s.retirementOffered ? `<div style="margin-top:8px;padding:8px 10px;background:#1a0505;border:1px solid #8b1a1a">
      <div style="font-size:8px;color:#f66;margin-bottom:6px">⚠ ${sn(s)} has been offered retirement options</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="gb" style="border-color:#8fbc8f;color:#8fbc8f;font-size:7px" onclick="confirm('Retire ${s.fn} ${s.ln} honorably? This cannot be undone.') && retireShinobi('${s.id}')">Retire Honorably ▸</button>
        <button class="gb" style="border-color:#87ceeb;color:#87ceeb;font-size:7px" onclick="confirm('Move ${s.fn} ${s.ln} to coaching staff? This cannot be undone.') && retireToCoach('${s.id}')">Transition to Staff ▸</button>
        <button class="gb" style="border-color:#7a7060;color:#7a7060;font-size:7px" onclick="extendCareer('${s.id}')">Request One More Year</button>
      </div>
    </div>` : ''}
  </div>`

  const careerInjHtml = (s.injuryHistory||[]).length > 0
    ? `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Injury History</div>${s.injuryHistory.slice().reverse().slice(0,5).map(h => { const tDef = INJURY_TYPES.find(t => t.id === h.type); return `<div style="display:flex;gap:6px;font-size:8px;margin-bottom:3px;align-items:baseline"><span style="color:#3a3630;min-width:50px">Yr${h.year}·M${h.month}</span><span style="color:${tDef?.color||'#f99'}">${h.typeName||h.type}</span><span style="color:#7a7060">${h.duration}mo</span>${h.treatment !== 'standard' ? `<span style="color:#87ceeb;font-size:7px">[${h.treatment}]</span>` : ''}</div>` }).join('')}</div>`
    : ''
  const traumaHistHtml = (s.traumaHistory||[]).length
    ? `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Trauma History</div>${s.traumaHistory.map(t => `<div style="font-size:8px;color:#cc7fb8;margin-bottom:3px;padding:4px 7px;border-left:2px solid #cc7fb8">${t.year !== undefined ? `Yr${t.year}·M${t.month}: ` : ''}${t.type||String(t)}</div>`).join('')}</div>`
    : ''
  // Memory + emotional state + role tag section
  const _memBlurb = memoryStateBlurb(s)
  const _salient  = mostSalientMemory(s)
  const _quote    = getArchetypeQuote(s)
  const _roleTag  = s.roleTag ? s.roleTag.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : null
  const _emotion  = s.emotionalStateLabel
  const memoryHtml = `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Memory State</div>` +
    `<div style="font-size:9px;color:#b0a88a;font-style:italic;margin-bottom:4px">"${_quote}"</div>` +
    `<div style="font-size:8px;color:#7a7060;margin-bottom:4px">${_memBlurb}</div>` +
    (_salient ? `<div style="font-size:7px;color:#7a7060;padding:3px 6px;border-left:2px solid #3a3630">Most vivid: <span style="color:#b0a88a">${_salient.label}</span> (intensity ${_salient.intensity.toFixed(2)})</div>` : '') +
    (_emotion ? `<div style="margin-top:4px;font-size:8px;padding:3px 7px;background:rgba(204,127,184,.1);border:1px solid #cc7fb888;display:inline-block">${_emotion}</div>` : '') +
    (_roleTag ? `<div style="margin-top:5px;font-size:7px;color:#87ceeb;text-transform:uppercase;letter-spacing:1px">Role: ${_roleTag}</div>` : '') +
    `</div>`

  // Mentorship section
  const _mentSum = mentorshipSummary(s, G.mentorships || [], G.shinobi)
  const _canMentor  = isMentorEligible(s, G.mentorships || [])
  const _canStudent = isStudentEligible(s, G.mentorships || [])
  const _eligStudents = _canMentor ? (G.shinobi || []).filter(x => isStudentEligible(x, G.mentorships || []) && x.id !== s.id).slice(0, 6) : []
  const _eligMentors  = _canStudent ? (G.shinobi || []).filter(x => isMentorEligible(x, G.mentorships || []) && x.id !== s.id).slice(0, 6) : []
  const mentorHtml = `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Mentorship</div>` +
    (_mentSum
      ? `<div style="font-size:9px;color:#c9a84c;margin-bottom:4px">${_mentSum}</div>` +
        `<button class="gb" style="font-size:7px;border-color:#7a7060;color:#7a7060;padding:2px 7px" onclick="releaseMentor('${s.id}')">End Mentorship</button>`
      : _canMentor && _eligStudents.length
        ? `<div style="font-size:8px;color:#7a7060;margin-bottom:4px">Eligible to mentor:</div>` +
          `<div style="display:flex;flex-wrap:wrap;gap:4px">${_eligStudents.map(x => `<button class="gb" style="font-size:7px;padding:2px 7px" onclick="assignMentor('${s.id}','${x.id}')">${x.fn} ${x.ln}</button>`).join('')}</div>`
        : _canStudent && _eligMentors.length
          ? `<div style="font-size:8px;color:#7a7060;margin-bottom:4px">Request mentorship from:</div>` +
            `<div style="display:flex;flex-wrap:wrap;gap:4px">${_eligMentors.map(x => `<button class="gb" style="font-size:7px;padding:2px 7px" onclick="assignMentor('${x.id}','${s.id}')">${x.fn} ${x.ln}</button>`).join('')}</div>`
          : `<div style="font-size:8px;color:#3a3630">No mentorship available right now.</div>`
    ) + `</div>`

  const _activityHtml = (s.activityLog || []).length
    ? `<div style="margin-bottom:12px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Recent Activity (last ${s.activityLog.length}mo)</div>${activityGridHtml(s.activityLog)}</div>`
    : ''
  const careerHtml = `${arcHtml}${memoryHtml}${mentorHtml}${_activityHtml}<div style="margin-bottom:12px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Mission Record</div><div style="display:flex;gap:10px;flex-wrap:wrap"><div style="background:#1a1a1a;border:1px solid #333;padding:8px 12px;flex:1;min-width:70px;text-align:center"><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${s.wins||0}</div><div style="font-size:7px;color:#7a7060;text-transform:uppercase;margin-top:2px">Total</div></div><div style="background:#1a1a1a;border:1px solid #c9a84c33;padding:8px 12px;flex:1;min-width:70px;text-align:center"><div style="font-size:11px;color:#c9a84c;font-weight:bold">${s.winsS||0}</div><div style="font-size:7px;color:#7a7060;text-transform:uppercase;margin-top:2px">S-Rank</div></div><div style="background:#1a1a1a;border:1px solid #87ceeb33;padding:8px 12px;flex:1;min-width:70px;text-align:center"><div style="font-size:11px;color:#87ceeb;font-weight:bold">${s.winsB||0}</div><div style="font-size:7px;color:#7a7060;text-transform:uppercase;margin-top:2px">B/C-Rank</div></div></div></div>${traumaHistHtml}${darkHtml}${bondsHtml}${careerInjHtml}`
  const profileHtml = phase4Html +
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px"><div><div style="font-size:14px;color:#e8e0cc;font-weight:bold">${sn(s)}</div><div style="font-size:9px;color:#7a7060;margin-top:2px">${RANKS[s.ri]} · ${s.clan ? s.clan + ' Clan' : s.spec} · Age ${s.age}${s.prodigy ? ' · <span style="color:#c9a84c">✦ Prodigy</span>' : ''}${s.homegrown ? ' · <span style="color:#8fbc8f">🌱 Homegrown</span>' : ''}</div><div style="font-size:9px;margin-top:3px">Ability ${_starsHtml(sPow(s))}<span style="color:#444;margin:0 5px">·</span>Potential ${_starsHtml(_potential(s))}<span style="color:#444;margin:0 5px">·</span><span style="font-size:8px;color:#7a7060">Pwr <b style="color:#e8e0cc">${sPow(s)}</b></span></div>${jkB ? `<div style="font-size:9px;color:#c9a84c;margin-top:2px">Vessel of ${jkB.n} (${jkB.tails} tails)</div>` : ''}${sq ? `<div style="font-size:9px;color:#cc7fb8;margin-top:2px">Member of ${sq.n}</div>` : ''}</div><span class="rk ${RKC[s.ri]}" style="font-size:10px">${RANKS[s.ri]}</span></div><div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Stats</div><div class="sg">${sBars(s)}</div></div>${injuryHtml}${moraleCommitHtml}<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Personality</div><span class="trait-tag ${pCl(s.pers)}">${s.pers.n}</span>${s.narrativeArchetype ? `<span style="margin-left:6px;font-size:7px;color:#cc7fb8;text-transform:uppercase;letter-spacing:1px;padding:2px 6px;border:1px solid #cc7fb855">${s.narrativeArchetype.replace('_',' ')}</span>` : ''}${s.confidence !== undefined ? `<div style="margin-top:6px"><div style="display:flex;justify-content:space-between;font-size:7px;color:#7a7060;margin-bottom:2px"><span>Confidence</span><span style="color:${s.confidence>=70?'#8fbc8f':s.confidence<=30?'#f66':'#b0a88a'}">${s.confidence}/100</span></div><div style="background:#1a1a1a;border:1px solid #333;height:4px;border-radius:2px"><div style="background:${s.confidence>=70?'#8fbc8f':s.confidence<=30?'#f66':'#c9a84c'};width:${s.confidence}%;height:100%;border-radius:2px"></div></div></div>` : ''}<div style="font-size:9px;color:#7a7060;margin-top:5px">${s.pers.desc}</div></div>${pmHtml}${evolvedHtml}<div>${s.archetype ? `<div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Archetype</div><div style="font-size:9px;color:#cc7fb8;margin-bottom:3px">${s.archetype.n}</div><div style="font-size:9px;color:#7a7060;margin-bottom:10px;font-style:italic">${s.archetype.flavor}</div>` : ''}</div>${darkHtml}${jutsuHtml}${bondsHtml}<div><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Background</div><div class="dossier">${s.backstory}</div></div><div style="margin-top:10px;display:flex;gap:10px;font-size:9px;color:#7a7060;flex-wrap:wrap"><span>Power: <b style="color:#e8e0cc">${sPow(s)}</b></span><span>Potential: <b style="color:#c9a84c">${s.scouted === false ? '???' : s.potential}</b></span><span>Wins: <b style="color:#8fbc8f">${s.wins}</b></span><span>Streak: <b style="color:${(s.streak||0)>=3?'#c9a84c':'#7a7060'}">${s.streak||0}</b></span><span>Grade: <b style="color:${dosGrade.color}">${dosGrade.label}</b></span><span>Market Value: <b style="color:#f0a030">${fmt(marketVal)}</b></span></div>${s.status === 'available' && !jkB && G.beasts.some(b => b.sealed && !b.jk) ? `<div style="margin-top:10px"><div style="font-size:9px;color:#7a7060;margin-bottom:6px">Assign as Vessel:</div>${G.beasts.filter(b => b.sealed && !b.jk).map(b => `<button class="gb gb-g" onclick="mkJK('${s.id}','${b.n}')" style="margin-right:5px">Seal ${b.n} ►</button>`).join('')}</div>` : ''}`
  document.getElementById('dos-c').innerHTML = `<div style="display:flex;gap:6px;margin-bottom:12px"><button class="tab${dosActiveTab==='profile'?' active':''}" onclick="dosTab('profile')">Profile</button><button class="tab${dosActiveTab==='career'?' active':''}" onclick="dosTab('career')">Career</button></div><div style="${dosActiveTab==='career'?'display:none':''}">${profileHtml}</div><div style="${dosActiveTab==='profile'?'display:none':''}">${careerHtml}</div>`
  document.getElementById('ov-dossier').classList.add('open')
}

export function dosTab(tab) { window._dosTab = tab; if (window._dosActiveId) oDos(window._dosActiveId) }

export function treatTrauma(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s || !s.traumaStatus) return
  if (G.ryo < 5000) { ntf(tr('toast.common.notEnoughRyoNeed', { need: '5,000' })); return }
  G.ryo -= 5000
  s.traumaStatus = null
  s.traumaMonths = 0
  aL(tr('toast.roster.traumaTreated', { name: sn(s) }), 'good')
  cm('dossier'); upUI()
}

export function secondOpinion(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s || s.status !== 'injured') return
  if (G.ryo < 3000) { ntf(tr('toast.common.notEnoughRyoNeed', { need: '3,000' })); return }
  if (s.secondOpinionUsed) { ntf(tr('toast.roster.secondOpinionUsed')); return }
  G.ryo -= 3000
  s.secondOpinionUsed = true
  if (Math.random() < 0.25) {
    const change = Math.random() < 0.5 ? -rnd(1, 2) : rnd(1, 2)
    const old = s.injDays
    s.injDays = Math.max(1, s.injDays + change)
    // Update history entry treatment note
    const last = (s.injuryHistory || []).slice(-1)[0]
    if (last) last.treatment = 'second-opinion'
    aL(tr('toast.roster.secondOpinionRevised', { name: sn(s), months: s.injDays, old }), change < 0 ? 'good' : 'warn')
  } else {
    aL(tr('toast.roster.secondOpinionConfirm', { name: sn(s), n: s.injDays }), 'neutral')
  }
  upUI(); cm('dossier'); oDos(sId)
}

export function specialistTreatment(sId, villageName) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s || s.status !== 'injured') return
  const v = G.villages.find(x => x.n === villageName)
  if (!v || v.rel < 50) { ntf(tr('toast.roster.needRelations')); return }
  if (G.ryo < 12000) { ntf(tr('toast.common.notEnoughRyoNeed', { need: '12,000' })); return }
  if (s.specialistTreated) { ntf(tr('toast.roster.alreadySpecialist')); return }
  G.ryo -= 12000
  v.rel = clamp(v.rel - 5, 0, 100)  // diplomatic favor used
  s.specialistTreated = true
  const reductionPct = rnd(30, 40)
  const reduction = Math.max(1, Math.round(s.injDays * reductionPct / 100))
  s.injDays = Math.max(1, s.injDays - reduction)
  const last = (s.injuryHistory || []).slice(-1)[0]
  if (last) last.treatment = 'specialist-' + villageName
  aL(tr('toast.roster.specialistSent', { name: sn(s), village: villageName, n: reduction }), 'good')
  upUI(); cm('dossier'); oDos(sId)
}

export function mkJK(sId, bN) {
  const s = G.shinobi.find(x => x.id === sId), b = G.beasts.find(x => x.n === bN)
  if (!s || !b) return
  // Clear any previous vessel
  if (b.jk && b.jk !== sId) {
    const prev = G.shinobi.find(x => x.id === b.jk)
    if (prev) prev.jk = null
  }
  s.jk = bN; b.jk = sId
  // Initialize sync progression — stats applied monthly by beastEngine
  b.syncMonths = b.syncMonths || 0
  b.loreUnlocked = b.loreUnlocked || []
  b.loreBonusActive = b.loreBonusActive || false
  b.escapeHistory = b.escapeHistory || []
  aL(tr('toast.roster.jkChosen', { name: sn(s), beast: bN }), 'warn')
  cm('dossier'); upUI(); ntf(tr('toast.roster.jkNow', { name: s.fn, beast: bN }))
}

// ── Route C: Dev Path ────────────────────────────────────────────────────────

export function setDevPath(sId, pathId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  if (s.devPath === pathId) { s.devPath = null; ntf(tr('toast.roster.devPathCleared')) }
  else {
    s.devPath = pathId
    const path = _DEV_PATHS.find(p => p.id === pathId)
    ntf(tr('toast.roster.devPathSet', { path: path?.label || pathId }))
  }
  rRo()
}

// ── Contract depth actions ───────────────────────────────────────────────────

export function toggleNoTrade(sId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  s.noTrade = !s.noTrade
  ntf(s.noTrade ? tr('toast.roster.noTradeAdded') : tr('toast.roster.noTradeRemoved'))
  upUI()
}

export function toggleTwoWay(sId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  s.twoWay = !s.twoWay
  ntf(s.twoWay ? tr('toast.roster.twoWayAdded') : tr('toast.roster.twoWayRemoved'))
  upUI()
}

export function executeBuyout(sId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  const cost = s.buyoutCost || 0
  if (G.ryo < cost) { ntf(tr('toast.roster.notEnoughBuyout')); return }
  G.ryo -= cost
  G.shinobi = G.shinobi.filter(x => x.id !== sId)
  G.memorial.push({ name: (s.fn || '') + ' ' + (s.ln || ''), rank: ['Initiate','Adept','Veteran','Shadow','S-Rank'][s.ri||0], clan: s.clan, year: G.year, month: G.month, wins: s.wins||0, lastWords: 'Released via buyout clause.', transfer: true })
  aL(tr('toast.roster.buyoutReleased', { name: `${s.fn||''} ${s.ln||''}`, cost: fmt(cost) }), 'warn')
  ntf(tr('toast.roster.buyoutDone')); upUI()
}

// ── Retirement actions ────────────────────────────────────────────────────────

export function retireShinobi(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s) return
  if (s.jk) { ntf(tr('toast.roster.cannotRetireJk')); return }
  // Move to retired roster
  if (!G.retired) G.retired = []
  G.retired.push({
    id: s.id, fn: s.fn, ln: s.ln,
    ri: s.ri, age: s.age, wins: s.wins || 0,
    winsS: s.winsS || 0, phase: s.phase || 'declining',
    retiredYear: G.year, retiredMonth: G.month,
    reason: 'honourable_discharge',
  })
  // Remove from squads
  G.squads.forEach(sq => {
    sq.members = sq.members.filter(id => id !== sId)
    if (sq.leaderId === sId) sq.leaderId = sq.members[0] || null
  })
  G.shinobi = G.shinobi.filter(x => x.id !== sId)
  aL(tr('toast.roster.retiredHonour', { name: sn(s), wins: s.wins || 0 }), 'good')
  ntf(tr('toast.roster.retired', { name: `${s.fn} ${s.ln}` }))
  document.getElementById('ov-dossier').classList.remove('open')
  upUI(); cm('retirement')
}

export function retireToCoach(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s) return
  if (s.jk) { ntf(tr('toast.roster.cannotTransitionJk')); return }
  if (!G.staff) G.staff = []
  // Create a coaching staff member from the shinobi
  const coachRating = Math.min(10, Math.round((s.wins || 0) / 10 + (s.ri || 0) * 1.5 + 2))
  G.staff.push({
    id: s.id + '_coach',
    fn: s.fn, ln: s.ln,
    role: 'sensei',
    rating: coachRating,
    salary: Math.round(s.salary * 0.4),
    monthsEmployed: 0,
    morale: 80,
    hiddenFlaw: null,
    fromRetirement: true,
    retiredShinobiId: s.id,
    stats: {
      leadership: Math.min(20, Math.round((s.winsS || 0) / 2 + 6)),
      endurance: Math.min(20, Math.round(coachRating * 1.2)),
      ninjutsu: Math.min(20, s.stats?.ninjutsu || 10),
    },
  })
  // Remove from active roster
  G.squads.forEach(sq => {
    sq.members = sq.members.filter(id => id !== sId)
    if (sq.leaderId === sId) sq.leaderId = sq.members[0] || null
  })
  G.shinobi = G.shinobi.filter(x => x.id !== sId)
  aL(tr('toast.roster.toCoach', { name: sn(s), rating: coachRating }), 'good')
  ntf(tr('toast.roster.nowSensei', { name: s.fn }))
  document.getElementById('ov-dossier').classList.remove('open')
  upUI(); cm('retirement')
}

export function extendCareer(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s) return
  s.retirementOffered = false
  s.careerExtended = true
  // Slight commitment boost from respect shown
  s.commitment = Math.min(100, (s.commitment || 60) + 10)
  aL(tr('toast.roster.careerExtended', { name: sn(s) }), 'neutral')
  ntf(tr('toast.roster.careerContinue', { name: s.fn }))
  upUI(); cm('dossier'); oDos(sId)
}

// ── Phase 4 handlers ──────────────────────────────────────────────────────────

export function setTrainingFocus(sId, statKey) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  s.trainingFocus = statKey || null
  if (statKey) aL(tr('toast.roster.trainingFocus', { name: sn(s), stat: statKey }), 'neutral')
  else aL(tr('toast.roster.trainingGeneral', { name: sn(s) }), 'neutral')
  upUI(); oDos(sId)
}

export function toggleJutsuLoadout(sId, jutsuId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  if (!(s.jutsu || []).includes(jutsuId)) return
  s.jutsuLoadout = toggleLoadoutSlot(s.jutsuLoadout, jutsuId)
  upUI(); oDos(sId)
}

export function toggleRestMonth(sId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  if (s.status !== 'available') { ntf(tr('toast.roster.cannotRest')); return }
  s.restMonth = !s.restMonth
  if (s.restMonth) aL(tr('toast.roster.restScheduled', { name: sn(s) }), 'neutral')
  else aL(tr('toast.roster.restCancelled', { name: sn(s) }), 'neutral')
  upUI(); oDos(sId)
}

export function openContractRenewal(sId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  const demand = G.contractRenewalQueue?.find(r => r.shinobiId === sId)
  const demandSal = demand?.demandSalary || Math.round(s.salary * 1.15)
  if (G.ryo < demandSal * 12) { ntf(tr('toast.roster.cantAffordRenewal', { amount: (demandSal*12).toLocaleString() })); return }
  s.salary = demandSal
  s.contractEnd = (G.year || 1) + 3
  s.contractRenewing = false
  G.contractRenewalQueue = (G.contractRenewalQueue || []).filter(r => r.shinobiId !== sId)
  s.commitment = Math.min(100, (s.commitment || 60) + 15)
  aL(tr('toast.roster.renewed', { name: sn(s), salary: demandSal.toLocaleString() }), 'good')
  ntf(tr('toast.roster.renewedShort', { name: s.fn }))
  upUI(); cm('contract'); oDos(sId)
}
