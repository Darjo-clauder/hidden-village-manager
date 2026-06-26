import { describe, it, expect } from 'vitest'
import { monthlySnapshot, isFiniteRyo, villageRevenue, PRESTIGE_REVENUE, BASE_REVENUE } from '../shared/utils/economy.js'

describe('monthlySnapshot — economy formula lock (I-ECON)', () => {
  it('matches the documented worked example (SIMULATION_MODELS Appendix B)', () => {
    // trade 1500, maintenance 2000, shinobiWages 3200, staffWages 600
    const s = monthlySnapshot({ trade: 1500, maintenance: 2000, shinobiWages: 3200, staffWages: 600 })
    expect(s.totalIncome).toBe(1500)
    expect(s.totalExpend).toBe(5800)
    expect(s.net).toBe(-4300)
  })
  it('net == totalIncome - totalExpend across mixed sources', () => {
    const s = monthlySnapshot({ trade: 4000, contracts: 2000, jinchuriki: 3000, daimyo: 1000, sponsorship: 500, shinobiWages: 6000, staffWages: 1200, maintenance: 2500 })
    expect(s.net).toBe(s.totalIncome - s.totalExpend)
    expect(s.totalIncome).toBe(10500)
    expect(s.totalExpend).toBe(9700)
  })
  it('empty input is all zeros (no NaN)', () => {
    expect(monthlySnapshot()).toEqual({ totalIncome: 0, totalExpend: 0, net: 0 })
  })
  it('all outputs are finite (I-ECON-1)', () => {
    const s = monthlySnapshot({ trade: 1e9, maintenance: 1e9 })
    for (const v of Object.values(s)) expect(isFiniteRyo(v)).toBe(true)
  })
})

describe('villageRevenue — baseline franchise income', () => {
  it('a fresh village (rep 10, D-tier) gets a workable operating base', () => {
    const r = villageRevenue(10, 'D')
    expect(r).toBe(BASE_REVENUE + 10 * 400) // 26000
  })
  it('scales up with reputation', () => {
    expect(villageRevenue(50, 'D')).toBeGreaterThan(villageRevenue(10, 'D'))
  })
  it('higher prestige tiers pay more', () => {
    expect(villageRevenue(0, 'S')).toBe(BASE_REVENUE + PRESTIGE_REVENUE.S)
    expect(villageRevenue(0, 'A')).toBeGreaterThan(villageRevenue(0, 'C'))
  })
  it('defaults are safe (no NaN)', () => {
    expect(isFiniteRyo(villageRevenue())).toBe(true)
  })
})

describe('isFiniteRyo (I-ECON-1)', () => {
  it('true for finite numbers', () => { expect(isFiniteRyo(0)).toBe(true); expect(isFiniteRyo(-5000)).toBe(true) })
  it('false for NaN / Infinity', () => { expect(isFiniteRyo(NaN)).toBe(false); expect(isFiniteRyo(Infinity)).toBe(false) })
})
