import { G } from '../state.js'
import { MONTHS } from '../constants.js'

export function rMem() {
  const el = document.getElementById('meml')
  if (!el) return
  if (!G.memorial?.length) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No fallen shinobi recorded. May it stay this way.</div>'; return }
  el.innerHTML = `<div style="font-size:9px;color:#7a7060;margin-bottom:12px;letter-spacing:2px;text-transform:uppercase">In memory of those who served</div>` +
    [...G.memorial].reverse().map(m => {
      const monthName = MONTHS[m.month - 1]?.n || 'M' + m.month
      return `<div style="padding:10px 0;border-bottom:1px solid #2e2a22">
        <div style="font-size:11px;color:#e8e0cc;font-weight:bold">${m.name}</div>
        <div style="font-size:8px;color:#7a7060;margin-top:2px">${m.rank}${m.clan ? ' · ' + m.clan + ' Clan' : ''} · Fell Y${m.year} ${monthName}</div>
        <div style="font-size:8px;color:#7a7060;margin-top:2px">Mission: "${m.mission}" · Wins: ${m.wins || 0}</div>
        ${m.lastWords ? `<div style="font-size:8px;color:#f66;margin-top:4px;font-style:italic">${m.lastWords}</div>` : ''}
      </div>`
    }).join('')
}
