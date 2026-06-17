import { detectOrphanedTicks, loadRooms } from './db.js'
import { rooms, createRoom } from './rooms.js'

/**
 * Run once when the server starts.
 * - Detects any villages mid-tick when the server last crashed.
 * - Restores room metadata from Supabase so players can reconnect to their rooms.
 */
export async function runStartupChecks() {
  console.log('[Startup] Running startup checks...')

  const orphans = await detectOrphanedTicks()
  if (orphans.length === 0) {
    console.log('[Startup] No orphaned ticks — state is clean.')
  } else {
    console.warn(`[Startup] Recovered ${orphans.length} incomplete tick(s).`)
  }

  // ── Restore rooms ────────────────────────────────────────────────────────
  // We restore room shells so players can rejoin by code.
  // Player socket bindings are re-established when they reconnect via join_room.
  const savedRooms = await loadRooms()
  let restored = 0
  for (const row of savedRooms) {
    if (rooms.has(row.code)) continue   // already exists
    const room = createRoom({
      hostSocketId:     null,   // no socket yet
      hostPlayerId:     row.host_player_id || null,
      isPrivate:        row.is_private,
      maxPlayers:       row.max_players,
      autoReadyTimeout: row.auto_ready_timeout,
      settings:         row.settings || {},
    })
    // Override the generated code with the saved one
    rooms.delete(room.code)
    room.code = row.code
    room.turnNumber = row.turn_number || 1
    room.status     = 'lobby'   // reset to lobby on restart
    rooms.set(row.code, room)
    restored++
  }
  if (restored) console.log(`[Startup] Restored ${restored} room(s) from Supabase.`)

  console.log('[Startup] Done.')
}
