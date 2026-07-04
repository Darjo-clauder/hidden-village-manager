import { villages, rndPos, worldSnapshot, publicVillage } from '../state.js'
import db, { loadGameState, upsertVillageSummary } from '../db.js'
import { cleanText, cleanIcon } from '../sanitize.js'

export function registerJoin(io, socket) {
  socket.on('join', async ({ name, kageName, icon, playerId }) => {
    // ── Load saved world-map position ──────────────────────────────────────
    let pos = null
    if (db && playerId) {
      try {
        const { data } = await db.from('villages')
          .select('pos_x, pos_y')
          .eq('player_id', playerId)
          .single()
        if (data) pos = { x: data.pos_x, y: data.pos_y }
      } catch { /* no saved position — assign a new one */ }
    }
    if (!pos) pos = rndPos()

    const village = {
      id:          socket.id,
      playerId:    playerId || null,
      name:        cleanText(name, 32) || 'Hidden Village',
      kageName:    cleanText(kageName, 24) || 'Unknown',
      icon:        cleanIcon(icon),
      power:       0,
      reputation:  10,
      shinobiCount: 0,
      ryo:         60000,
      sealedBeasts: [],
      pos,
      relations:   {},
      online:      true,
    }

    villages.set(socket.id, village)

    // ── Upsert world-map row ───────────────────────────────────────────────
    if (db && playerId) {
      upsertVillageSummary(playerId, {
        name:         village.name,
        kage_name:    village.kageName,
        icon:         village.icon,
        power:        0,
        reputation:   10,
        shinobi_count: 0,
        ryo:          60000,
        sealed_beasts: [],
        pos_x:        pos.x,
        pos_y:        pos.y,
        relations:    {},
        prestige_tier: 'D',
        online:       true,
      })
    }

    // ── Broadcast world state to new player ───────────────────────────────
    socket.emit('world_state', worldSnapshot())
    socket.broadcast.emit('village_joined', publicVillage(village))
    console.log(`  "${village.name}" (${village.icon}) joined`)

    // ── Load and restore full game state ──────────────────────────────────
    // Happens after broadcasting world_state so the client starts rendering
    // the map immediately while state loads.
    if (db && playerId) {
      const savedState = await loadGameState(playerId)
      if (savedState && typeof savedState === 'object') {
        socket.emit('load_state', savedState)
        console.log(`  Restored full state for "${village.name}" (Y${savedState.year} M${savedState.month})`)
      }
    }
  })
}
