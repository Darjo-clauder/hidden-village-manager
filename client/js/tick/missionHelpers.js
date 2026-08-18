/**
 * Mission-side helpers, lifted out of adv.js.
 *
 * These were module-private functions in adv.js used almost entirely by the
 * mission-resolution block. When that block moved to tick/missions.js they
 * could not simply be imported back — adv.js imports tickMissions, so
 * missions.js importing adv.js would close a cycle. Nor could they stay
 * private, since a handful (maybeInduct, applyInjury, pickInjuryType,
 * pushMissionLog, jkKIAImmune, applyTrauma) still have callers in the tick
 * outside missions.

 * So they live here, imported by both. This is the "split first" step the
 * dev log argued for — it just turned out to be a helper layer rather than a
 * compute/apply seam.
 *
 * Text is unchanged from adv.js; only the `export` keyword and imports are new.
 */
import { G, clamp, sn, pk, rnd, fmt, addTrait, addChronicle, addLegend, addNotice, getLeadershipGroup } from '../state.js'
import { aL, ntf } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { combinedOf, signatureUnlocked } from '../../../shared/constants/combinedElements.js'
import { specMod, terrainMod, counterMod, elementOfNation } from '../../../shared/constants/elementalIdentity.js'
import { elementAffinityFor } from '../../../shared/constants/villageIdentity.js'
import { eligibleJutsu } from '../../../shared/jutsu/eligibility.js'
import { RANKS, INJURY_TYPES, RANK_INJ_CHANCE, RANK_WORKLOAD, RANK_INJ_POOL, TRAUMA_TRAITS, JUTSU_LIST, ALL_JUTSU, MISSION_COMMISSION } from '../constants.js'
import { hydrateQuestion } from '../../../shared/utils/pressConference.js'
import { pickJournalist } from '../../../shared/constants/journalists.js'
import { getPhilosophyMods } from '../../../shared/constants/coachingPhilosophy.js'
import { nationMods } from '../../../shared/constants/nations.js'
import { BOND_TYPES } from '../../../shared/bonds/bondTypes.js'
import { netBloodlineMod, BLOODLINE_MULTIPLIER } from '../../../shared/utils/bloodline.js'
import { formationMods } from '../../../shared/utils/formation.js'
import { staffLevelBonus } from '../../../shared/utils/staffDev.js'
import { BEAST_DATA, getSyncStage } from '../beastEngine.js'
import { isHofWorthy, buildHofEntry } from '../../../shared/utils/hallOfFame.js'
import { addMemory } from '../../../shared/utils/memorySystem.js'

/**
 * Lifted alongside the helpers that use it; it was private to adv.js too.
 * Text copied verbatim — an earlier hand-written version returned null instead
 * of undefined on a miss, which is the sort of difference that survives a test
 * suite and surfaces somewhere else entirely.
 */
function getBeastForJK(shinobiId) {
  return G.beasts?.find(b => b.sealed && b.jk === shinobiId)
}

export function pushMissionLog(entry) {
  if (!G.missionLog) G.missionLog = []
  G.missionLog.push({ id: Math.random().toString(36).slice(2), ...entry, year: G.year, month: G.month })
  if (G.missionLog.length > 30) G.missionLog.splice(0, G.missionLog.length - 30)
  G.lifetimeMissions = (G.lifetimeMissions || 0) + 1
}

export function hasUniqueAbility(shinobiId, beastName) {
  const b = getBeastForJK(shinobiId)
  if (!b || b.n !== beastName) return false
  const data = BEAST_DATA[b.n]
  if (!data?.uniqueAbility) return false
  return getSyncStage(b) >= data.uniqueAbility.stage
}

