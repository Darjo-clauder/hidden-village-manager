import { describe, it, expect } from 'vitest'
import { PRESS_QUESTIONS, PRESS_TONES, TONE_BY_ID, QUESTION_BY_ID } from '../shared/utils/pressConference.js'

describe('PRESS_QUESTIONS', () => {
  it('all questions have required fields', () => {
    for (const q of PRESS_QUESTIONS) {
      expect(typeof q.id).toBe('string')
      expect(typeof q.trigger).toBe('string')
      expect(typeof q.question).toBe('string')
    }
  })

  it('QUESTION_BY_ID indexes all entries', () => {
    for (const q of PRESS_QUESTIONS) {
      expect(QUESTION_BY_ID[q.id]).toBe(q)
    }
  })

  it('covers all expected triggers', () => {
    const triggers = PRESS_QUESTIONS.map(q => q.trigger)
    expect(triggers).toContain('exam_win')
    expect(triggers).toContain('exam_loss')
    expect(triggers).toContain('war_win')
    expect(triggers).toContain('war_loss')
    expect(triggers).toContain('win_streak')
    expect(triggers).toContain('loss_streak')
    expect(triggers).toContain('kia')
  })
})

describe('PRESS_TONES', () => {
  it('all tones have mods object with morale, rep, rivalRel', () => {
    for (const t of PRESS_TONES) {
      expect(typeof t.mods.morale).toBe('number')
      expect(typeof t.mods.rep).toBe('number')
      expect(typeof t.mods.rivalRel).toBe('number')
    }
  })

  it('TONE_BY_ID indexes all tones', () => {
    for (const t of PRESS_TONES) {
      expect(TONE_BY_ID[t.id]).toBe(t)
    }
  })

  it('confident tone has positive rep and morale', () => {
    const t = TONE_BY_ID.confident
    expect(t.mods.rep).toBeGreaterThan(0)
    expect(t.mods.morale).toBeGreaterThan(0)
  })

  it('dismissive tone has negative rep', () => {
    const t = TONE_BY_ID.dismissive
    expect(t.mods.rep).toBeLessThan(0)
  })
})
