import { describe, it, expect } from 'vitest'
import {
  MATCHDAY_TACTICS, TACTIC_BY_ID, tacticMod, tacticRead, TACTIC_STRONG_MOD, TACTIC_WEAK_MOD,
  TACTIC_PROFILES, tacticProfile, applyTacticShape, tacticShapeLabel,
} from '../shared/constants/matchdayTactics.js'
import { MATCH_STYLES, styleParams } from '../shared/constants/villageIdentity.js'
import { simMatch } from '../shared/utils/season.js'

describe('matchday tactics — shape', () => {
  it('has 4 tactics with valid style references and unique ids', () => {
    expect(MATCHDAY_TACTICS.length).toBe(4)
    const ids = new Set(MATCHDAY_TACTICS.map(t => t.id))
    expect(ids.size).toBe(4)
    MATCHDAY_TACTICS.forEach(t => {
      ;[...t.strong, ...t.weak].forEach(s => expect(MATCH_STYLES[s], `${t.id} refs unknown style ${s}`).toBeTruthy())
      // A tactic can't be simultaneously strong and weak into the same style.
      t.strong.forEach(s => expect(t.weak).not.toContain(s))
      expect(TACTIC_BY_ID[t.id]).toBe(t)
    })
  })

  it('every non-balanced style has at least one strong answer (no dead matchup)', () => {
    Object.keys(MATCH_STYLES).filter(s => s !== 'balanced').forEach(style => {
      const answer = MATCHDAY_TACTICS.some(t => t.strong.includes(style))
      expect(answer, `no tactic is strong vs ${style}`).toBe(true)
    })
  })
})

describe('tacticMod / tacticRead', () => {
  it('returns the strong/weak/neutral mods per matchup', () => {
    expect(tacticMod('counter', 'blitz')).toBe(TACTIC_STRONG_MOD)
    expect(tacticMod('counter', 'fortress')).toBe(TACTIC_WEAK_MOD)
    expect(tacticMod('counter', 'grinder')).toBe(0)
    expect(tacticMod('overwhelm', 'fortress')).toBe(TACTIC_STRONG_MOD)
    expect(tacticMod('overwhelm', 'opportunist')).toBe(TACTIC_WEAK_MOD)
    expect(tacticMod('control', 'opportunist')).toBe(TACTIC_STRONG_MOD)
    expect(tacticMod('control', 'grinder')).toBe(TACTIC_STRONG_MOD)
    expect(tacticMod('control', 'blitz')).toBe(TACTIC_WEAK_MOD)
    expect(tacticRead('counter', 'blitz')).toBe('strong')
    expect(tacticRead('counter', 'fortress')).toBe('weak')
    expect(tacticRead('standard', 'blitz')).toBe('neutral')
  })

  it('standard and unknown inputs are inert', () => {
    Object.keys(MATCH_STYLES).forEach(s => expect(tacticMod('standard', s)).toBe(0))
    expect(tacticMod('no-such-tactic', 'blitz')).toBe(0)
    expect(tacticMod('counter', null)).toBe(0)
    expect(tacticMod(null, 'blitz')).toBe(0)
  })

  it('upside beats downside (encourages engaging with the system)', () => {
    expect(TACTIC_STRONG_MOD).toBeGreaterThan(Math.abs(TACTIC_WEAK_MOD))
  })
})

