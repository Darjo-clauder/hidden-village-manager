-- Hidden Village Manager — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE

-- ─────────────────────────────────────────────────────────────────────────────
-- CORE PERSISTENCE
-- game_saves is the primary recovery path. Every tick upserts one row per
-- player containing the complete serialised G state. Entity tables below are
-- written in the background for queryability but are never the load source.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_saves (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id          text        UNIQUE NOT NULL,
  village_name       text        NOT NULL DEFAULT 'Hidden Village',
  kage_name          text        NOT NULL DEFAULT 'Unknown Kage',
  village_icon       text        NOT NULL DEFAULT '🍃',
  game_year          integer     NOT NULL DEFAULT 1,
  game_month         integer     NOT NULL DEFAULT 1,
  prestige_tier      text        NOT NULL DEFAULT 'D',
  legend             integer     NOT NULL DEFAULT 0,
  ryo                bigint      NOT NULL DEFAULT 60000,
  reputation         integer     NOT NULL DEFAULT 10,
  morale             integer     NOT NULL DEFAULT 75,
  full_state         jsonb       NOT NULL DEFAULT '{}',
  -- crash-recovery flag: true while a tick is in-flight
  tick_in_progress   boolean     NOT NULL DEFAULT false,
  state_version      integer     NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WORLD MAP PRESENCE
-- Lightweight row per connected village, used for the live multiplayer map.
-- Synced from the summary fields of sync_state, NOT from full_state.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS villages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      text        UNIQUE,
  name           text        NOT NULL DEFAULT 'Hidden Village',
  kage_name      text        NOT NULL DEFAULT 'Unknown',
  icon           text        NOT NULL DEFAULT '🍃',
  power          integer     NOT NULL DEFAULT 0,
  reputation     integer     NOT NULL DEFAULT 10,
  shinobi_count  integer     NOT NULL DEFAULT 0,
  ryo            bigint      NOT NULL DEFAULT 60000,
  sealed_beasts  jsonb       NOT NULL DEFAULT '[]',
  pos_x          integer     NOT NULL DEFAULT 40,
  pos_y          integer     NOT NULL DEFAULT 20,
  relations      jsonb       NOT NULL DEFAULT '{}',
  prestige_tier  text        NOT NULL DEFAULT 'D',
  online         boolean     NOT NULL DEFAULT false,
  last_seen      timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SHINOBI
-- One row per shinobi. player_id → game_saves.player_id.
-- Heavy JSONB columns (stats, traits, injury_history) kept as-is from G.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shinobi (
  id               text        PRIMARY KEY,
  player_id        text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  village_name     text,
  first_name       text,
  last_name        text,
  rank_index       integer     NOT NULL DEFAULT 0,
  age              integer     NOT NULL DEFAULT 12,
  stats            jsonb       NOT NULL DEFAULT '{}',
  traits           jsonb       NOT NULL DEFAULT '[]',
  personality      text,
  injury_status    text        NOT NULL DEFAULT 'available',
  workload         text        NOT NULL DEFAULT 'normal',
  commitment_score integer     NOT NULL DEFAULT 50,
  bond_ids         jsonb       NOT NULL DEFAULT '[]',
  jutsu            jsonb       NOT NULL DEFAULT '[]',
  career_stats     jsonb       NOT NULL DEFAULT '{}',
  injury_history   jsonb       NOT NULL DEFAULT '[]',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ACADEMY STUDENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS academy_students (
  id                text        PRIMARY KEY,
  player_id         text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  first_name        text,
  last_name         text,
  archetype         text,
  backstory         text,
  potential         integer     NOT NULL DEFAULT 50,
  known_potential   boolean     NOT NULL DEFAULT false,
  training_focus    text,
  intensity         text        NOT NULL DEFAULT 'normal',
  sensei_id         text,
  months_enrolled   integer     NOT NULL DEFAULT 0,
  milestone_history jsonb       NOT NULL DEFAULT '[]',
  curve_type        text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- STAFF
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff (
  id           text        PRIMARY KEY,
  player_id    text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  role         text        NOT NULL,
  first_name   text,
  last_name    text,
  stats        jsonb       NOT NULL DEFAULT '{}',
  salary       integer     NOT NULL DEFAULT 1000,
  loyalty      integer     NOT NULL DEFAULT 50,
  months_served real       NOT NULL DEFAULT 0,
  ambition     integer     NOT NULL DEFAULT 10,
  asst_kage    boolean     NOT NULL DEFAULT false,
  hidden_flaw  text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SQUADS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS squads (
  id            text        PRIMARY KEY,
  player_id     text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  name          text,
  leader_id     text,
  member_ids    jsonb       NOT NULL DEFAULT '[]',
  cohesion      integer     NOT NULL DEFAULT 50,
  identity_name text,
  win_record    jsonb       NOT NULL DEFAULT '{"w":0,"l":0}',
  kia_members   jsonb       NOT NULL DEFAULT '[]',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SCOUTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scouts (
  id                 text        PRIMARY KEY,
  player_id          text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  first_name         text,
  last_name          text,
  stats              jsonb       NOT NULL DEFAULT '{}',
  current_assignment text,
  fatigue            integer     NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SCOUT REPORTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scout_reports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  scout_id            text,
  prospect_name       text,
  confidence          integer     NOT NULL DEFAULT 50,
  known_stats         jsonb       NOT NULL DEFAULT '{}',
  personality_report  jsonb       NOT NULL DEFAULT '{}',
  filed_at            timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TAILED BEASTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tailed_beasts (
  id                text        PRIMARY KEY,
  holding_player_id text        REFERENCES game_saves(player_id) ON DELETE SET NULL,
  beast_type        text        NOT NULL,
  jinchuriki_id     text,
  sync_stage        integer     NOT NULL DEFAULT 0,
  lore_unlocked     jsonb       NOT NULL DEFAULT '[]',
  sealed            boolean     NOT NULL DEFAULT false,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRADE ROUTES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trade_routes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  target_village_name text,
  income_per_tick     integer     NOT NULL DEFAULT 0,
  status              text        NOT NULL DEFAULT 'active',
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INTEL REPORTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intel_reports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  target_village_id   text,
  report_type         text,
  data                jsonb       NOT NULL DEFAULT '{}',
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- WORLD EVENTS
-- Server-broadcast events visible to all players on the map.
-- Written by the server; read by clients via real-time subscription.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS world_events (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type        text        NOT NULL DEFAULT 'world',
  text              text        NOT NULL DEFAULT '',
  effect            jsonb       NOT NULL DEFAULT '{}',
  affected_villages jsonb       NOT NULL DEFAULT '[]',
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CHRONICLES
-- Append-only history log. Written in background; queried for admin/display.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chronicles (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  village_name text,
  entry_type   text        NOT NULL DEFAULT 'event',
  title        text        NOT NULL DEFAULT '',
  narrative    text        NOT NULL DEFAULT '',
  game_month   integer,
  game_year    integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INBOX / NOTICEBOARD ITEMS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inbox_items (
  id          text        PRIMARY KEY,
  player_id   text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  priority    text        NOT NULL DEFAULT 'normal',
  category    text,
  title       text,
  body        text,
  action_data jsonb       NOT NULL DEFAULT '{}',
  expires_at  timestamptz,
  actioned_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPETITION HISTORY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS competition_history (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  competition_type  text        NOT NULL DEFAULT 'chunin_exam',
  participants      jsonb       NOT NULL DEFAULT '[]',
  results           jsonb       NOT NULL DEFAULT '[]',
  promotions_earned integer     NOT NULL DEFAULT 0,
  format            text,
  held_at_year      integer,
  held_at_month     integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VILLAGE RELATIONS
-- Cross-player diplomacy. Also stores NPC village relations per player.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS village_relations (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  village_a_id             text        NOT NULL,
  village_b_id             text        NOT NULL,
  relation_score           integer     NOT NULL DEFAULT 50,
  status                   text        NOT NULL DEFAULT 'neutral',
  personal_kage_relation   integer     NOT NULL DEFAULT 50,
  history                  jsonb       NOT NULL DEFAULT '[]',
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE(village_a_id, village_b_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FINANCIAL HISTORY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_history (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id               text        NOT NULL REFERENCES game_saves(player_id) ON DELETE CASCADE,
  game_month              integer     NOT NULL,
  game_year               integer     NOT NULL,
  income_breakdown        jsonb       NOT NULL DEFAULT '{}',
  expenditure_breakdown   jsonb       NOT NULL DEFAULT '{}',
  closing_balance         bigint      NOT NULL DEFAULT 0,
  net                     integer     NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, game_year, game_month)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_game_saves_player      ON game_saves(player_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_prestige    ON game_saves(prestige_tier, legend DESC);
CREATE INDEX IF NOT EXISTS idx_villages_player        ON villages(player_id);
CREATE INDEX IF NOT EXISTS idx_villages_last_seen     ON villages(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_shinobi_player         ON shinobi(player_id);
CREATE INDEX IF NOT EXISTS idx_shinobi_rank           ON shinobi(player_id, rank_index DESC);
CREATE INDEX IF NOT EXISTS idx_academy_player         ON academy_students(player_id);
CREATE INDEX IF NOT EXISTS idx_staff_player           ON staff(player_id);
CREATE INDEX IF NOT EXISTS idx_squads_player          ON squads(player_id);
CREATE INDEX IF NOT EXISTS idx_scouts_player          ON scouts(player_id);
CREATE INDEX IF NOT EXISTS idx_chronicles_player      ON chronicles(player_id);
CREATE INDEX IF NOT EXISTS idx_chronicles_year        ON chronicles(player_id, game_year DESC, game_month DESC);
CREATE INDEX IF NOT EXISTS idx_world_events_expires   ON world_events(expires_at);
CREATE INDEX IF NOT EXISTS idx_financial_player       ON financial_history(player_id, game_year DESC, game_month DESC);
CREATE INDEX IF NOT EXISTS idx_competition_player     ON competition_history(player_id, held_at_year DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Server uses SERVICE_ROLE_KEY which bypasses RLS entirely.
-- Anon key is never used server-side; these policies block direct client access.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE game_saves          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shinobi             ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_students    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff               ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailed_beasts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_routes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chronicles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_history   ENABLE ROW LEVEL SECURITY;

-- Public read: world_events and villages map data (no sensitive fields)
ALTER TABLE world_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE village_relations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE villages            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_world_events"  ON world_events   FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_villages"      ON villages        FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_vrel"          ON village_relations FOR SELECT TO anon USING (true);

-- All other tables: service role only (no anon policies = blocked)

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER (auto-stamp updated_at on upsert)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['game_saves','shinobi','academy_students','staff','squads','scouts','tailed_beasts','village_relations']
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;
