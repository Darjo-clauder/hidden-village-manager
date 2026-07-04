import { villages, rndPos, setRel, getRelStatus, publicVillage } from '../state.js'
import {
  rooms, socketToRoom,
  createRoom, addPlayer, removePlayer,
  roomSnapshot, publicRoomList,
  checkAllReady, advanceTurn, electNewHost,
} from '../rooms.js'
import { rollWorldEvent } from '../worldEvents.js'
import db, { loadGameState, saveRoom, deleteRoom, upsertVillageSummary } from '../db.js'
import { cleanText, cleanIcon } from '../sanitize.js'

const HOST_TRANSFER_DELAY_MS  = 2 * 60 * 1000   // 2 minutes
const AUTO_READY_DEFAULT_MIN  = 15

// ── Shared: register a village in the global map and Supabase ─────────────

async function registerVillage(socket, { name, kageName, icon, playerId, roomCode }) {
  let pos = null
  if (db && playerId) {
    try {
      const { data } = await db.from('villages').select('pos_x,pos_y').eq('player_id', playerId).single()
      if (data) pos = { x: data.pos_x, y: data.pos_y }
    } catch { /* ignore */ }
  }
  if (!pos) pos = rndPos()

  const village = {
    id:           socket.id,
    playerId:     playerId || null,
    name:         cleanText(name, 32) || 'Hidden Village',
    kageName:     cleanText(kageName, 24) || 'Unknown',
    icon:         cleanIcon(icon),
    power:        0,
    reputation:   10,
    shinobiCount: 0,
    ryo:          60000,
    sealedBeasts: [],
    pos,
    relations:    {},
    roomCode,
    online:       true,
  }

  villages.set(socket.id, village)

  if (db && playerId) {
    upsertVillageSummary(playerId, {
      name: village.name, kage_name: village.kageName, icon: village.icon,
      power: 0, reputation: 10, shinobi_count: 0, ryo: 60000,
      sealed_beasts: [], pos_x: pos.x, pos_y: pos.y,
      relations: {}, prestige_tier: 'D', online: true,
    })
  }

  return village
}

// ── World snapshot scoped to a room ──────────────────────────────────────────

function roomWorldSnapshot(roomCode) {
  return [...villages.values()].filter(v => v.roomCode === roomCode).map(publicVillage)
}

// ── Check-and-fire turn resolution ───────────────────────────────────────────

function maybeResolveTurn(io, room) {
  if (!checkAllReady(room)) return

  const worldEvents = advanceTurn(room)   // bumps turnNumber, resets ready flags, collects events

  io.to(room.code).emit('turn_resolved', {
    turnNumber:  room.turnNumber,
    worldEvents,
  })
  io.to(room.code).emit('room_state_update', roomSnapshot(room))

  // Persist room turn number
  if (db) saveRoom(room).catch(e => console.error('[DB] saveRoom error:', e.message))
}

// ─────────────────────────────────────────────────────────────────────────────

