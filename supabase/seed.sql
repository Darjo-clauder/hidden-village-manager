-- Hidden Village Manager — Seed Data
-- Creates two sample villages for development/testing.
-- Run AFTER 001_init.sql.
-- WARNING: deletes existing seed data first — development only.

-- ─────────────────────────────────────────────────────────────────────────────
-- Clean existing seed records
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM game_saves  WHERE player_id IN ('seed-player-001', 'seed-player-002');
DELETE FROM villages    WHERE player_id IN ('seed-player-001', 'seed-player-002');

-- ─────────────────────────────────────────────────────────────────────────────
-- Village 1 — Konohagakure (Year 3, B-tier, well-developed)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO game_saves (
  player_id, village_name, kage_name, village_icon,
  game_year, game_month, prestige_tier, legend, ryo, reputation, morale,
  full_state, tick_in_progress, state_version
) VALUES (
  'seed-player-001',
  'Konohagakure',
  'Minato Namikaze',
  '🍃',
  3, 4, 'B', 180, 142000, 85, 82,
  jsonb_build_object(
    'vName',        'Konohagakure',
    'kName',        'Minato Namikaze',
    'vIcon',        '🍃',
    'year',         3,
    'month',        4,
    'ryo',          142000,
    'reputation',   85,
    'morale',       82,
    'legend',       180,
    'prestigeTier', 'B',
    'kageRep',      3,
    'shinobi',      '[]'::jsonb,
    'squads',       '[]'::jsonb,
    'staff',        '[]'::jsonb,
    'intakeClass',  '[]'::jsonb,
    'upgrades',     jsonb_build_object('academy',2,'hospital',1,'wall',1,'intel',1,'training',1,'seal',0),
    'examSched',    false,
    'examActive',   false,
    'examResults',  '[]'::jsonb,
    'examCands',    '[]'::jsonb,
    'chronicles',   jsonb_build_array(
      jsonb_build_object('title','Dynasty Begins','body','Year 1 starts. Legend: 0.','type','event','year',1,'month',1),
      jsonb_build_object('title','First Exam Win','body','Three genin promoted in the spring exam.','type','milestone','year',2,'month',3)
    ),
    'memorial',     '[]'::jsonb,
    'hallOfLegends','[]'::jsonb,
    'dynastyRecords', jsonb_build_object('examWins',3,'peakLegend',180,'beastCaptures','[]'::jsonb),
    'finances', jsonb_build_object(
      'history',        '[]'::jsonb,
      'deficitMonths',  0,
      'healthTier',     'Stable',
      'lastMonthNet',   4200
    ),
    'summitHistory','[]'::jsonb,
    'warState',     null,
    'warConsequences', null,
    'examHistoricalRecords', jsonb_build_object('totalPromotions',3,'bestSingleExam',3,'bestSingleExamYear',2),
    'upsetHistory', '[]'::jsonb,
    'kageRelations', '{}'::jsonb,
    'worldReputationText', 'A capable village on the rise — rivals are paying attention.',
    'legacyDecisionPending', null,
    'legacyDecisionHistory', '[]'::jsonb,
    'successorId',  null,
    'dynastyContinuityScore', 0,
    'staffHallOfFame', '[]'::jsonb,
    'asstKageLog',  '[]'::jsonb,
    'beasts',       '[]'::jsonb,
    'villages',     '[]'::jsonb,
    'tradeRoutes',  '[]'::jsonb,
    'anbuOps',      '[]'::jsonb,
    'intelReports', '[]'::jsonb,
    'worldFlags',   '{}'::jsonb,
    'harmonyScore', 72,
    'meetingQueue', '[]'::jsonb,
    'noticeboard',  '[]'::jsonb,
    'log',          '[]'::jsonb
  ),
  false, 1
);

