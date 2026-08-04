/**
 * Mission resolution — the largest slice of the monthly tick, extracted from
 * adv.js as the last major block of T4.1.
 *
 * This is where the game's consequences actually land. It resolves scouting
 * trips, squad deployments and solo missions; rolls injuries, trauma and death;
 * writes the memorial; increments the KIA counters that civilian morale and the
 * council mandate both read; fires bond ripples across the roster; and builds
 * the report the battle viewer later replays.
 *
 * A NOTE ON WHY THIS MOVED LAST, AND WHY IT WAS SAFE TO MOVE AT ALL.
 *
 * It looked like the most entangled block in the tick, and by one measure it
 * is — it needs seven of the values adv() derives at the top of the month,
 * against zero for the academy. But that measure was misleading: at the TOP
 * LEVEL this block declares exactly one local (`beastPassives`), and it does
 * not leak forward. Everything else is already scoped inside the per-mission
 * callbacks. The coupling was in the context it reads, not in state it strews
 * around the tick, and context is passed explicitly.
 *
 * The real reason it went last is that until very recently it had NO TEST
 * COVERAGE AT ALL. It iterates `G.aM`, assignment is a player action, and the
 * harness only ever advanced months — so twenty-four seeds across 1,152
 * simulated months produced zero deaths and zero injuries, and every
 * characterisation snapshot was blind to this code. The harness now dispatches
 * shinobi before each tick; that is what made this extraction verifiable.
 *
 * ORDERING: this runs AFTER the roster floor and AFTER worldPassives. Both
 * matter. Civilian morale reads `G._kiaThisMonth` before this block writes to
 * it, so public mood trails casualties by a month; and the floor sees the
 * prospect pool as it stood before this month's losses. Moving this call
 * earlier would change both, silently.
 */
import { G, ui, clamp, fmt, sn, pk, rnd, mS, addTrait, addRumor, addNotice, addChronicle, addLegend,
         computeMarketValue, getMissionSpecBonus, getLeadershipGroup } from '../state.js'
import { aL, ntf, upUI } from '../ui.js'
import { resolveBattleCall, callBeatIndex, isSalvageable } from '../../../shared/utils/battleCalls.js'
import { staminaStart, finishEffects, scrollOutcome } from '../../../shared/utils/matchSim.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { addNewsItem } from '../news.js'
import { RANKS, MONTHS, JUTSU_LIST, INJURY_TYPES, RANK_INJ_CHANCE, RANK_WORKLOAD, RANK_INJ_POOL, TRAUMA_TRAITS, BINGO_TIERS, MISSION_COMMISSION, DOCTRINE_BY_ID } from '../constants.js'
import { pushNarrative } from './inbox.js'
import { pushMissionLog, hasUniqueAbility, jkKIAImmune, pickInjuryType, applyInjury, applyTrauma,
         rollInjuryOnSuccess, addWorkload, fatiguePenalty, checkJutsu, tryFormBonds, maybeInduct,
         _bloodlineBonus, _formationMod, _formationRisk, _nationSuccessMod, _philosophySuccessMod,
         _philosophyKIAMod, _squadBondBonus, recordMissionCommission, queuePressConference } from './missionHelpers.js'
import { getBeastPassives, captureChance } from '../beastEngine.js'
import { sqSynergy, SQUAD_IDENTITIES } from '../synergy.js'
import { roleBonus } from '../depthEngine.js'
import { ensureCareerFields } from '../careerEngine.js'
import { advanceChain } from '../missionGen.js'
import { pickNarrative, pickSquadNarrative, DARK_MOMENT_POOL, LAST_WORDS_POOL } from '../narratives.js'
// Same sources adv.js used — resolveMission is also exported from
// shared/types/MissionTemplate.js, and taking the wrong one would silently
// change mission outcomes.
import { resolveMission, qualityEffects, missionApproachMod } from '../../../shared/utils/missionEngine.js'
import { successCeiling } from '../../../shared/utils/missionOdds.js'
import { confidenceMod, updateConfidence, setEmotionalState, formGrudge, getArchetypeQuote } from '../../../shared/utils/personality.js'
import { genMissionBlurb, genKIABlurb, genGrudgeBlurb } from '../../../shared/utils/narrativeEngine.js'
import { observePlayerTactic, recordPlayerTactic, rivalScPenalty } from '../../../shared/utils/adaptiveAI.js'
import { bondMissionBonus, kiaRipple } from '../../../shared/bonds/bondTypes.js'
import { pickSupportEvent } from '../../../shared/bonds/supportEvents.js'
import { grindMod, grindCohesionPenalty } from '../../../shared/utils/squadCadence.js'
import { jutsuLoadoutBonus } from '../../../shared/jutsu/loadout.js'
import { kageMod } from '../../../shared/constants/kageDev.js'
import { addMemory } from '../../../shared/utils/memorySystem.js'
import { recordVendettaDeath, addVendetta, blameFor, mournersFor } from '../../../shared/utils/legacyMemory.js'
import { sPow, sqP } from '../state.js'

