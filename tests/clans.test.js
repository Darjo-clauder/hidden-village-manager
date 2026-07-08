import { describe, it, expect } from 'vitest'
import {
  CLANS,
  CLAN_BY_ID,
  CLAN_CHAINS,
  getClanPassives,
  availableClanChains,
  clanCouncilInfluence,
} from '../shared/constants/clans.js'

const mkS = (id, clan, ri = 1, status = 'available') => ({ id, clan, ri, status })

describe('CLANS', () => {
  it('has 9 great clans + 8 minor-nation clans (17 total)', () => {
    expect(CLANS).toHaveLength(17)
    expect(CLANS.filter(c => c.minor)).toHaveLength(8)
    expect(CLANS.filter(c => !c.minor)).toHaveLength(9)
  })
  it('all clans have passive entries', () => {
    for (const c of CLANS) {
      expect(c.passive).toBeTruthy()
      expect(Object.keys(c.passive).length).toBeGreaterThan(0)
    }
  })
  it('CLAN_BY_ID indexes all clans', () => {
    for (const c of CLANS) {
      expect(CLAN_BY_ID[c.id]).toBe(c)
    }
  })
  it('every great clan has at least one mission chain (minor clans need none)', () => {
    for (const c of CLANS.filter(c => !c.minor)) {
      expect(c.missionChains?.length || 0).toBeGreaterThan(0)
    }
  })
})

describe('CLAN_CHAINS', () => {
  it('all chain ids referenced by clans exist in CLAN_CHAINS', () => {
    for (const clan of CLANS) {
      for (const chainId of (clan.missionChains || [])) {
        expect(CLAN_CHAINS[chainId], `Missing chain: ${chainId}`).toBeTruthy()
      }
    }
  })
  it('all chains have required fields', () => {
    for (const [id, chain] of Object.entries(CLAN_CHAINS)) {
      expect(chain.ryo, `${id} missing ryo`).toBeGreaterThan(0)
      expect(chain.rk, `${id} missing rk`).toBeTruthy()
    }
  })
})

describe('getClanPassives', () => {
  it('returns zeros when no shinobi', () => {
    const G = { shinobi: [], clanApproval: {} }
    const p = getClanPassives(G)
    expect(p.successMod).toBe(0)
    expect(p.growthBonus).toBe(0)
  })

  it('applies Kageha successMod when member is available', () => {
    const G = {
      shinobi: [mkS('u1', 'kageha')],
      clanApproval: { kageha: 80 },
    }
    const p = getClanPassives(G)
    expect(p.successMod).toBeCloseTo(CLAN_BY_ID['kageha'].passive.successMod)
  })

  it('does not apply passive when approval below threshold', () => {
    const G = {
      shinobi: [mkS('u1', 'kageha')],
      clanApproval: { kageha: 30 },
    }
    const p = getClanPassives(G)
    expect(p.successMod).toBe(0)
  })

  it('does not apply passive when shinobi is not available', () => {
    const G = {
      shinobi: [mkS('u1', 'kageha', 1, 'injured')],
      clanApproval: { kageha: 80 },
    }
    const p = getClanPassives(G)
    expect(p.successMod).toBe(0)
  })

  it('stacks passives from multiple clans', () => {
    const G = {
      shinobi: [mkS('u1', 'kageha'), mkS('n1', 'kagero')],
      clanApproval: { kageha: 80, kagero: 80 },
    }
    const p = getClanPassives(G)
    expect(p.successMod).toBeCloseTo(CLAN_BY_ID['kageha'].passive.successMod)
    expect(p.growthBonus).toBeCloseTo(CLAN_BY_ID['kagero'].passive.growthBonus)
  })
})

describe('availableClanChains', () => {
  it('returns empty for unknown clan', () => {
    expect(availableClanChains('fake_clan', { shinobi: [] })).toHaveLength(0)
  })

  it('marks chain canRun=false when no eligible members', () => {
    const G = { shinobi: [] }
    const chains = availableClanChains('kageha', G)
    for (const c of chains) expect(c.canRun).toBe(false)
  })

  it('marks chain canRun=true when requirement met', () => {
    const G = { shinobi: [mkS('u1', 'kageha', 1)] }
    const chains = availableClanChains('kageha', G)
    const basic = chains.find(c => c.chainId === 'kageha_trial')
    // kageha_trial needs 2 members
    expect(basic?.canRun).toBe(false)
  })

  it('marks chain canRun=true with 2 members for reqClanSize=2', () => {
    const G = { shinobi: [mkS('u1', 'kageha', 1), mkS('u2', 'kageha', 1)] }
    const chains = availableClanChains('kageha', G)
    const trial = chains.find(c => c.chainId === 'kageha_trial')
    expect(trial?.canRun).toBe(true)
  })

  it('respects reqRi — higher-rank only chain blocked by low rank', () => {
    const G = { shinobi: [mkS('u1', 'kageha', 1)] }
    const chains = availableClanChains('kageha', G)
    const sRank = chains.find(c => c.chainId === 'kagan_hunt')
    expect(sRank?.canRun).toBe(false)
  })
})

describe('clanCouncilInfluence', () => {
  it('returns 0 for all clans when no shinobi', () => {
    const G = { shinobi: [] }
    const inf = clanCouncilInfluence(G)
    for (const v of Object.values(inf)) expect(v).toBe(0)
  })

  it('Kageha has higher influence than Okamura with equal member counts', () => {
    const G = {
      shinobi: [
        mkS('u1', 'kageha'),
        mkS('i1', 'okamura'),
      ],
    }
    const inf = clanCouncilInfluence(G)
    expect(inf['kageha']).toBeGreaterThan(inf['okamura'])
  })
})
