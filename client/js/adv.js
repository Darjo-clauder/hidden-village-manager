import { G, ui, sPow, sqP, sn, rnd, pk, clamp, fmt, rfM, rfP, KAGE_EVENTS, addChronicle, addLegend, genRegionProspect, genStudent, computeHarmony, genTransferPool, pDesc, genScoutNarrative, senseiStyle, genTrainingReport, revealDevCurve, getLeadershipGroup, addTrait, addRumor, addNotice } from './state.js'
import { RAID_POOL, MONTHS, JUTSU_LIST, WORLD_CHOICE_EVENTS, INJURY_TYPES, RANK_INJ_CHANCE, RANK_WORKLOAD, RANK_INJ_POOL, TRAUMA_TRAITS, FINANCE_TIERS, FINANCIAL_EVENTS, MISSION_COMMISSION, BUILDING_MAINTENANCE, DAIMYO_BONUS, REGIONS, DEV_TRACKS, INTENSITY_LEVELS, STAFF_ROLES, MEETING_TYPES, TRANSFER_WINDOWS, BINGO_TIERS, HARMONY_EVENTS, REGION_EVENTS, DEV_CURVES, GROUP_EVENTS, SERVICE_AWARDS, RUMOR_TEMPLATES } from './constants.js'
import { aL, ntf, upUI, schEx } from './ui.js'
import { syncToServer } from './socket.js'
import { pickNarrative, pickSquadNarrative, pickRankUpNarrative, DARK_MOMENT_POOL, LAST_WORDS_POOL } from './narratives.js'
import { sqSynergy, SQUAD_IDENTITIES } from './synergy.js'

function currentSeason() { return MONTHS[G.month - 1]?.season || 'Spring' }

// ── Injury helpers ─────────────────────────────────────────────────────────────
function pickInjuryType(mRk) {
  const pool = RANK_INJ_POOL[mRk] || ['muscle']
  return INJURY_TYPES.find(t => t.id === pool[Math.floor(Math.random() * pool.length)])
}

function applyInjury(s, injType, hL) {
  const medNinjaCount = (G.staff || []).filter(st => st.role === 'medical').length
  const medReduction = medNinjaCount * 0.5  // each medical ninja -0.5 months
  let dur = rnd(injType.minMo, injType.maxMo)
  dur = Math.max(1, Math.round(dur - (s.pers?.effect?.injReduct || 0) - hL - medReduction))
  s.injDays = dur
  s.injuryType = injType.id
  s.status = 'injured'
  s.missId = null
  if (injType.id === 'severe' && injType.statLoss && Math.random() < 0.3) {
    const k = pk(['ninjutsu','taijutsu','speed','chakra'])
    s.stats[k] = Math.max(5, s.stats[k] - rnd(1, 3))
    aL(sn(s) + ' suffered permanent stat loss from their severe wound.', 'bad')
  }
  if (injType.trauma) {
    applyTrauma(s)
  }
  // Long injury → returning form penalty
  if (dur >= 3) {
    s.returningForm = 60
  }
}

function applyTrauma(s) {
  s.traumaCount = (s.traumaCount || 0) + 1
  s.traumaStatus = pk(TRAUMA_TRAITS)
  s.traumaMonths = rnd(2, 6)
  // Stat penalty while traumatised
  Object.keys(s.stats).forEach(k => { s.stats[k] = Math.max(5, s.stats[k] - 2) })
  G.morale = clamp(G.morale - 5, 0, 100)
  aL(sn(s) + ' is suffering from psychological trauma — ' + s.traumaStatus + '.', 'warn')
  addChronicle('Psychological Trauma', sn(s) + ' developed a ' + s.traumaStatus + ' personality after traumatic events.', 'shinobi')
}

function rollInjuryOnSuccess(s, m, hL) {
  let chance = RANK_INJ_CHANCE[m.rk] || 0.02
  if ((s.age || 0) >= 40) chance += 0.08
  if ((s.consecutiveMissions || 0) >= 2) chance += 0.10
  if (G.morale < 40) chance += 0.05
  const medCount = (G.staff || []).filter(st => st.role === 'medical').length
  chance = clamp(chance - medCount * 0.03, 0, 0.90)
  if (s.pers?.effect?.riskMod) chance += s.pers.effect.riskMod
  if (Math.random() < chance) {
    const injType = pickInjuryType(m.rk)
    if (injType) {
      applyInjury(s, injType, hL)
      aL(sn(s) + ' sustained a ' + injType.n + ' completing "' + m.n + '".', 'warn')
    }
  }
}

function addWorkload(s, mRk) {
  s.workload = clamp((s.workload || 0) + (RANK_WORKLOAD[mRk] || 10), 0, 100)
  s.consecutiveMissions = (s.consecutiveMissions || 0) + 1
}

// ── Finance helpers ────────────────────────────────────────────────────────────
function computeDaimyoBonus() {
  const leg = G.legend || 0
  for (const tier of DAIMYO_BONUS) {
    if (leg >= tier.at) return tier.amount
  }
  return 0
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

export function recordMissionCommission(rank) {
  if (!G.finances) return
  if (!G.finances.missionCommissions) G.finances.missionCommissions = { D:0,C:0,B:0,A:0,S:0 }
  G.finances.missionCommissions[rank] = (G.finances.missionCommissions[rank] || 0) + 1
  const commission = MISSION_COMMISSION[rank] || 0
  G.ryo += commission
}

export function recordScoutCost(amount) {
  if (!G.finances) return
  G.finances.scoutCostThisMonth = (G.finances.scoutCostThisMonth || 0) + amount
}

export function recordExamFee(amount) {
  if (!G.finances) return
  G.finances.examFees = (G.finances.examFees || 0) + amount
}

// ── Jutsu unlock check ─────────────────────────────────────────────────────
function checkJutsu(s) {
  if (!s.jutsu) s.jutsu = []
  const eligible = JUTSU_LIST.filter(j => {
    if (s.jutsu.includes(j.id)) return false
    if (j.clan && s.clan !== j.clan) return false
    if (j.req.winsB && (s.winsB || 0) < j.req.winsB) return false
    if (j.req.winsS && (s.winsS || 0) < j.req.winsS) return false
    if (j.req.wins && s.wins < j.req.wins) return false
    if (j.req.prodigy && !s.prodigy) return false
    return true
  })
  if (eligible.length) {
    const j = eligible[Math.floor(Math.random() * eligible.length)]
    s.jutsu.push(j.id)
    aL(sn(s) + ' learned ' + j.n + '! [' + j.tier + '] ' + j.desc, 'good')
    addChronicle('Jutsu Mastered', sn(s) + ' learned ' + j.n + '.', 'shinobi')
    addLegend(j.tier === 'rare' ? 10 : j.tier === 'uncommon' ? 5 : 2)
  }
}

// ── Bond formation ─────────────────────────────────────────────────────────
function tryFormBonds(sq) {
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
      if (Math.abs(a.ri - b.ri) >= 2) type = a.ri > b.ri ? 'Mentor/Student' : 'Mentor/Student'
      if (a.rivalId === b.id) type = 'Rivals'
      a.bonds.push({ otherId: b.id, type, formed: { year: G.year, month: G.month } })
      b.bonds.push({ otherId: a.id, type, formed: { year: G.year, month: G.month } })
      aL(sn(a) + ' and ' + sn(b) + ' have formed a bond: ' + type + '.', 'good')
      addChronicle('Bond Formed', sn(a) + ' and ' + sn(b) + ' are now ' + type + ' after ' + wins + ' missions together.', 'shinobi')
      addNotice(type === 'Rivals'
        ? sn(a) + ' and ' + sn(b) + ' have become rivals — sparks are flying in the training grounds.'
        : sn(a) + ' and ' + sn(b) + ' are now ' + type + ' after fighting side by side.', type === 'Rivals' ? 'warn' : 'good')
    }
  }
}

// ── Age-based stat decline ─────────────────────────────────────────────────
function applyAgeDecline(s) {
  if (s.age < 40) return
  const chance = s.age >= 55 ? 0.35 : s.age >= 50 ? 0.20 : s.age >= 45 ? 0.10 : 0.05
  if (Math.random() < chance) {
    const k = pk(['speed', 'taijutsu', 'ninjutsu'])
    s.stats[k] = Math.max(5, s.stats[k] - 1)
  }
}

// ── Resolve world choice event ─────────────────────────────────────────────
export function resolveChoiceEvent(fnKey) {
  const ev = G.pendingChoiceEvent
  G.pendingChoiceEvent = null
  if (!ev) return
  if (fnKey.endsWith('_aid'))    { G.ryo -= 8000; G.morale = clamp(G.morale + 10, 0, 100); G.reputation = clamp(G.reputation + 5, 0, 999); G.worldFlags[ev.effects?.worldFlag || 'event'] = 0; aL('Aid distributed.', 'good') }
  else if (fnKey.endsWith('_partial')) { G.ryo -= 3000; G.morale = clamp(G.morale + 3, 0, 100); aL('Partial aid sent.', 'neutral') }
  else if (fnKey.endsWith('_none'))  { G.morale = clamp(G.morale - 8, 0, 100); G.reputation = clamp(G.reputation - 5, 0, 999); aL('No action taken.', 'bad') }
  else if (fnKey.endsWith('_cure'))  { G.ryo -= 10000; G.reputation = clamp(G.reputation + 8, 0, 999); G.morale = clamp(G.morale + 6, 0, 100); aL('Medics deployed. Plague contained.', 'good') }
  else if (fnKey.endsWith('_quar'))  { G.ryo -= 5000; G.morale = clamp(G.morale - 3, 0, 100); aL('District quarantined.', 'neutral') }
  else if (fnKey === 'sage_accept')  { const eli = G.shinobi.filter(s => s.ri >= 2); if (eli.length) { const s = pk(eli); if (!s.jutsu) s.jutsu = []; const rare = JUTSU_LIST.filter(j => j.tier === 'rare' && !s.jutsu.includes(j.id)); if (rare.length) { const j = pk(rare); s.jutsu.push(j.id); aL('The Wandering Sage taught ' + sn(s) + ' — ' + j.n + '!', 'good'); addChronicle('Sage Taught', sn(s) + ' received rare jutsu from a Wandering Sage.', 'legend') } } }
  else if (fnKey === 'sage_honor')   { G.reputation = clamp(G.reputation + 5, 0, 999); G.villages.forEach(v => v.rel = clamp(v.rel + 10, 0, 100)); aL('The Sage honored and seen off.', 'good') }
  else if (fnKey === 'eclipse_fest') { G.morale = clamp(G.morale + 5, 0, 100); G.ryo -= 2000; aL('Festival held during the eclipse.', 'good') }
  else if (fnKey === 'eclipse_def')  { G.tempDef = 20; aL('Defense mobilized during the eclipse.', 'neutral') }
  else if (fnKey === 'scroll_study') { const eli = G.shinobi.filter(s => s.ri >= 1); if (eli.length) { const s = pk(eli); if (!s.jutsu) s.jutsu = []; const avail = JUTSU_LIST.filter(j => !s.jutsu.includes(j.id) && (!j.clan || s.clan === j.clan)); if (avail.length) { const j = pk(avail); s.jutsu.push(j.id); aL(sn(s) + ' studied the forbidden scroll and learned ' + j.n + '!', 'good') } } }
  else if (fnKey === 'scroll_sell')  { G.ryo += 15000; aL('Forbidden scrolls sold for 15,000 ryo.', 'good') }
  else if (fnKey === 'scroll_destroy') { G.reputation = clamp(G.reputation + 5, 0, 999); aL('Forbidden scrolls destroyed. Reputation improved.', 'good') }
  upUI()
}

