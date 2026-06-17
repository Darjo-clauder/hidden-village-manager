-- Hidden Village Manager — Room/Lobby Schema
-- Run after 001_init.sql

CREATE TABLE IF NOT EXISTS rooms (
  code              text        PRIMARY KEY,
  host_player_id    text,
  is_private        boolean     NOT NULL DEFAULT false,
  max_players       integer     NOT NULL DEFAULT 4,
  auto_ready_timeout integer    NOT NULL DEFAULT 15,
  player_ids        jsonb       NOT NULL DEFAULT '[]',
  turn_number       integer     NOT NULL DEFAULT 1,
  status            text        NOT NULL DEFAULT 'lobby',
  settings          jsonb       NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_status     ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_private    ON rooms(is_private, status);
CREATE INDEX IF NOT EXISTS idx_rooms_updated    ON rooms(updated_at DESC);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
-- Public rooms list is readable by anyone
CREATE POLICY "public_read_rooms" ON rooms FOR SELECT TO anon USING (is_private = false);

-- Auto-cleanup: rooms not updated in 24h are considered stale
-- (handled by server startup check, not a DB trigger, to avoid side effects)
