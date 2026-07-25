import { G, sn, fmt, clamp } from '../state.js'
import { ntf, aL, upUI } from '../ui.js'
import { t } from '../../../shared/utils/i18n.js'
import {
  SAFEHOUSE_LOCATIONS, SH_LOCATION_BY_ID,
  DEEP_COVER_OPS, DC_OP_BY_ID,
  MAX_SAFEHOUSES, SAFEHOUSE_COST, getSafehousePassives,
} from '../../../shared/constants/safehouses.js'

export function rSafehouses() {
  const el = document.getElementById('sh-main')
  if (!el) return

  const shP = getSafehousePassives(G)
  const active = (G.safehouses || []).filter(s => s.status === 'active')
  const available = G.shinobi.filter(s => s.status === 'available')

  // Active deep-cover operations currently running (tracked in G.aM)
  const activeOps = (G.aM || []).filter(a => a.isDeepCover)
  const activeOpsHtml = activeOps.length === 0 ? '' : `
    <div style="background:var(--sunken);border:1px solid #3a2a0a;padding:10px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px">Active Operations (${activeOps.length})</div>
      <div style="display:grid;gap:6px">
        ${activeOps.map(am => {
          const op = DC_OP_BY_ID[am.opId]
          const s  = G.shinobi.find(x => x.id === am.assignedTo)
          const sh = active.find(x => x.id === am.safehouseId)
          const total = op?.daysActive || 1
          const elapsed = total - (am.daysLeft || 0)
          const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
          const risk = op?.rk === 'S' ? 'High' : op?.rk === 'A' ? 'Elevated' : 'Low'
          const riskCol = op?.rk === 'S' ? 'var(--red)' : op?.rk === 'A' ? 'var(--orange)' : 'var(--green)'
          return `<div style="background:var(--bg);border:1px solid var(--border-dim);padding:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div>
                <span style="font-size:9px;color:var(--text-hi)">${op?.n || am.opId}</span>
                <span style="font-size:7px;color:var(--text-dim);margin-left:6px">${s ? sn(s) : '?'} · ${SH_LOCATION_BY_ID[sh?.locationId]?.name || 'field'}</span>
              </div>
              <div style="text-align:right">
                <span style="font-size:8px;color:var(--gold)">${am.daysLeft}mo left</span>
                <span style="font-size:7px;color:${riskCol};margin-left:6px">${risk} exposure</span>
              </div>
            </div>
            <div style="background:var(--sunken);height:4px;border-radius:2px;overflow:hidden"><div style="background:var(--gold);height:4px;width:${pct}%"></div></div>
            <div style="text-align:right;margin-top:4px"><button class="gb gb-r" style="font-size:7px;padding:2px 7px" onclick="abortDeepCover('${am.id}')">${t("safehouses.abort")}</button></div>
          </div>`
        }).join('')}
      </div>
    </div>`

  el.innerHTML = `
    <div style="background:var(--bg);border:1px solid var(--border-dim);padding:10px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px">${t("safehouses.networkStatus")}</div>
      <div style="display:flex;gap:12px;font-size:8px">
        <span style="color:var(--text-hi)">Safehouses: ${active.length} / ${MAX_SAFEHOUSES}</span>
        <span style="color:var(--gold)">Active ops: ${activeOps.length}</span>
        ${shP.prospectBonus ? `<span style="color:var(--green)">+${(shP.prospectBonus*100).toFixed(0)}% prospect leads</span>` : ''}
        ${shP.opSuccessBonus ? `<span style="color:var(--green)">+${(shP.opSuccessBonus*100).toFixed(0)}% op success</span>` : ''}
      </div>
    </div>
    ${activeOpsHtml}

    <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Establish Safehouse (${SAFEHOUSE_COST.toLocaleString()} ryo)</div>
    <div style="display:grid;gap:6px;margin-bottom:16px">
    ${SAFEHOUSE_LOCATIONS.map(loc => {
      const existing = active.find(s => s.locationId === loc.id)
      const canBuy = !existing && active.length < MAX_SAFEHOUSES && (G.ryo || 0) >= SAFEHOUSE_COST
      return `
        <div style="background:var(--bg);border:1px solid ${existing ? 'var(--green-bg)' : 'var(--border-dim)'};padding:8px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-size:10px">${loc.icon}</span>
            <span style="font-size:9px;color:var(--text-hi);margin-left:6px">${loc.name}</span>
            <div style="font-size:7px;color:var(--text-dim);margin-top:2px">${loc.desc}</div>
            <div style="font-size:7px;color:#5a8060;margin-top:1px">+${(loc.prospectBonus*100).toFixed(0)}% prospects · +${(loc.opSuccessBonus*100).toFixed(0)}% op success</div>
          </div>
          ${existing
            ? '<span style="font-size:8px;color:var(--green)">✓ Active</span>'
            : `<button onclick="window.establishSafehouse('${loc.id}')" style="font-size:8px;padding:4px 10px;background:${canBuy?'var(--green-bg)':'var(--sunken)'};color:${canBuy?'var(--green)':'var(--text-faint)'};border:1px solid ${canBuy?'var(--green-bg)':'var(--border-dim)'};cursor:${canBuy?'pointer':'default'}">${canBuy ? 'Establish' : active.length >= MAX_SAFEHOUSES ? 'Network Full' : 'Need ryo'}</button>`
          }
        </div>`
    }).join('')}
    </div>

    <div style="font-size:8px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">${t("safehouses.deepCover")}</div>
    ${active.length === 0
      ? `<div style="font-size:8px;color:var(--border-hi)">${t("safehouses.establishFirst")}</div>`
      : `<div style="display:grid;gap:8px">
        ${DEEP_COVER_OPS.map(op => {
          const eligible = available.filter(s => (s.ri || 0) >= op.reqRi)
          const RKC2 = { S:'#ff6b6b', A:'var(--gold)', B:'var(--green)', C:'var(--text-mid)' }
          return `
            <div style="background:var(--bg);border:1px solid var(--border-dim);padding:8px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <div>
                  <span style="font-size:9px;color:var(--text-hi)">${op.n}</span>
                  <span style="font-size:8px;color:${RKC2[op.rk]||'var(--text-mid)'};margin-left:6px">[${op.rk}]</span>
                  <span style="font-size:7px;color:var(--text-dim);margin-left:6px">${op.daysActive} month(s)</span>
                </div>
                <div style="text-align:right;font-size:8px;color:var(--green)">+${op.ryo.toLocaleString()} ryo</div>
              </div>
              <div style="font-size:7px;color:var(--gold-2);margin-bottom:6px">${op.desc}</div>
              ${eligible.length === 0
                ? `<div style="font-size:7px;color:var(--text-faint)">${t("safehouses.noEligible")}</div>`
                : `<div style="display:flex;gap:6px;align-items:center">
                    <select id="dc-sh-${op.id}" style="font-size:8px;padding:3px;background:var(--sunken);color:var(--text-hi);border:1px solid var(--border)">
                      ${active.map(sh => `<option value="${sh.id}">${SH_LOCATION_BY_ID[sh.locationId]?.name || sh.id}</option>`).join('')}
                    </select>
                    <select id="dc-s-${op.id}" style="font-size:8px;padding:3px;background:var(--sunken);color:var(--text-hi);border:1px solid var(--border)">
                      <option value="">— shinobi —</option>
                      ${eligible.map(s => `<option value="${s.id}">${sn(s)}</option>`).join('')}
                    </select>
                    <button onclick="launchDeepCover('${op.id}')" style="font-size:8px;padding:3px 8px;background:var(--green-bg);color:var(--green);border:1px solid var(--green-bg);cursor:pointer">${t("safehouses.deploy")}</button>
                  </div>`}
            </div>`
        }).join('')}
        </div>`
    }`
}

export function abortDeepCover(amId) {
  const am = (G.aM || []).find(x => x.id === amId && x.isDeepCover)
  if (!am) return
  const s = G.shinobi.find(x => x.id === am.assignedTo)
  if (s) { s.status = 'available'; s.missId = null }
  G.aM = G.aM.filter(x => x.id !== amId)
  aL(t('toast.safehouses.recalled', { name: s ? sn(s) : 'Agent' }), 'warn')
  ntf(t('toast.safehouses.aborted'))
  upUI()
  rSafehouses()
}

export function launchDeepCover(opId) {
  const shSel = document.getElementById('dc-sh-' + opId)
  const sSel = document.getElementById('dc-s-' + opId)
  if (!sSel?.value) { ntf(t('toast.safehouses.selectShinobi')); return }
  if (!shSel?.value) { ntf(t('toast.safehouses.selectSafehouse')); return }
  window.assignDeepCoverOp(opId, sSel.value, shSel.value)
}
