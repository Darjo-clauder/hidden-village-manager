/**
 * Finance slice of the monthly tick, extracted from adv.js.
 *
 * Part of breaking up a single ~2,900-line adv() into per-system modules
 * (T4.1). Same architecture as tick/rivals.js and tick/offSeason.js: operates
 * on the global G singleton, returns nothing.
 *
 * The village's books for the month: revenue and expenditure assembled into a
 * snapshot, the salary cap and its luxury tax, and — each December — the
 * year-end financial report and season awards.
 *
 * The four compute* helpers below moved with it; they were private to adv.js
 * and had no caller outside this block.
 */
import { G, clamp, fmt, sn, pk, addChronicle, addLegend, addNotice, addTrait } from '../state.js'
import { aL, ntf } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { DAIMYO_BONUS, BUILDING_MAINTENANCE, FINANCE_TIERS, FINANCIAL_EVENTS, MISSION_COMMISSION, PRESTIGE_TIERS, DOCTRINE_BY_ID, SERVICE_AWARDS } from '../constants.js'
import { villageRevenue } from '../../../shared/utils/economy.js'
import { capStatus } from '../../../shared/constants/salaryCap.js'
import { kageMod, kagePerk } from '../../../shared/constants/kageDev.js'
import { revenueMult } from '../../../shared/utils/populace.js'
import { allocationEffects, normalizeAllocation, rampToward } from '../../../shared/utils/budgetRamp.js'
import { leagueLeaders, snapshotSeasonStats } from '../../../shared/utils/seasonStats.js'
import { sortedTable } from '../../../shared/utils/season.js'
import { nationMods } from '../../../shared/constants/nations.js'
import { applyDebt } from '../../../shared/utils/debt.js'
import { computeAwards } from '../../../shared/utils/awards.js'
import { emit, integrityCheck } from '../../../shared/utils/telemetry.js'
import { pushNarrative } from './inbox.js'

// ── Finance helpers ────────────────────────────────────────────────────────────
function computeDaimyoBonus() {
  const leg = G.legend || 0
  for (const tier of DAIMYO_BONUS) {
    if (leg >= tier.at) return tier.amount
  }
  return 0
}

function computeVillageRevenue() {
  const base = villageRevenue(G.reputation || 0, G.prestigeTier || 'D')
  // The family name pays a standing stipend once the lineage is established
  // (cross-run legacy, see shared/utils/legacy.js). Flat, so it matters most
  // early and fades into noise as the village grows -- a leg-up, not a crutch.
  const stipend = G.legacyStipend || 0
  return Math.round(base * (G._citizenRevMult || 1)) + stipend
}

function computeMaintenance() {
  let total = 0
  Object.keys(G.upgrades).forEach(k => {
    const lv = G.upgrades[k]
    if (lv > 0) total += (BUILDING_MAINTENANCE[k] || 400) * lv
  })
  return total
}

function computeFinanceTier(net) {
  for (const tier of FINANCE_TIERS) {
    if (net >= tier.minNet) return tier
  }
  return FINANCE_TIERS[FINANCE_TIERS.length - 1]
}

