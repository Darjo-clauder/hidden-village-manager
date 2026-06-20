import { G, ui, sPow, rnd, sn, pk, clamp, fmt, addChronicle, addLegend, computeMarketValue } from '../state.js'
import { RANKS, EXAM_FORMATS, PRESTIGE_TIERS, LEGACY_DECISIONS, INJURY_TYPES } from '../constants.js'
import { aL, ntf, upUI, schEx } from '../ui.js'
import { initSeasonTable, sortedTable, seedsFromTable } from '../../../shared/utils/season.js'

window._exTab = 'exam'

export function rEx() {
  const el = document.getElementById('exl')
  if (!el) return
  const tabs = ['exam', 'summit', 'srank', 'records']
  const tabHtml = `<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${tabs.map(t => `<button class="btn${window._exTab === t ? ' act' : ''}" onclick="exTab('${t}')" style="font-size:9px;padding:3px 8px">${t === 'exam' ? 'CHUNIN EXAM' : t === 'summit' ? 'SUMMIT' : t === 'srank' ? 'S-RANK BIDS' : 'RECORDS'}</button>`).join('')}
  </div>`
  if (window._exTab === 'summit') { el.innerHTML = tabHtml + _summitTab(); return }
  if (window._exTab === 'srank') { el.innerHTML = tabHtml + _srankTab(); return }
  if (window._exTab === 'records') { el.innerHTML = tabHtml + _recordsTab(); return }
  el.innerHTML = tabHtml
  if (G.examActive) { rExA(el, tabHtml); return }
  _renderExamSetup(el, tabHtml)
}

export function exTab(t) { window._exTab = t; rEx() }

// Season standings card — the league race that seeds the exam bracket.
function _seasonStandingsCard() {
  if (!G.season?.table) return ''
  const rows = sortedTable(G.season.table)
  if (!rows.length) return ''
  return `<div style="border:1px solid #2e2a22;background:#0a0a0a;padding:9px;margin-bottom:10px">
    <div style="font-size:8px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:6px">Season Standings — seeds the bracket</div>
    <table style="width:100%;border-collapse:collapse;font-size:8px">
      <thead><tr style="color:#7a7060;text-align:left"><th style="padding:1px 4px">#</th><th>Village</th><th style="text-align:center">W</th><th style="text-align:center">D</th><th style="text-align:center">L</th><th style="text-align:right;padding-right:4px">Pts</th></tr></thead>
      <tbody>${rows.map((row, i) => `<tr style="${row.name === G.vName ? 'color:#c9a84c;font-weight:bold' : 'color:#9a9080'}">
        <td style="padding:2px 4px">${i + 1}</td><td>${row.name}${row.name === G.vName ? ' (you)' : ''}</td>
        <td style="text-align:center">${row.w}</td><td style="text-align:center">${row.d}</td><td style="text-align:center">${row.l}</td>
        <td style="text-align:right;padding-right:4px;color:#e8e0cc">${row.pts}</td></tr>`).join('')}</tbody>
    </table>
    <div style="font-size:7px;color:#555;margin-top:5px">Top seeds carry a survival edge into the Qualifier.${G._seasonFormBonus ? ` Last month's mission form: <span style="color:${G._seasonFormBonus > 0 ? '#8fbc8f' : '#f88'}">${G._seasonFormBonus > 0 ? '+' : ''}${G._seasonFormBonus}</span> to your fixture.` : ''}</div>
  </div>`
}

function _renderExamSetup(el, tabHtml) {
  const isHost = G.examHosting === true
  const fmt_ = G.examFormat
  const hostInfo = isHost
    ? `<div style="font-size:9px;color:#8fbc8f;margin-bottom:8px">🏠 Hosting this exam — income bonus active</div>`
    : `<div style="font-size:9px;color:#7a7060;margin-bottom:8px">Away exam</div>`
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
  const cands = G.shinobi.filter(s => (s.ri === 0 || s.ri === 1) && s.status === 'available' && !(G.transferMarket?.loanIn || []).some(l => l.shinobiId === s.id))
  const maxCands = G.worldFlags?.examExpanded ? 8 : 6
  el.innerHTML = tabHtml + hostInfo + formatBanner + seasonCard +
    `<div style="font-size:9px;color:#7a7060;margin-bottom:12px">Select nominees (max ${maxCands}). Loan-in shinobi are ineligible.</div>` +
    '<div style="margin-bottom:12px">' +
    (cands.map(s => {
      const ent = G.examCands.includes(s.id)
      const fmtMatch = fmt_ && fmt_.bonusStats.some(k => (s.stats[k] || 0) >= 35)
      return `<div class="pi" onclick="tEC('${s.id}')" style="${ent ? 'border-color:#c9a84c;background:rgba(201,168,76,0.08)' : ''}"><div><div style="font-size:10px;color:#e8e0cc">${sn(s)}${fmtMatch ? ' <span style="color:#8fbc8f;font-size:8px">★ format match</span>' : ''}</div><div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</div></div>${ent ? '<span style="color:#c9a84c">✓</span>' : ''}</div>`
    }).join('') || '<div style="color:#7a7060;font-size:9px">No eligible candidates.</div>') +
    '</div>' +
    (G.examCands.length ? '<button class="gb" onclick="startEx()">Start Exam ►</button>' : '') +
    (G.examResults.length ? '<div style="margin-top:14px;font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:7px">Recent Results</div>' + G.examResults.slice(-10).map(r => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${r.promoted ? '#8fbc8f' : '#7a7060'}">${r.name}: ${r.result}${r.promoted ? ' → Promoted!' : ''}</div>`).join('') : '')
}

