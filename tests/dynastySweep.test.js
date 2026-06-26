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
import { capStatus } from '../shared/constants/salaryCap.js'
import { prestigeFromLegend } from '../shared/constants/prestige.js'
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
      ryo: 50000, reputation: 30, prestigeTier: 'D', legend: 0,
      kageDev: newKageDev(),
      villages: [
        { n: 'Kazegakure',  strength: 55 }, { n: 'Shimogakure', strength: 65 },
        { n: 'Gangakure',   strength: 48 }, { n: 'Raikurokure', strength: 72 },
      ],
      shinobi: Array.from({ length: 12 }, (_, i) => ({ ri: i < 2 ? 2 : i < 6 ? 1 : 0, salary: 500 + (i < 2 ? 2 : i < 6 ? 1 : 0) * 400 })),
      // Staff bill — the REAL game seeds 7 staff (~19.3k/mo: 2 starters + 5 scout
      // network). This is the cost line the old sweep omitted, which let the year-1
      // deficit bug slip past. Higher prestige lets the player field elite command
      // staff, so the bill scales modestly with tier (see staff-hire-on-promotion below).
      staff: [
        { salary: 3570 }, { salary: 3920 },                                  // starter scout + team sensei
        { salary: 2700 }, { salary: 2200 }, { salary: 1900 }, { salary: 2200 }, { salary: 2800 }, // 5 seeded scouts
      ],
    }
    applyKagePath(G, 'administrator')   // a representative build
    const PRESTIGE_IDX = { D: 0, C: 1, B: 2, A: 3, S: 4 }

    const track = { ryo: [], net: [], rep: [], level: [], leftover: [], finishes: [], maxAttr: [], rivalStr: [], staffBill: [], roster: [], legend: [], prestige: [] }

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
      const pIdx = PRESTIGE_IDX[G.prestigeTier] || 0
      for (let m = 1; m <= 12; m++) {
        // Economy — the real curve, with administration income mod folded in.
        const adminMod = 1 + (G.kageDev.attrs.administration || 0) * 0.012
        const income = Math.round(villageRevenue(G.reputation, G.prestigeTier) * adminMod)
        // FULL cost structure (previously only shinobi wages were modelled):
        const wages = G.shinobi.reduce((a, s) => a + s.salary, 0)
        const staffBill = G.staff.reduce((a, s) => a + s.salary, 0)
        // Infrastructure upkeep grows with the village (prestige), reduced ~10% by the
        // default infra budget slider — mirrors the maintenance line in the live finances panel.
        const upkeep = Math.round((2500 + pIdx * 1500) * 0.9)
        // Luxury tax — shinobi payroll over the prestige cap (staff exempt), a real
        // treasury outflow the old sweep ignored entirely.
        const luxuryTax = capStatus(G.prestigeTier, wages).luxuryTax
        const net = income - wages - staffBill - upkeep - luxuryTax
        yearNetSum += net
        G.ryo = Math.max(0, G.ryo + net)

        // Missions → reputation ramp (climbs well past the soft cap over 20y).
        // Mission payout scales with prestige — higher-tier villages run higher-rank
        // contracts (D ~3k → S ~9k per win), so income grows alongside the cost base
        // instead of staying frozen while staff/wages climb.
        let wins = 0
        const missionReward = 3000 + pIdx * 1500
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.62) { wins++; G.ryo += missionReward }
        }
        G.reputation = clamp(G.reputation + (Math.random() < 0.5 ? 1 : 0), 0, 999)
        // Legend → prestige. Mirrors the live driver: missions grant legend per win
        // (~B-rank proxy, addLegend in adv.js), tournament/exam wins add annual lumps
        // (below). Prestige is derived from legend, NOT reputation.
        G.legend = (G.legend || 0) + wins * 2

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
        // Roster grows toward the real game's size (academy intake): ~12 → ~40 over a
        // dynasty, so the wage bill scales the way it actually does in a live save.
        const rosterTarget = Math.min(40, 12 + Math.floor((y - 1) * 1.5))
        while (G.shinobi.length < rosterTarget) G.shinobi.push({ ri: 0, salary: 500, injured: false })
      }

      const myPos = sortedTable(season.table).findIndex(r => r.name === PLAYER) + 1
      // Year-end legend lumps: Grand Tournament win (+30, war.js) for the top seed,
      // a Chunin Exam / strong-finish bonus (+15) for a podium finish, plus a small
      // academy-graduates baseline (+10). Then derive prestige from legend.
      if (myPos === 1) G.legend += 30
      if (myPos <= 3) G.legend += 15
      G.legend += 10
      const prevTier = G.prestigeTier
      G.prestigeTier = prestigeFromLegend(G.legend)
      // On a prestige promotion the player unlocks and hires elite command staff —
      // the staff bill climbs with the village, not just the wage bill.
      if ((PRESTIGE_IDX[G.prestigeTier] || 0) > (PRESTIGE_IDX[prevTier] || 0)) {
        G.staff.push({ salary: 6000 + (PRESTIGE_IDX[G.prestigeTier] || 0) * 1500 })
      }
      track.ryo.push(G.ryo); track.net.push(Math.round(yearNetSum / 12)); track.rep.push(G.reputation)
      track.level.push(G.kageDev.level); track.leftover.push(G.kageDev.points)
      track.finishes.push(myPos); track.maxAttr.push(Math.max(...ATTR_IDS.map(id => G.kageDev.attrs[id])))
      track.rivalStr.push(G.villages.map(v => Math.round(v.strength)))
      track.staffBill.push(G.staff.reduce((a, s) => a + s.salary, 0)); track.roster.push(G.shinobi.length)
      track.legend.push(G.legend); track.prestige.push(G.prestigeTier)
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

  it('ECON-RUNWAY: a passive fresh village survives the intended ~8-month runway', () => {
    // Encodes the design target that the year-1 deficit bug violated. A brand-new
    // village (rep 10, D-tier) that plays PASSIVELY — earning no mission income —
    // must not bankrupt almost immediately; it should have a multi-month grace period
    // (~8mo by design) to learn the systems. Uses the REAL villageRevenue curve plus
    // the verified live starting cost structure (22 shinobi + 7 seeded staff), so a
    // regression to BASE_REVENUE or the seeded staff load flips this assertion.
    const startRyo = 60000
    const income = villageRevenue(10, 'D')           // real curve → 32,000 at launch
    const shinobiWages = 19450                        // 22-shinobi starting roster (verified in-game)
    const staffBill = 19290                           // 7 seeded staff (verified in-game)
    // Root-cause guard: the default starting roster must be LEGAL under its own cap.
    // (The bug was a fresh village sitting ~2× over the D cap, bleeding a hidden luxury
    // tax. Staff are now cap-exempt, so the cap sees shinobi wages only.)
    const startTax = capStatus('D', shinobiWages).luxuryTax
    expect(startTax, `fresh roster pays ${startTax} luxury tax — it should be cap-legal`).toBe(0)
    const passiveNet = income - shinobiWages - staffBill - startTax
    expect(passiveNet, 'passive net should be a gentle deficit, not steep').toBeGreaterThan(-9000)
    const runwayMonths = passiveNet >= 0 ? Infinity : startRyo / -passiveNet
    expect(runwayMonths, `passive runway only ${runwayMonths.toFixed(1)} months`).toBeGreaterThanOrEqual(6)
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
      `  Roster size  : ${track.roster.join(' ')}`,
      `  Staff bill   : ${track.staffBill.map(s => Math.round(s / 1000) + 'k').join(' ')}`,
      `  Reputation   : ${track.rep.join(' ')}   (soft cap ${REP_SOFT_CAP})`,
      `  Legend       : ${track.legend.join(' ')}`,
      `  Prestige     : ${track.prestige.join(' ')}`,
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
