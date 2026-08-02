import { describe, it, expect } from 'vitest'
import {
  ONBOARDING_STEPS, STEP_BY_ID, PHASES,
  onboardingState, shouldShowOnboarding,
} from '../shared/utils/onboarding.js'

const fresh = { year: 1, month: 1 }

describe('step definitions', () => {
  it('covers every phase', () => {
    for (const p of PHASES) {
      expect(ONBOARDING_STEPS.some(s => s.phase === p.id), p.id).toBe(true)
    }
  })

  it('has unique ids and complete copy', () => {
    const ids = ONBOARDING_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of ONBOARDING_STEPS) {
      expect(s.label, s.id).toBeTruthy()
      expect(s.hint, s.id).toBeTruthy()
      expect(s.panel, s.id).toBeTruthy()
      expect(PHASES.map(p => p.id), s.id).toContain(s.phase)
    }
  })

  it('teaches the mandate clock — the thing that can end a run', () => {
    const m = STEP_BY_ID.mandates
    expect(m).toBeTruthy()
    expect(m.hint.toLowerCase()).toContain('dismissed')
  })

  it('never throws on empty or malformed state', () => {
    for (const s of ONBOARDING_STEPS) {
      expect(() => s.done(undefined), s.id).not.toThrow()
      expect(() => s.done(null), s.id).not.toThrow()
      expect(() => s.done({}), s.id).not.toThrow()
    }
  })
})

describe('onboardingState', () => {
  it('starts with nothing done on a fresh game', () => {
    const st = onboardingState(fresh)
    expect(st.done).toBe(0)
    expect(st.complete).toBe(false)
    expect(st.next.id).toBe(ONBOARDING_STEPS[0].id)
  })

  it('marks a step done from real state, not a flag', () => {
    expect(onboardingState({ ...fresh, squads: [{ id: 'a' }] }).steps.find(s => s.id === 'form_squad').ok).toBe(true)
    expect(onboardingState({ ...fresh, aM: [{ id: 'm' }] }).steps.find(s => s.id === 'assign_mission').ok).toBe(true)
    expect(onboardingState({ ...fresh, shinobi: [{ homegrown: true }] }).steps.find(s => s.id === 'recruit').ok).toBe(true)
    expect(onboardingState({ ...fresh, kageDev: { path: 'sensei' } }).steps.find(s => s.id === 'warden_path').ok).toBe(true)
  })

  it('counts a screen as read only once it has been opened', () => {
    expect(onboardingState(fresh).steps.find(s => s.id === 'runway').ok).toBe(false)
    const seen = { ...fresh, _visited: { finances: true } }
    expect(onboardingState(seen).steps.find(s => s.id === 'runway').ok).toBe(true)
  })

  it('treats month 2 as proof the turn was ended', () => {
    expect(onboardingState({ year: 1, month: 1 }).steps.find(s => s.id === 'end_turn').ok).toBe(false)
    expect(onboardingState({ year: 1, month: 2 }).steps.find(s => s.id === 'end_turn').ok).toBe(true)
  })

  it('advances `next` as steps complete', () => {
    const st = onboardingState({ ...fresh, aM: [{ id: 'm' }] })
    expect(st.next.id).not.toBe('assign_mission')
  })

  it('groups by phase with totals that sum to the whole set', () => {
    const st = onboardingState(fresh)
    const sum = st.byPhase.reduce((a, p) => a + p.total, 0)
    expect(sum).toBe(ONBOARDING_STEPS.length)
  })

  it('reports complete when everything is satisfied', () => {
    const all = {
      year: 1, month: 2,
      aM: [{ id: 'm' }], squads: [{ id: 's' }],
      shinobi: [{ homegrown: true }],
      staff: [{ regionAssigned: 'north' }],
      tradeRoutes: [{ active: true }],
      kageDev: { path: 'sensei' },
      _visited: { inbox: true, kage: true, finances: true },
    }
    const st = onboardingState(all)
    expect(st.complete, JSON.stringify(st.steps.filter(s => !s.ok).map(s => s.id))).toBe(true)
    expect(st.next).toBeNull()
  })
})

describe('shouldShowOnboarding', () => {
  it('shows for a fresh first-year village', () => {
    expect(shouldShowOnboarding(fresh)).toBe(true)
  })

  it('survives past month 4 — the old version vanished before the first review', () => {
    expect(shouldShowOnboarding({ year: 1, month: 11 })).toBe(true)
  })

  it('stops after the first year', () => {
    expect(shouldShowOnboarding({ year: 2, month: 1 })).toBe(false)
  })

  it('respects an explicit dismissal', () => {
    expect(shouldShowOnboarding({ ...fresh, _onboardingDismissed: true })).toBe(false)
  })

  it('stops once every step is done', () => {
    const all = {
      year: 1, month: 2,
      aM: [{ id: 'm' }], squads: [{ id: 's' }],
      shinobi: [{ homegrown: true }],
      staff: [{ regionAssigned: 'north' }],
      contracts: [{ active: true }],
      kageDev: { path: 'sensei' },
      _visited: { inbox: true, kage: true, finances: true },
    }
    expect(shouldShowOnboarding(all)).toBe(false)
  })

  it('is safe on missing state', () => {
    expect(shouldShowOnboarding(null)).toBe(false)
    expect(shouldShowOnboarding(undefined)).toBe(false)
  })
})
