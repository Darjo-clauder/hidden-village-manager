import { villages } from '../state.js'
import { socketToRoom, rooms } from '../rooms.js'
import { rollWorldEvent } from '../worldEvents.js'
import db, { saveGameState, setTickInProgress, upsertVillageSummary } from '../db.js'
import { cleanStringArray } from '../sanitize.js'

export function registerSync(io, socket) {
  socket.on('sync_state', async ({ power, reputation, shinobiCount, sealedBeasts, ryo, fullState }) => {
    const v = villages.get(socket.id)
    if (!v) return

    // Coerce client-declared numbers to sane, finite, non-negative bounds. These
    // are cosmetic world-map stats, but bounding them limits the raid-power cheat
    // (see combat.js) and blocks a non-numeric value reaching an innerHTML sink.
    const num = (x, d, max) => { const n = Number(x); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : d }
    v.power        = num(power,        v.power,        100000)
    v.reputation   = num(reputation,   v.reputation,   100000)
    v.shinobiCount = num(shinobiCount, v.shinobiCount, 100000)
    v.sealedBeasts = sealedBeasts != null ? cleanStringArray(sealedBeasts, 20, 24) : v.sealedBeasts
    v.ryo          = num(ryo,          v.ryo,          1e12)

    if (fullState?.prestigeTier) v.prestigeTier = fullState.prestigeTier

    const roomCode = socketToRoom.get(socket.id)
    const room     = rooms.get(roomCode)

    // ── Broadcast summary update scoped to this room ──────────────────────
    const target = roomCode ? io.to(roomCode) : io
    target.emit('village_update', {
      id:           socket.id,
      power:        v.power,
      reputation:   v.reputation,
      shinobiCount: v.shinobiCount,
      sealedBeasts: v.sealedBeasts,
      prestigeTier: v.prestigeTier || 'D',
    })

    // ── Roll world events (per-room) ──────────────────────────────────────
    if (room) rollWorldEvent(io, room)
    else      rollWorldEvent(io, null)   // fallback: broadcast globally (no-room mode)

    // ── Persist ───────────────────────────────────────────────────────────
    if (db && v.playerId) {
      upsertVillageSummary(v.playerId, {
        name: v.name, kage_name: v.kageName, icon: v.icon,
        power: v.power, reputation: v.reputation, shinobi_count: v.shinobiCount,
        sealed_beasts: v.sealedBeasts, ryo: v.ryo, prestige_tier: v.prestigeTier || 'D',
        online: true,
      })

      if (fullState && typeof fullState === 'object') {
        await setTickInProgress(v.playerId, true)
        await saveGameState(v.playerId, fullState)
      }
    }
  })
}
