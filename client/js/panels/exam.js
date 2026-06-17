import { G, ui, sPow, rnd, sn, pk, clamp, fmt, addChronicle, addLegend, computeMarketValue } from '../state.js'
import { RANKS, EXAM_FORMATS, PRESTIGE_TIERS, LEGACY_DECISIONS } from '../constants.js'
import { aL, ntf, upUI, schEx } from '../ui.js'

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
  if (!G.examSched) {
    el.innerHTML = tabHtml + hostInfo + formatBanner + '<div style="color:#7a7060;font-size:10px">No exam scheduled.<br><br><button class="gb" onclick="schEx()">Request exam</button></div>'
    return
  }
  const cands = G.shinobi.filter(s => (s.ri === 0 || s.ri === 1) && s.status === 'available' && !(G.transferMarket?.loanIn || []).some(l => l.shinobiId === s.id))
  const maxCands = G.worldFlags?.examExpanded ? 8 : 6
  el.innerHTML = tabHtml + hostInfo + formatBanner +
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

export function startEx() {
  if (!G.examCands.length) { ntf('Add candidates!'); return }
  // Assign exam format if not already set
  if (!G.examFormat) G.examFormat = pk(EXAM_FORMATS)
  // Assign judge from a rival village (potential bias)
  const villages = ['Sunagakure','Kirigakure','Iwagakure','Kumogakure']
  const judgeVillage = pk(villages)
  const rivalV = (G.villages || []).find(v => v.n === judgeVillage)
  const isRival = rivalV && (rivalV.rel || 50) < 40
  G.examJudgeBias = isRival
    ? { villageName: judgeVillage, biasMod: rnd(5, 10) / 100, isBiased: true }
    : { villageName: judgeVillage, biasMod: 0, isBiased: false }
  G.examJudgeProtested = false
  // Generate NPC opponents
  const npcCount = rnd(2, 4)
  const npcNames = ['Kiri Genin','Suna Prodigy','Iwa Fighter','Kumo Rookie','Foreign Rival']
  const npcOps = Array.from({ length: npcCount }, (_, i) => ({
    id: 'npc_' + i, name: pk(npcNames) + ' #' + (i + 1), pow: rnd(25, 55), isNpc: true,
  }))
  G.examActive = true
  ui.exSt = { round: 0, survivors: [...G.examCands], npcSurvivors: npcOps, sabotaged: false, promotions: 0 }
  G.examCands.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) s.status = 'exam' })
  rEx()
}

function _formatBonus(s) {
  const fmt_ = G.examFormat
  if (!fmt_) return 0
  return fmt_.bonusStats.some(k => (s.stats[k] || 0) >= 35) ? 0.15 : 0
}