/** @param {{ hL:number, dp:object, sb:object, iB:number, cp:object, clP:object, shP:object, season:string }} ctx */
export function tickMissions(ctx) {
  const { hL, dp, sb, iB, cp, clP, shP, season } = ctx
  // ── Mission resolution ──────────────────────────────────────────────────
  const beastPassives = getBeastPassives(G)
  G._beastMissionLuck = beastPassives.missionLuck
  G.aM.forEach(am => am.daysLeft--)
  // Monthly mission form — accrued from real outcomes, fed into the league matchday.
  G._formThisMonth = { wins: 0, losses: 0, marginSum: 0 }
  G.aM.filter(am => am.daysLeft <= 0).forEach(am => {
    if (am.isScout) {
      const scout = G.shinobi.find(x => x.id === am.assignedTo)
      if (scout) { scout.status = 'available'; scout.missId = null }
      const prospect = G.prospects.find(x => x.id === am.scoutTargetId)
      if (prospect) {
        const waited = prospect.monthsWaiting || 0
        const degraded = waited >= 6
        if (degraded) {
          const decay = Math.min(20, (waited - 5) * 4)
          prospect.potential = Math.max(45, prospect.potential - decay)
        }
        prospect.scouted = true
        aL(tr('toast.adv.intelConfirmed', { name: sn(prospect), potential: prospect.potential, suffix: degraded ? ' ⚠ degraded.' : '.' }), degraded ? 'warn' : 'good')
        ntf(prospect.fn + '\'s potential revealed' + (degraded ? ' (degraded!)' : '') + '!')
      } else {
        aL(tr('toast.adv.prospectMovedOn'), 'neutral')
      }
      return
    }
    if (am.isBeastCapture) {
      const b = G.beasts.find(x => x.n === am.beastName), s = G.shinobi.find(x => x.id === am.assignedTo)
      if (!b || !s) return
      const ok = Math.random() < captureChance(sPow(s), b.pow)
      s.status = 'available'; s.missId = null
      if (ok) {
        b.sealed = true
        aL(b.n + ' captured! Assign a Vessel.', 'good'); ntf(b.n + ' sealed!')
        addChronicle('Beast Captured', b.n + ' was sealed by our forces.', 'legend')
        addLegend(20)
      } else {
        aL(sn(s) + ' failed to capture ' + b.n + '.', 'bad')
        if (Math.random() < 0.3) { s.injDays = rnd(1, 3); s.status = 'injured' }
      }
      return
    }

    const m = G.avM.find(x => x.id === am.missionId); if (!m) return

    if (am.isSquad) {
      const sq = G.squads.find(q => q.id === am.squadId); if (!sq) return
      if (!sq.wins) sq.wins = 0
      if (!sq.losses) sq.losses = 0
      if (!sq.kills) sq.kills = 0
      if (!sq.fallen) sq.fallen = []
      const syn = sqSynergy(sq, G.shinobi)
      const rawPw = sqP(sq) + (G.shinobi.find(s => s.id === sq.leaderId)?.pers.n === 'Charismatic' ? 5 : 0)
      // Bond bonus
      const bondBonus = _squadBondBonus(sq)
      const pw = Math.round(rawPw * syn.powerMult)
      const anbuBon = (m.rk === 'S' || m.rk === 'A') ? sb.anbuMissionBonus : 0
      const rB2 = roleBonus(sq)
      // Pair chemistry bonus: +0.02 per proven pair (5+ missions together), max +0.06
      const chemBonus = Math.min(0.06, (() => {
        if (!G.pairChemistryLog) return 0
        let b = 0
        const mIds = sq.members
        for (let a = 0; a < mIds.length; a++)
          for (let c = a + 1; c < mIds.length; c++) {
            const key = [mIds[a], mIds[c]].sort().join('_')
            if ((G.pairChemistryLog[key] || 0) >= 5) b += 0.02
          }
        return b
      })())
      // Tactical prep modifier (Phase 4)
      // #8 merge: when this squad has a formation set, it OVERRIDES global prep-mode (no double-count)
      const _fOverride = G._ff_tacticalFormation && !!sq.formation
      const prepMod = _fOverride ? 0 : (G.missionPrepMode === 'aggressive' ? 0.08 : G.missionPrepMode === 'cautious' ? -0.06 : 0)
      const prepRiskMod = _fOverride ? 0 : (G.missionPrepMode === 'aggressive' ? 0.04 : G.missionPrepMode === 'cautious' ? -0.03 : 0)
      const _appMod = missionApproachMod(am.approach, m.spec)  // tactical approach vs mission spec
      const sqJutsuMod = sq.members.reduce((acc, id) => {
        const ms = G.shinobi.find(x => x.id === id); if (!ms) return acc
        const jb = jutsuLoadoutBonus(ms, JUTSU_LIST)
        return acc + jb.successMod * 0.5 + jb.powerMod * 0.25
      }, 0)
      const sqBondMod = sq.members.reduce((acc, id) => {
        const ms = G.shinobi.find(x => x.id === id); if (!ms) return acc
        return acc + bondMissionBonus(ms, G.shinobi).successMod * 0.5
      }, 0)
      const sqDeclineMod = sq.members.reduce((acc, id) => {
        const ms = G.shinobi.find(x => x.id === id); if (!ms) return acc
        ensureCareerFields(ms)
        return acc + (ms.declineMod || 0) * 0.5  // half-weight per member so one declining vet doesn't cripple a squad
      }, 0)
      const sqFatigueMod = sq.members.reduce((acc, id) => { const mb = G.shinobi.find(x => x.id === id); return acc + (mb ? fatiguePenalty(mb) : 0) }, 0) / Math.max(1, sq.members.length)
      const sqGrindMod = grindMod(sq.consecutiveDeployMonths || 0)
      const sc = clamp(1 - m.risk - prepRiskMod + (pw - m.mp) * 0.005 + iB + syn.successMod + bondBonus + sb.missionSuccessBonus + sb.squadMissionBonus + anbuBon + rB2.missionBonus - rB2.riskReduction + chemBonus + prepMod + sqJutsuMod + dp.missionRiskReduction + cp.successMod + sqBondMod + clP.successMod + shP.opSuccessBonus + sqDeclineMod + _bloodlineBonus(sq.members) + _formationMod(sq) + _nationSuccessMod() + _philosophySuccessMod() + (am._scMod || 0) + sqFatigueMod + sqGrindMod + _appMod.sc - _appMod.risk - (am._riskMod || 0) + kageMod(G, 'command'), 0.1, successCeiling(m.rk))

      const _mev = resolveMission(sc)
      const _mq = qualityEffects(_mev.quality)
      G._formThisMonth.marginSum += _mev.margin
      if (_mev.success) {
        G._formThisMonth.wins++
        const _bonusRyo = Math.round(m.ryo * _mq.ryoMult * (1 + (am._ryoMod || 0)))
        G.ryo += _bonusRyo; G.reputation = clamp(G.reputation + m.rep, 0, 999); G.morale = clamp(G.morale + 3 + _mq.morale, 0, 100)
        const prevCohesion = sq.cohesion ?? 0
        sq.cohesion = Math.min(100, prevCohesion + rnd(3, 7))
        sq.wins++
        recordMissionCommission(m.rk)
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          addWorkload(s, m.rk)
          s.missId = null; s.wins++; s.streak = (s.streak || 0) + 1
          s._seasonWins = (s._seasonWins || 0) + 1
          s._seasonMissions = (s._seasonMissions || 0) + 1
          s.status = 'available'
          rollInjuryOnSuccess(s, m, hL, dp.injDayReduction)  // may flip back to 'injured'
          if (m.rk === 'B' || m.rk === 'C') s.winsB = (s.winsB || 0) + 1
          if (m.rk === 'S') {
            s.winsS = (s.winsS || 0) + 1; s._seasonSRankWins = (s._seasonSRankWins || 0) + 1
            if (s.winsS === 1) {
              aL(tr('toast.adv.firstSrank', { name: sn(s) }), 'good')
              G.narrativeInbox = G.narrativeInbox || []
              G.narrativeInbox.push({ id: Math.random().toString(36).slice(2), type: 'milestone', tag: 'career', title: `First S-Rank: ${sn(s)}`, body: `${sn(s)} has cleared their first S-rank mission. This is the moment careers are made of.`, year: G.year, month: G.month })
            }
          }
          checkJutsu(s)
        })
        // Pair chemistry tracking
        if (!G.pairChemistryLog) G.pairChemistryLog = {}
        const mIds = sq.members
        for (let a = 0; a < mIds.length; a++) {
          for (let b = a + 1; b < mIds.length; b++) {
            const key = [mIds[a], mIds[b]].sort().join('_')
            G.pairChemistryLog[key] = (G.pairChemistryLog[key] || 0) + 1
            if (G.pairChemistryLog[key] === 5) {
              const sA = G.shinobi.find(x => x.id === mIds[a]), sB = G.shinobi.find(x => x.id === mIds[b])
              if (sA && sB) aL(tr('toast.adv.fieldChemistry', { a: sn(sA), b: sn(sB) }), 'good')
            }
          }
        }
        const _sqSuccessNarr = pickSquadNarrative(m.rk, 'success', sq.n)
        const _sqTag = _mev.quality === 'decisive' ? '⚔ Decisive victory — ' : ''
        aL(_sqTag + sq.n + ' completed "' + m.n + '" — +' + fmt(_bonusRyo) + ' ryo. ' + _sqSuccessNarr, 'good')
        pushMissionLog({ missionName: m.n, rank: m.rk, success: true, ryo: _bonusRyo, rep: m.rep, chainName: m.chainName || null, narrative: _sqSuccessNarr, quality: _mev.quality })
        addLegend((m.rk === 'S' ? 15 : m.rk === 'A' ? 8 : m.rk === 'B' ? 3 : 1) + _mq.legend)
        // Narrative Pillar 1&2: confidence + memory + blurb
        recordPlayerTactic(G.rivalTendencies, m.rk, _mev.quality, true)
        G.villages.forEach(v => observePlayerTactic(v, m.rk, true))
        const _sqActorIds = sq.members.slice()
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          updateConfidence(s, _mev.quality, { isLeader: s.id === sq.leaderId })
          if (_mev.quality === 'decisive') {
            addMemory(s, 'mission_triumph', m.id || m.n, { year: G.year, month: G.month })
            if (s.wins === 10 || s.wins === 25) setEmotionalState(s, 'triumphant')
          } else if (_mev.quality === 'narrow') {
            addMemory(s, 'mission_triumph', m.id || m.n, { year: G.year, month: G.month }, 0.3)
          }
        })
        if (_mev.quality === 'decisive') pushNarrative(genMissionBlurb(sq.n, sq.members.length > 0 ? (G.shinobi.find(x => x.id === sq.members[0])?.ri ?? 2) : 2, m.n, 'decisive'), _sqActorIds)
        // Post-mission contribution scores (Phase 4)
        G.lastMissionReport = _buildMissionReport(sq, m, true, _mev, _bonusRyo)
        G._battleReportFresh = true   // arms the auto-watch viewer for this turn
        // Squad identity unlock at cohesion 75
        if (sq.cohesion >= 75 && !sq.identity) {
          const taken = G.squads.filter(q => q.identity).map(q => q.identity.title)
          const available = SQUAD_IDENTITIES.filter(i => !taken.includes(i.title))
          if (available.length) {
            sq.identity = available[Math.floor(Math.random() * available.length)]
            aL(sq.n + ' has forged an unbreakable bond — now known as "' + sq.identity.title + '"!', 'good')
            ntf(sq.n + ': ' + sq.identity.title)
            addChronicle('Squad Identity', sq.n + ' earned the title "' + sq.identity.title + '".', 'squad')
            addLegend(20)
          }
        }
        // Try bond formation after 5 squad wins
        if (sq.wins >= 5) tryFormBonds(sq)
        // #11 Pairwise support events (flag-gated): one bonded pair may share a vignette
        if (G._ff_supportEvents) {
          const ids = sq.members
          let fired = false
          for (let a = 0; a < ids.length && !fired; a++) {
            const sA = G.shinobi.find(x => x.id === ids[a]); if (!sA) continue
            for (const bnd of (sA.bonds || [])) {
              if (!ids.includes(bnd.otherId) || Math.random() >= 0.25) continue
              const ev = pickSupportEvent(bnd.type); if (!ev) continue
              const sB = G.shinobi.find(x => x.id === bnd.otherId); if (!sB) continue
              if (ev.moraleMod) {
                sA.indMorale = clamp((sA.indMorale || 70) + ev.moraleMod, 0, 100)
                sB.indMorale = clamp((sB.indMorale || 70) + ev.moraleMod, 0, 100)
              }
              aL(tr('toast.adv.bondEvent', { text: ev.text.replace('{a}', sn(sA)).replace('{b}', sn(sB)) }), 'good')
              fired = true; break
            }
          }
        }
      } else {
        G._formThisMonth.losses++
        const hasPr = sq.members.some(id => G.shinobi.find(s => s.id === id)?.pers.n === 'Protective')
        const kR = clamp((hL >= 2 ? 0.02 : hL >= 1 ? 0.04 : 0.08) + dp.kiaRiskMod + _formationRisk(sq) + _philosophyKIAMod(), 0.005, 0.15)
        let hadKIA = false
        const survivorIds = []
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          s.streak = 0
          addWorkload(s, m.rk)
          if (!hasPr && Math.random() < kR && !jkKIAImmune(s)) {
            const lastWords = pk(LAST_WORDS_POOL)
            aL(sn(s) + ' KIA on "' + m.n + '". ' + lastWords, 'bad')
            sq.fallen.push({ id: s.id, name: sn(s), rank: RANKS[s.ri], mission: m.n, year: G.year, month: G.month })
            if (s.wins >= 50) { addChronicle('Fallen Veteran', sn(s) + ' died on "' + m.n + '" after ' + s.wins + ' missions.', 'shinobi'); addLegend(10) }
            maybeInduct(s, 'fallen'); G._kiaThisMonth = (G._kiaThisMonth || 0) + 1; G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: m.n, year: G.year, month: G.month, wins: s.wins, lastWords })
            pushNarrative(genKIABlurb(sn(s), s.ri, m.n))
            G.shinobi = G.shinobi.filter(x => x.id !== s.id)
            hadKIA = true; sq.kills++
            G._mandateKIAThisYear = (G._mandateKIAThisYear || 0) + 1
            if (!G.pendingPress) queuePressConference('kia')
          } else {
            const injType = pickInjuryType(m.rk)
            if (injType) applyInjury(s, injType, hL, dp.injDayReduction)
            survivorIds.push(s.id)
          }
        })
        // Survivors who witnessed KIA may develop trauma + grudges + memories
        if (hadKIA) {
          const fallen = sq.fallen[sq.fallen.length - 1]
          const when = { year: G.year, month: G.month }
          // Whose hand was in this. Missions carry no explicit antagonist, so the
          // village the player is on worst terms with is named — which reads far
          // better than the old random pick, and gives the grudge somewhere real
          // to point. (Lowest relation; ties broken by strength.)
          const antagonist = blameFor(G.villages)
          if (antagonist && fallen) {
            G.vendettas = G.vendettas || {}
            recordVendettaDeath(G.vendettas, antagonist.n, fallen, when)
          }
          survivorIds.forEach(id => {
            const survivor = G.shinobi.find(x => x.id === id)
            if (!survivor) return
            if (Math.random() < 0.5) applyTrauma(survivor)
            updateConfidence(survivor, _mev.quality, { hadKIA: true })
            addMemory(survivor, 'witness_kia', m.id || m.n, when)
            setEmotionalState(survivor, 'grieving')
            if (!antagonist || !fallen) return
            // Everyone who walked off that mission carries it. This used to be
            // gated on `wasBonded`, which compared a bond's otherId against
            // sq.fallen entries that carried NO id — always undefined, always
            // false. The whole branch had never once run. Bonded survivors now
            // take it twice as hard instead of being the only ones who feel it.
            const bonded = (survivor.bonds || []).some(b => b.otherId === fallen.id)
            addVendetta(survivor, antagonist.n, fallen.name, when, bonded ? 2 : 1)
            if (bonded) {
              formGrudge(survivor, antagonist.n, antagonist.n, 'kia_partner', when)
              pushNarrative(genGrudgeBlurb(survivor.fn + ' ' + survivor.ln, fallen.name, 'Fallen Comrade', 3), [survivor.id])
              aL(tr('toast.adv.lastWords', { quote: getArchetypeQuote(survivor), name: sn(survivor) }), 'warn')
            }
          })
          if (antagonist && fallen) {
            addNotice(`${fallen.name} will not be forgotten. The squad holds ${antagonist.n} responsible.`, 'warn')
          }
        } else {
          survivorIds.forEach(id => {
            const survivor = G.shinobi.find(x => x.id === id)
            if (!survivor) return
            updateConfidence(survivor, _mev.quality)
            if (_mev.quality === 'disaster') addMemory(survivor, 'mission_disaster', m.id || m.n, { year: G.year, month: G.month })
          })
        }
        sq.cohesion = Math.max(0, (sq.cohesion ?? 0) + (hadKIA ? -15 : -4) - grindCohesionPenalty(sq.consecutiveDeployMonths || 0))
        sq.losses++
        const _sqFailNarr = pickSquadNarrative(m.rk, 'failure', sq.n)
        const _sqFailTag = _mev.quality === 'disaster' ? '💥 Disaster — ' : ''
        aL(_sqFailTag + '"' + m.n + '" squad mission failed. ' + _sqFailNarr, 'bad')
        recordPlayerTactic(G.rivalTendencies, m.rk, _mev.quality, true)
        G.villages.forEach(v => observePlayerTactic(v, m.rk, true))
        if (_mev.quality === 'disaster') pushNarrative(genMissionBlurb(sq.n, 2, m.n, 'disaster'))
        pushMissionLog({ missionName: m.n, rank: m.rk, success: false, ryo: 0, rep: 0, narrative: _sqFailNarr, quality: _mev.quality })
        G.morale = clamp(G.morale - 5 + _mq.morale, 0, 100)
        G.lastMissionReport = _buildMissionReport(sq, m, false, _mev)
        G._battleReportFresh = true   // arms the auto-watch viewer for this turn
      }
    } else {
      const s = G.shinobi.find(x => x.id === am.assignedTo); if (!s) return
      const pw = sPow(s), rM = s.pers.effect.riskMod || 0, sM = pw < m.mp ? (s.pers.effect.sucMod || 0) : 0, sB = s.pers.effect.soloBonus || 0
      const soloFormMod = ((s.returningForm || 100) < 100) ? ((s.returningForm - 100) / 500) : 0
      const soloAnbuBon = (m.rk === 'S' || m.rk === 'A') ? sb.anbuMissionBonus : 0
      const beastLuck = G._beastMissionLuck || 0
      ensureCareerFields(s)
      const soloPrepMod = G.missionPrepMode === 'aggressive' ? 0.08 : G.missionPrepMode === 'cautious' ? -0.06 : 0
      const _soloAppMod = missionApproachMod(am.approach, m.spec)  // tactical approach vs mission spec
      const jLB = jutsuLoadoutBonus(s, JUTSU_LIST)
      const bMB = bondMissionBonus(s, G.shinobi)
      const sc = clamp(1 - m.risk - rM + (pw - m.mp) * 0.01 + iB + sM + sB + sb.missionSuccessBonus + soloAnbuBon + soloFormMod + beastLuck + (s.declineMod || 0) + soloPrepMod + jLB.successMod + jLB.powerMod * 0.5 + dp.missionRiskReduction + cp.successMod + bMB.successMod + clP.successMod + shP.opSuccessBonus + _bloodlineBonus([s.id]) + _nationSuccessMod() + _philosophySuccessMod() + confidenceMod(s) + rivalScPenalty(G.villages, m.rk) + (am._scMod || 0) + fatiguePenalty(s) + getMissionSpecBonus(s, m) + _soloAppMod.sc - _soloAppMod.risk - (am._riskMod || 0) + kageMod(G, 'command'), 0.08, successCeiling(m.rk))
      const rB = ['A','S'].includes(m.rk) && s.pers.n === 'Honorable' ? 2 : 0

      addWorkload(s, m.rk)
      // Hanaku Lucky Scales: failed mission becomes marginal success once per month
      const chomeiActive = hasUniqueAbility(s.id, 'Hanaku') && !G._hanakuLuckyUsed
      const rollResult = Math.random()
      const missionPassed = rollResult < sc || (rollResult >= sc && chomeiActive && (() => { G._hanakuLuckyUsed = true; aL(tr('toast.adv.hanakuLucky', { name: sn(s) }), 'good'); return true })())
      const _mev = resolveMission(sc, Math.random, { success: missionPassed })
      const _mq = qualityEffects(_mev.quality)
      G._formThisMonth.marginSum += _mev.margin
      if (missionPassed) G._formThisMonth.wins++; else G._formThisMonth.losses++
      if (missionPassed) {
        const _bonusRyo = Math.round(m.ryo * _mq.ryoMult * (1 + (am._ryoMod || 0)))
        G.ryo += _bonusRyo; G.reputation = clamp(G.reputation + m.rep + rB, 0, 999); G.morale = clamp(G.morale + 2 + _mq.morale, 0, 100)
        recordMissionCommission(m.rk)
        s.missId = null; s.wins++; s.streak = (s.streak || 0) + 1
        s._seasonWins = (s._seasonWins || 0) + 1
        s._seasonMissions = (s._seasonMissions || 0) + 1
        s.status = 'available'
        if (m.rk === 'B' || m.rk === 'C') s.winsB = (s.winsB || 0) + 1
        if (m.rk === 'S') { s.winsS = (s.winsS || 0) + 1 }
        checkJutsu(s)
        const _soloSuccNarr = pickNarrative(m.rk, 'success', sn(s), s.pers.n, { wins: s.wins, streak: s.streak, season })
        const _soloTag = _mev.quality === 'decisive' ? '⚔ Decisive — ' : ''
        aL(_soloTag + sn(s) + ' completed "' + m.n + '" — +' + fmt(_bonusRyo) + ' ryo. ' + _soloSuccNarr, 'good')
        pushMissionLog({ missionName: m.n, rank: m.rk, success: true, ryo: _bonusRyo, rep: m.rep + rB, chainName: m.chainName || null, narrative: _soloSuccNarr, quality: _mev.quality })
        updateConfidence(s, _mev.quality)
        if (_mev.quality === 'decisive') addMemory(s, 'mission_triumph', m.id || m.n, { year: G.year, month: G.month })
        else if (_mev.quality === 'narrow') addMemory(s, 'mission_triumph', m.id || m.n, { year: G.year, month: G.month }, 0.3)
        recordPlayerTactic(G.rivalTendencies, m.rk, _mev.quality, false)
        G.villages.forEach(v => observePlayerTactic(v, m.rk, false))
        addLegend((m.rk === 'S' ? 12 : m.rk === 'A' ? 6 : m.rk === 'B' ? 2 : 1) + _mq.legend)
        if (m.rk === 'S') addChronicle('S-Rank Completed', sn(s) + ' completed the S-rank mission "' + m.n + '".', 'legend')
        if (m.chainId) advanceChain(G, m.id, true)
        // Career milestone notices
        const MILESTONES = [10, 25, 50, 100]
        if (MILESTONES.includes(s.wins)) {
          const flavour = s.wins >= 100 ? 'A living legend.' : s.wins >= 50 ? 'Half a century of service.' : s.wins >= 25 ? 'Battle-hardened veteran.' : 'A solid foundation built.'
          s._milestoneNotice = `${s.wins} missions completed (${s.winsS||0} S-rank). ${flavour}`
          addChronicle(`${s.wins}-Mission Milestone`, `${sn(s)} reaches ${s.wins} missions. ${flavour}`, 'shinobi')
        } else {
          s._milestoneNotice = null
        }
        rollInjuryOnSuccess(s, m, hL, dp.injDayReduction)
        // R8+: solo missions get the live viewer + micro-call too (single-member squad shim).
        G.lastMissionReport = _buildMissionReport({ id: 'solo_' + s.id, n: sn(s), members: [s.id] }, m, true, _mev, _bonusRyo)
      } else {
        s.streak = 0
        s._seasonMissions = (s._seasonMissions || 0) + 1
        const kR = clamp((hL >= 2 ? 0.02 : hL >= 1 ? 0.04 : 0.08) + dp.kiaRiskMod + _philosophyKIAMod(), 0.005, 0.15)
        if (Math.random() < kR && !jkKIAImmune(s)) {
          const lastWords = pk(LAST_WORDS_POOL)
          aL(sn(s) + ' KIA on "' + m.n + '". ' + lastWords, 'bad')
          maybeInduct(s, 'fallen'); G._kiaThisMonth = (G._kiaThisMonth || 0) + 1; G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: m.n, year: G.year, month: G.month, wins: s.wins, lastWords })
          pushNarrative(genKIABlurb(sn(s), s.ri, m.n))
          if (s.wins >= 50) addChronicle('Fallen Veteran', sn(s) + ' died on "' + m.n + '" after ' + s.wins + ' missions. ' + lastWords, 'shinobi')
          G._mandateKIAThisYear = (G._mandateKIAThisYear || 0) + 1
          // A solo death has no squad to carry it, so the bond ripple decides who
          // does: the people the ripple actually reaches are the ones who were
          // close enough to take it personally.
          const _soloWhen = { year: G.year, month: G.month }
          const _soloBlame = blameFor(G.villages)
          if (_soloBlame) {
            G.vendettas = G.vendettas || {}
            recordVendettaDeath(G.vendettas, _soloBlame.n, { name: sn(s), rank: RANKS[s.ri], mission: m.n }, _soloWhen)
          }
          const ripple = kiaRipple(s.id, G.shinobi.filter(x => x.id !== s.id))
          ripple.forEach(r => {
            const affected = G.shinobi.find(x => x.id === r.shinobiId)
            if (affected) { affected.morale = clamp((affected.morale || 50) + r.delta, 0, 100); aL(tr('toast.adv.shakenByLoss', { name: sn(affected), fallen: sn(s) }), 'bad') }
          })
          const _soloName = sn(s)
          const _mourners = mournersFor(s.id, G.shinobi.filter(x => x.id !== s.id), G.squads, ripple.map(r => r.shinobiId))
          _mourners.forEach(mn => {
            addMemory(mn, 'squad_kia', m.id || m.n, _soloWhen)
            if (_soloBlame) addVendetta(mn, _soloBlame.n, _soloName, _soloWhen)
          })
          G.shinobi = G.shinobi.filter(x => x.id !== s.id)
          G.reputation = clamp(G.reputation - 5, 0, 999)
        } else {
          if (m.rk === 'S' && !s.darkMoment) {
            s.darkMoment = pk(DARK_MOMENT_POOL)
            aL(sn(s) + ' failed the S-rank and carries something new. "' + s.darkMoment + '"', 'warn')
          }
          const injType = pickInjuryType(m.rk)
          if (injType) {
            applyInjury(s, injType, hL, dp.injDayReduction)
            aL(tr('toast.adv.missionFailedInjury', { mission: m.n, name: sn(s), injury: injType.n, days: s.injDays, narrative: pickNarrative(m.rk, 'failure', sn(s), s.pers.n, { wins: s.wins, streak: s.streak, season }) }), 'bad')
          }
          // Re-injury risk for those returning from long absence
          if ((s.returningForm || 100) < 80 && Math.random() < 0.20) {
            aL(sn(s) + ' re-injured themselves — too soon to return to active duty.', 'warn')
          }
          // R8+: a surviving solo shinobi's failed mission is watchable too.
          G.lastMissionReport = _buildMissionReport({ id: 'solo_' + s.id, n: sn(s), members: [s.id] }, m, false, _mev, 0)
        }
        updateConfidence(s, _mev.quality)
        addMemory(s, 'mission_disaster', m.id || m.n, { year: G.year, month: G.month })
        if (_mev.quality === 'disaster') {
          setEmotionalState(s, 'fearful')
          // Aftermath inbox item — gives the player narrative context on the failure
          G.narrativeInbox.push({
            id: Math.random().toString(36).slice(2),
            title: 'Debrief: ' + m.n,
            body: sn(s) + ' returned from "' + m.n + '" with nothing to show. ' +
              (m.rk === 'S' ? 'The Daimyo will want answers.' : m.rk === 'A' ? 'The village felt the setback.' : 'Morale has taken a hit.'),
            tag: 'mission', link: 'missions', priority: 2,
            year: G.year, month: G.month, actorIds: [s.id],
          })
        }
        // Costly/failed: recovery op spawns on costly (30%) or any other failure (10%)
        const _recoveryChance = _mev.quality === 'costly' ? 0.30 : 0.10
        if (!m.isFollowUp && Math.random() < _recoveryChance) {
          G.avM.push({
            ...m,
            id: Math.random().toString(36).slice(2),
            n: '[Recovery] ' + m.n,
            ryo: Math.round(m.ryo * 0.55),
            rep: Math.max(1, Math.ceil(m.rep / 2)),
            risk: Math.max(0.05, m.risk - 0.08),
            dur: Math.max(1, m.dur - 1),
            expiresMonth: (G.month || 1) + 2,
            addedYear: G.year || 1,
            isFollowUp: true,
          })
          aL(tr('toast.adv.recoveryOp'), 'neutral')
        }
        recordPlayerTactic(G.rivalTendencies, m.rk, _mev.quality, false)
        G.villages.forEach(v => observePlayerTactic(v, m.rk, false))
        pushMissionLog({ missionName: m.n, rank: m.rk, success: false, ryo: 0, rep: 0, chainName: m.chainName || null, quality: _mev.quality })
        G.morale = clamp(G.morale - 3 + _mq.morale, 0, 100)
        if (m.chainId) advanceChain(G, m.id, false)
      }
    }
  })
  G.aM = G.aM.filter(am => am.daysLeft > 0)
}


