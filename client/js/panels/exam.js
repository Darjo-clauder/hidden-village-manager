import { G, ui, sPow, rnd, sn, pk, clamp, fmt, addChronicle, addLegend, computeMarketValue } from '../state.js'
import { RANKS, EXAM_FORMATS, PRESTIGE_TIERS, LEGACY_DECISIONS, INJURY_TYPES } from '../constants.js'
import { aL, ntf, upUI, schEx } from '../ui.js'
import { initSeasonTable, sortedTable, seedsFromTable, seasonSchedule, teamFixtures, teamForm, seasonState, matchPreview, matchToBeats } from '../../../shared/utils/season.js'
import { identityFor, MATCH_STYLES, identityStageAdv } from '../../../shared/constants/villageIdentity.js'
import { MATCHDAY_TACTICS, tacticRead, TACTIC_STRONG_MOD, TACTIC_WEAK_MOD } from '../../../shared/constants/matchdayTactics.js'
import { h2hLabel } from '../../../shared/utils/rivalry.js'
import { t } from '../../../shared/utils/i18n.js'
import { openBattleViewer } from '../liveBattle.js'
import { squadPower, avgStat, seedEdge, examWrittenProb, examForestNavProb, examForestClashProb, examInjuryChance, examPromotionChance, groupIntoCells, examCohesionGain, elementalHarmony } from '../../../shared/utils/stageMath.js'
import { isHostEligible, minHostBid, hostRevenue, genRivalHostBids, hostBidResolve } from '../../../shared/utils/hostBidding.js'

/** Replay the player's most-recent league fixture as a live matchday. */
export function watchMatchday() {
  const season = G.season; if (!season) return
  const lastPlayed = (season.round || 0) - 1
  const rr = (season.resultsByRound || {})[lastPlayed]; if (!rr) return
  const m = rr.find(x => x.a === G.vName || x.b === G.vName); if (!m) return
  const { phases, result, playerScore, oppScore } = matchToBeats(m, G.vName)
  const opp = m.a === G.vName ? m.b : m.a
  const verdict = result === 'win' ? (playerScore - oppScore >= 2 ? 'A commanding matchday win.' : 'A hard-earned win.')
    : result === 'draw' ? 'Honours even — a point apiece.'
    : (oppScore - playerScore >= 2 ? 'Outclassed on the day.' : 'Beaten by a fine margin.')
  openBattleViewer({
    missionName: `${G.vName} vs ${opp}`, missionRk: `Matchday ${lastPlayed + 1}`,
    kind: 'league', result, succeeded: result === 'win', phases, verdict,
    scoreline: { home: G.vName, away: opp, hs: playerScore, as: oppScore },
  })
}

/** Replay the player's run through the last Adept Exam as a live bracket. */
export function watchExam() {
  const run = G._examRun
  if (!run || !run.stages || !run.stages.length) return
  const phases = run.stages.map(s => ({ name: s.name, won: s.advanced }))
  const lastAdvanced = [...run.stages].reverse().find(s => s.advanced)
  const reachedStage = run.champion ? 'Final' : (lastAdvanced ? lastAdvanced.name : run.stages[0].name)
  const verdict = run.champion ? 'Champions of the Adept Exam — promotions earned in fire.'
    : `Eliminated at the ${reachedStage}. The academy fights on another year.`
  openBattleViewer({
    missionName: `Year ${run.year} Adept Exam`, missionRk: 'Adept Exam',
    kind: 'tournament', phases, champion: run.champion, reachedStage, verdict,
    succeeded: run.champion,
  })
}
import { leagueLeaders } from '../../../shared/utils/seasonStats.js'

