import { villages } from '../state.js'
import db from '../db.js'

export function registerSync(io, socket) {
  socket.on('sync_state', ({ power, reputation, shinobiCount, sealedBeasts, ryo }) => {
    const v = villages.get(socket.id)
    if (!v) return
    v.power = power ?? v.power
    v.reputation = reputation ?? v.reputation
    v.shinobiCount = shinobiCount ?? v.shinobiCount
    v.sealedBeasts = sealedBeasts ?? v.sealedBeasts
    v.ryo = ryo ?? v.ryo

    io.emit('village_update', {
      id: socket.id, power: v.power, reputation: v.reputation,
      shinobiCount: v.shinobiCount, sealedBeasts: v.sealedBeasts,
    })

    if (db && v.playerId) {
      db.from('villages').update({
        power: v.power, reputation: v.reputation,
        shinobi_count: v.shinobiCount,
        sealed_beasts: v.sealedBeasts,
        ryo: v.ryo,
        last_seen: new Date().toISOString(),
      }).eq('player_id', v.playerId)
        .then(({ error }) => { if (error) console.error('sync error:', error.message) })
    }
  })
}
