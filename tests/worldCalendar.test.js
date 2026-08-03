import { describe, it, expect } from 'vitest'
import {
  WORLD_EVENTS,
  WE_BY_ID,
  getEventForMonth,
  getUpcomingEvent,
  resolveWorldEvent,
} from '../shared/constants/worldCalendar.js'

describe('WORLD_EVENTS', () => {
  it('schedules every event in a real month', () => {
    // Asserted against the data rather than a hardcoded count, so adding an
    // event to fill an empty month does not fail a test that was only counting.
    expect(WORLD_EVENTS.length).toBeGreaterThanOrEqual(6)
    for (const e of WORLD_EVENTS) {
      expect(e.month, e.id).toBeGreaterThanOrEqual(1)
      expect(e.month, e.id).toBeLessThanOrEqual(12)
    }
  })

  it('all events have unique months', () => {
    const months = WORLD_EVENTS.map(e => e.month)
    expect(new Set(months).size).toBe(WORLD_EVENTS.length)
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

// ── Every month must have something to do ──────────────────────────────────
describe('calendar coverage', () => {
  it('leaves no month of the back half empty', () => {
    // Months 9 and 11 previously had NOTHING scheduled anywhere in the game —
    // no world event, no competition, no review. A player there assigned
    // missions and pressed End Turn. See docs/LOOP_ANALYSIS_2026-08-03.md.
    for (const m of [8, 9, 10, 11, 12]) {
      expect(getEventForMonth(m), `month ${m} has no world event`).toBeTruthy()
    }
  })

  it('schedules at most one event per month', () => {
    const byMonth = {}
    for (const e of WORLD_EVENTS) byMonth[e.month] = (byMonth[e.month] || 0) + 1
    for (const [m, n] of Object.entries(byMonth)) expect(n, `month ${m}`).toBe(1)
  })

  it('gives every event a real choice with a stated trade-off', () => {
    for (const e of WORLD_EVENTS) {
      expect(e.choices.length, e.id).toBeGreaterThanOrEqual(3)
      for (const c of e.choices) {
        expect(c.label, `${e.id}/${c.id}`).toBeTruthy()
        expect(c.desc, `${e.id}/${c.id}`).toBeTruthy()
      }
      // Not every option can be strictly better than the others.
      const free = e.choices.filter(c => (c.ryo || 0) >= 0 && (c.rep || 0) >= 0 && (c.morale || 0) >= 0 && !c.risk)
      expect(free.length, `${e.id} has a dominant no-cost option`).toBeLessThan(e.choices.length)
    }
  })

  it('warns a month ahead for the new events too', () => {
    expect(getUpcomingEvent(8).id).toBe('refugee_season')
    expect(getUpcomingEvent(10).id).toBe('tournament_draw')
  })

  it('resolves the new events like any other', () => {
    for (const id of ['refugee_season', 'tournament_draw']) {
      const ev = WE_BY_ID[id]
      for (const c of ev.choices) {
        const r = resolveWorldEvent(id, c.id, () => 0.99)   // no risk failure
        expect(r.success, `${id}/${c.id}`).toBe(true)
      }
    }
  })
})
