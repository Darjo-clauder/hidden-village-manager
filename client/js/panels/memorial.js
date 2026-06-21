import { G, clamp } from '../state.js'
import { MONTHS } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'

export function rMem() {
  const el = document.getElementById('meml')
  if (!el) return
  if (!G.memorial?.length) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No fallen shinobi recorded. May it stay this way.</div>'; return }

  const honored = (G.honoredFallen || []).length
  const kia     = G.memorial.filter(m => !m.transfer).length
  const totalWins = G.memorial.reduce((a, m) => a + (m.wins || 0), 0)

  const summary = `<div style="display:flex;gap:18px;margin-bottom:14px;padding:10px 12px;background:var(--surface,#1a1814);border:1px solid var(--border,#2e2a22)">
    <div><div style="font-size:7px;color:#555;text-transform:uppercase;letter-spacing:1px">Fallen</div><div style="font-size:15px;color:#f66;font-family:'Courier New',monospace">${kia}</div></div>
    <div><div style="font-size:7px;color:#555;text-transform:uppercase;letter-spacing:1px">Honored</div><div style="font-size:15px;color:#c9a84c;font-family:'Courier New',monospace">${honored}</div></div>
    <div><div style="font-size:7px;color:#555;text-transform:uppercase;letter-spacing:1px">Missions Served</div><div style="font-size:15px;color:#8fbc8f;font-family:'Courier New',monospace">${totalWins}</div></div>
    <div style="margin-left:auto;align-self:center;font-size:7px;color:#7a7060;max-width:180px;text-align:right">Honoring a fallen shinobi grants +legend and lifts village morale — their sacrifice is remembered.</div>
  </div>`

  el.innerHTML = summary +
    `<div style="font-size:9px;color:#7a7060;margin-bottom:12px;letter-spacing:2px;text-transform:uppercase">In memory of those who served</div>` +
    [...G.memorial].reverse().map((m, idx) => {
      const monthName = MONTHS[m.month - 1]?.n || 'M' + m.month
      const key = (m.name || '') + '_' + m.year + '_' + m.month
      const isHonored = (G.honoredFallen || []).includes(key)
      return `<div style="padding:10px 12px;border-bottom:1px solid #2e2a22;${isHonored ? 'border-left:2px solid #c9a84c;background:rgba(201,168,76,.04)' : ''}">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1">
            <div style="font-size:11px;color:#e8e0cc;font-weight:bold">${m.name}${isHonored ? ' <span style="font-size:8px;color:#c9a84c">✦ Honored</span>' : ''}</div>
            <div style="font-size:8px;color:#7a7060;margin-top:2px">${m.rank}${m.clan ? ' · ' + m.clan + ' Clan' : ''} · Fell Y${m.year} ${monthName}</div>
            ${m.transfer ? '' : `<div style="font-size:8px;color:#7a7060;margin-top:2px">Mission: "${m.mission || '—'}" · Wins: ${m.wins || 0}</div>`}
            ${m.lastWords ? `<div style="font-size:8px;color:#f66;margin-top:4px;font-style:italic">${m.lastWords}</div>` : ''}
          </div>
          ${!m.transfer && !isHonored
            ? `<button class="gb" style="font-size:7px;padding:3px 8px;flex-shrink:0" onclick="honorFallen('${key.replace(/'/g, '')}')">Honor ✦</button>`
            : ''}
        </div>
      </div>`
    }).join('')
}

export function honorFallen(key) {
  G.honoredFallen = G.honoredFallen || []
  if (G.honoredFallen.includes(key)) { ntf('Already honored.'); return }
  G.honoredFallen.push(key)
  const name = key.split('_')[0]
  G.legend = (G.legend || 0) + 5
  G.morale = clamp((G.morale || 75) + 3, 0, 100)
  aL(`${name} honored at the memorial. The village remembers. +5 legend, +3 morale.`, 'good')
  ntf(`${name} honored — +5 legend, +3 morale.`)
  upUI()
}
