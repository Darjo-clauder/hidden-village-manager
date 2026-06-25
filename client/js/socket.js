import { G, WS, clamp, fmt } from './state.js'
import { aL, ntf, upUI, setOnline } from './ui.js'
import { rWo, setWorldSocket, setRelLocal, showDip, respondAlliance } from './world.js'
import { addNewsItem } from './news.js'
import { RS } from './room.js'
import { rLob } from './panels/lobby.js'
import { migrateBeastStats } from './beastEngine.js'
import { dlog } from '../../shared/utils/debug.js'

export let socket = null

/**
 * Sync game state to server.
 * Always sends the lightweight summary (for the world map).
 * Always sends fullState (the complete G object) for persistence.
 * Called at the end of every adv() tick and on beforeunload.
 */
export function syncToServer() {
  if (!socket?.connected) return

  const totalPow = G.shinobi.reduce((a, s) => a + _sPow(s), 0)

  socket.emit('sync_state', {
    // World-map summary (lightweight, used by all clients)
    power:        totalPow,
    reputation:   G.reputation,
    shinobiCount: G.shinobi.length,
    sealedBeasts: G.beasts.filter(b => b.sealed).map(b => b.n),
    ryo:          G.ryo,
    // Full state (persisted server-side, returned to this client on reconnect)
    fullState:    G,
  })

  if (WS.myVillage) {
    WS.myVillage.power        = totalPow
    WS.myVillage.reputation   = G.reputation
    WS.myVillage.shinobiCount = G.shinobi.length
    WS.myVillage.sealedBeasts = G.beasts.filter(b => b.sealed).map(b => b.n)
  }
}

function _sPow(s) {
  const v = Object.values(s.stats)
  let p = Math.round(v.reduce((a, b) => a + b, 0) / v.length)
  if (s.jk) { const b = G.beasts.find(x => x.n === s.jk); if (b) p += Math.round(b.pow * 0.4) }
  return p
}

