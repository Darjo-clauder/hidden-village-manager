/**
 * English UI string table (L10N) — the `ui.*` namespace: translatable microcopy.
 *
 * Keys are dotted by area (nav.*, btn.*, turn.*, season.*, …). This table is seeded
 * with the foundational/high-traffic chrome; panels are converted tranche by tranche
 * (see docs/L10N_PLAN.md). IP-named entities (clans, villages, ranks, jutsu, beasts)
 * do NOT live here — they resolve through the IP namespace (shared/i18n/ipNames.js)
 * so an IP-neutral build can swap them without touching these strings.
 *
 * ICU is supported in values, e.g. "{n, plural, one {# decision} other {# decisions}}".
 */
export const en = {
  // Continue / turn loop
  'turn.ready': 'End Turn',
  'turn.pending': '{n, plural, one {# decision} other {# decisions}} pending',
  'turn.blocked': 'Resolve first',

  // Generic verbs / buttons
  'btn.confirm': 'Confirm',
  'btn.cancel': 'Cancel',
  'btn.recruit': 'Recruit',
  'btn.scout': 'Scout',
  'btn.close': 'Close',

  // Season / standings
  'season.standings': 'Season Standings',
  'season.fixtures': '{village} — Fixtures',
  'season.round': 'Round {n}',
  'season.leagueGrid': 'League Fixture Grid — all villages',
  'season.played': 'played',
  'season.upcoming': 'upcoming',

  // Units / common
  'unit.ryo': '{amount, number} ryo',
  'common.you': 'you',
  'common.none': '—',
}
