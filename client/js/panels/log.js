import { G } from '../state.js'
import { t as tr } from '../../../shared/utils/i18n.js'

window._logFilter = window._logFilter || 'all'
window._logSearch = window._logSearch || ''

const _CAT = {
  all:  { label: 'All',        match: () => true },
  good: { label: 'Successes',  match: t => t === 'good' },
  bad:  { label: 'Setbacks',   match: t => t === 'bad' },
  warn: { label: 'Warnings',   match: t => t === 'warn' },
  ev:   { label: 'Events',     match: t => t === 'ev' },
}

const _COLOR = t => t === 'good' ? '#8fbc8f' : t === 'bad' ? '#f66' : t === 'warn' ? '#fa0' : t === 'ev' ? '#87ceeb' : '#7a7060'

export function rLo() {
  const el = document.getElementById('logl')
  if (!el) return
  if (!G.log.length) { el.innerHTML = `<div style="color:#7a7060;font-size:10px">${tr("log.none")}</div>`; return }

  const f = window._logFilter
  const q = (window._logSearch || '').toLowerCase()

  // Counts per category for the tab labels
  const counts = {}
  Object.keys(_CAT).forEach(k => { counts[k] = G.log.filter(e => _CAT[k].match(e.t)).length })

  const filtered = [...G.log].reverse()
    .filter(e => _CAT[f]?.match(e.t))
    .filter(e => !q || (e.msg || '').toLowerCase().includes(q))

  const tabs = Object.entries(_CAT).map(([k, def]) =>
    `<button class="tab${f === k ? ' active' : ''}" style="font-size:8px;padding:4px 9px" onclick="logFilter('${k}')">
      ${def.label} <span style="color:#555">${counts[k]}</span>
    </button>`
  ).join('')

  const rows = filtered.length === 0
    ? `<div style="color:#7a7060;font-size:9px;padding:14px 0">${tr("chronicles.noMatch")}</div>`
    : filtered.map(e =>
        `<div style="padding:6px 0;border-bottom:1px solid #2e2a22;font-size:9px;line-height:1.6;color:${_COLOR(e.t)}"><span style="color:#c9a84c;font-weight:bold;margin-right:6px">Y${e.y}M${e.m}</span>${e.msg}</div>`
      ).join('')

  el.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      ${tabs}
      <input type="text" placeholder="Search log…" value="${window._logSearch || ''}"
        oninput="logSearch(this.value)"
        style="margin-left:auto;background:var(--surface-2,#1a1814);border:1px solid var(--border,#2e2a22);color:#e8e0cc;font-size:8px;padding:4px 8px;width:140px;outline:none">
    </div>
    <div style="font-size:7px;color:#555;margin-bottom:6px">${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}</div>
    ${rows}`
}

export function logFilter(k) { window._logFilter = k; rLo() }
export function logSearch(v) { window._logSearch = v; rLo() }
