import { G, sn, fmt, clamp, addChronicle, addLegend, pk } from '../state.js'
import { PRESTIGE_TIERS, LEGACY_DECISIONS } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'
import { dynastyProgress, computeDynastyGrade, inheritedBonuses, DYNASTY_YEARS } from '../../../shared/utils/dynasty.js'

window._legTab = 'prestige'

export function rLeg() {
  const el = document.getElementById('legl')
  if (!el) return
  const tabs = ['prestige', 'relations', 'hall', 'dynasty', 'successor', 'legacy']
  const tabLabels = { prestige:'PRESTIGE', relations:'KAGE REL.', hall:'LEGENDS', dynasty:'DYNASTY', successor:'SUCCESSOR', legacy:'LEGACY' }
  el.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${tabs.map(t => `<button class="btn${window._legTab === t ? ' act' : ''}" onclick="legTab('${t}')" style="font-size:9px;padding:3px 8px">${tabLabels[t]}</button>`).join('')}
  </div>` + _legBody()
}

export function legTab(t) { window._legTab = t; rLeg() }

function _legBody() {
  const t = window._legTab
  if (t === 'prestige') return _prestige()
  if (t === 'relations') return _kageRelations()
  if (t === 'hall') return _hall()
  if (t === 'dynasty') return _dynasty()
  if (t === 'successor') return _successor()
  if (t === 'legacy') return _legacyReport()
  return ''
}

// ── Prestige & Kage Reputation ───────────────────────────────────────────────
function _prestige() {
  const tier = PRESTIGE_TIERS.find(t => t.id === (G.prestigeTier || 'D')) || PRESTIGE_TIERS[0]
  const nextTier = PRESTIGE_TIERS[PRESTIGE_TIERS.findIndex(t => t.id === G.prestigeTier) + 1]
  const legend = G.legend || 0
  const rep = G.kageRep || 1
  const repStars = '★'.repeat(rep) + '☆'.repeat(5 - rep)
  const warConseq = G.warConsequences
  return `<div>
    ${warConseq ? `<div style="border:1px solid #f66;background:#0d0404;padding:8px 10px;margin-bottom:10px;font-size:8px;color:#f66">⚠ War defeat consequences active — prestige penalised for ${warConseq.prestigePenaltyMonths} more months. Academy intake quality reduced for ${warConseq.academyDebuffYears} more year(s).</div>` : ''}
    <div class="ke-card" style="margin-bottom:10px">
      <div style="font-size:10px;color:#7a7060;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Village Prestige</div>
      <div style="font-size:20px;font-weight:bold;color:${tier.color};margin-bottom:6px">${tier.n}</div>
      <div style="font-size:9px;color:#7a7060;margin-bottom:8px">Legend Score: ${legend} ${nextTier ? `/ ${nextTier.min} for Tier ${nextTier.id}` : '(Maximum)'}</div>
      <div class="bar" style="margin-bottom:8px"><div class="fill" style="width:${nextTier ? Math.min(100, Math.round((legend / nextTier.min) * 100)) : 100}%;background:${tier.color}"></div></div>
      <div style="font-size:9px;color:#7a7060">
        Scout Slots: ${tier.scoutSlots} · Staff Tier: ${tier.staffTier} · Exam Host: ${tier.examHostEligible ? '✓ Eligible' : '✗ Not yet'}
      </div>
    </div>
    ${G.worldReputationText ? `<div style="padding:8px 10px;border:1px solid #2e2a22;background:#0a0a0a;margin-bottom:10px;font-size:9px;color:#7a7060;font-style:italic">"${G.worldReputationText}"</div>` : ''}
    <div class="ke-card">
      <div style="font-size:10px;color:#7a7060;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Kage Reputation</div>
      <div style="font-size:18px;color:#c9a84c;margin-bottom:6px">${repStars}</div>
      <div style="font-size:9px;color:#7a7060;margin-bottom:4px">${_repDesc(rep)}</div>
      <div style="font-size:9px;color:#555">Grows with reputation score, exam wins, diplomacy, and shinobi development.</div>
    </div>
    ${PRESTIGE_TIERS.map(t => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #1a1a1a">
      <span style="font-size:12px;color:${t.color};width:20px;font-weight:bold">${t.id}</span>
      <span style="font-size:9px;color:#7a7060;flex:1">${t.n.split('— ')[1] || t.n}</span>
      <span style="font-size:9px;color:#444">≥${t.min} legend</span>
      ${G.prestigeTier === t.id ? '<span style="font-size:8px;color:#c9a84c">← current</span>' : ''}
    </div>`).join('')}
  </div>`
}

function _repDesc(rep) {
  return ['', 'Unknown newcomer — rivals pay no mind.', 'Emerging leader — some regional respect.', 'Established Kage — rivals negotiate carefully.', 'Renowned commander — feared and respected.', 'Legendary Kage — your name carries weight across all nations.'][rep] || ''
}

// ── Rival Kage Personal Relations ─────────────────────────────────────────────
function _kageRelations() {
  const kr = G.kageRelations || {}
  const entries = Object.values(kr)
  if (!entries.length) return '<div style="color:#555;font-size:11px;padding:20px 0">No kage relations established yet. Relations develop as you interact with other villages.</div>'
  const bar = v => `<div class="bar" style="height:4px"><div class="fill" style="width:${v}%;background:${v >= 60 ? '#8fbc8f' : v >= 40 ? '#c9a84c' : '#f66'}"></div></div>`
  const desc = v => v >= 70 ? 'Warm relationship — negotiations go smoothly.' : v >= 50 ? 'Neutral standing — no strong ties either way.' : v >= 30 ? 'Tense — past grievances color every exchange.' : 'Hostile — dialogue is strained and suspect.'
  return `<div>
    <div style="font-size:9px;color:#7a7060;margin-bottom:10px">Personal relationships with rival Kage — distinct from village-level diplomacy. Shaped by summit interactions, war outcomes, and prestige.</div>
    <div style="display:grid;gap:8px">
      ${entries.map(k => `<div class="ke-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:11px;color:#e8e0cc">${k.villageName}</span>
          <span style="font-size:10px;color:${k.rep >= 60 ? '#8fbc8f' : k.rep >= 40 ? '#c9a84c' : '#f66'};font-weight:bold">${k.rep}/100</span>
        </div>
        ${bar(k.rep)}
        <div style="font-size:8px;color:#7a7060;margin-top:5px">${desc(k.rep)}</div>
        ${k.lastEvent ? `<div style="font-size:7px;color:#444;margin-top:3px">Last: ${k.lastEvent}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>`
}

// ── Hall of Legends ───────────────────────────────────────────────────────────
function _hall() {
  const hall = G.hallOfLegends || []
  const bonus = Math.min(hall.length * 200, 2000)
  return `<div>
    <div style="font-size:9px;color:#7a7060;margin-bottom:8px">Shinobi who served 10+ years, earned 100+ missions, and reached A-rank are enshrined here. Each legend provides a passive monthly bonus.</div>
    <div style="font-size:9px;color:#c9a84c;margin-bottom:12px">Current passive bonus: +${fmt(bonus)} ryo/month (${hall.length} enshrined)</div>
    <div style="font-size:9px;color:#7a7060;margin-bottom:8px">Eligibility: 120+ months served · 100+ mission wins · A-rank (ri≥3)</div>
    ${hall.length === 0 ? '<div style="color:#444;font-size:11px;padding:16px 0">No legends enshrined yet. Long-serving A-rank shinobi are automatically enshrined upon retirement.</div>' :
      `<div style="display:grid;gap:8px">${hall.map(l => `
        <div class="ke-card">
          <div style="font-size:11px;color:#c9a84c;margin-bottom:4px">🏛 ${l.name}</div>
          <div style="font-size:9px;color:#7a7060">${['Genin','Chunin','Jonin','Special Jonin','S-Class'][l.ri] || 'Unknown'} · ${l.months} months served · ${l.wins} wins · ${l.winsS} S-rank</div>
        </div>`).join('')}
      </div>`}
  </div>`
}

// ── Dynasty Records ───────────────────────────────────────────────────────────
function _dynasty() {
  const dr = G.dynastyRecords || {}
  const year = G.year || 1
  const progress = dynastyProgress(year)
  const { grade, score, breakdown } = computeDynastyGrade(G)
  const gradeColor = { S: '#c9a84c', A: '#87ceeb', B: '#8fbc8f', C: '#fa0', D: '#888' }[grade] || '#888'
  const bonuses = inheritedBonuses(grade)
  const canHandoff = year >= DYNASTY_YEARS && !!G.successorId
  const rows = [
    { label: 'Exam Promotions', value: dr.examWins || 0 },
    { label: 'Tailed Beasts Sealed', value: G.beasts?.filter(b => b.sealed).length || 0 },
    { label: 'Legends Enshrined', value: G.hallOfLegends?.length || 0 },
    { label: 'Peak Legend Score', value: dr.peakLegend || 0 },
    { label: 'Active Allied Villages', value: G.villages?.filter(v => v.allied).length || 0 },
    { label: 'Years Active', value: year },
    { label: 'Village Prestige Tier', value: G.prestigeTier || 'D' },
    { label: 'Dynasty Continuity Score', value: G.dynastyContinuityScore || 0 },
    { label: 'Successor Designated', value: G.successorId ? 'Yes' : 'No' },
    { label: 'Wars Fought', value: G.warState?.warHistory?.length || 0 },
  ]
  const upsets = G.upsetHistory || []
  return `<div>
    <!-- Dynasty clock -->
    <div style="border:1px solid ${gradeColor};padding:10px;margin-bottom:12px;background:rgba(0,0,0,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Dynasty Clock — Year ${year} / ${DYNASTY_YEARS}</div>
        <div style="font-size:14px;font-weight:bold;color:${gradeColor}">Grade ${grade}</div>
      </div>
      <div class="bar" style="margin-bottom:8px">
        <div class="fill" style="width:${Math.round(progress*100)}%;background:${gradeColor}"></div>
      </div>
      <div style="font-size:8px;color:var(--text-dim);margin-bottom:6px">
        Score: ${score}/130 — Legend:${breakdown.legend} Hall:${breakdown.hall} Alliances:${breakdown.alliances} Prestige:${breakdown.prestige} Continuity:${breakdown.continuity} Districts:${breakdown.districts}
      </div>
      ${bonuses.length ? `
        <div style="font-size:7px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Inherited bonuses next dynasty:</div>
        ${bonuses.map(b => `<div style="font-size:8px;color:${gradeColor}">✦ ${b.desc}: ${typeof b.value === 'number' && b.value > 999 ? fmt(b.value) : b.value}${b.id.includes('ryo') ? ' ryo' : b.id.includes('rep') ? '' : ''}</div>`).join('')}
      ` : ''}
      ${canHandoff
        ? `<div style="margin-top:10px"><button class="gb gb-g" onclick="triggerDynastyHandoff()" style="font-size:9px;padding:6px 14px">⚡ Pass the Torch — Begin New Dynasty</button></div>`
        : year >= DYNASTY_YEARS
          ? `<div style="font-size:8px;color:var(--red);margin-top:8px">Dynasty complete — designate a Successor first (Successor tab).</div>`
          : `<div style="font-size:8px;color:var(--text-dim);margin-top:8px">${DYNASTY_YEARS - year} year${DYNASTY_YEARS - year !== 1 ? 's' : ''} remaining in this dynasty.</div>`
      }
    </div>

    <div style="font-size:10px;color:#c9a84c;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Dynasty Records — ${G.vName}</div>
    <div style="display:grid;gap:4px;margin-bottom:14px">
      ${rows.map(r => `<div style="display:flex;justify-content:space-between;padding:5px 8px;background:#0a0a0a;border-radius:3px">
        <span style="font-size:9px;color:#7a7060">${r.label}</span>
        <span style="font-size:10px;color:#e8e0cc;font-weight:bold">${r.value}</span>
      </div>`).join('')}
    </div>
    ${upsets.length ? `<div style="font-size:9px;color:#f0a030;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Recorded Upsets</div>
    ${upsets.map(u => `<div style="font-size:8px;color:#7a7060;padding:4px 8px;background:#0a0a0a;margin-bottom:3px;border-left:2px solid #f0a030">Year ${u.year}: ${u.desc}</div>`).join('')}` : ''}
  </div>`
}

// ── Successor Designation ─────────────────────────────────────────────────────
export function designateSuccessor(id, type) {
  G.successorId = id
  G.successorType = type
  const s = type === 'shinobi' ? G.shinobi.find(x => x.id === id) : G.staff?.find(x => x.id === id)
  const name = s ? sn(s) : id
  G.dynastyContinuityScore = G.dynastyContinuityScore || 0
  addChronicle('Successor Designated', `${name} named as successor. Their path is now shaped toward legacy.`, 'milestone')
  aL(name + ' designated as your successor. Dynasty continuity score will now grow each month they serve.', 'good')
  rLeg()
}

function _successor() {
  const curId = G.successorId
  const curType = G.successorType
  const cur = curId ? (curType === 'shinobi' ? G.shinobi.find(x => x.id === curId) : G.staff?.find(x => x.id === curId)) : null
  const continuity = G.dynastyContinuityScore || 0
  return `<div>
    <div style="font-size:9px;color:#7a7060;margin-bottom:10px">Designate a shinobi or staff member to carry your dynasty forward. They develop improved succession traits and contribute to dynasty continuity over time.</div>
    ${cur ? `<div style="border:1px solid #8fbc8f;background:#040d06;padding:10px;margin-bottom:12px">
      <div style="font-size:9px;color:#8fbc8f;font-weight:bold;margin-bottom:2px">Current Successor</div>
      <div style="font-size:11px;color:#e8e0cc">${sn(cur)}</div>
      <div style="font-size:8px;color:#7a7060;margin-top:3px">Continuity Score: ${continuity} · ${curType === 'shinobi' ? 'Shinobi' : 'Staff'}</div>
      <button class="gb" onclick="designateSuccessor(null,null)" style="margin-top:8px;font-size:8px;border-color:#555;color:#555">Clear Designation</button>
    </div>` : `<div style="font-size:9px;color:#555;margin-bottom:12px;padding:8px;background:#0a0a0a">No successor designated. Continuity score: ${continuity}</div>`}
    <div style="font-size:9px;color:#c9a84c;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Designate from Shinobi</div>
    <div style="display:grid;gap:4px;margin-bottom:12px">
      ${(G.shinobi || []).filter(s => s.ri >= 2 && s.status !== 'retired').slice(0, 8).map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#0a0a0a;border-radius:3px;${curId === s.id ? 'border:1px solid #8fbc8f' : ''}">
          <div>
            <span style="font-size:10px;color:#e8e0cc">${sn(s)}</span>
            <span style="font-size:8px;color:#7a7060;margin-left:6px">${['Genin','Chunin','Jonin','ANBU','S-Rank'][s.ri]} · Age ${s.age}</span>
          </div>
          ${curId !== s.id ? `<button class="gb" onclick="designateSuccessor('${s.id}','shinobi')" style="font-size:8px">Designate</button>` : '<span style="font-size:8px;color:#8fbc8f">★ Active</span>'}
        </div>`).join('') || '<div style="color:#555;font-size:9px">No eligible Jonin+ shinobi.</div>'}
    </div>
    <div style="font-size:9px;color:#c9a84c;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Designate from Staff</div>
    <div style="display:grid;gap:4px">
      ${(G.staff || []).filter(s => s.role !== 'doctor').slice(0, 5).map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:#0a0a0a;border-radius:3px;${curId === s.id ? 'border:1px solid #8fbc8f' : ''}">
          <div>
            <span style="font-size:10px;color:#e8e0cc">${s.fn} ${s.ln}</span>
            <span style="font-size:8px;color:#7a7060;margin-left:6px">${s.role}</span>
          </div>
          ${curId !== s.id ? `<button class="gb" onclick="designateSuccessor('${s.id}','staff')" style="font-size:8px">Designate</button>` : '<span style="font-size:8px;color:#8fbc8f">★ Active</span>'}
        </div>`).join('') || '<div style="color:#555;font-size:9px">No staff available.</div>'}
    </div>
  </div>`
}

// ── Generational Legacy Report + Legacy Decisions ─────────────────────────────
function _legacyReport() {
  let html = ''
  // Pending legacy decision
  const dec = G.legacyDecisionPending
  if (dec) {
    html += `<div style="border:1px solid #c9a84c;background:#0d0a04;padding:10px;margin-bottom:14px">
      <div style="font-size:9px;color:#c9a84c;font-weight:bold;margin-bottom:4px">${dec.icon} Legacy Moment: ${dec.n}</div>
      <div style="font-size:8px;color:#7a7060;margin-bottom:8px">${dec.desc}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${dec.choices.map(ch => `<button class="gb" onclick="resolveLegacyDecision('${dec.id}','${ch.id}')" style="font-size:8px">${ch.n}</button>`).join('')}
      </div>
    </div>`
  }
  // Legacy decision history
  if (G.legacyDecisionHistory?.length) {
    html += `<div style="font-size:9px;color:#c9a84c;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Past Legacy Decisions</div>`
    html += G.legacyDecisionHistory.slice().reverse().map(d => `<div style="font-size:8px;color:#7a7060;padding:5px 8px;background:#0a0a0a;margin-bottom:4px;border-left:2px solid #c9a84c">Year ${d.year}: ${d.decisionName} → ${d.choice}</div>`).join('')
    html += '<div style="margin-bottom:12px"></div>'
  }
  // Standard legacy report
  const gs = G.generationalSummary
  if (!gs) {
    const yearsLeft = 10 - (G.year - 1) % 10
    return html + `<div style="color:#555;font-size:11px;padding:20px 0">Generational legacy report generates at year 10 (and every 10 years after). ${yearsLeft} year${yearsLeft !== 1 ? 's' : ''} remaining until first report.</div>`
  }
  const cats = [
    { n: 'Development', score: gs.devScore, desc: 'Academy, hospital, training infrastructure.' },
    { n: 'Diplomacy', score: gs.dipScore, desc: 'Alliances, relations, summit influence.' },
    { n: 'Military', score: gs.milScore, desc: 'Exam wins, S-rank missions, top-tier shinobi.' },
    { n: 'Legacy', score: gs.legScore, desc: 'Hall of legends, legend score, chronicles.' },
  ]
  const gradeColor = gs.grade === 'S' ? '#f66' : gs.grade === 'A' ? '#f0a030' : gs.grade === 'B' ? '#c9a84c' : gs.grade === 'C' ? '#8fbc8f' : '#555'
  return html + `<div>
    <div style="text-align:center;padding:16px 0;margin-bottom:12px;background:#0a0a0a;border:1px solid #2e2a22;border-radius:4px">
      <div style="font-size:10px;color:#7a7060;margin-bottom:6px;text-transform:uppercase;letter-spacing:2px">Year ${gs.year} Legacy Grade</div>
      <div style="font-size:48px;font-weight:bold;color:${gradeColor}">${gs.grade}</div>
      <div style="font-size:11px;color:#7a7060">${gs.overall}/100</div>
    </div>
    <div style="display:grid;gap:6px">
      ${cats.map(c => `<div class="ke-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:10px;color:#e8e0cc">${c.n}</span>
          <span style="font-size:10px;color:#c9a84c;font-weight:bold">${c.score}/100</span>
        </div>
        <div class="bar" style="margin-bottom:4px"><div class="fill" style="width:${c.score}%"></div></div>
        <div style="font-size:8px;color:#555">${c.desc}</div>
      </div>`).join('')}
    </div>
  </div>`
}

export function triggerDynastyHandoff() {
  if ((G.year || 1) < DYNASTY_YEARS) { ntf(`Dynasty handoff requires year ${DYNASTY_YEARS}+.`); return }
  if (!G.successorId) { ntf('Designate a successor first.'); return }
  const { grade, score } = computeDynastyGrade(G)
  const bonuses = inheritedBonuses(grade)
  const successor = G.shinobi?.find(x => x.id === G.successorId) || G.staff?.find(x => x.id === G.successorId)
  const successorName = successor ? sn(successor) : 'your heir'

  G.dynastyHandoffRecord = {
    year: G.year, grade, score, successorName,
    bonuses, vName: G.vName, legend: G.legend,
    hallCount: (G.hallOfLegends || []).length,
  }

  addChronicle('Dynasty Handoff',
    `${G.vName} dynasty concluded at Year ${G.year}. Grade ${grade} (${score}/130). ${successorName} takes leadership. Bonuses carry forward.`,
    'milestone')
  aL(`The torch is passed to ${successorName}. Dynasty Grade: ${grade}. A new era begins.`, 'good')

  bonuses.forEach(b => {
    aL(`Inherited: ${b.desc} — ${typeof b.value === 'number' && b.value > 999 ? fmt(b.value) : b.value}${b.id.includes('ryo') ? ' ryo' : ''}`, 'good')
  })

  G.dynastyComplete = true
  upUI()
  rLeg()
}

export function resolveLegacyDecision(decId, choiceId) {
  const dec = LEGACY_DECISIONS.find(d => d.id === decId)
  if (!dec || G.legacyDecisionPending?.id !== decId) return
  const choice = dec.choices.find(c => c.id === choiceId)
  if (!choice) return
  // Apply effects
  if (choice.effect) {
    const fx = choice.effect
    if (fx.ryo) G.ryo = (G.ryo || 0) + fx.ryo
    if (fx.legend) addLegend(fx.legend)
    if (fx.morale) G.morale = clamp((G.morale || 50) + fx.morale, 0, 100)
    if (fx.reputation) G.reputation = clamp((G.reputation || 0) + fx.reputation, 0, 999)
    if (fx.desc) aL(fx.desc, fx.ryo > 0 || fx.legend > 0 ? 'good' : 'warn')
  }
  G.legacyDecisionHistory = G.legacyDecisionHistory || []
  G.legacyDecisionHistory.push({ year: G.year, id: decId, decisionName: dec.n, choice: choice.n })
  G.legacyDecisionPending = null
  addChronicle('Legacy Decision', `${dec.n}: chose "${choice.n}".`, 'milestone')
  rLeg()
}