function rExA(el, tabHtml) {
  const rounds = ['Written Test', 'Forest Survival', 'Combat Rounds', 'Final Evaluation'], r = ui.exSt.round
  const mySurv = ui.exSt.survivors.map(id => G.shinobi.find(x => x.id === id)).filter(Boolean)
  const npcSurv = ui.exSt.npcSurvivors || []
  const bias = G.examJudgeBias
  const biasWarning = bias?.isBiased && !G.examJudgeProtested && r === 3
    ? `<div style="padding:7px;border:1px solid #f0a030;background:#0d0a04;margin-bottom:8px;font-size:8px;color:#f0a030">⚠ Judge from ${bias.villageName} (rival) — nominee scores lowered by ${Math.round(bias.biasMod * 100)}%. <button class="gb" onclick="protestJudge()" style="font-size:7px;margin-left:8px;border-color:#f0a030;color:#f0a030">File Protest (costs 5 prestige) ▸</button></div>`
    : ''
  el.innerHTML = tabHtml + biasWarning + `<div style="background:#0d0d0d;border:1px solid #c9a84c;padding:14px">
    <div style="font-size:8px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Round ${r + 1}: ${rounds[r] || 'Finals'}</div>
    ${G.examFormat ? `<div style="font-size:8px;color:#7a7060;margin-bottom:8px">${G.examFormat.icon} Format: ${G.examFormat.n} — format-matched nominees get +15%</div>` : ''}
    <div style="margin-bottom:6px">
      ${mySurv.map(s => `<div style="font-size:9px;padding:3px 0;border-bottom:1px solid #2e2a22;color:#e8e0cc">${sn(s)} <span style="color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</span>${_formatBonus(s) > 0 ? ' <span style="color:#8fbc8f;font-size:7px">★+15%</span>' : ''}</div>`).join('')}
      ${npcSurv.map(n => `<div style="font-size:9px;padding:3px 0;border-bottom:1px solid #2e2a22;color:#7a7060">${n.name} (NPC) · Pwr ~${n.pow}</div>`).join('')}
    </div>
    ${!ui.exSt.sabotaged && r === 1 ? `<button class="btn" onclick="sabotageSquad()" style="font-size:9px;margin-bottom:8px;color:#f88">Sabotage rival squad (−10 morale, risk rel)</button> ` : ''}
    <button class="gb" onclick="runRound()">Run Round ${r + 1} ►</button>
  </div>`
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
  if (ui.exSt.npcSurvivors?.length > 0) {
    ui.exSt.npcSurvivors.shift()
    if (Math.random() < 0.4) {
      const v = pk(G.villages)
      v.rel = clamp((v.rel || 50) - 8, 0, 100)
      aL('Sabotage discovered — ' + v.n + ' relations damaged.', 'warn')
    } else {
      aL('Squad sabotage went undetected.', 'neutral')
    }
  }
  rEx()
}

export function runRound() {
  const rounds = ['Written Test', 'Forest Survival', 'Combat Rounds', 'Final Evaluation'], r = ui.exSt.round
  let surv = [...ui.exSt.survivors]; const res = []
  let npcSurv = [...(ui.exSt.npcSurvivors || [])]
  const biasMod = (G.examJudgeBias?.isBiased && !G.examJudgeProtested) ? G.examJudgeBias.biasMod : 0

  if (r === 0) {
    npcSurv = npcSurv.filter(() => Math.random() < 0.7)
    surv = surv.filter(id => {
      const s = G.shinobi.find(x => x.id === id); if (!s) return false
      const fmtB = _formatBonus(s)
      const p = Math.random() < (0.5 + s.stats.intelligence / 200 + fmtB)
      res.push({ id, name: sn(s), result: p ? 'Passed written test' : 'Failed written test', promoted: false })
      return p
    })
  } else if (r === 1) {
    const isHost = G.examHosting === true
    npcSurv = npcSurv.filter(() => Math.random() < (isHost ? 0.55 : 0.7))
    surv = surv.filter(id => {
      const s = G.shinobi.find(x => x.id === id); if (!s) return false
      const hostBonus = isHost ? 0.08 : 0
      const fmtB = _formatBonus(s)
      const p = Math.random() < (0.4 + (s.stats.speed + s.stats.chakra) / 400 + hostBonus + fmtB)
      res.push({ id, name: sn(s), result: p ? 'Survived the forest' : 'Eliminated in forest', promoted: false })
      return p
    })
  } else if (r === 2) {
    const allCombatants = [
      ...surv.map(id => { const s = G.shinobi.find(x => x.id === id); return { id, pow: sPow(s) * (1 + _formatBonus(s)) + rnd(-8, 8), isNpc: false } }),
      ...npcSurv.map(n => ({ id: n.id, pow: n.pow + rnd(-8, 8), name: n.name, isNpc: true })),
    ].sort(() => Math.random() - 0.5)
    const loseIds = []
    for (let i = 0; i < allCombatants.length - 1; i += 2) {
      const a = allCombatants[i], b = allCombatants[i + 1]
      if (!b) continue
      const aWins = a.pow >= b.pow
      if (!aWins) loseIds.push(a.id); else loseIds.push(b.id)
      if (!a.isNpc) { const s2 = G.shinobi.find(x => x.id === a.id); res.push({ id: a.id, name: s2 ? sn(s2) : a.id, result: aWins ? 'Won combat round' : 'Lost combat round', promoted: false }) }
      if (!b.isNpc) { const s2 = G.shinobi.find(x => x.id === b.id); res.push({ id: b.id, name: s2 ? sn(s2) : b.id, result: !aWins ? 'Won combat round' : 'Lost combat round', promoted: false }) }
    }
    surv = surv.filter(id => !loseIds.includes(id))
    npcSurv = npcSurv.filter(n => !loseIds.includes(n.id))
  } else {
    // Finals — promotion round
    let examPromotions = 0
    surv.forEach(id => {
      const s = G.shinobi.find(x => x.id === id); if (!s) return
      const hostBonus = G.examHosting ? 0.10 : 0
      const fmtB = _formatBonus(s)
      const prom = Math.random() < clamp(0.55 + hostBonus + fmtB - biasMod, 0.05, 0.97)
      if (prom && s.ri < 4) {
        s.ri++; s.salary = 500 + s.ri * 400
        examPromotions++
        res.push({ id, name: sn(s), result: 'Promoted to ' + RANKS[s.ri] + '!', promoted: true })
        aL(sn(s) + ' promoted via Exam!' + (fmtB > 0 ? ' (format bonus applied)' : '') + (biasMod > 0 ? ' (judge bias penalised)' : ''), 'good')
        G.dynastyRecords.examWins = (G.dynastyRecords?.examWins || 0) + 1
        addLegend(5)
        // Deep chronicle entry — decisive moment
        const finalist = npcSurv[0]
        const momentDesc = finalist
          ? `${sn(s)} defeated ${finalist.name} in the final round${Math.random() < 0.3 ? ' with a last-second reversal' : ''}.`
          : `${sn(s)} stood alone at the end — promoted to ${RANKS[s.ri]}.`
        addChronicle('Exam Promotion', momentDesc, 'shinobi')
      } else {
        res.push({ id, name: sn(s), result: 'Good showing, not promoted.', promoted: false })
      }
      s.status = 'available'; s.missId = null
    })

    // Update historical exam records
    if (!G.examHistoricalRecords) G.examHistoricalRecords = { totalPromotions: 0, bestSingleExam: 0, examWinsByVillage: {} }
    G.examHistoricalRecords.totalPromotions = (G.examHistoricalRecords.totalPromotions || 0) + examPromotions
    if (examPromotions > (G.examHistoricalRecords.bestSingleExam || 0)) {
      G.examHistoricalRecords.bestSingleExam = examPromotions
      G.examHistoricalRecords.bestSingleExamYear = G.year
    }

    // Upset detection: lower prestige villages getting 2+ promotions = upset
    const presOrd = { D:0, C:1, B:2, A:3, S:4 }
    const myOrd = presOrd[G.prestigeTier || 'D'] || 0
    if (examPromotions >= 2 && myOrd <= 1) {
      const upsetDesc = `${G.vName} (${G.prestigeTier || 'D'}-tier) produced ${examPromotions} promotions in a single exam — an unexpected result that turned heads.`
      G.upsetHistory = G.upsetHistory || []
      G.upsetHistory.push({ year: G.year, desc: upsetDesc })
      addChronicle('Exam Upset', upsetDesc, 'milestone')
      aL('⭐ Upset! ' + G.vName + ' outperformed expectations — this result will be remembered.', 'good')
      addLegend(8)
    }

    G.examCands.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s && s.status === 'exam') s.status = 'available' })
    if (G.examHosting) {
      G.ryo += 8000
      aL('Hosting income from Chunin Exam: +8,000 ryo.', 'good')
      G.examHosting = false
    }
    G.examFormat = null  // reset for next exam
    G.examJudgeBias = null
    G.examResults.push(...res); G.examActive = false; G.examSched = false; G.examCands = []; ui.exSt = null
    schEx()
    document.getElementById('ef-c').innerHTML = '<div style="font-size:9px;color:#7a7060;margin-bottom:10px">Exam complete!</div>' + res.map(r => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${r.promoted ? '#8fbc8f' : '#e8e0cc'}"><span style="color:#c9a84c">${r.name}</span> — ${r.result}</div>`).join('')
    document.getElementById('ov-examfight').classList.add('open'); upUI(); return
  }
  ui.exSt.survivors = surv; ui.exSt.npcSurvivors = npcSurv; ui.exSt.round++; G.examResults.push(...res)
  document.getElementById('ef-c').innerHTML =
    `<div style="font-size:9px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Round ${r + 1}: ${rounds[r]}</div>` +
    res.map(x => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${x.result.includes('Passed') || x.result.includes('Survived') || x.result.includes('Won') ? '#8fbc8f' : '#f66'}"><span style="color:#c9a84c">${x.name}</span> — ${x.result}</div>`).join('') +
    `<div style="margin-top:8px;font-size:9px;color:#7a7060">${surv.length} of ours advance. ${npcSurv.length} NPC remaining.</div>`
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
  const rows = [
    { label: 'Career Exam Promotions', value: rec.totalPromotions || 0 },
    { label: 'Best Single Exam', value: rec.bestSingleExam ? `${rec.bestSingleExam} promotions (Year ${rec.bestSingleExamYear || '?'})` : '—' },
    { label: 'Total Exams Participated', value: (G.examResults?.length ? Math.ceil(G.examResults.length / 3) : 0) },
    { label: 'Dynasty Exam Wins', value: G.dynastyRecords?.examWins || 0 },
  ]
  return `<div>
    <div style="font-size:10px;color:#c9a84c;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Historical Exam Records</div>
    <div style="display:grid;gap:4px;margin-bottom:14px">
      ${rows.map(r => `<div style="display:flex;justify-content:space-between;padding:5px 8px;background:#0a0a0a;border-radius:3px">
        <span style="font-size:9px;color:#7a7060">${r.label}</span>
        <span style="font-size:10px;color:#e8e0cc;font-weight:bold">${r.value}</span>
      </div>`).join('')}
    </div>
    ${upsets.length ? `<div style="font-size:10px;color:#f0a030;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Recorded Upsets</div>
      ${upsets.slice().reverse().map(u => `<div style="font-size:8px;color:#7a7060;padding:5px 8px;background:#0a0a0a;margin-bottom:4px;border-left:2px solid #f0a030">Year ${u.year}: ${u.desc}</div>`).join('')}` : '<div style="font-size:8px;color:#555">No upsets recorded yet — outperform expectations at D or C prestige to create one.</div>'}
  </div>`
}
