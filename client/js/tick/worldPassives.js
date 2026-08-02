/**
 * World-passives slice of the monthly tick, extracted from adv.js.
 *
 * Part of breaking up a single ~2,900-line adv() into per-system modules
 * (T4.1). Same architecture as tick/rivals.js and tick/offSeason.js: operates
 * on the global G singleton, returns nothing.
 *
 * This block is everything that happens *to* the village before anyone acts —
 * the season's weather, buildings finishing, standing world conditions burning
 * down, the council's standing perks, the floors that stop a bad run spiralling,
 * monuments completing, and the civilian mood that scales the month's revenue.
 *
 * `ctx` carries the values adv() derives once at the top of the tick, rather
 * than recomputing them here: recomputation would be identical today but is
 * exactly the kind of drift that makes an extracted module quietly disagree
 * with its original.
 */
import { G, clamp, addLegend, addChronicle } from '../state.js'
import { aL, ntf } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { addNewsItem } from '../news.js'
import { DISTRICTS } from '../../../shared/constants/districts.js'
import { COUNCIL_FACTIONS } from '../../../shared/constants/council.js'
import { PROJECT_BY_ID, completedEffect } from '../../../shared/constants/prestigeProjects.js'

/** @param {{ monthDef: object, dp: object, cp: object }} ctx */
export function tickWorldPassives(ctx) {
  const { monthDef, dp, cp } = ctx

  // Latch: the village has been genuinely broke at least once. Read by the
  // "From the Brink" achievement, which is only meaningful as a recovery.
  if ((G.ryo || 0) < 1000) G._everBroke = true

  // ── Seasonal passive effects ────────────────────────────────────────────
  if (monthDef?.effects?.morale) G.morale = clamp(G.morale + monthDef.effects.morale, 0, 100)
  if (monthDef?.effects?.ryo) G.ryo = Math.max(0, G.ryo + monthDef.effects.ryo)

  // ── District build progress & passive income ────────────────────────────
  if (!G.districts) G.districts = []
  G.districts.forEach(d => {
    if (d.status === 'building') {
      d.buildMonthsLeft = (d.buildMonthsLeft || 1) - 1
      if (d.buildMonthsLeft <= 0) {
        d.status = 'built'
        const def = DISTRICTS.find(x => x.id === d.id)
        aL(tr('toast.adv.districtComplete', { name: def?.n || d.id }), 'good')
        ntf(tr('toast.adv.districtBuilt', { icon: def?.icon || '🏗', name: def?.n || d.id }))
      }
    }
  })
  if (dp.monthlyRyo > 0) G.ryo += dp.monthlyRyo

  // ── Persistent world flag tick-down ─────────────────────────────────────
  Object.keys(G.worldFlags || {}).forEach(k => {
    G.worldFlags[k]--
    if (G.worldFlags[k] <= 0) { delete G.worldFlags[k]; aL(tr('toast.adv.flagEnded', { flag: k }), 'neutral') }
    else {
      if (k === 'drought') { G.ryo -= 1000; G.morale = clamp(G.morale - 1, 0, 100) }
      if (k === 'plague')  { G.morale = clamp(G.morale - 2, 0, 100); G.reputation = clamp(G.reputation - 1, 0, 999) }
    }
  })

  // ── Council approval passives & monthly proposal ────────────────────────
  if (!G.councilApproval) G.councilApproval = {}
  COUNCIL_FACTIONS.forEach(f => { if (G.councilApproval[f.id] === undefined) G.councilApproval[f.id] = 50 })
  // Apply perks
  if (cp.monthlyRyo > 0) G.ryo += cp.monthlyRyo
  if (cp.monthlyRep > 0) G.reputation = clamp(G.reputation + cp.monthlyRep, 0, 999)

  // ── Pillar 6a: Tier-based rep floor + softened decay ─────────────────────
  const TIER_REP_FLOOR = { D: 5, C: 15, B: 25, A: 40, S: 60 }
  const TIER_MORALE_FLOOR = { D: 20, C: 30, B: 40, A: 50, S: 60 }
  const tierKey = G.prestigeTier || 'D'
  const repFloor = TIER_REP_FLOOR[tierKey] || 5
  const moraleFloor = (TIER_MORALE_FLOOR[tierKey] || 20) + completedEffect(G.prestigeCompleted, 'moraleFloor')
  if ((G.reputation || 0) < repFloor) G.reputation = Math.min(repFloor, (G.reputation || 0) + 2)
  // Hard morale floor — tier prestige + completed monuments buy resilience.
  G._moraleFloor = moraleFloor
  if ((G.morale || 50) < moraleFloor) G.morale = clamp(moraleFloor, 0, 100)

  // ── Prestige projects — advance multi-year monument builds ────────────────
  G.prestigeBuilds = G.prestigeBuilds || []
  G.prestigeCompleted = G.prestigeCompleted || []
  if (G.prestigeBuilds.length) {
    const stillBuilding = []
    for (const b of G.prestigeBuilds) {
      b.monthsDone = (b.monthsDone || 0) + 1
      const def = PROJECT_BY_ID[b.id]
      if (def && b.monthsDone >= def.buildMonths) {
        G.prestigeCompleted.push(b.id)
        if (def.effect?.legend) addLegend(def.effect.legend)
        G.morale = clamp((G.morale || 50) + 5, 0, 100)
        aL(tr('toast.adv.projectComplete', { icon: def.icon, name: def.name }), 'good')
        addChronicle(def.name + ' Completed', `The ${def.name} stands complete — ${def.desc}`, 'milestone')
        addNewsItem(`${def.icon} ${G.vName} completed the ${def.name}.`)
      } else stillBuilding.push(b)
    }
    G.prestigeBuilds = stillBuilding
  }

  // ── Citizen morale — village population sentiment ─────────────────────────
  if (!G.citizenMorale) G.citizenMorale = 60
  // Win streaks lift spirits; KIA and loss streaks erode trust
  const _recentWins = (G.winStreak || 0)
  const _recentLoss = (G.lossStreak || 0)
  const _kiaThisMonth = (G._kiaThisMonth || 0)
  let _cmDelta = 0
  if (_recentWins >= 3) _cmDelta += 2
  else if (_recentWins >= 1) _cmDelta += 1
  if (_recentLoss >= 3) _cmDelta -= 3
  else if (_recentLoss >= 1) _cmDelta -= 1
  if (_kiaThisMonth > 0) _cmDelta -= _kiaThisMonth * 2
  if ((G.reputation || 0) >= 50) _cmDelta += 1
  // Slow drift toward 50 when nothing is happening
  if (_cmDelta === 0) _cmDelta = G.citizenMorale > 50 ? -1 : G.citizenMorale < 50 ? 1 : 0
  G.citizenMorale = clamp(G.citizenMorale + _cmDelta, 0, 100)
  G._kiaThisMonth = 0
  // Citizen morale multiplies village revenue
  G._citizenRevMult = 0.7 + (G.citizenMorale / 100) * 0.6  // 0.7x at 0 morale, 1.3x at 100
}
