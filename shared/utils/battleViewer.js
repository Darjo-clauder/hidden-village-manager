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
}

/** Deterministic narrative line for a beat. `seed` picks among variants. */
export function beatNarrative(phaseName, won, seed = 0) {
  const bank = LINES[phaseName] || { won: ['The squad prevails.'], lost: ['The squad falters.'] }
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
