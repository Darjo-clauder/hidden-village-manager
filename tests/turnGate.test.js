import { describe, it, expect } from 'vitest'
import { TURN_BLOCKERS, BLOCKER_IDS, turnBlocker, canAdvanceTurn } from '../shared/utils/turnGate.js'

describe('turnBlocker', () => {
  it('lets a clean state advance', () => {
    expect(turnBlocker({ year: 1, month: 1 })).toBeNull()
    expect(canAdvanceTurn({ year: 1, month: 1 })).toBe(true)
  })

  it('catches every blocking condition', () => {
    const cases = {
      worldchoice: { pendingChoiceEvent: { id: 'e' } },
      obligation:  { pendingObligation: { villageName: 'Cragmoor' } },
      inbox:       { pendingQuickDecision: { id: 'q' } },
      exam:        { examActive: true },
      war:         { warActive: true },
    }
    for (const [id, G] of Object.entries(cases)) {
      expect(turnBlocker(G)?.id, id).toBe(id)
      expect(canAdvanceTurn(G), id).toBe(false)
    }
  })

  it('covers every declared blocker — no id without a test case above', () => {
    expect(BLOCKER_IDS.sort()).toEqual(['exam', 'inbox', 'obligation', 'war', 'worldchoice'].sort())
  })

  it('gives every blocker a label so the player is told why', () => {
    for (const b of TURN_BLOCKERS) {
      expect(b.label, b.id).toBeTruthy()
      expect(typeof b.test, b.id).toBe('function')
    }
  })

  it('returns the first match when several are outstanding', () => {
    const G = { pendingChoiceEvent: {}, pendingObligation: {}, examActive: true }
    expect(turnBlocker(G).id).toBe('worldchoice')
  })

  it('is safe on missing or malformed state', () => {
    expect(() => turnBlocker(null)).not.toThrow()
    expect(() => turnBlocker(undefined)).not.toThrow()
    expect(turnBlocker(null)).toBeNull()
    expect(canAdvanceTurn({})).toBe(true)
  })

  it('ignores falsy pending values rather than treating them as set', () => {
    expect(turnBlocker({ pendingObligation: null, pendingQuickDecision: undefined })).toBeNull()
  })
})