export function jkKIAImmune(s) {
  const b = getBeastForJK(s.id); if (!b) return false
  const data = BEAST_DATA[b.n]; if (!data?.uniqueAbility) return false
  if (getSyncStage(b) < data.uniqueAbility.stage) return false
  // Sakeru Sand Armor and Kureni Ninth Primal Mode both grant KIA immunity once per year
  if (b.n !== 'Sakeru' && b.n !== 'Kureni') return false
  if (!G._jkKIAImmuneYear) G._jkKIAImmuneYear = {}
  if (G._jkKIAImmuneYear[b.n] === G.year) return false
  G._jkKIAImmuneYear[b.n] = G.year
  aL(tr('toast.adv.jkDeflect', { name: sn(s), beast: b.n, mode: b.n === 'Kureni' ? 'Ninth Primal Mode' : 'Sand Armor' }), 'good')
  return true
}

export function pickInjuryType(mRk) {
  const pool = RANK_INJ_POOL[mRk] || ['muscle']
  return INJURY_TYPES.find(t => t.id === pool[Math.floor(Math.random() * pool.length)])
}

export function applyInjury(s, injType, hL, extraReduction = 0) {
  const medics = (G.staff || []).filter(st => st.role === 'medical')
  // R26: seasoned medics recover shinobi faster (level bonus on the base reduction).
  const medReduction = medics.reduce((a, st) => a + 0.5 * staffLevelBonus(st.staffLevel), 0)
  let dur = rnd(injType.minMo, injType.maxMo)
  const resist = s.injuryResist ? 1 : 0  // R25: careful rehab leaves lingering resistance (one-shot)
  dur = Math.max(1, Math.round(dur - (s.pers?.effect?.injReduct || 0) - hL - medReduction - extraReduction - resist))
  s.injuryResist = 0
  s.injDays = dur
  s.injuryType = injType.id
  s.status = 'injured'
  s.missId = null
  s.secondOpinionUsed = false
  s.specialistTreated = false

  // Track career injury count and history
  s.injuryCount = (s.injuryCount || 0) + 1
  if (!s.injuryHistory) s.injuryHistory = []
  s.injuryHistory.push({ year: G.year, month: G.month, type: injType.id, typeName: injType.n, duration: dur, treatment: 'standard' })

  // Injury-prone trait after 3+ career injuries
  if (s.injuryCount >= 3 && addTrait(s, 'InjuryProne')) {
    aL(tr('toast.adv.injuryProne', { name: sn(s), count: s.injuryCount }), 'warn')
    addNotice(sn(s) + '\'s repeated injuries are becoming a pattern — scouts will take note.', 'warn')
  }

  if (injType.id === 'severe' && injType.statLoss && Math.random() < 0.3) {
    const k = pk(['ninjutsu','taijutsu','speed','chakra'])
    s.stats[k] = Math.max(5, s.stats[k] - rnd(1, 3))
    aL(tr('toast.adv.permStatLoss', { name: sn(s) }), 'bad')
  }
  // Career-threatening injury personality evolution (severe, 3+ months)
  if (injType.id === 'severe' && dur >= 3) {
    if (s.pers?.n === 'Reckless' && Math.random() < 0.40) {
      s.pers = { n:'Careful', cat:'pos', desc:'A serious injury changed everything. They now calculate before acting.', effect:{ riskMod:-0.10 } }
      aL(tr('toast.adv.recklessBurnout', { name: sn(s) }), 'warn')
      addNotice(sn(s) + ' is a changed shinobi after their injury.', 'neutral')
    } else {
      const roll = Math.random()
      if (roll < 0.30) {
        if (addTrait(s, 'Resilient')) aL(tr('toast.adv.resilientTrait', { name: sn(s) }), 'good')
      } else if (roll < 0.50) {
        if (addTrait(s, 'Fragile')) {
          // Fragile: minor permanent stat reduction
          const k = pk(['ninjutsu','taijutsu','speed'])
          s.stats[k] = Math.max(5, s.stats[k] - 2)
          aL(tr('toast.adv.fragileTrait', { name: sn(s) }), 'bad')
        }
      }
    }
  }

  if (injType.trauma) {
    applyTrauma(s)
  }
  // Long injury → returning form penalty
  if (dur >= 3) {
    s.returningForm = 60
  }
}

