import { describe, it, expect } from 'vitest'
import {
  createThread, findMatchingThread, appendToThread, resolveThread,
  classifyForThread, linkToThread, pruneOldThreads, sortedThreads,
} from '../shared/utils/narrativeThreads.js'

const WHEN = { year: 1, month: 3 }

describe('createThread', () => {
  it('creates a well-formed thread', () => {
    const t = createThread(['a1', 'a2'], 'grudge', 'A vs B', 'ev1', WHEN)
    expect(t.type).toBe('grudge')
    expect(t.actorIds).toEqual(['a1', 'a2'])
    expect(t.events).toEqual(['ev1'])
    expect(t.state).toBe('open')
    expect(t.priority).toBe(1)
    expect(t.openedYear).toBe(1)
    expect(t.openedMonth).toBe(3)
    expect(typeof t.id).toBe('string')
  })
})

describe('findMatchingThread', () => {
  it('returns null for empty list', () => {
    expect(findMatchingThread([], ['a1'], 'grudge')).toBeNull()
  })

  it('finds a matching open thread', () => {
    const t = createThread(['a1'], 'grudge', 'G', 'ev1', WHEN)
    expect(findMatchingThread([t], ['a1'], 'grudge')).toBe(t)
  })

  it('does not match resolved threads', () => {
    const t = createThread(['a1'], 'grudge', 'G', 'ev1', WHEN)
    t.state = 'resolved'
    expect(findMatchingThread([t], ['a1'], 'grudge')).toBeNull()
  })

  it('does not match wrong type', () => {
    const t = createThread(['a1'], 'bond', 'B', 'ev1', WHEN)
    expect(findMatchingThread([t], ['a1'], 'grudge')).toBeNull()
  })

  it('matches by shared actor (not all actors)', () => {
    const t = createThread(['a1', 'a2'], 'kia_arc', 'K', 'ev1', WHEN)
    expect(findMatchingThread([t], ['a2', 'a3'], 'kia_arc')).toBe(t)
  })
})

describe('appendToThread', () => {
  it('appends eventId and updates timestamps', () => {
    const t = createThread(['a1'], 'bond', 'B', 'ev1', WHEN)
    appendToThread(t, 'ev2', null, { year: 2, month: 1 })
    expect(t.events).toEqual(['ev1', 'ev2'])
    expect(t.lastEventYear).toBe(2)
    expect(t.lastEventMonth).toBe(1)
  })

  it('advances state when newState provided', () => {
    const t = createThread(['a1'], 'grudge', 'G', 'ev1', WHEN)
    appendToThread(t, 'ev2', 'escalating', WHEN)
    expect(t.state).toBe('escalating')
    expect(t.priority).toBe(2)
  })

  it('does not change state when newState is null', () => {
    const t = createThread(['a1'], 'bond', 'B', 'ev1', WHEN)
    appendToThread(t, 'ev2', null, WHEN)
    expect(t.state).toBe('open')
  })
})

describe('resolveThread', () => {
  it('marks thread resolved', () => {
    const t = createThread(['a1'], 'career', 'C', 'ev1', WHEN)
    resolveThread(t, 'resolved', { year: 3, month: 5 })
    expect(t.state).toBe('resolved')
    expect(t.priority).toBe(0)
    expect(t.closedYear).toBe(3)
    expect(t.closedMonth).toBe(5)
  })

  it('marks thread tragedy', () => {
    const t = createThread(['a1'], 'kia_arc', 'K', 'ev1', WHEN)
    resolveThread(t, 'tragedy', WHEN)
    expect(t.state).toBe('tragedy')
    expect(t.priority).toBe(3)
  })
})

describe('classifyForThread', () => {
  it('maps grudge tag to grudge type', () => {
    const c = classifyForThread('grudge', [])
    expect(c.type).toBe('grudge')
    expect(c.suggestedState).toBe('escalating')
  })

  it('maps kia tag to kia_arc', () => {
    expect(classifyForThread('kia', []).type).toBe('kia_arc')
  })

  it('returns null for unthreaded tags', () => {
    expect(classifyForThread('success', [])).toBeNull()
    expect(classifyForThread('injury', [])).toBeNull()
  })
})

describe('linkToThread', () => {
  it('creates a new thread when none exists', () => {
    const threads = []
    const t = linkToThread(threads, 'ev1', 'grudge', ['a1'], 'Title', WHEN)
    expect(threads).toHaveLength(1)
    expect(t.type).toBe('grudge')
  })

  it('appends to existing matching thread', () => {
    const threads = []
    linkToThread(threads, 'ev1', 'grudge', ['a1'], 'T', WHEN)
    const t2 = linkToThread(threads, 'ev2', 'grudge', ['a1'], 'T', { year: 1, month: 5 })
    expect(threads).toHaveLength(1)
    expect(t2.events).toEqual(['ev1', 'ev2'])
  })

  it('escalates open thread on second grudge event', () => {
    const threads = []
    linkToThread(threads, 'ev1', 'grudge', ['a1'], 'T', WHEN)
    const t2 = linkToThread(threads, 'ev2', 'grudge', ['a1'], 'T', WHEN)
    expect(t2.state).toBe('escalating')
  })

  it('returns null for non-threading tags', () => {
    const threads = []
    const result = linkToThread(threads, 'ev1', 'success', ['a1'], 'T', WHEN)
    expect(result).toBeNull()
    expect(threads).toHaveLength(0)
  })
})

describe('pruneOldThreads', () => {
  it('keeps open threads regardless of age', () => {
    const t = createThread(['a1'], 'bond', 'B', 'ev1', { year: 1, month: 1 })
    const result = pruneOldThreads([t], 5, 1)
    expect(result).toHaveLength(1)
  })

  it('prunes resolved threads older than threshold', () => {
    const t = createThread(['a1'], 'bond', 'B', 'ev1', { year: 1, month: 1 })
    resolveThread(t, 'resolved', { year: 1, month: 2 })
    // currentYear=5 month=1 → age = (5-1)*12 + (1-2) = 47 months >> 12
    const result = pruneOldThreads([t], 5, 1)
    expect(result).toHaveLength(0)
  })

  it('keeps recently resolved threads', () => {
    const t = createThread(['a1'], 'bond', 'B', 'ev1', { year: 5, month: 1 })
    resolveThread(t, 'resolved', { year: 5, month: 1 })
    const result = pruneOldThreads([t], 5, 3)  // only 2 months ago
    expect(result).toHaveLength(1)
  })
})

describe('sortedThreads', () => {
  it('sorts by priority desc', () => {
    const t1 = createThread(['a1'], 'bond', 'B', 'ev1', WHEN)
    t1.priority = 1
    const t2 = createThread(['a2'], 'grudge', 'G', 'ev2', WHEN)
    t2.priority = 3
    const sorted = sortedThreads([t1, t2])
    expect(sorted[0].priority).toBe(3)
  })

  it('breaks ties by most-recent last event', () => {
    const t1 = createThread(['a1'], 'bond', 'B', 'ev1', { year: 1, month: 1 })
    const t2 = createThread(['a2'], 'bond', 'B', 'ev2', { year: 2, month: 3 })
    const sorted = sortedThreads([t1, t2])
    expect(sorted[0].actorIds).toEqual(['a2'])
  })

  it('does not mutate input', () => {
    const arr = [createThread(['a1'], 'bond', 'B', 'ev1', WHEN)]
    const sorted = sortedThreads(arr)
    expect(sorted).not.toBe(arr)
  })
})
