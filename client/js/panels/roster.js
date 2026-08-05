import { G, sPow, clamp, rnd, sn, fmt, pDesc, personalityJudge, computeMarketValue } from '../state.js'
import { gradeShinobi } from '../adv.js'
import { memoryStateBlurb, mostSalientMemory } from '../../../shared/utils/memorySystem.js'
import { definingMoments } from '../../../shared/utils/legacyMemory.js'
import { combinedOf, signatureUnlocked } from '../../../shared/constants/combinedElements.js'

/**
 * The combined-element block in the dossier background section.
 *
 * Says what they hold, which two natures made it, how they came by it, and
 * whether the signature technique is theirs yet — the last one matters because
 * it is the one thing about the element the player can still influence.
 */
function _combinedDossier(s) {
  const c = combinedOf(s)
  if (!c) return ''
  const how = s.combinedSource === 'awakened' ? 'awakened' : s.combinedSource === 'clan' ? 'clan bloodline' : 'innate'
  const ready = signatureUnlocked(s)
  return `<div style="margin-top:3px">Combined nature: <span style="color:${c.color};font-weight:bold">${c.icon} ${c.name}</span>
      <span style="color:var(--text-faint)">(${c.parents.join(' + ')} · ${how})</span>
      <div style="font-size:var(--fs-micro);color:var(--text-dim);font-style:italic;margin-top:1px">${c.blurb}</div>
      <div style="font-size:var(--fs-micro);color:${ready ? 'var(--gold)' : 'var(--text-faint)'};margin-top:1px">
        Signature: ${c.signature.n}${ready ? ' — mastered' : ` — unlocks at ${RANKS[c.signature.minRi]}`}</div>
    </div>`
}
import { getArchetypeQuote } from '../../../shared/utils/personality.js'
import { mentorshipSummary, isMentorEligible, isStudentEligible } from '../../../shared/utils/mentorship.js'
import { RANKS, RKC, JUTSU_LIST, ALL_JUTSU, INJURY_TYPES, EVOLVED_TRAITS } from '../constants.js'
import { jutsuLoadoutBonus, toggleLoadoutSlot, LOADOUT_MAX } from '../../../shared/jutsu/loadout.js'
import { BOND_TYPES } from '../../../shared/bonds/bondTypes.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { PHASE_META, ensureCareerFields } from '../careerEngine.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { computeStrain, strainBand } from '../../../shared/utils/strain.js'
import { REHAB_PLANS } from '../../../shared/utils/medical.js'
import { openContextMenu, showHoverPreview, hideHoverPreview, tblSort, tblToggleSort, tblHidden, tblToggleCol, tblSortRows, tblHeaderHtml, tblColumnManagerHtml, tblToggleColumnManager, activityGridHtml } from '../uikit.js'

const _ROSTER_DEFAULT_SORT = { key: 'power', dir: 'desc' }
const _GRADE_ORDER = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 }
const _rankColor = ri => ['var(--text-dim)', 'var(--blue)', 'var(--green)', 'var(--purple)', 'var(--gold)'][ri] || 'var(--text-dim)'

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
  const col = count >= 4 ? 'var(--gold)' : count >= 3 ? 'var(--green)' : count >= 2 ? 'var(--text-dim)' : 'var(--border-hi)'
  return `<span style="color:${col};letter-spacing:-1px;font-size:var(--fs-body)">${'★'.repeat(count)}${'☆'.repeat(5-count)}</span>`
}

