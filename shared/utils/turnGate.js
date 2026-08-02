/**
 * What stops the month advancing.
 *
 * This rule used to live only in `ui.js`: `continueTurn()` checked for pending
 * decisions and routed the player to them, while `endTurn()` and `adv()` had no
 * opinion at all. Both are bound to `window`, so anything that called the wrong
 * one drove the simulation straight over an unanswered council mandate or an
 * invoked pact. That is not hypothetical — it is how the QA harness for this
 * project was driving turns, and it silently produced months the player never
 * actually played through.
 *
 * The predicate lives here so the UI and the tick share one definition. The UI
 * still decides WHERE to send the player, which is properly a presentation
 * concern; the tick uses the same list to decide whether it may run at all.
 *
 * Order matters: the first match wins, and it determines which screen the
 * player is routed to. Most-specific and most-interrupting first.
 */

export const TURN_BLOCKERS = [
  { id: 'worldchoice', panel: null,    label: 'A world event is waiting on your decision.',
    test: G => !!G?.pendingChoiceEvent },
  { id: 'obligation',  panel: 'kage',  label: 'An ally has invoked a pact.',
    test: G => !!G?.pendingObligation },
  { id: 'inbox',       panel: 'inbox', label: 'A decision in your inbox is unresolved.',
    test: G => !!G?.pendingQuickDecision },
  { id: 'exam',        panel: 'exam',  label: 'The Adept Exam is in progress.',
    test: G => !!G?.examActive },
  { id: 'war',         panel: 'exam',  label: 'A war is in progress.',
    test: G => !!G?.warActive },
]

/** The blocker holding the turn, or null if the month may advance. */
export function turnBlocker(G) {
  for (const b of TURN_BLOCKERS) {
    let hit = false
    try { hit = !!b.test(G) } catch { hit = false }
    if (hit) return b
  }
  return null
}

export function canAdvanceTurn(G) { return turnBlocker(G) === null }

/** Ids only — useful for tests and for clearing state in a harness. */
export const BLOCKER_IDS = TURN_BLOCKERS.map(b => b.id)