// Compute staff-derived modifiers (called from adv and panels)
export function staffBonus() {
  const staff = G.staff || []
  const strategists = staff.filter(s => s.role === 'strategist').length
  const teamSenseis = staff.filter(s => s.role === 'team_sensei').length
  const anbuCmdr = staff.find(s => s.role === 'anbu_cmdr')
  const treasurer = staff.find(s => s.role === 'treasurer')
  const council = staff.find(s => s.role === 'council')
  const headSensei = staff.find(s => s.role === 'head_sensei')
  const headScout = staff.find(s => s.role === 'head_scout')
  const scoutJonins = staff.filter(s => s.role === 'scout_jonin').length
  return {
    missionSuccessBonus: strategists > 0 ? 0.05 : 0,
    squadMissionBonus: teamSenseis * 0.02,
    anbuMissionBonus: anbuCmdr ? 0.10 : 0,
    tradeIncomeMultiplier: treasurer ? 1 + (Math.floor(treasurer.rating / 5) * 0.03) : 1,
    repGainMultiplier: council ? 1.10 : 1,
    prospectGrowthBonus: headSensei ? Math.floor(headSensei.rating / 5) : 0,
    scoutCostReduction: Math.min(0.60, scoutJonins * 0.15 + (headScout ? 0.20 : 0)),
  }
}