// Season-by-season stat history (surfaces the archived G.seasonStats snapshots).
function _seasonHistoryHtml() {
  const stats = G.seasonStats || {}
  const years = Object.keys(stats).map(Number).sort((a, b) => b - a)
  if (!years.length) return `<div style="font-size:8px;color:#555;margin-bottom:12px">No completed seasons yet — history appears after Year 1 ends (Month 12).</div>`
  return `<div style="font-size:10px;color:#c9a84c;margin:14px 0 8px;text-transform:uppercase;letter-spacing:1px">Season History</div>
    <div style="display:grid;gap:6px;margin-bottom:14px">
      ${years.map(y => {
        const snap = stats[y]; const L = leagueLeaders(snap)
        const mvp = L.topWins[0]; const mis = L.topMissions[0]; const sr = L.topSRank[0]
        const finish = snap.playerStanding ? `#${snap.playerStanding}` : '—'
        const finCol = snap.playerStanding === 1 ? '#c9a84c' : snap.playerStanding <= 3 ? '#8fbc8f' : '#7a7060'
        return `<div style="background:#0a0a0a;border:1px solid #2e2a22;border-left:2px solid ${finCol};padding:8px 10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:10px;color:#e8e0cc;font-weight:bold">Year ${y}</span>
            <span style="font-size:8px;color:#7a7060">Tier ${snap.prestige}</span>
            <span style="font-size:8px;color:${finCol};margin-left:auto">Finished ${finish}${snap.kiaCount ? ` · <span style="color:#f66">${snap.kiaCount} fallen</span>` : ''}</span>
          </div>
          <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:8px;color:#7a7060">
            ${mvp && mvp.winsThisSeason > 0 ? `<span>🏅 MVP <b style="color:#e8e0cc">${mvp.name}</b> (${mvp.winsThisSeason}W)</span>` : ''}
            ${mis && mis.missionsThisSeason > 0 ? `<span>⚙ Most missions <b style="color:#e8e0cc">${mis.name}</b> (${mis.missionsThisSeason})</span>` : ''}
            ${sr && sr.sRankWins > 0 ? `<span>★ Top S-rank <b style="color:#c9a84c">${sr.name}</b> (${sr.sRankWins})</span>` : ''}
          </div>
        </div>`
      }).join('')}
    </div>`
}
import { tblSort, tblToggleSort, tblHeaderHtml, tblSortRows } from '../uikit.js'
import { kageMod } from '../../../shared/constants/kageDev.js'
import { renderWar } from './war.js'
import { queuePressConference } from '../adv.js'

window._exTab = 'exam'

export function rEx() {
  const el = document.getElementById('exl')
  if (!el) return
  const tabs = ['season', 'exam', 'war', 'summit', 'srank', 'records', 'leaders']
  const labels = { season: 'SEASON', exam: 'ADEPT EXAM', war: 'GRAND TOURNAMENT', summit: 'SUMMIT', srank: 'S-RANK BIDS', records: 'RECORDS', leaders: 'LEADERS' }
  const offSeasonBanner = G.isOffSeason ? `<div style="background:#0d0a04;border:1px solid #c9a84c;padding:6px 10px;margin-bottom:10px;font-size:8px;color:#c9a84c">⛄ Off-season — Months 1–3. Focus: recruitment, contract renewals, squad prep. Season begins Month 4.</div>` : ''
  const tabHtml = `${offSeasonBanner}<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${tabs.map(t => `<button class="btn${window._exTab === t ? ' act' : ''}" onclick="exTab('${t}')" style="font-size:9px;padding:3px 8px${t === 'war' ? ';color:#c9a84c' : ''}">${labels[t]}${t === 'war' && G.warSched ? ' ●' : ''}</button>`).join('')}
  </div>`
  if (window._exTab === 'season') { el.innerHTML = tabHtml + _seasonTab(); return }
  if (window._exTab === 'war') { renderWar(el, tabHtml); return }
  if (window._exTab === 'summit') { el.innerHTML = tabHtml + _summitTab(); return }
  if (window._exTab === 'srank') { el.innerHTML = tabHtml + _srankTab(); return }
  if (window._exTab === 'records') { el.innerHTML = tabHtml + _recordsTab(); return }
  if (window._exTab === 'leaders') { el.innerHTML = tabHtml + _leadersTab(); return }
  el.innerHTML = tabHtml
  if (G.examActive) { rExA(el, tabHtml); return }
  _renderExamSetup(el, tabHtml)
}

export function exTab(t) { window._exTab = t; rEx() }

// ── Season tab — the year's spine: schedule → standings → Grand Tournament ─────
function _seasonTab() {
  const playerName = G.vName
  const names = [playerName, ...(G.villages || []).map(v => v.n)]
  if (!G.season?.table) {
    const review = _seasonReviewCard(playerName)
    return review + `<div style="color:#7a7060;font-size:10px;padding:14px 0">The season begins in Month 4. Fixtures and standings will appear here.</div>`
  }
  const round = G.season.round || 0
  const schedule = seasonSchedule(names, 11)
  const fixtures = teamFixtures(schedule, playerName)
  const resultsByRound = G.season.resultsByRound || {}
  const resultFor = r => {
    const rr = resultsByRound[r]; if (!rr) return null
    const m = rr.find(x => x.a === playerName || x.b === playerName); if (!m) return null
    return m.winner === playerName ? 'W' : m.winner === null ? 'D' : 'L'
  }

  // Structure overview — the year at a glance.
  const overview = `<div style="background:#0d0a04;border:1px solid #2e2a22;padding:11px 13px;margin-bottom:12px">
    <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">The Shinobi Year</div>
    <div style="display:flex;gap:6px;align-items:stretch;flex-wrap:wrap;font-size:8px">
      ${[
        ['🎓 Academy Intake', 'M4', 'Prospects enter the system'],
        ['⚔ Adept Exam', 'M4 / M10', 'Little league — develop initiate → adept'],
        ['📅 Season Matchdays', 'All year', 'Monthly fixtures build the standings'],
        ['🏆 Grand Tournament', 'M12', 'The deadly year-end playoff, seeded by standings'],
      ].map(([t, when, d], i) => `<div style="flex:1;min-width:120px;border:1px solid #2a2520;border-left:2px solid #c9a84c;padding:7px 9px">
        <div style="font-size:9px;color:#e8e0cc;font-weight:bold">${t}</div>
        <div style="font-size:7px;color:#c9a84c;margin:2px 0">${when}</div>
        <div style="font-size:7px;color:#7a7060;line-height:1.4">${d}</div>
      </div>${i < 3 ? '<div style="align-self:center;color:#3a3630;font-size:11px">→</div>' : ''}`).join('')}
    </div>
  </div>`

  // Player fixture list — recent results + upcoming.
  const fixtureList = `<div style="border:1px solid #2e2a22;background:#0a0a0a;padding:9px;margin-bottom:12px">
    <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:6px">${t('season.fixtures', { village: playerName })}</div>
    <div style="display:grid;gap:2px">
      ${fixtures.map(f => {
        const done = f.round < round
        const res = done ? resultFor(f.round) : null
        const next = f.round === round
        const resCol = res === 'W' ? '#8fbc8f' : res === 'L' ? '#f66' : res === 'D' ? '#c9a84c' : '#555'
        return `<div style="display:flex;align-items:center;gap:8px;font-size:8px;padding:3px 6px;background:${next ? 'rgba(201,168,76,.08)' : 'transparent'};border-left:2px solid ${next ? '#c9a84c' : 'transparent'}">
          <span style="color:#555;width:40px">Round ${f.round + 1}</span>
          <span style="color:#7a7060;width:28px">${f.home ? 'vs' : '@'}</span>
          <span style="flex:1;color:#e8e0cc">${f.opp}</span>
          ${done ? `<span style="color:${resCol};font-weight:bold;width:16px;text-align:center">${res || '·'}</span>`
                 : next ? '<span style="color:#c9a84c;font-size:7px">NEXT ▸</span>'
                 : '<span style="color:#3a3630;font-size:7px">upcoming</span>'}
        </div>`
      }).join('')}
    </div>
  </div>`

  const banner = _titleRaceBanner(playerName, round, schedule.length)
  const preview = _matchPreviewCard(names, schedule, round, resultsByRound, playerName)
  return banner + overview + _exhibitionCard() + preview + _seasonResultsCard(round, resultsByRound, playerName) + _seasonStandingsCard() + fixtureList + _seasonFixtureGrid(names, schedule, round, resultsByRound, playerName)
}

// Off-season exhibition slate — friendlies + the Minor Nations Invitational (months 1–3).
function _exhibitionCard() {
  const ex = (G.exhibitions || []).filter(e => e.year === G.year)
  const inv = (G.invitationalHistory || []).slice(-1)[0]
  if (!ex.length && !inv) return ''
  const resCol = r => r === 'W' ? '#8fbc8f' : r === 'L' ? '#f66' : '#c9a84c'
  const cupTag = c => c === 'SF' ? '<span style="font-size:6px;border:1px solid #c9a84c;color:#c9a84c;padding:0 3px">🏆 SF</span>'
    : c === 'F' ? '<span style="font-size:6px;border:1px solid #c9a84c;color:#c9a84c;padding:0 3px">🏆 FINAL</span>' : ''
  const holder = inv ? `<div style="font-size:7px;color:${inv.champion === G.vName ? '#8fbc8f' : '#9a9080'};margin-top:5px">🏆 Invitational holder (Y${inv.year}): <b>${inv.champion}</b>${inv.champion === G.vName ? ' — that’s you' : ` (you: ${inv.playerResult})`}</div>` : ''
  return `<div style="border:1px solid #2e2a22;background:#0a0a0a;padding:9px;margin-bottom:12px">
    <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:6px">🏮 Off-Season Slate — minor nations</div>
    <div style="display:grid;gap:2px">
      ${ex.map(e => `<div style="display:flex;align-items:center;gap:8px;font-size:8px;padding:3px 6px">
        <span style="color:#555;width:24px">M${e.month}</span>
        <span style="width:16px">${e.ico}</span>
        <span style="flex:1;color:#e8e0cc">${e.opp} <span style="font-size:7px;color:#555">Tier ${e.tier}</span> ${cupTag(e.cup)}</span>
        <span style="color:#9a9080;font-family:monospace">${e.ps}–${e.os}</span>
        <span style="color:${resCol(e.result)};font-weight:bold;width:14px;text-align:center">${e.result}</span>
      </div>`).join('')}
    </div>
    <div style="font-size:7px;color:#555;margin-top:5px">Friendlies (M1/M3) + the annual Invitational knockout (M2) — purses and morale, no league standing at stake.</div>
    ${holder}
  </div>`
}

// Title-race banner (M3) — the persistent season-state strip at the top.
function _titleRaceBanner(playerName, round, totalRounds) {
  const st = seasonState(G.season.table, playerName, round, totalRounds)
  if (!st) return ''
  const ord = n => n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  const posCol = st.isLeader ? '#8fbc8f' : st.playerPos >= st.total ? '#cc5a4a' : '#c9a84c'
  const verdict = st.isLeader
    ? `<span style="color:#8fbc8f">Leading the race</span>`
    : st.inHunt ? `<span style="color:#c9a84c">In the hunt — ${st.gapToLead} off top</span>`
    : st.playerPos >= st.total ? `<span style="color:#cc5a4a">Rooted to the bottom</span>`
    : `<span style="color:#9a9080">${st.gapToLead} pts off the lead</span>`
  return `<div style="display:flex;align-items:center;gap:14px;background:linear-gradient(90deg,#13100a,#0a0a0a);border:1px solid #2e2a22;border-left:3px solid ${posCol};padding:9px 13px;margin-bottom:12px">
    <div style="text-align:center;min-width:46px">
      <div style="font-size:18px;font-weight:bold;color:${posCol};line-height:1">${st.playerPos}<span style="font-size:9px">${ord(st.playerPos)}</span></div>
      <div style="font-size:6px;letter-spacing:1px;color:#7a7060;text-transform:uppercase">of ${st.total}</div>
    </div>
    <div style="flex:1">
      <div style="font-size:9px;color:#e8e0cc;font-weight:bold">${verdict}</div>
      <div style="font-size:7px;color:#7a7060;margin-top:2px">${st.phase} · ${st.roundsLeft} round${st.roundsLeft === 1 ? '' : 's'} left · Leaders: <span style="color:#c9a84c">${st.leader}</span> (${st.leaderPts} pts)</div>
    </div>
  </div>`
}

// End-of-season awards ceremony (M4) — surfaced in the off-season. Reads the most
// recent archived season (G.seasonHistory) + that year's awards (G.seasonAwards).
function _seasonReviewCard(playerName) {
  const hist = (G.seasonHistory || []).slice(-1)[0]
  if (!hist || !Array.isArray(hist.table) || !hist.table.length) return ''
  const table = hist.table
  const pos = table.findIndex(r => r.name === playerName) + 1
  const total = table.length
  const ord = n => n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
  const won = hist.champion === playerName
  const verdict = won ? 'Champions.'
    : pos === 1 ? 'Top of the table.'
    : pos <= Math.ceil(total / 2) ? 'A respectable campaign.'
    : pos >= total ? 'A season to forget.'
    : 'Room to grow.'
  const vCol = won || pos === 1 ? '#8fbc8f' : pos >= total ? '#cc5a4a' : '#c9a84c'

  const awards = G.seasonAwards?.[hist.year] || {}
  const order = ['mvp', 'rookieOfYear', 'warHero', 'ironwall']
  const cards = order.map(k => awards[k]).filter(a => a && a.name).map(a =>
    `<div style="flex:1;min-width:120px;border:1px solid #2a2520;border-left:2px solid #c9a84c;padding:7px 9px">
      <div style="font-size:7px;letter-spacing:1px;color:#c9a84c;text-transform:uppercase">${a.label}</div>
      <div style="font-size:10px;color:#e8e0cc;font-weight:bold;margin:2px 0">${a.name}</div>
      <div style="font-size:7px;color:#7a7060;line-height:1.4">${a.reason}</div>
    </div>`).join('')

  const standings = table.map((r, i) => `<tr style="${r.name === playerName ? 'color:#c9a84c;font-weight:bold' : 'color:#9a9080'}">
    <td style="padding:1px 4px">${i + 1}</td>
    <td>${r.name === hist.champion ? '👑 ' : ''}${r.name}${r.name === playerName ? ' (you)' : ''}</td>
    <td style="text-align:center">${r.w}</td><td style="text-align:center">${r.d}</td><td style="text-align:center">${r.l}</td>
    <td style="text-align:right;padding-right:4px;color:#e8e0cc">${r.pts}</td></tr>`).join('')

  return `<div style="border:1px solid #c9a84c;background:linear-gradient(160deg,#13100a,#0a0a0a);padding:13px;margin-bottom:14px">
    <div style="text-align:center;margin-bottom:10px">
      <div style="font-size:7px;letter-spacing:3px;color:#7a7060;text-transform:uppercase">Year ${hist.year} · Season Review</div>
      <div style="font-size:13px;color:#c9a84c;font-weight:bold;margin-top:3px">🏆 ${hist.champion || 'No champion'}</div>
      <div style="font-size:8px;color:#7a7060;margin-top:2px">League champions</div>
      <div style="margin-top:7px;font-size:10px;color:${vCol};font-weight:bold">${playerName}: ${pos}${ord(pos)} of ${total} — ${verdict}</div>
    </div>
    ${cards ? `<div style="font-size:7px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:6px">Season Awards</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px">${cards}</div>` : ''}
    <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:5px">Final Standings</div>
    <table style="width:100%;border-collapse:collapse;font-size:8px">
      <thead><tr style="color:#7a7060;text-align:left"><th style="padding:1px 4px">#</th><th>Village</th><th style="text-align:center">W</th><th style="text-align:center">D</th><th style="text-align:center">L</th><th style="text-align:right;padding-right:4px">Pts</th></tr></thead>
      <tbody>${standings}</tbody>
    </table>
  </div>`
}

// Match build-up card (M2) — the player's next fixture with full context.
function _matchPreviewCard(names, schedule, round, resultsByRound, playerName) {
  const p = matchPreview(G.season.table, resultsByRound, schedule, playerName, round)
  if (!p) return `<div style="border:1px dashed #2e2a22;background:#0a0a0a;padding:9px;margin-bottom:12px;font-size:8px;color:#7a7060">Bye round — no fixture this matchday.</div>`
  const pip = r => { const c = { W: '#8fbc8f', D: '#c9a84c', L: '#cc5a4a' }[r]; return `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c};margin-left:2px"></span>` }
  const formRow = (label, form) => `<div style="display:flex;align-items:center;gap:6px;font-size:7px;color:#7a7060"><span style="width:54px">${label}</span>${form.length ? form.map(pip).join('') : '<span style="color:#3a3630">no games yet</span>'}</div>`
  const h2hTxt = (p.h2h.w + p.h2h.d + p.h2h.l) ? `${p.h2h.w}W–${p.h2h.d}D–${p.h2h.l}L this season` : 'first meeting this season'
  const allTime = h2hLabel(G.h2h, p.opp)
  const isDerby = p.opp === G.derbyRival
  return `<div style="border:1px solid ${isDerby ? '#cc5a4a' : '#c9a84c'};background:#0d0a04;padding:11px 13px;margin-bottom:12px">
    ${isDerby ? `<div style="text-align:center;font-size:9px;letter-spacing:3px;color:#cc5a4a;font-weight:bold;margin-bottom:6px">🔥 DERBY MATCH 🔥</div>` : ''}
    <div style="font-size:7px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:7px">▸ Next Matchday — Round ${round + 1}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:9px">
      <div style="flex:1;text-align:right"><div style="font-size:11px;color:#c9a84c;font-weight:bold">${playerName}</div><div style="font-size:7px;color:#7a7060">${p.playerPos}${p.playerPos===1?'st':p.playerPos===2?'nd':p.playerPos===3?'rd':'th'} place</div></div>
      <div style="font-size:8px;color:#7a7060;text-align:center">${p.home ? 'vs' : '@'}<div style="font-size:6px;color:#555;margin-top:2px">${p.home ? 'home' : 'away'}</div></div>
      <div style="flex:1"><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${p.opp}</div><div style="font-size:7px;color:#7a7060">${p.oppPos}${p.oppPos===1?'st':p.oppPos===2?'nd':p.oppPos===3?'rd':'th'} place</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:3px;border-top:1px solid #2a2520;padding-top:7px">
      ${formRow('Your form', p.playerForm)}
      ${formRow(p.opp + ' form', p.oppForm)}
      <div style="font-size:7px;color:#7a7060;margin-top:1px">⚔ Head-to-head: <span style="color:#9a9080">${h2hTxt}</span>${allTime ? ` · <span style="color:#8a7d5c">${allTime}</span>` : ''}</div>
      ${(() => { const ace = (G.villages || []).find(v => v.n === p.opp)?.aces?.[0]; return ace ? `<div style="font-size:7px;color:#7a7060;margin-top:1px">⭐ Their ace: <span style="color:#e8e0cc">${ace.name}</span> <span style="color:#555">(Pwr ${ace.pow})</span></div>` : '' })()}
      ${p.stakes.length ? `<div style="font-size:7px;color:#c9a84c;margin-top:2px">At stake: ${p.stakes.join(' · ')}</div>` : ''}
    </div>
    ${_tacticPicker(p.opp)}
  </div>`
}

