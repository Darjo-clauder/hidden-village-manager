/**
 * Narrative thread system.
 *
 * Related blurbs are grouped into threads so stories arc over multiple months
 * rather than appearing as disconnected inbox items.
 *
 * Thread lifecycle: open → escalating → resolved | tragedy
 *
 * Threads are stored in G.narrativeThreads[]. Each thread holds the ids of the
 * narrative inbox entries that belong to it, the actors involved, and its
 * current state. The narrative engine calls appendToThread / resolveThread;
 * the inbox panel renders threads as grouped story arcs.
 *
 * Pure — no G references. Caller passes the threads array.
 */

export const THREAD_STATES  = ['open', 'escalating', 'resolved', 'tragedy']
export const THREAD_TYPES   = ['grudge', 'bond', 'rivalry', 'redemption', 'kia_arc', 'career', 'faction']

/**
 * Create a new narrative thread.
 * @param {string[]} actorIds     shinobi ids (or village names) involved
 * @param {string}   type         from THREAD_TYPES
 * @param {string}   title        human-readable thread title
 * @param {string}   firstEventId the narrative inbox entry id that opened it
 * @param {{ year:number, month:number }} when
 */
export function createThread(actorIds, type, title, firstEventId, when) {
  return {
    id:       Math.random().toString(36).slice(2),
    type,
    title,
    actorIds: [...actorIds],
    events:   [firstEventId],
    state:    'open',
    priority: 1,
    openedYear:  when.year,
    openedMonth: when.month,
    lastEventYear:  when.year,
    lastEventMonth: when.month,
  }
}

/**
 * Find an open thread that shares at least one actor and matches the type.
 * Returns the thread or null.
 * @param {object[]} threads   G.narrativeThreads
 * @param {string[]} actorIds
 * @param {string}   type
 */
export function findMatchingThread(threads, actorIds, type) {
  if (!threads || threads.length === 0) return null
  return threads.find(t =>
    (t.state === 'open' || t.state === 'escalating') &&
    t.type === type &&
    actorIds.some(id => t.actorIds.includes(id))
  ) ?? null
}

/**
 * Append an event to an existing thread, optionally advancing its state.
 * @param {object}  thread     the thread to mutate
 * @param {string}  eventId    narrative inbox entry id
 * @param {string|null} newState  'escalating' | 'resolved' | 'tragedy' | null (no change)
 * @param {{ year:number, month:number }} when
 */
export function appendToThread(thread, eventId, newState, when) {
  thread.events.push(eventId)
  thread.lastEventYear  = when.year
  thread.lastEventMonth = when.month
  if (newState && THREAD_STATES.includes(newState)) {
    thread.state = newState
    thread.priority = newState === 'escalating' ? 2 : newState === 'resolved' ? 0 : 3
  }
}

/**
 * Resolve a thread (happy ending or tragedy).
 * @param {object} thread
 * @param {'resolved'|'tragedy'} outcome
 * @param {{ year:number, month:number }} when
 */
export function resolveThread(thread, outcome, when) {
  thread.state    = outcome === 'tragedy' ? 'tragedy' : 'resolved'
  thread.priority = outcome === 'tragedy' ? 3 : 0
  thread.closedYear  = when.year
  thread.closedMonth = when.month
}

/**
 * Given a blurb tag and actorIds, decide what thread type it belongs to (or null).
 * Returns { type, suggestedState } or null if the blurb shouldn't thread.
 */
export function classifyForThread(tag, actorIds) {
  if (tag === 'grudge')    return { type: 'grudge',    suggestedState: 'escalating' }
  if (tag === 'bond')      return { type: 'bond',      suggestedState: null         }
  if (tag === 'kia')       return { type: 'kia_arc',   suggestedState: 'escalating' }
  if (tag === 'promotion') return { type: 'career',    suggestedState: null         }
  if (tag === 'intel')     return { type: 'faction',   suggestedState: null         }
  return null
}

/**
 * Top-level helper: find-or-create a thread for a new narrative blurb, then
 * append the blurb's id to it. Returns the thread (new or existing).
 *
 * @param {object[]} threads    G.narrativeThreads (mutated in-place)
 * @param {string}   eventId    the new narrative inbox entry id
 * @param {string}   tag        blurb tag
 * @param {string[]} actorIds
 * @param {string}   title      fallback title if creating new
 * @param {{ year:number, month:number }} when
 * @returns {object|null} thread, or null if this blurb doesn't thread
 */
export function linkToThread(threads, eventId, tag, actorIds, title, when) {
  const cls = classifyForThread(tag, actorIds)
  if (!cls) return null

  const existing = findMatchingThread(threads, actorIds, cls.type)
  if (existing) {
    const newState = cls.suggestedState === 'escalating' && existing.state === 'open'
      ? 'escalating'
      : null
    appendToThread(existing, eventId, newState, when)
    return existing
  }

  const thread = createThread(actorIds, cls.type, title, eventId, when)
  threads.push(thread)
  return thread
}

/**
 * Prune resolved/tragedy threads older than pruneAfterMonths.
 * Returns the cleaned array.
 */
export function pruneOldThreads(threads, currentYear, currentMonth, pruneAfterMonths = 12) {
  return threads.filter(t => {
    if (t.state !== 'resolved' && t.state !== 'tragedy') return true
    const age = (currentYear - t.closedYear) * 12 + (currentMonth - (t.closedMonth ?? 0))
    return age < pruneAfterMonths
  })
}

/**
 * Returns threads sorted by priority desc, then most-recently-active first.
 */
export function sortedThreads(threads) {
  return [...threads].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    const aAge = a.lastEventYear * 12 + a.lastEventMonth
    const bAge = b.lastEventYear * 12 + b.lastEventMonth
    return bAge - aAge
  })
}
