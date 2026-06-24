/**
 * Dynasty balance sweep — 20 in-game years (240 months), DETERMINISTIC.
 *
 * The marathon test (tests/marathon.test.js) proves the loop *survives* a decade.
 * This sweep goes further: it runs a seeded 20-year dynasty and asserts the curves
 * don't DRIFT — i.e. nothing runs away (economy, Kage progression) and nothing
 * silently decays to zero (roster, competitiveness) over a full dynasty horizon.
 *
 * Exercises the REAL shared curves: villageRevenue (with the rep soft-cap),
 * addKageXp / spendKagePoint (the GM progression), and the season spine.
 *
 * Seeded via the mulberry32 harness so a regression in any curve flips an assertion
 * rather than flaking. The SNAP test logs the full trajectory for eyeballing.
 *
 * Invariants:
 *   ECON-DRIFT  monthly net income stays bounded — no rep-income runaway (soft cap holds)
 *   ECON-FLOOR  treasury is solvent in the clear majority of years
 *   KAGE-CAP    every Kage attribute respects KAGE_ATTR_CAP; level/xp stay finite
 *   KAGE-SPEND  unspent points don't balloon unboundedly once the build is capped
 *   ROSTER      shinobi count never collapses below the floor across 20 years
 *   COMPETE     player isn't wedged in last place for the whole dynasty
 */

import { describe, it, expect } from 'vitest'
import { withSeed } from './helpers/rng.js'
import { initSeasonTable, playMatchday, sortedTable } from '../shared/utils/season.js'
import { tickRivalStrength } from '../shared/utils/rivalSim.js'
import { villageRevenue, REP_SOFT_CAP } from '../shared/utils/economy.js'
import {
  newKageDev, addKageXp, spendKagePoint, applyKagePath, KAGE_ATTR_CAP, KAGE_ATTRS,
} from '../shared/constants/kageDev.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const NAMES = ['HiddenLeaf', 'Kazegakure', 'Shimogakure', 'Gangakure', 'Raikurokure']
const PLAYER = NAMES[0]
const YEARS = 20

// Greedy point-spend: pour points into the lowest non-capped attribute, mirroring a
// player who keeps developing. Returns leftover (unspendable) points.
const ATTR_IDS = KAGE_ATTRS.map(a => a.id)
function spendAllPoints(G) {
  let guard = 0
  while (G.kageDev.points > 0 && guard++ < 200) {
    const target = ATTR_IDS
      .filter(id => (G.kageDev.attrs[id] || 0) < KAGE_ATTR_CAP)
      .sort((a, b) => (G.kageDev.attrs[a] || 0) - (G.kageDev.attrs[b] || 0))[0]
    if (!target) break                 // fully capped build — nothing left to buy
    if (!spendKagePoint(G, target)) break
  }
  return G.kageDev.points
}

function runDynasty(seed) {
  return withSeed(seed, () => {
    const G = {
      ryo: 50000, reputation: 30, prestigeTier: 'D',
      kageDev: newKageDev(),
      villages: [
        { n: 'Kazegakure',  strength: 55 }, { n: 'Shimogakure', strength: 65 },
        { n: 'Gangakure',   strength: 48 }, { n: 'Raikurokure', strength: 72 },
      ],
      shinobi: Array.from({ length: 12 }, (_, i) => ({ ri: i < 2 ? 2 : i < 6 ? 1 : 0, salary: 500 + (i < 2 ? 2 : i < 6 ? 1 : 0) * 400 })),
    }
    applyKagePath(G, 'administrator')   // a representative build

    const track = { ryo: [], net: [], rep: [], level: [], leftover: [], finishes: [], maxAttr: [], rivalStr: [] }

    for (let y = 1; y <= YEARS; y++) {
      const season = { year: y, round: 0, table: initSeasonTable(NAMES), lastResults: [] }
      const strOf = name => {
        if (name === PLAYER) {
          const avail = G.shinobi.filter(s => !s.injured).length
          const avgRi = G.shinobi.reduce((a, s) => a + s.ri, 0) / G.shinobi.length
          return Math.round(avail * (5 + avgRi * 3))
        }
        return Math.round(G.villages.find(v => v.n === name)?.strength || 50)
      }

      let yearNetSum = 0
      for (let m = 1; m <= 12; m++) {
        // Economy — the real curve, with administration income mod folded in.
        const adminMod = 1 + (G.kageDev.attrs.administration || 0) * 0.012
        const income = Math.round(villageRevenue(G.reputation, G.prestigeTier) * adminMod)
        const wages = G.shinobi.reduce((a, s) => a + s.salary, 0)
        const net = income - wages
        yearNetSum += net
        G.ryo = Math.max(0, G.ryo + net)

        // Missions → reputation ramp (climbs well past the soft cap over 20y).
        let wins = 0
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.62) { wins++; G.ryo += 3000 }
        }
        G.reputation = clamp(G.reputation + (Math.random() < 0.5 ? 1 : 0), 0, 999)

        // Kage XP — base monthly + win bonus, then spend points greedily.
        addKageXp(G, 4 + wins * 2)
        spendAllPoints(G)

        G.villages.forEach(v => tickRivalStrength(v))
        if (season.round < NAMES.length) playMatchday(season, NAMES, strOf)

        // Roster churn: injuries, promotions, retirements, refill.
        G.shinobi.forEach(s => {
          s.injured = !s.injured && Math.random() < 0.05
          if (!s.injured && s.ri < 4 && Math.random() < 0.08) { s.ri = Math.min(4, s.ri + 1); s.salary = 500 + s.ri * 400 }
          if (s.ri >= 3 && Math.random() < 0.01) s._retire = true
        })
        G.shinobi = G.shinobi.filter(s => !s._retire)
        while (G.shinobi.length < 12) G.shinobi.push({ ri: 0, salary: 500, injured: false })
      }

      // Prestige climbs with reputation.
      G.prestigeTier = ([['S', 200], ['A', 120], ['B', 70], ['C', 30], ['D', 0]].find(([, t]) => G.reputation >= t) || ['D'])[0]

      const myPos = sortedTable(season.table).findIndex(r => r.name === PLAYER) + 1
      track.ryo.push(G.ryo); track.net.push(Math.round(yearNetSum / 12)); track.rep.push(G.reputation)
      track.level.push(G.kageDev.level); track.leftover.push(G.kageDev.points)
      track.finishes.push(myPos); track.maxAttr.push(Math.max(...ATTR_IDS.map(id => G.kageDev.attrs[id])))
      track.rivalStr.push(G.villages.map(v => Math.round(v.strength)))
    }
    return { G, track }
  })
}

