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
  // Continue / turn loop (ContinueButton — see client/js/ui.js)
  'turn.ready': 'End Turn ▸ {month}',
  'turn.ready.title': 'Advance to {month} Y{year}.',
  'turn.pending': 'End Turn ▸',
  'turn.pending.title': '{n, plural, one {# decision} other {# decisions}} pending in your inbox — you may still advance.',
  'turn.blocked': 'Resolve to continue',
  'turn.blocked.title': 'A required decision is unresolved.',
  'turn.resolveFirst': 'Resolve the pending decision first.',

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

  // ── Sidebar nav (P2 tranche 1) ──────────────────────────────────────────
  // Group headers
  'nav.group.village': 'Village',
  'nav.group.roster': 'Roster',
  'nav.group.dev': 'Development',
  'nav.group.staff': 'Staff',
  'nav.group.comp': 'Competitions',
  'nav.group.dip': 'Diplomacy',
  'nav.group.beasts': 'Tailed Beasts',
  'nav.group.market': 'Market',
  'nav.group.world': 'World',
  // Top-level items
  'nav.inbox': '📬 Inbox',
  'nav.dashboard': 'Dashboard',
  // Village
  'nav.overview': 'Overview',
  'nav.finances': 'Finances',
  'nav.upgrades': 'Upgrades',
  'nav.kagePath': 'Kage Path',
  'nav.legacy': 'Legacy & Prestige',
  'nav.chronicles': 'Chronicles',
  'nav.memorial': 'Memorial Wall',
  // Roster
  'nav.shinobi': 'Shinobi',
  'nav.squads': 'Squads',
  'nav.depth': 'Depth Chart',
  'nav.missions': 'Missions',
  'nav.people': 'People',
  'nav.clans': 'Clans',
  'nav.safehouses': 'Safehouses',
  // Development
  'nav.youthAcademy': 'Youth Academy',
  'nav.prospects': 'Prospects',
  'nav.scouting': 'Scouting Network',
  // Staff
  'nav.allStaff': 'All Staff',
  // Competitions
  'nav.chuninExam': 'Chunin Exam',
  'nav.summit': 'Five Kage Summit',
  'nav.eventLog': 'Event Log',
  // Diplomacy
  'nav.relations': 'Village Relations',
  'nav.intel': 'Intel',
  'nav.tradeRoutes': 'Trade Routes',
  'nav.calendar': '📅 Calendar',
  // Tailed Beasts
  'nav.beastStatus': 'Beast Status',
  // Market
  'nav.transferMarket': 'Transfer Market',
  // World
  'nav.worldMap': 'World Map',
  'nav.roomLobby': 'Room Lobby',

  // Sidebar status strip
  'status.offline': 'Offline',
  'status.date': 'Date',
  'status.ryo': 'Ryo',
  'status.rep': 'Rep',
  'status.force': 'Force',

  // ── Dashboard (P2 tranche 2) ────────────────────────────────────────────
  'dash.title': 'Dashboard — Y{year} M{month}',
  'dash.stance': 'Stance',
  'dash.nation': 'Nation',
  'dash.perMonth': '/ month',
  // Decision digest
  'digest.clearTitle': '✓ No decisions pending',
  'digest.clearSub': 'The village runs smoothly. End the turn when ready.',
  'digest.header': '⚑ Pending Decisions',
  'digest.examInProgress': 'Chunin Exam in progress',
  'digest.warInProgress': 'Nation War in progress',
  'digest.fieldDecision': 'A field decision must be resolved',
  'digest.resolve': 'Resolve ▸',
  'digest.go': 'Go ▸',
  // Health cards
  'card.treasury': 'Treasury',
  'card.rosterDepth': 'Roster Depth',
  'card.academy': 'Academy',
  'card.academy.students': 'students in training',
  'card.academy.prospects': '{n} prospects available',
  'card.morale': 'Morale',
  'card.social': 'Social',
  // Section headers + empty states
  'section.alerts': 'At-Risk Alerts',
  'section.alerts.none': 'No alerts — village is in good standing.',
  'section.events': 'Upcoming Events',
  'section.lastMonth': "Last Month's Events",
  'section.lastMonth.none': 'No events recorded yet. Advance a month to begin.',
  'section.worldEvents': 'Active World Events',

  // ── Inbox (P2 tranche 3) ────────────────────────────────────────────────
  'inbox.title': 'Inbox',
  'inbox.tab.active': 'Inbox ({n})',
  'inbox.tab.threads': 'Story Threads',
  'inbox.filter.all': 'All ({n})',
  'inbox.dismissInfo': 'Dismiss {n} info ✕',
  'inbox.urgent': 'Urgent ({n})',
  'inbox.standard': 'Standard ({n})',
  'inbox.info': 'Info ({n})',
  'inbox.clear': 'Inbox clear — no pending items.',
  'inbox.threads.none': 'No active story threads. Play missions to build them.',
  // Story-thread state badges
  'thread.state.open': 'Open',
  'thread.state.escalating': 'Escalating',
  'thread.state.resolved': 'Resolved',
  'thread.state.tragedy': 'Tragedy',

  // ── Missions board (P2 tranche 4) ───────────────────────────────────────
  'mission.inspector.empty': 'Select a mission to see its briefing, intel and best-fit squad.',
  'mission.briefing': 'Mission Briefing',
  'mission.deploy': 'Deploy',
  'mission.assign': 'Assign ►',
  'mission.assignSquad': 'Assign Squad ►',
  'mission.civilianContracts': 'Civilian Contracts (D-rank)',
  'mission.noThreats': 'No active threats.',
  'mission.chains.none': 'No active mission chains. They spawn randomly each month (8% chance).',
  'mission.chains.active': 'Active Chains',
  'mission.chains.completed': 'Completed Chains',
  'mission.log.none': 'No missions logged yet.',
}
