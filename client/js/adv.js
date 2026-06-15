import { G, ui, sPow, sqP, sn, rnd, pk, clamp, fmt, rfM, rfP, KAGE_EVENTS } from './state.js'
import { RAID_POOL } from './constants.js'
import { aL, ntf, upUI, schEx } from './ui.js'
import { syncToServer } from './socket.js'
import { pickNarrative, pickSquadNarrative, pickRankUpNarrative } from './narratives.js'
import { sqSynergy, SQUAD_IDENTITIES } from './synergy.js'

export function adv() {
  const tgM = G.upgrades.training === 1 ? 2 : G.upgrades.training === 2 ? 3 : 1
  const iB = G.upgrades.intel === 1 ? 0.05 : G.upgrades.intel === 2 ? 0.10 : 0
  const hL = G.upgrades.hospital

  G.shinobi.forEach(s => {
    s.months++
    if (s.months % 12 === 0) { s.age++; if (s.age > 62 && Math.random() < 0.12) { aL(sn(s) + ' retired.', 'neutral'); s.status = 'retired' } }
    if (s.status === 'injured') { s.injDays = Math.max(0, s.injDays - 1); if (s.injDays === 0) { s.status = 'available'; aL(sn(s) + ' recovered.', 'good') } }
    if (s.status === 'available') {
      if (Math.random() < 0.25 * tgM) {
        const k = pk(['ninjutsu', 'taijutsu', 'genjutsu', 'chakra', 'intelligence', 'speed']), kG = k === 'intelligence' && s.pers.n === 'Bookworm' ? 2 : 1
        if (sPow(s) < s.potential) s.stats[k] = clamp(s.stats[k] + rnd(1, kG * 2), 0, 99)
      }
      if (s.pers.n === 'Ambitious' && Math.random() < 0.15) { const k = pk(['ninjutsu', 'taijutsu', 'genjutsu', 'chakra', 'intelligence', 'speed']); s.stats[k] = clamp(s.stats[k] + 1, 0, 99) }
    }
    const pw = sPow(s), thresh = [0, 30, 55, 78, 90]
    if (s.ri < 4 && pw >= thresh[s.ri + 1] && s.months >= (s.ri + 1) * 12 && s.status === 'available') {
      s.ri++; s.salary = 500 + s.ri * 400
      const newRankName = ['Genin','Chunin','Jonin','ANBU','S-Rank'][s.ri]
      aL(sn(s) + ' promoted to ' + newRankName + '! ' + pickRankUpNarrative(sn(s), newRankName), 'good')
    }
  })
  G.shinobi = G.shinobi.filter(s => s.status !== 'retired')

  // Prospect aging — stat decay after 4 months, departure after 8
  G.prospects = G.prospects.filter(p => {
    if ((p.monthsWaiting || 0) >= 8) { aL(sn(p) + ' lost patience and left the academy.', 'neutral'); return false }
    if ((p.monthsWaiting || 0) >= 4 && Math.random() < 0.25) {
      const k = pk(['ninjutsu', 'taijutsu', 'genjutsu', 'chakra', 'intelligence', 'speed'])
      p.stats[k] = Math.max(5, p.stats[k] - 1)
    }
    return true
  })

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
        aL('Intel on ' + sn(prospect) + ' confirmed — Potential: ' + prospect.potential + (degraded ? ' ⚠ degraded by ' + (waited - 5) + ' months of inaction.' : '.'), degraded ? 'warn' : 'good')
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
      if (ok) { b.sealed = true; aL(b.n + ' captured! Assign a Jinchuriki.', 'good'); ntf(b.n + ' sealed!') }
      else { aL(sn(s) + ' failed to capture ' + b.n + '.', 'bad'); if (Math.random() < 0.3) { s.injDays = rnd(1, 3); s.status = 'injured' } }
      return
    }
    const m = G.avM.find(x => x.id === am.missionId); if (!m) return
    if (am.isSquad) {
      const sq = G.squads.find(q => q.id === am.squadId); if (!sq) return
      const syn = sqSynergy(sq, G.shinobi)
      const rawPw = sqP(sq) + (G.shinobi.find(s => s.id === sq.leaderId)?.pers.n === 'Charismatic' ? 5 : 0)
      const pw = Math.round(rawPw * syn.powerMult)
      const sc = clamp(1 - m.risk + (pw - m.mp) * 0.005 + iB + syn.successMod, 0.1, 0.97)
      if (Math.random() < sc) {
        G.ryo += m.ryo; G.reputation = clamp(G.reputation + m.rep, 0, 999); G.morale = clamp(G.morale + 3, 0, 100)
        const prevCohesion = sq.cohesion ?? 0
        sq.cohesion = Math.min(100, prevCohesion + rnd(3, 7))
        sq.members.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) { s.status = 'available'; s.missId = null; s.wins++ } })
        aL(sq.n + ' completed "' + m.n + '" — +' + fmt(m.ryo) + ' ryo. ' + pickSquadNarrative(m.rk, 'success', sq.n), 'good')
        // Squad identity unlock at cohesion 75
        if (sq.cohesion >= 75 && !sq.identity) {
          const taken = G.squads.filter(q => q.identity).map(q => q.identity.title)
          const available = SQUAD_IDENTITIES.filter(i => !taken.includes(i.title))
          if (available.length) {
            sq.identity = available[Math.floor(Math.random() * available.length)]
            aL(sq.n + ' has forged an unbreakable bond — now known as "' + sq.identity.title + '"!', 'good')
            ntf(sq.n + ': ' + sq.identity.title)
          }
        }
      } else {
        const hasPr = sq.members.some(id => G.shinobi.find(s => s.id === id)?.pers.n === 'Protective')
        const kR = hL >= 2 ? 0.02 : hL >= 1 ? 0.04 : 0.08
        let hadKIA = false
        sq.members.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (!s) return; if (!hasPr && Math.random() < kR) { aL(sn(s) + ' KIA.', 'bad'); G.shinobi = G.shinobi.filter(x => x.id !== s.id); hadKIA = true } else { s.injDays = Math.max(1, rnd(1, 3) - hL); s.status = 'injured'; s.missId = null } })
        sq.cohesion = Math.max(0, (sq.cohesion ?? 0) + (hadKIA ? -15 : -4))
        aL('"' + m.n + '" squad mission failed. ' + pickSquadNarrative(m.rk, 'failure', sq.n), 'bad'); G.morale = clamp(G.morale - 5, 0, 100)
      }
    } else {
      const s = G.shinobi.find(x => x.id === am.assignedTo); if (!s) return
      const pw = sPow(s), rM = s.pers.effect.riskMod || 0, sM = pw < m.mp ? (s.pers.effect.sucMod || 0) : 0, sB = s.pers.effect.soloBonus || 0
      const sc = clamp(1 - m.risk - rM + (pw - m.mp) * 0.01 + iB + sM + sB, 0.08, 0.97)
      const rB = ['A', 'S'].includes(m.rk) && s.pers.n === 'Honorable' ? 2 : 0
      if (Math.random() < sc) {
        G.ryo += m.ryo; G.reputation = clamp(G.reputation + m.rep + rB, 0, 999); G.morale = clamp(G.morale + 2, 0, 100)
        s.status = 'available'; s.missId = null; s.wins++
        aL(sn(s) + ' completed "' + m.n + '" — +' + fmt(m.ryo) + ' ryo. ' + pickNarrative(m.rk, 'success', sn(s), s.pers.n), 'good')
      } else {
        const kR = hL >= 2 ? 0.02 : hL >= 1 ? 0.04 : 0.08
        if (Math.random() < kR) { aL(sn(s) + ' KIA on "' + m.n + '". ' + pickNarrative(m.rk, 'failure', sn(s), s.pers.n), 'bad'); G.shinobi = G.shinobi.filter(x => x.id !== s.id); G.reputation = clamp(G.reputation - 5, 0, 999) }
        else { s.injDays = Math.max(1, rnd(1, 3) - hL - (s.pers.effect.injReduct || 0)); s.status = 'injured'; s.missId = null; aL('"' + m.n + '" failed — ' + sn(s) + ' injured ' + s.injDays + 'm. ' + pickNarrative(m.rk, 'failure', sn(s), s.pers.n), 'bad') }
        G.morale = clamp(G.morale - 3, 0, 100)
      }
    }
  })
  G.aM = G.aM.filter(am => am.daysLeft > 0)

  if (G.raid && !G.raid.resolved) { if (G.raidW <= 0) resRaid(); else G.raidW-- }
  if (!G.raid && Math.random() < 0.12) {
    const ev = pk(RAID_POOL), warn = G.upgrades.intel >= 2 ? 2 : G.upgrades.intel >= 1 ? 1 : 0
    G.raid = { ...ev, resolved: false }; G.raidW = warn
    aL('⚠ Threat: ' + ev.n + '! ' + (warn > 0 ? 'Arrives in ' + warn + 'm.' : 'Arriving now!'), 'warn')
    if (warn === 0) resRaid()
  }

  const trI = G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0) + G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0)
  const jkI = G.beasts.filter(b => b.sealed && b.n === 'Matatabi' && b.jk).length * 3000
  G.ryo += trI + jkI
  const sal = G.shinobi.reduce((a, s) => a + s.salary, 0); G.ryo -= sal
  if (G.ryo < 0) { aL('Treasury empty! Morale suffers.', 'bad'); G.morale = clamp(G.morale - 8, 0, 100) }

  if (Math.random() < 0.10) { const v = pk(G.villages), d = rnd(-7, 7); v.rel = clamp(v.rel + d, 0, 100); if (Math.abs(d) > 4) aL('Diplomatic shift: ' + v.n + ' ' + (d > 0 ? '+' : '') + d + '.', 'neutral') }

  G.keCD = (G.keCD || 0) - 1
  if (!ui.pKE && G.keCD <= 0 && Math.random() < 0.25) {
    const ev = G.keQ.shift()
    if (ev) { ui.pKE = ev; G.keCD = rnd(4, 7); aL('Kage Event: "' + ev.n + '" — check Kage Council!', 'ev'); ntf('New Kage event!') }
    if (!G.keQ.length) G.keQ = [...KAGE_EVENTS].sort(() => Math.random() - 0.5)
  }

  if (G.tempDef > 0) G.tempDef = Math.max(0, G.tempDef - 5)
  if (G.examSched && G.month === G.examMonth) { aL('Chunin Exam is now! Go to Exam panel.', 'ev'); ntf('Chunin Exam!') }

  syncToServer(); rfM(); rfP()
  G.month++; if (G.month > 12) { G.month = 1; G.year++ }
  upUI(); ntf('Month advanced → Y' + G.year + ' M' + G.month)
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
      if (hL < 1 && Math.random() < 0.2) { aL(sn(def) + ' fell defending.', 'bad'); G.shinobi = G.shinobi.filter(s => s.id !== def.id) }
      else { def.injDays = rnd(1, 3); def.status = 'injured'; def.missId = null }
    }
  }
  G.raid.resolved = true; G.defSh = null
}
