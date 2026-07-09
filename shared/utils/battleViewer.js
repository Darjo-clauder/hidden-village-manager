/**
 * Live battle viewer model (pure) — drives the watch-it-unfold reveal of an
 * already-resolved operation. The OUTCOME is predetermined by the engine
 * (resolveMission); this module only sequences the presentation, so it never
 * affects balance. DOM-free and deterministic → unit-testable.
 */

/**
 * Running momentum (0–100) after each contested beat. Starts at `start`, swings
 * by `swing` per beat (won → up, lost → down), clamped to a readable band.
 * Returns one value per phase, in order.
 */
export function battleMomentum(phases, start = 50, swing = 22) {
  let m = start
  return (phases || []).map(p => {
    m += p.won ? swing : -swing
    m = Math.max(8, Math.min(92, m))
    return Math.round(m)
  })
}

// Flavor banks per phase × outcome. Index chosen deterministically per call site.
const LINES = {
  Infiltration: {
    won:  ['Slipped past the perimeter unseen.', 'The approach goes clean — no alarms.', 'Shadows swallow the squad; they are in.'],
    lost: ['A sentry stirs — the entry is messy.', 'Tripwire. The element of surprise is gone.', 'Spotted at the wall; they fight in.'],
  },
  Engagement: {
    won:  ['The clash breaks their way — decisively.', 'Jutsu lands true; the enemy reels.', 'A clean exchange, advantage seized.'],
    lost: ['The enemy counters hard; the squad gives ground.', 'Outmaneuvered in the open — costly blows land.', 'The engagement turns sour, fast.'],
  },
  Extraction: {
    won:  ['Objective secured — they melt away.', 'A textbook exfil under cover of dusk.', 'Clean break; pursuit never finds them.'],
    lost: ['The exit collapses — they barely escape.', 'Hounded on the way out, blood on the trail.', 'Extraction botched; they limp home.'],
  },
  // Grand Tournament stages
  Mobilization: {
    won:  ['The contingent answers the call, battle-ready.', 'Banners raised — the village marches as one.'],
    lost: ['The muster falters; squads scatter in confusion.', 'A ragged mobilization — momentum lost before a blow.'],
  },
  'The Front': {
    won:  ['They hold the line against the great powers.', 'Steel meets steel — the front holds firm.'],
    lost: ['The line buckles; the front is overrun.', 'Routed at the front, the dead left behind.'],
  },
  'Decisive Engagement': {
    won:  ['A duel for the ages — and they break their rival.', 'The decisive clash breaks their way.'],
    lost: ['Overrun in the decisive engagement.', 'Outfought when it mattered most.'],
  },
  'Final Stand': {
    won:  ['The last squads stand unbroken — champions.', 'Through fire and blood, they endure to the end.'],
    lost: ['They fall at the final stand, honour intact.', 'So close — undone at the last.'],
  },
  // Adept Exam stages
  Qualifier: {
    won:  ['They breeze through the written test.', 'Sharp minds — the qualifier is no obstacle.'],
    lost: ['The written test trips them up — out early.', 'Caught out by the qualifier.'],
  },
  Quarterfinal: {
    won:  ['Through the Forest of Death — scroll secured.', 'They survive the forest and press on.'],
    lost: ['Lost in the Forest of Death — eliminated.', 'The forest claims them; the scroll slips away.'],
  },
  Semifinal: {
    won:  ['They win the preliminary duels in style.', 'A commanding semifinal — into the last round.'],
    lost: ['Edged out in the semifinal duels.', 'Beaten in the prelims, a step from the final.'],
  },
  Final: {
    won:  ['Champions of the Adept Exam!', 'They stand above all five villages.'],
    lost: ['Runners-up — the title stays out of reach.', 'They reach the final but fall at the last.'],
  },
}

/** Deterministic narrative line for a beat. `seed` picks among variants. */
export function beatNarrative(phaseName, won, seed = 0) {
  const bank = LINES[phaseName] || { won: ['The squad prevails.'], lost: ['The squad falters.'] }
  const arr = won ? bank.won : bank.lost
  return arr[Math.abs(seed) % arr.length]
}

// ── Role-aware beat spotlight ──────────────────────────────────────────────────
// Which squad role naturally drives each phase — used to pick the shinobi the
// beat narration names. Falls back to rotating through whoever's on the squad.
const PHASE_ROLE_PREF = {
  Infiltration: 'intel', Qualifier: 'intel',
  Engagement: 'vanguard', 'The Front': 'vanguard', 'Decisive Engagement': 'vanguard',
  Quarterfinal: 'vanguard', Semifinal: 'vanguard', Mobilization: 'support',
  Extraction: 'medical', Final: 'support', 'Final Stand': 'medical',
}

/** Pick the role to spotlight this beat: the phase's natural driver if the squad
 *  fields it, else a stable rotation through the roles present. */
export function spotlightRole(roles, phaseName, seed = 0) {
  if (!roles || !roles.length) return null
  const pref = PHASE_ROLE_PREF[phaseName]
  if (pref && roles.includes(pref)) return pref
  return roles[Math.abs(seed) % roles.length]
}

// Verb phrases that read after a shinobi's name — "Seiji forces the breach."
const ROLE_ACTIONS = {
  vanguard: { won: ['forces the breach', 'bulls through the front line', 'trades blows and comes out ahead'],
              lost: ['is beaten back from the line', 'is overwhelmed at the front', 'takes the worst of the exchange'] },
  support:  { won: ['swings the tempo with a well-timed jutsu', 'covers the squad and turns the exchange', 'lands the support strike that breaks the deadlock'],
              lost: ['is caught out of position', "can't stem the counter", 'is pulled off the play'] },
  intel:    { won: ['reads the ground and finds the gap', 'calls the opening before it shows', 'threads the squad through unseen'],
              lost: ['misreads the approach', 'is a step behind the play', 'loses the thread of the terrain'] },
  medical:  { won: ['keeps the squad on its feet', 'patches them through the worst of it', 'holds the line with steady hands'],
              lost: ['is stretched too thin to help', "can't reach them in time", 'is forced back before the wounded'] },
  flex:     { won: ['adapts on the fly and seizes it', 'improvises a way through', 'reads the moment and takes it'],
              lost: ['is pulled out of shape', 'loses the thread of the fight', 'is left chasing the exchange'] },
}

/** Verb phrase (nameable) for a role's action on a won/lost beat. */
export function roleBeatFlavor(role, won, seed = 0) {
  const bank = ROLE_ACTIONS[role] || ROLE_ACTIONS.flex
  const arr = won ? bank.won : bank.lost
  return arr[Math.abs(seed) % arr.length]
}

/**
 * Build the full reveal sequence for a report's phases:
 * [{ name, won, momentum, line }] — everything the viewer needs to play, in order.
 */
export function battleSequence(phases, seed = 0) {
  const mom = battleMomentum(phases)
  return (phases || []).map((p, i) => ({
    name: p.name, won: p.won, momentum: mom[i],
    line: beatNarrative(p.name, p.won, seed + i),
  }))
}

/** One-line verdict from the final quality band. */
export function battleVerdict(quality, succeeded) {
  const map = {
    decisive: 'A decisive success — flawlessly executed.',
    narrow:   'A narrow win — it could have gone either way.',
    costly:   'A costly failure — the objective slipped away.',
    disaster: 'A disaster — nothing went to plan.',
  }
  return map[quality] || (succeeded ? 'Mission accomplished.' : 'Mission failed.')
}