export function tEC(id) {
  const maxCands = G.worldFlags?.examExpanded ? 8 : 6
  if (G.examCands.includes(id)) G.examCands = G.examCands.filter(x => x !== id)
  else if (G.examCands.length < maxCands) G.examCands.push(id)
  rEx()
}

// Stage labels — now framed as a competitive bracket.
export const EXAM_STAGES = ['Qualifier — Written Test', 'Quarterfinal — Forest of Death', 'Semifinal — Preliminary Duels', 'Final — Championship']

// Rival genin names by village flavour.
const RIVAL_NAME_POOL = ['Genin', 'Prodigy', 'Cadet', 'Aspirant', 'Hopeful', 'Adept']
function _rivalCombatants(v) {
  // A village fields 4–6 genin; individual power scales off the village's aggregate str.
  const n = rnd(4, 6)
  return Array.from({ length: n }, (_, i) => ({
    id: 'r_' + v.n + '_' + i,
    name: v.n.replace(/gakure$/, '') + ' ' + pk(RIVAL_NAME_POOL),
    pow: clamp(Math.round(v.str * 0.5) + rnd(-8, 12), 15, 72),
    isPlayer: false,
  }))
}

// Build the full tournament field: player village + every rival village.
function _buildExamField() {
  // Seeds earned from the season standings — top seeds get a qualifier edge.
  const seeds = G.season?.table ? seedsFromTable(G.season.table) : {}
  const nVillages = (G.villages?.length || 0) + 1
  const seedBonus = name => {
    const seed = seeds[name]
    if (!seed || nVillages < 2) return 0
    return Math.round((1 - (seed - 1) / (nVillages - 1)) * 10) / 100  // top seed +0.10 → bottom +0
  }
  const playerEntry = {
    vid: 'player', name: G.vName, ico: G.vIcon, isPlayer: true, seed: seeds[G.vName] || null,
    alive: G.examCands.map(id => {
      const s = G.shinobi.find(x => x.id === id)
      return { id, shinobiId: id, name: sn(s), pow: sPow(s), isPlayer: true, seedBonus: seedBonus(G.vName) }
    }).filter(c => c.id),
    out: [],
  }
  const rivalEntries = (G.villages || []).map(v => ({
    vid: v.n, name: v.n, ico: v.ico, isPlayer: false, seed: seeds[v.n] || null,
    alive: _rivalCombatants(v).map(c => ({ ...c, seedBonus: seedBonus(v.n) })), out: [],
  }))
  return [playerEntry, ...rivalEntries]
}