// Lifted with the block it serves; it had no other caller in adv.js.
function _buildMissionReport(sq, m, succeeded, mev, payout = 0) {
  const ROLE_PRIMARY = { vanguard:'taijutsu', support:'ninjutsu', intel:'stealth', medical:'chakra', flex:null }
  const ROLE_SECONDARY = { vanguard:'speed', support:'chakra', intel:'intelligence', medical:'intelligence', flex:null }
  const scores = sq.members.map(id => {
    const s = G.shinobi.find(x => x.id === id)
    if (!s) return null
    const roleId = s.squadRole || 'flex'
    const p1 = ROLE_PRIMARY[roleId], p2 = ROLE_SECONDARY[roleId]
    const statVal = p1 ? ((s.stats[p1] || 0) * 0.65 + (s.stats[p2] || 0) * 0.35) : (Object.values(s.stats).reduce((a,b)=>a+b,0)/6)
    // Normalize vs mission rank baseline
    const baseline = { D:20, C:30, B:45, A:60, S:75 }[m.rk] || 40
    const ratio = statVal / baseline
    const grade = ratio >= 1.3 ? 'A' : ratio >= 1.0 ? 'B' : ratio >= 0.75 ? 'C' : 'D'
    const detail = grade === 'A' ? 'Exceptional' : grade === 'B' ? 'Solid' : grade === 'C' ? 'Below par' : 'Poor showing'
    return { id: s.id, name: sn(s), role: roleId, grade, detail, statVal: Math.round(statVal), element: s.element || null }
  }).filter(Boolean)
  const rep = { missionId: m.id, missionName: m.n, missionRk: m.rk, squadId: sq.id, squadName: sq.n, succeeded, year: G.year, month: G.month, scores,
    spec: m.spec || null,   // drives the animated pitch's mission layout (stealth compound, siege works...)
    phases: mev?.phases || null, quality: mev?.quality || null, margin: mev?.margin ?? null }
  // Live-battle micro-call: the one moment the player is present for a result
  // rather than reading it afterwards. A close DEFEAT can be salvaged into a win
  // (see shared/utils/battleCalls.js for why the reverse is never allowed).
  // The closure is live-only by design — dropped on save — and applies once.
  const bi = callBeatIndex(rep.phases)
  if (bi >= 0) {
    rep.baseQuality = rep.quality
    rep.microCall = { beatIndex: bi, payout, salvageable: isSalvageable(rep.succeeded, rep.margin) }
    rep.applyCall = call => {
      if (rep._callDone) return rep._callResult
      const r = resolveBattleCall({
        call, pivotalWon: !!rep.phases[bi].won,
        succeeded: rep.succeeded, baseQuality: rep.baseQuality, margin: rep.margin,
      })
      const bonusRyo = Math.round(payout * r.ryoMult)
      if (bonusRyo) G.ryo = Math.max(0, G.ryo + bonusRyo)
      if (r.moraleDelta) G.morale = clamp(G.morale + r.moraleDelta, 0, 100)
      if (r.legendDelta) addLegend(r.legendDelta)

      // ── Salvage: pay what the victory would have paid ──────────────────────
      // The defeat's costs are NOT unwound. Anyone wounded or lost in the
      // earlier beats stays that way — the player rescued the objective, not
      // the squad. Only the rewards withheld on failure are granted now.
      if (r.flipped) {
        // Base mission value only. `payout` is 0 on a failure, and the
        // per-assignment ryo modifier lives on `am`, which is a forEach
        // parameter at the call site and NOT in scope inside this function —
        // the free-variable scanner does not do scope analysis, so it read
        // `am` as declared and stayed quiet.
        const salvageRyo = Math.round(m.ryo)
        G.ryo += salvageRyo
        G.reputation = clamp(G.reputation + m.rep, 0, 999)
        recordMissionCommission(m.rk)
        rep.succeeded = true
        rep.salvaged = true
        sq.wins = (sq.wins || 0) + 1
        sq.losses = Math.max(0, (sq.losses || 0) - 1)
        G._formThisMonth.wins++
        if (G._formThisMonth.losses > 0) G._formThisMonth.losses--
        aL(`${sq.n}: ${r.label} — "${m.n}" turned at the last. +${fmt(salvageRyo)} ryo, +${m.rep} reputation.`, 'good')
        addChronicle('Snatched from Defeat', `${sq.n} salvaged "${m.n}" with a final push after the mission had been lost.`, 'milestone')
        rep._callResult = { ...r, bonusRyo, salvageRyo }
        rep._callDone = call
        upUI()
        return rep._callResult
      }

      rep.quality = r.quality
      rep._callDone = call
      rep._callResult = { ...r, bonusRyo }
      const tone = r.kind === 'clutch' ? 'good' : r.kind === 'overcommit' ? 'warn' : 'info'
      aL(`${sq.n}: ${r.label} — ${r.note}${bonusRyo ? ` (${bonusRyo > 0 ? '+' : ''}${fmt(bonusRyo)} ryo)` : ''}`, tone)
      upUI()
      return rep._callResult
    }
  }
  // Match-condition layer: each member enters the viewer with stamina from their
  // REAL condition (chakra reserves, carried fatigue). The touchline-tactic sim
  // drains it beat by beat; how they finish becomes real post-match fatigue and
  // morale via applyCondition (live-only closure, same pattern as applyCall).
  rep.matchStamina = sq.members.map(id => {
    const s = G.shinobi.find(x => x.id === id)
    if (!s) return null
    return { id: s.id, name: sn(s), role: s.squadRole || 'flex', stamina: staminaStart({ chakra: s.stats?.chakra || 30, workload: s.workload || 0 }) }
  }).filter(Boolean)
  rep.applyCondition = avgStamina => {
    if (rep._condDone) return rep._condResult
    const fx = finishEffects(avgStamina)
    if (fx.workloadDelta) sq.members.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) s.workload = clamp((s.workload || 0) + fx.workloadDelta, 0, 100) })
    if (fx.moraleDelta) G.morale = clamp(G.morale + fx.moraleDelta, 0, 100)
    rep._condDone = true
    rep._condResult = fx
    if (fx.id !== 'worked') aL(`${sq.n}: ${fx.label} — ${fx.note}`, fx.id === 'fresh' ? 'good' : 'warn')
    upUI()
    return fx
  }
  // Capture-the-scroll: the objective token on the board is a real bonus. Hold it
  // (win more exchanges than lost) → an intel bounty. Side reward only; the
  // mission's win/loss is untouched. Applied once by the viewer at the finish.
  rep.applyScroll = () => {
    if (rep._scrollDone) return rep._scrollResult
    const won = (rep.phases || []).filter(p => p.won).length
    const lost = (rep.phases || []).length - won
    const r = scrollOutcome({ beatsWon: won, beatsLost: lost, rank: m.rk })
    if (r.held) {
      G.ryo = Math.max(0, G.ryo + r.ryo)
      if (r.legend) addLegend(r.legend)
      if (r.morale) G.morale = clamp(G.morale + r.morale, 0, 100)
      aL(`${sq.n}: 📜 ${r.note}`, 'good')
    }
    rep._scrollDone = true
    rep._scrollResult = r
    upUI()
    return r
  }
  return rep
}
