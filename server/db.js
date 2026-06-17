import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

// Server uses SERVICE_ROLE_KEY to bypass RLS — never expose this on the client.
const url  = process.env.SUPABASE_URL
const key  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

let supabase = null

if (url && key) {
  supabase = createClient(url, key, { realtime: { transport: ws } })
  console.log('[DB] Supabase connected.')
} else {
  console.warn('[DB] SUPABASE_URL / SUPABASE_SERVICE_KEY not set — running without persistence.')
}

export default supabase

// ─────────────────────────────────────────────────────────────────────────────
// GAME STATE — save / load
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert the complete G state for a player.
 * Sets tick_in_progress = false after a clean write.
 * Call setTickInProgress(playerId, true) BEFORE computing a tick,
 * then saveGameState() after to clear the flag atomically.
 */
export async function saveGameState(playerId, G) {
  if (!supabase || !playerId || !G) return

  const trimmed = _trimState(G)

  const { error } = await supabase.from('game_saves').upsert({
    player_id:       playerId,
    village_name:    G.vName    || 'Hidden Village',
    kage_name:       G.kName    || 'Unknown Kage',
    village_icon:    G.vIcon    || '🍃',
    game_year:       G.year     || 1,
    game_month:      G.month    || 1,
    prestige_tier:   G.prestigeTier || 'D',
    legend:          G.legend   || 0,
    ryo:             G.ryo      || 0,
    reputation:      G.reputation || 0,
    morale:          G.morale   || 75,
    full_state:      trimmed,
    tick_in_progress: false,
    state_version:   1,
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'player_id' })

  if (error) {
    console.error('[DB] saveGameState error:', error.message)
    return
  }

  // Fire-and-forget: sync entity tables for queryability
  _syncEntityTables(playerId, G).catch(e =>
    console.error('[DB] entity sync error:', e.message)
  )
}

/**
 * Load the full G state for a player. Returns null if not found.
 * On load, also clears any stale tick_in_progress flag.
 */
export async function loadGameState(playerId) {
  if (!supabase || !playerId) return null

  const { data, error } = await supabase.from('game_saves')
    .select('full_state, village_name, tick_in_progress, updated_at')
    .eq('player_id', playerId)
    .single()

  if (error || !data) return null

  if (data.tick_in_progress) {
    console.warn(`[DB] Orphaned tick flag on "${data.village_name}" — last saved ${data.updated_at}. Auto-clearing.`)
    await supabase.from('game_saves')
      .update({ tick_in_progress: false })
      .eq('player_id', playerId)
  }

  return data.full_state || null
}

/**
 * Mark tick as in-progress before computing it.
 * If the server crashes mid-tick, the flag stays true and is detected on next load.
 */
