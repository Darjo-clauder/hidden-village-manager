import { describe, it, expect } from 'vitest'
import {
  WORLD_EVENTS,
  WE_BY_ID,
  getEventForMonth,
  getUpcomingEvent,
  resolveWorldEvent,
} from '../shared/constants/worldCalendar.js'

describe('WORLD_EVENTS', () => {
  it('has 6 events', () => {
    expect(WORLD_EVENTS).toHaveLength(6)
  })

  it('all events have unique months', () => {
    const months = WORLD_EVENTS.map(e => e.month)
    expect(new Set(months).size).toBe(6)
  })

  it('all events have 3 choices', () => {
    for (const ev of WORLD_EVENTS) {
      expect(ev.choices).toHaveLength(3)
    }
  })

  it('WE_BY_ID indexes all events', () => {
    for (const ev of WORLD_EVENTS) {
      expect(WE_BY_ID[ev.id]).toBe(ev)
    }
  })

  it('all months are within 1-12', () => {
    for (const ev of WORLD_EVENTS) {
      expect(ev.month).toBeGreaterThanOrEqual(1)
      expect(ev.month).toBeLessThanOrEqual(12)
    }
  })
})

describe('getEventForMonth', () => {
  it('returns the correct event for month 2', () => {
    const ev = getEventForMonth(2)
    expect(ev?.id).toBe('great_hunt')
  })

  it('returns null for a month with no event', () => {
    const ev = getEventForMonth(1)
    expect(ev).toBeNull()
  })

  it('returns event for month 12', () => {
    const ev = getEventForMonth(12)
    expect(ev?.id).toBe('winter_trials')
  })
})

describe('getUpcomingEvent', () => {
  it('returns event for month 2 when current month is 1', () => {
    const ev = getUpcomingEvent(1)
    expect(ev?.id).toBe('great_hunt')
  })

  it('returns null when next month has no event', () => {
    // month 2 -> next is 3, no event there
    const ev = getUpcomingEvent(2)
    expect(ev).toBeNull()
  })

  it('wraps around — month 12 upcoming is month 1 (no event)', () => {
    // Month 1 has no event, so getUpcomingEvent(12) should return null
    const ev = getUpcomingEvent(12)
    expect(ev).toBeNull()
  })
})

describe('resolveWorldEvent', () => {
  it('returns zero deltas for unknown event', () => {
    const outcome = resolveWorldEvent('fake_event', 'choice')
    expect(outcome.ryo).toBe(0)
    expect(outcome.success).toBe(false)
  })

  it('applies deltas on success (forced roll below risk)', () => {
    const ev = WE_BY_ID['great_hunt']
    const participate = ev.choices.find(c => c.id === 'participate')
    // force success: rand > risk (0.25), so pass 0.99
    const outcome = resolveWorldEvent('great_hunt', 'participate', () => 0.99)
    expect(outcome.success).toBe(true)
    expect(outcome.ryo).toBe(participate.ryo)
    expect(outcome.rep).toBe(participate.rep)
  })

  it('returns failure deltas when risk triggers', () => {
    // force failure: rand < risk (0.25), so pass 0.01
    const outcome = resolveWorldEvent('great_hunt', 'participate', () => 0.01)
    expect(outcome.success).toBe(false)
    expect(outcome.ryo).toBe(0)
    expect(outcome.rep).toBeLessThanOrEqual(0)
  })

  it('zero-risk choices always succeed', () => {
    const outcome = resolveWorldEvent('great_hunt', 'observe', () => 0.01)
    expect(outcome.success).toBe(true)
  })

  it('skip choice always succeeds but has negative rep', () => {
    const ev = WE_BY_ID['spring_festival']
    const skip = ev.choices.find(c => c.id === 'skip')
    const outcome = resolveWorldEvent('spring_festival', 'skip', () => 0.99)
    expect(outcome.success).toBe(true)
    expect(outcome.rep).toBe(skip.rep)
    expect(outcome.rep).toBeLessThan(0)
  })
})
