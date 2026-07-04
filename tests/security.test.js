import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../shared/utils/escapeHtml.js'
import { cleanText, cleanIcon, cleanStringArray } from '../server/sanitize.js'
import { publicVillage } from '../server/state.js'

describe('escapeHtml (client sink defense)', () => {
  it('neutralizes the XSS metacharacters', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>'))
      .toBe('&lt;img src=x onerror=alert(1)&gt;')
    expect(escapeHtml(`"'&<>`)).toBe('&quot;&#39;&amp;&lt;&gt;')
  })
  it('leaves benign text (incl. emoji) intact', () => {
    expect(escapeHtml('Emberfall 🍃')).toBe('Emberfall 🍃')
  })
  it('coerces null/undefined/number to a safe string', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(42)).toBe('42')
  })
})

describe('server-side identity sanitizers (defense in depth)', () => {
  it('cleanText strips angle brackets and bounds length', () => {
    expect(cleanText('<script>evil</script>', 32)).toBe('scriptevil/script')
    expect(cleanText('x'.repeat(100), 10)).toHaveLength(10)
    expect(cleanText(null, 10)).toBe('')
  })
  it('cleanIcon drops markup, caps code points, falls back', () => {
    expect(cleanIcon('<img>')).toBe('img')          // brackets stripped
    expect(cleanIcon('🍃')).toBe('🍃')
    expect(cleanIcon('')).toBe('🍃')                 // fallback
    expect([...cleanIcon('abcdefgh')].length).toBeLessThanOrEqual(4)
  })
  it('cleanStringArray bounds items + length and strips brackets', () => {
    const out = cleanStringArray(['<b>Kurama</b>', 'ok'], 20, 24)
    expect(out[0]).toBe('bKurama/b')
    expect(cleanStringArray('not an array')).toEqual([])
    expect(cleanStringArray(new Array(50).fill('x'), 20).length).toBe(20)
  })
})

describe('publicVillage (IDOR defense)', () => {
  it('strips the playerId bearer secret but keeps public fields', () => {
    const v = { id: 's1', playerId: 'secret-uuid', name: 'Emberfall', power: 50 }
    const pub = publicVillage(v)
    expect(pub.playerId).toBeUndefined()
    expect(pub).toMatchObject({ id: 's1', name: 'Emberfall', power: 50 })
  })
})
