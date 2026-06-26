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

  // ── Finances (P2 tranche 5) ─────────────────────────────────────────────
  'fin.none': 'No financial data yet.',
  'fin.health': 'Financial Health',
  'fin.incomeMonth': 'Income / Month',
  'fin.expenditureMonth': 'Expenditure / Month',
  'fin.total': 'TOTAL',
  'fin.monthlyNet': 'Monthly Net',
  'fin.treasury': 'Treasury',
  'fin.budgetPools': 'Budget Pools',
  'fin.wageBudget': 'WAGE BUDGET',
  'fin.transferBudget': 'TRANSFER BUDGET',
  'fin.passiveIncome': 'PASSIVE INCOME',
  'fin.maintScouts': 'Maintenance · Scouts',
  'fin.routesContracts': 'Routes · Contracts · Bonuses',
  'fin.history': 'Monthly History (last {n})',
  'fin.incomeMix': 'Income Mix',
  'fin.budgetPriority': 'Budget Priority',
  'fin.salaryCap': 'Salary Cap · Prestige {tier}',
  'fin.daimyoObjectives': 'Daimyo Objectives — Year {year}',
  'fin.sponsorship': 'Sponsorship',
  'fin.blackMarket': 'Black Market Ledger (Off-Books)',
  'fin.report': 'Year {year} Financial Report',

  // ── Roster list (P2 tranche 6; dossier internals deferred) ──────────────
  'roster.clanComposition': 'Clan Composition',
  'roster.developmentPath': 'Development Path',
  'roster.none': 'No shinobi. Recruit from Academy.',
  'roster.noAssignments': 'No active assignments.',
  'roster.header': 'Roster — {n} shinobi',
  'roster.fullDossier': 'Full Dossier ▸',

  // ── Squads (P2 tranche 7) ───────────────────────────────────────────────
  'squad.none': 'No squads.',
  'squad.fitMatrix': 'Squad Fit Matrix — by mission specialty',
  'squad.formation': 'Formation',
  'squad.fallen': 'Fallen',
  'squad.noJonin': 'No available Jonin+.',
  'squad.noSynergy': 'No synergy detected.',
  'squad.synergyPreview': 'Synergy Preview',
  'squad.noDepthBonuses': 'No depth chart bonuses assigned.',
  'squad.tacticalApproach': "Tactical Approach — matched per mission's specialty",
  'squad.noMissions': 'No squad missions.',

  // ── Academy (P2 tranche 8) ──────────────────────────────────────────────
  'academy.title': 'Academy Prospects',
  'academy.tab.prospects': 'Prospects',
  'academy.tab.pipeline': 'Mentor Pipeline',
  'academy.mentorships.none': 'No active mentorships. Open a shinobi dossier (Career tab) to assign one.',
  'academy.endMentorship': 'End Mentorship',
  'academy.letGo': 'Let go',
  'academy.noPlan': 'No plan assigned',
  'academy.assignSensei': 'Assign Sensei',
  'academy.recruit': 'Recruit — 2,000 ryo ►',
  'academy.prospects.none': 'No prospects. Advance month.',
  'academy.assign': 'Assign ►',

  // ── Static panel titles (P2 tranche 9 — batch via data-i18n) ────────────
  'panel.roster': 'Shinobi Force',
  'panel.clans': 'Clan Roster',
  'panel.safehouses': 'Scout Safehouses',
  'panel.squads': 'Squads',
  'panel.missions': 'Missions',
  'panel.upgrades': 'Village Upgrades',
  'panel.economy': 'Trade Routes & Contracts',
  'panel.village': 'Village Overview',
  'panel.summit': 'Five Kage Summit',
  'panel.exam': 'Chunin Exam',
  'panel.intel': 'Intel Operations',
  'panel.calendar': 'World Events Calendar',
  'panel.log': 'Event Log',
  'panel.chronicles': 'Village Chronicles',
  'panel.memorial': 'Memorial Wall',
  'panel.finances': 'Village Finances',
  'panel.staff': 'Staff Management',
  'panel.scouting': 'Scouting Network',
  'panel.youthAcademy': 'Youth Academy',
  'panel.people': 'People Management',
  'panel.transfers': 'Transfer Market & Bingo Book',
  'panel.legacy': 'Legacy & Prestige',
  'panel.kagePath': 'Kage Path',
  'panel.worldMap': 'World Map',
  'panel.activeVillages': 'Active Villages',

  // ── Village overview (P2 tranche 10) ────────────────────────────────────
  'village.card.prestige': 'Prestige Standing',
  'village.card.finances': 'Monthly Finances',
  'village.card.roster': 'Roster',
  'village.card.morale': 'Morale & Standing',
  'village.card.infrastructure': 'Infrastructure',
  'village.card.climate': 'World Climate',
  'village.card.beasts': 'Tailed Beasts',
  'village.income': 'Income',
  'village.expenses': 'Expenses',
  'village.net': 'Net',
  'village.economy': 'Economy',
  'village.region': 'Region',
  'village.doctrine': 'Doctrine',

  // ── Kage Path (P2 tranche 10) ───────────────────────────────────────────
  'kagedev.noPoints': 'No points to spend',
  'kagedev.attributes': 'Attributes',

  // ── Legacy & Prestige (P2 tranche 10) ───────────────────────────────────
  'legacy.villagePrestige': 'Village Prestige',
  'legacy.kageReputation': 'Kage Reputation',
  'legacy.recordedUpsets': 'Recorded Upsets',
  'legacy.currentSuccessor': 'Current Successor',
  'legacy.clearDesignation': 'Clear Designation',
  'legacy.designateFromShinobi': 'Designate from Shinobi',
  'legacy.designate': 'Designate',
  'legacy.noEligibleJonin': 'No eligible Jonin+ shinobi.',
  'legacy.designateFromStaff': 'Designate from Staff',
  'legacy.noStaff': 'No staff available.',
  'legacy.pastDecisions': 'Past Legacy Decisions',
  'legacy.noAwards': 'No awards data.',
  'legacy.standings': 'Standings',
  'legacy.winLeaders': 'Win Leaders',
  'legacy.noData': 'No data',
  'legacy.awards': 'Awards',

  // ── Staff (P2 tranche 11) ───────────────────────────────────────────────
  'staff.hire': 'Hire ▸',
  'staff.release': 'Release',
  'staff.designateAK': 'Designate AK',
  'staff.removeAK': 'Remove AK',
  'staff.meeting': '1-on-1 Meeting',
  'staff.retireToStaff': 'Retire to Staff',
  'staff.akDecisions': 'Assistant Kage Decisions',
  'staff.akAutonomous': 'Autonomous decisions made on minor meetings.',
  'staff.hallNote': 'Staff who served 8+ years are enshrined here permanently. Their legacy endures.',
  'staff.scout': 'Scout (2,000 ryo) ▸',

  // ── Transfers (P2 tranche 11) ───────────────────────────────────────────
  'transfers.refreshPool': 'Refresh Pool',
  'transfers.sort': 'Sort',
  'transfers.insufficientFunds': 'Insufficient funds',
  'transfers.loyaltyCheck': 'Loyalty check',
  'transfers.recallEarly': 'Recall early',
  'transfers.sendOnLoanHdr': 'Send Shinobi on Loan',
  'transfers.sendOnLoan': 'Send on Loan',
  'transfers.acceptCounter': 'Accept Counter',
  'transfers.noCompleted': 'No completed transfers yet.',

  // ── Long-tail panels (P2 tranche 12) ────────────────────────────────────
  // Chronicles
  'chronicles.noEntries': 'No entries yet. Major events are recorded here automatically.',
  'chronicles.noMatch': 'No entries match this filter.',
  'chronicles.all': 'All',
  'chronicles.search': 'Search…',
  // Memorial
  'memorial.none': 'No fallen shinobi recorded. May it stay this way.',
  'memorial.fallen': 'Fallen',
  'memorial.honored': 'Honored',
  'memorial.missionsServed': 'Missions Served',
  'memorial.inMemory': 'In memory of those who served',
  // Upgrades
  'upgrades.defenseRating': 'Defense Rating',
  'upgrades.upkeep': 'Upkeep / Month',
  'upgrades.maintNote': 'Maintenance scales with building levels',
  'upgrades.districts': 'Districts',
  // Clans
  'clans.noMembers': 'No clan members active',
  'clans.activePassives': 'Active Bloodline Passives — Village Total',
  'clans.chains': 'Clan Chains',
  'clans.launch': 'Launch',
  // Safehouses
  'safehouses.abort': 'Abort (recall agent)',
  'safehouses.networkStatus': 'Network Status',
  'safehouses.deepCover': 'Deep Cover Operations',
  'safehouses.establishFirst': 'Establish a safehouse to launch deep cover ops.',
  'safehouses.noEligible': 'No eligible shinobi.',
  'safehouses.deploy': 'Deploy',
}