/** @param {{ sb: object, season: string, sponsorshipIncome: number }} ctx */
export function tickFinance(ctx) {
  const { sb, season, sponsorshipIncome } = ctx
  // ── Economy & Finance snapshot ────────────────────────────────────────────
  const trI = Math.round(G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0) * sb.tradeIncomeMultiplier)
  const coI = Math.round(G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0) * sb.tradeIncomeMultiplier)
  const jkI = G.beasts.filter(b => b.sealed && b.n === 'Niryuu' && b.jk).length * 3000
    + (G._kurenigykiBonus ? 5000 : 0) // Kureni+Hachitsuno trade bonus
  const daimyoB = Math.round(computeDaimyoBonus() * (G.daimyoBudgetMult || 1))
  const villageRev = Math.round(computeVillageRevenue() * (G.daimyoBudgetMult || 1) * revenueMult(G.populace?.support))
  if (!G.budgetPriority) G.budgetPriority = { ...DEFAULT_ALLOCATION }
  // Effective allocation lags the target — this month's maintenance reflects
  // what has actually been funded so far, not what was just requested.
  if (!G.budgetEffective) G.budgetEffective = normalizeAllocation(G.budgetPriority)
  G.budgetEffective = rampToward(G.budgetEffective, G.budgetPriority)
  const maintenance = Math.round(computeMaintenance() * allocationEffects(G.budgetEffective).maintMult)
  // twoWay players (farm-assigned) don't count against the salary cap payroll
  const shinobiSal = G.shinobi.reduce((a, s) => a + (s.salary || 0), 0)
  const capPayroll = G.shinobi.filter(s => !s.twoWay).reduce((a, s) => a + (s.salary || 0), 0)
  const staffSal = (G.staff || []).reduce((a, st) => a + (st.salary || 0), 0)
  const commI = Object.entries(G.finances?.missionCommissions || {}).reduce((a,[,v]) => a + v * 0, 0) // commissions already applied to G.ryo
  const examFeeAmt = G.finances?.examFees || 0
  const loanFeeAmt = G.finances?.loanFees || 0

  const _natIncMult = G._ff_nationHud ? (1 + nationMods(G.nationId).ryoMod) : 1
  // Climate + doctrine economic modifiers (variable playthroughs)
  const _docInc = (DOCTRINE_BY_ID[G.villageDoctrine]?.incomeMod) || 0
  const _climateInc = (G.worldClimate?.economyMod) || 0
  const _econMult = Math.max(0.3, 1 + _climateInc + _docInc + kageMod(G, 'administration'))
  const _kageStipend = kagePerk(G) === 'stipend' ? 600 : 0
  const totalIncome = Math.round((trI + coI + jkI + daimyoB + villageRev + examFeeAmt + loanFeeAmt + sponsorshipIncome + _kageStipend) * _natIncMult * _econMult)
  const totalExpend = shinobiSal + staffSal + maintenance
  const monthlyNet = totalIncome - totalExpend

  // Apply economy flows
  G.ryo += totalIncome  // nation-adjusted (see _natIncMult)
  G.ryo -= shinobiSal + staffSal + maintenance

  // ── Salary cap check ─────────────────────────────────────────────────────
  // Cap counts shinobi payroll only — staff are exempt infrastructure (see salaryCap.js).
  const _cs = capStatus(G.prestigeTier || 'D', capPayroll)
  G.capStatus = _cs
  G._capHardBlock = _cs.hardBlock
  // Luxury tax is a real treasury outflow, so fold it into the recorded net below —
  // otherwise every displayed "monthly net" understates the true burn by the tax.
  const luxuryTax = _cs.overBy > 0 ? _cs.luxuryTax : 0
  const netAfterTax = monthlyNet - luxuryTax
  if (_cs.overBy > 0) {
    G._mandateLuxTaxMonths = (G._mandateLuxTaxMonths || 0) + 1
    G.ryo = Math.max(0, G.ryo - _cs.luxuryTax)
    if (_cs.hardBlock) {
      aL(tr('toast.adv.hardCapExceeded', { pct: Math.round(_cs.pct * 100), tax: fmt(_cs.luxuryTax) }), 'bad')
    } else {
      aL(tr('toast.adv.luxuryTax', { tax: fmt(_cs.luxuryTax), label: _cs.label }), 'warn')
    }
  }

  // #12 Optional debt/overdraft (flag-gated): accrue interest instead of an implicit hole
  if (G._ff_debt && G.ryo < 0) {
    const d = applyDebt(G.ryo)
    G.ryo = d.ryo; G.debt = d.debt
    if (d.interestCharged > 0) aL(tr('toast.adv.arrears', { interest: fmt(d.interestCharged), debt: fmt(d.debt) }), 'bad')
  }

  // Record finance snapshot
  if (!G.finances) G.finances = { history:[], deficitMonths:0, healthTier:'Stable', lastMonthNet:0, missionCommissions:{D:0,C:0,B:0,A:0,S:0}, examFees:0, loanFees:0, scoutCostThisMonth:0 }
  const commByRank = G.finances.missionCommissions || {D:0,C:0,B:0,A:0,S:0}
  const commTotal = Object.entries(commByRank).reduce((a,[rk,cnt]) => a + cnt * (MISSION_COMMISSION[rk]||0), 0)
  const snap = {
    year: G.year, month: G.month,
    income: { tradeRoutes:trI, contracts:coI, vessel:jkI, daimyoBonus:daimyoB, villageRevenue:villageRev, missionCommissions:commTotal, examFees:examFeeAmt, loanFees:loanFeeAmt, sponsorship:sponsorshipIncome, nationBonus: totalIncome - (trI + coI + jkI + daimyoB + villageRev + examFeeAmt + loanFeeAmt + sponsorshipIncome) },
    expenditure: { shinobiWages:shinobiSal, staffWages:staffSal, maintenance, luxuryTax, scoutCost:G.finances.scoutCostThisMonth||0 },
    totalIncome, totalExpend: totalExpend + luxuryTax, net:netAfterTax,
    missionBreakdown: { ...commByRank },
    shinobiByRank: {
      Initiate: G.shinobi.filter(s=>s.ri===0).length,
      Adept: G.shinobi.filter(s=>s.ri===1).length,
      Veteran: G.shinobi.filter(s=>s.ri===2).length,
      Shadow: G.shinobi.filter(s=>s.ri===3).length,
      'S-Rank': G.shinobi.filter(s=>s.ri===4).length,
    }
  }
  G.finances.history.push(snap)
  if (G.finances.history.length > 12) G.finances.history.shift()
  G.finances.lastMonthNet = netAfterTax

  // Determine health tier — on the true net, so "Stable" can't hide a luxury-tax drain.
  const tier = computeFinanceTier(netAfterTax)
  G.finances.healthTier = tier.n
  if (tier.morale !== 0) G.morale = clamp(G.morale + tier.morale, 0, 100)

  // Telemetry (side-effect-only buffer; never alters game logic)
  emit('economy_tick', { year: G.year, month: G.month, ryo: G.ryo, net: netAfterTax, deficitMonths: G.finances.deficitMonths, tier: tier.n })
  emit('integrity_check', integrityCheck(G))

  // Deficit tracking & debt spiral
  if (netAfterTax < 0) {
    G.finances.deficitMonths = (G.finances.deficitMonths || 0) + 1
    if (G.finances.deficitMonths >= 3 && Math.random() < 0.25) {
      const ev = pk(FINANCIAL_EVENTS)
      G.ryo = Math.max(0, G.ryo + ev.ryo)
      if (ev.rep) G.reputation = clamp(G.reputation + ev.rep, 0, 999)
      if (ev.morale) G.morale = clamp(G.morale + ev.morale, 0, 100)
      aL(tr('toast.adv.financialCrisis', { name: ev.n, desc: ev.desc }), 'bad')
      addChronicle('Financial Crisis', ev.n + ': ' + ev.desc, 'event')
    }
  } else {
    G.finances.deficitMonths = 0
  }

  // ── End-of-year financial report ────────────────────────────────────────────
  if (G.month === 12) {
    const yearSnaps = G.finances.history.filter(h => h.year === G.year)
    const yearIncome = yearSnaps.reduce((a, h) => a + h.totalIncome, 0)
    const yearExpend = yearSnaps.reduce((a, h) => a + h.totalExpend, 0)
    const yearNet = yearIncome - yearExpend
    const streams = {
      tradeRoutes: yearSnaps.reduce((a,h)=>a+(h.income?.tradeRoutes||0),0),
      contracts: yearSnaps.reduce((a,h)=>a+(h.income?.contracts||0),0),
      daimyoBonus: yearSnaps.reduce((a,h)=>a+(h.income?.daimyoBonus||0),0),
      missionCommissions: yearSnaps.reduce((a,h)=>a+(h.income?.missionCommissions||0),0),
      sponsorship: yearSnaps.reduce((a,h)=>a+(h.income?.sponsorship||0),0),
      wages: yearSnaps.reduce((a,h)=>a+(h.expenditure?.shinobiWages||0)+(h.expenditure?.staffWages||0),0),
      maintenance: yearSnaps.reduce((a,h)=>a+(h.expenditure?.maintenance||0),0),
    }
    const daimyoReaction = yearNet >= 0
      ? 'The Daimyo notes the village remained financially sound through Year ' + G.year + '.'
      : 'The Daimyo expresses concern over Year ' + G.year + '\'s deficit and urges fiscal discipline.'
    G.yearEndReports = G.yearEndReports || []
    G.yearEndReports.push({ year: G.year, totalIncome: yearIncome, totalExpend: yearExpend, net: yearNet, streams, daimyoReaction })
    if (G.yearEndReports.length > 10) G.yearEndReports.shift()
    addChronicle('Year ' + G.year + ' Financial Report', `Income ${fmt(yearIncome)} / Expenditure ${fmt(yearExpend)} / Net ${yearNet>=0?'+':''}${fmt(yearNet)}. ${daimyoReaction}`, 'milestone')

    // ── Season stats snapshot ────────────────────────────────────────────────
    const _snap = snapshotSeasonStats(G)
    G.seasonStats = G.seasonStats || {}
    G.seasonStats[G.year] = _snap
    if (Object.keys(G.seasonStats).length > 10) {
      const oldest = Math.min(...Object.keys(G.seasonStats).map(Number))
      delete G.seasonStats[oldest]
    }
    const _leaders = leagueLeaders(_snap)
    if (_leaders.topWins[0]?.winsThisSeason > 0) {
      const mvpPre = _leaders.topWins[0]
      addChronicle('Year ' + G.year + ' Season Stats', `League leaders — Wins: ${mvpPre.name} (${mvpPre.winsThisSeason}). Missions: ${_leaders.topMissions[0]?.name} (${_leaders.topMissions[0]?.missionsThisSeason}). Career leader: ${_leaders.topCareer[0]?.name} (${_leaders.topCareer[0]?.wins} all-time).`, 'milestone')
    }

    // ── Awards ceremony ──────────────────────────────────────────────────────
    const _awards = computeAwards(G, _snap)
    G.seasonAwards = G.seasonAwards || {}
    G.seasonAwards[G.year] = _awards
    for (const award of Object.values(_awards)) {
      if (award?.name) addChronicle('Award: ' + award.label, award.name + ' — ' + award.reason, 'milestone')
    }

    // ── Reset per-season shinobi accumulators ────────────────────────────────
    G.shinobi.forEach(s => { s._seasonWins = 0; s._seasonMissions = 0; s._seasonSRankWins = 0 })

    // ── Draft order: seed by inverse standings (worst first gets pick #1) ────
    const _table = G.season?.table || {}
    const _sorted = Object.values(_table).sort((a, b) => (a.pts || 0) - (b.pts || 0))
    G.draftOrder = _sorted.map(r => r.name)
    G._draftPlayerPick = G.draftOrder.findIndex(n => n === G.vName) + 1

    // ── Season Review special — the year, stitched into one story ────────────
    // Pure assembly of data the systems already record: standings, exam champion,
    // awards, invitational, the fallen. Lands as a long-form inbox feature.
    {
      const order = sortedTable(_table)
      const pos = order.findIndex(r => r.name === G.vName) + 1
      const me = order[pos - 1]
      const parts = []
      if (order.length && me) {
        const leader = order[0]
        const posTxt = pos === 1 ? 'top of the table' : `${pos}${pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'} of ${order.length}`
        const verdict = pos === 1 ? 'A campaign to be proud of.' : pos <= Math.ceil(order.length / 2) ? 'A solid year with more to take.' : pos >= order.length ? 'A season the village wants to forget.' : 'A middling year — the council expects better.'
        parts.push(`<b>League:</b> ${G.vName} finished ${posTxt} (${me.w}W–${me.d}D–${me.l}L, ${me.pts} pts)${pos > 1 ? `, behind ${leader.name}` : ''}. ${verdict}`)
      }
      if (G.examChampion?.year === G.year) {
        parts.push(`<b>Adept Exam:</b> ${G.examChampion.player ? `${G.vName} took the championship — the academy pipeline delivered.` : `${G.examChampion.ico || ''} ${G.examChampion.village} claimed the exam championship.`}`)
      }
      const inv = (G.invitationalHistory || []).find(h => h.year === G.year)
      if (inv) {
        parts.push(`<b>Invitational:</b> ${inv.playerResult === 'champion' ? `champions — the cup sits in ${G.vName}.` : inv.playerResult === 'runner-up' ? `runners-up to ${inv.champion}.` : `out in the semifinals; ${inv.champion} took the cup.`}`)
      }
      const aw = G.seasonAwards?.[G.year] || {}
      const awLines = ['mvp', 'rookieOfYear', 'warHero', 'ironwall'].map(k => aw[k]).filter(a => a?.name).map(a => `${a.label}: <b>${a.name}</b>`)
      if (awLines.length) parts.push(`<b>Honors:</b> ${awLines.join(' · ')}`)
      const fallen = (G.memorial || []).filter(m => m.year === G.year && !m.transfer)
      if (fallen.length) parts.push(`<b>The fallen:</b> ${fallen.slice(0, 6).map(f => f.name).join(', ')}${fallen.length > 6 ? ` and ${fallen.length - 6} more` : ''} — remembered at the memorial stone.`)
      if (G.warSched || G.warActive) parts.push(`<b>Ahead:</b> the Grand Tournament musters — the year is not finished writing itself.`)
      if (parts.length) {
        pushNarrative({
          title: `📜 Year ${G.year} in Review`,
          body: parts.join('<br><br>'),
          tag: 'season', link: 'exam',
        })
        addChronicle(`Year ${G.year} in Review`, parts.join(' ').replace(/<[^>]+>/g, ''), 'milestone')
      }
    }
  }

  // Reset monthly accumulators
  G.finances.missionCommissions = { D:0, C:0, B:0, A:0, S:0 }
  G.finances.examFees = 0
  G.finances.loanFees = 0
  G.finances.scoutCostThisMonth = 0

  // When debt is enabled, the overdraft mechanic owns the negative balance (no implicit zero-floor).
  if (!G._ff_debt && G.ryo < 0) { aL(tr('toast.adv.treasuryEmpty'), 'bad'); G.morale = clamp(G.morale - 8, 0, 100); G.ryo = 0 }
  else if (G._ff_debt && G.ryo < 0) { G.morale = clamp(G.morale - 4, 0, 100) }

}