// Matchday tactic picker — the monthly counter-play against the opponent's identity.
function _tacticPicker(oppName) {
  const idn = identityFor(oppName)
  const st = MATCH_STYLES[idn.style] || MATCH_STYLES.balanced
  const cur = G.matchdayTactic || 'standard'
  const readCol = { strong: '#8fbc8f', weak: '#cc5a4a', neutral: '#7a7060' }
  const readTxt = { strong: `+${Math.round(TACTIC_STRONG_MOD * 100)}%`, weak: `${Math.round(TACTIC_WEAK_MOD * 100)}%`, neutral: '—' }
  return `<div style="border-top:1px solid #2a2520;margin-top:7px;padding-top:7px">
    <div style="font-size:7px;color:#7a7060;margin-bottom:5px">They play <span title="${st.desc}" style="color:#c9a84c;cursor:help">${st.icon} ${st.label}</span> — choose your approach:</div>
    <div style="display:flex;gap:4px;flex-wrap:wrap">
      ${MATCHDAY_TACTICS.map(t => {
        const read = tacticRead(t.id, idn.style)
        const sel = t.id === cur
        return `<button onclick="setMatchdayTactic('${t.id}')" title="${t.desc}"
          style="flex:1;min-width:76px;padding:5px 6px;cursor:pointer;font-size:8px;text-align:center;
                 background:${sel ? 'rgba(201,168,76,.12)' : '#0a0a0a'};
                 border:1px solid ${sel ? '#c9a84c' : '#2e2a22'};color:${sel ? '#c9a84c' : '#9a9080'}">
          <div>${t.icon} ${t.label}</div>
          <div style="font-size:7px;margin-top:2px;color:${readCol[read]}">${readTxt[read]}</div>
        </button>`
      }).join('')}
    </div>
  </div>`
}

/** Set the persistent matchday tactic (window-exposed). */
export function setMatchdayTactic(id) {
  G.matchdayTactic = id
  rEx()
}

// League-wide fixture grid — every village's slate, round by round, with the
// look-ahead the player tab can't give: who everyone else plays, and the results.
function _seasonFixtureGrid(names, schedule, round, resultsByRound, playerName) {
  if (!schedule.length) return ''
  const winnerOf = (r, a, b) => {
    const rr = resultsByRound[r]; if (!rr) return undefined
    const m = rr.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a))
    return m ? m.winner : undefined  // null = draw, name = winner
  }
  const cell = (m, r) => {
    const played = r < round
    const w = played ? winnerOf(r, m.a, m.b) : undefined
    const side = (name) => {
      const me = name === playerName
      const won = played && w === name
      const drew = played && w === null
      const col = won ? '#8fbc8f' : (played && w !== undefined && !drew) ? '#6a6258' : drew ? '#c9a84c' : '#9a9080'
      return `<span style="color:${me ? '#c9a84c' : col};font-weight:${me || won ? 'bold' : 'normal'}">${name}</span>`
    }
    return `<div style="display:flex;align-items:center;gap:5px;font-size:8px;padding:2px 6px;background:${(m.a === playerName || m.b === playerName) ? 'rgba(201,168,76,.06)' : 'transparent'}">
      <span style="flex:1;text-align:right">${side(m.a)}</span>
      <span style="color:#3a3630;width:12px;text-align:center">${played ? (w === null ? '=' : '·') : 'v'}</span>
      <span style="flex:1">${side(m.b)}</span>
    </div>`
  }
  return `<div style="border:1px solid #2e2a22;background:#0a0a0a;padding:9px;margin-bottom:12px">
    <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:6px">${t('season.leagueGrid')}</div>
    <div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      ${schedule.map((rnd, r) => {
        const state = r < round ? 'done' : r === round ? 'now' : 'next'
        const tag = state === 'now' ? '<span style="color:#c9a84c;font-size:7px">◂ NOW</span>' : state === 'done' ? '<span style="color:#3a3630;font-size:7px">played</span>' : '<span style="color:#3a3630;font-size:7px">upcoming</span>'
        return `<div style="border:1px solid ${state === 'now' ? '#c9a84c' : '#222'};border-left:2px solid ${state === 'now' ? '#c9a84c' : '#2a2520'};padding:4px 0 5px">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:0 6px 3px;font-size:7px;color:#7a7060;letter-spacing:1px">ROUND ${r + 1} ${tag}</div>
          ${rnd.length ? rnd.map(m => cell(m, r)).join('') : '<div style="font-size:7px;color:#3a3630;padding:2px 6px">— bye round —</div>'}
        </div>`
      }).join('')}
    </div>
    <div style="font-size:7px;color:#555;margin-top:6px">Your village is highlighted gold. Winners in green; draws marked “=”.</div>
  </div>`
}

// Small colored form guide — last-5 W/D/L as pips, oldest→newest.
function _formPips(form) {
  if (!form.length) return '<span style="color:#3a3630;font-size:7px">—</span>'
  const col = { W: '#8fbc8f', D: '#c9a84c', L: '#cc5a4a' }
  return form.map(r => `<span title="${r}" style="display:inline-block;width:9px;height:9px;line-height:9px;margin-left:2px;border-radius:2px;background:${col[r]};color:#0a0a0a;font-size:6px;text-align:center;font-weight:bold">${r}</span>`).join('')
}

