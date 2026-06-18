import { describe, it, expect } from 'vitest'
import { REGIONS, CLANS } from '../client/js/constants.js'

// Regression guard for O-2: every region's clanAffinity name must resolve to a
// real entry in the (renamed) CLANS table. Previously these were verbatim Naruto
// surnames (Uchiha, Hyuga, Nara...) that matched nothing, so state.js's
// `CLANS.find(c => c.n === clanName)` always failed and region clan-affinity was
// a silently dead feature (and the strings were an IP-hygiene liability).
describe('REGIONS clanAffinity wiring', () => {
  const clanNames = new Set(CLANS.map(c => c.n))

  it('every clanAffinity name resolves to a CLANS entry', () => {
    for (const region of REGIONS) {
      for (const name of region.clanAffinity || []) {
        expect(clanNames.has(name), `Region ${region.id} references unknown clan '${name}'`).toBe(true)
      }
    }
  })

  it('contains no verbatim trademarked clan surnames', () => {
    const banned = ['Uchiha', 'Senju', 'Hyuga', 'Inuzuka', 'Aburame', 'Nara', 'Akimichi', 'Yamanaka', 'Uzumaki', 'Sarutobi']
    const present = REGIONS.flatMap(r => r.clanAffinity || [])
    for (const name of banned) {
      expect(present, `Region data still contains '${name}'`).not.toContain(name)
    }
  })
})