export function registerRooms(io, socket) {

  // ── CREATE ROOM ───────────────────────────────────────────────────────────
  socket.on('create_room', async ({ name, kageName, icon, playerId, isPrivate, maxPlayers, autoReadyTimeout } = {}) => {
    name = cleanText(name, 32) || 'Hidden Village'; kageName = cleanText(kageName, 24) || 'Unknown'; icon = cleanIcon(icon)
    // If already in a room, clean up first
    const existingCode = socketToRoom.get(socket.id)
    if (existingCode) {
      const existingRoom = rooms.get(existingCode)
      if (existingRoom) _handleLeave(io, socket, existingRoom)
    }

    const room = createRoom({
      hostSocketId:     socket.id,
      hostPlayerId:     playerId || null,
      isPrivate:        isPrivate ?? true,
      maxPlayers:       maxPlayers || 4,
      autoReadyTimeout: autoReadyTimeout || AUTO_READY_DEFAULT_MIN,
    })

    socket.join(room.code)
    addPlayer(room, { socketId: socket.id, playerId: playerId || null, name, kageName, icon })

    const village = await registerVillage(socket, { name, kageName, icon, playerId, roomCode: room.code })

    socket.emit('room_created', { roomCode: room.code, snapshot: roomSnapshot(room) })
    socket.emit('world_state', roomWorldSnapshot(room.code))
    console.log(`+ Room ${room.code} created by "${village.name}"`)

    if (db && playerId) {
      const savedState = await loadGameState(playerId)
      if (savedState) socket.emit('load_state', savedState)
    }

    if (db) saveRoom(room).catch(e => console.error('[DB] saveRoom error:', e.message))
  })

  // ── JOIN ROOM ─────────────────────────────────────────────────────────────
  socket.on('join_room', async ({ code, name, kageName, icon, playerId } = {}) => {
    name = cleanText(name, 32) || 'Hidden Village'; kageName = cleanText(kageName, 24) || 'Unknown'; icon = cleanIcon(icon)
    const roomCode = (code || '').toUpperCase().trim()
    const room = rooms.get(roomCode)

    if (!room) { socket.emit('join_error', { reason: 'Room not found.' }); return }
    if (room.closedToJoiners) { socket.emit('join_error', { reason: 'Room is closed to new players.' }); return }
    if (room.players.size >= room.maxPlayers) { socket.emit('join_error', { reason: 'Room is full.' }); return }

    // Leave current room if any
    const existingCode = socketToRoom.get(socket.id)
    if (existingCode) {
      const existingRoom = rooms.get(existingCode)
      if (existingRoom) _handleLeave(io, socket, existingRoom)
    }

    socket.join(roomCode)
    addPlayer(room, { socketId: socket.id, playerId: playerId || null, name, kageName, icon })

    const village = await registerVillage(socket, { name, kageName, icon, playerId, roomCode })

    socket.emit('room_joined', { roomCode, snapshot: roomSnapshot(room) })
    socket.emit('world_state', roomWorldSnapshot(roomCode))
    io.to(roomCode).except(socket.id).emit('village_joined', publicVillage(village))
    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
    console.log(`+ "${village.name}" joined room ${roomCode}`)

    if (db && playerId) {
      const savedState = await loadGameState(playerId)
      if (savedState) socket.emit('load_state', savedState)
    }

    if (db) saveRoom(room).catch(e => console.error('[DB] saveRoom error:', e.message))
  })

  // ── LIST PUBLIC ROOMS ─────────────────────────────────────────────────────
  socket.on('list_rooms', () => {
    socket.emit('room_list', publicRoomList())
  })

  // ── PLAYER READY (End Turn) ───────────────────────────────────────────────
  socket.on('player_ready', () => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room) return

    const player = room.players.get(socket.id)
    if (player) player.ready = true

    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
    maybeResolveTurn(io, room)
  })

  // ── PLAYER UNREADY ────────────────────────────────────────────────────────
  socket.on('player_unready', () => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room) return

    const player = room.players.get(socket.id)
    if (player) player.ready = false

    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
  })

  // ── VOTE TO ADVANCE (majority vote to advance without disconnected player) ─
  socket.on('vote_advance', () => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room) return

    room.readyVotes.add(socket.id)
    const online = [...room.players.values()].filter(p => !p.disconnectedAt)
    const majority = Math.ceil(online.length / 2)

    if (room.readyVotes.size >= majority) {
      // Force-ready all disconnected players and check
      room.players.forEach(p => { if (p.disconnectedAt) p.ready = true })
      io.to(roomCode).emit('room_state_update', roomSnapshot(room))
      maybeResolveTurn(io, room)
    } else {
      io.to(roomCode).emit('room_state_update', roomSnapshot(room))
    }
  })

  // ── KICK PLAYER ───────────────────────────────────────────────────────────
  socket.on('kick_player', ({ targetSocketId, reason }) => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) return

    const target = io.sockets.sockets.get(targetSocketId)
    if (target) {
      target.emit('player_kicked', { reason: reason || 'Removed by host.' })
      target.leave(roomCode)
    }

    removePlayer(room, targetSocketId)
    villages.delete(targetSocketId)

    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
    io.to(roomCode).emit('village_left', { id: targetSocketId })
  })

  // ── TRANSFER HOST ─────────────────────────────────────────────────────────
  socket.on('transfer_host', ({ targetSocketId }) => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) return

    const target = room.players.get(targetSocketId)
    if (!target) return

    room.hostSocketId = targetSocketId
    room.hostPlayerId = target.playerId

    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
    if (db) saveRoom(room).catch(e => console.error('[DB] saveRoom error:', e.message))
  })

  // ── PAUSE / RESUME ────────────────────────────────────────────────────────
  socket.on('pause_room', () => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) return
    room.status = 'paused'
    io.to(roomCode).emit('room_paused', {})
    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
  })

  socket.on('resume_room', () => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) return
    room.status = 'playing'
    io.to(roomCode).emit('room_resumed', {})
    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
  })

  // ── CLOSE / OPEN TO JOINERS ───────────────────────────────────────────────
  socket.on('close_room', () => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) return
    room.closedToJoiners = !room.closedToJoiners
    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
    if (db) saveRoom(room).catch(e => console.error('[DB] saveRoom error:', e.message))
  })

  // ── SET TIMEOUT ───────────────────────────────────────────────────────────
  socket.on('set_timeout', ({ minutes }) => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) return
    const val = [5, 10, 15, 30].includes(Number(minutes)) ? Number(minutes) : 15
    room.autoReadyTimeout = val
    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
    if (db) saveRoom(room).catch(e => console.error('[DB] saveRoom error:', e.message))
  })

  // ── SET MAX PLAYERS ───────────────────────────────────────────────────────
  socket.on('set_max_players', ({ max }) => {
    const roomCode = socketToRoom.get(socket.id)
    const room = rooms.get(roomCode)
    if (!room || room.hostSocketId !== socket.id) return
    room.maxPlayers = Math.min(6, Math.max(1, Number(max) || 4))
    io.to(roomCode).emit('room_state_update', roomSnapshot(room))
    if (db) saveRoom(room).catch(e => console.error('[DB] saveRoom error:', e.message))
  })
}

