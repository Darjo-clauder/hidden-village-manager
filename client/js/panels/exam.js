import { G, ui, sPow, rnd, sn, pk, clamp, fmt, addChronicle, addLegend } from '../state.js'
import { RANKS } from '../constants.js'
import { aL, ntf, upUI, schEx } from '../ui.js'

window._exTab = 'exam'

export function rEx() {
  const el = document.getElementById('exl')
  if (!el) return
  const tabs = ['exam', 'summit', 'srank']
  const tabHtml = `<div style="display:flex;gap:6px;margin-bottom:12px">
    ${tabs.map(t => `<button class="btn${window._exTab === t ? ' act' : ''}" onclick="exTab('${t}')" style="font-size:9px;padding:3px 8px">${t === 'exam' ? 'CHUNIN EXAM' : t === 'summit' ? 'SUMMIT HISTORY' : 'S-RANK BIDS'}</button>`).join('')}
  </div>`
  if (window._exTab === 'summit') { el.innerHTML = tabHtml + _summitTab(); return }
  if (window._exTab === 'srank') { el.innerHTML = tabHtml + _srankTab(); return }
  el.innerHTML = tabHtml
  if (G.examActive) { rExA(el, tabHtml); return }
  _renderExamSetup(el, tabHtml)
}

export function exTab(t) { window._exTab = t; rEx() }

function _renderExamSetup(el, tabHtml) {
  const isHost = G.examHosting === true
  const hostInfo = isHost
    ? `<div style="font-size:9px;color:#8fbc8f;margin-bottom:8px">🏠 Hosting this exam — income bonus active</div>`
    : `<div style="font-size:9px;color:#7a7060;margin-bottom:8px">Away exam</div>`
  if (!G.examSched) {
    el.innerHTML = tabHtml + hostInfo + '<div style="color:#7a7060;font-size:10px">No exam scheduled.<br><br><button class="gb" onclick="schEx()">Request exam</button></div>'
    return
  }
  const cands = G.shinobi.filter(s => (s.ri === 0 || s.ri === 1) && s.status === 'available' && !(G.transferMarket?.loanIn || []).some(l => l.shinobiId === s.id))
  const maxCands = G.worldFlags?.examExpanded ? 8 : 6
  el.innerHTML = tabHtml + hostInfo +
    `<div style="font-size:9px;color:#7a7060;margin-bottom:12px">Select nominees (max ${maxCands}). Loan-in shinobi are ineligible.</div>` +
    '<div style="margin-bottom:12px">' +
    (cands.map(s => {
      const ent = G.examCands.includes(s.id)
      return `<div class="pi" onclick="tEC('${s.id}')" style="${ent ? 'border-color:#c9a84c;background:rgba(201,168,76,0.08)' : ''}"><div><div style="font-size:10px;color:#e8e0cc">${sn(s)}</div><div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</div></div>${ent ? '<span style="color:#c9a84c">✓</span>' : ''}</div>`
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
  // Generate NPC opponents from rival villages (2–4)
  const npcCount = rnd(2, 4)
  const npcNames = ['Kiri Genin','Suna Prodigy','Iwa Fighter','Kumo Rookie','Foreign Rival']
  const npcOps = Array.from({ length: npcCount }, (_, i) => ({
    id: 'npc_' + i, name: pk(npcNames) + ' #' + (i + 1),
    pow: rnd(25, 55), isNpc: true,
  }))
  G.examActive = true
  ui.exSt = { round: 0, survivors: [...G.examCands], npcSurvivors: npcOps, sabotaged: false }
  G.examCands.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) s.status = 'exam' })
  rEx()
}

