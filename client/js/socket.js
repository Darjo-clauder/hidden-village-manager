import { G, WS, clamp, fmt } from './state.js'
import { aL, ntf, upUI, setOnline } from './ui.js'
import { rWo, setWorldSocket, setRelLocal, showDip, respondAlliance } from './world.js'
import { addNewsItem } from './news.js'

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
    WS.myId = socket.id
    socket.emit('join', { name, kageName, icon, playerId })
  })

  socket.on('disconnect', () => setOnline(false))

  // ── Full state restore ────────────────────────────────────────────────────
  // Server sends this right after 'join' if a save exists for this playerId.
  socket.on('load_state', (savedState) => {
    if (!savedState || typeof savedState !== 'object') return
    console.log('[Socket] Restoring game state from server...')
    // Merge into G — existing keys from initState() provide defaults for any
    // fields that didn't exist in older saves.
    Object.keys(savedState).forEach(k => { G[k] = savedState[k] })
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
    console.log(`[Socket] State restored: Y${G.year} M${G.month}, ${G.shinobi?.length || 0} shinobi, ${G.ryo} ryo`)
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

  // ── Save on tab close ─────────────────────────────────────────────────────
  window.addEventListener('beforeunload', () => syncToServer())
}