// Season standings card — the league race that seeds the exam bracket.
function _seasonStandingsCard() {
  if (!G.season?.table) return ''
  const rows = sortedTable(G.season.table)
  if (!rows.length) return ''
  const rbr = G.season.resultsByRound || {}
  const round = G.season.round || 0
  const total = rows.length
  // Tournament seed edge a finishing position earns — mirrors seedBonus() in war.js
  // (the top seed's +10% combat edge in the deadly Grand Tournament), so the standings
  // show what league position is actually worth, not just bragging rights.
  const seedEdge = pos => total < 2 ? 0 : Math.round((1 - (pos - 1) / (total - 1)) * 10)
  return `<div style="border:1px solid #2e2a22;background:#0a0a0a;padding:9px;margin-bottom:10px">
    <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:6px">Season Standings — seeds the bracket</div>
    <table style="width:100%;border-collapse:collapse;font-size:8px">
      <thead><tr style="color:#7a7060;text-align:left"><th style="padding:1px 4px">#</th><th>Village</th><th style="text-align:center">W</th><th style="text-align:center">D</th><th style="text-align:center">L</th><th style="text-align:center" title="Goal difference">GD</th><th style="text-align:center">Pts</th><th style="text-align:center" title="Combat edge this seed earns in the Grand Tournament">Edge</th><th style="text-align:right;padding-right:4px">Form</th></tr></thead>
      <tbody>${rows.map((row, i) => {
        const gd = (row.gf || 0) - (row.ga || 0)
        const form = teamForm(rbr, row.name, round, 5)
        const edge = seedEdge(i + 1)
        const isLeader = i === 0
        // Village identity chip — rivals show their fixed identity; player shows philosophy-driven style.
        const idn = row.name === G.vName ? null : identityFor(row.name)
        const st = idn ? MATCH_STYLES[idn.style] : null
        const idTag = st ? ` <span title="${idn.label} — ${idn.blurb} Style: ${st.label} — ${st.desc}" style="font-size:7px;color:#7a7060;cursor:help">${st.icon}${st.label}</span>` : ''
        return `<tr style="${row.name === G.vName ? 'color:#c9a84c;font-weight:bold' : 'color:#9a9080'}">
        <td style="padding:2px 4px">${i + 1}</td><td>${isLeader ? '👑 ' : ''}${row.name}${row.name === G.vName ? ' (you)' : ''}${idTag}</td>
        <td style="text-align:center">${row.w}</td><td style="text-align:center">${row.d}</td><td style="text-align:center">${row.l}</td>
        <td style="text-align:center;color:${gd > 0 ? '#8fbc8f' : gd < 0 ? '#cc5a4a' : '#7a7060'}">${gd > 0 ? '+' : ''}${gd}</td>
        <td style="text-align:center;color:#e8e0cc">${row.pts}</td>
        <td style="text-align:center;color:${edge > 0 ? '#c9a84c' : '#555'}">${edge > 0 ? '+' + edge + '%' : '—'}</td>
        <td style="text-align:right;padding-right:4px;white-space:nowrap">${_formPips(form)}</td></tr>`
      }).join('')}</tbody>
    </table>
    <div style="font-size:7px;color:#555;margin-top:5px"><span style="color:#c9a84c">Edge</span> = combat bonus your seed carries into the year-end Grand Tournament — finish higher, fight from strength.${G._seasonFormBonus ? ` Last month's mission form: <span style="color:${G._seasonFormBonus > 0 ? '#8fbc8f' : '#f88'}">${G._seasonFormBonus > 0 ? '+' : ''}${G._seasonFormBonus}</span> to your fixture.` : ''}</div>
  </div>`
}

// Latest matchday results — every fixture with its stylised scoreline + the
// stand-out result of the round (biggest margin), so the season has a pulse.
function _seasonResultsCard(round, resultsByRound, playerName) {
  const lastPlayed = round - 1
  const rr = resultsByRound[lastPlayed]
  if (!rr || !rr.length) return ''
  // Stand-out: the fixture with the biggest decisive margin this round.
  let star = null
  rr.forEach(m => { if (m.winner != null) { const mg = Math.abs((m.scoreA || 0) - (m.scoreB || 0)); if (!star || mg > star.mg) star = { m, mg } } })
  const line = m => {
    const me = m.a === playerName || m.b === playerName
    const aWon = m.winner === m.a, bWon = m.winner === m.b
    return `<div style="display:flex;align-items:center;gap:8px;font-size:8px;padding:3px 6px;background:${me ? 'rgba(201,168,76,.06)' : 'transparent'};border-left:2px solid ${me ? '#c9a84c' : 'transparent'}">
      <span style="flex:1;text-align:right;color:${m.a === playerName ? '#c9a84c' : aWon ? '#e8e0cc' : '#8a8276'};font-weight:${m.a === playerName || aWon ? 'bold' : 'normal'}">${m.a}</span>
      <span style="font-family:'Courier New',monospace;color:#c9a84c;min-width:30px;text-align:center">${m.scoreA ?? '·'}–${m.scoreB ?? '·'}</span>
      <span style="flex:1;color:${m.b === playerName ? '#c9a84c' : bWon ? '#e8e0cc' : '#8a8276'};font-weight:${m.b === playerName || bWon ? 'bold' : 'normal'}">${m.b}</span>
    </div>`
  }
  const playerInRound = rr.some(m => m.a === playerName || m.b === playerName)
  return `<div style="border:1px solid #2e2a22;background:#0a0a0a;padding:9px;margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase">Matchday ${lastPlayed + 1} — Results</div>
      <div style="display:flex;align-items:center;gap:8px">
        ${star ? `<div style="font-size:7px;color:#7a7060">★ Result of the round: <span style="color:#e8e0cc">${star.m.winner} ${Math.max(star.m.scoreA, star.m.scoreB)}–${Math.min(star.m.scoreA, star.m.scoreB)}</span></div>` : ''}
        ${playerInRound ? `<button class="gb" style="font-size:7px;padding:2px 8px;border-color:#c9a84c;color:#c9a84c" onclick="watchMatchday()">▶ Watch your match</button>` : ''}
      </div>
    </div>
    <div style="display:grid;gap:2px">${rr.map(line).join('')}</div>
  </div>`
}

function _renderExamSetup(el, tabHtml) {
  const isHost = G.examHosting === true
  const fmt_ = G.examFormat
  const hostInfo = _hostBidCard(isHost)
  const formatBanner = fmt_
    ? `<div style="padding:8px 10px;border:1px solid #c9a84c;background:#0d0a04;margin-bottom:10px">
        <div style="font-size:9px;color:#c9a84c;font-weight:bold">${fmt_.icon} Exam Format: ${fmt_.n}</div>
        <div style="font-size:8px;color:#7a7060;margin-top:3px">${fmt_.desc}</div>
        <div style="font-size:8px;color:#8fbc8f;margin-top:3px">Bonus: Nominees strong in <b>${fmt_.bonusStats.join(', ')}</b> gain +15% performance.</div>
      </div>`
    : `<div style="font-size:8px;color:#555;margin-bottom:8px">Format will be revealed when you start.</div>`
  const seasonCard = _seasonStandingsCard()
  if (!G.examSched) {
    el.innerHTML = tabHtml + hostInfo + formatBanner + seasonCard + '<div style="color:#7a7060;font-size:10px">No exam scheduled.<br><br><button class="gb" onclick="schEx()">Request exam</button></div>'
    return
  }
  // Squads are the competitors — compositions, cohesion and formation all matter.
  const maxCands = 12  // up to 36 nominees (12 three-ninja squads)
  const squads = (G.squads || []).map(sq => {
    const members = (sq.members || []).map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
    return { sq, members }
  }).filter(o => o.members.length && o.members.every(s => s.status === 'available'))
  // Quick-form: how many spare promotable trios could be drafted into cells right now.
  const spareCells = groupIntoCells(_freeAcademyPool(), 3).length
  const quickFormBtn = spareCells > 0
    ? `<button class="gb" onclick="quickFormExamCells()" style="font-size:8px;padding:3px 8px;border-color:#8fbc8f;color:#8fbc8f;margin-bottom:10px">✚ Quick-form ${spareCells} academy cell${spareCells === 1 ? '' : 's'} & nominate</button>
       <div style="font-size:7px;color:#5a5448;margin-bottom:12px">Drafts your spare Initiate/Adept prospects into three-ninja cells and nominates them — no need to build squads first.</div>`
    : ''
  el.innerHTML = tabHtml + hostInfo + formatBanner + seasonCard +
    `<div style="font-size:9px;color:#7a7060;margin-bottom:12px">Nominate squads (max ${maxCands}). All members must be available. Promotable members (Initiate/Adept) earn promotion by advancing deep. Squads that reach the final build lasting cohesion.</div>` +
    quickFormBtn +
    '<div style="margin-bottom:12px">' +
    (squads.length ? squads.map(({ sq, members }) => {
      const ent = G.examCands.includes(sq.id)
      const fmtMatch = fmt_ && members.some(s => fmt_.bonusStats.some(k => (s.stats[k] || 0) >= 35))
      const promotable = members.filter(s => s.ri <= 1).length
      const harmony = elementalHarmony(members.map(s => s.element))
      const harmonyTag = harmony.bonus > 0 ? ` <span title="Coherent chakra natures — +${harmony.bonus} cohesion after the exam" style="color:#87ceeb;font-size:8px">◈ ${harmony.label}</span>` : ''
      return `<div class="pi" onclick="tEC('${sq.id}')" style="${ent ? 'border-color:#c9a84c;background:rgba(201,168,76,0.08)' : ''}"><div><div style="font-size:10px;color:#e8e0cc">${sq.n}${sq.identity ? ` <span style="color:#c9a84c;font-size:8px">«${sq.identity.title}»</span>` : ''}${fmtMatch ? ' <span style="color:#8fbc8f;font-size:8px">★ format match</span>' : ''}${harmonyTag}</div><div style="font-size:8px;color:#7a7060">${members.length} ninja · Pwr ${_squadPow(members, sq.cohesion)} · cohesion ${sq.cohesion ?? 0} · ${promotable} promotable</div><div style="font-size:7px;color:#5a5448">${members.map(s => sn(s) + ' (' + RANKS[s.ri][0] + ')').join(', ')}</div></div>${ent ? '<span style="color:#c9a84c">✓</span>' : ''}</div>`
    }).join('') : '<div style="color:#7a7060;font-size:9px">No eligible squads. Build a squad in the Squads panel (all members must be available).</div>') +
    '</div>' +
    (G.examCands.length ? '<button class="gb" onclick="startEx()">Start Exam ►</button>' : '') +
    ((G._examRun && G._examRun.stages && G._examRun.stages.length)
      ? `<div style="margin-top:14px"><button class="gb" style="font-size:7px;padding:2px 8px;border-color:#c9a84c;color:#c9a84c" onclick="watchExam()">▶ Watch your exam run</button></div>` : '') +
    (G.examResults.length ? '<div style="margin-top:14px;font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:7px">Recent Results</div>' + G.examResults.slice(-10).map(r => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${r.promoted ? '#8fbc8f' : '#7a7060'}">${r.name}: ${r.result}${r.promoted ? ' → Promoted!' : ''}</div>`).join('') : '')
}

export function tEC(id) {
  const maxCands = 8  // max nominated squads (24 ninja)
  if (G.examCands.includes(id)) G.examCands = G.examCands.filter(x => x !== id)
  else if (G.examCands.length < maxCands) G.examCands.push(id)
  rEx()
}

// Available promotable shinobi (Initiate/Adept) not already committed to a squad —
// the pool the exam's quick-form path drafts three-ninja academy cells from.
function _freeAcademyPool() {
  return G.shinobi
    .filter(s => s.ri <= 1 && s.status === 'available' && !(G.squads || []).some(q => q.members.includes(s.id)))
    .sort((a, b) => sPow(b) - sPow(a))
}

// One-click: draft the free promotable pool into three-ninja cells, register them as
// real squads, and nominate them. Lets the whole exam (nominate → start → run) be
// driven from this panel without first building squads elsewhere. Strongest-first so
// the auto-cells are balanced rather than lopsided.
export function quickFormExamCells() {
  const maxCands = 8
  const room = maxCands - G.examCands.length
  if (room <= 0) { ntf(t('toast.exam.addCandidates')); return }
  const cells = groupIntoCells(_freeAcademyPool(), 3).slice(0, room)
  if (!cells.length) { ntf('No spare Initiate/Adept trios available to form a cell.'); return }
  let formed = 0
  cells.forEach((members, i) => {
    const leader = members.slice().sort((a, b) => b.ri - a.ri || sPow(b) - sPow(a))[0]
    const sq = { id: Math.random().toString(36).slice(2), n: `Academy Cell ${(G.squads || []).length + 1}`, leaderId: leader.id, members: members.map(s => s.id), cohesion: 0, autoFormed: true }
    G.squads.push(sq)
    members.forEach(s => { s.squadId = sq.id })
    if (G.examCands.length < maxCands) { G.examCands.push(sq.id); formed++ }
  })
  aL(`Formed ${formed} academy cell${formed === 1 ? '' : 's'} from available prospects and nominated them for the exam.`, 'neutral')
  rEx(); upUI()
}

// Stage labels — now framed as a competitive bracket.
export const EXAM_STAGES = ['Qualifier — Written Test', 'Quarterfinal — Forest of Death', 'Semifinal — Preliminary Duels', 'Final — Championship']

// Per-stage posture the player sets before each round — a real risk/reward dial.
export const EXAM_POSTURES = [
  { id: 'push',     label: 'Push Hard', icon: '⚔', adv: 0.10,  woundMod: 0.12,  workload: 8,  desc: '+10% advance, but more wounds & fatigue on your shinobi.' },
  { id: 'steady',   label: 'Steady',    icon: '⚖', adv: 0,     woundMod: 0,     workload: 0,  desc: 'Balanced — no edge, no extra cost.' },
  { id: 'conserve', label: 'Conserve',  icon: '🛡', adv: -0.06, woundMod: -0.20, workload: -6, desc: '−6% advance, but protects your shinobi (fewer wounds, rest).' },
]
function _posture() { return EXAM_POSTURES.find(p => p.id === (ui.exSt?.posture || 'steady')) || EXAM_POSTURES[1] }
// Player squads express tendencies via posture orders; rival squads play to their
// village identity across the bracket (blitz starts hot/fades, opportunist peaks late...).
function _postureAdv(c, kind = 'early') {
  if (c.isPlayer) return _posture().adv + kageMod(G, 'tactics')
  return identityStageAdv(identityFor(c.vid || '').style, kind)
}
// Apply posture fatigue/rest to a player squad's members (called when they advance).
function _applyPostureWorkload(c) {
  if (!c.isPlayer) return
  const w = _posture().workload
  if (!w) return
  ;(c.members || []).forEach(s => { if (s) s.workload = clamp((s.workload || 0) + w, 0, 100) })
}

export function setExamPosture(id) { if (ui.exSt) { ui.exSt.posture = id; rEx() } }

// R6: host-bidding card shown above the exam setup. Eligible villages (prestige C+)
// bid ryo for hosting rights — home-crowd edge (already wired) + gate revenue.
function _hostBidCard(isHost) {
  if (isHost) return `<div style="font-size:9px;color:#8fbc8f;margin-bottom:8px">🏠 Hosting this exam — home-crowd edge + gate revenue active</div>`
  // Bidding only offered while an exam is scheduled and not yet resolved.
  if (!G.examSched || G.examHostResolved) return `<div style="font-size:9px;color:#7a7060;margin-bottom:8px">Away exam</div>`
  const tier = G.prestigeTier
  if (!isHostEligible(tier)) return `<div style="font-size:9px;color:#7a7060;margin-bottom:8px">Away exam — hosting needs prestige C or higher.</div>`
  const min = minHostBid(tier)
  const suggested = Math.max(min, ui._hostBid || min)
  return `<div style="padding:9px 11px;border:1px solid #c9a84c;background:#0d0a04;margin-bottom:10px">
    <div style="font-size:9px;color:#c9a84c;font-weight:bold;margin-bottom:4px">🏛 Bid to Host the Adept Exam</div>
    <div style="font-size:8px;color:#7a7060;margin-bottom:6px">Win hosting rights for a home-crowd edge across the bracket and <b style="color:#8fbc8f">${(hostRevenue(tier)).toLocaleString()} ryo</b> gate revenue. Rival villages bid too — outbid them. Min bid ${min.toLocaleString()}.</div>
    <div style="display:flex;gap:6px;align-items:center">
      <input id="host-bid-input" type="number" value="${suggested}" min="${min}" step="1000" style="width:110px;background:#111;border:1px solid #333;color:#e8d5a3;font-size:9px;padding:3px 5px">
      <button class="gb" onclick="bidToHostExam()" ${(G.ryo || 0) >= min ? '' : 'disabled'}>Bid ▸</button>
      <button class="gb" onclick="declineHostBid()" style="color:#7a7060">Decline</button>
    </div>
  </div>`
}

