import { describe, it, expect } from 'vitest'
import { meetsReq, jutsuEligible, eligibleJutsu } from '../shared/jutsu/eligibility.js'
import { JUTSU_LIST } from '../client/js/constants.js'

const s = (over = {}) => ({ clan: null, wins: 0, winsB: 0, winsS: 0, prodigy: false, jutsu: [], ...over })

describe('jutsu requirement blocks', () => {
  it('an empty block is satisfied by anyone — that is how signatures pass through', () => {
    expect(meetsReq(s(), {})).toBe(true)
  })

  it('a missing block is satisfied by no one', () => {
    expect(meetsReq(s(), null)).toBe(false)
    expect(meetsReq(s(), undefined)).toBe(false)
  })

  it('each counter gates independently', () => {
    expect(meetsReq(s({ winsB: 19 }), { winsB: 20 })).toBe(false)
    expect(meetsReq(s({ winsB: 20 }), { winsB: 20 })).toBe(true)
    expect(meetsReq(s({ winsS: 0 }), { winsS: 1 })).toBe(false)
    expect(meetsReq(s({ winsS: 1 }), { winsS: 1 })).toBe(true)
    expect(meetsReq(s({ wins: 49 }), { wins: 50 })).toBe(false)
    expect(meetsReq(s({ wins: 50 }), { wins: 50 })).toBe(true)
    expect(meetsReq(s({ prodigy: false }), { prodigy: true })).toBe(false)
    expect(meetsReq(s({ prodigy: true }), { prodigy: true })).toBe(true)
  })

  it('all conditions in one block must hold together', () => {
    expect(meetsReq(s({ wins: 60, prodigy: false }), { wins: 50, prodigy: true })).toBe(false)
    expect(meetsReq(s({ wins: 60, prodigy: true }), { wins: 50, prodigy: true })).toBe(true)
  })
})

describe('eligibility, including the second way in', () => {
  const mangekyou = JUTSU_LIST.find(j => j.id === 'mangekyou')

  it('the clan lock is absolute — altReq does not bypass it', () => {
    expect(jutsuEligible(s({ clan: 'Kusari', prodigy: true, wins: 999 }), mangekyou)).toBe(false)
  })

  it('the prodigy path still works exactly as before', () => {
    expect(jutsuEligible(s({ clan: 'Kageha', prodigy: true, wins: 0 }), mangekyou)).toBe(true)
  })

  it('a long career in the right clan now reaches it without being a prodigy', () => {
    const need = mangekyou.altReq.wins
    expect(jutsuEligible(s({ clan: 'Kageha', prodigy: false, wins: need - 1 }), mangekyou)).toBe(false)
    expect(jutsuEligible(s({ clan: 'Kageha', prodigy: false, wins: need }), mangekyou)).toBe(true)
  })

  it('already knowing it makes you ineligible', () => {
    expect(jutsuEligible(s({ clan: 'Kageha', prodigy: true, jutsu: ['mangekyou'] }), mangekyou)).toBe(false)
  })

  it('tolerates junk without throwing', () => {
    expect(jutsuEligible(null, mangekyou)).toBe(false)
    expect(jutsuEligible(s(), null)).toBe(false)
    expect(eligibleJutsu(s(), null)).toEqual([])
  })

  it('every prodigy-gated jutsu carries an alt path — the fix must not rot', () => {
    const gated = JUTSU_LIST.filter(j => j.req?.prodigy)
    expect(gated.length).toBeGreaterThan(0)
    for (const j of gated) {
      expect(j.altReq, `${j.id} has no second way in`).toBeTruthy()
      // and that path must be satisfiable by a career, not another lottery
      expect(j.altReq.prodigy, `${j.id}'s alt path still requires prodigy`).toBeFalsy()
    }
  })

  it('a fresh recruit is eligible for nothing rare, an old hand for plenty', () => {
    const rookie = eligibleJutsu(s({ clan: 'Kageha' }), JUTSU_LIST)
    expect(rookie.every(j => j.tier !== 'rare')).toBe(true)
    const veteran = eligibleJutsu(s({ clan: 'Kageha', wins: 60, winsB: 30, winsS: 3 }), JUTSU_LIST)
    expect(veteran.some(j => j.tier === 'rare')).toBe(true)
  })
})
