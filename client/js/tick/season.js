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
import { initSeasonTable, playMatchday, seasonPressNotice, roundPairings, sortedTable, simMatch, styledScore } from '../../../shared/utils/season.js'
import { identityFor } from '../../../shared/constants/villageIdentity.js'
import { tacticMod } from '../../../shared/constants/matchdayTactics.js'
import { updateH2H, pickDerbyRival } from '../../../shared/utils/rivalry.js'
import { pushNarrative } from './inbox.js'
import { queuePressConference } from './missionHelpers.js'

export function tickSeason(ctx) {
  const { season } = ctx
  // ── Season league table — the regular-season spine that seeds the exam ────
  {
    const playerName = G.vName
    const names = [playerName, ...G.villages.map(v => v.n)]
    if (!G.season || !G.season.table || Object.keys(G.season.table).length !== names.length) {
      G.season = { year: G.year, round: 0, table: initSeasonTable(names), lastResults: [] }
    }
    // Real mission form feeds the player's matchday — a good month on missions
    // makes you likelier to win your league fixture (±2 effective strength per net phase-margin).
    const form = G._formThisMonth || { marginSum: 0 }
    const formBonus = clamp(form.marginSum * 2, -20, 20)
    G._seasonFormBonus = formBonus  // surfaced in UI
    // Matchday tactic (player pick, persists monthly): a good read on this
    // fixture's opponent style swings the player's effective strength ±.
    const _pairs = roundPairings(names, G.season.round)
    const _myFx = _pairs.find(([a, b]) => a === playerName || b === playerName)
    const _myOpp = _myFx ? (_myFx[0] === playerName ? _myFx[1] : _myFx[0]) : null
    const _tMod = _myOpp ? tacticMod(G.matchdayTactic || 'standard', identityFor(_myOpp).style) : 0
    const strOf = name => name === playerName
      ? Math.max(10, Math.round(((G._playerStrength || 50) + formBonus) * (1 + _tMod)))
      : ((G.villages.find(v => v.n === name)?.strength) || 50)
    // Matchday styles: rivals play to their village identity; the player's style
    // follows their coaching philosophy (aggressive→blitz, defensive→fortress).
    const _philStyle = { aggressive: 'blitz', defensive: 'fortress' }[G.coachingPhilosophy] || 'balanced'
    const styleOf = name => name === playerName ? _philStyle : identityFor(name).style
    playMatchday(G.season, names, strOf, Math.random, styleOf)

    // ── Rivalry: all-time head-to-head + the derby fixture ───────────────────
    // Each January the most hostile rival becomes the year's derby; derby
    // results swing morale/reputation beyond the points and feed the press.
    if (G.month === 1 || !G.derbyRival) {
      const dv = pickDerbyRival(G.villages, G.derbyRival)
      if (dv && dv.n !== G.derbyRival) {
        G.derbyRival = dv.n
        aL(tr('toast.adv.derbyNamed', { ico: dv.ico, village: dv.n }), 'ev')
        addNotice(`${dv.ico} ${dv.n} named this year's derby rival — those fixtures now carry the village's pride.`, 'warn')
      } else if (dv) G.derbyRival = dv.n
    }
    G.h2h = G.h2h || {}
    const _myMatch = (G.season.lastResults || []).find(m => m.a === playerName || m.b === playerName)
    if (_myMatch) {
      updateH2H(G.h2h, playerName, _myMatch)
      const _mOpp = _myMatch.a === playerName ? _myMatch.b : _myMatch.a
      if (_mOpp === G.derbyRival) {
        const _dps = _myMatch.a === playerName ? _myMatch.scoreA : _myMatch.scoreB
        const _dos = _myMatch.a === playerName ? _myMatch.scoreB : _myMatch.scoreA
        if (_myMatch.winner === playerName) {
          G.morale = clamp(G.morale + 3, 0, 100)
          G.reputation = clamp(G.reputation + 2, 0, 999)
          aL(tr('toast.adv.derbyWin', { village: _mOpp, ps: _dps, os: _dos }), 'good')
        } else if (_myMatch.winner) {
          G.morale = clamp(G.morale - 3, 0, 100)
          aL(tr('toast.adv.derbyLoss', { village: _mOpp, ps: _dps, os: _dos }), 'bad')
          if (!G.pendingPress && Math.random() < 0.3) queuePressConference('rivalry_heat', { rivalName: _mOpp })
        } else {
          aL(tr('toast.adv.derbyDraw', { village: _mOpp, ps: _dps, os: _dos }), 'neutral')
        }
      }
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
    const _notice = seasonPressNotice(G.season.table, playerName, G.season.round, 11)
    if (_notice && G.month - (G._lastSeasonPressMonth || -99) >= 2 && _notice.kind !== G._lastSeasonPressKind) {
      G.noticeboard = G.noticeboard || []
      G.noticeboard.unshift({
        id: 'seasonpress_' + G.year + '_' + G.month,
        cat: 'Standings', icon: _notice.icon, priority: _notice.priority,
        title: _notice.title, body: _notice.body, dismissed: false,
      })
      G._lastSeasonPressMonth = G.month
      G._lastSeasonPressKind = _notice.kind
      ntf(tr('toast.adv.noticeNtf', { title: _notice.title }))
    }
  }
}