// ── Internal: handle a player leaving a room ──────────────────────────────

export function _handleLeave(io, socket, room) {
  const roomCode = room.code
  socket.leave(roomCode)

  const village = villages.get(socket.id)
  removePlayer(room, socket.id)
  villages.delete(socket.id)

  io.to(roomCode).emit('village_left', { id: socket.id, name: village?.name, icon: village?.icon })

  if (room.players.size === 0) {
    // Empty room — delete it
    if (db) deleteRoom(roomCode).catch(() => {})
    rooms.delete(roomCode)
    return
  }

  // Transfer host if needed
  if (room.hostSocketId === socket.id) {
    const next = electNewHost(room, socket.id)
    if (next) {
      room.hostSocketId = next.socketId
      room.hostPlayerId = next.playerId
      io.to(roomCode).emit('host_transferred', { newHostSocketId: next.socketId, newHostName: next.name })
    }
  }

  io.to(roomCode).emit('room_state_update', roomSnapshot(room))
  if (db) saveRoom(room).catch(() => {})
}

// ── Internal: handle a player disconnect (not full leave) ─────────────────

export function handleDisconnect(io, socket) {
  const roomCode = socketToRoom.get(socket.id)
  const room = rooms.get(roomCode)
  if (!room) return

  const player = room.players.get(socket.id)
  if (player) {
    player.disconnectedAt = new Date()
    player.ready = false   // unready on disconnect

    // Auto-ready timer (marks ready after timeout so others can advance)
    const timeoutMs = (room.autoReadyTimeout || AUTO_READY_DEFAULT_MIN) * 60 * 1000
    player.disconnectTimer = setTimeout(() => {
      if (player.disconnectedAt) {      // still disconnected
        player.ready = true
        io.to(roomCode).emit('room_state_update', roomSnapshot(room))
        maybeResolveTurn(io, room)
      }
    }, timeoutMs)
  }

  // Host-transfer timer: 2 min after host disconnects, pick next
  if (room.hostSocketId === socket.id && !room.hostDisconnectTimer) {
    room.hostDisconnectTimer = setTimeout(() => {
      room.hostDisconnectTimer = null
      if (room.hostSocketId !== socket.id) return   // already transferred
      const next = electNewHost(room, socket.id)
      if (next) {
        room.hostSocketId = next.socketId
        room.hostPlayerId = next.playerId
        io.to(roomCode).emit('host_transferred', { newHostSocketId: next.socketId, newHostName: next.name })
        io.to(roomCode).emit('room_state_update', roomSnapshot(room))
      }
    }, HOST_TRANSFER_DELAY_MS)
  }

  io.to(roomCode).emit('room_state_update', roomSnapshot(room))
  io.to(roomCode).emit('village_left', {
    id:   socket.id,
    name: room.players.get(socket.id)?.name,
    icon: room.players.get(socket.id)?.icon,
  })
}
