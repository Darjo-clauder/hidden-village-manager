import { G } from '../state.js'

export function rLo() {
  const el = document.getElementById('logl')
  if (!G.log.length) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No events.</div>'; return }
  el.innerHTML = [...G.log].reverse().map(e =>
    `<div style="padding:6px 0;border-bottom:1px solid #2e2a22;font-size:9px;line-height:1.6;color:${e.t === 'good' ? '#8fbc8f' : e.t === 'bad' ? '#f66' : e.t === 'warn' ? '#fa0' : e.t === 'ev' ? '#87ceeb' : '#7a7060'}"><span style="color:#c9a84c;font-weight:bold;margin-right:6px">Y${e.y}M${e.m}</span>${e.msg}</div>`
  ).join('')
}
