/**
 * Staff slice of the monthly tick, extracted from adv.js.
 *
 * Part of breaking up a single ~2,900-line adv() into per-system modules
 * (T4.1). Same architecture as tick/rivals.js and tick/offSeason.js: operates
 * on the global G singleton, returns nothing.
 *
 * Covers the coaching staff's own month: experience and levelling, contract
 * churn, the mentorship pairings between shinobi, and the depth-chart politics
 * around the senseis — head-vs-team clashes, and rivals poaching anyone who
 * has become good enough to be worth taking.
 *
 * Takes no context: every value it needs is read from G.
 */
import { G, clamp, sn, pk, rnd, addChronicle, addNotice, addLegend } from '../state.js'
import { addMemory } from '../../../shared/utils/memorySystem.js'
import { aL, ntf } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { STAFF_ROLES, MEETING_TYPES } from '../constants.js'
import { addStaffXp, staffTitle } from '../../../shared/utils/staffDev.js'
import { tickMentorships } from '../../../shared/utils/mentorship.js'
import { pushNarrative } from './inbox.js'

export function tickStaff() {
  // ── Staff tick ────────────────────────────────────────────────────────────
  if (!G.staff) G.staff = [];
  (G.staff || []).forEach(st => {
    st.monthsServed = (st.monthsServed || 0) + 1
    // R26: on-the-job experience — level up toward mastery, sharpening their craft.
    const _xpRes = addStaffXp(st, 4 + (st.asstKage ? 2 : 0))
    if (_xpRes.leveledUp) {
      const _r = STAFF_ROLES.find(r => r.id === st.role)
      if (_r && _r.stats[0]) st.stats[_r.stats[0]] = clamp((st.stats[_r.stats[0]] || 10) + 1, 1, 20)
      aL(`${st.fn} ${st.ln} reached ${staffTitle(st.staffLevel)} (staff level ${st.staffLevel}).`, 'good')
    }
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
      // Staff Hall of Fame — 8+ years (96 months) earns a legacy entry
      if (st.monthsServed >= 96) {
        if (!G.staffHallOfFame) G.staffHallOfFame = []
        G.staffHallOfFame.push({
          fn: st.fn, ln: st.ln, role: st.role,
          yearsServed: Math.floor(st.monthsServed / 12),
          peakRating: st.rating, year: G.year,
          fromShinobi: st.fromShinobi || null,
        })
        aL(st.fn + ' ' + st.ln + ' is inducted into the Staff Hall of Fame after ' + Math.floor(st.monthsServed / 12) + ' years of service.', 'good')
        addChronicle('Staff Hall of Fame', st.fn + ' ' + st.ln + ' inducted — ' + Math.floor(st.monthsServed / 12) + ' years, peak rating ' + st.rating + '.', 'milestone')
        addLegend(5)
      }
      G.staff = G.staff.filter(x => x.id !== st.id)
    }
  })

  // ── Mentorship tick ───────────────────────────────────────────────────────
  if (!G.mentorships) G.mentorships = []
  const _mentorEvents = tickMentorships(G.mentorships, G.shinobi, { year: G.year, month: G.month })
  for (const ev of _mentorEvents) {
    const actorIds = [ev.mentorId, ev.studentId].filter(Boolean)
    if (ev.type === 'bond_memory') {
      addMemory(G.shinobi.find(s => s.id === ev.mentorId), 'mentor_bond', 'mentorship', { year: G.year, month: G.month })
      addMemory(G.shinobi.find(s => s.id === ev.studentId), 'mentor_bond', 'mentorship', { year: G.year, month: G.month })
      pushNarrative({ title: `Mentorship: ${ev.mentorName} & ${ev.studentName}`, body: ev.detail, tag: 'bond', link: 'roster' }, actorIds)
    } else if (ev.type === 'graduation') {
      addMemory(G.shinobi.find(s => s.id === ev.mentorId), 'mentor_bond', 'mentorship', { year: G.year, month: G.month }, 0.65)
      pushNarrative({ title: `Mentorship Complete: ${ev.studentName}`, body: ev.detail, tag: 'promotion', link: 'roster' }, actorIds)
      aL(ev.detail, 'good')
    } else {
      pushNarrative({ title: `Mentorship: ${ev.mentorName} & ${ev.studentName}`, body: ev.detail, tag: 'bond', link: 'roster' }, actorIds)
    }
  }

  // ── Staff depth tick ──────────────────────────────────────────────────────
  if (!G.staffHallOfFame) G.staffHallOfFame = []
  if (!G.asstKageLog) G.asstKageLog = []

  // Career path: Team Sensei with high ambition wants Head Sensei promotion
  const teamSenseis = (G.staff || []).filter(st => st.role === 'team_sensei')
  const headSensei = (G.staff || []).find(st => st.role === 'head_sensei')
  teamSenseis.forEach(ts => {
    ts.careerPathMonths = (ts.careerPathMonths || 0) + 1
    if (!ts.ambition) ts.ambition = rnd(8, 14)
    // High-ambition sensei: after 18 months push for head sensei slot
    if (ts.ambition >= 14 && ts.careerPathMonths >= 18) {
      if (!headSensei) {
        // Slot open — surface a meeting request
        if (!(G.meetingQueue || []).find(m => m.staffId === ts.id && m.type === 'staff_promo_request')) {
          if (!G.meetingQueue) G.meetingQueue = []
          G.meetingQueue.push({ id: Math.random().toString(36).slice(2), staffId: ts.id, type: 'staff_promo_request', month: G.month, year: G.year, n: ts.fn + ' ' + ts.ln, role: ts.role })
          aL(ts.fn + ' ' + ts.ln + ' is ready for a Head Sensei role — check People Management.', 'warn')
          ntf(ts.fn + ' wants a promotion!')
        }
      } else if (Math.random() < 0.04) {
        // Slot taken and ambition unmet — they look elsewhere
        aL(ts.fn + ' ' + ts.ln + ' resigned — their ambition could not be satisfied here.', 'bad')
        addChronicle('Staff Resignation', ts.fn + ' ' + ts.ln + ' (Team Sensei) left to seek advancement at another village.', 'staff')
        addNotice(ts.fn + ' ' + ts.ln + ' has resigned in search of a head sensei position elsewhere.', 'bad')
        G.staff = G.staff.filter(x => x.id !== ts.id)
      }
    }
  })

  // Staff conflict: Head Sensei vs Team Sensei clash after 6+ months
  if (!G.staffConflict && headSensei && teamSenseis.length > 0) {
    const clashCandidate = teamSenseis.find(ts => {
      const hsDisc = headSensei.stats?.discipline || 0
      const tsEmp = ts.stats?.empathy || 0
      const bothLong = (ts.monthsServed || 0) >= 6 && (headSensei.monthsServed || 0) >= 6
      return bothLong && hsDisc >= 14 && tsEmp >= 14 && Math.random() < 0.03
    }) || (teamSenseis.some(ts => (ts.monthsServed || 0) >= 6) && Math.random() < 0.01
      ? teamSenseis.find(ts => (ts.monthsServed || 0) >= 6) : null)
    if (clashCandidate) {
      G.staffConflict = { headSenseiId: headSensei.id, teamSenseiId: clashCandidate.id, month: G.month, year: G.year }
      aL(tr('toast.adv.staffConflict', { a: `${headSensei.fn} ${headSensei.ln}`, b: `${clashCandidate.fn} ${clashCandidate.ln}` }), 'warn')
      ntf(tr('toast.adv.staffConflictShort'))
      addNotice('A conflict between your Head Sensei and a Team Sensei has escalated. Mediation needed.', 'warn')
    }
  }

  // Staff poaching by rival villages
  if (!G.staffPoachOffer) {
    const poachTargets = (G.staff || []).filter(st => st.rating >= 14 && !st.asstKage)
    if (poachTargets.length > 0 && Math.random() < 0.04) {
      const target = poachTargets.sort((a, b) => b.rating - a.rating)[0]
      const poachVillage = (pk(G.villages || []) || {}).n || 'a rival village'
      const matchCost = Math.round(target.salary * rnd(12, 18))
      const expMonth = G.month === 12 ? 1 : G.month + 1
      const expYear = G.month === 12 ? G.year + 1 : G.year
      G.staffPoachOffer = { staffId: target.id, staffName: target.fn + ' ' + target.ln, village: poachVillage, matchCost, expiresMonth: expMonth, expiresYear: expYear }
      aL(tr('toast.adv.staffPoach', { village: poachVillage, name: `${target.fn} ${target.ln}` }), 'warn')
      ntf(tr('toast.adv.staffPoachShort'))
      addNotice(target.fn + ' ' + target.ln + ' has received an offer from ' + poachVillage + '. Your response is required.', 'warn')
    }
  }
  // Expire poach offer
  if (G.staffPoachOffer) {
    const offer = G.staffPoachOffer
    const expired = G.year > offer.expiresYear || (G.year === offer.expiresYear && G.month >= offer.expiresMonth)
    if (expired) {
      // Staff leaves automatically when offer expires with no response
      const st = (G.staff || []).find(x => x.id === offer.staffId)
      if (st) {
        aL(offer.staffName + ' accepted ' + offer.village + '\'s offer — they are gone.', 'bad')
        G.staff = G.staff.filter(x => x.id !== offer.staffId)
        addChronicle('Staff Poached', offer.staffName + ' was recruited away by ' + offer.village + '.', 'staff')
      }
      G.staffPoachOffer = null
    }
  }

  // Assistant Warden autonomous meeting handling
  const asstKage = (G.staff || []).find(st => st.asstKage)
  if (asstKage && Math.random() < 0.18) {
    const minorMtg = (G.meetingQueue || []).find(m => {
      const def = MEETING_TYPES.find(t => t.id === m.type)
      return def && def.urgency === 'low' && !m.staffId  // not a staff request
    })
    if (minorMtg) {
      const s = G.shinobi.find(x => x.id === minorMtg.shinobiId)
      if (s) {
        const discipline = asstKage.stats?.discipline || 0
        const empathy = asstKage.stats?.empathy || 0
        const isFirm = discipline > empathy
        s.indMorale = clamp((s.indMorale || 70) + (isFirm ? -2 : 5), 0, 100)
        s.commitment = clamp((s.commitment || 70) + (isFirm ? -1 : 3), 0, 100)
        G.meetingQueue = G.meetingQueue.filter(m => m.id !== minorMtg.id)
        const logText = asstKage.fn + ' ' + asstKage.ln + ' handled ' + sn(s) + '\'s request ' + (isFirm ? 'firmly — direct and uncompromising.' : 'supportively — warmth and reassurance.')
        G.asstKageLog.unshift({ year: G.year, month: G.month, text: logText, shinobiName: sn(s) })
        if (G.asstKageLog.length > 25) G.asstKageLog.pop()
        aL(tr('toast.adv.akLog', { text: logText }), 'neutral')
      }
    }
  }
}
