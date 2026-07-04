// ── In-memory room registry ────────────────────────────────────────────────
// rooms:        roomCode  → room object
// socketToRoom: socketId  → roomCode  (fast reverse lookup)

export const rooms       = new Map()
export const socketToRoom = new Map()

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   // no O/0/1/I

function genCode() {
  let code
  do {
    code = Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  } while (rooms.has(code))
  return code
}

// ─────────────────────────────────────────────────────────────────────────────
// Room creation / management
// ─────────────────────────────────────────────────────────────────────────────

export function createRoom({ hostSocketId, hostPlayerId, isPrivate, maxPlayers, autoReadyTimeout, settings } = {}) {
  const code = genCode()
  const room = {
    code,
    hostSocketId,
    hostPlayerId:       hostPlayerId || null,
    isPrivate:          isPrivate    || false,
    maxPlayers:         Math.min(6, Math.max(1, maxPlayers || 4)),
    autoReadyTimeout:   autoReadyTimeout || 15,   // minutes
    settings:           settings || {},
    // players: socketId → player object
    players:            new Map(),
    readyVotes:         new Set(),
    turnNumber:         1,
    status:             'lobby',      // 'lobby' | 'playing' | 'paused'
    closedToJoiners:    false,
    // world events queued since last turn resolution (sent with turn_resolved)
    pendingWorldEvents: [],
    createdAt:          new Date(),
    // per-room world-event state
    eventState: {
      lastEventAt:      0,
      serverMonth:      1,
      recentEventTexts: [],
      pendingChains:    [],
    },
    // host-transfer: if host disconnects, timer starts
    hostDisconnectTimer: null,
  }
  rooms.set(code, room)
  return room
}

export function addPlayer(room, { socketId, playerId, name, kageName, icon }) {
  room.players.set(socketId, {
    socketId,
    playerId:         playerId || null,
    name:             (name     || 'Hidden Village').slice(0, 32),
    kageName:         (kageName || 'Unknown').slice(0, 24),
    icon:             icon || '🍃',
    ready:            false,
    connectedAt:      new Date(),
    disconnectedAt:   null,
    disconnectTimer:  null,
  })
  socketToRoom.set(socketId, room.code)
}

export function removePlayer(room, socketId) {
  room.players.delete(socketId)
  socketToRoom.delete(socketId)
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshots (serialisable, safe to emit over socket)
// ─────────────────────────────────────────────────────────────────────────────

export function roomSnapshot(room) {
  return {
    code:              room.code,
    hostSocketId:      room.hostSocketId,
    // hostPlayerId intentionally omitted — it's a bearer secret (save-load key).
    isPrivate:         room.isPrivate,
    maxPlayers:        room.maxPlayers,
    autoReadyTimeout:  room.autoReadyTimeout,
    settings:          room.settings,
    turnNumber:        room.turnNumber,
    status:            room.status,
    closedToJoiners:   room.closedToJoiners,
    players:           [...room.players.values()].map(playerSnap),
    playerCount:       room.players.size,
    readyCount:        [...room.players.values()].filter(p => p.ready).length,
    onlineCount:       [...room.players.values()].filter(p => !p.disconnectedAt).length,
  }
}

export function playerSnap(p) {
  return {
    socketId:       p.socketId,
    // playerId intentionally omitted — bearer secret, never sent to clients.
    name:           p.name,
    kageName:       p.kageName,
    icon:           p.icon,
    ready:          p.ready,
    online:         !p.disconnectedAt,
  }
}

export function publicRoomList() {
  return [...rooms.values()]
    .filter(r => !r.isPrivate && !r.closedToJoiners)
    .map(r => {
      const host = r.players.get(r.hostSocketId) || [...r.players.values()][0]
      return {
        code:             r.code,
        hostName:         host?.name || 'Unknown',
        hostIcon:         host?.icon || '🍃',
        playerCount:      r.players.size,
        maxPlayers:       r.maxPlayers,
        onlineCount:      [...r.players.values()].filter(p => !p.disconnectedAt).length,
        turnNumber:       r.turnNumber,
        status:           r.status,
        autoReadyTimeout: r.autoReadyTimeout,
      }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn / ready logic
// ─────────────────────────────────────────────────────────────────────────────

export function checkAllReady(room) {
  const online = [...room.players.values()].filter(p => !p.disconnectedAt)
  return online.length > 0 && online.every(p => p.ready)
}

export function resetReady(room) {
  room.players.forEach(p => { p.ready = false })
  room.readyVotes.clear()
}

export function advanceTurn(room) {
  room.turnNumber++
  room.status = 'playing'
  resetReady(room)
  const events = [...room.pendingWorldEvents]
  room.pendingWorldEvents = []
  return events
}

// ─────────────────────────────────────────────────────────────────────────────
// Host management
// ─────────────────────────────────────────────────────────────────────────────

/** Find the next eligible host (longest connected, online player). */
export function electNewHost(room, excludeSocketId) {
  const candidates = [...room.players.values()]
    .filter(p => p.socketId !== excludeSocketId && !p.disconnectedAt)
    .sort((a, b) => a.connectedAt - b.connectedAt)
  return candidates[0] || null
}