function rExA(el, tabHtml) {
  const rounds = ['Written Test', 'Forest Survival', 'Combat Rounds', 'Final Evaluation'], r = ui.exSt.round
  const mySurv = ui.exSt.survivors.map(id => G.shinobi.find(x => x.id === id)).filter(Boolean)
  const npcSurv = ui.exSt.npcSurvivors || []
  el.innerHTML = tabHtml + `<div style="background:#0d0d0d;border:1px solid #c9a84c;padding:14px">
    <div style="font-size:8px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Round ${r + 1}: ${rounds[r] || 'Finals'}</div>
    <div style="margin-bottom:6px">
      ${mySurv.map(s => `<div style="font-size:9px;padding:3px 0;border-bottom:1px solid #2e2a22;color:#e8e0cc">${sn(s)} <span style="color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</span></div>`).join('')}
      ${npcSurv.map(n => `<div style="font-size:9px;padding:3px 0;border-bottom:1px solid #2e2a22;color:#7a7060">${n.name} (NPC) · Pwr ~${n.pow}</div>`).join('')}
    </div>
    ${!ui.exSt.sabotaged && r === 1 ? `<button class="btn" onclick="sabotageSquad()" style="font-size:9px;margin-bottom:8px;color:#f88">Sabotage rival squad (−10 morale, risk rel)</button> ` : ''}
    <button class="gb" onclick="runRound()">Run Round ${r + 1} ►</button>
  </div>`
}

export function sabotageSquad() {
  if (!ui.exSt || ui.exSt.sabotaged) return
  ui.exSt.sabotaged = true
  // Remove 1 random NPC, but risk diplomatic penalty
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

  if (r === 0) {
    // Written test — npc attrition
    npcSurv = npcSurv.filter(() => Math.random() < 0.7)
    surv = surv.filter(id => { const s = G.shinobi.find(x => x.id === id); if (!s) return false; const p = Math.random() < (0.5 + s.stats.intelligence / 200); res.push({ id, name: sn(s), result: p ? 'Passed written test' : 'Failed written test', promoted: false }); return p })
  } else if (r === 1) {
    const isHost = G.examHosting === true
    npcSurv = npcSurv.filter(() => Math.random() < (isHost ? 0.55 : 0.7))
    surv = surv.filter(id => { const s = G.shinobi.find(x => x.id === id); if (!s) return false; const hostBonus = isHost ? 0.08 : 0; const p = Math.random() < (0.4 + (s.stats.speed + s.stats.chakra) / 400 + hostBonus); res.push({ id, name: sn(s), result: p ? 'Survived the forest' : 'Eliminated in forest', promoted: false }); return p })
  } else if (r === 2) {
    // Combat — ours vs NPCs first, then inter-squad
    const allCombatants = [
      ...surv.map(id => ({ id, pow: sPow(G.shinobi.find(x => x.id === id)) + rnd(-8, 8), isNpc: false })),
      ...npcSurv.map(n => ({ id: n.id, pow: n.pow + rnd(-8, 8), name: n.name, isNpc: true })),
    ].sort(() => Math.random() - 0.5)
    const loseIds = []
    for (let i = 0; i < allCombatants.length - 1; i += 2) {
      const a = allCombatants[i], b = allCombatants[i + 1]
      if (!b) continue
      const aWins = a.pow >= b.pow
      if (!aWins) loseIds.push(a.id); else loseIds.push(b.id)
      if (!a.isNpc) res.push({ id: a.id, name: G.shinobi.find(x => x.id === a.id) ? sn(G.shinobi.find(x => x.id === a.id)) : a.id, result: (aWins ? 'Won combat round' : 'Lost combat round'), promoted: false })
      if (!b.isNpc) res.push({ id: b.id, name: G.shinobi.find(x => x.id === b.id) ? sn(G.shinobi.find(x => x.id === b.id)) : b.id, result: (!aWins ? 'Won combat round' : 'Lost combat round'), promoted: false })
    }
    surv = surv.filter(id => !loseIds.includes(id))
    npcSurv = npcSurv.filter(n => !loseIds.includes(n.id))
  } else {
    // Finals — our guys vs NPC competition
    surv.forEach(id => {
      const s = G.shinobi.find(x => x.id === id); if (!s) return
      const hostBonus = G.examHosting ? 0.10 : 0
      const prom = Math.random() < (0.55 + hostBonus)
      if (prom && s.ri < 4) {
        s.ri++; s.salary = 500 + s.ri * 400
        res.push({ id, name: sn(s), result: 'Promoted to ' + RANKS[s.ri] + '!', promoted: true })
        aL(sn(s) + ' promoted via Exam!', 'good')
        G.dynastyRecords.examWins = (G.dynastyRecords?.examWins || 0) + 1
        addLegend(5)
      } else {
        res.push({ id, name: sn(s), result: 'Good showing, not promoted.', promoted: false })
      }
      s.status = 'available'; s.missId = null
    })
    G.examCands.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s && s.status === 'exam') s.status = 'available' })
    // Host income
    if (G.examHosting) {
      const hostIncome = 8000
      G.ryo += hostIncome
      aL('Hosting income from Chunin Exam: +' + fmt(hostIncome) + ' ryo.', 'good')
      G.examHosting = false
    }
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

// ── Summit history tab ────────────────────────────────────────────────────────
function _summitTab() {
  const history = G.summitHistory || []
  if (!history.length) return '<div style="color:#555;font-size:11px;padding:20px 0">No summits held yet. First summit occurs in month 6 of Year 1.</div>'
  return history.slice().reverse().map(s => `
    <div class="ke-card" style="margin-bottom:8px">
      <div style="font-size:10px;color:#c9a84c;margin-bottom:6px">Year ${s.year} Five Kage Summit</div>
      ${(s.results || []).map(r => `<div style="font-size:9px;padding:3px 0;border-bottom:1px solid #1a1a1a;color:${r.passed ? '#8fbc8f' : '#666'}">${r.passed ? '✓' : '✗'} ${r.item} ${r.myVote ? '(your vote: yes)' : '(your vote: no)'}</div>`).join('')}
    </div>`).join('')
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
  // Check we have at least one S-rank capable shinobi
  const elite = G.shinobi.filter(s => s.ri >= 3 && s.status === 'available')
  if (!elite.length) { ntf('Need at least one Jonin to bid.'); return }
  // Resolve bid: our score vs NPC score
  const ourScore = elite.reduce((a, s) => a + sPow(s), 0) / elite.length + rnd(-5, 10)
  const npcScore = rnd(40, 70)
  contract.bids = contract.bids || []
  contract.bids.push({ village: G.vName, score: ourScore })
  if (ourScore >= npcScore) {
    contract.winner = G.vName
    // Apply reward — with risk of complication
    const failed = Math.random() < contract.risk
    if (!failed) {
      G.ryo += contract.baseRyo
      G.reputation = clamp(G.reputation + contract.rep, 0, 999)
      addLegend(contract.prestige)
      aL(`S-rank contract completed: ${contract.n}. +${fmt(contract.baseRyo)} ryo, +${contract.rep} rep.`, 'good')
      addChronicle('S-Rank Contract', `${contract.n} completed successfully. Village earns ${fmt(contract.baseRyo)} ryo.`, 'milestone')
    } else {
      G.ryo += Math.round(contract.baseRyo * 0.3)
      G.reputation = clamp(G.reputation - 10, 0, 999)
      aL(`S-rank mission failed: ${contract.n}. Partial payment only.`, 'bad')
    }
  } else {
    contract.winner = 'NPC'
    aL(`Lost S-rank bid for: ${contract.n}. Outscored by rivals.`, 'neutral')
  }
  rEx()
}
