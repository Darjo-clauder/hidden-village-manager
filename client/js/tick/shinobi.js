/**
 * The per-shinobi monthly pass.
 *
 * Walks the roster once a month: training gains, workload and fatigue,
 * injury recovery, ageing and the retirement roll, morale memory nudges,
 * contract ticking and jutsu learning.
 *
 * ORDERING: this runs BEFORE mission resolution, so a shinobi trains and ages
 * on the state they carried into the month, then goes out and earns the
 * consequences. It also runs before the roster floor, which is why a
 * retirement here can be back-filled in the same tick.
 *
 * Part of breaking up a single ~2,900-line adv() into per-system modules
 * (T4.1). Operates on the global G singleton and returns nothing, like its
 * siblings in this directory.
 */
import { G, clamp, sn, pk, rnd, fmt, sPow, addTrait, addNotice, addChronicle, addLegend } from '../state.js'
import { aL, ntf } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { RANKS, DOCTRINE_BY_ID } from '../constants.js'
import { effectivePlan, medQuality, recoveryStep, reinjuryChance, returningForm, formRebuildStep } from '../../../shared/utils/medical.js'
import { decayMemories, memoryMoraleMod } from '../../../shared/utils/memorySystem.js'
import { assignRoleTag, tickEmotionalState } from '../../../shared/utils/personality.js'
import { genRankUpBlurb } from '../../../shared/utils/narrativeEngine.js'
import { pickRankUpNarrative } from '../narratives.js'
import { mentorGrowthBonus } from '../../../shared/bonds/bondTypes.js'
import { opportunityGrowthMod } from '../../../shared/utils/depthPressure.js'
import { kageMod } from '../../../shared/constants/kageDev.js'
import { checkJutsu, applyInjury, pickInjuryType, maybeInduct } from './missionHelpers.js'
import { awakeningOdds, signatureUnlocked } from '../../../shared/constants/combinedElements.js'
import { pushNarrative } from './inbox.js'

// Lifted from adv.js with the block that calls it; it had no other caller.
function applyAgeDecline(s) {
  if (s.age < 40) return
  const chance = s.age >= 55 ? 0.35 : s.age >= 50 ? 0.20 : s.age >= 45 ? 0.10 : 0.05
  if (Math.random() < chance) {
    const k = pk(['speed', 'taijutsu', 'ninjutsu'])
    s.stats[k] = Math.max(5, s.stats[k] - 1)
  }
}