export function adv() {
  const tgM = G.upgrades.training === 1 ? 2 : G.upgrades.training === 2 ? 3 : 1
  const iB = G.upgrades.intel === 1 ? 0.05 : G.upgrades.intel === 2 ? 0.10 : 0
  const hL = G.upgrades.hospital
  const sb = staffBonus()
  const season = currentSeason()
  const monthDef = MONTHS[G.month - 1]

  // ── Seasonal passive effects ────────────────────────────────────────────
  if (monthDef?.effects?.morale) G.morale = clamp(G.morale + monthDef.effects.morale, 0, 100)
  if (monthDef?.effects?.ryo) G.ryo = Math.max(0, G.ryo + monthDef.effects.ryo)

  // ── Persistent world flag tick-down ─────────────────────────────────────
  Object.keys(G.worldFlags || {}).forEach(k => {
    G.worldFlags[k]--
    if (G.worldFlags[k] <= 0) { delete G.worldFlags[k]; aL('The ' + k + ' has ended.', 'neutral') }
    else {
      if (k === 'drought') { G.ryo -= 1000; G.morale = clamp(G.morale - 1, 0, 100) }
      if (k === 'plague')  { G.morale = clamp(G.morale - 2, 0, 100); G.reputation = clamp(G.reputation - 1, 0, 999) }
    }
  })

  // ── Shinobi monthly tick ─────────────────────────────────────────────────
  G.shinobi.forEach(s => {
    // Ensure new fields on existing shinobi
    if (!s.jutsu) s.jutsu = []
    if (!s.bonds) s.bonds = []
    if (s.winsB === undefined) s.winsB = 0
    if (s.winsS === undefined) s.winsS = 0
    if (s.streak === undefined) s.streak = 0

    s.months++
    if (s.months % 12 === 0) {
      s.age++
      applyAgeDecline(s)
      // Retirement at 55+ (probability rises)
      if (s.age >= 55) {
        const retChance = s.age >= 65 ? 0.30 : s.age >= 60 ? 0.18 : 0.08
        if (Math.random() < retChance) {
          const isVet = s.wins >= 30
          const retLine = isVet
            ? sn(s) + ' retires after ' + s.wins + ' missions. A legend steps out of the field.'
            : sn(s) + ' has retired at age ' + s.age + '.'
          aL(retLine, 'neutral')
          if (isVet) addChronicle('Retirement', retLine, 'shinobi')
          s.status = 'retired'
          return
        }
      }
    }

    // Ensure new fields on existing shinobi
    if (s.workload === undefined) s.workload = 0
    if (s.consecutiveMissions === undefined) s.consecutiveMissions = 0
    if (s.traumaStatus === undefined) s.traumaStatus = null
    if (s.traumaCount === undefined) s.traumaCount = 0
    if (s.returningForm === undefined) s.returningForm = 100
    if (s.injuryType === undefined) s.injuryType = null

    if (s.status === 'injured') {
      s.injDays = Math.max(0, s.injDays - 1)
      if (s.injDays === 0) {
        s.status = 'available'
        s.injuryType = null
        aL(sn(s) + ' recovered from injury.', 'good')
      }
    }
    if (s.status === 'available') {
      // Workload recovery
      s.workload = Math.max(0, s.workload - 10)
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
          aL('⚠ ' + sn(s) + ' has abandoned the village — trauma and loss drove them to defect.', 'bad')
          addChronicle('Defection', sn(s) + ' defected after suffering ' + s.traumaCount + ' psychological traumas.', 'shinobi')
          s.status = 'retired'
          return
        }
      }

      // Returning form — builds back over 2–3 missions
      if ((s.returningForm || 100) < 100) {
        s.returningForm = Math.min(100, s.returningForm + 20)
      }

      // Stat growth
      if (Math.random() < 0.25 * tgM) {
        const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
        const kG = k === 'intelligence' && s.pers.n === 'Bookworm' ? 2 : 1
        if (sPow(s) < s.potential) s.stats[k] = clamp(s.stats[k] + rnd(1, kG * 2), 0, 99)
      }
      if (s.pers.n === 'Ambitious' && Math.random() < 0.15) {
        const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
        s.stats[k] = clamp(s.stats[k] + 1, 0, 99)
      }
    }
    const pw = sPow(s), thresh = [0, 30, 55, 78, 90]
    if (s.ri < 4 && pw >= thresh[s.ri + 1] && s.months >= (s.ri + 1) * 12 && s.status === 'available') {
      s.ri++; s.salary = 500 + s.ri * 400
      const newRankName = ['Genin','Chunin','Jonin','ANBU','S-Rank'][s.ri]
      aL(sn(s) + ' promoted to ' + newRankName + '! ' + pickRankUpNarrative(sn(s), newRankName), 'good')
      addLegend(s.ri * 3)
    }
  })
  G.shinobi = G.shinobi.filter(s => s.status !== 'retired')

  // ── Squad monthly tick (monthsActive, anniversary) ───────────────────────
  G.squads.forEach(sq => {
    sq.monthsActive = (sq.monthsActive || 0) + 1
    if (sq.monthsActive > 0 && sq.monthsActive % 12 === 0) {
      const years = sq.monthsActive / 12
      aL(sq.n + ' marks ' + years + ' year' + (years > 1 ? 's' : '') + ' as a unit.', 'ev')
      addChronicle('Squad Anniversary', sq.n + ' has been together for ' + years + ' year' + (years > 1 ? 's' : '') + '. Cohesion: ' + (sq.cohesion || 0) + '.', 'squad')
    }
  })

  // ── Prospect aging ──────────────────────────────────────────────────────
  G.prospects = G.prospects.filter(p => {
    if ((p.monthsWaiting || 0) >= 8) {
      aL(sn(p) + ' lost patience and left the academy.', 'neutral')
      // 10% chance dropout becomes a missing-nin event
      if (Math.random() < 0.10) {
        aL('⚠ ' + sn(p) + ' turned rogue. Rumoured to appear on the black market...', 'warn')
        addChronicle('Dropout Gone Rogue', sn(p) + ' departed the academy and turned missing-nin.', 'shinobi')
      }
      return false
    }
    if ((p.monthsWaiting || 0) >= 4 && Math.random() < 0.25) {
      const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
      p.stats[k] = Math.max(5, p.stats[k] - 1)
    }
    // Sensei boost — if this prospect has a mentor assigned
    if (p.mentor) {
      const sensei = G.shinobi.find(s => s.id === p.mentor)
      if (sensei && sensei.status === 'available') {
        if (Math.random() < 0.40) {
          const k = pk(['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'])
          p.stats[k] = clamp(p.stats[k] + 1, 0, 99)
        }
      } else if (!sensei) {
        p.mentor = null // sensei left
      }
    }
    return true
  })

  // ── Mission resolution ──────────────────────────────────────────────────
  G.aM.forEach(am => am.daysLeft--)
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
        aL('Intel on ' + sn(prospect) + ' confirmed — Potential: ' + prospect.potential + (degraded ? ' ⚠ degraded.' : '.'), degraded ? 'warn' : 'good')
        ntf(prospect.fn + '\'s potential revealed' + (degraded ? ' (degraded!)' : '') + '!')
      } else {
        aL('Scouting complete — prospect has already moved on.', 'neutral')
      }
      return
    }
    if (am.isBeastCapture) {
      const b = G.beasts.find(x => x.n === am.beastName), s = G.shinobi.find(x => x.id === am.assignedTo)
      if (!b || !s) return
      const ok = Math.random() < (0.35 + (sPow(s) - b.pow) * 0.01)
      s.status = 'available'; s.missId = null
      if (ok) {
        b.sealed = true
        aL(b.n + ' captured! Assign a Jinchuriki.', 'good'); ntf(b.n + ' sealed!')
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
      const sc = clamp(1 - m.risk + (pw - m.mp) * 0.005 + iB + syn.successMod + bondBonus + sb.missionSuccessBonus + sb.squadMissionBonus + anbuBon, 0.1, 0.97)

      if (Math.random() < sc) {
        G.ryo += m.ryo; G.reputation = clamp(G.reputation + m.rep, 0, 999); G.morale = clamp(G.morale + 3, 0, 100)
        const prevCohesion = sq.cohesion ?? 0
        sq.cohesion = Math.min(100, prevCohesion + rnd(3, 7))
        sq.wins++
        recordMissionCommission(m.rk)
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          addWorkload(s, m.rk)
          s.missId = null; s.wins++; s.streak = (s.streak || 0) + 1
          s.status = 'available'
          rollInjuryOnSuccess(s, m, hL)  // may flip back to 'injured'
          if (m.rk === 'B' || m.rk === 'C') s.winsB = (s.winsB || 0) + 1
          if (m.rk === 'S') s.winsS = (s.winsS || 0) + 1
          checkJutsu(s)
        })
        aL(sq.n + ' completed "' + m.n + '" — +' + fmt(m.ryo) + ' ryo. ' + pickSquadNarrative(m.rk, 'success', sq.n), 'good')
        addLegend(m.rk === 'S' ? 15 : m.rk === 'A' ? 8 : m.rk === 'B' ? 3 : 1)
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
      } else {
        const hasPr = sq.members.some(id => G.shinobi.find(s => s.id === id)?.pers.n === 'Protective')
        const kR = hL >= 2 ? 0.02 : hL >= 1 ? 0.04 : 0.08
        let hadKIA = false
        const survivorIds = []
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          s.streak = 0
          addWorkload(s, m.rk)
          if (!hasPr && Math.random() < kR) {
            const lastWords = pk(LAST_WORDS_POOL)
            aL(sn(s) + ' KIA on "' + m.n + '". ' + lastWords, 'bad')
            sq.fallen.push({ name: sn(s), rank: ['Genin','Chunin','Jonin','ANBU','S-Rank'][s.ri], mission: m.n, year: G.year, month: G.month })
            if (s.wins >= 50) { addChronicle('Fallen Veteran', sn(s) + ' died on "' + m.n + '" after ' + s.wins + ' missions.', 'shinobi'); addLegend(10) }
            G.memorial.push({ name: sn(s), rank: ['Genin','Chunin','Jonin','ANBU','S-Rank'][s.ri], clan: s.clan, mission: m.n, year: G.year, month: G.month, wins: s.wins, lastWords })
            G.shinobi = G.shinobi.filter(x => x.id !== s.id)
            hadKIA = true; sq.kills++
          } else {
            const injType = pickInjuryType(m.rk)
            if (injType) applyInjury(s, injType, hL)
            survivorIds.push(s.id)
          }
        })
        // Survivors who witnessed KIA may develop trauma
        if (hadKIA) {
          survivorIds.forEach(id => {
            const survivor = G.shinobi.find(x => x.id === id)
            if (survivor && Math.random() < 0.5) applyTrauma(survivor)
          })
        }
        sq.cohesion = Math.max(0, (sq.cohesion ?? 0) + (hadKIA ? -15 : -4))
        sq.losses++
        aL('"' + m.n + '" squad mission failed. ' + pickSquadNarrative(m.rk, 'failure', sq.n), 'bad')
        G.morale = clamp(G.morale - 5, 0, 100)
      }
    } else {
      const s = G.shinobi.find(x => x.id === am.assignedTo); if (!s) return
      const pw = sPow(s), rM = s.pers.effect.riskMod || 0, sM = pw < m.mp ? (s.pers.effect.sucMod || 0) : 0, sB = s.pers.effect.soloBonus || 0
      const soloFormMod = ((s.returningForm || 100) < 100) ? ((s.returningForm - 100) / 500) : 0
      const soloAnbuBon = (m.rk === 'S' || m.rk === 'A') ? sb.anbuMissionBonus : 0
      const sc = clamp(1 - m.risk - rM + (pw - m.mp) * 0.01 + iB + sM + sB + sb.missionSuccessBonus + soloAnbuBon + soloFormMod, 0.08, 0.97)
      const rB = ['A','S'].includes(m.rk) && s.pers.n === 'Honorable' ? 2 : 0

      addWorkload(s, m.rk)
      if (Math.random() < sc) {
        G.ryo += m.ryo; G.reputation = clamp(G.reputation + m.rep + rB, 0, 999); G.morale = clamp(G.morale + 2, 0, 100)
        recordMissionCommission(m.rk)
        s.missId = null; s.wins++; s.streak = (s.streak || 0) + 1
        s.status = 'available'
        if (m.rk === 'B' || m.rk === 'C') s.winsB = (s.winsB || 0) + 1
        if (m.rk === 'S') { s.winsS = (s.winsS || 0) + 1 }
        checkJutsu(s)
        aL(sn(s) + ' completed "' + m.n + '" — +' + fmt(m.ryo) + ' ryo. ' + pickNarrative(m.rk, 'success', sn(s), s.pers.n, { wins: s.wins, streak: s.streak, season }), 'good')
        addLegend(m.rk === 'S' ? 12 : m.rk === 'A' ? 6 : m.rk === 'B' ? 2 : 1)
        if (m.rk === 'S') addChronicle('S-Rank Completed', sn(s) + ' completed the S-rank mission "' + m.n + '".', 'legend')
        rollInjuryOnSuccess(s, m, hL)
      } else {
        s.streak = 0
        const kR = hL >= 2 ? 0.02 : hL >= 1 ? 0.04 : 0.08
        if (Math.random() < kR) {
          const lastWords = pk(LAST_WORDS_POOL)
          aL(sn(s) + ' KIA on "' + m.n + '". ' + lastWords, 'bad')
          G.memorial.push({ name: sn(s), rank: ['Genin','Chunin','Jonin','ANBU','S-Rank'][s.ri], clan: s.clan, mission: m.n, year: G.year, month: G.month, wins: s.wins, lastWords })
          if (s.wins >= 50) addChronicle('Fallen Veteran', sn(s) + ' died on "' + m.n + '" after ' + s.wins + ' missions. ' + lastWords, 'shinobi')
          G.shinobi = G.shinobi.filter(x => x.id !== s.id)
          G.reputation = clamp(G.reputation - 5, 0, 999)
        } else {
          if (m.rk === 'S' && !s.darkMoment) {
            s.darkMoment = pk(DARK_MOMENT_POOL)
            aL(sn(s) + ' failed the S-rank and carries something new. "' + s.darkMoment + '"', 'warn')
          }
          const injType = pickInjuryType(m.rk)
          if (injType) {
            applyInjury(s, injType, hL)
            aL('"' + m.n + '" failed — ' + sn(s) + ' has a ' + injType.n + ' (' + s.injDays + 'mo). ' + pickNarrative(m.rk, 'failure', sn(s), s.pers.n, { wins: s.wins, streak: s.streak, season }), 'bad')
          }
          // Re-injury risk for those returning from long absence
          if ((s.returningForm || 100) < 80 && Math.random() < 0.20) {
            aL(sn(s) + ' re-injured themselves — too soon to return to active duty.', 'warn')
          }
        }
        G.morale = clamp(G.morale - 3, 0, 100)
      }
    }
  })
  G.aM = G.aM.filter(am => am.daysLeft > 0)

  // ── Raid system ──────────────────────────────────────────────────────────
  if (G.raid && !G.raid.resolved) { if (G.raidW <= 0) resRaid(); else G.raidW-- }
  if (!G.raid) {
    // Aggressive villages raise raid chance
    const aggressiveV = G.villages.filter(v => v.personality === 'Aggressive' && v.rel < 40)
    const aggressiveBonus = aggressiveV.length * 0.02
    if (Math.random() < 0.12 + aggressiveBonus) {
      const ev = pk(RAID_POOL), warn = G.upgrades.intel >= 2 ? 2 : G.upgrades.intel >= 1 ? 1 : 0
      G.raid = { ...ev, resolved: false }; G.raidW = warn
      aL('⚠ Threat: ' + ev.n + '! ' + (warn > 0 ? 'Arrives in ' + warn + 'm.' : 'Arriving now!'), 'warn')
      if (warn === 0) resRaid()
    }
  }

  // ── Rival village grudge tick-down ───────────────────────────────────────
  G.villages.forEach(v => {
    if ((v.grudgeTicks || 0) > 0) {
      v.grudgeTicks--
      // Honorable villages forgive faster
      if (v.personality === 'Honorable' && Math.random() < 0.3) v.grudgeTicks = Math.max(0, v.grudgeTicks - 1)
    }
  })

  // ── Staff tick ────────────────────────────────────────────────────────────
  if (!G.staff) G.staff = [];
  (G.staff || []).forEach(st => {
    st.monthsServed = (st.monthsServed || 0) + 1
    // Development — +1 rating over time
    if (st.monthsServed > 0 && st.monthsServed % 6 === 0 && Math.random() < 0.30 && st.rating < 20) {
      st.rating++
      const role = STAFF_ROLES.find(r => r.id === st.role)
      if (role) {
        const k = pk(role.stats)
        st.stats[k] = clamp(st.stats[k] + 1, 1, 20)
      }
      aL(st.fn + ' ' + st.ln + ' improved to rating ' + st.rating + '.', 'good')
    }
    // Retirement after 60+ months with institutional bonus
    if (st.monthsServed >= 60 && Math.random() < 0.05) {
      aL(st.fn + ' ' + st.ln + ' retired after ' + st.monthsServed + ' months. They leave behind institutional knowledge.', 'neutral')
      st.institutional = Math.floor(st.rating / 4)
      G.staff = G.staff.filter(x => x.id !== st.id)
    }
  })

  // ── Economy & Finance snapshot ────────────────────────────────────────────
  const trI = Math.round(G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0) * sb.tradeIncomeMultiplier)
  const coI = Math.round(G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0) * sb.tradeIncomeMultiplier)
  const jkI = G.beasts.filter(b => b.sealed && b.n === 'Matatabi' && b.jk).length * 3000
  const daimyoB = computeDaimyoBonus()
  const maintenance = computeMaintenance()
  const shinobiSal = G.shinobi.reduce((a, s) => a + s.salary, 0)
  const staffSal = (G.staff || []).reduce((a, st) => a + st.salary, 0)
  const commI = Object.entries(G.finances?.missionCommissions || {}).reduce((a,[,v]) => a + v * 0, 0) // commissions already applied to G.ryo
  const examFeeAmt = G.finances?.examFees || 0
  const loanFeeAmt = G.finances?.loanFees || 0

  const totalIncome = trI + coI + jkI + daimyoB + examFeeAmt + loanFeeAmt
  const totalExpend = shinobiSal + staffSal + maintenance
  const monthlyNet = totalIncome - totalExpend

  // Apply economy flows
  G.ryo += trI + coI + jkI + daimyoB + examFeeAmt + loanFeeAmt
  G.ryo -= shinobiSal + staffSal + maintenance

  // Record finance snapshot
  if (!G.finances) G.finances = { history:[], deficitMonths:0, healthTier:'Stable', lastMonthNet:0, missionCommissions:{D:0,C:0,B:0,A:0,S:0}, examFees:0, loanFees:0, scoutCostThisMonth:0 }
  const commByRank = G.finances.missionCommissions || {D:0,C:0,B:0,A:0,S:0}
  const commTotal = Object.entries(commByRank).reduce((a,[rk,cnt]) => a + cnt * (MISSION_COMMISSION[rk]||0), 0)
  const snap = {
    year: G.year, month: G.month,
    income: { tradeRoutes:trI, contracts:coI, jinchuriki:jkI, daimyoBonus:daimyoB, missionCommissions:commTotal, examFees:examFeeAmt, loanFees:loanFeeAmt },
    expenditure: { shinobiWages:shinobiSal, staffWages:staffSal, maintenance, scoutCost:G.finances.scoutCostThisMonth||0 },
    totalIncome, totalExpend, net:monthlyNet,
    missionBreakdown: { ...commByRank },
    shinobiByRank: {
      Genin: G.shinobi.filter(s=>s.ri===0).length,
      Chunin: G.shinobi.filter(s=>s.ri===1).length,
      Jonin: G.shinobi.filter(s=>s.ri===2).length,
      ANBU: G.shinobi.filter(s=>s.ri===3).length,
      'S-Rank': G.shinobi.filter(s=>s.ri===4).length,
    }
  }
  G.finances.history.push(snap)
  if (G.finances.history.length > 12) G.finances.history.shift()
  G.finances.lastMonthNet = monthlyNet

  // Determine health tier
  const tier = computeFinanceTier(monthlyNet)
  G.finances.healthTier = tier.n
  if (tier.morale !== 0) G.morale = clamp(G.morale + tier.morale, 0, 100)

  // Deficit tracking & debt spiral
  if (monthlyNet < 0) {
    G.finances.deficitMonths = (G.finances.deficitMonths || 0) + 1
    if (G.finances.deficitMonths >= 3 && Math.random() < 0.25) {
      const ev = pk(FINANCIAL_EVENTS)
      G.ryo = Math.max(0, G.ryo + ev.ryo)
      if (ev.rep) G.reputation = clamp(G.reputation + ev.rep, 0, 999)
      if (ev.morale) G.morale = clamp(G.morale + ev.morale, 0, 100)
      aL('⚠ Financial Crisis: "' + ev.n + '" — ' + ev.desc, 'bad')
      addChronicle('Financial Crisis', ev.n + ': ' + ev.desc, 'event')
    }
  } else {
    G.finances.deficitMonths = 0
  }

  // Reset monthly accumulators
  G.finances.missionCommissions = { D:0, C:0, B:0, A:0, S:0 }
  G.finances.examFees = 0
  G.finances.loanFees = 0
  G.finances.scoutCostThisMonth = 0

  if (G.ryo < 0) { aL('Treasury empty! Morale suffers.', 'bad'); G.morale = clamp(G.morale - 8, 0, 100); G.ryo = 0 }

  // ── Diplomacy drift ──────────────────────────────────────────────────────
  G.villages.forEach(v => {
    if (Math.random() < 0.10) {
      // Mercantile villages drift toward positive rel
      const dir = v.personality === 'Mercantile' ? rnd(-3, 8) : v.personality === 'Isolationist' ? rnd(-3, 3) : rnd(-7, 7)
      v.rel = clamp(v.rel + dir, 0, 100)
      if (Math.abs(dir) > 4) aL('Diplomatic shift: ' + v.n + ' ' + (dir > 0 ? '+' : '') + dir + '.', 'neutral')
    }
  })

  // ── Kage events ──────────────────────────────────────────────────────────
  G.keCD = (G.keCD || 0) - 1
  if (!ui.pKE && G.keCD <= 0 && Math.random() < 0.25) {
    const ev = G.keQ.shift()
    if (ev) { ui.pKE = ev; G.keCD = rnd(4, 7); aL('Kage Event: "' + ev.n + '" — check Kage Council!', 'ev'); ntf('New Kage event!') }
    if (!G.keQ.length) G.keQ = [...KAGE_EVENTS].sort(() => Math.random() - 0.5)
  }

  // ── World choice events ───────────────────────────────────────────────────
  if (!G.pendingChoiceEvent && Math.random() < 0.06) {
    const ev = pk(WORLD_CHOICE_EVENTS)
    G.pendingChoiceEvent = ev
    if (ev.effects?.worldFlag) G.worldFlags[ev.effects.worldFlag] = rnd(3, 6)
    aL('World Event: "' + ev.n + '" — check Missions panel for response options!', 'ev')
    ntf('World Event requires response!')
  }

  // ── Regional meta shift tick ────────────────────────────────────────────────
  if (!G.regionalMeta) G.regionalMeta = {}
  REGIONS.forEach(r => {
    const active = G.regionalMeta[r.id]
    if (active) {
      active.monthsLeft--
      if (active.monthsLeft <= 0) { delete G.regionalMeta[r.id]; aL((REGION_EVENTS.find(e=>e.id===active.eventId)?.n||'Event') + ' in ' + r.n + ' has ended.', 'neutral') }
    } else if (Math.random() < 0.06) {
      const ev = pk(REGION_EVENTS)
      G.regionalMeta[r.id] = { eventId: ev.id, monthsLeft: rnd(2, 4) }
      aL(ev.icon + ' ' + ev.n + ' has begun in the ' + r.n + '. ' + ev.desc, ev.qualityMod < 0 ? 'warn' : 'good')
    }
  })

  // ── Scout network tick ────────────────────────────────────────────────────
  if (!G.scoutReports) G.scoutReports = []
  if (!G.scoutWatchlist) G.scoutWatchlist = []
  if (!G.scoutBudget) G.scoutBudget = { domestic: 40, foreign: 30, shadow: 30 }
  const scouts = (G.staff || []).filter(st => st.role === 'scout_jonin' || st.role === 'head_scout')
  const headScout = (G.staff || []).find(st => st.role === 'head_scout')
  // Budget split modifiers — domestic boosts report frequency, foreign boosts contact growth, shadow boosts head-scout shadow intel chance
  const budgetDomestic = (G.scoutBudget.domestic || 40) / 40   // 1.0 at baseline 40%
  const budgetForeign  = (G.scoutBudget.foreign  || 30) / 30
  const budgetShadow   = (G.scoutBudget.shadow   || 30) / 30
  scouts.forEach(scout => {
    if (!scout.contacts) scout.contacts = {}
    if (scout.fatigue === undefined) scout.fatigue = 0
    const region = scout.regionAssigned
    if (!region) return
    // Fatigue accumulation
    scout.fatigue = Math.min(100, scout.fatigue + rnd(5, 12))
    // Grow regional contacts over time (scaled by foreign budget allocation)
    scout.contacts[region] = Math.min(20, (scout.contacts[region] || 0) + (Math.random() < 0.3 * budgetForeign ? 1 : 0))
    const contactBonus = scout.contacts[region] || 0
    const regionEvent = G.regionalMeta[region] ? REGION_EVENTS.find(e => e.id === G.regionalMeta[region].eventId) : null
    const metaMod = regionEvent ? regionEvent.qualityMod : 0
    // Generate a report
    const reportRoll = Math.random()
    const reportQuality = clamp((((scout.stats.perception || 8) + contactBonus + (headScout ? 2 : 0)) / 22) + metaMod, 0.05, 1.0)
    if (reportRoll < (0.55 + reportQuality * 0.3) * budgetDomestic) {
      // Conflicting reports: if another scout already covers this region, occasionally both file independent reads of the same prospect
      const existingForRegion = G.prospects.filter(p => p.fromRegion === region && p.urgencyMonths > 0)
      const otherScoutHere = scouts.find(s => s.id !== scout.id && s.regionAssigned === region)
      let prospect, isSecondOpinion = false
      if (otherScoutHere && existingForRegion.length && Math.random() < 0.4) {
        prospect = pk(existingForRegion)
        isSecondOpinion = true
        // Re-derive this scout's own stat ranges for the same prospect (independent judgment)
        const judgeAbility = scout.stats.perception || 8
        const effectiveJudge = Math.min(20, judgeAbility + contactBonus)
        const errorMargin = Math.max(1, Math.round(15 - effectiveJudge * 0.65))
        const altRanges = {}
        Object.keys(prospect.stats).forEach(k => {
          const driftedTrue = clamp(prospect.stats[k] + rnd(-3, 3), 1, 99)
          altRanges[k] = { lo: Math.max(1, driftedTrue - errorMargin), hi: Math.min(99, driftedTrue + errorMargin), exact: effectiveJudge >= 16 }
        })
        prospect.conflictingRanges = prospect.conflictingRanges || []
        prospect.conflictingRanges.push({ scoutId: scout.id, scoutName: sn(scout), ranges: altRanges, confidence: clamp(Math.round(40 + effectiveJudge * 2.6), 40, 95) })
      } else {
        prospect = genRegionProspect(region, scout)
        G.prospects.push(prospect)
      }
      const quality = reportQuality > 0.75 ? 'Detailed' : reportQuality > 0.45 ? 'General' : 'Vague'
      const narrative = genScoutNarrative(scout, prospect, quality)
      prospect.scoutHistory = prospect.scoutHistory || []
      prospect.scoutHistory.push({ year: G.year, month: G.month, scoutName: sn(scout), quality, confidence: prospect.scoutConfidence || 60 })
      G.scoutReports.push({
        id: Math.random().toString(36).slice(2),
        year: G.year, month: G.month,
        scoutId: scout.id, scoutName: sn(scout),
        region, prospectId: prospect.id,
        prospectName: prospect.fn + ' ' + prospect.ln,
        quality, rivalInterest: prospect.rivalInterest > 0,
        confidence: prospect.scoutConfidence || clamp(Math.round(40 + reportQuality * 55), 40, 95),
        narrative, isSecondOpinion,
        personalityRevealed: !!prospect.personalityRevealed,
      })
      if (G.scoutReports.length > 30) G.scoutReports.shift()
      aL(sn(scout) + ' filed a scout report from the ' + (REGIONS.find(r => r.id === region)?.n || region) + '.', 'neutral')
      // Watchlist auto-refresh notice
      if (G.scoutWatchlist.includes(prospect.id)) ntf('Watchlist update: new report on ' + prospect.fn + ' ' + prospect.ln)
    }
    // Shadow scouting intel (head scout unlocks, scaled by shadow budget allocation)
    if (scout.role === 'head_scout' && Math.random() < 0.25 * budgetShadow) {
      const targetV = pk(G.villages || [])
      if (targetV) {
        if (!targetV.scoutIntel) targetV.scoutIntel = {}
        targetV.scoutIntel.squadDepth = rnd(3, 15)
        targetV.scoutIntel.avgPower = rnd(100, 500)
        targetV.scoutIntel.updatedY = G.year; targetV.scoutIntel.updatedM = G.month
        aL(sn(scout) + ' gathered shadow intel on ' + targetV.n + '.', 'neutral')
      }
    }
    // Fatigue resignation risk
    if (scout.fatigue >= 90 && Math.random() < 0.12) {
      aL(sn(scout) + ' resigned due to scout fatigue!', 'bad')
      G.staff = G.staff.filter(st => st.id !== scout.id)
    }
    // Monthly fatigue recovery if resting (no region)
  })
  // Recover fatigue for scouts not assigned
  ;(G.staff || []).filter(st => (st.role === 'scout_jonin' || st.role === 'head_scout') && !st.regionAssigned).forEach(scout => {
    scout.fatigue = Math.max(0, (scout.fatigue || 0) - 20)
  })
  // Tick down urgency on scout-sourced prospects
  G.prospects.forEach(p => {
    if (p.urgencyMonths > 0) p.urgencyMonths--
  })

  // ── Annual intake (April = month 4) ───────────────────────────────────────
  if (G.month === 4 && (G.lastIntakeYear || 0) < G.year) {
    G.lastIntakeYear = G.year
    if (!G.intakeClass) G.intakeClass = []
    const acLv = G.upgrades.academy || 0
    const headSensei = (G.staff || []).find(st => st.role === 'head_sensei')
    const hsRating = headSensei?.rating || 0
    const classSize = rnd(8, 12) + Math.floor(acLv * 1.5)
    const prodigyIdx = Math.random() < 0.01 * classSize ? rnd(0, classSize - 1) : -1
    for (let i = 0; i < classSize; i++) {
      const student = genStudent(acLv, hsRating)
      if (i === prodigyIdx) {
        student.potential = Math.min(99, student.potential + rnd(15, 25))
        student.trait = 'Prodigy'
        aL('A prodigy has entered the Academy this intake!', 'good')
        addChronicle('Prodigy Intake', student.fn + ' ' + student.ln + ' shows extraordinary talent.', 'shinobi')
        addLegend(5)
      }
      G.intakeClass.push(student)
    }
    aL('Annual intake: ' + classSize + ' students joined the Academy (Year ' + G.year + ').', 'good')
    ntf('New Academy intake — ' + classSize + ' students!')
  }

  // ── Youth academy development tick ────────────────────────────────────────
  if (!G.intakeClass) G.intakeClass = []
  if (!G.academyRecords) G.academyRecords = {}
  if (!G.gradTracking) G.gradTracking = []
  const graduates = []
  // Peer influence: identify prodigy and low-professionalism students in the class
  const prodigyIds = G.intakeClass.filter(s => s.trait === 'Prodigy').map(s => s.id)
  const lowProfIds = G.intakeClass.filter(s => (s.pMatrix?.professionalism || 10) < 7).map(s => s.id)
  G.intakeClass.forEach(student => {
    student.monthsInClass = (student.monthsInClass || 0) + 1
    const track = DEV_TRACKS.find(t => t.id === (student.devTrack || 'balanced')) || DEV_TRACKS[0]
    const intensity = INTENSITY_LEVELS.find(i => i.id === (student.intensity || 'medium')) || INTENSITY_LEVELS[1]
    const sensei = (G.staff || []).find(st => st.id === student.sensei)
    const sensMult = sensei ? (1 + (sensei.stats.pedagogy || 8) / 40) : 1.0
    // Peer influence multiplier: prodigy in class +10%, low-professionalism classmates -5% (stacking, excludes self)
    let peerMult = 1.0
    if (prodigyIds.some(id => id !== student.id)) peerMult += 0.10
    const dragCount = lowProfIds.filter(id => id !== student.id).length
    peerMult -= dragCount * 0.05
    peerMult = clamp(peerMult, 0.6, 1.3)
    let statGain = 0
    // Growth
    if (!student.burnout) {
      const growAmount = Math.round(intensity.mult * sensMult * peerMult)
      // Bonus stats from track
      Object.entries(track.growBonus).forEach(([k, v]) => {
        if (student.stats[k] !== undefined) {
          const inc = Math.round(v * intensity.mult * sensMult * peerMult * 0.5)
          student.stats[k] = clamp(student.stats[k] + inc, 0, 99)
          statGain += inc
        }
      })
      // Random growth
      if (track.growRandom > 0) {
        const statKeys = Object.keys(student.stats)
        for (let i = 0; i < track.growRandom; i++) {
          const k = pk(statKeys)
          const inc = Math.round(Math.random() * growAmount)
          student.stats[k] = clamp(student.stats[k] + inc, 0, 99)
          statGain += inc
        }
      }
    } else {
      // Burnout: stat regression
      student.burnoutMonths = (student.burnoutMonths || 0) + 1
      if (Math.random() < 0.3) {
        const k = pk(Object.keys(student.stats))
        student.stats[k] = Math.max(1, student.stats[k] - 1)
      }
      if (student.burnoutMonths >= 3) {
        student.burnout = false; student.burnoutMonths = 0
        aL(sn(student) + ' has recovered from burnout.', 'neutral')
      }
    }
    // Burnout risk from high intensity
    if (!student.burnout && intensity.burnoutRisk > 0 && Math.random() < intensity.burnoutRisk / 100) {
      student.burnout = true
      student.burnoutTrait = pk(['Withdrawn', 'Anxious'])
      if (!student.traits) student.traits = []
      if (!student.traits.includes(student.burnoutTrait)) student.traits.push(student.burnoutTrait)
      aL(sn(student) + ' is burned out from intense training!', 'warn')
    }
    // Sensei style shapes personality during academy years
    if (sensei && student.pMatrix) {
      const style = senseiStyle(sensei)
      if (style === 'harsh' && Math.random() < 0.10) {
        const t = pk(['Resilient', 'Withdrawn'])
        student.pMatrix.temperament = clamp(student.pMatrix.temperament + (t === 'Resilient' ? 1 : -1), 1, 20)
        if (!student.traits) student.traits = []
        if (!student.traits.includes(t)) { student.traits.push(t); aL(sn(student) + ' grew ' + t + ' under a harsh training regimen.', t === 'Resilient' ? 'good' : 'warn') }
      } else if (style === 'nurturing' && Math.random() < 0.10) {
        const t = pk(['Loyal', 'Composed'])
        student.pMatrix.loyalty = clamp(student.pMatrix.loyalty + 1, 1, 20)
        if (!student.traits) student.traits = []
        if (!student.traits.includes(t)) { student.traits.push(t); aL(sn(student) + ' became ' + t + ' under a nurturing sensei.', 'good') }
      }
    }
    // Sensei trait pass-down (once, at 6 months) — legacy honor traits
    if (student.monthsInClass === 6 && sensei && sensei.stats.empathy >= 12 && Math.random() < 0.35) {
      const senseiTraits = ['Honorable', 'Determined', 'Analytical']
      const t = pk(senseiTraits)
      if (!student.traits) student.traits = []
      if (!student.traits.includes(t)) { student.traits.push(t); aL(sn(student) + ' adopted a ' + t + ' disposition from their sensei.', 'good') }
    }
    // Dev curve reveal — experienced sensei (pedagogy>=14) or elite head_scout judgment
    const headScoutForReveal = (G.staff || []).find(st => st.role === 'head_scout')
    const judgeRating = Math.max(sensei?.stats?.pedagogy || 0, headScoutForReveal?.stats?.perception || 0)
    if (revealDevCurve(student, judgeRating)) {
      const curve = DEV_CURVES.find(c => c.id === student.devCurve)
      aL(sn(student) + '\'s development curve was assessed: ' + (curve?.n || 'Standard') + '.', 'neutral')
    }
    // Monthly individual training report narrative
    const growthNote = statGain > 2 ? 'Strong gains this month.' : statGain > 0 ? 'Modest progress.' : student.burnout ? 'Struggling through burnout.' : 'A quiet month, little change.'
    student.trainingReports = student.trainingReports || []
    student.trainingReports.push({ year: G.year, month: G.month, text: genTrainingReport(student, sensei, growthNote) })
    if (student.trainingReports.length > 12) student.trainingReports.shift()
    // Milestones at months 3, 6, 9
    if ([3, 6, 9].includes(student.monthsInClass) && !student.milestones?.includes(student.monthsInClass)) {
      if (!student.milestones) student.milestones = []
      student.milestones.push(student.monthsInClass)
      aL(sn(student) + ' reached ' + student.monthsInClass + '-month Academy milestone.', 'neutral')
    }
    // Kage personal sparring (once per year, if G.kageTrainingUsedYear < G.year and student is flagged)
    if (student.kageTraining && (G.kageTrainingUsedYear || 0) < G.year) {
      G.kageTrainingUsedYear = G.year
      student.kageTraining = false
      const gainKey = pk(['ninjutsu','taijutsu','speed','chakra'])
      student.stats[gainKey] = clamp(student.stats[gainKey] + rnd(3, 6), 0, 99)
      student.potential = Math.min(99, student.potential + rnd(2, 5))
      aL('The Kage personally sparred with ' + sn(student) + ' — exceptional growth!', 'good')
      addLegend(2)
    }
    // Graduation at 12 months
    if (student.monthsInClass >= 12) {
      graduates.push(student)
    }
  })
  // Graduate students into prospects pool
  if (graduates.length > 0) {
    // Determine class ranking by potential for clan expectation resolution
    const classByPotential = [...G.intakeClass].sort((a, b) => b.potential - a.potential)
    graduates.forEach(student => {
      // Clan/parent expectations for clan heirs
      if (student.clan) {
        const rank = classByPotential.findIndex(s => s.id === student.id)
        const topOfClass = rank >= 0 && rank < Math.max(1, Math.ceil(classByPotential.length * 0.2))
        const bottomOfClass = rank >= 0 && rank >= classByPotential.length - Math.max(1, Math.ceil(classByPotential.length * 0.2))
        if (topOfClass) {
          const statKey = pk(Object.keys(student.stats))
          student.stats[statKey] = clamp(student.stats[statKey] + rnd(3, 6), 0, 99)
          if (student.pMatrix) student.pMatrix.loyalty = clamp(student.pMatrix.loyalty + 3, 1, 20)
          aL(student.clan + ' clan elders honor ' + sn(student) + ' for graduating top of class — clan support granted.', 'good')
        } else if (bottomOfClass) {
          if (student.pMatrix) student.pMatrix.loyalty = clamp(student.pMatrix.loyalty - 3, 1, 20)
          aL(student.clan + ' clan elders express disappointment in ' + sn(student) + '\'s graduation standing — support withdrawn.', 'bad')
        }
      }
      // Academy records check — highest graduating stat per category
      Object.entries(student.stats).forEach(([k, v]) => {
        const cur = G.academyRecords[k]
        if (!cur || v > cur.value) {
          G.academyRecords[k] = { value: v, name: sn(student), year: G.year }
          addChronicle('Academy Record', sn(student) + ' set a new academy record in ' + k + ' (' + v + ').', 'milestone')
          aL('NEW RECORD: ' + sn(student) + ' — ' + k + ' ' + v, 'good')
        }
      })
      // Post-graduation tracking entry
      G.gradTracking.push({ id: student.id, name: sn(student), gradYear: G.year, gradMonth: G.month, clan: student.clan || null })
      // Convert to proper prospect/shinobi entry
      student.status = 'prospect'
      G.prospects.push(student)
      G.intakeClass = G.intakeClass.filter(s => s.id !== student.id)
      aL(sn(student) + ' graduated from the Academy!', 'good')
    })
    addChronicle('Academy Graduation', graduates.length + ' students graduated: ' + graduates.map(s => sn(s)).join(', ') + '.', 'event')
    ntf(graduates.length + ' students graduated from the Academy!')
    addLegend(graduates.length * 2)
  }

  // ── Individual morale, commitment & people management tick ────────────────
  if (!G.meetingQueue) G.meetingQueue = []
  if (!G.sellPressure) G.sellPressure = []
  if (!G.transferMarket) G.transferMarket = { pool:[], offers:[], loanOut:[], loanIn:[], windowOpen:false, windowSeason:null, windowMonthsLeft:0 }
  if (!G.rumors) G.rumors = []
  if (!G.noticeboard) G.noticeboard = []
  if (!G.serviceAwardQueue) G.serviceAwardQueue = []
  if (!G.reviewQueue) G.reviewQueue = []

  G.shinobi.forEach(s => {
    // Backfill missing fields on old saves
    if (!s.pMatrix) s.pMatrix = { loyalty:rnd(3,18), ambition:rnd(3,18), professionalism:rnd(3,18), temperament:rnd(3,18), adaptability:rnd(3,18) }
    if (s.indMorale === undefined) s.indMorale = 70
    if (s.commitment === undefined) s.commitment = 70
    if (!s.traits) s.traits = []
    if (s.lowCommitMonths === undefined) s.lowCommitMonths = 0

    // Individual morale drifts toward village morale
    const mgap = G.morale - s.indMorale
    s.indMorale = clamp(s.indMorale + Math.round(mgap * 0.08), 0, 100)

    // Commitment decay: 1–2/month
    s.commitment = clamp(s.commitment - rnd(1, 2), 0, 100)
    // Restless ambition drains faster if not promoted
    if ((s.pMatrix.ambition || 10) >= 15 && s.ri < 3) s.commitment = clamp(s.commitment - 1, 0, 100)
    // High loyalty slows decay
    if ((s.pMatrix.loyalty || 10) >= 15) s.commitment = clamp(s.commitment + 1, 0, 100)
    // Deployment streak renews commitment
    if ((s.streak || 0) >= 2) s.commitment = clamp(s.commitment + 2, 0, 100)

    // Personality evolution: consistent winners grow Confident
    if ((s.streak || 0) >= 5 && addTrait(s, 'Confident')) {
      aL(sn(s) + ' has grown Confident after a streak of consistent success.', 'good')
      addNotice(sn(s) + ' is riding high after a string of victories.', 'good')
    }

    // Legend status: 10+ years (120 months)
    if (!s.legendStatus && s.months >= 120) {
      s.legendStatus = true
      s.commitment = clamp(s.commitment + 20, 0, 100)
      aL(sn(s) + ' is now a Village Legend — a decade of service!', 'good')
      addChronicle('Village Legend', sn(s) + ' became a legend after a decade of service.', 'shinobi')
      addNotice(sn(s) + ' has been recognized as a Village Legend.', 'good')
      addLegend(10)
    }

    // Long-service award milestones (5/10/15 years)
    SERVICE_AWARDS.forEach(award => {
      if (s.months === award.years * 12 && !G.serviceAwardQueue.find(a => a.shinobiId === s.id && a.years === award.years)) {
        G.serviceAwardQueue.push({ id: Math.random().toString(36).slice(2), shinobiId: s.id, years: award.years, year: G.year, month: G.month })
        ntf(sn(s) + ' reached ' + award.years + ' years of service — check People Management!')
      }
    })

    // Annual review (once per shinobi per year, December)
    if (G.month === 12 && s.lastReviewYear !== G.year && s.status !== 'exam') {
      s.lastReviewYear = G.year
      const expected = (s.ri + 1) * 6
      const outcome = s.wins >= expected * 1.4 ? 'exceeded' : s.wins >= expected * 0.7 ? 'met' : 'disappointed'
      G.reviewQueue.push({ id: Math.random().toString(36).slice(2), shinobiId: s.id, outcome, year: G.year })
    }

    // Meeting trigger (cooldown guard)
    s.meetingCooldown = Math.max(0, (s.meetingCooldown || 0) - 1)
    if (s.meetingCooldown === 0 && !G.meetingQueue.find(m => m.shinobiId === s.id)) {
      let mType = null
      if (s.commitment < 20) mType = 'leaving'
      else if (s.traumaStatus && Math.random() < 0.40) mType = 'grieving'
      else if (s.status === 'available' && (s.workload || 0) < 15 && s.months > 3 && Math.random() < 0.22) mType = 'underused'
      else if (s.months > 12 && s.ri < 4 && (s.pMatrix.ambition || 10) >= 13 && Math.random() < 0.18) mType = 'promotion'
      else if (s.squadId && (s.pMatrix.temperament || 10) < 7 && Math.random() < 0.15) mType = 'squad_clash'
      else if (s.wins > 0 && s.wins % 25 === 0 && Math.random() < 0.55) mType = 'milestone'
      if (mType) {
        G.meetingQueue.push({ id: Math.random().toString(36).slice(2), shinobiId: s.id, type: mType, month: G.month, year: G.year })
        s.meetingCooldown = 3
        aL(sn(s) + ' has requested a one-on-one meeting — check People Management!', 'ev')
        ntf('Meeting request: ' + sn(s))
      }
    }

    // Promotion deadline missed — personality evolution: feeling overlooked breeds resentment
    if (s.promotionDeadline && G.month >= s.promotionDeadline && G.year >= (s.promotionDeadlineYear || G.year)) {
      s.commitment = clamp(s.commitment - 15, 0, 100)
      s.indMorale = clamp(s.indMorale - 10, 0, 100)
      s.promotionDeadline = null
      aL(sn(s) + '\'s promised promotion deadline passed — they are deeply disappointed.', 'bad')
      if (addTrait(s, 'Resentful')) {
        aL(sn(s) + ' has grown Resentful after being passed over.', 'warn')
        addNotice(sn(s) + ' feels overlooked by village leadership.', 'bad')
      }
    }

    // Role guarantee breach
    if (s.roleGuarantee && s.status === 'available' && (s.workload || 0) < 10 && s.months > 1) {
      s.commitment = clamp(s.commitment - 3, 0, 100)
      s.indMorale = clamp(s.indMorale - 4, 0, 100)
    }

    // Rumor system: sustained low commitment surfaces rumors (early warning system)
    if (s.commitment < 35) {
      s.lowCommitMonths = (s.lowCommitMonths || 0) + 1
      const hasActiveRumor = G.rumors.some(r => r.shinobiId === s.id && !r.resolved)
      if (s.lowCommitMonths >= 2 && !hasActiveRumor && Math.random() < 0.25) {
        addRumor(s, pk(RUMOR_TEMPLATES))
        ntf('A rumor is circulating about ' + sn(s) + ' — check People Management.')
      }
    } else {
      s.lowCommitMonths = 0
    }

    // Transfer at zero commitment (loyalty check)
    if (s.commitment <= 0 && !s.legendStatus) {
      const loyRoll = s.pMatrix.loyalty || 10
      if (loyRoll < 10 && Math.random() < 0.40) {
        aL(sn(s) + ' has submitted a transfer request and left the village!', 'bad')
        G.memorial.push({ name: sn(s), rank: ['Genin','Chunin','Jonin','ANBU','S-Rank'][s.ri], clan: s.clan, year: G.year, month: G.month, wins: s.wins, lastWords: 'Submitted a transfer request.', transfer: true })
        addChronicle('Transfer Departure', sn(s) + ' left the village after losing all commitment.', 'event')
        addNotice(sn(s) + ' has left the village for good.', 'bad')
        G.morale = clamp(G.morale - 4, 0, 100)
        G.shinobi = G.shinobi.filter(x => x.id !== s.id)
      }
    }
  })

  // ── Dressing room harmony ──────────────────────────────────────────────────
  const harmony = computeHarmony()
  G.harmonyScore = harmony
  if (harmony > 70) G.morale = clamp(G.morale + 1, 0, 100)
  if (harmony < 40 && Math.random() < 0.28) {
    const eligible = HARMONY_EVENTS.filter(e => harmony <= e.harmonyThresh)
    const ev = eligible.length ? pk(eligible) : HARMONY_EVENTS[0]
    G.morale = clamp(G.morale + ev.morale, 0, 100)
    G.shinobi.forEach(s => { s.indMorale = clamp((s.indMorale || 70) + ev.indMorale, 0, 100) })
    aL('Dressing Room: "' + ev.n + '" — ' + ev.desc, 'bad')
    addChronicle('Dressing Room Crisis', ev.n + ': ' + ev.desc, 'event')
    addNotice(ev.n + ': ' + ev.desc, 'bad')
  }
  // Leadership group mediates after losses
  const leadershipGroup = getLeadershipGroup()
  if (harmony < 60) {
    if (leadershipGroup.filter(l => (l.pMatrix?.loyalty || 0) >= 14).length >= 2) {
      G.morale = clamp(G.morale + 2, 0, 100)
    }
  }

  // ── Group dynamics events (beyond 1-on-1 meetings) ─────────────────────────
  if (Math.random() < 0.18) {
    const rivalPairExists = G.shinobi.some(s => s.rivalId && G.shinobi.some(o => o.id === s.rivalId && o.squadId === s.squadId))
    const squadMilestone = G.squads.some(sq => sq.wins > 0 && sq.wins % 10 === 0)
    const prodigyPresent = G.shinobi.some(s => s.trait === 'Prodigy' || s.prodigy)
    const legendPresent = G.shinobi.some(s => s.legendStatus)
    const newcomerPresent = G.shinobi.some(s => (s.months || 0) <= 1)
    const eligible = GROUP_EVENTS.filter(ev => {
      if (ev.requires === 'rivals') return rivalPairExists
      if (ev.requires === 'leader') return leadershipGroup.length >= 2
      if (ev.requires === 'squadwin') return squadMilestone
      if (ev.requires === 'lowharmony') return harmony < 50
      if (ev.requires === 'prodigy') return prodigyPresent
      if (ev.requires === 'legend') return legendPresent
      if (ev.requires === 'newcomer') return newcomerPresent
      return false
    })
    if (eligible.length) {
      const gev = pk(eligible)
      G.morale = clamp(G.morale + gev.moraleMod, 0, 100)
      G.harmonyScore = clamp((G.harmonyScore || 70) + gev.harmonyMod, 0, 100)
      G.shinobi.forEach(s => { s.indMorale = clamp((s.indMorale || 70) + gev.indMoraleMod, 0, 100) })
      aL(gev.icon + ' ' + gev.n + ' — ' + gev.desc, gev.kind === 'good' ? 'good' : gev.kind === 'bad' ? 'bad' : 'neutral')
      addChronicle(gev.n, gev.desc, 'event')
      addNotice(gev.icon + ' ' + gev.desc, gev.kind === 'good' ? 'good' : gev.kind === 'bad' ? 'bad' : 'neutral')
    }
  }

  // ── Transfer window tick ────────────────────────────────────────────────────
  const tw = TRANSFER_WINDOWS.find(w => w.month === G.month)
  if (tw && !G.transferMarket.windowOpen) {
    G.transferMarket.windowOpen = true
    G.transferMarket.windowSeason = tw.id
    G.transferMarket.windowMonthsLeft = tw.duration
    G.transferMarket.pool = genTransferPool()
    aL(tw.icon + ' ' + tw.n + ' is now open — browse available shinobi!', 'ev')
    ntf(tw.n + ' open!')
  }
  if (G.transferMarket.windowOpen) {
    G.transferMarket.windowMonthsLeft = Math.max(0, G.transferMarket.windowMonthsLeft - 1)
    G.transferMarket.pool.forEach(p => { p.monthsAvailable = Math.max(0, (p.monthsAvailable || 1) - 1) })
    G.transferMarket.pool = G.transferMarket.pool.filter(p => p.monthsAvailable > 0)
    if (G.transferMarket.windowMonthsLeft <= 0) {
      G.transferMarket.windowOpen = false
      G.transferMarket.windowSeason = null
      aL('Transfer window closed. Market resets next season.', 'neutral')
    }
  }

  // ── Sell pressure (rival villages approach your shinobi) ───────────────────
  G.sellPressure = (G.sellPressure || []).filter(sp => {
    const stillValid = !(sp.expiresYear < G.year || (sp.expiresYear === G.year && sp.expiresMonth <= G.month))
    return stillValid
  })
  if (Math.random() < 0.10 && G.shinobi.length > 0) {
    const targets = G.shinobi.filter(s => (s.ri >= 2 || s.wins >= 20) && !G.sellPressure.find(sp => sp.shinobiId === s.id))
    if (targets.length > 0) {
      const target = pk(targets)
      const village = pk(G.villages)
      const offer = Math.round(target.salary * rnd(12, 24))
      G.sellPressure.push({ shinobiId: target.id, villageName: village.n, offerRyo: offer, expiresMonth: G.month + 2, expiresYear: G.year + (G.month > 10 ? 1 : 0) })
      aL(village.n + ' has approached ' + sn(target) + ' with a transfer offer of ' + fmt(offer) + ' ryo!', 'ev')
      ntf(village.n + ' wants ' + sn(target) + '!')
    }
  }

  // ── Loan tick ──────────────────────────────────────────────────────────────
  const tm = G.transferMarket
  // Loans out (our shinobi sent away)
  tm.loanOut = (tm.loanOut || []).filter(lo => {
    lo.monthsRemaining = Math.max(0, (lo.monthsRemaining || 1) - 1)
    G.ryo += lo.monthlyFee || 0
    if (lo.monthsRemaining <= 0) {
      const s = G.shinobi.find(x => x.id === lo.shinobiId)
      if (s) { s.status = 'available'; s.commitment = clamp((s.commitment || 70) - 5, 0, 100) }
      aL((s ? sn(s) : 'Loaned shinobi') + ' returned from loan.', 'neutral')
      return false
    }
    return true
  })
  // Loans in (borrowed shinobi)
  tm.loanIn = (tm.loanIn || []).filter(li => {
    li.monthsRemaining = Math.max(0, (li.monthsRemaining || 1) - 1)
    G.ryo -= li.monthlyCost || 0
    if (li.monthsRemaining <= 0) {
      G.shinobi = G.shinobi.filter(s => s.id !== li.shinobiId)
      aL((li.shinobiName || 'Loan player') + ' returned to their village.', 'neutral')
      return false
    }
    return true
  })

  // ── Bingo Book tick ────────────────────────────────────────────────────────
  G.shinobi.forEach(s => {
    if (!s.bingoBookPresence && (s.ri >= 4 || (s.winsS || 0) >= 3)) {
      s.bingoBookPresence = 1
      aL(sn(s) + ' has been listed in the Bingo Book!', 'warn')
    }
    if (!s.bingoBookPresence) return
    if (s.bingoBookSuppressed && Math.random() < 0.14) s.bingoBookSuppressed = false
    if (!s.bingoBookSuppressed) {
      const bTier = BINGO_TIERS[Math.min(s.bingoBookPresence, BINGO_TIERS.length - 1)]
      addLegend(bTier.prestigeBonus)
      if (Math.random() < bTier.assasRisk) {
        aL('⚠ Assassination attempt on ' + sn(s) + '! (Bingo Book: ' + bTier.n + ')', 'bad')
        if (Math.random() < 0.30) {
          const injType = pickInjuryType(s.ri >= 4 ? 'S' : 'A')
          if (injType) { applyInjury(s, injType, hL); aL(sn(s) + ' was injured in the assassination attempt.', 'bad') }
        }
      }
    }
  })

  // ── Prodigy event (1% per month in rfP) — handled in rfP ────────────────
  if (G.tempDef > 0) G.tempDef = Math.max(0, G.tempDef - 5)
  if (G.examSched && G.month === G.examMonth) { aL('Chunin Exam is now! Go to Exam panel.', 'ev'); ntf('Chunin Exam!') }

  // ── Prestige tier tick ──────────────────────────────────────────────────────
  const PTIERS = [{ id:'D', min:0 }, { id:'C', min:50 }, { id:'B', min:150 }, { id:'A', min:300 }, { id:'S', min:500 }]
  const newPTier = [...PTIERS].reverse().find(t => (G.legend || 0) >= t.min)?.id || 'D'
  if (newPTier !== G.prestigeTier) {
    const was = G.prestigeTier; G.prestigeTier = newPTier
    addChronicle('Prestige Milestone', `${G.vName} has risen to Prestige Tier ${newPTier} (from ${was}). Legend: ${G.legend}.`, 'milestone')
    aL('Village prestige: Tier ' + newPTier + '!', 'good')
  }
  if (G.dynastyRecords) G.dynastyRecords.peakLegend = Math.max(G.dynastyRecords.peakLegend || 0, G.legend || 0)

  // ── Kage reputation tick ────────────────────────────────────────────────────
  if (!G.kageRep) G.kageRep = 1
  const repScore = (G.reputation || 0)
  const targetRep = repScore >= 250 ? 5 : repScore >= 150 ? 4 : repScore >= 80 ? 3 : repScore >= 30 ? 2 : 1
  if (G.kageRep < targetRep && Math.random() < 0.3) G.kageRep = Math.min(5, G.kageRep + 1)
  if (G.kageRep > targetRep && Math.random() < 0.15) G.kageRep = Math.max(1, G.kageRep - 1)

  // ── Hall of Legends — check retiring shinobi ────────────────────────────────
  if (!G.hallOfLegends) G.hallOfLegends = []
  G.shinobi.filter(s => s.status === 'retired' && !s.enshrined).forEach(s => {
    if ((s.months || 0) >= 120 && (s.wins || 0) >= 100 && (s.ri || 0) >= 3) {
      G.hallOfLegends.push({
        id: s.id, name: sn(s), ri: s.ri, months: s.months,
        wins: s.wins, winsS: s.winsS, monthEnshrined: (G.year - 1) * 12 + G.month,
      })
      s.enshrined = true
      if (G.dynastyRecords) G.dynastyRecords.enshrined = G.hallOfLegends.length
      const passiveBonus = Math.min(G.hallOfLegends.length * 200, 2000)
      G.ryo += passiveBonus
      addChronicle('Hall of Legends', `${sn(s)} has been enshrined in the Hall of Legends. ${G.hallOfLegends.length} legends total. (+${passiveBonus} ryo legacy bonus)`, 'milestone')
      aL(sn(s) + ' enshrined in Hall of Legends!', 'good')
    }
  })

  // ── Generational legacy summary (every 10 years) ────────────────────────────
  if (G.year >= 10 && G.month === 1 && G.year % 10 === 0) {
    const devScore = clamp(Math.floor(((G.upgrades?.academy || 0) + (G.upgrades?.hospital || 0) + (G.upgrades?.training || 0)) / 9 * 100), 0, 100)
    const dipScore = clamp(Math.floor(G.villages.filter(v => v.allied).length / G.villages.length * 100 + G.reputation / 10), 0, 100)
    const milScore = clamp(Math.floor(((G.dynastyRecords?.examWins || 0) * 10) + G.shinobi.filter(s => s.ri >= 4).length * 5), 0, 100)
    const legScore = clamp(Math.floor((G.hallOfLegends?.length || 0) * 10 + (G.legend || 0) / 10), 0, 100)
    const overall = Math.round((devScore + dipScore + milScore + legScore) / 4)
    const grade = overall >= 85 ? 'S' : overall >= 70 ? 'A' : overall >= 55 ? 'B' : overall >= 40 ? 'C' : 'D'
    G.generationalSummary = { year: G.year, grade, devScore, dipScore, milScore, legScore, overall }
    addChronicle('Generational Legacy — Year ' + G.year,
      `[${grade}] Development:${devScore} Diplomacy:${dipScore} Military:${milScore} Legacy:${legScore} — Overall:${overall}/100`,
      'milestone')
    aL('Year ' + G.year + ' generational report: Grade ' + grade, 'good')
  }

  // ── Intel report expiry ─────────────────────────────────────────────────────
  if (G.intelReports) {
    const now = (G.year - 1) * 12 + G.month
    G.intelReports = G.intelReports.filter(r => r.expiresMonth > now)
  }

  // ── ANBU ops tick ───────────────────────────────────────────────────────────
  if (!G.anbuOps) G.anbuOps = []
  G.anbuOps = G.anbuOps.filter(op => {
    op.monthsLeft = (op.monthsLeft || 1) - 1
    if (op.monthsLeft > 0) return true
    // Op complete
    const anbuCmd = (G.staff || []).find(st => st.role === 'anbu_commander')
    const cmdRating = anbuCmd ? (anbuCmd.stats?.stealth || 8) : 5
    const targetV = (G.villages || []).find(v => v.id === op.targetVillageId)
    const targetCi = targetV?.counterIntel || 5
    const catchChance = clamp((targetCi - cmdRating) * 0.04 + op.catchRisk, 0.05, 0.80)
    if (Math.random() < catchChance) {
      // Caught!
      const status = Math.random() < 0.4 ? 'KIA' : 'imprisoned'
      G.caughtAnbu = G.caughtAnbu || []
      G.caughtAnbu.push({ id: op.id, targetVillageId: op.targetVillageId, month: (G.year - 1) * 12 + G.month, status })
      if (targetV) targetV.rel = clamp((targetV.rel || 50) - 12, 0, 100)
      aL(`ANBU agent caught by ${targetV?.n || 'enemy'} — ${status}.`, 'bad')
      addChronicle('ANBU Incident', `Our ${op.type} operative was ${status} by ${targetV?.n || 'enemy forces'}.`, 'bad')
    } else {
      // Success — generate intel report
      const now2 = (G.year - 1) * 12 + G.month
      const reportData = {}
      if (op.type === 'recon') {
        reportData.rosterSize = rnd(5, 20); reportData.economyLevel = rnd(1, 5)
      } else if (op.type === 'deep_cover') {
        reportData.defenseRating = rnd(1, 20); reportData.activeSquads = rnd(1, 5)
      } else if (op.type === 'assn_intel') {
        reportData.kageRating = rnd(1, 20); reportData.weaknesses = pk(['chakra overuse', 'defensive gaps', 'low morale'])
      }
      G.intelReports = G.intelReports || []
      G.intelReports.push({ villageId: op.targetVillageId, type: op.type, data: reportData, expiresMonth: now2 + 3 })
      aL(`ANBU ${op.type} on ${targetV?.n || 'target'} complete.`, 'good')
    }
    return false
  })

  // ── War arc tick ────────────────────────────────────────────────────────────
  if (G.warState) {
    G.warState.monthsLeft = (G.warState.monthsLeft || 1) - 1
    const warV = (G.villages || []).find(v => v.id === G.warState.villageId)
    if (G.warState.phase === 'mobilization') {
      aL('War mobilization with ' + (warV?.n || 'enemy') + ' continues.', 'warn')
      if (G.warState.monthsLeft <= 0) { G.warState.phase = 'conflict'; G.warState.monthsLeft = 3 }
    } else if (G.warState.phase === 'conflict') {
      // Monthly combat exchange
      const myStr = G.shinobi.filter(s => s.status === 'available').length * 5 + (G.upgrades?.wall || 0) * 10
      const theirStr = rnd(20, 60)
      if (myStr >= theirStr) {
        G.reputation = clamp(G.reputation + 3, 0, 999); addLegend(2)
        aL('Combat exchange victory vs ' + (warV?.n || 'enemy') + '.', 'good')
      } else {
        G.morale = clamp(G.morale - 5, 0, 100)
        aL('Combat exchange loss vs ' + (warV?.n || 'enemy') + '.', 'bad')
      }
      if (G.warState.monthsLeft <= 0) { G.warState.phase = 'ceasefire'; G.warState.monthsLeft = 1 }
    } else if (G.warState.phase === 'ceasefire') {
      aL('Ceasefire negotiations with ' + (warV?.n || 'enemy') + '.', 'neutral')
      if (G.warState.monthsLeft <= 0) { G.warState.phase = 'reparations'; G.warState.monthsLeft = 6 }
    } else if (G.warState.phase === 'reparations') {
      const tribute = rnd(1500, 4000)
      if (warV && (warV.rel || 0) < 40) {
        G.ryo += tribute
        aL((warV?.n || 'enemy') + ' pays reparations: +' + fmt(tribute) + ' ryo.', 'good')
      }
      if (G.warState.monthsLeft <= 0) {
        addChronicle('War Ends', `Conflict with ${warV?.n || 'enemy'} resolved. Reparations phase complete.`, 'event')
        G.warState.warHistory = G.warState.warHistory || []
        G.warState.warHistory.push({ villageId: G.warState.villageId, year: G.year })
        G.warState = null
      }
    }
  }

  // ── Five Kage Summit tick (month 6 each year) ───────────────────────────────
  if (G.month === 6) {
    const prestige = G.prestigeTier || 'D'
    const presOrd = { D:0, C:1, B:2, A:3, S:4 }
    const myOrd = presOrd[prestige] || 0
    // Pick 3 random agenda items
    const SUMMIT_AGENDA = [
      { id:'trade_pact', n:'Regional Trade Pact', minVotes:3, effect:'ryo_bonus' },
      { id:'war_ban', n:'War Moratorium', minVotes:4, effect:'peace' },
      { id:'missing_bounty', n:'Missing-Nin Bounties', minVotes:2, effect:'bounty' },
      { id:'beast_protocol', n:'Tailed Beast Protocol', minVotes:3, effect:'beast_truce' },
      { id:'exam_expand', n:'Expand Chunin Exam', minVotes:3, effect:'exam_expand' },
    ]
    const items = [...SUMMIT_AGENDA].sort(() => Math.random() - 0.5).slice(0, 3)
    const results = []
    items.forEach(item => {
      const myVote = myOrd >= 2 ? 1 : (Math.random() < 0.5 ? 1 : 0)
      const npcVotes = rnd(0, 4)
      const total = myVote + npcVotes
      const passed = total >= item.minVotes
      if (passed) {
        if (item.effect === 'ryo_bonus') { G.ryo += 1500; aL('Summit: Trade Pact passed — +1,500 ryo/mo bonus.', 'good') }
        if (item.effect === 'bounty') { G.worldFlags.missingNinBounty = ((G.year - 1) * 12 + G.month) + 3 }
        if (item.effect === 'exam_expand') { G.worldFlags.examExpanded = true }
      }
      results.push({ item: item.n, passed, myVote })
    })
    G.summitHistory = G.summitHistory || []
    G.summitHistory.push({ year: G.year, results })
    addChronicle('Five Kage Summit Y' + G.year, results.map(r => `${r.item}: ${r.passed ? 'PASSED' : 'FAILED'}`).join('; '), 'event')
    aL('Five Kage Summit completed. Check chronicles for results.', 'neutral')
  }

  // ── S-rank contract rotation (month 1, 4, 7, 10) ───────────────────────────
  if ([1, 4, 7, 10].includes(G.month)) {
    const SCONTRACTS = [
      { id:'escort_kage', n:'Escort the Five Kage', baseRyo:35000, rep:50, prestige:15, risk:0.45 },
      { id:'seal_bijuu', n:'Seal a Rampaging Beast', baseRyo:40000, rep:60, prestige:20, risk:0.50 },
      { id:'fortress', n:'Destroy Enemy Fortress', baseRyo:28000, rep:40, prestige:10, risk:0.40 },
      { id:'assn_warlord', n:'Assassinate a Warlord', baseRyo:32000, rep:45, prestige:12, risk:0.48 },
      { id:'rescue_dipl', n:'Rescue Captured Diplomat', baseRyo:25000, rep:35, prestige:8, risk:0.35 },
    ]
    G.sRankContracts = [...SCONTRACTS].sort(() => Math.random() - 0.5).slice(0, 2).map(c => ({
      ...c, bids: [], deadline: (G.year - 1) * 12 + G.month + 3,
    }))
  }

  syncToServer(); rfM(); rfP()
  G.month++; if (G.month > 12) { G.month = 1; G.year++; addChronicle('New Year', 'Year ' + G.year + ' begins. Legend: ' + G.legend + '. Shinobi: ' + G.shinobi.length + '.', 'event') }
  upUI(); ntf('Month advanced → Y' + G.year + ' M' + G.month)
}