export async function setTickInProgress(playerId, flag) {
  if (!supabase || !playerId) return
  const { error } = await supabase.from('game_saves')
    .update({ tick_in_progress: flag })
    .eq('player_id', playerId)
  if (error) console.error('[DB] setTickInProgress error:', error.message)
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP — crash recovery detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called once on server startup. Detects any saves with tick_in_progress = true,
 * which means the server crashed during a tick. Those saves are still valid
 * (written before crash) so we just clear the flag and log the incident.
 * Returns the list of affected villages for logging.
 */
export async function detectOrphanedTicks() {
  if (!supabase) return []

  const { data, error } = await supabase.from('game_saves')
    .select('player_id, village_name, updated_at')
    .eq('tick_in_progress', true)

  if (error) { console.error('[DB] detectOrphanedTicks error:', error.message); return [] }
  if (!data?.length) return []

  console.warn(`[DB] ${data.length} orphaned tick(s) found — clearing flags.`)
  data.forEach(d => console.warn(`     - "${d.village_name}" (last saved: ${d.updated_at})`))

  await supabase.from('game_saves')
    .update({ tick_in_progress: false })
    .eq('tick_in_progress', true)

  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// CHRONICLE — append-only history log
// ─────────────────────────────────────────────────────────────────────────────

export async function appendChronicle(playerId, villageName, entry) {
  if (!supabase || !playerId) return
  const { error } = await supabase.from('chronicles').insert({
    player_id:    playerId,
    village_name: villageName,
    entry_type:   entry.type   || 'event',
    title:        entry.title  || '',
    narrative:    entry.body   || entry.narrative || '',
    game_month:   entry.month  || null,
    game_year:    entry.year   || null,
  })
  if (error) console.error('[DB] appendChronicle error:', error.message)
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLD EVENTS — server-broadcast
// ─────────────────────────────────────────────────────────────────────────────

export async function insertWorldEvent(eventType, text, effect, expiresInMinutes = 60) {
  if (!supabase) return
  const expires = new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
  const { error } = await supabase.from('world_events').insert({
    event_type: eventType,
    text,
    effect: effect || {},
    expires_at: expires,
  })
  if (error) console.error('[DB] insertWorldEvent error:', error.message)
}

export async function loadRecentWorldEvents(limit = 10) {
  if (!supabase) return []
  const { data } = await supabase.from('world_events')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ─────────────────────────────────────────────────────────────────────────────
// VILLAGE SUMMARY — upsert world-map row
// ─────────────────────────────────────────────────────────────────────────────

export async function upsertVillageSummary(playerId, fields) {
  if (!supabase || !playerId) return
  const { error } = await supabase.from('villages').upsert(
    { player_id: playerId, ...fields, last_seen: new Date().toISOString() },
    { onConflict: 'player_id' }
  )
  if (error) console.error('[DB] upsertVillageSummary error:', error.message)
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE — state trimming
// Keeps the payload under control for large saves.
// Only the trimmed version is stored in full_state; entity tables get the raw data.
// ─────────────────────────────────────────────────────────────────────────────

function _trimState(G) {
  if (!G || typeof G !== 'object') return {}
  return {
    ...G,
    // Keep only recent entries to bound payload size
    log:         (G.log         || []).slice(-100),
    examResults: (G.examResults || []).slice(-40),
    noticeboard: (G.noticeboard || []).slice(-60),
    rumors:      (G.rumors      || []).filter(r => !r.resolved).slice(-25),
    // Keep only the mission pool (not the full prospect list)
    aM:          (G.aM          || []).slice(0, 24),
    prospects:   (G.prospects   || []).slice(0, 16),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE — entity table sync (background, best-effort)
// These tables mirror data from full_state for admin/analytics queries.
// Failures here do NOT affect game continuity — full_state is the source of truth.
// ─────────────────────────────────────────────────────────────────────────────

async function _syncEntityTables(playerId, G) {
  if (!supabase || !G) return
  const ts = new Date().toISOString()
  const ops = []

  // ── Shinobi ───────────────────────────────────────────────────────────────
  if (Array.isArray(G.shinobi) && G.shinobi.length) {
    const rows = G.shinobi.map(s => ({
      id:               s.id,
      player_id:        playerId,
      village_name:     G.vName || null,
      first_name:       s.fn    || null,
      last_name:        s.ln    || null,
      rank_index:       s.ri    || 0,
      age:              s.age   || 12,
      stats:            s.stats || {},
      traits:           s.traits || [],
      personality:      s.personality || null,
      injury_status:    s.status     || 'available',
      workload:         s.workload   || 'normal',
      commitment_score: s.commitmentScore || 50,
      bond_ids:         (s.bonds || []).map(b => b.otherId),
      jutsu:            s.jutsu  || [],
      career_stats:     { wins: s.wins || 0, winsS: s.winsS || 0, months: s.months || 0 },
      injury_history:   s.injuryHistory || [],
      updated_at:       ts,
    }))
    ops.push(
      supabase.from('shinobi').upsert(rows, { onConflict: 'id' })
    )
  }

  // ── Staff ─────────────────────────────────────────────────────────────────
  if (Array.isArray(G.staff) && G.staff.length) {
    const rows = G.staff.map(s => ({
      id:           s.id,
      player_id:    playerId,
      role:         s.role  || 'unknown',
      first_name:   s.fn    || null,
      last_name:    s.ln    || null,
      stats:        s.stats || {},
      salary:       s.salary || 1000,
      loyalty:      s.loyalty || 50,
      months_served: s.monthsServed || 0,
      ambition:     s.ambition || 10,
      asst_kage:    s.asstKage || false,
      hidden_flaw:  s.hiddenFlaw || null,
      updated_at:   ts,
    }))
    ops.push(
      supabase.from('staff').upsert(rows, { onConflict: 'id' })
    )
  }

  // ── Squads ────────────────────────────────────────────────────────────────
  if (Array.isArray(G.squads) && G.squads.length) {
    const rows = G.squads.map(sq => ({
      id:            sq.id,
      player_id:     playerId,
      name:          sq.n    || null,
      leader_id:     sq.lead || null,
      member_ids:    sq.members || [],
      cohesion:      sq.cohesion || 50,
      identity_name: sq.identity || null,
      win_record:    { w: sq.wins || 0, l: sq.losses || 0 },
      kia_members:   sq.fallen || [],
      updated_at:    ts,
    }))
    ops.push(
      supabase.from('squads').upsert(rows, { onConflict: 'id' })
    )
  }

  // ── Academy students ──────────────────────────────────────────────────────
  if (Array.isArray(G.intakeClass) && G.intakeClass.length) {
    const rows = G.intakeClass.map(s => ({
      id:                s.id,
      player_id:         playerId,
      first_name:        s.fn    || null,
      last_name:         s.ln    || null,
      archetype:         s.archetype || null,
      backstory:         s.backstory || null,
      potential:         s.potential || 50,
      known_potential:   s.knownPotential || false,
      training_focus:    s.focus || null,
      intensity:         s.intensity || 'normal',
      sensei_id:         s.senseiId  || null,
      months_enrolled:   s.monthsEnrolled || 0,
      milestone_history: s.milestoneHistory || [],
      curve_type:        s.curveType || null,
      updated_at:        ts,
    }))
    ops.push(
      supabase.from('academy_students').upsert(rows, { onConflict: 'id' })
    )
  }

  // ── Financial history (last snapshot) ────────────────────────────────────
  const lastFin = (G.finances?.history || []).at(-1)
  if (lastFin) {
    ops.push(
      supabase.from('financial_history').upsert({
        player_id:             playerId,
        game_month:            lastFin.month || G.month || 1,
        game_year:             lastFin.year  || G.year  || 1,
        income_breakdown:      lastFin.income  || {},
        expenditure_breakdown: lastFin.expend  || {},
        closing_balance:       G.ryo           || 0,
        net:                   lastFin.net      || 0,
      }, { onConflict: 'player_id,game_year,game_month' })
    )
  }

  // ── Tailed beasts ─────────────────────────────────────────────────────────
  if (Array.isArray(G.beasts) && G.beasts.length) {
    const rows = G.beasts.map(b => ({
      id:                b.id || b.n,
      holding_player_id: b.sealed ? playerId : null,
      beast_type:        b.n    || 'unknown',
      jinchuriki_id:     b.jk   || null,
      sync_stage:        b.sync || 0,
      lore_unlocked:     b.lore || [],
      sealed:            b.sealed || false,
      updated_at:        ts,
    }))
    ops.push(
      supabase.from('tailed_beasts').upsert(rows, { onConflict: 'id' })
    )
  }

  // Run all ops concurrently, swallow individual errors
  const results = await Promise.allSettled(ops)
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[DB] entity table op[${i}] failed:`, r.reason?.message)
    else if (r.value?.error)     console.error(`[DB] entity table op[${i}] error:`, r.value.error.message)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOMS — persist / restore
// ─────────────────────────────────────────────────────────────────────────────

/** Upsert a room's persistent metadata to Supabase. */
export async function saveRoom(room) {
  if (!supabase || !room?.code) return
  const { error } = await supabase.from('rooms').upsert({
    code:               room.code,
    host_player_id:     room.hostPlayerId || null,
    is_private:         room.isPrivate,
    max_players:        room.maxPlayers,
    auto_ready_timeout: room.autoReadyTimeout,
    player_ids:         [...room.players.values()].map(p => p.playerId).filter(Boolean),
    turn_number:        room.turnNumber,
    status:             room.status,
    settings:           room.settings || {},
    updated_at:         new Date().toISOString(),
  }, { onConflict: 'code' })
  if (error) console.error('[DB] saveRoom error:', error.message)
}

/** Load all rooms from Supabase (called on startup). Returns raw rows. */
export async function loadRooms() {
  if (!supabase) return []
  const { data, error } = await supabase.from('rooms')
    .select('*')
    .neq('status', 'closed')
  if (error) { console.error('[DB] loadRooms error:', error.message); return [] }
  return data || []
}

/** Delete a room row. Called when a room empties. */
export async function deleteRoom(code) {
  if (!supabase || !code) return
  const { error } = await supabase.from('rooms').delete().eq('code', code)
  if (error) console.error('[DB] deleteRoom error:', error.message)
}
