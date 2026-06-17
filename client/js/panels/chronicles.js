import { G } from '../state.js'
import { MONTHS } from '../constants.js'

const TYPE_META = {
  legend:    { color: 'var(--gold)',    icon: '✦', label: 'Legend',    bg: 'rgba(201,168,76,0.06)' },
  shinobi:   { color: 'var(--blue)',    icon: '⚔', label: 'Shinobi',   bg: 'rgba(74,136,192,0.06)' },
  squad:     { color: 'var(--purple)',  icon: '⬡', label: 'Squad',     bg: 'rgba(152,112,192,0.06)' },
  milestone: { color: 'var(--green)',   icon: '◉', label: 'Milestone', bg: 'rgba(90,170,104,0.06)' },
  war:       { color: 'var(--red)',     icon: '⚠', label: 'War',       bg: 'rgba(200,72,72,0.07)' },
  lore:      { color: 'var(--blue)',    icon: '📜', label: 'Lore',     bg: 'rgba(74,136,192,0.05)' },
  event:     { color: 'var(--text-dim)','icon': '◆', label: 'Event',   bg: 'transparent' },
}

let _filterType = 'all'
let _searchText = ''

export function rCh() {
  const el = document.getElementById('chl')
  if (!el) return

  if (!G.chronicles?.length) {
    el.innerHTML = '<div style="color:var(--text-dim);font-size:10px;padding:16px 0">No entries yet. Major events are recorded here automatically.</div>'
    return
  }

  const types = ['all', ...new Set(G.chronicles.map(e => e.type || 'event'))]
  const filtered = [...G.chronicles]
    .reverse()
    .filter(e => _filterType === 'all' || (e.type || 'event') === _filterType)
    .filter(e => !_searchText || e.title.toLowerCase().includes(_searchText) || e.body.toLowerCase().includes(_searchText))

  el.innerHTML = `
    <!-- Filter bar -->
    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      ${types.map(t => {
        const meta = TYPE_META[t] || TYPE_META.event
        return `<button class="tab${_filterType === t ? ' active' : ''}" style="font-size:7px;padding:4px 9px" onclick="chrFilter('${t}')">
          ${t === 'all' ? 'All' : (meta.icon + ' ' + meta.label)}
        </button>`
      }).join('')}
      <input type="text" placeholder="Search…" value="${_searchText}"
        oninput="chrSearch(this.value)"
        style="margin-left:auto;background:var(--surface-2);border:1px solid var(--border);color:var(--text);font-size:8px;padding:4px 8px;width:130px;outline:none">
    </div>

    <!-- Entries -->
    ${filtered.length === 0 ? '<div style="color:var(--text-dim);font-size:9px">No entries match this filter.</div>' : ''}
    ${filtered.map(e => {
      const meta = TYPE_META[e.type || 'event'] || TYPE_META.event
      const monthName = MONTHS[(e.month ?? 1) - 1]?.n || 'M' + e.month
      const isWar  = e.type === 'war'
      const isLore = e.type === 'lore'
      return `
        <div style="padding:11px 12px;margin-bottom:6px;background:${meta.bg};border:1px solid var(--border-dim);border-left:3px solid ${meta.color}">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
            <span style="font-size:10px;color:${meta.color}">${meta.icon}</span>
            <span style="font-size:10px;color:var(--text-hi);font-weight:bold">${e.title}</span>
            <span style="font-size:7px;color:var(--text-dim);margin-left:auto;white-space:nowrap">Y${e.year} · ${monthName}</span>
          </div>
          <div style="font-size:8px;color:var(--text);line-height:1.7;padding-left:17px${isLore ? ';font-style:italic' : ''}">
            ${isLore ? `"${e.body}"` : e.body}
          </div>
          ${e.narrative ? `
            <div style="margin-top:8px;padding:8px 12px;background:var(--surface);border-left:2px solid var(--border);font-size:8px;color:var(--text-dim);line-height:1.7;font-style:italic">
              ${e.narrative}
            </div>
          ` : ''}
        </div>
      `
    }).join('')}
  `
}

export function chrFilter(type) { _filterType = type; rCh() }
export function chrSearch(text) { _searchText = text.toLowerCase(); rCh() }
