import { villages } from '../state.js'
import { rollWorldEvent } from '../worldEvents.js'
import db, { saveGameState, setTickInProgress, upsertVillageSummary } from '../db.js'

export function registerSync(io, socket) {
  socket.on('sync_state', async ({ power, reputation, shinobiCount, sealedBeasts, ryo, fullState }) => {
    const v = villages.get(socket.id)
    if (!v) return

    // ── Update in-memory world-map summary ────────────────────────────────
    v.power        = power        ?? v.power
    v.reputation   = reputation   ?? v.reputation
    v.shinobiCount = shinobiCount ?? v.shinobiCount
    v.sealedBeasts = sealedBeasts ?? v.sealedBeasts
    v.ryo          = ryo          ?? v.ryo

    // Sync prestige tier from full state if available
    if (fullState?.prestigeTier) v.prestigeTier = fullState.prestigeTier

    // ── Broadcast summary update to all clients (map refresh) ─────────────
    io.emit('village_update', {
      id:           socket.id,
      power:        v.power,
      reputation:   v.reputation,
      shinobiCount: v.shinobiCount,
      sealedBeasts: v.sealedBeasts,
      prestigeTier: v.prestigeTier || 'D',
    })

    // ── Roll world events ─────────────────────────────────────────────────
    rollWorldEvent(io)

    // ── Persist to Supabase ───────────────────────────────────────────────
    if (db && v.playerId) {
      // 1. Update the lightweight world-map row
      upsertVillageSummary(v.playerId, {
        name:          v.name,
        kage_name:     v.kageName,
        icon:          v.icon,
        power:         v.power,
        reputation:    v.reputation,
        shinobi_count: v.shinobiCount,
        sealed_beasts: v.sealedBeasts,
        ryo:           v.ryo,
        prestige_tier: v.prestigeTier || 'D',
        online:        true,
      })

      // 2. Persist full game state if provided
      if (fullState && typeof fullState === 'object') {
        // Mark tick as in-progress so a crash here is detectable on restart
        await setTickInProgress(v.playerId, true)
        await saveGameState(v.playerId, fullState)
        // saveGameState clears tick_in_progress = false on success
      }
    }
  })
}