export function initSocket(name, kageName, icon) {
  const playerId = localStorage.getItem('villageId') || crypto.randomUUID()
  localStorage.setItem('villageId',  playerId)
  localStorage.setItem('vName',      name)
  localStorage.setItem('kName',      kageName)
  localStorage.setItem('vIcon',      icon)

  socket = io()
  setWorldSocket(socket)

  socket.on('connect', () => {
    WS.myId     = socket.id
    RS.mySocketId = socket.id

    if (RS.mode === 'join' && RS.pendingCode) {
      socket.emit('join_room', { code: RS.pendingCode, name, kageName, icon, playerId })
    } else {
      // Default: create a private solo room (or public if RS.pendingIsPrivate is false)
      socket.emit('create_room', {
        name, kageName, icon, playerId,
        isPrivate:        RS.pendingIsPrivate ?? true,
        maxPlayers:       RS.pendingMaxPlayers || 4,
        autoReadyTimeout: RS.pendingAutoReadyTimeout || 15,
      })
    }
  })

  socket.on('disconnect', () => setOnline(false))

  // ── Full state restore ────────────────────────────────────────────────────
  // Server sends this right after 'join' if a save exists for this playerId.
  socket.on('load_state', (savedState) => {
    if (!savedState || typeof savedState !== 'object') return
    dlog('[Socket] Restoring game state from server...')
    // Merge into G — existing keys from initState() provide defaults for any
    // fields that didn't exist in older saves.
    Object.keys(savedState).forEach(k => { G[k] = savedState[k] })
    // MIG-1: heal any jinchuriki stats inflated by the pre-fix beast-stat bug (runs once)
    migrateBeastStats(G)
    // Restore UI-visible name fields in sidebar
    if (G.vName) {
      const sb = document.getElementById('sb-vname')
      if (sb) sb.textContent = G.vName
    }
    if (G.vIcon) {
      const si = document.getElementById('sb-icon')
      if (si) si.textContent = G.vIcon
    }
    upUI()
    ntf('Session restored — welcome back, Kage.')
    dlog(`[Socket] State restored: Y${G.year} M${G.month}, ${G.shinobi?.length || 0} shinobi, ${G.ryo} ryo`)
  })

  // ── World state ───────────────────────────────────────────────────────────
  socket.on('world_state', vs => {
    WS.villages = vs; WS.myVillage = vs.find(v => v.id === WS.myId) || null
    setOnline(true); rWo()
  })

  socket.on('village_joined', v => {
    WS.villages.push(v)
    aL(v.icon + ' ' + v.name + ' joined the world!', 'ev')
    ntf(v.name + ' entered the world!')
    setOnline(true); rWo()
  })

  socket.on('village_left', ({ id, name: n, icon: ic }) => {
    WS.villages = WS.villages.filter(v => v.id !== id)
    aL((ic || '') + ' ' + (n || 'A village') + ' went offline.', 'neutral')
    setOnline(true); rWo()
  })

  socket.on('village_update', ({ id, power, reputation, shinobiCount, sealedBeasts, prestigeTier }) => {
    const v = WS.villages.find(v => v.id === id)
    if (v) {
      v.power        = power
      v.reputation   = reputation
      v.shinobiCount = shinobiCount
      v.sealedBeasts = sealedBeasts
      if (prestigeTier) v.prestigeTier = prestigeTier
    }
    rWo()
  })

  socket.on('war_declared', ({ fromId, fromName, fromIcon }) => {
    setRelLocal(fromId, 'war')
    aL('⚠ ' + fromIcon + ' ' + fromName + ' declared WAR!', 'bad')
    showDip('⚠ War Declaration',
      fromIcon + ' <b style="color:#e8e0cc">' + fromName + '</b> has declared war on your village! Expect raids.',
      null, null)
    rWo()
  })

  socket.on('alliance_proposed', ({ fromId, fromName, fromIcon }) => {
    WS.pendingAlliances.push({ fromId, fromName, fromIcon })
    aL(fromIcon + ' ' + fromName + ' proposes an alliance — check World Map!', 'ev')
    ntf('Alliance proposal from ' + fromName + '!')
    showDip('Alliance Proposal',
      fromIcon + ' <b style="color:#e8e0cc">' + fromName + '</b> proposes a military alliance.',
      () => respondAlliance(fromId, true), () => respondAlliance(fromId, false))
    rWo()
  })

  socket.on('alliance_accepted', ({ fromId, fromName, fromIcon }) => {
    setRelLocal(fromId, 'allied')
    aL(fromIcon + ' ' + fromName + ' accepted your alliance!', 'good')
    ntf('Allied with ' + fromName + '!')
    rWo()
  })

  socket.on('alliance_declined', ({ fromName }) => {
    aL(fromName + ' declined your alliance.', 'neutral')
    ntf(fromName + ' declined.')
  })

  socket.on('alliance_broken', ({ fromId, fromName, fromIcon }) => {
    setRelLocal(fromId, 'neutral')
    aL(fromIcon + ' ' + fromName + ' broke the alliance!', 'warn')
    ntf(fromName + ' broke the alliance!')
    rWo()
  })

  socket.on('relations_update', ({ a, b, status }) => {
    const other = a === WS.myId ? b : b === WS.myId ? a : null
    if (other) setRelLocal(other, status)
    ;[WS.villages.find(v => v.id === a), WS.villages.find(v => v.id === b)].forEach((v, i) => {
      if (!v) return
      if (!v.relations) v.relations = {}
      const oId = i === 0 ? b : a
      v.relations[oId] = { status, rel: 50 }
    })
    rWo()
  })

  socket.on('raid_result', res => {
    if (res.isAttacker) {
      if (res.won) {
        G.ryo += res.ryoStolen
        G.reputation = clamp(G.reputation + res.repChange, 0, 999)
        aL('Raid on ' + res.targetName + ' succeeded! +' + fmt(res.ryoStolen) + ' ryo. (' + res.atkRoll + ' vs ' + res.defRoll + ')', 'good')
        ntf('Raid won! +' + fmt(res.ryoStolen) + ' ryo')
      } else {
        G.reputation = clamp(G.reputation + (res.repChange || 0), 0, 999)
        aL('Raid on ' + res.targetName + ' failed. (' + res.atkRoll + ' vs ' + res.defRoll + ')', 'bad')
        ntf('Raid failed.')
      }
    } else {
      if (res.won) {
        aL('Repelled raid from ' + res.fromIcon + ' ' + res.fromName + '! (' + res.defRoll + ' vs ' + res.atkRoll + ')', 'good')
        ntf('Raid repelled!')
      } else {
        G.ryo = Math.max(0, G.ryo - res.ryoStolen)
        aL('⚠ ' + res.fromIcon + ' ' + res.fromName + ' raided you! Lost ' + fmt(res.ryoStolen) + ' ryo.', 'bad')
        ntf('⚠ Raided! -' + fmt(res.ryoStolen) + ' ryo')
      }
      showDip(
        res.won ? 'Raid Repelled!' : '⚠ Village Raided!',
        res.won
          ? res.fromIcon + ' <b>' + res.fromName + '</b> attacked but was repelled. (Roll: ' + res.defRoll + ' vs ' + res.atkRoll + ')'
          : res.fromIcon + ' <b>' + res.fromName + '</b> raided your village and stole <b style="color:#f66">' + fmt(res.ryoStolen) + ' ryo</b>. (Roll: ' + res.atkRoll + ' vs ' + res.defRoll + ')',
        null, null
      )
    }
    upUI(); rWo()
  })

  socket.on('gift_received', ({ fromId, fromName, fromIcon, amount }) => {
    G.ryo += amount
    const curStatus = WS.myVillage?.relations?.[fromId]?.status || 'neutral'
    if (curStatus === 'war') setRelLocal(fromId, 'neutral')
    aL(fromIcon + ' ' + fromName + ' sent gifts (+' + fmt(amount) + ' ryo).', 'good')
    ntf('Gifts from ' + fromName + '! +' + fmt(amount) + ' ryo')
    upUI(); rWo()
  })

  socket.on('gift_sent',       ({ targetName }) => ntf('Gifts sent to ' + targetName + '.'))
  socket.on('sv_notification', msg              => ntf(msg))

  socket.on('world_event', ({ text, effect }) => {
    addNewsItem(text)
    aL('[World] ' + text, 'ev')
    if (effect) {
      if (effect.ryo)        { G.ryo = clamp(G.ryo + effect.ryo, 0, Infinity); aL('World event: ' + (effect.ryo > 0 ? '+' : '') + fmt(effect.ryo) + ' ryo.', effect.ryo > 0 ? 'good' : 'bad') }
      if (effect.morale)     G.morale     = clamp((G.morale     || 75) + effect.morale,     0, 100)
      if (effect.reputation) G.reputation = clamp((G.reputation || 10) + effect.reputation, 0, 999)
      upUI()
    }
  })

  // ── Room events ───────────────────────────────────────────────────────────

  socket.on('room_created', ({ roomCode, snapshot }) => {
    RS.roomCode = roomCode
    RS.snapshot = snapshot
    RS.isHost   = true
    RS.mode     = null
    _updateRoomBadge(roomCode)
    rLob()
    ntf('Room ' + roomCode + ' created — share the code to invite others!')
    dlog('[Room] Created:', roomCode)
  })

  socket.on('room_joined', ({ roomCode, snapshot }) => {
    RS.roomCode = roomCode
    RS.snapshot = snapshot
    RS.isHost   = snapshot.hostSocketId === socket.id
    RS.mode     = null
    _updateRoomBadge(roomCode)
    rLob()
    ntf('Joined room ' + roomCode)
    dlog('[Room] Joined:', roomCode)
  })

  socket.on('room_state_update', (snapshot) => {
    RS.snapshot = snapshot
    RS.isHost   = snapshot.hostSocketId === socket.id
    _updateRoomBadge(snapshot.code)
    rLob()
    // Merge ready/online status into existing WS.villages (preserve pos for world map)
    snapshot.players.forEach(p => {
      const v = WS.villages.find(v => v.id === p.socketId)
      if (v) { v.ready = p.ready; v.online = p.online }
    })
    rWo()
  })

  socket.on('room_list', (list) => {
    _renderServerBrowser(list)
  })

  socket.on('join_error', ({ reason }) => {
    ntf('Cannot join: ' + reason)
    const errEl = document.getElementById('lob-join-error')
    if (errEl) errEl.textContent = reason
  })

  socket.on('host_transferred', ({ newHostSocketId, newHostName }) => {
    if (newHostSocketId === socket.id) {
      RS.isHost = true
      ntf('You are now the room host.')
    } else {
      ntf(newHostName + ' is now the room host.')
    }
    rLob()
  })

  socket.on('player_kicked', ({ reason }) => {
    ntf('You were removed from the room: ' + (reason || ''))
    RS.roomCode = null
    RS.snapshot = null
    RS.isHost   = false
    // Return to lobby screen
    const lobScreen = document.getElementById('sl')
    if (lobScreen) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
      lobScreen.classList.add('active')
    }
  })

  socket.on('room_paused',  () => { ntf('Room paused by host.'); rLob() })
  socket.on('room_resumed', () => { ntf('Room resumed.'); rLob() })

  socket.on('turn_resolved', ({ turnNumber, worldEvents }) => {
    _showTurnResolution(turnNumber, worldEvents)
  })

  // ── Save on tab close ─────────────────────────────────────────────────────
  window.addEventListener('beforeunload', () => syncToServer())
}