export function applyTrauma(s) {
  s.traumaCount = (s.traumaCount || 0) + 1
  s.traumaStatus = pk(TRAUMA_TRAITS)
  s.traumaMonths = rnd(2, 6)
  // Stat penalty while traumatised
  Object.keys(s.stats).forEach(k => { s.stats[k] = Math.max(5, s.stats[k] - 2) })
  G.morale = clamp(G.morale - 5, 0, 100)
  aL(tr('toast.adv.trauma', { name: sn(s), status: s.traumaStatus }), 'warn')
  addChronicle('Psychological Trauma', sn(s) + ' developed a ' + s.traumaStatus + ' personality after traumatic events.', 'shinobi')
}

/** Extra breakdown chance for someone rushed back before they were sharp. */
export const RUSTY_REINJURY_CHANCE = 0.12
/** Below this returning-form value a shinobi counts as rushed back. */
export const RUSTY_THRESHOLD = 80

export function rollInjuryOnSuccess(s, m, hL, injDayReduction = 0) {
  let chance = RANK_INJ_CHANCE[m.rk] || 0.02
  if ((s.age || 0) >= 40) chance += 0.08
  if ((s.consecutiveMissions || 0) >= 2) chance += 0.10
  if (G.morale < 40) chance += 0.05
  // Rushed back from a long absence — the body gives out even when the mission
  // went fine. This lives HERE rather than on the failure path, where an
  // earlier attempt at it was unreachable: a failed solo mission always rolls
  // an injury first, so a "re-injury" check after that could never fire. The
  // success path is also the only place the fiction makes sense — coming
  // through the job and breaking down anyway is what rushing someone costs.
  const rusty = (s.returningForm ?? 100) < RUSTY_THRESHOLD
  if (rusty) chance += RUSTY_REINJURY_CHANCE
  const medCount = (G.staff || []).filter(st => st.role === 'medical').length
  chance = clamp(chance - medCount * 0.03, 0, 0.90)
  if (s.pers?.effect?.riskMod) chance += s.pers.effect.riskMod
  if (Math.random() < chance) {
    const injType = pickInjuryType(m.rk)
    if (injType) {
      applyInjury(s, injType, hL, injDayReduction)
      if (rusty) {
        s.returningForm = 55            // back to square one on the way out
        aL(tr('toast.med.brokeDown', { name: sn(s), mission: m.n, months: s.injDays }), 'warn')
      } else {
        aL(tr('toast.adv.missionInjury', { name: sn(s), injury: injType.n, mission: m.n }), 'warn')
      }
    }
  }
}

export function addWorkload(s, mRk) {
  s.workload = clamp((s.workload || 0) + (RANK_WORKLOAD[mRk] || 10), 0, 100)
  s.fatigue = clamp((s.fatigue || 0) + ({ S: 25, A: 18, B: 12, C: 8, D: 4 }[mRk] || 8), 0, 100)
  s.consecutiveMissions = (s.consecutiveMissions || 0) + 1
}

export function fatiguePenalty(s) {
  const f = s.fatigue || 0
  return f >= 80 ? -0.15 : f >= 60 ? -0.09 : f >= 40 ? -0.04 : 0
}