export function declineHostBid() { G.examHostResolved = true; rEx() }

export function bidToHostExam() {
  const inp = document.getElementById('host-bid-input')
  const tier = G.prestigeTier
  const min = minHostBid(tier)
  const amount = Math.max(min, parseInt(inp?.value || min, 10) || min)
  if ((G.ryo || 0) < amount) { ntf('Not enough ryo for that bid.'); return }
  const rivalBids = genRivalHostBids(G.villages || [])
  const res = hostBidResolve(amount, rivalBids, tier)
  G.examHostResolved = true
  if (res.won) {
    G.ryo -= amount
    G.examHosting = true
    aL(`Won hosting rights for the Adept Exam with a ${amount.toLocaleString()} ryo bid (top rival: ${res.topRival.toLocaleString()}).`, 'good')
    ntf('You will host the Adept Exam — home advantage secured.')
  } else {
    aL(`Outbid for hosting rights — a rival's ${res.topRival.toLocaleString()} ryo bid beat your ${res.playerEffective.toLocaleString()} effective bid. No ryo spent.`, 'warn')
  }
  rEx(); upUI()
}

// Squad power = average member power, lifted by cohesion (rewards squad-building).
function _squadPow(members, cohesion = 0) {
  return squadPower(members.map(s => sPow(s)), cohesion)
}
// A squad's elemental makeup — resolves a squad-id to its members' chakra natures.
function _squadHarmony(sq) {
  const members = (sq?.members || []).map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
  return elementalHarmony(members.map(s => s.element))
}
// Average of a stat across a squad's members.
function _avgStat(c, k) {
  return avgStat((c.members || []).map(s => s.stats?.[k] || 0))
}
// Format bonus if any member is strong in the format's stats.
function _squadFormatBonus(c) {
  const fmt_ = G.examFormat
  if (!fmt_) return 0
  return (c.members || []).some(s => fmt_.bonusStats.some(k => (s.stats?.[k] || 0) >= 35)) ? 0.15 : 0
}

// A rival village fields up to 3 three-initiate cells drawn from its roster.
function _rivalSquads(v) {
  const pool = (v.roster || []).filter(s => s.ri <= 1).slice().sort(() => Math.random() - 0.5)
  const squads = []
  for (let i = 0; i + 3 <= pool.length && squads.length < 8; i += 3) {
    const members = pool.slice(i, i + 3)
    squads.push({ id: 'rs_' + v.n + '_' + squads.length, name: v.n + ' Cell ' + (squads.length + 1), members })
  }
  return squads
}

// Build the full tournament field: player village + every rival village.
function _buildExamField() {
  // Seeds earned from the season standings — top seeds get a qualifier edge.
  const seeds = G.season?.table ? seedsFromTable(G.season.table) : {}
  const nVillages = (G.villages?.length || 0) + 1
  const seedBonus = name => {
    return seedEdge(seeds[name], nVillages)  // top seed +0.10 → bottom +0
  }
  const playerEntry = {
    vid: 'player', name: G.vName, ico: G.vIcon, isPlayer: true, seed: seeds[G.vName] || null,
    alive: G.examCands.map(sqId => {
      const sq = G.squads.find(q => q.id === sqId); if (!sq) return null
      const members = (sq.members || []).map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
      if (!members.length) return null
      return { id: sqId, name: sq.n, members, pow: _squadPow(members, sq.cohesion), isPlayer: true, seedBonus: seedBonus(G.vName), stageReached: 0 }
    }).filter(Boolean),
    out: [],
  }
  const rivalEntries = (G.villages || []).map(v => ({
    vid: v.n, name: v.n, ico: v.ico, isPlayer: false, seed: seeds[v.n] || null,
    alive: _rivalSquads(v).map(sq => ({ id: sq.id, name: sq.name, members: sq.members, pow: _squadPow(sq.members, rnd(0, 30)), isPlayer: false, seedBonus: seedBonus(v.n), vid: v.n })),
    out: [],
  }))
  return [playerEntry, ...rivalEntries]
}

export function startEx() {
  if (!G.examCands.length) { ntf(t('toast.exam.addCandidates')); return }
  // Assign exam format if not already set
  if (!G.examFormat) G.examFormat = pk(EXAM_FORMATS)
  // Assign judge from a rival village (potential bias)
  const judge = pk(G.villages || [{ n: 'Neutral Panel' }])
  const isRival = judge && (judge.rel || 50) < 40
  G.examJudgeBias = isRival
    ? { villageName: judge.n, biasMod: rnd(5, 10) / 100, isBiased: true }
    : { villageName: judge.n, biasMod: 0, isBiased: false }
  G.examJudgeProtested = false
  G.examActive = true
  ui.exSt = { round: 0, field: _buildExamField(), sabotaged: false }
  G._examRun = { year: G.year, stages: [], champion: false }   // live-viewer recap bookkeeping
  // Mark every nominated squad's members as committed to the exam.
  G.examCands.forEach(sqId => {
    const sq = G.squads.find(q => q.id === sqId); if (!sq) return
    sq.members.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) s.status = 'exam' })
  })
  rEx(); upUI()   // upUI refreshes the Continue button to its blocked (exam-active) state
}

function _formatBonus(s) {
  const fmt_ = G.examFormat
  if (!fmt_) return 0
  return fmt_.bonusStats.some(k => (s.stats[k] || 0) >= 35) ? 0.15 : 0
}

function rExA(el, tabHtml) {
  const r = ui.exSt.round
  const field = ui.exSt.field || []
  const bias = G.examJudgeBias
  const biasWarning = bias?.isBiased && !G.examJudgeProtested && r === 3
    ? `<div style="padding:7px;border:1px solid #f0a030;background:#0d0a04;margin-bottom:8px;font-size:8px;color:#f0a030">⚠ Judge from ${bias.villageName} (rival) — nominee scores lowered by ${Math.round(bias.biasMod * 100)}%. <button class="gb" onclick="protestJudge()" style="font-size:7px;margin-left:8px;border-color:#f0a030;color:#f0a030">File Protest (costs 5 prestige) ▸</button></div>`
    : ''
  // Standings: villages still in contention, sorted by survivor count.
  const standing = field.filter(e => e.alive.length > 0)
    .sort((a, b) => b.alive.length - a.alive.length || b.alive.reduce((x, c) => x + c.pow, 0) - a.alive.reduce((x, c) => x + c.pow, 0))
  const totalAlive = field.reduce((a, e) => a + e.alive.length, 0)
  el.innerHTML = tabHtml + biasWarning + `<div style="background:#0d0d0d;border:1px solid #c9a84c;padding:14px">
    <div style="font-size:8px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">${EXAM_STAGES[r] || 'Final'}</div>
    ${G.examFormat ? `<div style="font-size:8px;color:#7a7060;margin-bottom:8px">${G.examFormat.icon} Format: ${G.examFormat.n} — format-matched nominees get +15%</div>` : ''}
    <div style="font-size:8px;color:#7a7060;margin-bottom:8px">${standing.length} villages in contention · ${totalAlive} squads remaining</div>
    <div style="display:grid;gap:8px;margin-bottom:10px">
      ${standing.map((e, i) => `<div style="border:1px solid ${e.isPlayer ? '#c9a84c' : '#2e2a22'};padding:7px;background:${e.isPlayer ? 'rgba(201,168,76,0.06)' : '#0a0a0a'}">
        <div style="font-size:9px;color:${e.isPlayer ? '#c9a84c' : '#9a9080'};margin-bottom:4px">${i === 0 ? '◆ ' : ''}${e.seed ? `<span style="color:#7a7060">#${e.seed}</span> ` : ''}${e.ico || '🏳'} ${e.name}${e.isPlayer ? ' (you)' : ''} <span style="color:#7a7060">— ${e.alive.length} alive${e.scrolls != null ? ` · ${e.scrolls} 📜` : ''}</span></div>
        ${e.alive.map(c => `<div style="font-size:8px;padding:2px 0;color:${c.isPlayer ? '#e8e0cc' : '#7a7060'}">${c.name} · ${(c.members || []).length}-ninja · Pwr ${c.pow}${c._wounded ? ' <span style="color:#f88">⚕ wounded</span>' : ''}${_squadFormatBonus(c) > 0 ? ' <span style="color:#8fbc8f">★+15%</span>' : ''}</div>`).join('')}
      </div>`).join('')}
    </div>
    <div style="margin:10px 0 8px">
      <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:4px">Stage Posture — your squads only</div>
      <div style="display:flex;gap:5px">
        ${EXAM_POSTURES.map(p => {
          const sel = (ui.exSt.posture || 'steady') === p.id
          return `<div onclick="setExamPosture('${p.id}')" title="${p.desc}" style="flex:1;text-align:center;padding:5px 4px;cursor:pointer;border:1px solid ${sel ? '#c9a84c' : '#2e2a22'};background:${sel ? 'rgba(201,168,76,.10)' : 'transparent'}">
            <div style="font-size:12px">${p.icon}</div>
            <div style="font-size:8px;color:${sel ? '#c9a84c' : '#9a9080'};font-weight:${sel ? 'bold' : 'normal'}">${p.label}</div>
            <div style="font-size:6px;color:#555;margin-top:1px">${p.adv > 0 ? '+' : ''}${Math.round(p.adv * 100)}% adv</div>
          </div>`
        }).join('')}
      </div>
    </div>
    ${!ui.exSt.sabotaged && r === 1 ? `<button class="btn" onclick="sabotageSquad()" style="font-size:9px;margin-bottom:8px;color:#f88">Sabotage a rival squad (risk relations)</button> ` : ''}
    <button class="gb" onclick="runRound()">Run ${EXAM_STAGES[r] ? EXAM_STAGES[r].split(' — ')[0] : 'Round'} ►</button>
  </div>`
}

export function protestJudge() {
  if (!G.examJudgeBias?.isBiased || G.examJudgeProtested) return
  // Protest costs prestige (legend points) and has 50% chance of overturning
  if ((G.legend || 0) < 5) { ntf(t('toast.exam.needLegendProtest')); return }
  G.legend = Math.max(0, G.legend - 5)
  G.examJudgeProtested = true
  if (Math.random() < 0.5) {
    G.examJudgeBias.biasMod = 0
    G.examJudgeBias.isBiased = false
    aL(t('toast.exam.protestUpheld'), 'good')
  } else {
    aL(t('toast.exam.protestRejected'), 'warn')
  }
  rEx()
}

export function sabotageSquad() {
  if (!ui.exSt || ui.exSt.sabotaged) return
  ui.exSt.sabotaged = true
  const rivals = (ui.exSt.field || []).filter(e => !e.isPlayer && e.alive.length > 0)
  if (rivals.length) {
    const target = pk(rivals)
    const removed = target.alive.pop()
    if (removed) target.out.push(removed)
    if (Math.random() < 0.4) {
      const v = (G.villages || []).find(x => x.n === target.vid)
      if (v) v.rel = clamp((v.rel || 50) - 8, 0, 100)
      aL(t('toast.exam.sabotageDiscovered', { name: target.name }), 'warn')
    } else {
      aL(t('toast.exam.sabotageUndetected', { name: target.name }), 'neutral')
    }
  }
  rEx()
}

