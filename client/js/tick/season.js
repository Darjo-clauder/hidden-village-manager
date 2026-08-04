/**
 * The regular-season league table — the spine that seeds the exam.
 *
 * Plays the month's matchday, updates the table, and records form. Reads
 * `season` from the tick preamble; everything else is on G.
 *
 * Note the name collision: the ctx value is the SEASON OF THE YEAR (Spring,
 * Summer…), not the league season. Kept as-is to match adv.js rather than
 * renamed, so the extracted text stays byte-comparable with its original.
 *
 * Part of breaking up a single ~2,900-line adv() into per-system modules
 * (T4.1). Operates on the global G singleton and returns nothing, like its
 * siblings in this directory.
 */
import { G, clamp, sn, pk, rnd, fmt, addNotice, addChronicle, addLegend } from '../state.js'
import { aL, ntf } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { addNewsItem } from '../news.js'
import { initSeasonTable, playMatchday, seasonPressNotice, playerFixture, sortedTable, simMatch, styledScore, MATCHDAYS_PER_MONTH, SEASON_ROUNDS } from '../../../shared/utils/season.js'
import { identityFor } from '../../../shared/constants/villageIdentity.js'
import { tacticMod } from '../../../shared/constants/matchdayTactics.js'
import { updateH2H, pickDerbyRival } from '../../../shared/utils/rivalry.js'
import { vendettaBonus, vendettaCarriers, settleOneDeath, vengeanceBeat, unsettledCount } from '../../../shared/utils/legacyMemory.js'
import { addMemory } from '../../../shared/utils/memorySystem.js'
import { pushNarrative } from './inbox.js'
import { queuePressConference } from './missionHelpers.js'

export function tickSeason(ctx) {
  const { season } = ctx
  // ── Season league table — the regular-season spine that seeds the exam ────
  {
    const playerName = G.vName
    // Deduplicated, because the league table is keyed by name. A duplicate would
    // make the size check below fail forever and rebuild the season every tick,
    // freezing the standings for the whole run. setup.js prevents the collision
    // at its source; this keeps a save that already has one from staying broken.
    const names = [...new Set([playerName, ...G.villages.map(v => v.n)])]
    if (!G.season || !G.season.table || Object.keys(G.season.table).length !== names.length) {
      G.season = { year: G.year, round: 0, table: initSeasonTable(names), lastResults: [] }
    }
    // ── Roll the league year over with the calendar year ────────────────────
    // The season used to be reset ONLY by the Adept Exam's completion handler,
    // which is a player action — skip the exam and the table simply accumulated
    // forever. That was survivable while `round` climbed without limit
    // (roundPairings wraps), but a 22-round season has an END, so without this
    // the league would play eleven months and then stop for good. A league year
    // ends when the year does.
    if (G.season.year !== G.year) {
      G.seasonHistory = G.seasonHistory || []
      if (!G.seasonHistory.some(h => h.year === G.season.year)) {
        const final = sortedTable(G.season.table)
        G.seasonHistory.push({ year: G.season.year, champion: final[0]?.name || null, table: final })
        if (G.seasonHistory.length > 12) G.seasonHistory.shift()
      }
      G.season = { year: G.year, round: 0, table: initSeasonTable(names), lastResults: [] }
      G.matchdayTactics = {}          // picks are per-round; a new season renumbers them
    }
    // Real mission form feeds the player's matchday — a good month on missions
    // makes you likelier to win your league fixture (±2 effective strength per net phase-margin).
    const form = G._formThisMonth || { marginSum: 0 }
    const formBonus = clamp(form.marginSum * 2, -20, 20)
    G._seasonFormBonus = formBonus  // surfaced in UI
    // Matchday styles: rivals play to their village identity; the player's style
    // follows their coaching philosophy (aggressive→blitz, defensive→fortress).
    const _philStyle = { aggressive: 'blitz', defensive: 'fortress' }[G.coachingPhilosophy] || 'balanced'
    const styleOf = name => name === playerName ? _philStyle : identityFor(name).style

    // ── Derby designation — named each January, before the month's fixtures ──
    if (G.month === 1 || !G.derbyRival) {
      const dv = pickDerbyRival(G.villages, G.derbyRival)
      if (dv && dv.n !== G.derbyRival) {
        G.derbyRival = dv.n
        aL(tr('toast.adv.derbyNamed', { ico: dv.ico, village: dv.n }), 'ev')
        addNotice(`${dv.ico} ${dv.n} named this year's derby rival — those fixtures now carry the village's pride.`, 'warn')
      } else if (dv) G.derbyRival = dv.n
    }
    G.h2h = G.h2h || {}
    G.matchdayTactics = G.matchdayTactics || {}

    // ── The month's matchdays ────────────────────────────────────────────────
    // Two fixtures a month, each resolved against its own opponent with its own
    // tactic pick. The pick is per-ROUND (G.matchdayTactics[round]) rather than a
    // persisted default, so matchday is a read of the fixture in front of you; an
    // unset round simply plays Standard, which carries no swing either way.
    for (let md = 0; md < MATCHDAYS_PER_MONTH && G.season.round < SEASON_ROUNDS; md++) {
      const _round = G.season.round
      const _fx = playerFixture(names, _round, playerName)
      const _tMod = _fx ? tacticMod(G.matchdayTactics[_round] || 'standard', identityFor(_fx.opp).style) : 0
      // Vendetta: your people fight harder against the village that buried their
      // squadmates. Capped at +10% — a thumb on the scale, not a substitute for
      // a good roster.
      const _vMod = _fx ? vendettaBonus(G.shinobi, _fx.opp) : 0
      const strOf = name => name === playerName
        ? Math.max(10, Math.round(((G._playerStrength || 50) + formBonus) * (1 + _tMod + _vMod)))
        : ((G.villages.find(v => v.n === name)?.strength) || 50)
      playMatchday(G.season, names, strOf, Math.random, styleOf)
      delete G.matchdayTactics[_round]   // consumed — never inherited by a later fixture
      _applyPlayerResult(playerName)
    }

    // Track monthly form streak for press triggers
    const _fm = G._formThisMonth || { wins: 0, losses: 0 }
    if (_fm.wins > _fm.losses) {
      G._pressWinStreak  = (G._pressWinStreak  || 0) + 1
      G._pressLossStreak = 0
    } else if (_fm.losses > _fm.wins) {
      G._pressLossStreak = (G._pressLossStreak || 0) + 1
      G._pressWinStreak  = 0
    }
    if (G._pressWinStreak  >= 3 && !G.pendingPress) { queuePressConference('win_streak');  G._pressWinStreak  = 0 }
    if (G._pressLossStreak >= 3 && !G.pendingPress) { queuePressConference('loss_streak'); G._pressLossStreak = 0 }

    // Mid-season pressure: standings-driven noticeboard items (title race / slump /
    // council heat). Throttled to once every 2 months, and never repeats the same
    // kind back-to-back, so it reads as narrative beats rather than spam.
    // Throttle on an ABSOLUTE month index: comparing G.month alone went negative
    // across the year boundary (Jan 1 − Nov 11 = −10), which permanently
    // suppressed standings notices from the first year-end onward.
    const _absMonth = G.year * 12 + G.month
    const _notice = seasonPressNotice(G.season.table, playerName, G.season.round, SEASON_ROUNDS)
    if (_notice && _absMonth - (G._lastSeasonPressMonth || -99) >= 2 && _notice.kind !== G._lastSeasonPressKind) {
      G.noticeboard = G.noticeboard || []
      G.noticeboard.unshift({
        id: 'seasonpress_' + G.year + '_' + G.month,
        cat: 'Standings', icon: _notice.icon, priority: _notice.priority,
        title: _notice.title, body: _notice.body, dismissed: false,
      })
      G._lastSeasonPressMonth = _absMonth
      G._lastSeasonPressKind = _notice.kind
      ntf(tr('toast.adv.noticeNtf', { title: _notice.title }))
    }
  }
}

