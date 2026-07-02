import { G } from '../state.js'
import { aL, ntf, upUI } from '../ui.js'
import { KAGE_ATTRS, KAGE_PATHS, KAGE_ATTR_CAP, ATTR_BY_ID, PATH_BY_ID, xpForLevel, newKageDev, spendKagePoint, applyKagePath } from '../../../shared/constants/kageDev.js'
import { t } from '../../../shared/utils/i18n.js'

export function rKageDev() {
  const el = document.getElementById('kdl')
  if (!el) return
  if (!G.kageDev) G.kageDev = newKageDev()
  const k = G.kageDev
  const xpNext = xpForLevel(k.level)
  const xpPct = Math.min(100, Math.round((k.xp / xpNext) * 100))
  const path = k.path ? PATH_BY_ID[k.path] : null

  // ── Header: level + XP + points ────────────────────────────────────────────
  const header = `<div style="background:var(--surface,#1a1814);border:1px solid var(--accent-border);border-top:2px solid var(--accent);padding:13px 15px;margin-bottom:14px">
    <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
      <span style="font-size:16px;color:var(--accent);font-weight:bold">${G.kName || 'Warden'}</span>
      <span style="font-size:9px;color:#7a7060">Level ${k.level}${path ? ` · ${path.icon} ${path.n}` : ''}</span>
      ${k.points > 0 ? `<span style="margin-left:auto;font-size:9px;color:#8fbc8f">● ${k.points} development point${k.points !== 1 ? 's' : ''} to spend</span>` : `<span style="margin-left:auto;font-size:8px;color:#555">${t('kagedev.noPoints')}</span>`}
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
      <span style="font-size:7px;color:#7a7060;text-transform:uppercase;letter-spacing:1px;width:24px">XP</span>
      <div style="flex:1;background:#0d0d0d;height:6px;border-radius:3px;overflow:hidden"><div style="height:6px;width:${xpPct}%;background:var(--accent);transition:width .3s"></div></div>
      <span style="font-size:8px;color:#7a7060;font-family:var(--font-num,'Courier New',monospace)">${k.xp} / ${xpNext}</span>
    </div>
    <div style="font-size:7px;color:#3a3630;margin-top:5px">Earn XP each month by completing missions, promoting at the Adept Exam, and surviving the Nation War.</div>
  </div>`

  // ── Path selection (one-time) ──────────────────────────────────────────────
  const pathHtml = `<div style="margin-bottom:16px">
    <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:8px">Warden Path ${path ? `<span style="color:var(--accent);margin-left:6px">${path.icon} ${path.n} — chosen</span>` : '<span style="color:var(--orange);margin-left:6px">choose your background (permanent)</span>'}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
      ${KAGE_PATHS.map(p => {
        const sel = k.path === p.id
        const locked = k.path && !sel
        return `<div style="border:1px solid ${sel ? 'var(--accent)' : 'var(--border)'};background:${sel ? 'var(--accent-bg)' : 'transparent'};padding:10px;opacity:${locked ? 0.4 : 1}">
          <div style="font-size:10px;color:${sel ? 'var(--accent)' : 'var(--text-hi)'};font-weight:bold;margin-bottom:3px">${p.icon} ${p.n}</div>
          <div style="font-size:8px;color:#7a7060;line-height:1.5;margin-bottom:7px">${p.desc}</div>
          ${sel ? '<div style="font-size:8px;color:var(--accent)">✓ Active</div>'
                : k.path ? '<div style="font-size:7px;color:#555">— not chosen</div>'
                : `<button class="gb gb-g" style="font-size:7px" onclick="chooseKagePath('${p.id}')">Choose ▸</button>`}
        </div>`
      }).join('')}
    </div>
  </div>`

  // ── Attributes ─────────────────────────────────────────────────────────────
  const attrsHtml = `<div>
    <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:8px">${t('kagedev.attributes')}</div>
    <div style="display:grid;gap:6px">
      ${KAGE_ATTRS.map(a => {
        const v = k.attrs[a.id] || 0
        const maxed = v >= KAGE_ATTR_CAP
        const pct = Math.round((v / KAGE_ATTR_CAP) * 100)
        const bonus = Math.round(v * a.per * 100)
        return `<div style="background:var(--surface,#1a1814);border:1px solid var(--border);padding:9px 11px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span style="font-size:13px">${a.icon}</span>
            <span style="font-size:10px;color:var(--text-hi);font-weight:bold">${a.n}</span>
            <span style="font-size:9px;color:var(--accent);font-family:var(--font-num,'Courier New',monospace);margin-left:4px">${v}/${KAGE_ATTR_CAP}</span>
            <span style="font-size:8px;color:#8fbc8f;margin-left:4px">+${bonus}%</span>
            <span style="margin-left:auto">${maxed
              ? '<span style="font-size:8px;color:#8fbc8f">MAX</span>'
              : `<button class="gb gb-g" style="font-size:8px;padding:2px 9px" onclick="spendKagePt('${a.id}')" ${k.points > 0 ? '' : 'disabled'}>+ Invest</button>`}</span>
          </div>
          <div style="background:#0d0d0d;height:5px;border-radius:2px;overflow:hidden;margin-bottom:4px"><div style="height:5px;width:${pct}%;background:var(--accent)"></div></div>
          <div style="font-size:7px;color:#7a7060">${a.desc}</div>
        </div>`
      }).join('')}
    </div>
  </div>`

  el.innerHTML = header + pathHtml + attrsHtml
}

export function spendKagePt(attrId) {
  if (spendKagePoint(G, attrId)) {
    const a = ATTR_BY_ID[attrId]
    ntf(t('toast.kagedev.attrRaised', { attr: a?.n || attrId, value: G.kageDev.attrs[attrId] }))
    upUI()
  } else {
    ntf(t('toast.kagedev.noPoints2'))
  }
}

export function chooseKagePath(pathId) {
  if (applyKagePath(G, pathId)) {
    const p = PATH_BY_ID[pathId]
    aL(t('toast.kagedev.pathChosen', { name: p.n, signature: p.desc.split('Signature:')[1]?.trim() || '' }), 'good')
    ntf(t('toast.kagedev.pathChosenShort', { name: p.n }))
    upUI()
  } else {
    ntf(t('toast.kagedev.pathExists'))
  }
}