// Credit each still-standing player squad with surviving another bracket round —
// drives the per-stage cohesion drip settled at cleanup. Call after a round resolves
// (elimination has already moved the fallen to entry.out, so only survivors bump).
function _bumpPlayerStages(field) {
  const pe = field.find(e => e.isPlayer); if (!pe) return
  pe.alive.forEach(c => { c.stageReached = (c.stageReached || 0) + 1 })
}

// Eliminate combatants from a village entry by a survival probability; logs player results.
function _stageSurvival(field, probFn, passLabel, failLabel, res) {
  field.forEach(entry => {
    const kept = []
    entry.alive.forEach(c => {
      const survived = Math.random() < probFn(c)
      if (survived) kept.push(c)
      else entry.out.push(c)
      if (c.isPlayer) res.push({ name: c.name, result: survived ? passLabel : failLabel, promoted: false, good: survived })
    })
    entry.alive = kept
  })
}

export function runRound() {
  const r = ui.exSt.round
  const field = ui.exSt.field
  const res = []
  const biasMod = (G.examJudgeBias?.isBiased && !G.examJudgeProtested) ? G.examJudgeBias.biasMod : 0

  if (r === 0) {
    // Qualifier — written test (intelligence for player, power proxy for rivals).
    // Seeds earned in the season standings add a survival edge here.
    _stageSurvival(field, c => {
      return examWrittenProb({ avgIntelligence: _avgStat(c, 'intelligence'), formatBonus: _squadFormatBonus(c), seedBonus: c.seedBonus || 0, postureAdv: _postureAdv(c, 'early') })
    }, 'Passed the written test', 'Failed the written test', res)
    field.forEach(e => e.alive.forEach(c => _applyPostureWorkload(c)))
  } else if (r === 1) {
    return _runForest(field, res)
  } else if (r === 2) {
    return _runSemifinal(field, res, biasMod)
  } else {
    return _runFinals(field, biasMod)
  }

  _bumpPlayerStages(field)
  ui.exSt.round++
  G.examResults.push(...res.map(x => ({ id: '', name: x.name, result: x.result, promoted: false })))
  _renderRoundOverlay(r, res, field)
}

// Apply a Forest-of-Death injury that carries into the real game after the exam.
// Mirrors adv.js applyInjury bookkeeping; status stays 'exam' until cleanup.
function _examInjure(s) {
  const pool = ['muscle', 'chakra', 'bone']
  const inj = INJURY_TYPES.find(t => t.id === pool[Math.floor(Math.random() * pool.length)]) || INJURY_TYPES[0]
  const medNinja = (G.staff || []).filter(st => st.role === 'medical').length
  let dur = rnd(inj.minMo, inj.maxMo)
  dur = Math.max(1, Math.round(dur - (s.pers?.effect?.injReduct || 0) - medNinja * 0.5))
  s.injDays = dur; s.injuryType = inj.id
  s.injuryCount = (s.injuryCount || 0) + 1
  if (!s.injuryHistory) s.injuryHistory = []
  s.injuryHistory.push({ year: G.year, month: G.month, type: inj.id, typeName: inj.n, duration: dur, treatment: 'exam' })
  return { n: inj.n, dur }
}

// Quarterfinal — Forest of Death: secure a scroll to advance; danger brings real injuries.
function _runForest(field, res) {
  const isHost = G.examHosting === true
  field.forEach(entry => {
    const kept = []
    entry.scrolls = 0
    entry.alive.forEach(c => {
      // Two contested phases: Navigation (speed/intel) then the Scroll Clash (taijutsu/ninjutsu).
      const navProb = examForestNavProb({ avgSpeed: _avgStat(c, 'speed'), avgIntelligence: _avgStat(c, 'intelligence'), hostBonus: (isHost && c.isPlayer ? 0.08 : 0), formatBonus: _squadFormatBonus(c), postureAdv: _postureAdv(c, 'endurance') })
      const navOk = Math.random() < navProb
      let clashOk = false
      if (navOk) {
        const clashProb = examForestClashProb({ avgTaijutsu: _avgStat(c, 'taijutsu'), avgNinjutsu: _avgStat(c, 'ninjutsu'), formatBonus: _squadFormatBonus(c), postureAdv: _postureAdv(c, 'endurance') })
        clashOk = Math.random() < clashProb
      }
      const survived = navOk && clashOk
      if (survived) { kept.push(c); entry.scrolls++; _applyPostureWorkload(c) } else entry.out.push(c)
      // Player squads risk a real injury — failing the scroll clash (combat) hurts most.
      let injNote = ''
      if (c.isPlayer) {
        const baseInj = survived ? 0.10 : (navOk ? 0.38 : 0.22)  // beaten in the clash is the bloodiest outcome
        const injChance = examInjuryChance(baseInj, _posture().woundMod)
        if (Math.random() < injChance && (c.members || []).length) {
          const victim = pk(c.members)
          if (victim) { const inj = _examInjure(victim); injNote = ` — ${sn(victim)} wounded: ${inj.n} (${inj.dur}mo)`; c._wounded = true }
        }
        const txt = survived ? 'Secured a scroll, advances'
                  : !navOk ? 'Lost in the forest — eliminated'
                  : 'Reached the clearing but lost the scroll clash — eliminated'
        res.push({ name: c.name, result: txt + injNote, promoted: false, good: survived })
      }
    })
    entry.alive = kept
  })
  _bumpPlayerStages(field)
  ui.exSt.round++
  G.examResults.push(...res.map(x => ({ id: '', name: x.name, result: x.result, promoted: false })))
  _renderRoundOverlay(1, res, field)
}

// Semifinal — seeded 1v1 duels across the whole field (best vs worst); named marquee matchups.
function _runSemifinal(field, res, biasMod) {
  const pool = []
  field.forEach(entry => entry.alive.forEach(c => pool.push({ c, entry })))
  pool.sort((a, b) => b.c.pow - a.c.pow)
  pool.forEach((p, i) => { p.seed = i + 1 })
  const effPow = c => c.pow * (1 + _squadFormatBonus(c)) - (c.isPlayer ? biasMod * 100 : 0)
    + (c.isPlayer ? _posture().adv * 60 : identityStageAdv(identityFor(c.vid || '').style, 'late') * 60)
  // Each duel contests a random discipline — a squad strong in it can upset higher raw power.
  const DISCIPLINES = [['taijutsu', 'Taijutsu'], ['ninjutsu', 'Ninjutsu'], ['genjutsu', 'Genjutsu'], ['speed', 'Speed'], ['intelligence', 'Tactics']]
  const duels = []
  const losers = new Set()
  let lo = 0, hi = pool.length - 1
  while (lo < hi) {
    const A = pool[lo], B = pool[hi]
    const [discKey, discName] = pk(DISCIPLINES)
    const discBonus = c => (_avgStat(c, discKey) - 30) * 0.6   // ±~30 swing — enough to flip a matchup
    const aScore = effPow(A.c) + discBonus(A.c) + rnd(-8, 8), bScore = effPow(B.c) + discBonus(B.c) + rnd(-8, 8)
    const aWins = aScore >= bScore
    const win = aWins ? A : B, lose = aWins ? B : A
    losers.add(lose.c)
    const margin = Math.abs(aScore - bScore)
    const marginLabel = margin < 5 ? 'narrow' : margin < 15 ? 'clear' : 'decisive'
    const upset = lose.seed < win.seed  // a higher seed (lower number) was beaten
    // Star squads fielding a village ace — the world's named threats show up here.
    const _hasAce = p2 => !p2.c.isPlayer && ((G.villages || []).find(v => v.n === p2.entry.name)?.aces || []).some(a => (p2.c.members || []).some(m => m.id === a.id))
    duels.push({
      winName: (_hasAce(win) ? '⭐ ' : '') + win.c.name, winVil: win.entry.name, winPlayer: !!win.c.isPlayer,
      loseName: (_hasAce(lose) ? '⭐ ' : '') + lose.c.name, loseVil: lose.entry.name, losePlayer: !!lose.c.isPlayer,
      marginLabel, upset, discipline: discName,
    })
    if (win.c.isPlayer) res.push({ name: win.c.name, result: `Won a ${marginLabel} ${discName} duel vs ${lose.c.name} (${lose.entry.name})`, promoted: false, good: true })
    if (lose.c.isPlayer) res.push({ name: lose.c.name, result: `Lost a ${marginLabel} ${discName} duel to ${win.c.name} (${win.entry.name})`, promoted: false, good: false })
    if (win.c.isPlayer && upset) {
      addChronicle('Semifinal Upset', `${win.c.name} upset the higher-seeded ${lose.c.name} of ${lose.entry.name} to reach the final.`, 'shinobi')
      addLegend(2)
    }
    lo++; hi--
  }
  const bye = (lo === hi) ? pool[lo] : null
  field.forEach(entry => {
    entry.out.push(...entry.alive.filter(c => losers.has(c)))
    entry.alive = entry.alive.filter(c => !losers.has(c))
    entry.alive.forEach(c => _applyPostureWorkload(c))
  })
  _bumpPlayerStages(field)
  ui.exSt.round++
  G.examResults.push(...res.map(x => ({ id: '', name: x.name, result: x.result, promoted: false })))
  _renderSemifinalOverlay(duels, bye, field)
}

function _renderSemifinalOverlay(duels, bye, field) {
  const villagesIn = field.filter(e => e.alive.length > 0).length
  const totalAlive = field.reduce((a, e) => a + e.alive.length, 0)
  document.getElementById('ef-c').innerHTML =
    `<div style="font-size:9px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">${EXAM_STAGES[2]}</div>` +
    `<div style="display:grid;gap:6px">` +
    (duels.length ? duels.map(d => `
      <div style="border:1px solid #2e2a22;padding:6px;background:#0a0a0a">
        <div style="font-size:9px">
          <span style="color:${d.winPlayer ? '#c9a84c' : '#8fbc8f'}">▲ ${d.winName}</span><span style="color:#555"> (${d.winVil})</span>
          <span style="color:#7a7060"> def. </span>
          <span style="color:${d.losePlayer ? '#f88' : '#7a7060'}">${d.loseName}</span><span style="color:#555"> (${d.loseVil})</span>
        </div>
        <div style="font-size:7px;color:#7a7060;margin-top:2px">${d.discipline ? `<span style="color:#9bc">${d.discipline}</span> · ` : ''}${d.marginLabel} decision${d.upset ? ' · <span style="color:#f0a030">UPSET</span>' : ''}</div>
      </div>`).join('') : '<div style="font-size:9px;color:#7a7060">No duels this round.</div>') +
    (bye ? `<div style="font-size:8px;color:#7a7060;padding:4px">${bye.c.name} (${bye.entry.name}) advances on a bye.</div>` : '') +
    `</div><div style="margin-top:8px;font-size:9px;color:#7a7060">${villagesIn} villages reach the final · ${totalAlive} finalists.</div>`
  document.getElementById('ov-examfight').classList.add('open'); upUI()
}