// ── Route E: Clan Concentration ──────────────────────────────────────────────
function _clanBar() {
  const counts = {}
  G.shinobi.forEach(s => { if (s.clan) counts[s.clan] = (counts[s.clan] || 0) + 1 })
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!ranked.length) return ''
  const [topClan, topCount] = ranked[0]
  const tier = topCount >= 7 ? { label:'LEGENDARY', col:'var(--accent)' }
             : topCount >= 5 ? { label:'IDENTITY',   col:'var(--green)' }
             : topCount >= 3 ? { label:'SYNERGY',     col:'var(--blue)' }
             : null
  return `<div style="background:var(--sunken);border:1px solid var(--accent-border);padding:8px 10px;margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:${tier?'4px':'0'}">
      <span style="font-size:var(--fs-micro);letter-spacing:1px;color:var(--text-faint);text-transform:uppercase">${tr('roster.clanComposition')}</span>
      ${ranked.slice(0, 5).map(([n, c]) => `<span style="font-size:var(--fs-small);color:var(--text-mid)">${n} <b style="color:var(--text-hi)">${c}</b></span>`).join('<span style="color:var(--text-faint);font-size:var(--fs-small)"> · </span>')}
      ${ranked.length > 5 ? `<span style="font-size:var(--fs-small);color:var(--text-faint)">+${ranked.length - 5} more</span>` : ''}
    </div>
    ${tier ? `<div style="font-size:var(--fs-small);color:${tier.col}">▲ ${topClan} at <b>${tier.label}</b> threshold (${topCount} members) — monthly passive bonus active</div>` : ''}
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
    <div style="font-size:var(--fs-micro);letter-spacing:1px;color:var(--text-faint);text-transform:uppercase;margin-bottom:5px">${tr('roster.developmentPath')}</div>
    <div style="display:grid;gap:3px">
      ${_DEV_PATHS.map(p => `<div onclick="setDevPath('${s.id}','${p.id}')" style="padding:5px 8px;border:1px solid ${cur===p.id?'var(--accent)':'var(--surface-3)'};background:${cur===p.id?'var(--accent-bg)':'transparent'};cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:var(--fs-lead)">${p.icon}</span>
        <div style="flex:1">
          <div style="font-size:var(--fs-small);color:${cur===p.id?'var(--accent)':'#a09080'};font-weight:${cur===p.id?'bold':'normal'}">${p.label}</div>
          <div style="font-size:var(--fs-micro);color:var(--text-faint)">${p.desc}</div>
        </div>
        ${cur===p.id?`<span style="font-size:var(--fs-body);color:var(--accent)">✓</span>`:''}
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
  if (!G.shinobi.length) { el.innerHTML = `<div style="color:var(--text-dim);font-size:var(--fs-body);padding:12px">${tr('roster.none')}</div>`; return }

  // Sort: by rank desc, then power desc
  const sorted = [...G.shinobi].sort((a, b) => (b.ri - a.ri) || (sPow(b) - sPow(a)))

  // Active-assignments panel: shinobi on missions
  const active = sorted.filter(s => s.status === 'mission' || s.status === 'exam' || s.status === 'injured')

  const assignedHtml = active.length === 0
    ? `<div style="font-size:var(--fs-small);color:var(--text-faint);padding:10px 0">${tr('roster.noAssignments')}</div>`
    : active.map(s => {
        const sq = G.squads.find(q => q.members.includes(s.id))
        const mission = s.missId ? (G.missions || []).find(m => m.id === s.missId) : null
        const rankLabel = RANKS[s.ri]
        const rankCol = ['var(--text-dim)','var(--blue)','var(--green)','var(--purple)','var(--gold)'][s.ri] || 'var(--text-dim)'

        let label, detail, progress, barColor
        if (s.status === 'mission' && mission) {
          label = mission.n
          detail = mission.rk + '-rank · ' + (sq ? sq.n : 'Solo')
          progress = mission.duration ? Math.min(100, Math.round(((mission.duration - (s.missionMonthsLeft || mission.duration)) / mission.duration) * 100)) : 50
          barColor = 'var(--gold)'
        } else if (s.status === 'injured') {
          label = 'Recovering from injury'
          detail = `${s.injDays || '?'} months remaining`
          progress = s.injuryMax ? Math.min(100, Math.round((1 - s.injDays / s.injuryMax) * 100)) : 30
          barColor = 'var(--red)'
        } else if (s.status === 'exam') {
          label = 'Adept Exam'
          detail = 'In progress'
          progress = 50
          barColor = 'var(--blue)'
        } else {
          label = s.status
          detail = ''
          progress = 50
          barColor = 'var(--text-faint)'
        }

        return `<div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:10px 12px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:var(--fs-small);font-weight:bold;color:${rankCol};background:${rankCol}22;padding:1px 5px;border:1px solid ${rankCol}44">${rankLabel.slice(0,3).toUpperCase()}</span>
            <span style="font-size:var(--fs-body);color:var(--text-hi);font-weight:bold;cursor:pointer" onclick="oDos('${s.id}')">${sn(s)}</span>
            ${s.jk ? `<span style="font-size:var(--fs-micro);color:var(--gold)">[JK]</span>` : ''}
            <span style="font-size:var(--fs-small);color:var(--text-faint);margin-left:auto">${label}</span>
          </div>
          <div style="background:var(--sunken);border-radius:2px;height:4px;margin-bottom:4px">
            <div style="height:4px;border-radius:2px;background:${barColor};width:${progress}%;transition:width .3s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:var(--fs-micro);color:var(--text-faint)">
            <span>${detail}</span>
            <span style="color:var(--text-dim)">${progress}% complete</span>
          </div>
        </div>`
      }).join('')

  // ── Main roster table — sortable headers + customizable columns (P1 kit) ──
  const _statusCell = s => s.status === 'available' ? `<span style="color:var(--green);font-size:var(--fs-small)" title="Available">●</span>`
    : s.status === 'mission' ? `<span style="color:var(--gold);font-size:var(--fs-small)" title="On mission">▶</span>`
    : s.status === 'injured' ? `<span style="color:var(--red);font-size:var(--fs-small)" title="Injured ${s.injDays}m">✕</span>`
    : `<span style="color:var(--blue);font-size:var(--fs-small)" title="Exam">⚑</span>`
  const _nameCell = s => {
    const nt = s.noTrade ? `<span style="font-size:var(--fs-micro);color:var(--red-soft);border:1px solid var(--red);padding:0 3px;margin-left:3px">NT</span>` : ''
    const tw = s.twoWay  ? `<span style="font-size:var(--fs-micro);color:var(--blue);border:1px solid #468;padding:0 3px;margin-left:2px">2W</span>` : ''
    const peak = s.peakAge && Math.abs((s.age||0) - s.peakAge) <= 1 ? `<span style="font-size:var(--fs-micro);color:var(--gold);border:1px solid #c9a84c66;padding:0 3px;margin-left:3px" title="Peak years">★</span>`
      : s.peakAge && (s.age||0) > s.peakAge + 3 ? `<span style="font-size:var(--fs-micro);color:var(--red);border:1px solid #f6644;padding:0 3px;margin-left:3px" title="Past peak">↘</span>` : ''
    return `<div style="font-size:var(--fs-body);color:var(--text-hi);font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px">${sn(s)}${s.jk ? '<span style="font-size:var(--fs-micro);color:var(--gold)"> ⚡</span>' : ''}${nt}${tw}${peak}</div><div style="font-size:var(--fs-micro);color:var(--text-faint)">${s.clan || s.spec || '—'}</div>`
  }
  const COLS = [
    { key: 'rank', label: 'Rank', align: 'left', hideable: false, sortVal: s => s.ri,
      render: s => `<span style="font-size:var(--fs-small);font-weight:bold;color:${_rankColor(s.ri)};background:${_rankColor(s.ri)}22;padding:1px 5px;border:1px solid ${_rankColor(s.ri)}44">${RANKS[s.ri].slice(0,3).toUpperCase()}</span>` },
    { key: 'name', label: 'Name', align: 'left', hideable: false, sortVal: s => sn(s), render: _nameCell },
    { key: 'age', label: 'Age', align: 'center', sortVal: s => s.age || 0, render: s => `<span style="font-size:var(--fs-small);color:var(--text-dim)">${s.age}</span>` },
    { key: 'power', label: 'Ability', align: 'center', sortVal: s => sPow(s), render: s => _starsHtml(sPow(s)) },
    { key: 'potential', label: 'Potential', align: 'center', sortVal: s => _potential(s), render: s => _starsHtml(_potential(s)) },
    { key: 'status', label: 'Sts', align: 'center', sortVal: s => s.status, render: _statusCell },
    { key: 'grade', label: 'Grd', align: 'center', sortVal: s => _GRADE_ORDER[gradeShinobi(s).label] ?? 0,
      render: s => { const g = gradeShinobi(s); return `<span style="font-size:var(--fs-body);font-weight:bold;color:${g.color};background:${g.color}22;padding:1px 5px;border:1px solid ${g.color}44">${g.label}</span>` } },
    { key: 'salary', label: 'Salary', align: 'right', sortVal: s => s.salary || 0, render: s => `<span style="font-size:var(--fs-small);color:var(--text-faint)">${fmt(s.salary)}</span>` },
  ]
  const _sort = tblSort('roster', _ROSTER_DEFAULT_SORT)
  const _hidden = new Set(tblHidden('roster'))
  const _visCols = COLS.filter(c => !_hidden.has(c.key))
  const _rosterRows = tblSortRows(G.shinobi, _sort, COLS)

  const tableRows = _rosterRows.map((s, i) => {
    const isSelected = window._rosSelId === s.id
    return `<tr style="background:${isSelected ? '#1e1c16' : i%2===0 ? 'var(--sunken)' : 'var(--sunken)'};cursor:pointer;border-bottom:1px solid var(--sunken)"
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
          <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase">${tr('roster.header', { n: G.shinobi.length })}</div>
          <div style="margin-left:auto;display:flex;gap:10px;align-items:center;font-size:var(--fs-small);color:var(--text-faint)">
            <span><span style="color:var(--green)">●</span> Avail</span>
            <span><span style="color:var(--gold)">▶</span> Mission</span>
            <span><span style="color:var(--red)">✕</span> Injured</span>
            <span><span style="color:var(--blue)">⚑</span> Exam</span>
            <button class="tbl-colbtn" onclick="rosterColMgr()" title="Show / hide columns">⚙ Columns</button>
            ${tblColumnManagerHtml('roster', COLS, 'rosterToggleCol')}
          </div>
        </div>
        <div style="font-size:var(--fs-micro);color:var(--text-faint);margin-bottom:4px">Click a column to sort · right-click a shinobi for actions</div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#0a0908;border-bottom:1px solid var(--border)">${tblHeaderHtml(_visCols, _sort, 'rosterSortBy')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>

      <!-- Right: active assignments + selected dossier -->
      <div>
        <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px">
          Active Assignments <span style="color:var(--text-faint)">— ${active.length}/${G.shinobi.length}</span>
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
  const rankCol = ['var(--text-dim)','var(--blue)','var(--green)','var(--purple)','var(--gold)'][s.ri] || 'var(--text-dim)'

  el.innerHTML = `
    <div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:12px;margin-top:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:var(--fs-body);font-weight:bold;color:${rankCol};background:${rankCol}22;padding:2px 7px;border:1px solid ${rankCol}44">${RANKS[s.ri]}</span>
        <div>
          <div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold">${sn(s)}</div>
          <div style="font-size:var(--fs-small);color:var(--text-faint)">${s.clan || s.spec || ''} · Age ${s.age}</div>
        </div>
        <button class="gb" style="margin-left:auto;font-size:var(--fs-micro);padding:2px 8px" onclick="oDos('${s.id}')">${tr('roster.fullDossier')}</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
        ${['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'].map(k => {
          const v = s.stats?.[k] || 0
          return `<div>
            <div style="display:flex;justify-content:space-between;font-size:var(--fs-micro);color:var(--text-faint);margin-bottom:2px">
              <span>${k.slice(0,5)}</span><span>${v}</span>
            </div>
            <div style="background:var(--sunken);height:3px;border-radius:1px">
              <div style="background:var(--gold);height:3px;border-radius:1px;width:${v}%"></div>
            </div>
          </div>`
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;font-size:var(--fs-small);margin-bottom:10px;flex-wrap:wrap">
        <span style="color:var(--text-dim)">Pwr <b style="color:var(--text-hi)">${pw}</b></span>
        <span style="color:var(--text-dim)">Salary <b style="color:var(--red)">${fmt(s.salary)}</b></span>
        <span style="color:var(--text-dim)">Wins <b style="color:var(--text-hi)">${s.wins||0}</b></span>
        ${(() => { const total = (s.wins||0) + (s.losses||0); const pct = total > 0 ? Math.round((s.wins||0)/total*100) : null; return pct !== null ? `<span style="color:var(--text-dim)">Win% <b style="color:${pct>=70?'var(--green)':pct>=50?'var(--text-hi)':'var(--red-soft)'}">${pct}%</b></span>` : '' })()}
        ${(s.winsS||0) > 0 ? `<span style="font-size:var(--fs-micro);color:var(--gold)">★ ${s.winsS} S-rank</span>` : ''}
        ${sq ? `<span style="color:var(--text-dim)">Squad <b style="color:var(--blue)">${sq.n}</b></span>` : ''}
      </div>
      ${(() => {
        const age = s.age || 20
        const trajectory = age < 22 ? 'Ascending' : age < 27 ? 'Prime' : age < 31 ? 'Late Career' : 'Declining'
        const trajCol = age < 22 ? 'var(--blue)' : age < 27 ? 'var(--green)' : age < 31 ? 'var(--orange)' : 'var(--red)'
        const peakCeil = Math.round((s.potential || 50) * 0.92)
        return `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-top:1px solid var(--surface);margin-top:5px;font-size:var(--fs-small)">
          <span style="color:var(--text-faint)">Peak Ceiling <b style="color:var(--text-hi)">${peakCeil}</b></span>
          <span style="color:var(--text-faint)">Trajectory <b style="color:${trajCol}">${trajectory}</b></span>
        </div>`
      })()}
      ${_devPathSelector(s)}
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">
        ${s.noTrade ? `<span style="font-size:var(--fs-micro);color:var(--red-soft);border:1px solid var(--red);padding:1px 5px">No-Trade</span>` : ''}
        ${s.twoWay  ? `<span style="font-size:var(--fs-micro);color:var(--blue);border:1px solid #468;padding:1px 5px">Two-Way</span>` : ''}
        ${s.buyoutCost ? `<span style="font-size:var(--fs-micro);color:var(--text-faint)">Buyout: ${fmt(s.buyoutCost)}</span>` : ''}
      </div>
      <div style="margin-top:10px;display:flex;gap:5px;flex-wrap:wrap">
        <button class="gb gb-b" style="font-size:var(--fs-micro);padding:2px 8px" onclick="toggleNoTrade('${s.id}')">
          ${s.noTrade ? 'Remove No-Trade' : 'Add No-Trade'}
        </button>
        <button class="gb gb-b" style="font-size:var(--fs-micro);padding:2px 8px" onclick="toggleTwoWay('${s.id}')">
          ${s.twoWay ? 'Remove Two-Way' : 'Add Two-Way'}
        </button>
        ${s.buyoutCost ? `<button class="gb gb-r" style="font-size:var(--fs-micro);padding:2px 8px" onclick="executeBuyout('${s.id}')" ${(window.G?.ryo||G.ryo||0)<s.buyoutCost?'disabled':''}>Release (${fmt(s.buyoutCost)})</button>` : ''}
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
  const knownJutsu = (s.jutsu || []).map(jId => ALL_JUTSU.find(j => j.id === jId)).filter(Boolean)
  const loadout = s.jutsuLoadout || []
  const jlb = jutsuLoadoutBonus(s, ALL_JUTSU)
  const tierColor = t => t === 'rare' ? 'var(--purple)' : t === 'uncommon' ? 'var(--gold)' : 'var(--blue)'
  const jutsuHtml = knownJutsu.length
    ? `<div style="margin-bottom:10px">
        <div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">
          Jutsu Loadout <span style="color:var(--text-faint);font-size:var(--fs-micro)">(${loadout.length}/${LOADOUT_MAX} active)</span>
          ${jlb.powerMod > 0 || jlb.successMod > 0 ? `<span style="color:var(--green);font-size:var(--fs-micro);margin-left:6px">+${Math.round((jlb.powerMod*0.5+jlb.successMod)*100)}% mission</span>` : ''}
        </div>
        ${knownJutsu.map(j => {
          const active = loadout.includes(j.id)
          const canAdd = !active && loadout.length < LOADOUT_MAX
          const bonusStr = [j.bonus?.powerMod ? `+${Math.round(j.bonus.powerMod*100)}% pow` : '', j.bonus?.successMod ? `+${Math.round(j.bonus.successMod*100)}% sc` : ''].filter(Boolean).join(' ')
          return `<div style="margin-bottom:4px;padding:4px 6px;border:1px solid ${active?'var(--green)':'var(--border)'};background:${active?'rgba(143,188,143,0.08)':'transparent'}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:var(--fs-body);color:${tierColor(j.tier)};font-weight:bold">${j.n}</span>
              <button onclick="toggleJutsuLoadout('${s.id}','${j.id}')"
                style="font-size:var(--fs-micro);padding:1px 5px;border:1px solid ${active?'var(--green)':'var(--border)'};background:${active?'rgba(143,188,143,0.15)':'transparent'};color:${active?'var(--green)':canAdd?'var(--text-dim)':'var(--border)'};cursor:${canAdd||active?'pointer':'default'}">
                ${active ? '✓ Active' : canAdd ? '+ Equip' : '— Full'}
              </button>
            </div>
            <div style="font-size:var(--fs-micro);color:var(--text-faint);margin-top:1px">${bonusStr} · ${j.desc}</div>
          </div>`
        }).join('')}
      </div>`
    : ''
  // Build bonds section
  const bondsHtml = (s.bonds || []).length
    ? `<div style="margin-bottom:10px">
        <div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Bonds</div>
        ${s.bonds.map(bnd => {
          const other = G.shinobi.find(x => x.id === bnd.otherId)
          if (!other) return ''
          const def = BOND_TYPES[bnd.type]
          const typeColor = bnd.type === 'Rivals' ? 'var(--red)' : bnd.type === 'Mentor/Student' ? 'var(--blue)' : bnd.type === 'Battle-Scarred' ? 'var(--purple)' : 'var(--gold)'
          return `<div style="margin-bottom:5px;padding:4px 6px;border-left:2px solid ${typeColor}">
            <div style="font-size:var(--fs-body);color:${typeColor};font-weight:bold">${bnd.type} — ${sn(other)}</div>
            ${def ? `<div style="font-size:var(--fs-micro);color:var(--text-dim)">${def.desc}</div>` : ''}
          </div>`
        }).filter(Boolean).join('')}
      </div>`
    : ''
  // Dark moment
  const darkHtml = s.darkMoment
    ? `<div style="margin-bottom:10px;padding:6px 8px;border-left:2px solid var(--red);background:rgba(255,80,80,0.04)"><div style="font-size:var(--fs-micro);color:var(--red);letter-spacing:2px;text-transform:uppercase;margin-bottom:3px">Dark Moment</div><div style="font-size:var(--fs-small);color:var(--text-dim);font-style:italic">${s.darkMoment}</div></div>`
    : ''

  // Injury & availability panel
  const injTypeDef = s.injuryType ? INJURY_TYPES.find(t => t.id === s.injuryType) : null
  const workload = s.workload || 0
  const wColor = workload >= 80 ? 'var(--red)' : workload >= 60 ? 'var(--red-soft)' : workload >= 40 ? 'var(--orange)' : 'var(--green)'
  const workloadBar = `<div style="background:var(--border-dim);height:5px;border-radius:2px;overflow:hidden"><div style="width:${workload}%;height:100%;background:${wColor};transition:width .3s"></div></div>`
  // Second opinion & specialist treatment options
  const hasMedical = (G.staff||[]).some(st => st.role === 'medical')
  const alliedVillages = G.villages.filter(v => v.rel >= 50)
  const bestAlly = alliedVillages.sort((a,b) => b.rel - a.rel)[0]
  const canSecondOpinion = s.status === 'injured' && s.injDays >= 2 && hasMedical && !s.secondOpinionUsed
  const canSpecialist = s.status === 'injured' && s.injDays >= 3 && bestAlly && !s.specialistTreated

  const injuryHtml = `<div style="margin-bottom:10px">
    <div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Availability & Workload</div>
    ${s.status === 'injured' && injTypeDef
      ? `<div style="padding:7px 9px;border:1px solid ${injTypeDef.color};background:rgba(0,0,0,.3);margin-bottom:6px">
           <div style="font-size:var(--fs-body);color:${injTypeDef.color};font-weight:bold">${injTypeDef.n}</div>
           <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">${injTypeDef.desc}</div>
           <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:4px">Expected return: <b style="color:var(--text-hi)">${s.injDays} month${s.injDays!==1?'s':''}</b>${s.secondOpinionUsed ? ' <span style="color:var(--blue)">(reviewed)</span>' : ''}</div>
           ${(s.returningForm||100) < 100 ? `<div style="font-size:var(--fs-small);color:var(--orange);margin-top:2px">Post-recovery form: ${s.returningForm}% (builds over 2–3 missions)</div>` : ''}
           <div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">
             ${canSecondOpinion ? `<button class="gb" style="font-size:var(--fs-micro);border-color:var(--blue);color:var(--blue)" onclick="secondOpinion('${s.id}')">Second Opinion (3,000 ryo) ▸</button>` : ''}
             ${canSpecialist ? `<button class="gb gb-g" style="font-size:var(--fs-micro)" onclick="specialistTreatment('${s.id}','${bestAlly.n}')">Specialist Treatment via ${bestAlly.n} (12,000 ryo) ▸</button>` : ''}
           </div>
           <div style="margin-top:8px">
             <div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Rehab Plan</div>
             <div style="display:flex;gap:4px;flex-wrap:wrap">
               ${REHAB_PLANS.map(pl => {
                 const cur = (s.rehabPlan || 'standard') === pl.id
                 const locked = pl.id === 'careful' && !hasMedical
                 return `<button class="gb" onclick="setRehabPlan('${s.id}','${pl.id}')" ${locked ? 'disabled title="Needs a medical ninja on staff"' : `title="${pl.desc}"`} style="font-size:var(--fs-micro);${cur ? 'border-color:var(--gold);color:var(--gold)' : ''}${locked ? 'opacity:.4' : ''}">${pl.icon} ${pl.label}</button>`
               }).join('')}
             </div>
           </div>
         </div>`
      : s.status === 'injured'
      ? `<div style="font-size:var(--fs-small);color:var(--red)">Injured — ${s.injDays} month${s.injDays!==1?'s':''} remaining</div>`
      : `<div style="font-size:var(--fs-small);color:#2d5;margin-bottom:4px">${s.status === 'available' ? 'Available' : s.status}</div>`
    }
    ${s.traumaStatus ? `<div style="padding:5px 7px;border:1px solid var(--purple);margin-bottom:6px">
      <div style="font-size:var(--fs-small);color:var(--purple)">⚠ Psychological Trauma: <b>${s.traumaStatus}</b> (${s.traumaMonths||0} months remaining)</div>
      <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">Stat penalty active. ${s.traumaCount >= 2 ? '<b style="color:var(--red)">High defection risk</b>' : 'Assign medical ninja for faster recovery.'}</div>
      ${hasMedical ? `<button class="gb gb-g" style="margin-top:5px;font-size:var(--fs-micro)" onclick="treatTrauma('${s.id}')">Treat Trauma (5,000 ryo) ▸</button>` : ''}
    </div>` : ''}
    <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
      <div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;width:60px">Workload</div>
      <div style="flex:1">${workloadBar}</div>
      <div style="font-size:var(--fs-small);color:${wColor};min-width:28px;text-align:right">${workload}%</div>
    </div>
    <div style="font-size:var(--fs-micro);color:var(--text-faint);margin-top:2px">High workload (60%+) increases injury risk.</div>
    ${(s.consecutiveMissions||0) >= 2 ? `<div style="font-size:var(--fs-micro);color:var(--orange);margin-top:2px">⚠ ${s.consecutiveMissions} consecutive missions — overuse risk +10%</div>` : ''}
    ${(() => { const f = s.fatigue||0; const fc = f >= 80 ? 'var(--red)' : f >= 60 ? 'var(--red-soft)' : f >= 40 ? 'var(--orange)' : 'var(--text-faint)'; return `<div style="display:flex;align-items:center;gap:8px;margin-top:5px"><div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;width:60px">Fatigue</div><div style="flex:1;background:var(--border-dim);height:4px;border-radius:2px;overflow:hidden"><div style="width:${f}%;height:100%;background:${fc};transition:width .3s"></div></div><div style="font-size:var(--fs-small);color:${fc};min-width:28px;text-align:right">${f}%</div></div>${f >= 40 ? `<div style="font-size:var(--fs-micro);color:${fc};margin-top:2px">${f >= 80 ? '⚠ Exhausted — mission penalty −15%' : f >= 60 ? '⚠ Very tired — mission penalty −9%' : 'Fatigued — mission penalty −4%'}</div>` : ''}` })()}
  </div>
  ${(s.injuryHistory||[]).length > 0 ? `<div style="margin-bottom:10px">
    <div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Injury History (${s.injuryHistory.length})</div>
    ${s.injuryHistory.slice().reverse().slice(0,6).map(h => {
      const tDef = INJURY_TYPES.find(t => t.id === h.type)
      return `<div style="display:flex;gap:6px;font-size:var(--fs-small);margin-bottom:3px;align-items:baseline">
        <span style="color:var(--text-faint);min-width:50px">Yr${h.year}·M${h.month}</span>
        <span style="color:${tDef?.color||'var(--red-soft)'}">${h.typeName||h.type}</span>
        <span style="color:var(--text-dim)">${h.duration}mo</span>
        ${h.treatment !== 'standard' ? `<span style="color:var(--blue);font-size:var(--fs-micro)">[${h.treatment}]</span>` : ''}
      </div>`
    }).join('')}
    ${s.injuryHistory.length > 6 ? `<div style="font-size:var(--fs-micro);color:var(--text-faint)">+${s.injuryHistory.length-6} earlier entries</div>` : ''}
  </div>` : ''}`
  // Personality matrix section
  const judgeLevel = personalityJudge()
  const pm = s.pMatrix || {}
  const pmTraits = ['loyalty','ambition','professionalism','temperament','adaptability']
  const pmHtml = `<div style="margin-bottom:10px">
    <div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Character Read ${judgeLevel >= 16 ? '(Precise)' : judgeLevel >= 11 ? '(General)' : judgeLevel >= 6 ? '(Broad)' : '(Unknown)'}</div>
    ${pmTraits.map(k => {
      const val = pm[k] !== undefined ? pm[k] : 10
      const desc = pDesc(val, k, judgeLevel)
      const color = judgeLevel < 6 ? 'var(--border-hi)' : val >= 13 ? 'var(--green)' : val >= 8 ? 'var(--text-mid)' : 'var(--red-soft)'
      return `<div style="display:flex;gap:6px;font-size:var(--fs-small);margin-bottom:3px"><span style="color:var(--text-dim);width:80px;text-transform:capitalize">${k}</span><span style="color:${color}">${desc}</span></div>`
    }).join('')}
    ${judgeLevel < 6 ? '<div style="font-size:var(--fs-micro);color:var(--text-faint);margin-top:4px">Hire a Council Advisor or Head Sensei to read character more accurately.</div>' : ''}
  </div>`
  // Evolved traits (gained through events, not fixed at creation)
  const evolvedHtml = (s.traits || []).length
    ? `<div style="margin-bottom:10px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Evolved Traits</div>
       ${s.traits.map(t => `<div style="margin-bottom:4px"><span class="trait-tag ${t==='Resilient'||t==='Confident'?'trait-pos':t==='Resentful'||t==='Haunted'?'trait-neg':'trait-neu'}">${t}</span><div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">${EVOLVED_TRAITS[t] || ''}</div></div>`).join('')}</div>`
    : ''
  // Individual morale & commitment bars
  const indMor = s.indMorale ?? 70
  const commit = s.commitment ?? 70
  const mColor = indMor >= 70 ? 'var(--green)' : indMor >= 45 ? 'var(--orange)' : 'var(--red)'
  const cColor = commit >= 60 ? 'var(--gold)' : commit >= 30 ? 'var(--orange)' : 'var(--red)'
  const moraleCommitHtml = `<div style="margin-bottom:10px">
    <div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">State of Mind</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div style="font-size:var(--fs-micro);color:var(--text-dim);width:70px">Individual Morale</div>
      <div style="flex:1;background:var(--border-dim);height:4px;border-radius:2px"><div style="width:${indMor}%;height:100%;background:${mColor}"></div></div>
      <div style="font-size:var(--fs-small);color:${mColor};min-width:24px">${indMor}</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div style="font-size:var(--fs-micro);color:var(--text-dim);width:70px">Commitment</div>
      <div style="flex:1;background:var(--border-dim);height:4px;border-radius:2px"><div style="width:${commit}%;height:100%;background:${cColor}"></div></div>
      <div style="font-size:var(--fs-small);color:${cColor};min-width:24px">${commit}</div>
    </div>
    ${(() => { const st = computeStrain(s), b = strainBand(st); return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div style="font-size:var(--fs-micro);color:var(--text-dim);width:70px">Strain</div>
      <div style="flex:1;background:var(--border-dim);height:4px;border-radius:2px"><div style="width:${st}%;height:100%;background:${b.color}"></div></div>
      <div style="font-size:var(--fs-small);color:${b.color};min-width:50px">${st} ${b.label}</div>
    </div>` })()}
    ${s.legendStatus ? '<div style="font-size:var(--fs-small);color:var(--gold);margin-top:2px">★ Village Legend — exceptionally loyal</div>' : ''}
    ${commit <= 25 ? '<div style="font-size:var(--fs-micro);color:var(--red);margin-top:2px">⚠ Low commitment — transfer risk! Consider a 1-on-1 meeting.</div>' : ''}
    ${s.roleGuarantee ? '<div style="font-size:var(--fs-micro);color:var(--blue);margin-top:2px">Role guarantee promised — must deploy regularly.</div>' : ''}
    ${s.promotionDeadline ? '<div style="font-size:var(--fs-micro);color:var(--orange);margin-top:2px">⏳ Promotion deadline: month ' + s.promotionDeadline + '</div>' : ''}
    ${s.bingoBookPresence > 0 ? '<div style="font-size:var(--fs-micro);color:var(--orange);margin-top:2px">📖 Bingo Book: ' + ['','Listed','Featured','Legendary'][s.bingoBookPresence] + (s.bingoBookSuppressed ? ' (suppressed)' : '') + '</div>' : ''}
  </div>`

  const marketVal = computeMarketValue(s)
  const dosGrade = gradeShinobi(s)
  const dosActiveTab = window._dosTab || 'profile'
  ensureCareerFields(s)

  // ── Phase 4: Training focus + rest toggle + contract + pair chemistry ─────────
  const STAT_OPTIONS = ['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed']
  const contractYearsLeft = s.contractEnd ? (s.contractEnd - (window.G?.year || 1)) : null
  const contractColor = contractYearsLeft !== null && contractYearsLeft <= 1 ? 'var(--red)' : contractYearsLeft === 2 ? 'var(--orange)' : 'var(--green)'

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

  const phase4Html = `<div style="margin-bottom:12px;background:#1a1a0d;border:1px solid var(--border-hi);padding:10px">
    <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px">Field Management</div>

    <div style="margin-bottom:8px">
      <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:4px">Training Focus <span style="color:var(--text-faint)">(+1–3 stat/month, +12% workload)</span></div>
      <select onchange="setTrainingFocus('${s.id}',this.value)" style="background:var(--sunken);border:1px solid var(--border-hi);color:var(--text-hi);font-size:var(--fs-small);padding:3px 6px;width:100%">
        <option value="" ${!s.trainingFocus?'selected':''}>— None —</option>
        ${STAT_OPTIONS.map(st => `<option value="${st}" ${s.trainingFocus===st?'selected':''}>${st.charAt(0).toUpperCase()+st.slice(1)}</option>`).join('')}
      </select>
    </div>

    <div style="margin-bottom:8px;display:flex;align-items:center;gap:10px">
      <div>
        <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:3px">Rest Month <span style="color:var(--text-faint)">(skip deployment, −30% workload)</span></div>
        <button onclick="toggleRestMonth('${s.id}')" style="font-size:var(--fs-small);padding:3px 10px;background:${s.restMonth?'var(--green-bg)':'var(--sunken)'};border:1px solid ${s.restMonth?'var(--green)':'var(--border-hi)'};color:${s.restMonth?'var(--green)':'var(--text-dim)'};cursor:pointer">
          ${s.restMonth ? '✓ Resting' : '○ Set Rest'}
        </button>
      </div>
      ${contractYearsLeft !== null ? `<div>
        <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:3px">Contract</div>
        <div style="font-size:var(--fs-small);color:${contractColor}">${contractYearsLeft <= 0 ? 'EXPIRED' : contractYearsLeft === 1 ? 'Final year' : `${contractYearsLeft}yr remaining`}</div>
        ${contractYearsLeft <= 1 && !s.contractRenewing ? `<button onclick="openContractRenewal('${s.id}')" style="font-size:var(--fs-micro);margin-top:3px;background:var(--surface-2);border:1px solid var(--blue-bg);color:var(--blue-hi);padding:2px 7px;cursor:pointer">Offer Renewal ▸</button>` : ''}
        ${s.contractRenewing ? `<div style="font-size:var(--fs-micro);color:var(--orange);margin-top:2px">⏳ Renewal pending</div>` : ''}
      </div>` : ''}
      <div>
        <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:3px">Contract Clauses</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:3px">
          <button onclick="toggleNoTrade('${s.id}')" style="font-size:var(--fs-micro);padding:2px 6px;background:${s.noTrade?'var(--green-bg)':'var(--sunken)'};border:1px solid ${s.noTrade?'var(--green)':'var(--border-hi)'};color:${s.noTrade?'var(--green)':'var(--text-faint)'};cursor:pointer">
            ${s.noTrade?'✓ ':''} No-Trade
          </button>
          <button onclick="toggleTwoWay('${s.id}')" style="font-size:var(--fs-micro);padding:2px 6px;background:${s.twoWay?'var(--surface-2)':'var(--sunken)'};border:1px solid ${s.twoWay?'var(--blue)':'var(--border-hi)'};color:${s.twoWay?'var(--blue)':'var(--text-faint)'};cursor:pointer">
            ${s.twoWay?'✓ ':''} Two-Way
          </button>
        </div>
        ${s.buyoutCost ? `<div style="font-size:var(--fs-micro);color:var(--text-dim)">Buyout: <span style="color:var(--gold)">${s.buyoutCost.toLocaleString()} ryo</span>
          <button onclick="executeBuyout('${s.id}')" style="margin-left:4px;font-size:var(--fs-micro);padding:1px 5px;background:var(--red-bg);border:1px solid var(--red);color:var(--red-soft);cursor:pointer" ${(window.G?.ryo||0)<s.buyoutCost?'disabled':''}>Release (buyout)</button>
        </div>` : ''}
        ${s.twoWay ? `<div style="font-size:var(--fs-micro);color:var(--blue);margin-top:2px">Two-way: not counted against salary cap</div>` : ''}
      </div>
    </div>

    ${provenPairs.length > 0 ? `<div style="margin-top:6px">
      <div style="font-size:var(--fs-micro);color:var(--green);margin-bottom:3px">⚗ Proven chemistry:</div>
      ${provenPairs.map(p => `<span style="font-size:var(--fs-micro);color:var(--green);margin-right:8px">${p.name} (${p.count} missions)</span>`).join('')}
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
  const arcHtml = `<div class="surf" style="margin-bottom:12px;background:var(--surface);border:1px solid var(--border);padding:10px">
    <div style="font-size:var(--fs-micro);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Career Arc</div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='developing'?'rgba(100,150,255,.12)':'transparent'};border:1px solid ${PHASE_META.developing.color};opacity:${phaseIdx===0?1:.35}">
        <div style="font-size:var(--fs-small);color:${PHASE_META.developing.color}">${PHASE_META.developing.icon}</div>
        <div style="font-size:var(--fs-micro);color:${PHASE_META.developing.color}">Developing</div>
      </div>
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='prime'?'rgba(80,200,120,.12)':'transparent'};border:1px solid ${PHASE_META.prime.color};opacity:${phaseIdx===1?1:.35}">
        <div style="font-size:var(--fs-small);color:${PHASE_META.prime.color}">${PHASE_META.prime.icon}</div>
        <div style="font-size:var(--fs-micro);color:${PHASE_META.prime.color}">Prime</div>
      </div>
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='veteran'?'rgba(201,168,76,.12)':'transparent'};border:1px solid ${PHASE_META.veteran.color};opacity:${phaseIdx===2?1:.35}">
        <div style="font-size:var(--fs-small);color:${PHASE_META.veteran.color}">${PHASE_META.veteran.icon}</div>
        <div style="font-size:var(--fs-micro);color:${PHASE_META.veteran.color}">Veteran</div>
      </div>
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='declining'?'rgba(255,80,80,.12)':'transparent'};border:1px solid ${PHASE_META.declining.color};opacity:${phaseIdx===3?1:.35}">
        <div style="font-size:var(--fs-small);color:${PHASE_META.declining.color}">${PHASE_META.declining.icon}</div>
        <div style="font-size:var(--fs-micro);color:${PHASE_META.declining.color}">Declining</div>
      </div>
    </div>
    <div style="display:flex;gap:16px;font-size:var(--fs-small);flex-wrap:wrap;margin-bottom:6px">
      <span>Age: <b style="color:var(--text-hi)">${s.age}</b></span>
      <span>Peak age: <b style="color:var(--gold)">${peakAge}</b></span>
      <span>Phase: <b style="color:${pMeta.color}">${pMeta.label}</b></span>
      ${yearsLeft !== null && yearsLeft > 0 ? `<span style="color:var(--text-dim)">${yearsLeft}yr${yearsLeft!==1?'s':''} in phase</span>` : ''}
    </div>
    ${decMod < 0 ? `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;font-size:var(--fs-micro);color:var(--text-dim);margin-bottom:2px">
        <span>Decline penalty</span><span style="color:var(--red)">${Math.round(decMod*100)}%</span>
      </div>
      <div style="background:#2a1a1a;height:4px;border-radius:2px">
        <div style="background:var(--red);height:4px;border-radius:2px;width:${Math.min(100,Math.abs(decMod)/0.18*100)}%"></div>
      </div>
    </div>` : ''}
    ${s.retirementOffered ? `<div style="margin-top:8px;padding:8px 10px;background:var(--red-bg);border:1px solid var(--red)">
      <div style="font-size:var(--fs-small);color:var(--red);margin-bottom:6px">⚠ ${sn(s)} has been offered retirement options</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="gb" style="border-color:var(--green);color:var(--green);font-size:var(--fs-micro)" onclick="confirm('Retire ${s.fn} ${s.ln} honorably? This cannot be undone.') && retireShinobi('${s.id}')">Retire Honorably ▸</button>
        <button class="gb" style="border-color:var(--blue);color:var(--blue);font-size:var(--fs-micro)" onclick="confirm('Move ${s.fn} ${s.ln} to coaching staff? This cannot be undone.') && retireToCoach('${s.id}')">Transition to Staff ▸</button>
        <button class="gb" style="border-color:var(--text-dim);color:var(--text-dim);font-size:var(--fs-micro)" onclick="extendCareer('${s.id}')">Request One More Year</button>
      </div>
    </div>` : ''}
  </div>`

  const careerInjHtml = (s.injuryHistory||[]).length > 0
    ? `<div style="margin-bottom:10px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Injury History</div>${s.injuryHistory.slice().reverse().slice(0,5).map(h => { const tDef = INJURY_TYPES.find(t => t.id === h.type); return `<div style="display:flex;gap:6px;font-size:var(--fs-small);margin-bottom:3px;align-items:baseline"><span style="color:var(--text-faint);min-width:50px">Yr${h.year}·M${h.month}</span><span style="color:${tDef?.color||'var(--red-soft)'}">${h.typeName||h.type}</span><span style="color:var(--text-dim)">${h.duration}mo</span>${h.treatment !== 'standard' ? `<span style="color:var(--blue);font-size:var(--fs-micro)">[${h.treatment}]</span>` : ''}</div>` }).join('')}</div>`
    : ''
  const traumaHistHtml = (s.traumaHistory||[]).length
    ? `<div style="margin-bottom:10px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Trauma History</div>${s.traumaHistory.map(t => `<div style="font-size:var(--fs-small);color:var(--purple);margin-bottom:3px;padding:4px 7px;border-left:2px solid var(--purple)">${t.year !== undefined ? `Yr${t.year}·M${t.month}: ` : ''}${t.type||String(t)}</div>`).join('')}</div>`
    : ''
  // Memory + emotional state + role tag section
  const _memBlurb = memoryStateBlurb(s)
  const _salient  = mostSalientMemory(s)
  const _quote    = getArchetypeQuote(s)
  const _roleTag  = s.roleTag ? s.roleTag.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : null
  const _emotion  = s.emotionalStateLabel
  const memoryHtml = `<div style="margin-bottom:10px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Memory State</div>` +
    `<div style="font-size:var(--fs-body);color:var(--text);font-style:italic;margin-bottom:4px">"${_quote}"</div>` +
    `<div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:4px">${_memBlurb}</div>` +
    (_salient ? `<div style="font-size:var(--fs-micro);color:var(--text-dim);padding:3px 6px;border-left:2px solid var(--border-hi)">Most vivid: <span style="color:var(--text)">${_salient.label}</span> (intensity ${_salient.intensity.toFixed(2)})</div>` : '') +
    (_emotion ? `<div style="margin-top:4px;font-size:var(--fs-small);padding:3px 7px;background:rgba(204,127,184,.1);border:1px solid #cc7fb888;display:inline-block">${_emotion}</div>` : '') +
    (_roleTag ? `<div style="margin-top:5px;font-size:var(--fs-micro);color:var(--blue);text-transform:uppercase;letter-spacing:1px">Role: ${_roleTag}</div>` : '') +
    `</div>`

  // Defining moments + vendettas — the part of a career that never fades. Ordinary
  // memories decay out within a couple of years; these are what the shinobi still
  // carries a decade on, and who they hold responsible for it.
  const _defining = definingMoments(s)
  const _vend = s.vendettas || []
  const legacyHtml = (_defining.length || _vend.length)
    ? `<div style="margin-bottom:10px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Defining Moments</div>` +
      _defining.map(m => `<div style="font-size:var(--fs-small);color:var(--text-mid);margin-bottom:3px;padding:4px 7px;border-left:2px solid ${m.valence === 'positive' ? 'var(--gold)' : 'var(--red)'}">
        <span style="color:var(--text-hi)">${m.label}</span> <span style="color:var(--text-faint)">Y${m.year}·M${m.month}</span></div>`).join('') +
      _vend.map(v => `<div style="font-size:var(--fs-small);color:var(--red);margin-top:4px;padding:4px 7px;border-left:2px solid var(--red)">
        ⚑ Vendetta: <span style="color:var(--text-hi)">${v.village}</span> <span style="color:var(--text-faint)">(since Y${v.formed.year})</span>
        <div style="font-size:var(--fs-micro);color:var(--text-dim);margin-top:2px">For ${v.lost.join(', ')}.</div></div>`).join('') +
      `</div>`
    : ''

  // Mentorship section
  const _mentSum = mentorshipSummary(s, G.mentorships || [], G.shinobi)
  const _canMentor  = isMentorEligible(s, G.mentorships || [])
  const _canStudent = isStudentEligible(s, G.mentorships || [])
  const _eligStudents = _canMentor ? (G.shinobi || []).filter(x => isStudentEligible(x, G.mentorships || []) && x.id !== s.id).slice(0, 6) : []
  const _eligMentors  = _canStudent ? (G.shinobi || []).filter(x => isMentorEligible(x, G.mentorships || []) && x.id !== s.id).slice(0, 6) : []
  const mentorHtml = `<div style="margin-bottom:10px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Mentorship</div>` +
    (_mentSum
      ? `<div style="font-size:var(--fs-body);color:var(--gold);margin-bottom:4px">${_mentSum}</div>` +
        `<button class="gb" style="font-size:var(--fs-micro);border-color:var(--text-dim);color:var(--text-dim);padding:2px 7px" onclick="releaseMentor('${s.id}')">End Mentorship</button>`
      : _canMentor && _eligStudents.length
        ? `<div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:4px">Eligible to mentor:</div>` +
          `<div style="display:flex;flex-wrap:wrap;gap:4px">${_eligStudents.map(x => `<button class="gb" style="font-size:var(--fs-micro);padding:2px 7px" onclick="assignMentor('${s.id}','${x.id}')">${x.fn} ${x.ln}</button>`).join('')}</div>`
        : _canStudent && _eligMentors.length
          ? `<div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:4px">Request mentorship from:</div>` +
            `<div style="display:flex;flex-wrap:wrap;gap:4px">${_eligMentors.map(x => `<button class="gb" style="font-size:var(--fs-micro);padding:2px 7px" onclick="assignMentor('${x.id}','${s.id}')">${x.fn} ${x.ln}</button>`).join('')}</div>`
          : `<div style="font-size:var(--fs-small);color:var(--text-faint)">No mentorship available right now.</div>`
    ) + `</div>`

  const _activityHtml = (s.activityLog || []).length
    ? `<div style="margin-bottom:12px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Recent Activity (last ${s.activityLog.length}mo)</div>${activityGridHtml(s.activityLog)}</div>`
    : ''
  const careerHtml = `${arcHtml}${memoryHtml}${legacyHtml}${mentorHtml}${_activityHtml}<div style="margin-bottom:12px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Mission Record</div><div style="display:flex;gap:10px;flex-wrap:wrap"><div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:8px 12px;flex:1;min-width:70px;text-align:center"><div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold">${s.wins||0}</div><div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;margin-top:2px">Total</div></div><div style="background:var(--surface);border:1px solid #c9a84c33;padding:8px 12px;flex:1;min-width:70px;text-align:center"><div style="font-size:var(--fs-lead);color:var(--gold);font-weight:bold">${s.winsS||0}</div><div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;margin-top:2px">S-Rank</div></div><div style="background:var(--surface);border:1px solid #87ceeb33;padding:8px 12px;flex:1;min-width:70px;text-align:center"><div style="font-size:var(--fs-lead);color:var(--blue);font-weight:bold">${s.winsB||0}</div><div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;margin-top:2px">B/C-Rank</div></div></div></div>${traumaHistHtml}${darkHtml}${bondsHtml}${careerInjHtml}`
  const profileHtml = phase4Html +
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px"><div><div style="font-size:var(--fs-sub);color:var(--text-hi);font-weight:bold">${sn(s)}</div><div style="font-size:var(--fs-body);color:var(--text-dim);margin-top:2px">${RANKS[s.ri]} · ${s.clan ? s.clan + ' Clan' : s.spec} · Age ${s.age}${s.prodigy ? ' · <span style="color:var(--gold)">✦ Prodigy</span>' : ''}${s.homegrown ? ' · <span style="color:var(--green)">🌱 Homegrown</span>' : ''}</div><div style="font-size:var(--fs-body);margin-top:3px">Ability ${_starsHtml(sPow(s))}<span style="color:var(--text-faint);margin:0 5px">·</span>Potential ${_starsHtml(_potential(s))}<span style="color:var(--text-faint);margin:0 5px">·</span><span style="font-size:var(--fs-small);color:var(--text-dim)">Pwr <b style="color:var(--text-hi)">${sPow(s)}</b></span></div>${jkB ? `<div style="font-size:var(--fs-body);color:var(--gold);margin-top:2px">Vessel of ${jkB.n} (${jkB.tails} tails)</div>` : ''}${sq ? `<div style="font-size:var(--fs-body);color:var(--purple);margin-top:2px">Member of ${sq.n}</div>` : ''}</div><span class="rk ${RKC[s.ri]}" style="font-size:var(--fs-body)">${RANKS[s.ri]}</span></div><div style="margin-bottom:10px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Stats</div><div class="sg">${sBars(s)}</div></div>${injuryHtml}${moraleCommitHtml}<div style="margin-bottom:10px"><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Personality</div><span class="trait-tag ${pCl(s.pers)}">${s.pers.n}</span>${s.narrativeArchetype ? `<span style="margin-left:6px;font-size:var(--fs-micro);color:var(--purple);text-transform:uppercase;letter-spacing:1px;padding:2px 6px;border:1px solid #cc7fb855">${s.narrativeArchetype.replace('_',' ')}</span>` : ''}${s.confidence !== undefined ? `<div style="margin-top:6px"><div style="display:flex;justify-content:space-between;font-size:var(--fs-micro);color:var(--text-dim);margin-bottom:2px"><span>Confidence</span><span style="color:${s.confidence>=70?'var(--green)':s.confidence<=30?'var(--red)':'var(--text)'}">${s.confidence}/100</span></div><div class="well" style="background:var(--surface);border:1px solid var(--border);height:4px;border-radius:2px"><div style="background:${s.confidence>=70?'var(--green)':s.confidence<=30?'var(--red)':'var(--gold)'};width:${s.confidence}%;height:100%;border-radius:2px"></div></div></div>` : ''}<div style="font-size:var(--fs-body);color:var(--text-dim);margin-top:5px">${s.pers.desc}</div></div>${pmHtml}${evolvedHtml}<div>${s.archetype ? `<div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Archetype</div><div style="font-size:var(--fs-body);color:var(--purple);margin-bottom:3px">${s.archetype.n}</div><div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:10px;font-style:italic">${s.archetype.flavor}</div>` : ''}</div>${darkHtml}${jutsuHtml}${bondsHtml}<div><div style="font-size:var(--fs-small);color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Background</div><div class="dossier">${s.backstory}</div>${(s.element||s.quirk||s.dream)?`<div style="margin-top:7px;font-size:var(--fs-small);color:var(--text-dim);line-height:1.8">${s.element?`<div>Chakra nature: <span style="color:var(--gold)">${s.element}</span></div>`:''}${_combinedDossier(s)}${s.nationArchetype?`<div>School: <span style="color:var(--green)">${s.nationArchetype}</span></div>`:''}${s.quirk?`<div>Quirk: <span style="color:var(--text);font-style:italic">${s.quirk}</span></div>`:''}${s.dream?`<div>Dream: <span style="color:var(--purple);font-style:italic">“${s.dream}”</span></div>`:''}</div>`:''}</div><div style="margin-top:10px;display:flex;gap:10px;font-size:var(--fs-body);color:var(--text-dim);flex-wrap:wrap"><span>Power: <b style="color:var(--text-hi)">${sPow(s)}</b></span><span>Potential: <b style="color:var(--gold)">${s.scouted === false ? '???' : s.potential}</b></span><span>Wins: <b style="color:var(--green)">${s.wins}</b></span><span>Streak: <b style="color:${(s.streak||0)>=3?'var(--gold)':'var(--text-dim)'}">${s.streak||0}</b></span><span>Grade: <b style="color:${dosGrade.color}">${dosGrade.label}</b></span><span>Market Value: <b style="color:var(--orange)">${fmt(marketVal)}</b></span></div>${s.status === 'available' && !jkB && G.beasts.some(b => b.sealed && !b.jk) ? `<div style="margin-top:10px"><div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:6px">Assign as Vessel:</div>${G.beasts.filter(b => b.sealed && !b.jk).map(b => `<button class="gb gb-g" onclick="mkJK('${s.id}','${b.n}')" style="margin-right:5px">Seal ${b.n} ►</button>`).join('')}</div>` : ''}`
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

// R25: set an injured shinobi's rehab plan (rush / standard / careful).
export function setRehabPlan(sId, plan) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s || s.status !== 'injured') return
  if (plan === 'careful' && !(G.staff || []).some(st => st.role === 'medical')) { ntf('Careful rehab needs a medical ninja on staff.'); return }
  s.rehabPlan = plan
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
