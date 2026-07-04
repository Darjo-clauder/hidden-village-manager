import { G, WS, clamp, fmt, setDipCb, _dipCb } from './state.js'
import { aL, ntf, upUI, cm, setOnline } from './ui.js'
import { t } from '../../shared/utils/i18n.js'
import { shiftKageRel, kageToneDialogue, getKageTier, ensureKageRels } from './rivalKage.js'
import { MINOR_NATIONS, getMinorRel, minorRelTier } from '../../shared/constants/minorNations.js'
import { escapeHtml as esc } from '../../shared/utils/escapeHtml.js'
import { REGIONS } from './constants.js'

export function rWo() { rWorldCanvas(); rWorldList() }

export function rWorldCanvas() {
  const el = document.getElementById('wmap'), empty = document.getElementById('wmap-empty')
  if (!el) return
  const W = el.parentElement.clientWidth || 600, H = 300
  el.width = W; el.height = H
  const ctx = el.getContext('2d')
  const PAD = 48, IW = W - PAD * 2, IH = H - PAD * 2

  ctx.fillStyle = '#080706'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#111008'; ctx.lineWidth = 1
  for (let x = PAD; x <= W - PAD; x += 50) { ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, H - PAD); ctx.stroke() }
  for (let y = PAD; y <= H - PAD; y += 38) { ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke() }
  ctx.strokeStyle = '#2e2a22'; ctx.strokeRect(PAD, PAD, IW, IH)
  ctx.fillStyle = '#2a2620'; ctx.font = '8px Courier New'; ctx.textAlign = 'left'
  ctx.fillText('WORLD MAP', PAD + 4, PAD - 5)

  const vs = WS.villages
  if (!vs.length) { empty.style.display = ''; return }
  empty.style.display = 'none'

  const toC = pos => [PAD + (pos.x / 80) * IW, PAD + (pos.y / 40) * IH]

  vs.forEach(v => {
    if (!v.relations || !v.pos) return
    Object.entries(v.relations).forEach(([oid, rel]) => {
      if (v.id >= oid) return
      const ov = vs.find(x => x.id === oid); if (!ov?.pos) return
      const [x1, y1] = toC(v.pos), [x2, y2] = toC(ov.pos)
      if (rel.status === 'allied') { ctx.strokeStyle = 'rgba(201,168,76,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([]) }
      else if (rel.status === 'war') { ctx.strokeStyle = 'rgba(229,57,53,0.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]) }
      else return
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([])
    })
  })

  vs.forEach(v => {
    if (!v.pos) return
    const isMe = v.id === WS.myId
    const [cx, cy] = toC(v.pos)
    const rel = WS.myVillage?.relations?.[v.id]
    const col = isMe ? '#c9a84c' : rel?.status === 'allied' ? '#8fbc8f' : rel?.status === 'war' ? '#e53935' : '#5a5650'
    if (isMe) {
      const g = ctx.createRadialGradient(cx, cy, 3, cx, cy, 20)
      g.addColorStop(0, 'rgba(201,168,76,0.22)'); g.addColorStop(1, 'rgba(201,168,76,0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill()
    }
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, isMe ? 7 : 5, 0, Math.PI * 2); ctx.fill()
    ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.fillText(v.icon, cx, cy - 10)
    ctx.fillStyle = isMe ? '#e8e0cc' : '#6a6460'
    ctx.font = (isMe ? 'bold ' : '') + '8px "Courier New"'
    ctx.fillText(v.name.slice(0, 14), cx, cy + 17)
  })
}

export function rWorldList() {
  const el = document.getElementById('wvl')
  let html = ''

  // ── Current world era ───────────────────────────────────────────────────
  if (G.worldEra) {
    html += `<div style="background:linear-gradient(90deg,#141018,#0a0a0a);border:1px solid #3a2e4a;border-left:3px solid #9a7dc9;padding:9px 12px;margin-bottom:14px">
      <div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#9a7dc9">🌍 Current Era · since Y${G.worldEra.startYear}</div>
      <div style="font-size:11px;color:#e8e0cc;margin-top:2px">${G.worldEra.name}</div>
      <div style="font-size:8px;color:#7a7060;margin-top:2px;font-style:italic">${G.worldEra.blurb}</div>
    </div>`
  }

  // ── World reputation flavor ─────────────────────────────────────────────
  if (G.worldReputationFlavor) {
    html += `<div style="background:var(--surface-2,#1a1e2c);border-left:3px solid var(--gold,#c9a84c);padding:9px 12px;margin-bottom:14px;font-size:9px;color:var(--text-mid,#909bb8);line-height:1.6;font-style:italic">${G.worldReputationFlavor}</div>`
  }

  // ── Multiplayer village list ──────────────────────────────────────────────
  const others = WS.villages.filter(v => v.id !== WS.myId)

  if (WS.pendingAlliances.length) {
    html += '<div class="ally-pending"><div class="ally-pending-title">Pending Alliance Proposals</div>'
    WS.pendingAlliances.forEach(p => {
      html += `<div class="ally-pending-row"><span style="font-size:10px;color:#e8e0cc">${esc(p.fromIcon)} ${esc(p.fromName)}</span><div style="display:flex;gap:6px"><button class="gb gb-g" style="margin-top:0" onclick="respondAlliance('${p.fromId}',true)">Accept ►</button><button class="gb gb-r" style="margin-top:0" onclick="respondAlliance('${p.fromId}',false)">Decline</button></div></div>`
    })
    html += '</div>'
  }

  if (others.length) {
    html += others.map(v => {
      const rel = WS.myVillage?.relations?.[v.id] || { status: 'neutral', rel: 50 }
      const isA = rel.status === 'allied', isW = rel.status === 'war'
      const cls = isA ? 'wv-card wv-card-ally' : isW ? 'wv-card wv-card-war' : 'wv-card'
      const sc = isA ? '#8fbc8f' : isW ? '#f66' : '#fa0'
      const sl = isA ? 'Allied' : isW ? 'At War' : 'Neutral'
      const noG = G.ryo < 5000
      return `<div class="${cls}"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="font-size:22px">${esc(v.icon)}</div><div style="flex:1"><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${esc(v.name)}</div><div style="font-size:8px;color:#7a7060">Warden: ${esc(v.kageName)}</div></div><span style="font-size:8px;padding:2px 7px;border:1px solid ${sc};color:${sc}">${sl}</span></div><div style="display:flex;flex-wrap:wrap;margin-bottom:10px"><span class="wv-stat">Power <b>${esc(v.power)}</b></span><span class="wv-stat">Rep <b>${esc(v.reputation)}</b></span><span class="wv-stat">Shinobi <b>${esc(v.shinobiCount)}</b></span>${v.sealedBeasts?.length ? `<span class="wv-stat">Beasts <b style="color:#c9a84c">${v.sealedBeasts.map(esc).join(', ')}</b></span>` : ''}</div><div class="wv-actions"><button class="gb" onclick="sendGiftMP('${v.id}')" ${noG ? 'disabled' : ''}>Send Gifts (5k)</button>${!isA && !isW ? `<button class="gb gb-g" onclick="propAllianceMP('${v.id}')">Propose Alliance</button>` : ''}${!isA && !isW ? `<button class="gb gb-r" onclick="declareWarMP('${v.id}')">Declare War</button>` : ''}${isA ? `<button class="gb gb-r" onclick="breakAllianceMP('${v.id}')">Break Alliance</button>` : ''}${isW ? `<button class="gb gb-r" onclick="launchRaidMP('${v.id}')">⚔ Launch Raid</button>` : ''}</div></div>`
    }).join('')
  } else {
    html += '<div style="color:#7a7060;font-size:9px;padding:10px 0">No other villages online. Share this server\'s URL with friends to play together.</div>'
  }

  // ── NPC Rival Warden personal relationships ────────────────────────────────
  ensureKageRels(G)
  html += `<div style="margin-top:20px">
    <div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim,#58607a);margin-bottom:10px">Rival Warden Personal Relations</div>
    ${(G.villages || []).map(v => {
      const pr = v.kagePersonalRel ?? 50
      const tier = getKageTier(pr)
      const lastEvent = v.kageHistory?.slice(-1)[0]
      return `
        <div style="background:var(--surface,#131620);border:1px solid var(--border,#252b3a);padding:10px 12px;margin-bottom:7px;display:flex;align-items:center;gap:12px">
          <div style="font-size:20px">${v.ico || '🌐'}</div>
          <div style="flex:1">
            <div style="font-size:10px;color:var(--text-hi,#e8e0d0)">${v.kage || v.n} <span style="font-size:8px;color:var(--text-dim,#58607a)">(${v.kageRank || 'Warden'}, ${v.n})</span></div>
            <div style="font-size:8px;color:${tier.color};margin-top:2px">${tier.label}</div>
            ${lastEvent ? `<div style="font-size:7px;color:var(--text-dim);margin-top:2px;font-style:italic">Last: ${lastEvent.reason} (Y${lastEvent.year})</div>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:${tier.color};font-weight:bold">${pr}</div>
            <div style="font-size:7px;color:var(--text-dim)">/100</div>
          </div>
        </div>
      `
    }).join('')}
    <div style="font-size:8px;color:var(--text-dim);margin-top:6px;line-height:1.6">Personal relationships affect negotiation tone and success rates independently of village diplomatic standing. Drift toward neutral (50) each month. Shift via gifts (+6), war declaration (−25), and summit conduct.</div>
  </div>`

  // ── Minor nations — the wider world beyond the great villages ──────────────
  html += `<div style="margin-top:20px">
    <div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim,#58607a);margin-bottom:10px">Minor Nations</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:7px">
    ${MINOR_NATIONS.map(m => {
      const region = REGIONS.find(r => r.id === m.region)
      return `
        <div style="background:var(--surface,#131620);border:1px solid var(--border,#252b3a);padding:9px 11px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="font-size:16px">${m.ico}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:10px;color:var(--text-hi,#e8e0d0)">${m.n} <span style="font-size:7px;border:1px solid ${m.tier === 'C' ? '#c9a84c' : '#58607a'};color:${m.tier === 'C' ? '#c9a84c' : '#7a7060'};padding:0 4px;margin-left:3px">Tier ${m.tier}</span></div>
              <div style="font-size:7px;color:var(--text-dim,#58607a);margin-top:1px">${region?.icon || ''} ${region?.n || m.region} · exports <span style="color:#9a9080">${m.specialty}</span></div>
            </div>
          </div>
          <div style="font-size:7px;color:var(--text-dim,#58607a);margin-top:5px;line-height:1.5;font-style:italic">${m.blurb}</div>
          ${(() => {
            const rel = getMinorRel(G.minorRelations, m.n)
            const tier = minorRelTier(rel)
            return `<div style="display:flex;align-items:center;gap:6px;margin-top:6px">
              <span style="font-size:7px;color:var(--text-dim);width:36px">Standing</span>
              <div style="flex:1;height:4px;background:#111;border-radius:2px;overflow:hidden"><div style="width:${rel}%;height:100%;background:${tier.color}"></div></div>
              <span style="font-size:7px;color:${tier.color}">${tier.label}</span>
            </div>`
          })()}
        </div>`
    }).join('')}
    </div>
    <div style="font-size:8px;color:var(--text-dim);margin-top:6px;line-height:1.6">Minor nations feed the transfer market and scouting pipeline, and host off-season exhibition fixtures. They do not compete in the league.</div>
  </div>`

  el.innerHTML = html
}

// ── multiplayer actions ────────────────────────────────────────────────────
let _socket = null
export function setWorldSocket(s) { _socket = s }

export function declareWarMP(id) {
  const v = WS.villages.find(x => x.id === id); if (!v || !_socket) return
  _socket.emit('declare_war', { targetId: id })
  setRelLocal(id, 'war')
  // War declaration tanks personal Warden relationship
  const npcV = G.villages?.find(x => x.n === v.name)
  if (npcV) shiftKageRel(npcV, -25, 'War declared', G)
  aL(t('toast.world.warDeclared', { icon: v.icon, name: v.name }), 'warn'); ntf(t('toast.world.warDeclaredShort', { name: v.name })); rWo()
}

export function propAllianceMP(id) {
  const v = WS.villages.find(x => x.id === id); if (!v || !_socket) return
  _socket.emit('propose_alliance', { targetId: id }); ntf(t('toast.world.allianceProposed', { name: v.name }))
}

export function respondAlliance(fromId, accepted) {
  if (!_socket) return
  _socket.emit('respond_alliance', { fromId, accepted })
  WS.pendingAlliances = WS.pendingAlliances.filter(p => p.fromId !== fromId)
  if (accepted) setRelLocal(fromId, 'allied')
  rWo()
}

export function breakAllianceMP(id) {
  const v = WS.villages.find(x => x.id === id); if (!_socket) return
  _socket.emit('break_alliance', { targetId: id })
  setRelLocal(id, 'neutral')
  aL(t('toast.world.allianceDissolved', { name: v?.name || 'unknown' }), 'warn'); ntf(t('toast.world.allianceBroken')); rWo()
}

export function launchRaidMP(id) {
  const v = WS.villages.find(x => x.id === id); if (!v || !_socket) return
  _socket.emit('launch_raid', { targetId: id })
  aL(t('toast.world.raidLaunched', { icon: v.icon, name: v.name }), 'warn'); ntf(t('toast.world.raidLaunchedShort', { name: v.name }))
}

export function sendGiftMP(id) {
  if (!_socket) { ntf(t('toast.world.notConnected')); return }
  if (G.ryo < 5000) { ntf(t('toast.world.need5k')); return }
  const v = WS.villages.find(x => x.id === id)
  G.ryo -= 5000; _socket.emit('send_gift', { targetId: id })
  // Gifts improve Warden personal relationship too
  const npcV = G.villages?.find(x => x.n === v?.name)
  if (npcV) shiftKageRel(npcV, 6, 'Diplomatic gift received', G)
  aL(t('toast.world.giftsSent', { name: v?.name || 'unknown' }), 'good'); upUI()
}

export function setRelLocal(otherId, status) {
  if (!WS.myVillage) return
  if (!WS.myVillage.relations) WS.myVillage.relations = {}
  if (!WS.myVillage.relations[otherId]) WS.myVillage.relations[otherId] = { status: 'neutral', rel: 50 }
  WS.myVillage.relations[otherId].status = status
}

export function showDip(title, body, onAccept, onDecline) {
  document.getElementById('dip-title').textContent = title
  document.getElementById('dip-body').innerHTML = '<div style="font-size:10px;color:#e8e0cc;line-height:1.8">' + body + '</div>'
  setDipCb(onAccept ? { accept: onAccept, decline: onDecline } : null)
  document.getElementById('dip-accept').style.display = onAccept ? '' : 'none'
  document.getElementById('dip-decline').style.display = onDecline ? '' : 'none'
  document.getElementById('ov-diplomacy').classList.add('open')
}

export function dipAccept() {
  if (_dipCb?.accept) _dipCb.accept(); setDipCb(null); cm('diplomacy')
}

export function dipDecline() {
  if (_dipCb?.decline) _dipCb.decline(); setDipCb(null); cm('diplomacy')
}
