/**
 * Promises ledger — commitments made to shinobi, tracked to a deadline.
 *
 * FM-style: promises are made in negotiations (signing-day role guarantees,
 * promotion timelines), recorded here, and resolved KEPT or BROKEN with morale/
 * commitment consequences applied by the caller (adv.js owns the G mutations).
 * The ledger is the player-visible half the old implicit fields lacked: open
 * promises show in People Management and the dossier, so a deadline is a plan
 * rather than an ambush.
 *
 * Entry: { id, shinobiId, name, type, detail, riAt, madeYear, madeMonth,
 *          dueYear, dueMonth, status: 'open'|'kept'|'broken', resolvedYear? }
 *
 * Pure helpers; no G access. Unit-tested.
 */

export const PROMISE_TYPES = {
  promotion:  { id: 'promotion',  label: 'Promotion promised',   icon: '🎖' },
  deployment: { id: 'deployment', label: 'Regular deployment',   icon: '⚔' },
}

const CAP = 30

/** Create + append a promise. Returns the entry. */
export function createPromise(list, { shinobiId, name, type, detail = '', riAt = null, madeYear, madeMonth, dueYear, dueMonth }) {
  const entry = {
    id: Math.random().toString(36).slice(2),
    shinobiId, name, type, detail, riAt,
    madeYear, madeMonth, dueYear, dueMonth,
    status: 'open',
  }
  list.push(entry)
  if (list.length > CAP) {
    // Drop the oldest RESOLVED entry first; never silently drop an open promise.
    const idx = list.findIndex(p => p.status !== 'open')
    list.splice(idx >= 0 ? idx : 0, 1)
  }
  return entry
}

/** Mark an entry kept/broken. Returns it (or null). */
export function resolvePromise(list, id, status, year = null) {
  const p = list.find(x => x.id === id)
  if (!p || p.status !== 'open') return null
  p.status = status
  if (year != null) p.resolvedYear = year
  return p
}

export function openPromises(list) { return (list || []).filter(p => p.status === 'open') }

export function promisesFor(list, shinobiId) { return (list || []).filter(p => p.shinobiId === shinobiId) }

/** True once the game date reaches the due date. */
export function isPastDue(p, year, month) {
  return year > p.dueYear || (year === p.dueYear && month >= p.dueMonth)
}

/** Months from (y1,m1) to (y2,m2) — for "due in N months" UI. */
export function monthsUntil(y1, m1, y2, m2) {
  return (y2 - y1) * 12 + (m2 - m1)
}
