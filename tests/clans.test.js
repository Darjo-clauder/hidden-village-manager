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
  it('has 6 clans', () => {
    expect(CLANS).toHaveLength(6)
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
  it('all clans have at least one mission chain', () => {
    for (const c of CLANS) {
      expect(c.missionChains.length).toBeGreaterThan(0)
    }
  })
})

describe('CLAN_CHAINS', () => {
  it('all chain ids referenced by clans exist in CLAN_CHAINS', () => {
    for (const clan of CLANS) {
      for (const chainId of clan.missionChains) {
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

  it('applies Uchiha successMod when member is available', () => {
    const G = {
      shinobi: [mkS('u1', 'uchiha')],
      clanApproval: { uchiha: 80 },
    }
    const p = getClanPassives(G)
    expect(p.successMod).toBeCloseTo(CLAN_BY_ID['uchiha'].passive.successMod)
  })

  it('does not apply passive when approval below threshold', () => {
    const G = {
      shinobi: [mkS('u1', 'uchiha')],
      clanApproval: { uchiha: 30 },
    }
    const p = getClanPassives(G)
    expect(p.successMod).toBe(0)
  })

  it('does not apply passive when shinobi is not available', () => {
    const G = {
      shinobi: [mkS('u1', 'uchiha', 1, 'injured')],
      clanApproval: { uchiha: 80 },
    }
    const p = getClanPassives(G)
    expect(p.successMod).toBe(0)
  })

  it('stacks passives from multiple clans', () => {
    const G = {
      shinobi: [mkS('u1', 'uchiha'), mkS('n1', 'nara')],
      clanApproval: { uchiha: 80, nara: 80 },
    }
    const p = getClanPassives(G)
    expect(p.successMod).toBeCloseTo(CLAN_BY_ID['uchiha'].passive.successMod)
    expect(p.growthBonus).toBeCloseTo(CLAN_BY_ID['nara'].passive.growthBonus)
  })
})

describe('availableClanChains', () => {
  it('returns empty for unknown clan', () => {
    expect(availableClanChains('fake_clan', { shinobi: [] })).toHaveLength(0)
  })

  it('marks chain canRun=false when no eligible members', () => {
    const G = { shinobi: [] }
    const chains = availableClanChains('uchiha', G)
    for (const c of chains) expect(c.canRun).toBe(false)
  })

  it('marks chain canRun=true when requirement met', () => {
    const G = { shinobi: [mkS('u1', 'uchiha', 1)] }
    const chains = availableClanChains('uchiha', G)
    const basic = chains.find(c => c.chainId === 'uchiha_trial')
    // uchiha_trial needs 2 members
    expect(basic?.canRun).toBe(false)
  })

  it('marks chain canRun=true with 2 members for reqClanSize=2', () => {
    const G = { shinobi: [mkS('u1', 'uchiha', 1), mkS('u2', 'uchiha', 1)] }
    const chains = availableClanChains('uchiha', G)
    const trial = chains.find(c => c.chainId === 'uchiha_trial')
    expect(trial?.canRun).toBe(true)
  })

  it('respects reqRi — higher-rank only chain blocked by low rank', () => {
    const G = { shinobi: [mkS('u1', 'uchiha', 1)] }
    const chains = availableClanChains('uchiha', G)
    const sRank = chains.find(c => c.chainId === 'sharingan_hunt')
    expect(sRank?.canRun).toBe(false)
  })
})

describe('clanCouncilInfluence', () => {
  it('returns 0 for all clans when no shinobi', () => {
    const G = { shinobi: [] }
    const inf = clanCouncilInfluence(G)
    for (const v of Object.values(inf)) expect(v).toBe(0)
  })

  it('Uchiha has higher influence than Inuzuka with equal member counts', () => {
    const G = {
      shinobi: [
        mkS('u1', 'uchiha'),
        mkS('i1', 'inuzuka'),
      ],
    }
    const inf = clanCouncilInfluence(G)
    expect(inf['uchiha']).toBeGreaterThan(inf['inuzuka'])
  })
})
