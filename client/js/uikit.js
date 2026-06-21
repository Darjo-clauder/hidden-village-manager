// ── UI kit (FM24 P1) ───────────────────────────────────────────────────────────
// Reusable primitives shared by all panels:
//   • Context-menu portal  — right-click any entity → verb menu
//   • Table kit            — persisted sort + column show/hide, header rendering
// Framework-free; integrates with the existing innerHTML + window-handler style.

// ── Context-menu portal ────────────────────────────────────────────────────────
let _ctxEl = null

export function openContextMenu(x, y, items) {
  closeContextMenu()
  const el = document.createElement('div')
  el.className = 'ctx-menu'
  items.forEach(it => {
    if (it.separator) { const d = document.createElement('div'); d.className = 'ctx-sep'; el.appendChild(d); return }
    const d = document.createElement('div')
    d.className = 'ctx-item' + (it.danger ? ' ctx-danger' : '') + (it.disabled ? ' ctx-disabled' : '')
    d.textContent = it.label
    if (!it.disabled) d.addEventListener('click', () => { closeContextMenu(); try { it.fn && it.fn() } catch (e) { console.warn('[ctx]', e) } })
    el.appendChild(d)
  })
  document.body.appendChild(el)
  // Keep the menu inside the viewport.
  const r = el.getBoundingClientRect()
  el.style.left = Math.min(x, window.innerWidth  - r.width  - 6) + 'px'
  el.style.top  = Math.min(y, window.innerHeight - r.height - 6) + 'px'
  _ctxEl = el
  setTimeout(() => document.addEventListener('mousedown', _onDocDown, true), 0)
}

function _onDocDown(e) { if (_ctxEl && !_ctxEl.contains(e.target)) closeContextMenu() }

export function closeContextMenu() {
  if (_ctxEl) { _ctxEl.remove(); _ctxEl = null; document.removeEventListener('mousedown', _onDocDown, true) }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeContextMenu() }, true)
  window.addEventListener('scroll', () => closeContextMenu(), true)
}

// ── Hover-preview portal ───────────────────────────────────────────────────────
let _hpEl = null
export function showHoverPreview(x, y, html) {
  hideHoverPreview()
  const el = document.createElement('div')
  el.className = 'hover-preview'
  el.innerHTML = html
  document.body.appendChild(el)
  const r = el.getBoundingClientRect()
  el.style.left = Math.min(x + 14, window.innerWidth  - r.width  - 8) + 'px'
  el.style.top  = Math.min(y + 14, window.innerHeight - r.height - 8) + 'px'
  _hpEl = el
}
export function hideHoverPreview() { if (_hpEl) { _hpEl.remove(); _hpEl = null } }
if (typeof window !== 'undefined') { window.hideHoverPreview = hideHoverPreview }

// ── Table kit (sort + column visibility, persisted per table id) ────────────────
function _load(id) { try { return JSON.parse(localStorage.getItem('tbl_' + id) || '{}') } catch { return {} } }
function _save(id, st) { try { localStorage.setItem('tbl_' + id, JSON.stringify(st)) } catch {} }

export function tblSort(id, dflt) { return _load(id).sort || dflt }

export function tblToggleSort(id, key, dflt) {
  const st = _load(id); const cur = st.sort || dflt
  st.sort = cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
  _save(id, st)
}

export function tblHidden(id) { return _load(id).hidden || [] }

export function tblToggleCol(id, key) {
  const st = _load(id); const h = new Set(st.hidden || [])
  h.has(key) ? h.delete(key) : h.add(key)
  st.hidden = [...h]; _save(id, st)
}

export function tblSortRows(rows, sort, columns) {
  if (!sort) return rows
  const col = columns.find(c => c.key === sort.key); if (!col) return rows
  const val = col.sortVal || (r => r[sort.key])
  const dir = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = val(a), vb = val(b)
    if (typeof va === 'string' || typeof vb === 'string') return String(va).localeCompare(String(vb)) * dir
    return ((va || 0) - (vb || 0)) * dir
  })
}

