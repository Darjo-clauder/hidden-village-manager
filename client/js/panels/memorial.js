import { G, clamp } from '../state.js'
import { t } from '../../../shared/utils/i18n.js'
import { MONTHS } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'

export function rMem() {
  const el = document.getElementById('meml')
  if (!el) return
  if (!G.memorial?.length) { el.innerHTML = `<div style="color:var(--text-dim);font-size:var(--fs-body);padding:16px 0">${t("memorial.none")}</div>`; return }

  const honored = (G.honoredFallen || []).length
  const kia     = G.memorial.filter(m => !m.transfer).length
  const totalWins = G.memorial.reduce((a, m) => a + (m.wins || 0), 0)

  const summary = `<div class="surf" style="display:flex;gap:18px;margin-bottom:14px;padding:10px 12px;background:var(--surface);border:1px solid var(--border)">
    <div><div style="font-size:var(--fs-micro);color:var(--text-faint);text-transform:uppercase;letter-spacing:1px">${t("memorial.fallen")}</div><div style="font-size:15px;color:var(--red);font-family:'Courier New',monospace">${kia}</div></div>
    <div><div style="font-size:var(--fs-micro);color:var(--text-faint);text-transform:uppercase;letter-spacing:1px">${t("memorial.honored")}</div><div style="font-size:15px;color:var(--gold);font-family:'Courier New',monospace">${honored}</div></div>
    <div><div style="font-size:var(--fs-micro);color:var(--text-faint);text-transform:uppercase;letter-spacing:1px">${t("memorial.missionsServed")}</div><div style="font-size:15px;color:var(--green);font-family:'Courier New',monospace">${totalWins}</div></div>
    <div style="margin-left:auto;align-self:center;font-size:var(--fs-micro);color:var(--text-dim);max-width:180px;text-align:right">Honoring a fallen shinobi grants +legend and lifts village morale — their sacrifice is remembered.</div>
  </div>`

  el.innerHTML = summary +
    `<div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:12px;letter-spacing:2px;text-transform:uppercase">${t("memorial.inMemory")}</div>` +
    [...G.memorial].reverse().map((m, idx) => {
      const monthName = MONTHS[m.month - 1]?.n || 'M' + m.month
      const key = (m.name || '') + '_' + m.year + '_' + m.month
      const isHonored = (G.honoredFallen || []).includes(key)
      return `<div style="padding:10px 12px;border-bottom:1px solid var(--border);${isHonored ? 'border-left:2px solid var(--gold);background:rgba(201,168,76,.04)' : ''}">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1">
            <div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold">${m.name}${isHonored ? ' <span style="font-size:var(--fs-small);color:var(--gold)">✦ Honored</span>' : ''}</div>
            <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">${m.rank}${m.clan ? ' · ' + m.clan + ' Clan' : ''} · Fell Y${m.year} ${monthName}</div>
            ${m.transfer ? '' : `<div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:2px">Mission: "${m.mission || '—'}" · Wins: ${m.wins || 0}</div>`}
            ${m.lastWords ? `<div style="font-size:var(--fs-small);color:var(--red);margin-top:4px;font-style:italic">${m.lastWords}</div>` : ''}
            ${_carriedBy(m.name)}
          </div>
          ${!m.transfer && !isHonored
            ? `<button class="gb" style="font-size:var(--fs-micro);padding:3px 8px;flex-shrink:0" onclick="honorFallen('${key.replace(/'/g, '')}')">Honor ✦</button>`
            : ''}
        </div>
      </div>`
    }).join('')
}

/**
 * Who on the current roster still carries this name, and whether the village
 * that took them has answered for it yet.
 *
 * The memorial used to be a closed book — a list of the dead with no line back
 * into the living game. This is that line: the wall now tells you that four
 * shinobi still on your books walked off the mission that killed this person,
 * that they hold a specific village responsible, and whether the debt is paid.
 */
function _carriedBy(name) {
  if (!name) return ''
  const carriers = (G.shinobi || []).filter(s => (s.vendettas || []).some(v => v.lost.includes(name)))
  if (!carriers.length) return ''
  const village = carriers[0].vendettas.find(v => v.lost.includes(name)).village
  const ledger = G.vendettas?.[village]
  const entry = (ledger?.deaths || []).find(d => d.name === name)
  const status = entry?.settled
    ? `<span style="color:var(--green)">answered</span>`
    : `<span style="color:var(--red)">unanswered</span>`
  const who = carriers.map(s => s.fn + ' ' + s.ln).slice(0, 3).join(', ')
  const more = carriers.length > 3 ? ` +${carriers.length - 3} more` : ''
  return `<div style="font-size:var(--fs-micro);color:var(--text-dim);margin-top:4px;padding-left:7px;border-left:2px solid var(--red)">
    ⚑ Still carried by ${who}${more} — against <span style="color:var(--text-mid)">${village}</span>, ${status}.</div>`
}

export function honorFallen(key) {
  G.honoredFallen = G.honoredFallen || []
  if (G.honoredFallen.includes(key)) { ntf(t('toast.memorial.alreadyHonored')); return }
  G.honoredFallen.push(key)
  const name = key.split('_')[0]
  G.legend = (G.legend || 0) + 5
  G.morale = clamp((G.morale || 75) + 3, 0, 100)
  aL(t('toast.memorial.honored', { name }), 'good')
  ntf(t('toast.memorial.honoredShort', { name }))
  upUI()
}