export function startEx() {
  if (!G.examCands.length) { ntf('Add candidates!'); return }
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
  G.examCands.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) s.status = 'exam' })
  rEx()
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
    <div style="font-size:8px;color:#7a7060;margin-bottom:8px">${standing.length} villages in contention · ${totalAlive} combatants remaining</div>
    <div style="display:grid;gap:8px;margin-bottom:10px">
      ${standing.map((e, i) => `<div style="border:1px solid ${e.isPlayer ? '#c9a84c' : '#2e2a22'};padding:7px;background:${e.isPlayer ? 'rgba(201,168,76,0.06)' : '#0a0a0a'}">
        <div style="font-size:9px;color:${e.isPlayer ? '#c9a84c' : '#9a9080'};margin-bottom:4px">${i === 0 ? '◆ ' : ''}${e.seed ? `<span style="color:#7a7060">#${e.seed}</span> ` : ''}${e.ico || '🏳'} ${e.name}${e.isPlayer ? ' (you)' : ''} <span style="color:#7a7060">— ${e.alive.length} alive${e.scrolls != null ? ` · ${e.scrolls} 📜` : ''}</span></div>
        ${e.alive.map(c => `<div style="font-size:8px;padding:2px 0;color:${c.isPlayer ? '#e8e0cc' : '#7a7060'}">${c.name} · Pwr ${c.pow}${c._wounded ? ' <span style="color:#f88">⚕ wounded</span>' : ''}${c.isPlayer && _formatBonusById(c.shinobiId) > 0 ? ' <span style="color:#8fbc8f">★+15%</span>' : ''}</div>`).join('')}
      </div>`).join('')}
    </div>
    ${!ui.exSt.sabotaged && r === 1 ? `<button class="btn" onclick="sabotageSquad()" style="font-size:9px;margin-bottom:8px;color:#f88">Sabotage a rival squad (risk relations)</button> ` : ''}
    <button class="gb" onclick="runRound()">Run ${EXAM_STAGES[r] ? EXAM_STAGES[r].split(' — ')[0] : 'Round'} ►</button>
  </div>`
}

function _formatBonusById(id) {
  const s = G.shinobi.find(x => x.id === id)
  return s ? _formatBonus(s) : 0
}

export function protestJudge() {
  if (!G.examJudgeBias?.isBiased || G.examJudgeProtested) return
  // Protest costs prestige (legend points) and has 50% chance of overturning
  if ((G.legend || 0) < 5) { ntf('Need at least 5 legend to file a protest.'); return }
  G.legend = Math.max(0, G.legend - 5)
  G.examJudgeProtested = true
  if (Math.random() < 0.5) {
    G.examJudgeBias.biasMod = 0
    G.examJudgeBias.isBiased = false
    aL('Protest upheld — judge bias removed. The panel reviewed the scoring rules.', 'good')
  } else {
    aL('Protest rejected — judge bias stands. −5 legend spent.', 'warn')
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
      aL('Sabotage discovered — ' + target.name + ' relations damaged.', 'warn')
    } else {
      aL('Sabotage went undetected — ' + target.name + ' lost a combatant.', 'neutral')
    }
  }
  rEx()
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
      const sb = c.seedBonus || 0
      if (c.isPlayer) {
        const s = G.shinobi.find(x => x.id === c.shinobiId)
        return clamp(0.5 + (s?.stats.intelligence || 30) / 200 + _formatBonusById(c.shinobiId) + sb, 0.1, 0.95)
      }
      return clamp(0.45 + c.pow / 200 + sb, 0.1, 0.9)
    }, 'Passed the written test', 'Failed the written test', res)
  } else if (r === 1) {
    return _runForest(field, res)
  } else if (r === 2) {
    return _runSemifinal(field, res, biasMod)
  } else {
    return _runFinals(field, biasMod)
  }

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
      let prob
      if (c.isPlayer) {
        const s = G.shinobi.find(x => x.id === c.shinobiId)
        prob = clamp(0.4 + ((s?.stats.speed || 0) + (s?.stats.chakra || 0)) / 400 + (isHost ? 0.08 : 0) + _formatBonusById(c.shinobiId), 0.1, 0.95)
      } else {
        prob = clamp(0.42 + c.pow / 220, 0.1, 0.9)
      }
      const survived = Math.random() < prob
      if (survived) { kept.push(c); entry.scrolls++ } else entry.out.push(c)
      // Player nominees risk real injury — far higher when overwhelmed and eliminated.
      let injNote = ''
      if (c.isPlayer) {
        const injChance = survived ? 0.10 : 0.30
        if (Math.random() < injChance) {
          const s = G.shinobi.find(x => x.id === c.shinobiId)
          if (s) { const inj = _examInjure(s); injNote = ` — wounded: ${inj.n} (${inj.dur}mo)`; c._wounded = true }
        }
        res.push({ name: c.name, result: (survived ? 'Secured a scroll, survived' : 'Eliminated in the forest') + injNote, promoted: false, good: survived })
      }
    })
    entry.alive = kept
  })
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
  const effPow = c => c.pow * (1 + (c.isPlayer ? _formatBonusById(c.shinobiId) : 0)) - (c.isPlayer ? biasMod * 100 : 0)
  const duels = []
  const losers = new Set()
  let lo = 0, hi = pool.length - 1
  while (lo < hi) {
    const A = pool[lo], B = pool[hi]
    const aScore = effPow(A.c) + rnd(-8, 8), bScore = effPow(B.c) + rnd(-8, 8)
    const aWins = aScore >= bScore
    const win = aWins ? A : B, lose = aWins ? B : A
    losers.add(lose.c)
    const margin = Math.abs(aScore - bScore)
    const marginLabel = margin < 5 ? 'narrow' : margin < 15 ? 'clear' : 'decisive'
    const upset = lose.seed < win.seed  // a higher seed (lower number) was beaten
    duels.push({
      winName: win.c.name, winVil: win.entry.name, winPlayer: !!win.c.isPlayer,
      loseName: lose.c.name, loseVil: lose.entry.name, losePlayer: !!lose.c.isPlayer,
      marginLabel, upset,
    })
    if (win.c.isPlayer) res.push({ name: win.c.name, result: `Won a ${marginLabel} duel vs ${lose.c.name} (${lose.entry.name})`, promoted: false, good: true })
    if (lose.c.isPlayer) res.push({ name: lose.c.name, result: `Lost a ${marginLabel} duel to ${win.c.name} (${win.entry.name})`, promoted: false, good: false })
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
  })
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
        <div style="font-size:7px;color:#7a7060;margin-top:2px">${d.marginLabel} decision${d.upset ? ' · <span style="color:#f0a030">UPSET</span>' : ''}</div>
      </div>`).join('') : '<div style="font-size:9px;color:#7a7060">No duels this round.</div>') +
    (bye ? `<div style="font-size:8px;color:#7a7060;padding:4px">${bye.c.name} (${bye.entry.name}) advances on a bye.</div>` : '') +
    `</div><div style="margin-top:8px;font-size:9px;color:#7a7060">${villagesIn} villages reach the final · ${totalAlive} finalists.</div>`
  document.getElementById('ov-examfight').classList.add('open'); upUI()
}

function _renderRoundOverlay(r, res, field) {
  const villagesIn = field.filter(e => e.alive.length > 0).length
  const totalAlive = field.reduce((a, e) => a + e.alive.length, 0)
  document.getElementById('ef-c').innerHTML =
    `<div style="font-size:9px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">${EXAM_STAGES[r]}</div>` +
    (res.length
      ? res.map(x => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${x.good ? '#8fbc8f' : '#f66'}"><span style="color:#c9a84c">${x.name}</span> — ${x.result}</div>`).join('')
      : '<div style="font-size:9px;color:#7a7060">Your nominees saw no decisive action this stage.</div>') +
    `<div style="margin-top:8px;font-size:9px;color:#7a7060">${villagesIn} villages still in contention · ${totalAlive} combatants advance.</div>`
  document.getElementById('ov-examfight').classList.add('open'); upUI()
}