export function tickShinobi(ctx) {
  const { tgM, dp, cp } = ctx
  // ── Shinobi monthly tick ─────────────────────────────────────────────────
  G.shinobi.forEach(s => {
    // Ensure new fields on existing shinobi
    if (!s.jutsu) s.jutsu = []
    if (!s.bonds) s.bonds = []
    if (s.winsB === undefined) s.winsB = 0
    if (s.winsS === undefined) s.winsS = 0
    if (s.streak === undefined) s.streak = 0

    // Memory decay + emotional state tick (monthly)
    decayMemories(s, 1)
    tickEmotionalState(s)
    // Assign role tag on first mission (lazy)
    if (!s.roleTag && s.wins > 0) assignRoleTag(s)
    // Memory-driven morale nudge (small, monthly)
    const _memMod = memoryMoraleMod(s)
    if (_memMod !== 0) s.indMorale = clamp((s.indMorale || 70) + _memMod, 0, 100)

    s.months++
    if (s.months % 12 === 0) {
      s.age++
      applyAgeDecline(s)
      // Retirement at 55+ (probability rises)
      if (s.age >= 70) {
        // Hard retirement ceiling — no shinobi active past 70
        const retLine = sn(s) + ' has reached the age limit and retired at ' + s.age + '.'
        aL(retLine, 'neutral')
        addChronicle('Mandatory Retirement — ' + sn(s), retLine, 'shinobi')
        maybeInduct(s, 'retired')
        s.status = 'retired'
        return
      }
      if (s.age >= 55) {
        const retChance = s.age >= 65 ? 0.55 : s.age >= 60 ? 0.30 : 0.10
        if (Math.random() < retChance) {
          const isVet = s.wins >= 30
          const retLine = isVet
            ? sn(s) + ' retires after ' + s.wins + ' missions. A legend steps out of the field.'
            : sn(s) + ' has retired at age ' + s.age + '.'
          aL(retLine, 'neutral')
          if (isVet) {
            const squadCount = (G.squads || []).filter(q => q.members.includes(s.id) || (q.alumni || []).includes(s.id)).length
            const retNarrative = [
              sn(s) + ' retired after ' + s.wins + ' missions' + (squadCount > 0 ? ', ' + squadCount + ' squad campaign' + (squadCount !== 1 ? 's' : '') : '') + '.',
              s.darkMoment ? 'They carried: "' + s.darkMoment + '".' : null,
              (s.bonds || []).length > 0 ? (s.bonds.length) + ' bond' + (s.bonds.length !== 1 ? 's' : '') + ' formed.' : null,
              s.winsS > 0 ? 'Completed ' + s.winsS + ' S-rank mission' + (s.winsS !== 1 ? 's' : '') + '.' : null,
              'The village will not forget them.',
            ].filter(Boolean).join(' ')
            addChronicle('Retirement — ' + sn(s), retLine, 'legend', retNarrative)
          }
          maybeInduct(s, 'retired')
          s.status = 'retired'
          return
        }
      }
    }

    // Ensure new fields on existing shinobi
    if (s.workload === undefined) s.workload = 0
    if (s.fatigue === undefined) s.fatigue = 0
    if (s.consecutiveMissions === undefined) s.consecutiveMissions = 0
    if (s.traumaStatus === undefined) s.traumaStatus = null
    if (s.traumaCount === undefined) s.traumaCount = 0
    if (s.returningForm === undefined) s.returningForm = 100
    if (s.injuryType === undefined) s.injuryType = null

    // Set when a shinobi finishes rehab THIS tick. The two status blocks below
    // are sequential ifs, not if/else, so without this the recovery branch sets
    // the returning-form penalty and the available branch immediately erases
    // 20 points of it in the same pass — a standard rehab went straight from 70
    // to 90 before playing a single mission, which is why match sharpness never
    // meaningfully existed.
    let _recoveredThisTick = false

    if (s.status === 'injured') {
      // R25: rehab plan governs speed / re-injury risk / returning form.
      const _hasMedic = (G.staff || []).some(st => st.role === 'medical')
      const _plan = effectivePlan(s.rehabPlan, _hasMedic)
      const _q = medQuality((G.staff || []).filter(st => st.role === 'medical').length, G.upgrades.hospital || 0)
      if (_plan === 'rush' && Math.random() < reinjuryChance(_plan, _q)) {
        s.injDays += rnd(1, 2); s.morale = clamp((s.morale || 50) - 4, 0, 100)
        aL(sn(s) + ' aggravated the injury rushing back — recovery extended.', 'warn')
      } else {
        s.injDays = Math.max(0, s.injDays - recoveryStep(_plan))
      }
      if (s.injDays === 0) {
        s.status = 'available'
        s.injuryType = null
        s.returningForm = Math.min(s.returningForm ?? 100, returningForm(_plan))
        if (_plan === 'careful') s.injuryResist = 1  // shrugs off the next injury a bit
        s.rehabPlan = null
        _recoveredThisTick = true
        aL(sn(s) + ' recovered from injury.', 'good')
      }
    }
    // ── Returning form ──────────────────────────────────────────────────────
    // Deliberately OUTSIDE the available-only block below, so a shinobi who is
    // out on a mission still recovers sharpness — just far slower. It used to
    // live inside it, which meant anyone deployed every month never regained
    // form and stayed permanently fragile with no way to train it off.
    // Skipped on the month they leave rehab: they carry the rust into real work.
    if (!_recoveredThisTick && (s.returningForm ?? 100) < 100) {
      const _step = formRebuildStep(s.status)
      if (_step) s.returningForm = Math.min(100, s.returningForm + _step)
    }

    if (s.status === 'available') {
      // Workload + fatigue recovery
      s.workload = Math.max(0, s.workload - 10)
      s.fatigue = Math.max(0, (s.fatigue || 0) - (s.restMonth ? 20 : 8))
      s.consecutiveMissions = 0  // reset on rest month

      // Trauma tick-down
      if (s.traumaStatus && s.traumaMonths !== undefined) {
        s.traumaMonths = Math.max(0, s.traumaMonths - 1)
        if (s.traumaMonths === 0) {
          aL(sn(s) + ' has found peace — their ' + s.traumaStatus + ' trauma has faded.', 'good')
          s.traumaStatus = null
          // Personality evolution: surviving trauma leaves a permanent mark
          const evolvedTrait = Math.random() < 0.5 ? 'Resilient' : 'Haunted'
          if (addTrait(s, evolvedTrait)) {
            aL(sn(s) + ' emerged from the experience ' + evolvedTrait.toLowerCase() + '.', evolvedTrait === 'Resilient' ? 'good' : 'warn')
            addNotice(sn(s) + ' has returned to duty, changed by what they endured.', 'neutral')
          }
        } else if (s.traumaCount >= 2 && Math.random() < 0.12) {
          // Defection risk after 2 traumas
          aL(tr('toast.adv.defected', { name: sn(s) }), 'bad')
          addChronicle('Defection', sn(s) + ' defected after suffering ' + s.traumaCount + ' psychological traumas.', 'shinobi')
          s.status = 'retired'
          return
        }
      }


      // Stat growth
      const mentorBoost = 1 + mentorGrowthBonus(s, G.shinobi) + (cp.growthBonus || 0) + (dp.statGrowthBonus || 0) + ((DOCTRINE_BY_ID[G.villageDoctrine]?.growthMod) || 0) + kageMod(G, 'mentorship')
      if (Math.random() < 0.25 * tgM * mentorBoost * opportunityGrowthMod(s.workload)) {
        const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
        const kG = k === 'intelligence' && s.pers.n === 'Bookworm' ? 2 : 1
        if (sPow(s) < s.potential) s.stats[k] = clamp(s.stats[k] + rnd(1, kG * 2), 0, 99)
      }
      if (s.pers.n === 'Ambitious' && Math.random() < 0.15) {
        const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
        s.stats[k] = clamp(s.stats[k] + 1, 0, 99)
      }

      // ── Route C: Dev path stat bias ────────────────────────────────────
      if (s.devPath && Math.random() < 0.22 && sPow(s) < s.potential) {
        const _pathFocus = { anbu:['ninjutsu','genjutsu'], anchor:['taijutsu','chakra'], machine:['intelligence','speed'] }
        const fk = _pathFocus[s.devPath]
        if (fk) s.stats[pk(fk)] = clamp(s.stats[pk(fk)] + 1, 0, 99)
      }

      // ── Training focus boost (Phase 4) ────────────────────────────────
      if (s.trainingFocus && s.trainingFocus in s.stats) {
        if (sPow(s) < s.potential) {
          const gain = rnd(1, 3)
          s.stats[s.trainingFocus] = clamp(s.stats[s.trainingFocus] + gain, 0, 99)
        }
        s.workload = clamp((s.workload || 0) + 12, 0, 100)
      }

      // ── Rest month (Phase 4) ────────────────────────────────────────────
      if (s.restMonth) {
        s.workload = Math.max(0, (s.workload || 0) - 30)  // extra recovery
        s.restMonth = false  // auto-clear after one month
      }
    }
    // Annual salary raise — seniority scaling so cap bites after 5+ years
    if (s.months > 0 && s.months % 12 === 0 && s.status !== 'retired') {
      s.salary = Math.round((s.salary || 500) * 1.05)
    }
    const pw = sPow(s), thresh = [0, 30, 55, 78, 90]
    if (s.ri < 4 && pw >= thresh[s.ri + 1] && s.months >= (s.ri + 1) * 12 && s.status === 'available') {
      s.ri++; s.salary = Math.round((s.salary || 500) * 1.1) // promotion bump on top of seniority
      const newRankName = RANKS[s.ri]
      aL(sn(s) + ' promoted to ' + newRankName + '! ' + pickRankUpNarrative(sn(s), newRankName), 'good')
      pushNarrative(genRankUpBlurb(sn(s), s.ri))
      addLegend(s.ri * 3)
    }

    // ── Combined-element awakening ──────────────────────────────────────────
    // The earnable path. Everything else about a shinobi's chakra nature is
    // fixed at birth; this is the one thing a career can add to it. Odds jump
    // sharply in a month where they came through something bad, so the moment
    // tends to attach itself to a story the player already remembers.
    maybeAwaken(s)
  })
}

