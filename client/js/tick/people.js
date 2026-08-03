/**
 * Morale, commitment and people management.
 *
 * The human side of the month: individual morale drift, commitment scores,
 * 1-on-1 meeting fallout, wage-structure tension and dressing-room harmony.
 *
 * Needs nothing from the tick preamble — it reads only G — which made it one
 * of the cleanest blocks left despite its size.
 *
 * Part of breaking up a single ~2,900-line adv() into per-system modules
 * (T4.1). Operates on the global G singleton and returns nothing, like its
 * siblings in this directory.
 */
import { G, clamp, sn, pk, rnd, fmt, addTrait, addRumor, addNotice, addChronicle, addLegend } from '../state.js'
import { aL, ntf } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { RANKS, RUMOR_TEMPLATES, SERVICE_AWARDS, GROUP_EVENTS, MEETING_TYPES } from '../constants.js'
import { resolvePromise, isPastDue } from '../../../shared/utils/promises.js'
import { pushNarrative } from './inbox.js'

export function tickPeople() {
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
      // Homegrown achievement — village-wide morale boost
      if (s.homegrown) {
        G.morale = clamp(G.morale + 5, 0, 100)
        aL(tr('toast.adv.homegrownPride', { name: sn(s) }), 'good')
        addNotice(sn(s) + ', raised in our own Academy, has become a Village Legend.', 'good')
      }
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
      else if (s.status === 'available' && (s.workload || 0) < 15 && s.months > 3 && Math.random() < 0.22) {
        mType = 'underused'
        // Escalation: second underuse offense in 6 months → demand transfer
        if ((s._underusedCount || 0) >= 2) { mType = 'leaving'; s.commitment = clamp(s.commitment - 20, 0, 100) }
        s._underusedCount = (s._underusedCount || 0) + 1
      }
      else if (s.months > 12 && s.ri < 4 && (s.pMatrix.ambition || 10) >= 13 && Math.random() < 0.18) mType = 'promotion'
      else if (s.squadId && (s.pMatrix.temperament || 10) < 7 && Math.random() < 0.15) mType = 'squad_clash'
      else if (s.wins > 0 && s.wins % 25 === 0 && Math.random() < 0.55) mType = 'milestone'
      if (mType) {
        G.meetingQueue.push({ id: Math.random().toString(36).slice(2), shinobiId: s.id, type: mType, month: G.month, year: G.year })
        s.meetingCooldown = 3
        aL(sn(s) + ' has requested a one-on-one meeting — check People Management!', 'ev')
        ntf(tr('toast.adv.meetingRequest', { name: sn(s) }))
      }
    }

    // ── Promises ledger — resolve this shinobi's open promises ───────────────
    G.promises = G.promises || []
    for (const pr of G.promises) {
      if (pr.status !== 'open' || pr.shinobiId !== s.id) continue
      // Promotion promise KEPT the moment their rank rises past the promised baseline.
      if (pr.type === 'promotion' && pr.riAt != null && s.ri > pr.riAt) {
        resolvePromise(G.promises, pr.id, 'kept', G.year)
        s.promotionDeadline = null
        s.commitment = clamp(s.commitment + 10, 0, 100)
        s.indMorale = clamp(s.indMorale + 8, 0, 100)
        aL(tr('toast.adv.promiseKeptPromo', { name: sn(s) }), 'good')
      }
      // Deployment guarantee reviewed at its due date: kept unless breaches piled up.
      if (pr.type === 'deployment' && isPastDue(pr, G.year, G.month)) {
        const broken = (s._rgBreaches || 0) >= 5
        resolvePromise(G.promises, pr.id, broken ? 'broken' : 'kept', G.year)
        if (broken) {
          s.roleGuarantee = false
          s.commitment = clamp(s.commitment - 12, 0, 100)
          s.indMorale = clamp(s.indMorale - 8, 0, 100)
          aL(tr('toast.adv.promiseBrokenRole', { name: sn(s) }), 'bad')
          addNotice(sn(s) + ' was promised regular deployment and spent the year on the bench.', 'bad')
        } else {
          s.commitment = clamp(s.commitment + 5, 0, 100)
          aL(tr('toast.adv.promiseKeptRole', { name: sn(s) }), 'good')
        }
        s._rgBreaches = 0
      }
    }

    // Promotion deadline missed — personality evolution: feeling overlooked breeds resentment
    if (s.promotionDeadline && G.month >= s.promotionDeadline && G.year >= (s.promotionDeadlineYear || G.year)) {
      s.commitment = clamp(s.commitment - 15, 0, 100)
      s.indMorale = clamp(s.indMorale - 10, 0, 100)
      s.promotionDeadline = null
      const _brk = (G.promises || []).find(p => p.status === 'open' && p.shinobiId === s.id && p.type === 'promotion')
      if (_brk) resolvePromise(G.promises, _brk.id, 'broken', G.year)
      aL(sn(s) + '\'s promised promotion deadline passed — they are deeply disappointed.', 'bad')
      if (addTrait(s, 'Resentful')) {
        aL(sn(s) + ' has grown Resentful after being passed over.', 'warn')
        addNotice(sn(s) + ' feels overlooked by village leadership.', 'bad')
      }
    }

    // Role guarantee breach — counted toward the ledger's due-date review
    if (s.roleGuarantee && s.status === 'available' && (s.workload || 0) < 10 && s.months > 1) {
      s.commitment = clamp(s.commitment - 3, 0, 100)
      s.indMorale = clamp(s.indMorale - 4, 0, 100)
      s._rgBreaches = (s._rgBreaches || 0) + 1
    }

    // Transfer-listed fallout: awkward presence in training while unsold
    if (s.transferListed) {
      s.transferListedMonths = (s.transferListedMonths || 0) + 1
      s.indMorale = clamp(s.indMorale - 2, 0, 100)
      if (s.transferListedMonths === 1 || s.transferListedMonths % 3 === 0) {
        aL(sn(s) + ' remains an awkward presence in training, still listed for transfer.', 'warn')
        addNotice('Other shinobi have noticed ' + sn(s) + ' is still around despite requesting a transfer.', 'warn')
      }
    }

    // Rumor system: sustained low commitment surfaces rumors (early warning system)
    if (s.commitment < 35) {
      s.lowCommitMonths = (s.lowCommitMonths || 0) + 1
      const hasActiveRumor = G.rumors.some(r => r.shinobiId === s.id && !r.resolved)
      if (s.lowCommitMonths >= 2 && !hasActiveRumor && Math.random() < 0.25) {
        addRumor(s, pk(RUMOR_TEMPLATES))
        ntf(tr('toast.adv.rumorCirculating', { name: sn(s) }))
      }
    } else {
      s.lowCommitMonths = 0
    }

    // Transfer at zero commitment (loyalty check)
    if (s.commitment <= 0 && !s.legendStatus) {
      const loyRoll = s.pMatrix.loyalty || 10
      if (loyRoll < 10 && Math.random() < 0.40) {
        aL(sn(s) + ' has submitted a transfer request and left the village!', 'bad')
        G._kiaThisMonth = (G._kiaThisMonth || 0) + 1; G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, year: G.year, month: G.month, wins: s.wins, lastWords: 'Submitted a transfer request.', transfer: true })
        addChronicle('Transfer Departure', sn(s) + ' left the village after losing all commitment.', 'event')
        addNotice(sn(s) + ' has left the village for good.', 'bad')
        G.morale = clamp(G.morale - 4, 0, 100)
        G.shinobi = G.shinobi.filter(x => x.id !== s.id)
      }
    }
  })

}