/**
 * Fold the just-played matchday's player result into the all-time head-to-head
 * ledger, and pay out the derby swing when the fixture was the derby.
 *
 * Called once per matchday (not once per month) — with two fixtures a month the
 * old read of `lastResults` after the loop would have silently dropped one.
 */
/**
 * A win over a village that owes you blood answers ONE of its deaths.
 *
 * This is the payoff the whole legacy-memory layer exists for: a shinobi killed
 * in year two comes back by name in year nine, because the people who walked off
 * that mission are still on the roster and still remember. One death per win
 * means a village that took six of yours owes you a six-year arc, not a single
 * cathartic afternoon.
 *
 * The carriers get a permanent positive memory of it — 'avenged' is itself a
 * defining moment, so the debt AND its answer both stay on the record.
 */
function _settleVendetta(oppName) {
  if (!G.vendettas || !unsettledCount(G.vendettas, oppName)) return
  const carriers = vendettaCarriers(G.shinobi, oppName)
  if (!carriers.length) return           // nobody left who remembers — no payoff
  const fallen = settleOneDeath(G.vendettas, oppName)
  if (!fallen) return
  const when = { year: G.year, month: G.month }
  const beat = vengeanceBeat(fallen, oppName, when, carriers.slice(0, 2).map(sn))
  carriers.forEach(s => {
    addMemory(s, 'avenged', 'vendetta:' + oppName, when)
    s.indMorale = clamp((s.indMorale || 70) + 6, 0, 100)
  })
  pushNarrative({ title: beat.title, body: beat.body, tag: 'vendetta' }, carriers.map(s => s.id))
  addChronicle(beat.title, beat.body, 'shinobi')
  addLegend(3)
  aL(`⚑ ${fallen.name} answered — ${oppName} beaten.`, 'good')
}

function _applyPlayerResult(playerName) {
  const m = (G.season.lastResults || []).find(x => x.a === playerName || x.b === playerName)
  if (!m) return
  updateH2H(G.h2h, playerName, m)
  const opp = m.a === playerName ? m.b : m.a
  if (m.winner === playerName) _settleVendetta(opp)
  if (opp !== G.derbyRival) return
  const ps = m.a === playerName ? m.scoreA : m.scoreB
  const os = m.a === playerName ? m.scoreB : m.scoreA
  if (m.winner === playerName) {
    G.morale = clamp(G.morale + 3, 0, 100)
    G.reputation = clamp(G.reputation + 2, 0, 999)
    aL(tr('toast.adv.derbyWin', { village: opp, ps, os }), 'good')
  } else if (m.winner) {
    G.morale = clamp(G.morale - 3, 0, 100)
    aL(tr('toast.adv.derbyLoss', { village: opp, ps, os }), 'bad')
    if (!G.pendingPress && Math.random() < 0.3) queuePressConference('rivalry_heat', { rivalName: opp })
  } else {
    aL(tr('toast.adv.derbyDraw', { village: opp, ps, os }), 'neutral')
  }
}
