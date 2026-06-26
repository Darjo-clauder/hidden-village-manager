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
    <div style="background:#0d0a04;border:1px solid #3a2a0a;padding:10px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Active Operations (${activeOps.length})</div>
      <div style="display:grid;gap:6px">
        ${activeOps.map(am => {
          const op = DC_OP_BY_ID[am.opId]
          const s  = G.shinobi.find(x => x.id === am.assignedTo)
          const sh = active.find(x => x.id === am.safehouseId)
          const total = op?.daysActive || 1
          const elapsed = total - (am.daysLeft || 0)
          const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
          const risk = op?.rk === 'S' ? 'High' : op?.rk === 'A' ? 'Elevated' : 'Low'
          const riskCol = op?.rk === 'S' ? '#f66' : op?.rk === 'A' ? '#fa0' : '#8fbc8f'
          return `<div style="background:#0a0a0a;border:1px solid #222;padding:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div>
                <span style="font-size:9px;color:#e8e0cc">${op?.n || am.opId}</span>
                <span style="font-size:7px;color:#7a7060;margin-left:6px">${s ? sn(s) : '?'} · ${SH_LOCATION_BY_ID[sh?.locationId]?.name || 'field'}</span>
              </div>
              <div style="text-align:right">
                <span style="font-size:8px;color:#c9a84c">${am.daysLeft}mo left</span>
                <span style="font-size:7px;color:${riskCol};margin-left:6px">${risk} exposure</span>
              </div>
            </div>
            <div style="background:#111;height:4px;border-radius:2px;overflow:hidden"><div style="background:#c9a84c;height:4px;width:${pct}%"></div></div>
            <div style="text-align:right;margin-top:4px"><button class="gb gb-r" style="font-size:7px;padding:2px 7px" onclick="abortDeepCover('${am.id}')">${t("safehouses.abort")}</button></div>
          </div>`
        }).join('')}
      </div>
    </div>`

  el.innerHTML = `
    <div style="background:#0a0a0a;border:1px solid #222;padding:10px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:6px">${t("safehouses.networkStatus")}</div>
      <div style="display:flex;gap:12px;font-size:8px">
        <span style="color:#e8e0cc">Safehouses: ${active.length} / ${MAX_SAFEHOUSES}</span>
        <span style="color:#c9a84c">Active ops: ${activeOps.length}</span>
        ${shP.prospectBonus ? `<span style="color:#8fbc8f">+${(shP.prospectBonus*100).toFixed(0)}% prospect leads</span>` : ''}
        ${shP.opSuccessBonus ? `<span style="color:#8fbc8f">+${(shP.opSuccessBonus*100).toFixed(0)}% op success</span>` : ''}
      </div>
    </div>
    ${activeOpsHtml}

    <div style="font-size:8px;color:#7a7060;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Establish Safehouse (${SAFEHOUSE_COST.toLocaleString()} ryo)</div>
    <div style="display:grid;gap:6px;margin-bottom:16px">
    ${SAFEHOUSE_LOCATIONS.map(loc => {
      const existing = active.find(s => s.locationId === loc.id)
      const canBuy = !existing && active.length < MAX_SAFEHOUSES && (G.ryo || 0) >= SAFEHOUSE_COST
      return `
        <div style="background:#0d0d0d;border:1px solid ${existing ? '#2a3a2a' : '#222'};padding:8px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-size:10px">${loc.icon}</span>
            <span style="font-size:9px;color:#e8e0cc;margin-left:6px">${loc.name}</span>
            <div style="font-size:7px;color:#7a7060;margin-top:2px">${loc.desc}</div>
            <div style="font-size:7px;color:#5a8060;margin-top:1px">+${(loc.prospectBonus*100).toFixed(0)}% prospects · +${(loc.opSuccessBonus*100).toFixed(0)}% op success</div>
          </div>
          ${existing
            ? '<span style="font-size:8px;color:#8fbc8f">✓ Active</span>'
            : `<button onclick="window.establishSafehouse('${loc.id}')" style="font-size:8px;padding:4px 10px;background:${canBuy?'#1a2a1a':'#111'};color:${canBuy?'#8fbc8f':'#555'};border:1px solid ${canBuy?'#2a4a2a':'#222'};cursor:${canBuy?'pointer':'default'}">${canBuy ? 'Establish' : active.length >= MAX_SAFEHOUSES ? 'Network Full' : 'Need ryo'}</button>`
          }
        </div>`
    }).join('')}
    </div>

    <div style="font-size:8px;color:#7a7060;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">${t("safehouses.deepCover")}</div>
    ${active.length === 0
      ? `<div style="font-size:8px;color:#3a3630">${t("safehouses.establishFirst")}</div>`
      : `<div style="display:grid;gap:8px">
        ${DEEP_COVER_OPS.map(op => {
          const eligible = available.filter(s => (s.ri || 0) >= op.reqRi)
          const RKC2 = { S:'#ff6b6b', A:'#c9a84c', B:'#8fbc8f', C:'#aaa' }
          return `
            <div style="background:#0d0d0d;border:1px solid #222;padding:8px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <div>
                  <span style="font-size:9px;color:#e8e0cc">${op.n}</span>
                  <span style="font-size:8px;color:${RKC2[op.rk]||'#aaa'};margin-left:6px">[${op.rk}]</span>
                  <span style="font-size:7px;color:#7a7060;margin-left:6px">${op.daysActive} month(s)</span>
                </div>
                <div style="text-align:right;font-size:8px;color:#8fbc8f">+${op.ryo.toLocaleString()} ryo</div>
              </div>
              <div style="font-size:7px;color:#7a5030;margin-bottom:6px">${op.desc}</div>
              ${eligible.length === 0
                ? `<div style="font-size:7px;color:#555">${t("safehouses.noEligible")}</div>`
                : `<div style="display:flex;gap:6px;align-items:center">
                    <select id="dc-sh-${op.id}" style="font-size:8px;padding:3px;background:#111;color:#e8e0cc;border:1px solid #333">
                      ${active.map(sh => `<option value="${sh.id}">${SH_LOCATION_BY_ID[sh.locationId]?.name || sh.id}</option>`).join('')}
                    </select>
                    <select id="dc-s-${op.id}" style="font-size:8px;padding:3px;background:#111;color:#e8e0cc;border:1px solid #333">
                      <option value="">— shinobi —</option>
                      ${eligible.map(s => `<option value="${s.id}">${sn(s)}</option>`).join('')}
                    </select>
                    <button onclick="launchDeepCover('${op.id}')" style="font-size:8px;padding:3px 8px;background:#1a2a1a;color:#8fbc8f;border:1px solid #2a4a2a;cursor:pointer">${t("safehouses.deploy")}</button>
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
  aL(`${s ? sn(s) : 'Agent'} recalled from deep cover — operation aborted, no payout.`, 'warn')
  ntf('Operation aborted.')
  upUI()
  rSafehouses()
}

export function launchDeepCover(opId) {
  const shSel = document.getElementById('dc-sh-' + opId)
  const sSel = document.getElementById('dc-s-' + opId)
  if (!sSel?.value) { ntf('Select a shinobi.'); return }
  if (!shSel?.value) { ntf('Select a safehouse.'); return }
  window.assignDeepCoverOp(opId, sSel.value, shSel.value)
}