// ── Bond bonus for squad missions ────────────────────────────────────────
function _squadBondBonus(sq) {
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

export function resRaid() {
  if (!G.raid || G.raid.resolved) return
  const hL = G.upgrades.hospital
  const wD = (G.upgrades.wall === 1 ? 15 : G.upgrades.wall === 2 ? 35 : 0) + (G.upgrades.seal === 1 ? 10 : G.upgrades.seal === 2 ? 25 : 0) + (G.tempDef || 0)
  const def = G.defSh ? G.shinobi.find(s => s.id === G.defSh) : null
  const jkB = G.beasts.filter(b => b.sealed && b.jk && G.shinobi.find(s => s.id === b.jk && s.status !== 'mission')).reduce((a, b) => a + Math.round(b.pow * 0.3), 0)
  const dP = (def ? sPow(def) * 3 : 0) + wD + jkB
  if (dP >= G.raid.str) {
    G.ryo += G.raid.ryo; G.reputation = clamp(G.reputation + G.raid.rep, 0, 999); G.morale = clamp(G.morale + 5, 0, 100)
    aL(G.raid.n + ' repelled! +' + fmt(G.raid.ryo) + ' ryo.', 'good')
    if (def) { def.wins++; def.status = 'available' }
  } else {
    const loss = Math.round(G.ryo * 0.15)
    G.ryo = clamp(G.ryo - loss, 0, Infinity); G.reputation = clamp(G.reputation - G.raid.rep, 0, 999); G.morale = clamp(G.morale - 15, 0, 100)
    aL(G.raid.n + ' breached! Lost ' + fmt(loss) + ' ryo.', 'bad')
    if (def) {
      if (hL < 1 && Math.random() < 0.2) {
        G.memorial.push({ name: sn(def), rank: ['Genin','Chunin','Jonin','ANBU','S-Rank'][def.ri], clan: def.clan, mission: 'Village Defense', year: G.year, month: G.month, wins: def.wins, lastWords: '"The village... I held the line."' })
        aL(sn(def) + ' fell defending the village.', 'bad')
        G.shinobi = G.shinobi.filter(s => s.id !== def.id)
      } else {
        def.injDays = rnd(1, 3); def.status = 'injured'; def.missId = null
      }
    }
  }
  G.raid.resolved = true; G.defSh = null
}