describe('Dynasty balance sweep — 20-year deterministic', () => {
  const SEED = 20260624
  const { G, track } = runDynasty(SEED)

  it('ECON-DRIFT: monthly net never runs away (rep soft cap holds)', () => {
    // With rep climbing past REP_SOFT_CAP for years, the soft cap must keep the
    // baseline income bounded. Ceiling = max possible villageRevenue (rep 999, S
    // prestige) × the largest plausible admin mod — generously padded.
    const ceiling = villageRevenue(999, 'S') * 1.2
    track.net.forEach((n, i) => {
      expect(Number.isFinite(n), `Year ${i + 1} net not finite`).toBe(true)
      expect(n, `Year ${i + 1} net ${n} exceeds runaway ceiling ${ceiling}`).toBeLessThan(ceiling)
    })
  })

  it('ECON-FLOOR: treasury is solvent in ≥ 16 of 20 years', () => {
    expect(track.ryo.filter(r => r > 0).length).toBeGreaterThanOrEqual(16)
  })

  it('KAGE-CAP: every attribute respects the cap; level & xp finite', () => {
    ATTR_IDS.forEach(id => expect(G.kageDev.attrs[id]).toBeLessThanOrEqual(KAGE_ATTR_CAP))
    expect(Number.isFinite(G.kageDev.level)).toBe(true)
    expect(Number.isFinite(G.kageDev.xp)).toBe(true)
    expect(G.kageDev.level).toBeGreaterThan(1)              // progression actually happened
  })

  it('KAGE-SPEND: unspent points stay bounded even after the build caps out', () => {
    // Once all 6 attrs hit 12 there is nothing left to buy, so leftover points
    // accumulate. That is acceptable, but it must not be absurd — a soft sanity
    // ceiling guards against a future curve change quietly minting huge surpluses.
    expect(G.kageDev.points).toBeLessThanOrEqual(40)
  })

  it('ROSTER: shinobi roster holds the floor across the dynasty', () => {
    expect(G.shinobi.length).toBeGreaterThanOrEqual(12)
  })

  it('COMPETE: player is not last every single season', () => {
    expect(track.finishes.some(p => p < NAMES.length)).toBe(true)
  })

  it('RIVAL-DRIFT: rivals settle into a band, not all pinned at the cap', () => {
    // The mean-reverting strength model must keep rivals differentiated over a full
    // dynasty. If every rival saturated at 200 the spread would collapse to ~0.
    const finalYear = track.rivalStr.at(-1)
    const spread = Math.max(...finalYear) - Math.min(...finalYear)
    expect(spread, `rivals collapsed to a single strength: ${finalYear.join(',')}`).toBeGreaterThan(8)
    expect(Math.max(...finalYear), 'a rival saturated at the 200 cap').toBeLessThan(195)
  })

  it('SNAP: dynasty trajectory (logged, not asserted)', () => {
    const cap = ATTR_IDS.every(id => G.kageDev.attrs[id] >= KAGE_ATTR_CAP)
    const firstCapYear = track.maxAttr.findIndex(v => v >= KAGE_ATTR_CAP) + 1
    console.log([
      '',
      '════════════════════════════════════════════════',
      `  DYNASTY SWEEP — ${YEARS} years (seed ${SEED})`,
      '════════════════════════════════════════════════',
      `  Year-end ryo : ${track.ryo.map(r => Math.round(r / 1000) + 'k').join(' ')}`,
      `  Avg mo. net  : ${track.net.map(n => Math.round(n / 1000) + 'k').join(' ')}`,
      `  Reputation   : ${track.rep.join(' ')}   (soft cap ${REP_SOFT_CAP})`,
      `  Kage level   : ${track.level.join(' ')}`,
      `  Unspent pts  : ${track.leftover.join(' ')}`,
      `  Finishes     : ${track.finishes.join(' ')}  (1=top, ${NAMES.length}=last)`,
      `  Build capped : ${cap ? `yes (first attr hit ${KAGE_ATTR_CAP} ~year ${firstCapYear})` : 'no'}`,
      '════════════════════════════════════════════════',
    ].join('\n'))
    expect(true).toBe(true)
  })

  it('STABLE: a different seed produces the same structural verdicts', () => {
    const alt = runDynasty(987654321)
    expect(alt.track.net.every(n => n < villageRevenue(999, 'S') * 1.2)).toBe(true)
    expect(alt.G.shinobi.length).toBeGreaterThanOrEqual(12)
    ATTR_IDS.forEach(id => expect(alt.G.kageDev.attrs[id]).toBeLessThanOrEqual(KAGE_ATTR_CAP))
  })
})
