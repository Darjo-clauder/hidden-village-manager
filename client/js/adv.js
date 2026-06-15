import { G, ui, sPow, sqP, sn, rnd, pk, clamp, fmt, rfM, rfP, KAGE_EVENTS, addChronicle, addLegend } from './state.js'
import { RAID_POOL, MONTHS, JUTSU_LIST, WORLD_CHOICE_EVENTS } from './constants.js'
import { aL, ntf, upUI, schEx } from './ui.js'
import { syncToServer } from './socket.js'
import { pickNarrative, pickSquadNarrative, pickRankUpNarrative, DARK_MOMENT_POOL, LAST_WORDS_POOL } from './narratives.js'
import { sqSynergy, SQUAD_IDENTITIES } from './synergy.js'

function currentSeason() { return MONTHS[G.month - 1]?.season || 'Spring' }

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

export function adv() {
  const tgM = G.upgrades.training === 1 ? 2 : G.upgrades.training === 2 ? 3 : 1
  const iB = G.upgrades.intel === 1 ? 0.05 : G.upgrades.intel === 2 ? 0.10 : 0
  const hL = G.upgrades.hospital
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

    if (s.status === 'injured') {
      s.injDays = Math.max(0, s.injDays - 1)
      if (s.injDays === 0) { s.status = 'available'; aL(sn(s) + ' recovered.', 'good') }
    }
    if (s.status === 'available') {
      // Stat growth — sensei bonus applies to prospects but we handle that in prospect section
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
      const sc = clamp(1 - m.risk + (pw - m.mp) * 0.005 + iB + syn.successMod + bondBonus, 0.1, 0.97)

      if (Math.random() < sc) {
        G.ryo += m.ryo; G.reputation = clamp(G.reputation + m.rep, 0, 999); G.morale = clamp(G.morale + 3, 0, 100)
        const prevCohesion = sq.cohesion ?? 0
        sq.cohesion = Math.min(100, prevCohesion + rnd(3, 7))
        sq.wins++
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          s.status = 'available'; s.missId = null; s.wins++; s.streak = (s.streak || 0) + 1
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
        sq.members.forEach(id => {
          const s = G.shinobi.find(x => x.id === id); if (!s) return
          s.streak = 0 // reset streak on failure
          if (!hasPr && Math.random() < kR) {
            const lastWords = pk(LAST_WORDS_POOL)
            aL(sn(s) + ' KIA on "' + m.n + '". ' + lastWords, 'bad')
            sq.fallen.push({ name: sn(s), rank: ['Genin','Chunin','Jonin','ANBU','S-Rank'][s.ri], mission: m.n, year: G.year, month: G.month })
            if (s.wins >= 50) { addChronicle('Fallen Veteran', sn(s) + ' died on "' + m.n + '" after ' + s.wins + ' missions.', 'shinobi'); addLegend(10) }
            G.memorial.push({ name: sn(s), rank: ['Genin','Chunin','Jonin','ANBU','S-Rank'][s.ri], clan: s.clan, mission: m.n, year: G.year, month: G.month, wins: s.wins, lastWords })
            G.shinobi = G.shinobi.filter(x => x.id !== s.id)
            hadKIA = true; sq.kills++
          } else {
            s.injDays = Math.max(1, rnd(1, 3) - hL); s.status = 'injured'; s.missId = null
          }
        })
        sq.cohesion = Math.max(0, (sq.cohesion ?? 0) + (hadKIA ? -15 : -4))
        sq.losses++
        aL('"' + m.n + '" squad mission failed. ' + pickSquadNarrative(m.rk, 'failure', sq.n), 'bad')
        G.morale = clamp(G.morale - 5, 0, 100)
      }
    } else {
      const s = G.shinobi.find(x => x.id === am.assignedTo); if (!s) return
      const pw = sPow(s), rM = s.pers.effect.riskMod || 0, sM = pw < m.mp ? (s.pers.effect.sucMod || 0) : 0, sB = s.pers.effect.soloBonus || 0
      const sc = clamp(1 - m.risk - rM + (pw - m.mp) * 0.01 + iB + sM + sB, 0.08, 0.97)
      const rB = ['A','S'].includes(m.rk) && s.pers.n === 'Honorable' ? 2 : 0

      if (Math.random() < sc) {
        G.ryo += m.ryo; G.reputation = clamp(G.reputation + m.rep + rB, 0, 999); G.morale = clamp(G.morale + 2, 0, 100)
        s.status = 'available'; s.missId = null; s.wins++; s.streak = (s.streak || 0) + 1
        if (m.rk === 'B' || m.rk === 'C') s.winsB = (s.winsB || 0) + 1
        if (m.rk === 'S') { s.winsS = (s.winsS || 0) + 1 }
        checkJutsu(s)
        aL(sn(s) + ' completed "' + m.n + '" — +' + fmt(m.ryo) + ' ryo. ' + pickNarrative(m.rk, 'success', sn(s), s.pers.n, { wins: s.wins, streak: s.streak, season }), 'good')
        addLegend(m.rk === 'S' ? 12 : m.rk === 'A' ? 6 : m.rk === 'B' ? 2 : 1)
        if (m.rk === 'S') addChronicle('S-Rank Completed', sn(s) + ' completed the S-rank mission "' + m.n + '".', 'legend')
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
          // Failed S-rank triggers a dark moment
          if (m.rk === 'S' && !s.darkMoment) {
            s.darkMoment = pk(DARK_MOMENT_POOL)
            aL(sn(s) + ' failed the S-rank and carries something new. "' + s.darkMoment + '"', 'warn')
          }
          s.injDays = Math.max(1, rnd(1, 3) - hL - (s.pers.effect.injReduct || 0)); s.status = 'injured'; s.missId = null
          aL('"' + m.n + '" failed — ' + sn(s) + ' injured ' + s.injDays + 'm. ' + pickNarrative(m.rk, 'failure', sn(s), s.pers.n, { wins: s.wins, streak: s.streak, season }), 'bad')
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

  // ── Economy ──────────────────────────────────────────────────────────────
  const trI = G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0) + G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0)
  const jkI = G.beasts.filter(b => b.sealed && b.n === 'Matatabi' && b.jk).length * 3000
  G.ryo += trI + jkI
  const sal = G.shinobi.reduce((a, s) => a + s.salary, 0); G.ryo -= sal
  if (G.ryo < 0) { aL('Treasury empty! Morale suffers.', 'bad'); G.morale = clamp(G.morale - 8, 0, 100) }

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

  // ── Prodigy event (1% per month in rfP) — handled in rfP ────────────────
  if (G.tempDef > 0) G.tempDef = Math.max(0, G.tempDef - 5)
  if (G.examSched && G.month === G.examMonth) { aL('Chunin Exam is now! Go to Exam panel.', 'ev'); ntf('Chunin Exam!') }

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