function _runFinals(field, biasMod) {
  const res = []
  let examPromotions = 0

  // Promote player finalists who reached the championship round.
  const playerEntry = field.find(e => e.isPlayer)
  ;(playerEntry?.alive || []).forEach(c => {
    const s = G.shinobi.find(x => x.id === c.shinobiId); if (!s) return
    const hostBonus = G.examHosting ? 0.10 : 0
    const fmtB = _formatBonus(s)
    const prom = Math.random() < clamp(0.55 + hostBonus + fmtB - biasMod, 0.05, 0.97)
    if (prom && s.ri < 4) {
      s.ri++; s.salary = 500 + s.ri * 400; examPromotions++
      res.push({ name: sn(s), result: 'Promoted to ' + RANKS[s.ri] + '!', promoted: true })
      aL(sn(s) + ' promoted via Exam!' + (fmtB > 0 ? ' (format bonus applied)' : '') + (biasMod > 0 ? ' (judge bias penalised)' : ''), 'good')
      G.dynastyRecords.examWins = (G.dynastyRecords?.examWins || 0) + 1
      addLegend(5)
      addChronicle('Exam Promotion', `${sn(s)} fought through the field of five villages and was promoted to ${RANKS[s.ri]}.`, 'shinobi')
    } else {
      res.push({ name: sn(s), result: 'Reached the final, not promoted.', promoted: false })
    }
  })

  // Crown the champion village — most finalists, tiebreak by combined power.
  const finalists = field.filter(e => e.alive.length > 0)
    .map(e => ({ e, count: e.alive.length, pow: e.alive.reduce((a, c) => a + c.pow, 0) }))
    .sort((a, b) => b.count - a.count || b.pow - a.pow)
  const champ = finalists[0]?.e
  const playerWon = !!champ?.isPlayer

  if (!G.examHistoricalRecords) G.examHistoricalRecords = { totalPromotions: 0, bestSingleExam: 0, examWinsByVillage: {} }
  if (champ) {
    G.examChampion = { year: G.year, village: champ.name, ico: champ.ico, player: playerWon }
    G.examHistoricalRecords.championsByVillage = G.examHistoricalRecords.championsByVillage || {}
    G.examHistoricalRecords.championsByVillage[champ.name] = (G.examHistoricalRecords.championsByVillage[champ.name] || 0) + 1
    if (playerWon) {
      G.examHistoricalRecords.championships = (G.examHistoricalRecords.championships || 0) + 1
      addLegend(15); G.reputation = clamp((G.reputation || 0) + 15, 0, 999)
      aL('🏆 ' + G.vName + ' WINS the Chunin Exam Championship! +15 legend, +15 reputation.', 'good')
      addChronicle('Exam Champion', `${G.vName} stood above all five villages to claim the Year ${G.year} Chunin Exam championship.`, 'milestone')
    } else {
      aL('🏆 ' + champ.name + ' wins the Chunin Exam championship. ' + G.vName + ' did not take the title.', 'neutral')
      addChronicle('Exam Champion', `${champ.name} claimed the Year ${G.year} Chunin Exam championship.`, 'milestone')
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
    const upsetDesc = `${G.vName} (${G.prestigeTier || 'D'}-tier) won the Chunin Exam outright — a result far above expectations.`
    G.upsetHistory = G.upsetHistory || []
    G.upsetHistory.push({ year: G.year, desc: upsetDesc })
    addChronicle('Exam Upset', upsetDesc, 'milestone')
    aL('⭐ Upset! ' + G.vName + ' was not expected to win — this will be remembered.', 'good')
    addLegend(8)
  }

  // Cleanup — restore nominee statuses (wounds carry into the season) and reset exam state.
  let woundedCount = 0
  G.examCands.forEach(id => {
    const s = G.shinobi.find(x => x.id === id); if (!s) return
    s.missId = null
    if ((s.injDays || 0) > 0) { s.status = 'injured'; woundedCount++ } else s.status = 'available'
  })
  if (woundedCount > 0) aL(`${woundedCount} nominee${woundedCount > 1 ? 's' : ''} returned from the exam injured.`, 'warn')

  // The exam was the playoff — archive the final season table and start a fresh season.
  if (G.season?.table) {
    G.seasonHistory = G.seasonHistory || []
    G.seasonHistory.push({ year: G.year, champion: champ?.name || null, table: sortedTable(G.season.table) })
    const names = [G.vName, ...(G.villages || []).map(v => v.n)]
    G.season = { year: G.year, round: 0, table: initSeasonTable(names), lastResults: [] }
  }
  if (G.examHosting) { G.ryo += 8000; aL('Hosting income from Chunin Exam: +8,000 ryo.', 'good'); G.examHosting = false }
  G.examFormat = null; G.examJudgeBias = null
  G.examResults.push(...res.map(x => ({ id: '', name: x.name, result: x.result, promoted: x.promoted })))
  G.examActive = false; G.examSched = false; G.examCands = []; ui.exSt = null
  schEx()

  const champLine = champ
    ? `<div style="font-size:11px;color:${playerWon ? '#c9a84c' : '#9a9080'};margin-bottom:10px">🏆 Champion: ${champ.ico || ''} ${champ.name}${playerWon ? ' (you)' : ''}</div>`
    : ''
  document.getElementById('ef-c').innerHTML = champLine +
    '<div style="font-size:9px;color:#7a7060;margin-bottom:10px">Exam complete!</div>' +
    (res.length
      ? res.map(x => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${x.promoted ? '#8fbc8f' : '#e8e0cc'}"><span style="color:#c9a84c">${x.name}</span> — ${x.result}</div>`).join('')
      : '<div style="font-size:9px;color:#7a7060">Your nominees were eliminated before the final.</div>')
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
      <div style="font-size:10px;color:#c9a84c;margin-bottom:6px">Year ${s.year} Five Kage Summit${s.blocAligned ? ` <span style="font-size:8px;color:#87ceeb">[bloc: ${s.blocAligned}]</span>` : ''}</div>
      ${(s.results || []).map(r => `<div style="font-size:9px;padding:3px 0;border-bottom:1px solid #1a1a1a;color:${r.passed ? '#8fbc8f' : '#666'}">${r.passed ? '✓' : '✗'} ${r.item} ${r.myVote ? '(your vote: yes)' : '(your vote: no)'}</div>`).join('')}
    </div>`).join('')
  return html
}

export function acceptSummitBloc() {
  if (!G.summitBlocOffer) return
  G.pendingSummitFavor = { villageName: G.summitBlocOffer.villageName, agendaItem: G.summitBlocOffer.agendaItem }
  aL('Voting alliance formed with ' + G.summitBlocOffer.villageName + ' on "' + G.summitBlocOffer.agendaItem + '". A future favor is owed.', 'warn')
  G.summitBlocOffer = null
  rEx()
}

export function declineSummitBloc() {
  if (!G.summitBlocOffer) return
  aL('Declined ' + G.summitBlocOffer.villageName + '\'s summit bloc offer. You\'ll vote independently.', 'neutral')
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
  if (now > contract.deadline) { ntf('Contract expired.'); return }
  const elite = G.shinobi.filter(s => s.ri >= 3 && s.status === 'available')
  if (!elite.length) { ntf('Need at least one Jonin to bid.'); return }
  const ourScore = elite.reduce((a, s) => a + sPow(s), 0) / elite.length + rnd(-5, 10)
  const npcScore = rnd(40, 70)
  contract.bids = contract.bids || []
  contract.bids.push({ village: G.vName, score: ourScore })
  if (ourScore >= npcScore) {
    contract.winner = G.vName
    const failed = Math.random() < contract.risk
    if (!failed) {
      G.ryo += contract.baseRyo; G.reputation = clamp(G.reputation + contract.rep, 0, 999); addLegend(contract.prestige)
      aL(`S-rank contract completed: ${contract.n}. +${fmt(contract.baseRyo)} ryo, +${contract.rep} rep.`, 'good')
      addChronicle('S-Rank Contract', `${contract.n} completed. Our forces proved decisive. Village earns ${fmt(contract.baseRyo)} ryo.`, 'milestone')
    } else {
      G.ryo += Math.round(contract.baseRyo * 0.3); G.reputation = clamp(G.reputation - 10, 0, 999)
      aL(`S-rank mission failed: ${contract.n}. Partial payment only.`, 'bad')
    }
  } else {
    contract.winner = 'NPC'
    aL(`Lost S-rank bid for: ${contract.n}. Outscored by rivals.`, 'neutral')
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
