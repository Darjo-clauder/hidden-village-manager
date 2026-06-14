import { villages, rndPos, worldSnapshot } from '../state.js'
import db from '../db.js'

export function registerJoin(io, socket) {
  socket.on('join', async ({ name, kageName, icon, playerId }) => {
    let pos = null

    if (db && playerId) {
      try {
        const { data } = await db.from('villages')
          .select('pos_x, pos_y')
          .eq('player_id', playerId)
          .single()
        if (data) pos = { x: data.pos_x, y: data.pos_y }
      } catch { /* no saved village — use new position */ }
    }

    if (!pos) pos = rndPos()

    const village = {
      id: socket.id,
      playerId: playerId || null,
      name: (name || 'Hidden Village').slice(0, 32),
      kageName: (kageName || 'Unknown').slice(0, 24),
      icon: icon || '🍃',
      power: 0,
      reputation: 10,
      shinobiCount: 0,
      ryo: 60000,
      sealedBeasts: [],
      pos,
      relations: {},
      online: true,
    }

    villages.set(socket.id, village)

    if (db && playerId) {
      db.from('villages').upsert({
        player_id: playerId,
        name: village.name,
        kage_name: village.kageName,
        icon: village.icon,
        power: 0,
        reputation: 10,
        shinobi_count: 0,
        ryo: 60000,
        sealed_beasts: [],
        pos_x: pos.x,
        pos_y: pos.y,
        relations: {},
        last_seen: new Date().toISOString(),
      }).then(({ error }) => { if (error) console.error('upsert error:', error.message) })
    }

    socket.emit('world_state', worldSnapshot())
    socket.broadcast.emit('village_joined', village)
    console.log(`  "${village.name}" (${village.icon}) joined`)
  })
}