INSERT INTO villages (player_id, name, kage_name, icon, power, reputation, shinobi_count, ryo, pos_x, pos_y, prestige_tier, online)
VALUES ('seed-player-001', 'Konohagakure', 'Minato Namikaze', '🍃', 210, 85, 14, 142000, 38, 22, 'B', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- Village 2 — Sunagakure (Year 1, D-tier, just starting)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO game_saves (
  player_id, village_name, kage_name, village_icon,
  game_year, game_month, prestige_tier, legend, ryo, reputation, morale,
  full_state, tick_in_progress, state_version
) VALUES (
  'seed-player-002',
  'Sunagakure',
  'Rasa',
  '🏜',
  1, 2, 'D', 0, 63500, 12, 70,
  jsonb_build_object(
    'vName',        'Sunagakure',
    'kName',        'Rasa',
    'vIcon',        '🏜',
    'year',         1,
    'month',        2,
    'ryo',          63500,
    'reputation',   12,
    'morale',       70,
    'legend',       0,
    'prestigeTier', 'D',
    'kageRep',      1,
    'shinobi',      '[]'::jsonb,
    'squads',       '[]'::jsonb,
    'staff',        '[]'::jsonb,
    'intakeClass',  '[]'::jsonb,
    'upgrades',     jsonb_build_object('academy',0,'hospital',0,'wall',0,'intel',0,'training',0,'seal',0),
    'examSched',    false,
    'examActive',   false,
    'examResults',  '[]'::jsonb,
    'examCands',    '[]'::jsonb,
    'chronicles',   jsonb_build_array(
      jsonb_build_object('title','Dynasty Begins','body','Year 1 starts. The desert holds secrets.','type','event','year',1,'month',1)
    ),
    'memorial',     '[]'::jsonb,
    'hallOfLegends','[]'::jsonb,
    'dynastyRecords', jsonb_build_object('examWins',0,'peakLegend',0,'beastCaptures','[]'::jsonb),
    'finances', jsonb_build_object(
      'history',       '[]'::jsonb,
      'deficitMonths', 0,
      'healthTier',    'Stable',
      'lastMonthNet',  500
    ),
    'summitHistory','[]'::jsonb,
    'warState',     null,
    'warConsequences', null,
    'examHistoricalRecords', jsonb_build_object('totalPromotions',0,'bestSingleExam',0),
    'upsetHistory', '[]'::jsonb,
    'kageRelations', '{}'::jsonb,
    'worldReputationText', 'A new village finding its footing in a competitive world.',
    'legacyDecisionPending', null,
    'legacyDecisionHistory', '[]'::jsonb,
    'successorId',  null,
    'dynastyContinuityScore', 0,
    'staffHallOfFame', '[]'::jsonb,
    'asstKageLog',  '[]'::jsonb,
    'beasts',       '[]'::jsonb,
    'villages',     '[]'::jsonb,
    'tradeRoutes',  '[]'::jsonb,
    'anbuOps',      '[]'::jsonb,
    'intelReports', '[]'::jsonb,
    'worldFlags',   '{}'::jsonb,
    'harmonyScore', 70,
    'meetingQueue', '[]'::jsonb,
    'noticeboard',  '[]'::jsonb,
    'log',          '[]'::jsonb
  ),
  false, 1
);

INSERT INTO villages (player_id, name, kage_name, icon, power, reputation, shinobi_count, ryo, pos_x, pos_y, prestige_tier, online)
VALUES ('seed-player-002', 'Sunagakure', 'Rasa', '🏜', 45, 12, 4, 63500, 55, 30, 'D', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed world_events
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO world_events (event_type, text, effect, expires_at)
VALUES
  ('trade', 'A merchant caravan opens new trade routes — all villages gain +500 ryo.',
   '{"ryo": 500}'::jsonb,
   now() + interval '1 day'),
  ('tension', 'Border skirmishes reported near the Land of Wind. Villages on high alert.',
   '{}'::jsonb,
   now() + interval '2 days');
