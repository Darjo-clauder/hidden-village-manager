import { G } from '../state.js'
import { MONTHS } from '../constants.js'

const TYPE_COLOR = { legend: '#c9a84c', shinobi: '#87ceeb', squad: '#cc7fb8', event: '#7a7060' }
const TYPE_ICON  = { legend: '✦', shinobi: '⚔', squad: '⬡', event: '◆' }

export function rCh() {
  const el = document.getElementById('chl')
  if (!el) return
  if (!G.chronicles?.length) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No entries yet. Major events are recorded here automatically.</div>'; return }
  el.innerHTML = [...G.chronicles].reverse().map(e => {
    const monthName = MONTHS[e.month - 1]?.n || 'M' + e.month
    const col = TYPE_COLOR[e.type] || '#7a7060'
    const icon = TYPE_ICON[e.type] || '◆'
    return `<div style="padding:8px 0;border-bottom:1px solid #2e2a22">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
        <span style="font-size:9px;color:${col}">${icon}</span>
        <span style="font-size:9px;color:#e8e0cc;font-weight:bold">${e.title}</span>
        <span style="font-size:8px;color:#3a3630;margin-left:auto">Y${e.year} · ${monthName}</span>
      </div>
      <div style="font-size:8px;color:#7a7060;padding-left:15px;line-height:1.6">${e.body}</div>
    </div>`
  }).join('')
}
