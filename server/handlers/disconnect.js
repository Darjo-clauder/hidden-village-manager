import { villages } from '../state.js'
import { socketToRoom } from '../rooms.js'
import { handleDisconnect } from './rooms.js'
import db, { upsertVillageSummary } from '../db.js'

export function registerDisconnect(io, socket) {
  socket.on('disconnect', () => {
    const v = villages.get(socket.id)
    if (!v) return

    console.log(`- disconnected: "${v.name}"`)

    if (db && v.playerId) {
      upsertVillageSummary(v.playerId, {
        name: v.name, kage_name: v.kageName, icon: v.icon,
        power: v.power, reputation: v.reputation, shinobi_count: v.shinobiCount,
        sealed_beasts: v.sealedBeasts, ryo: v.ryo, online: false,
      })
    }

    // If in a room, use room-aware disconnect (marks player as offline,
    // starts auto-ready and host-transfer timers — does NOT remove from room)
    if (socketToRoom.has(socket.id)) {
      handleDisconnect(io, socket)
    } else {
      // Legacy: not in a room
      villages.delete(socket.id)
      io.emit('village_left', { id: socket.id, name: v.name, icon: v.icon })
    }
  })
}
