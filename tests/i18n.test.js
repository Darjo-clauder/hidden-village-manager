import { describe, it, expect, beforeEach } from 'vitest'
import {
  formatMessage, t, registerLocale, setLocale, setFallbackLocale, getLocale,
  hasKey, formatNum, formatRyo, pseudoMessage, makePseudoLocale,
} from '../shared/utils/i18n.js'
import { ipName, setIpOverrides, IP_RANKS } from '../shared/i18n/ipNames.js'
import { en } from '../shared/i18n/en.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

describe('i18n formatter (mini-ICU)', () => {
  it('interpolates named params', () => {
    expect(formatMessage('Signed {name} for {fee} ryo', { name: 'Toma', fee: '4,000' }))
      .toBe('Signed Toma for 4,000 ryo')
  })

  it('drops missing params to empty string (no crash)', () => {
    expect(formatMessage('Hi {missing}!', {})).toBe('Hi !')
  })

  it('handles plural with the # token', () => {
    const m = '{n, plural, one {# decision} other {# decisions}}'
    expect(formatMessage(m, { n: 1 })).toBe('1 decision')
    expect(formatMessage(m, { n: 3 })).toBe('3 decisions')
    expect(formatMessage(m, { n: 0 })).toBe('0 decisions')
  })

  it('supports exact =N plural branches', () => {
    const m = '{n, plural, =0 {none} one {# item} other {# items}}'
    expect(formatMessage(m, { n: 0 })).toBe('none')
    expect(formatMessage(m, { n: 1 })).toBe('1 item')
  })

  it('handles select branches with an other fallback', () => {
    const m = '{role, select, kage {Hokage} other {Captain}}'
    expect(formatMessage(m, { role: 'kage' })).toBe('Hokage')
    expect(formatMessage(m, { role: 'genin' })).toBe('Captain')
  })

  it('formats numbers locale-aware', () => {
    expect(formatMessage('{amount, number} ryo', { amount: 12000 })).toBe('12,000 ryo')
  })

  it('interpolates inside a chosen plural branch', () => {
    const m = '{n, plural, one {{name} has # win} other {{name} has # wins}}'
    expect(formatMessage(m, { n: 2, name: 'Konoha' })).toBe('Konoha has 2 wins')
  })
})

describe('i18n locale registry + t()', () => {
  beforeEach(() => {
    registerLocale('en', { 'a.b': 'Hello {x}', 'only.en': 'fallback me' })
    registerLocale('xx', { 'a.b': 'Hola {x}' })
    setFallbackLocale('en')
    setLocale('en')
  })

  it('translates from the active locale', () => {
    setLocale('xx')
    expect(t('a.b', { x: 'world' })).toBe('Hola world')
    expect(getLocale()).toBe('xx')
  })

  it('falls back to the fallback locale, then the key itself', () => {
    setLocale('xx')
    expect(t('only.en')).toBe('fallback me')   // not in xx → en
    expect(t('missing.key')).toBe('missing.key')
  })

  it('ignores unknown setLocale and keeps the current one', () => {
    setLocale('en'); setLocale('zz')
    expect(getLocale()).toBe('en')
  })

  it('hasKey reports presence', () => {
    expect(hasKey('a.b', 'en')).toBe(true)
    expect(hasKey('nope', 'en')).toBe(false)
  })
})

describe('pseudo-locale (truncation QA)', () => {
  it('expands width and brackets visible text but preserves placeholders', () => {
    const p = pseudoMessage('Recruit {name}')
    expect(p.startsWith('⟦')).toBe(true)
    expect(p.endsWith('⟧')).toBe(true)
    expect(p).toContain('{name}')          // placeholder untouched
    expect(p.length).toBeGreaterThan('Recruit {name}'.length)  // +30% padding
  })

  it('makePseudoLocale transforms every value', () => {
    const ps = makePseudoLocale({ k1: 'One', k2: 'Two {x}' })
    expect(ps.k1).toContain('⟦')
    expect(ps.k2).toContain('{x}')
  })
})

describe('IP namespace (swap point)', () => {
  beforeEach(() => setIpOverrides({}))

  it('resolves rank/role/clan/nation names', () => {
    expect(ipName('rank', 0)).toBe(IP_RANKS[0])
    expect(ipName('role', 'vanguard')).toBe('Vanguard')
    expect(typeof ipName('clan', 'kageha')).toBe('string')
    expect(ipName('nation', 'ember')).toBe('Ember')
  })

  it('an IP-neutral override swaps labels without touching anything else', () => {
    setIpOverrides({ rank: ['Rookie', 'Agent', 'Veteran', 'Operative', 'Legend'], role: { vanguard: 'Striker' } })
    expect(ipName('rank', 0)).toBe('Rookie')
    expect(ipName('role', 'vanguard')).toBe('Striker')
    expect(ipName('role', 'support')).toBe('Support')   // unoverridden falls through
  })

  it('unknown id falls back to the id string, never throws', () => {
    expect(ipName('rank', 99)).toBe('99')
    expect(ipName('clan', 'nope')).toBe('nope')
  })
})

describe('DOM localization coverage (P2 guardrail)', () => {
  // Every data-i18n key wired into the static markup must resolve in the en table —
  // catches typo'd keys and guards against a converted label silently losing coverage.
  const html = readFileSync(fileURLToPath(new URL('../client/index.html', import.meta.url)), 'utf8')
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1])

  it('index.html actually carries data-i18n keys', () => {
    expect(keys.length).toBeGreaterThan(20)   // nav + status strip converted
  })

  it('every data-i18n key exists in the en string table', () => {
    const missing = [...new Set(keys)].filter(k => !(k in en))
    expect(missing, `unkeyed data-i18n attrs: ${missing.join(', ')}`).toEqual([])
  })
})