/** Render sortable <th> cells. onSortFn = name of a window fn taking (key). */
export function tblHeaderHtml(columns, sort, onSortFn) {
  return columns.map(c => {
    const active = sort && sort.key === c.key
    const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''
    return `<th onclick="${onSortFn}('${c.key}')" title="Sort by ${c.label}"
      style="padding:4px 6px;font-size:7px;color:${active ? 'var(--accent)' : '#555'};letter-spacing:1px;text-align:${c.align || 'left'};text-transform:uppercase;cursor:pointer;user-select:none;white-space:nowrap">${c.label}${arrow}</th>`
  }).join('')
}

/** Column-manager popover markup. onToggleFn = window fn taking (key). */
export function tblColumnManagerHtml(id, columns, onToggleFn) {
  const hidden = new Set(tblHidden(id))
  return `<div class="tbl-colmgr" id="colmgr-${id}">
    <div class="tbl-colmgr-h">Columns</div>
    ${columns.filter(c => c.hideable !== false).map(c =>
      `<label class="tbl-colmgr-row"><input type="checkbox" ${hidden.has(c.key) ? '' : 'checked'} onchange="${onToggleFn}('${c.key}')"> ${c.label}</label>`
    ).join('')}
  </div>`
}

export function tblToggleColumnManager(id) {
  const el = document.getElementById('colmgr-' + id)
  if (el) el.classList.toggle('open')
}

// ── Charts (P4) — dependency-free inline SVG ───────────────────────────────────
/** Line + area chart with a zero baseline. values: number[]. */
export function lineChartSvg(values, opts = {}) {
  const { width = 280, height = 72, color = 'var(--accent)', labels = [], format = v => v } = opts
  if (!values || values.length < 2) return `<div style="font-size:8px;color:#555;padding:8px 0">Not enough data yet.</div>`
  const pad = 4
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const range = (max - min) || 1
  const x = i => pad + (i / (values.length - 1)) * (width - pad * 2)
  const y = v => (height - pad) - ((v - min) / range) * (height - pad * 2)
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${pad},${(height - pad).toFixed(1)} ${pts} ${(width - pad).toFixed(1)},${(height - pad).toFixed(1)}`
  const zy = y(0).toFixed(1)
  const lastV = values[values.length - 1]
  const lastColor = lastV >= 0 ? 'var(--green,#8fbc8f)' : 'var(--red,#f0605a)'
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none" role="img" aria-label="Trend chart, latest ${format(lastV)}">
    <polygon points="${area}" fill="${color}" opacity="0.10"></polygon>
    <line x1="${pad}" y1="${zy}" x2="${width - pad}" y2="${zy}" stroke="#555" stroke-width="0.5" stroke-dasharray="2 2"></line>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"></polyline>
    <circle cx="${x(values.length - 1).toFixed(1)}" cy="${y(lastV).toFixed(1)}" r="2.5" fill="${lastColor}"></circle>
  </svg>${labels.length ? `<div style="display:flex;justify-content:space-between;font-size:7px;color:#555;margin-top:2px"><span>${labels[0]}</span><span>${labels[labels.length - 1]}</span></div>` : ''}`
}

/** Horizontal proportional bars. items: [{label, value, color}]. */
export function barRowsSvg(items, opts = {}) {
  const { format = v => v } = opts
  if (!items || !items.length) return ''
  const max = Math.max(1, ...items.map(i => Math.abs(i.value)))
  return `<div style="display:flex;flex-direction:column;gap:4px">${items.map(it => {
    const pct = Math.round((Math.abs(it.value) / max) * 100)
    return `<div style="display:flex;align-items:center;gap:6px;font-size:8px">
      <span style="width:84px;color:var(--text-dim,#7a7060);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.label}</span>
      <div style="flex:1;background:#0d0d0d;height:8px;border-radius:2px;overflow:hidden"><div style="height:8px;width:${pct}%;background:${it.color || 'var(--accent)'}"></div></div>
      <span style="width:62px;text-align:right;color:var(--text-hi,#e8e0cc);font-family:var(--font-num,'Courier New',monospace)">${format(it.value)}</span>
    </div>`
  }).join('')}</div>`
}