// Record the player's advancement through one exam stage for the recap viewer.
// Only records stages the player actually contested (stops at first elimination).
function _recordExamStage(r, field) {
  if (!G._examRun) return
  const stages = G._examRun.stages
  const entered = stages.length === 0 || stages[stages.length - 1].advanced
  if (!entered) return
  const pe = field.find(e => e.isPlayer)
  const name = (EXAM_STAGES[r] || 'Final').split(' — ')[0]
  stages.push({ name, advanced: !!pe && pe.alive.length > 0 })
}

function _renderRoundOverlay(r, res, field) {
  _recordExamStage(r, field)
  const villagesIn = field.filter(e => e.alive.length > 0).length
  const totalAlive = field.reduce((a, e) => a + e.alive.length, 0)
  document.getElementById('ef-c').innerHTML =
    `<div style="font-size:9px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">${EXAM_STAGES[r]}</div>` +
    (res.length
      ? res.map(x => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${x.good ? '#8fbc8f' : '#f66'}"><span style="color:#c9a84c">${x.name}</span> — ${x.result}</div>`).join('')
      : '<div style="font-size:9px;color:#7a7060">Your nominees saw no decisive action this stage.</div>') +
    `<div style="margin-top:8px;font-size:9px;color:#7a7060">${villagesIn} villages still in contention · ${totalAlive} squads advance.</div>`
  document.getElementById('ov-examfight').classList.add('open'); upUI()
}

function _runFinals(field, biasMod) {
  const res = []
  let examPromotions = 0

  // Promote members of player squads that reached the championship round.
  const playerEntry = field.find(e => e.isPlayer)
  ;(playerEntry?.alive || []).forEach(c => {
    (c.members || []).forEach(s => {
      if (!s || s.ri >= 4) return  // only Initiate→Shadow range is promotable here
      const hostBonus = G.examHosting ? 0.10 : 0
      const fmtB = _formatBonus(s)
      const prom = Math.random() < examPromotionChance({ hostBonus, formatBonus: fmtB, biasMod, postureAdv: _posture().adv })
      if (prom) {
        s.ri++; s.salary = 500 + s.ri * 400; examPromotions++
        G._kageXpPending = (G._kageXpPending || 0) + 8
        res.push({ name: sn(s), result: `Promoted to ${RANKS[s.ri]}! (${c.name})`, promoted: true })
        aL(sn(s) + ' promoted via Exam!' + (fmtB > 0 ? ' (format bonus applied)' : '') + (biasMod > 0 ? ' (judge bias penalised)' : ''), 'good')
        G.dynastyRecords.examWins = (G.dynastyRecords?.examWins || 0) + 1
        addLegend(5)
        addChronicle('Exam Promotion', `${sn(s)} of ${c.name} fought through the field of five villages and was promoted to ${RANKS[s.ri]}.`, 'shinobi')
      } else {
        res.push({ name: sn(s), result: `Reached the final with ${c.name}, not promoted.`, promoted: false })
      }
    })
  })

  // Crown the champion village — most finalists, tiebreak by combined power.
  const finalists = field.filter(e => e.alive.length > 0)
    .map(e => ({ e, count: e.alive.length, pow: e.alive.reduce((a, c) => a + c.pow, 0) }))
    .sort((a, b) => b.count - a.count || b.pow - a.pow)
  const champ = finalists[0]?.e
  const playerWon = !!champ?.isPlayer

  if (G._examRun) {
    const stages = G._examRun.stages
    const entered = stages.length === 0 || stages[stages.length - 1].advanced
    const pe = field.find(e => e.isPlayer)
    if (entered) stages.push({ name: 'Final', advanced: !!pe && pe.alive.length > 0 })
    G._examRun.champion = playerWon
  }

  if (!G.examHistoricalRecords) G.examHistoricalRecords = { totalPromotions: 0, bestSingleExam: 0, examWinsByVillage: {} }
  if (champ) {
    G.examChampion = { year: G.year, village: champ.name, ico: champ.ico, player: playerWon }
    G.examHistoricalRecords.championsByVillage = G.examHistoricalRecords.championsByVillage || {}
    G.examHistoricalRecords.championsByVillage[champ.name] = (G.examHistoricalRecords.championsByVillage[champ.name] || 0) + 1
    if (playerWon) {
      G.examHistoricalRecords.championships = (G.examHistoricalRecords.championships || 0) + 1
      addLegend(15); G.reputation = clamp((G.reputation || 0) + 15, 0, 999)
      aL(t('toast.exam.won', { village: G.vName }), 'good')
      addChronicle('Exam Champion', `${G.vName} stood above all five villages to claim the Year ${G.year} Adept Exam championship.`, 'milestone')
      if (!G.pendingPress) queuePressConference('exam_win')
    } else {
      aL(t('toast.exam.lost', { champ: champ.name, village: G.vName }), 'neutral')
      addChronicle('Exam Champion', `${champ.name} claimed the Year ${G.year} Adept Exam championship.`, 'milestone')
      if (!G.pendingPress) queuePressConference('exam_loss')
    }
  }

  // Promotion records
  G.examHistoricalRecords.totalPromotions = (G.examHistoricalRecords.totalPromotions || 0) + examPromotions
  if (examPromotions > (G.examHistoricalRecords.bestSingleExam || 0)) {
    G.examHistoricalRecords.bestSingleExam = examPromotions
    G.examHistoricalRecords.bestSingleExamYear = G.year
  }

  // Upset — winning the title from a low prestige tier.
  const presOrd = { D: 0, C: 1, B: 2, A: 3, S: 4 }
  const myOrd = presOrd[G.prestigeTier || 'D'] || 0
  if (playerWon && myOrd <= 1) {
    const upsetDesc = `${G.vName} (${G.prestigeTier || 'D'}-tier) won the Adept Exam outright — a result far above expectations.`
    G.upsetHistory = G.upsetHistory || []
    G.upsetHistory.push({ year: G.year, desc: upsetDesc })
    addChronicle('Exam Upset', upsetDesc, 'milestone')
    aL(t('toast.exam.upset', { village: G.vName }), 'good')
    addLegend(8)
  }

  // Cleanup — restore squad-member statuses (wounds carry into the season) and reset exam state.
  // Also settle the exam's lasting squad-building reward: cells bond per bracket round they
  // survived (finalists most, champions further still). Read each cell's stageReached from
  // the field — it lives on the combatant whether it finished alive or was eliminated.
  const finalistSquadIds = new Set((playerEntry?.alive || []).map(c => c.id))
  const stagesById = {}
  ;[...(playerEntry?.alive || []), ...(playerEntry?.out || [])].forEach(c => { stagesById[c.id] = c.stageReached || 0 })
  const cohesionNotes = []
  const stageWord = ['out in the qualifier', 'through the qualifier', 'to the semifinal', 'to the final']
  let woundedCount = 0
  G.examCands.forEach(sqId => {
    const sq = G.squads.find(q => q.id === sqId); if (!sq) return
    const st = stagesById[sqId] || 0
    const harmony = _squadHarmony(sq)
    const gain = examCohesionGain({ stagesAdvanced: st, champion: finalistSquadIds.has(sqId) && playerWon }) + harmony.bonus
    sq.cohesion = clamp((sq.cohesion || 0) + gain, 0, 100)
    cohesionNotes.push({ name: sq.n, gain, cohesion: sq.cohesion, reach: stageWord[clamp(st, 0, 3)], harmony: harmony.bonus > 0 ? harmony.label : '' })
    sq.members.forEach(id => {
      const s = G.shinobi.find(x => x.id === id); if (!s) return
      s.missId = null
      if ((s.injDays || 0) > 0) { s.status = 'injured'; woundedCount++ } else s.status = 'available'
    })
  })
  if (woundedCount > 0) aL(t('toast.exam.wounded', { n: woundedCount }), 'warn')

  // The exam was the playoff — archive the final season table and start a fresh season.
  if (G.season?.table) {
    G.seasonHistory = G.seasonHistory || []
    G.seasonHistory.push({ year: G.year, champion: champ?.name || null, table: sortedTable(G.season.table) })
    const names = [G.vName, ...(G.villages || []).map(v => v.n)]
    G.season = { year: G.year, round: 0, table: initSeasonTable(names), lastResults: [] }
  }
  if (G.examHosting) { const rev = hostRevenue(G.prestigeTier); G.ryo += rev; aL(t('toast.exam.hostingIncome'), 'good'); G.examHosting = false }
  G.examHostResolved = false  // reopen bidding for the next exam cycle
  G.examFormat = null; G.examJudgeBias = null
  G.examResults.push(...res.map(x => ({ id: '', name: x.name, result: x.result, promoted: x.promoted })))
  G.examActive = false; G.examSched = false; G.examCands = []; ui.exSt = null
  schEx()

  const champLine = champ
    ? `<div style="font-size:11px;color:${playerWon ? '#c9a84c' : '#9a9080'};margin-bottom:10px">🏆 Champion: ${champ.ico || ''} ${champ.name}${playerWon ? ' (you)' : ''}</div>`
    : ''
  const cohesionBlock = cohesionNotes.length
    ? `<div style="margin-top:12px;font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Squad Cohesion Earned</div>` +
      cohesionNotes.map(n => `<div style="font-size:8px;padding:3px 0;border-bottom:1px solid #1e1a14;color:#9a9080"><span style="color:#e8e0cc">${n.name}</span> fought ${n.reach} — <span style="color:#8fbc8f">+${n.gain} cohesion</span> <span style="color:#5a5448">(now ${n.cohesion})</span>${n.harmony ? ` <span style="color:#87ceeb">· ${n.harmony}</span>` : ''}</div>`).join('')
    : ''
  document.getElementById('ef-c').innerHTML = champLine +
    '<div style="font-size:9px;color:#7a7060;margin-bottom:10px">Exam complete!</div>' +
    (res.length
      ? res.map(x => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${x.promoted ? '#8fbc8f' : '#e8e0cc'}"><span style="color:#c9a84c">${x.name}</span> — ${x.result}</div>`).join('')
      : '<div style="font-size:9px;color:#7a7060">Your nominees were eliminated before the final.</div>') +
    cohesionBlock
  document.getElementById('ov-examfight').classList.add('open'); upUI()
}

// ── Summit tab ────────────────────────────────────────────────────────────────
function _summitTab() {
  const history = G.summitHistory || []
  const bloc = G.summitBlocOffer

  let html = ''
  if (bloc) {
    html += `<div style="border:1px solid #87ceeb;background:#050d14;padding:10px;margin-bottom:14px">
      <div style="font-size:9px;color:#87ceeb;font-weight:bold;margin-bottom:4px">⚑ Voting Bloc Offer from ${bloc.villageName}</div>
      <div style="font-size:8px;color:#7a7060;margin-bottom:8px">${bloc.villageName} will vote with you on <b>${bloc.agendaItem}</b> at the upcoming summit. In return, you owe them a future diplomatic favor.</div>
      <div style="display:flex;gap:8px">
        <button class="gb gb-g" onclick="acceptSummitBloc()" style="font-size:8px">Align — Secure Their Vote ▸</button>
        <button class="gb" onclick="declineSummitBloc()" style="font-size:8px;border-color:#555;color:#555">Stay Independent ▸</button>
      </div>
    </div>`
  }
  if (!history.length) return html + '<div style="color:#555;font-size:11px;padding:20px 0">No summits held yet. First summit occurs in month 6 of Year 1.</div>'
  html += history.slice().reverse().map(s => `
    <div class="ke-card" style="margin-bottom:8px">
      <div style="font-size:10px;color:#c9a84c;margin-bottom:6px">Year ${s.year} Five Warden Summit${s.blocAligned ? ` <span style="font-size:8px;color:#87ceeb">[bloc: ${s.blocAligned}]</span>` : ''}</div>
      ${(s.results || []).map(r => `<div style="font-size:9px;padding:3px 0;border-bottom:1px solid #1a1a1a;color:${r.passed ? '#8fbc8f' : '#666'}">${r.passed ? '✓' : '✗'} ${r.item} ${r.myVote ? '(your vote: yes)' : '(your vote: no)'}</div>`).join('')}
    </div>`).join('')
  return html
}

export function acceptSummitBloc() {
  if (!G.summitBlocOffer) return
  G.pendingSummitFavor = { villageName: G.summitBlocOffer.villageName, agendaItem: G.summitBlocOffer.agendaItem }
  aL(t('toast.exam.allianceFormed', { village: G.summitBlocOffer.villageName, agenda: G.summitBlocOffer.agendaItem }), 'warn')
  G.summitBlocOffer = null
  rEx()
}

export function declineSummitBloc() {
  if (!G.summitBlocOffer) return
  aL(t('toast.exam.allianceDeclined', { village: G.summitBlocOffer.villageName }), 'neutral')
  G.summitBlocOffer = null
  rEx()
}

// ── S-rank bid tab ────────────────────────────────────────────────────────────
function _srankTab() {
  const contracts = G.sRankContracts || []
  if (!contracts.length) return '<div style="color:#555;font-size:11px;padding:20px 0">No S-rank contracts posted this season. New contracts post monthly (months 1, 4, 7, 10).</div>'
  const now = (G.year - 1) * 12 + G.month
  return `<div style="font-size:9px;color:#7a7060;margin-bottom:10px">Competitive S-rank contracts. Win to earn ryo, reputation, and legend.</div>
  <div style="display:grid;gap:8px">
    ${contracts.map(c => {
      const expired = now > c.deadline
      const won = c.winner === G.vName
      const myBid = c.bids?.find(b => b.village === G.vName)
      return `<div class="ke-card">
        <div style="font-size:11px;color:#e8e0cc;margin-bottom:6px">${c.n}</div>
        <div style="font-size:9px;color:#7a7060;margin-bottom:4px">Reward: ${fmt(c.baseRyo)} ryo · +${c.rep} rep · +${c.prestige} legend</div>
        <div style="font-size:9px;color:#7a7060;margin-bottom:8px">Risk: ${Math.round(c.risk * 100)}% failure chance · Deadline: M${c.deadline % 12 || 12}</div>
        ${won ? '<div style="font-size:10px;color:#8fbc8f;margin-bottom:6px">✓ Won this contract!</div>' : ''}
        ${expired && !won ? '<div style="font-size:9px;color:#555">Contract expired.</div>' : ''}
        ${!expired && !won && !myBid ? `<button class="gb" onclick="bidSrank('${c.id}')" style="font-size:9px">Submit Bid</button>` : ''}
        ${myBid ? `<div style="font-size:9px;color:#c9a84c">Bid submitted — awaiting result.</div>` : ''}
      </div>`
    }).join('')}
  </div>`
}

export function bidSrank(contractId) {
  const contract = (G.sRankContracts || []).find(c => c.id === contractId)
  if (!contract) return
  const now = (G.year - 1) * 12 + G.month
  if (now > contract.deadline) { ntf(t('toast.exam.contractExpired')); return }
  const elite = G.shinobi.filter(s => s.ri >= 3 && s.status === 'available')
  if (!elite.length) { ntf(t('toast.exam.needJonin')); return }
  const ourScore = elite.reduce((a, s) => a + sPow(s), 0) / elite.length + rnd(-5, 10)
  const npcScore = rnd(40, 70)
  contract.bids = contract.bids || []
  contract.bids.push({ village: G.vName, score: ourScore })
  if (ourScore >= npcScore) {
    contract.winner = G.vName
    const failed = Math.random() < contract.risk
    if (!failed) {
      G.ryo += contract.baseRyo; G.reputation = clamp(G.reputation + contract.rep, 0, 999); addLegend(contract.prestige)
      aL(t('toast.exam.srankDone', { name: contract.n, ryo: fmt(contract.baseRyo), rep: contract.rep }), 'good')
      addChronicle('S-Rank Contract', `${contract.n} completed. Our forces proved decisive. Village earns ${fmt(contract.baseRyo)} ryo.`, 'milestone')
    } else {
      G.ryo += Math.round(contract.baseRyo * 0.3); G.reputation = clamp(G.reputation - 10, 0, 999)
      aL(t('toast.exam.srankFailed', { name: contract.n }), 'bad')
    }
  } else {
    contract.winner = 'NPC'
    aL(t('toast.exam.srankLost', { name: contract.n }), 'neutral')
  }
  rEx()
}

// ── Exam records tab ──────────────────────────────────────────────────────────
function _recordsTab() {
  const rec = G.examHistoricalRecords || {}
  const upsets = G.upsetHistory || []
  const champ = G.examChampion
  const byV = rec.championsByVillage || {}
  const rows = [
    { label: 'Championships Won', value: rec.championships || 0 },
    { label: 'Career Exam Promotions', value: rec.totalPromotions || 0 },
    { label: 'Best Single Exam', value: rec.bestSingleExam ? `${rec.bestSingleExam} promotions (Year ${rec.bestSingleExamYear || '?'})` : '—' },
    { label: 'Dynasty Exam Wins', value: G.dynastyRecords?.examWins || 0 },
  ]
  const champLeaders = Object.entries(byV).sort((a, b) => b[1] - a[1])
  return `<div>
    ${champ ? `<div style="border:1px solid ${champ.player ? '#c9a84c' : '#2e2a22'};background:${champ.player ? '#0d0a04' : '#0a0a0a'};padding:10px;margin-bottom:12px">
      <div style="font-size:8px;color:#7a7060;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Reigning Champion (Year ${champ.year})</div>
      <div style="font-size:13px;color:${champ.player ? '#c9a84c' : '#e8e0cc'}">🏆 ${champ.ico || ''} ${champ.village}${champ.player ? ' — your village' : ''}</div>
    </div>` : ''}
    ${_seasonHistoryHtml()}
    <div style="font-size:10px;color:#c9a84c;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Historical Exam Records</div>
    <div style="display:grid;gap:4px;margin-bottom:14px">
      ${rows.map(r => `<div style="display:flex;justify-content:space-between;padding:5px 8px;background:#0a0a0a;border-radius:3px">
        <span style="font-size:9px;color:#7a7060">${r.label}</span>
        <span style="font-size:10px;color:#e8e0cc;font-weight:bold">${r.value}</span>
      </div>`).join('')}
    </div>
    ${champLeaders.length ? `<div style="font-size:10px;color:#c9a84c;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Championship Titles</div>
      <div style="display:grid;gap:3px;margin-bottom:14px">${champLeaders.map(([v, n]) => `<div style="display:flex;justify-content:space-between;padding:4px 8px;background:#0a0a0a;border-radius:3px"><span style="font-size:9px;color:${v === G.vName ? '#c9a84c' : '#7a7060'}">${v}${v === G.vName ? ' (you)' : ''}</span><span style="font-size:10px;color:#e8e0cc;font-weight:bold">${n}</span></div>`).join('')}</div>` : ''}
    ${upsets.length ? `<div style="font-size:10px;color:#f0a030;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Recorded Upsets</div>
      ${upsets.slice().reverse().map(u => `<div style="font-size:8px;color:#7a7060;padding:5px 8px;background:#0a0a0a;margin-bottom:4px;border-left:2px solid #f0a030">Year ${u.year}: ${u.desc}</div>`).join('')}` : '<div style="font-size:8px;color:#555">No upsets recorded yet — outperform expectations at D or C prestige to create one.</div>'}
  </div>`
}

// ── League leaders tab ────────────────────────────────────────────────────────
const _LEADER_COLS = [
  { key: 'name', label: 'Name', align: 'left', sortVal: s => `${s.fn} ${s.ln}`, render: s => `<span style="color:${s.isPlayer ? '#c9a84c' : '#e8e0cc'}">${s.fn || ''} ${s.ln || ''}</span>` },
  { key: 'village', label: 'Village', align: 'left', sortVal: s => s.village || '', render: s => `<span style="color:#7a7060">${s.village || ''}</span>` },
  { key: 'power', label: 'Pwr', align: 'center', sortVal: s => sPow(s), render: s => sPow(s) },
  { key: 'wins', label: 'Wins', align: 'center', sortVal: s => s.wins || 0, render: s => `<b style="color:#8fbc8f">${s.wins || 0}</b>` },
  { key: 'winsS', label: 'S-Rank', align: 'center', sortVal: s => s.winsS || 0, render: s => s.winsS || 0 },
  { key: 'age', label: 'Age', align: 'center', sortVal: s => s.age || 0, render: s => s.age || '?' },
]
export function exLeadersSort(key) { tblToggleSort('leaders', key, { key: 'wins', dir: 'desc' }); rEx() }

function _leadersTab() {
  const allShinobi = [
    ...G.shinobi.map(s => ({ ...s, village: G.vName, isPlayer: true })),
    ...(G.villages || []).flatMap(v => (v.roster || []).map(s => ({ ...s, village: v.n, isPlayer: false })))
  ]
  const sort = tblSort('leaders', { key: 'wins', dir: 'desc' })
  const rows = tblSortRows(allShinobi, sort, _LEADER_COLS).slice(0, 15)
  const section = (title, rows) => `<div style="font-size:10px;color:#c9a84c;margin:12px 0 6px;text-transform:uppercase;letter-spacing:1px">${title}</div>${rows}`
  const leaderTable = `<table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#0a0908;border-bottom:1px solid #2e2a22">${tblHeaderHtml(_LEADER_COLS, sort, 'exLeadersSort')}</tr></thead>
    <tbody>${rows.map((s, i) => `<tr style="background:${i % 2 === 0 ? '#0f0e0c' : '#000'};border-bottom:1px solid #111">
      ${_LEADER_COLS.map(c => `<td style="padding:4px 6px;font-size:9px;text-align:${c.align};color:#e8e0cc">${c.render(s)}</td>`).join('')}
    </tr>`).join('')}</tbody>
  </table>`
  return `<div>
    <div style="font-size:7px;color:#3a3630;margin-bottom:4px">League leaders — click a column to sort</div>
    ${leaderTable}
    ${G.seasonAwards && Object.keys(G.seasonAwards).length ? (() => {
      const lastYear = Math.max(...Object.keys(G.seasonAwards).map(Number))
      const awards = G.seasonAwards[lastYear]
      if (!awards) return ''
      return section('Year ' + lastYear + ' awards', Object.values(awards).filter(a => a?.name).map(a =>
        `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:#0a0a0a;border-radius:3px;margin-bottom:3px">
          <span style="font-size:9px;color:#e8e0cc">${a.label}</span>
          <span style="font-size:9px;color:#c9a84c">${a.name}</span>
        </div>`).join(''))
    })() : ''}
  </div>`
}