/**
 * Roll a shinobi's chance to awaken a second chakra nature this month.
 *
 * `_awakenCrisis` is set by mission resolution when this shinobi survived a
 * disaster or watched a squadmate die — it is cleared here, so it only ever
 * counts for the month it happened in.
 */
function maybeAwaken(s) {
  const crisis = !!s._awakenCrisis
  s._awakenCrisis = false
  const { eligible, chance, combined } = awakeningOdds(s, { crisis })
  if (!eligible || Math.random() >= chance) return
  s.combinedElement = combined.id
  s.combinedSource = 'awakened'
  const how = crisis
    ? `Pushed past the edge of what they had, ${sn(s)} came back with something new.`
    : `Years of ${s.element} work finally opened into something else.`
  aL(`${combined.icon} ${sn(s)} awakened ${combined.name} — ${combined.parents.join(' + ')}!`, 'good')
  addChronicle(`Awakening — ${combined.name}`,
    `${how} ${combined.name}: ${combined.blurb}`, 'shinobi')
  pushNarrative({
    title: `${combined.icon} ${sn(s)} awakens ${combined.name}`,
    body: `${how} ${combined.blurb}`,
    tag: 'awakening',
  }, [s.id])
  addLegend(8)
  addNotice(`${sn(s)} now carries ${combined.name}. ${signatureUnlocked(s)
    ? `Their signature technique, ${combined.signature.n}, is available.`
    : `${combined.signature.n} unlocks at ${RANKS[combined.signature.minRi]}.`}`, 'good')
}
