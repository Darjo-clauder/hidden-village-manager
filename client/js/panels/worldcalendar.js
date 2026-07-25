import { G, fmt, clamp } from '../state.js'
import { ntf, aL, upUI } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { WORLD_EVENTS, WE_BY_ID, getEventForMonth, getUpcomingEvent } from '../../../shared/constants/worldCalendar.js'

export function rWorldCalendar() {
  const el = document.getElementById('p-calendar-inner')
  if (!el) return

  const active = G.worldCalendar?.activeEvent
  const upcoming = G.worldCalendar?.pendingEvent
  const history = (G.worldCalendar?.history || []).slice(-6).reverse()
  const activeEv = active ? WE_BY_ID[active.eventId] : null

  el.innerHTML = `
    ${activeEv ? `
      <div style="background:#1a0a00;border:1px solid #5a3000;padding:12px;margin-bottom:14px">
        <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:6px">⚡ Active World Event</div>
        <div style="font-size:var(--fs-lead);color:var(--text-hi);margin-bottom:4px">${activeEv.icon} ${activeEv.name}</div>
        <div style="font-size:var(--fs-small);color:var(--gold-2);margin-bottom:10px">${activeEv.desc}</div>
        <div style="font-size:var(--fs-micro);letter-spacing:1px;color:var(--text-faint);text-transform:uppercase;margin-bottom:6px">${tr("worldcalendar.chooseResponse")}</div>
        <div style="display:grid;gap:6px">
          ${activeEv.choices.map(c => `
            <div onclick="resolveWorldEventChoice('${c.id}')" style="cursor:pointer;background:var(--bg);border:1px solid #3a2000;padding:8px;display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:var(--fs-body);color:var(--text-hi)">${c.label}</div>
                <div style="font-size:var(--fs-micro);color:var(--gold-2);margin-top:2px">${c.desc}</div>
              </div>
              <div style="text-align:right;font-size:var(--fs-small)">
                ${c.ryo !== 0 ? `<div style="color:${c.ryo>0?'var(--green)':'var(--red)'}">${c.ryo>0?'+':''}${c.ryo.toLocaleString()} ryo</div>` : ''}
                ${c.rep !== 0 ? `<div style="color:${c.rep>0?'var(--green)':'var(--red)'}">${c.rep>0?'+':''}${c.rep} rep</div>` : ''}
                ${c.morale !== 0 ? `<div style="color:${c.morale>0?'var(--green)':'var(--red)'}">${c.morale>0?'+':''}${c.morale} morale</div>` : ''}
                ${c.risk > 0 ? `<div style="color:var(--red);font-size:var(--fs-micro)">${(c.risk*100).toFixed(0)}% risk</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>` : ''}

    ${!activeEv && upcoming ? `
      <div style="background:#0a0a00;border:1px solid #3a3000;padding:10px;margin-bottom:14px">
        <div style="font-size:var(--fs-micro);letter-spacing:2px;color:#7a7030;text-transform:uppercase;margin-bottom:4px">${tr("worldcalendar.nextMonth")}</div>
        <div style="font-size:var(--fs-body);color:var(--text-hi)">${WE_BY_ID[upcoming.eventId]?.icon} ${WE_BY_ID[upcoming.eventId]?.name || upcoming.eventId}</div>
        <div style="font-size:var(--fs-micro);color:var(--text-dim);margin-top:3px">${WE_BY_ID[upcoming.eventId]?.desc || ''}</div>
      </div>` : ''}

    <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px">${tr("worldcalendar.annualCalendar")}</div>
    <div style="display:grid;gap:4px;margin-bottom:14px">
      ${WORLD_EVENTS.map(ev => {
        const fired = G.worldCalendar?.[`fired_${G.year}_${ev.id}`]
        const isCurrent = ev.month === G.month
        const color = isCurrent ? 'var(--gold)' : fired ? '#3a4a3a' : 'var(--border-dim)'
        return `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid ${color};background:${isCurrent?'#1a1200':'transparent'}">
            <span style="font-size:var(--fs-small);color:var(--text-dim);min-width:28px">M${ev.month}</span>
            <span style="font-size:var(--fs-body)">${ev.icon}</span>
            <span style="font-size:var(--fs-small);color:${fired?'#5a6a5a':'var(--text-hi)'}">${ev.name}</span>
            ${fired ? '<span style="font-size:var(--fs-micro);color:#4a6a4a;margin-left:auto">✓ Resolved</span>' : isCurrent ? '<span style="font-size:var(--fs-micro);color:var(--gold);margin-left:auto">⚡ Now</span>' : ''}
          </div>`
      }).join('')}
    </div>

    ${history.length ? `
      <div style="font-size:var(--fs-micro);letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">${tr("worldcalendar.recentHistory")}</div>
      <div style="display:grid;gap:4px">
        ${history.map(h => {
          const ev = WE_BY_ID[h.eventId]
          const choice = ev?.choices.find(c => c.id === h.choiceId)
          return `
            <div style="background:var(--bg);border:1px solid var(--border-dim);padding:6px 8px;display:flex;justify-content:space-between">
              <div>
                <span style="font-size:var(--fs-small);color:var(--text-hi)">${ev?.icon || ''} ${ev?.name || h.eventId}</span>
                <span style="font-size:var(--fs-micro);color:var(--text-dim);margin-left:6px">Y${h.resolvedYear}</span>
                <div style="font-size:var(--fs-micro);color:var(--text-faint);margin-top:1px">→ ${choice?.label || h.choiceId}</div>
              </div>
              <div style="text-align:right;font-size:var(--fs-micro);color:${h.outcome?.success?'var(--green)':'var(--red)'}">${h.outcome?.success?'Success':'Setback'}</div>
            </div>`
        }).join('')}
      </div>` : ''}
  `
}