export function checkJutsu(s) {
  if (!s.jutsu) s.jutsu = []
  // A combined element's signature is learned the moment the rank threshold is
  // met — not rolled against everything else in the pool. It is the whole point
  // of having the element, and burying it in a random draw against nineteen
  // other techniques is how you get content nobody sees (see the rare-tier
  // finding in tests/depthCoverage.test.js).
  const _combined = combinedOf(s)
  if (_combined && signatureUnlocked(s) && !s.jutsu.includes(_combined.signature.id)) {
    s.jutsu.push(_combined.signature.id)
    aL(tr('toast.elem.signatureMastered', { icon: _combined.icon, name: sn(s), technique: _combined.signature.n, combined: _combined.name }), 'good')
    addChronicle('Signature Technique', `${sn(s)} mastered ${_combined.signature.n}. ${_combined.signature.desc}`, 'shinobi')
    addLegend(12)
    return
  }
  // Eligibility lives in shared/jutsu/eligibility.js so it can be tested
  // directly and so a jutsu can offer a second way in via `altReq`.
  // Nation techniques are gated on the village element, so checkJutsu must
  // hand it through — otherwise ten techniques exist and none is reachable.
  const eligible = eligibleJutsu(s, ALL_JUTSU, { villageElement: elementOfNation(G.nationId) || G.vElement })
  if (eligible.length) {
    const j = eligible[Math.floor(Math.random() * eligible.length)]
    s.jutsu.push(j.id)
    aL(tr('toast.adv.learnedJutsu', { name: sn(s), jutsu: j.n, tier: j.tier, desc: j.desc }), 'good')
    addChronicle('Jutsu Mastered', sn(s) + ' learned ' + j.n + '.', 'shinobi')
    addLegend(j.tier === 'rare' ? 10 : j.tier === 'nation' ? 6 : j.tier === 'uncommon' ? 5 : 2)
  }
}

export function tryFormBonds(sq) {
  if (!sq) return
  const members = sq.members.map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
  const wins = sq.wins || 0
  if (wins < 5) return
  // Try to form bonds between pairs
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i], b = members[j]
      if (!a.bonds) a.bonds = []
      if (!b.bonds) b.bonds = []
      const alreadyBonded = a.bonds.some(bnd => bnd.otherId === b.id)
      if (alreadyBonded) continue
      if (Math.random() > 0.20) continue // 20% chance per qualifying check
      let type = 'Brothers-in-Arms'
      if (Math.abs(a.ri - b.ri) >= 2) type = 'Mentor/Student'
      if (a.rivalId === b.id || b.rivalId === a.id) type = 'Rivals'
      if (a.darkMoment && b.darkMoment) type = 'Battle-Scarred'
      a.bonds.push({ otherId: b.id, type, formed: { year: G.year, month: G.month } })
      b.bonds.push({ otherId: a.id, type, formed: { year: G.year, month: G.month } })
      aL(tr('toast.adv.bondFormed', { a: sn(a), b: sn(b), type }), 'good')
      addChronicle('Bond Formed', sn(a) + ' and ' + sn(b) + ' are now ' + type + ' after ' + wins + ' missions together.', 'shinobi')
      addNotice(type === 'Rivals'
        ? sn(a) + ' and ' + sn(b) + ' have become rivals — sparks are flying in the training grounds.'
        : sn(a) + ' and ' + sn(b) + ' are now ' + type + ' after fighting side by side.', type === 'Rivals' ? 'warn' : 'good')
    }
  }
}

export function _bloodlineBonus(memberIds) {
  if (!G._ff_bloodlineActive) return 0
  const active = (G.beasts || []).filter(b =>
    b.sealed && b.jk && memberIds.includes(b.jk) && (b.activeUntil || 0) > G.month)
  const anyDebuffed = (G.shinobi || []).some(s =>
    memberIds.includes(s.id) && (s._blDebuffUntil || 0) > G.month)
  if (!active.length && !anyDebuffed) return 0
  return netBloodlineMod(active.map(() => ({ multiplier: BLOODLINE_MULTIPLIER })), anyDebuffed)
}

export function _formationMod(sq) {
  if (!G._ff_tacticalFormation || !sq.formation) return 0
  return formationMods(sq.formation).successMod
}

export function _formationRisk(sq) {
  if (!G._ff_tacticalFormation || !sq.formation) return 0
  return formationMods(sq.formation).riskMod
}

/**
 * What your nation is worth on this contract.
 *
 * Used to be a flat 0–4% with no weaknesses at all, which made the five
 * nations functionally identical. Now it is the flat trait mod PLUS the
 * element's standing on this mission's spec (+20% signature down to −20% wall)
 * PLUS whatever the terrain thinks of your element.
 *
 * Pass the mission to get any of that; called bare it degrades to the old
 * behaviour, which keeps the several existing call sites honest.
 */