describe('risk profiles — the part that makes this a decision', () => {
  it('every tactic declares a complete, sane profile', () => {
    MATCHDAY_TACTICS.forEach(t => {
      const p = tacticProfile(t.id)
      expect(p, `${t.id} has no profile`).toBeTruthy()
      expect(p.varMult).toBeGreaterThan(0.4)
      expect(p.varMult).toBeLessThan(2)
      expect(p.drawMult).toBeGreaterThan(0.3)
      expect(p.drawMult).toBeLessThan(3)
    })
    expect(Object.keys(TACTIC_PROFILES).sort()).toEqual(MATCHDAY_TACTICS.map(t => t.id).sort())
  })

  it('an unknown tactic falls back to standard rather than throwing', () => {
    expect(tacticProfile('no-such-tactic')).toBe(TACTIC_PROFILES.standard)
    expect(tacticProfile(null)).toBe(TACTIC_PROFILES.standard)
  })

  /**
   * THE NEUTRALITY PROOF. Standard's profile is 1.0/1.0, so shaping a style by
   * it must reproduce that style exactly. This is what made it safe to add the
   * plumbing without moving the balance: if this ever fails, the composition
   * maths has drifted and every unshaped matchday silently changed.
   */
  it('shaping by standard is a no-op on every base style', () => {
    Object.keys(MATCH_STYLES).forEach(id => {
      const base = styleParams(id)
      const shaped = applyTacticShape(base, 'standard')
      expect(shaped.varLo, id).toBeCloseTo(base.varLo, 10)
      expect(shaped.varHi, id).toBeCloseTo(base.varHi, 10)
      expect(shaped.drawMult, id).toBeCloseTo(base.drawMult, 10)
    })
  })

  it('Control narrows the swing and grinds draws; Overwhelm does the opposite', () => {
    const base = styleParams('balanced')
    const ctrl = applyTacticShape(base, 'control')
    const over = applyTacticShape(base, 'overwhelm')
    const spread = s => s.varHi - s.varLo
    expect(spread(ctrl)).toBeLessThan(spread(base))
    expect(spread(over)).toBeGreaterThan(spread(base))
    expect(ctrl.drawMult).toBeGreaterThan(base.drawMult)
    expect(over.drawMult).toBeLessThan(base.drawMult)
  })

  it('the tactic bends a village\'s character without overwriting it', () => {
    // A blitz side playing Control is steadier than usual but still wilder than
    // a fortress playing the same tactic. If this inverts, identity is gone.
    const spread = s => s.varHi - s.varLo
    const blitzCtrl = applyTacticShape(styleParams('blitz'), 'control')
    const fortCtrl = applyTacticShape(styleParams('fortress'), 'control')
    expect(spread(blitzCtrl)).toBeLessThan(spread(styleParams('blitz')))
    expect(spread(blitzCtrl)).toBeGreaterThan(spread(fortCtrl))
  })

  it('the profile reaches the sim — Control really does draw more', () => {
    const N = 8000
    const count = tactic => {
      const st = applyTacticShape(styleParams('balanced'), tactic)
      let d = 0
      for (let i = 0; i < N; i++) if (simMatch(100, 100, Math.random, st, 'balanced').winner === 'draw') d++
      return d / N
    }
    expect(count('control')).toBeGreaterThan(count('standard'))
    expect(count('overwhelm')).toBeLessThan(count('standard'))
  })

  it('shape labels read as a bet, not a number', () => {
    expect(tacticShapeLabel('control')).toMatch(/Low swing/)
    expect(tacticShapeLabel('control')).toMatch(/draws likelier/)
    expect(tacticShapeLabel('overwhelm')).toMatch(/High swing/)
    expect(tacticShapeLabel('overwhelm')).toMatch(/draws rarer/)
    expect(tacticShapeLabel('standard')).toMatch(/Even swing/)
  })
})

describe('no tactic may be dominant — the failure this work exists to fix', () => {
  /**
   * Before risk profiles, every fixture had exactly ONE correct answer worth a
   * flat +8%, and Control was strong into 5 of 12 villages while weak into 2 —
   * a blind-pick default. The decision was a lookup table.
   *
   * This asserts the property that stops that returning: across the real spread
   * of opponents AND strength situations, each tactic must be the best expected
   * -points choice somewhere, and no single tactic may win everywhere.
   */
  const N = 6000
  const ppg = (myStr, oppStr, tactic, oppStyle) => {
    const st = applyTacticShape(styleParams('balanced'), tactic)
    const mod = tacticMod(tactic, oppStyle)
    let p = 0
    for (let i = 0; i < N; i++) {
      const r = simMatch(myStr * (1 + mod), oppStr, Math.random, st, oppStyle)
      p += r.winner === 'a' ? 3 : r.winner === 'draw' ? 1 : 0
    }
    return p / N
  }

  it('every tactic is the right answer in at least one situation', () => {
    const cells = []
    for (const [a, b] of [[75, 100], [100, 100], [100, 75]]) {
      for (const os of Object.keys(MATCH_STYLES)) {
        const scored = MATCHDAY_TACTICS.map(t => ({ id: t.id, v: ppg(a, b, t.id, os) }))
        cells.push(scored.reduce((x, y) => (y.v > x.v ? y : x)).id)
      }
    }
    const winners = new Set(cells)
    // Allow one tactic to be situationally redundant, but not three.
    expect(winners.size, `only ${[...winners]} ever win`).toBeGreaterThanOrEqual(3)
    // And nothing may sweep the board.
    for (const id of winners) {
      const share = cells.filter(c => c === id).length / cells.length
      expect(share, `${id} is the best answer in ${Math.round(share * 100)}% of situations`).toBeLessThan(0.6)
    }
  })

  it('the same opponent wants different answers as your situation changes', () => {
    // This is the whole point: a lookup table cannot express "it depends".
    let styleWithChoice = 0
    for (const os of Object.keys(MATCH_STYLES)) {
      const bestAt = ([a, b]) =>
        MATCHDAY_TACTICS.map(t => ({ id: t.id, v: ppg(a, b, t.id, os) }))
          .reduce((x, y) => (y.v > x.v ? y : x)).id
      const answers = new Set([bestAt([75, 100]), bestAt([100, 100]), bestAt([100, 75])])
      if (answers.size > 1) styleWithChoice++
    }
    expect(styleWithChoice, 'no opponent changes its answer with the situation').toBeGreaterThanOrEqual(3)
  })
})
