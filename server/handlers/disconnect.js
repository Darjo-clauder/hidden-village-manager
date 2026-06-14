import { villages } from '../state.js'
import db from '../db.js'

export function registerDisconnect(io, socket) {
  socket.on('disconnect', () => {
    const v = villages.get(socket.id)
    if (!v) return
    console.log(`- disconnected: "${v.name}"`)
    if (db && v.playerId) {
      db.from('villages').update({ last_seen: new Date().toISOString() })
        .eq('player_id', v.playerId)
        .then(({ error }) => { if (error) console.error('disconnect save error:', error.message) })
    }
    villages.delete(socket.id)
    io.emit('village_left', { id: socket.id, name: v.name, icon: v.icon })
  })
}