export function _nationSuccessMod(m = null) {
  if (!G._ff_nationHud) return 0
  const base = nationMods(G.nationId).successMod
  const el = elementOfNation(G.nationId) || G.vElement
  if (!el || !m) return base
  return base + specMod(el, m.spec) + terrainMod(m.terrain, el)
}

/**
 * The elemental wheel against a named antagonist village.
 *
 * Only ever applied where the player did NOT choose the matchup — the mission
 * board hands you the opponent. See COUNTER_WHEEL: a counter you cannot choose
 * is texture, a counter you pick each time is the lookup table that
 * docs/MATCHDAY_AS_A_BET.md exists to remove.
 */
export function _elementCounterMod(m = null) {
  const theirName = m?.village
  if (!theirName) return 0
  const ours = elementOfNation(G.nationId) || G.vElement
  const theirs = elementAffinityFor(theirName)
  return counterMod(ours, theirs)
}

export function maybeInduct(s, how) {
  if (!s || !isHofWorthy(s)) return null
  G.hallOfFame = G.hallOfFame || []
  if (G.hallOfFame.some(e => e.id === s.id)) return null
  const entry = buildHofEntry(s, how, G.year)
  G.hallOfFame.push(entry)
  addChronicle('Hall of Fame — ' + entry.name, `${entry.name} is inducted into the Hall of Fame (${entry.reason}).`, 'milestone')
  aL(tr('toast.adv.hofInducted', { name: entry.name, reason: entry.reason }), 'good')
  addLegend(3)
  return entry
}

export function _philosophySuccessMod() { return getPhilosophyMods(G).missionSuccess }

export function _philosophyKIAMod()     { return getPhilosophyMods(G).kiaRisk }

export function _squadBondBonus(sq) {
  let bonus = 0
  const members = sq.members.map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
  members.forEach(m => {
    if (!m.bonds) return
    m.bonds.forEach(bnd => {
      if (sq.members.includes(bnd.otherId)) {
        if (bnd.type === 'Brothers-in-Arms') bonus += 0.03
        else if (bnd.type === 'Mentor/Student') bonus += 0.04
        else if (bnd.type === 'Rivals') bonus += 0.02
      }
    })
  })
  return Math.min(bonus, 0.12) // cap at +12%
}


// ── Lifted with the mission block: both are called from adv.js as well as
//    from tick/missions.js, so they cannot live in either one.
export function recordMissionCommission(rank) {
  if (!G.finances) return
  if (!G.finances.missionCommissions) G.finances.missionCommissions = { D:0,C:0,B:0,A:0,S:0 }
  G.finances.missionCommissions[rank] = (G.finances.missionCommissions[rank] || 0) + 1
  const commission = MISSION_COMMISSION[rank] || 0
  G.ryo += commission
}

export function queuePressConference(triggerId, ctx = {}) {
  if (G.pendingPress) return  // one at a time
  const q = hydrateQuestion(triggerId, ctx)
  if (!q) return

  // Auto-build ctx from live state when not supplied
  if (!ctx.rivalName && G.villages && G.villages.length) {
    const antagV = G.villages.reduce((a, b) => ((b.grudgeTicks || 0) > (a.grudgeTicks || 0) ? b : a), G.villages[0])
    if ((antagV.grudgeTicks || 0) > 0) ctx.rivalName = antagV.n
  }

  const _journo = pickJournalist()
  G.pendingPress = {
    id: q.id, trigger: triggerId,
    question: q.question, intro: q.intro,
    followUp: q.followUp || null,
    availableTones: q.availableTones || ['confident', 'humble', 'dismissive'],
    rivalName: ctx.rivalName || null,
    journalistId: _journo.id,
  }
  G.inbox = G.inbox || []
  G.inbox.unshift({
    id: 'press_' + triggerId + '_' + G.year + '_' + G.month,
    cat: 'press', subject: 'Press Conference Request',
    body: q.intro + '\n\n"' + q.question + '"',
    year: G.year, month: G.month, action: 'press', pressId: q.id, read: false,
  })
  ntf(tr('toast.adv.pressRequested'))
}
