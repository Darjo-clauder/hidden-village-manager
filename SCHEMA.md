# Hidden Village Manager — Database Schema

Supabase (PostgreSQL) persistence layer. All tables live in the `public` schema.

## Quick Start

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env` and fill in your project URL and keys
3. Run `supabase/migrations/001_init.sql` in the Supabase SQL editor
4. Optionally run `supabase/seed.sql` to create two test villages

## Architecture

### Persistence Strategy

The game uses a **hybrid persistence model**:

| Layer | Purpose | Source of Truth |
|---|---|---|
| `game_saves.full_state` | Complete G object (JSONB) | **Yes — load path** |
| Entity tables (shinobi, staff, etc.) | Queryable mirrors | No — written in background |
| `villages` | World-map presence | Separate from G |

**Why JSONB for full state?**  
The game's G object has 200+ fields with complex nested arrays. Normalising everything would require 10+ joins on every load and massive write amplification on every tick. Instead:
- One `upsert` per tick writes all game state atomically
- Entity tables are populated in the background for admin/analytics queries
- On reconnect, the server loads `full_state` in one query and sends it to the client

### Crash Recovery

Before computing a tick, the server sets `game_saves.tick_in_progress = true`.  
After a successful save, it's cleared to `false`.

On server startup, `server/startup.js` detects any rows with `tick_in_progress = true`
(meaning the server crashed mid-tick), logs a warning, and clears the flag.
The player's last clean save is fully intact — the tick simply never completed.

### State Flow

```
Player opens tab
  → Socket connects
  → Client emits `join` with playerId (UUID from localStorage)
  → Server loads full_state from game_saves
  → Server emits `load_state` to client
  → Client merges saved state into G
  → UI updates

Player advances a month (adv())
  → Client calls syncToServer()
  → Emits `sync_state` with fullState: G
  → Server sets tick_in_progress = true
  → Server upserts game_saves with full state
  → Server clears tick_in_progress = false
  → Entity tables updated in background

Player closes tab
  → beforeunload fires syncToServer()
  → Final state written to Supabase
```

---

## Tables

### `game_saves`
Primary persistence table. One row per player.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | PK |
| `player_id` | text UNIQUE | UUID from client localStorage |
| `village_name` | text | Denormalised for display |
| `kage_name` | text | Denormalised for display |
| `village_icon` | text | Emoji icon |
| `game_year` | integer | Current in-game year |
| `game_month` | integer | Current in-game month (1–12) |
| `prestige_tier` | text | D / C / B / A / S |
| `legend` | integer | Legend score (leaderboard) |
| `ryo` | bigint | Currency (leaderboard) |
| `reputation` | integer | 0–999 |
| `morale` | integer | 0–100 |
| `full_state` | jsonb | **Complete G object** |
| `tick_in_progress` | boolean | Crash detection flag |
| `state_version` | integer | Schema version for migrations |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated by trigger |

### `villages`
Lightweight world-map presence row. Updated from the summary fields of every `sync_state` event. Not used for game-state recovery.

| Column | Type | Description |
|---|---|---|
| `player_id` | text UNIQUE | Links to game_saves |
| `name` | text | |
| `kage_name` | text | |
| `icon` | text | |
| `power` | integer | Computed from shinobi stats |
| `reputation` | integer | |
| `shinobi_count` | integer | |
| `ryo` | bigint | |
| `sealed_beasts` | jsonb | Array of beast names |
| `pos_x` / `pos_y` | integer | World map position |
| `relations` | jsonb | Diplomacy map (socket-id keyed) |
| `prestige_tier` | text | |
| `online` | boolean | Currently connected |
| `last_seen` | timestamptz | |

### `shinobi`
Mirror of `G.shinobi` array. Written in background after each save.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Matches `s.id` in G |
| `player_id` | text | FK → game_saves |
| `rank_index` | integer | 0=Genin … 4=S-Rank |
| `stats` | jsonb | `{ ninjutsu, taijutsu, genjutsu, speed, intelligence, chakra }` |
| `traits` | jsonb | Evolved trait strings |
| `injury_status` | text | available / injured / exam / mission |
| `career_stats` | jsonb | `{ wins, winsS, months }` |
| `injury_history` | jsonb | `[{ year, month, type, duration, treatment }]` |

### `academy_students`
Mirror of `G.intakeClass`.

### `staff`
Mirror of `G.staff`. Includes `ambition`, `asst_kage`, `hidden_flaw`.

### `squads`
Mirror of `G.squads`. Includes `win_record` and `kia_members`.

### `scouts`
Mirror of scouting network shinobi (type `scout`).

### `scout_reports`
Individual scouting reports filed against prospects.

### `tailed_beasts`
Global beast registry. `holding_player_id` is null when unsealed.

### `trade_routes`
Active trade contracts per player.

### `intel_reports`
ANBU/intel operation reports with expiry.

### `world_events`
Server-broadcast global events visible to all players. Publicly readable. Expire after a set duration.

### `chronicles`
Append-only narrative history. Written in background; full history also in `full_state.chronicles`.

### `inbox_items`
Pending meeting queue / noticeboard items.

### `competition_history`
One row per Chunin Exam or S-rank competition entered.

### `village_relations`
Cross-player diplomacy state. Also stores NPC village relations per player.

### `financial_history`
One row per month per player. Queryable financial timeline.

---

## Row-Level Security

All tables have RLS enabled. The server uses `SUPABASE_SERVICE_KEY` which bypasses RLS entirely — no anon key is used server-side.

Public read access (anon key) is granted only to:
- `world_events` — server-broadcast global events
- `villages` — world map data
- `village_relations` — diplomacy status

All player-specific tables (game_saves, shinobi, staff, etc.) are locked — no anon policy means blocked by default.

---

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your project URL (e.g. `https://xyz.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Service role key — server-side only, never expose to client |
| `SUPABASE_ANON_KEY` | Anon key — fallback only; used only for public-read operations |

---

## Development

Run seed data to create two test villages with full state:

```sql
-- In Supabase SQL editor:
\i supabase/seed.sql
```

Seed player IDs: `seed-player-001` (Konohagakure, Year 3, B-tier) and `seed-player-002` (Sunagakure, Year 1, D-tier).
