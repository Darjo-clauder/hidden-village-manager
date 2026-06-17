import { villages } from '../state.js'
import db, { upsertVillageSummary } from '../db.js'

export function registerDisconnect(io, socket) {
  socket.on('disconnect', () => {
    const v = villages.get(socket.id)
    if (!v) return

    console.log(`- disconnected: "${v.name}"`)

    if (db && v.playerId) {
      // Mark village as offline and update last_seen
      upsertVillageSummary(v.playerId, {
        name:          v.name,
        kage_name:     v.kageName,
        icon:          v.icon,
        power:         v.power,
        reputation:    v.reputation,
        shinobi_count: v.shinobiCount,
        sealed_beasts: v.sealedBeasts,
        ryo:           v.ryo,
        online:        false,
      })
    }

    villages.delete(socket.id)
    io.emit('village_left', { id: socket.id, name: v.name, icon: v.icon })
  })
}
