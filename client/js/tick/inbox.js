// Shared narrative-inbox helper, extracted from adv.js so per-tick modules
// (client/js/tick/*) can push narrative blurbs without importing back into adv.js.
import { G } from '../state.js'
import { linkToThread, pruneOldThreads } from '../../../shared/utils/narrativeThreads.js'

export function pushNarrative(blurb, actorIds = []) {
  if (!G.narrativeInbox) G.narrativeInbox = []
  if (!G.narrativeThreads) G.narrativeThreads = []
  const entry = { id: Math.random().toString(36).slice(2), ...blurb, actorIds, year: G.year, month: G.month }
  // Thread linking
  const thread = linkToThread(G.narrativeThreads, entry.id, entry.tag, actorIds, entry.title, { year: G.year, month: G.month })
  if (thread) entry.threadId = thread.id
  G.narrativeInbox.push(entry)
  if (G.narrativeInbox.length > 50) G.narrativeInbox.splice(0, G.narrativeInbox.length - 50)
  // Prune stale threads yearly
  if (G.month === 1) G.narrativeThreads = pruneOldThreads(G.narrativeThreads, G.year, G.month)
}