// ── Helper: update room code badge in nav ────────────────────────────────────

function _updateRoomBadge(code) {
  const badge = document.getElementById('lob-room-code')
  if (!badge) return
  badge.textContent = code || ''
  badge.style.display = code ? 'inline-block' : 'none'
}

// ── Server browser renderer ───────────────────────────────────────────────────

function _renderServerBrowser(list) {
  const el = document.getElementById('sl-browser-list')
  if (!el) return

  if (!list.length) {
    el.innerHTML = '<div style="color:#7a7060;font-size:9px;padding:10px">No public rooms found.</div>'
    return
  }

  el.innerHTML = list.map(r => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #1a150a">
      <span style="font-size:18px">${r.hostIcon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;color:#e8e0cc">${r.hostName}</div>
        <div style="font-size:8px;color:#7a7060">${r.playerCount}/${r.maxPlayers} players · Turn ${r.turnNumber} · Auto-ready: ${r.autoReadyTimeout}m</div>
      </div>
      <div style="font-size:8px;color:#c9a84c;font-family:monospace">${r.code}</div>
      <button class="gb" style="font-size:9px" onclick="joinRoomByCode('${r.code}')">Join ▸</button>
    </div>
  `).join('')
}

// ── Turn Resolution modal ─────────────────────────────────────────────────────

function _showTurnResolution(turnNumber, worldEvents) {
  const ov = document.getElementById('ov-turn-resolve')
  if (!ov) return

  const evHtml = (worldEvents || []).map(e =>
    `<div style="padding:4px 0;border-bottom:1px solid #1a150a;font-size:9px;color:#e8e0cc">${e.text}</div>`
  ).join('') || '<div style="font-size:9px;color:#7a7060">No world events this turn.</div>'

  const body = ov.querySelector('#ov-tr-body')
  if (body) body.innerHTML = `
    <div style="font-size:10px;color:#c9a84c;margin-bottom:8px">Turn ${turnNumber - 1} Complete</div>
    <div style="font-size:9px;color:#7a7060;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">World Events</div>
    ${evHtml}
  `
  ov.classList.add('open')
}
