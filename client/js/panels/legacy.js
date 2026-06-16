import { G, sn, fmt, clamp, addChronicle, addLegend } from '../state.js'
import { PRESTIGE_TIERS } from '../constants.js'
import { aL, ntf } from '../ui.js'

window._legTab = 'prestige'

export function rLeg() {
  const el = document.getElementById('legl')
  if (!el) return
  const tabs = ['prestige', 'hall', 'dynasty', 'legacy']
  el.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:12px">
    ${tabs.map(t => `<button class="btn${window._legTab === t ? ' act' : ''}" onclick="legTab('${t}')" style="font-size:9px;padding:3px 8px">${t === 'prestige' ? 'PRESTIGE' : t === 'hall' ? 'HALL OF LEGENDS' : t === 'dynasty' ? 'DYNASTY RECORDS' : 'LEGACY REPORT'}</button>`).join('')}
  </div>` + _legBody()
}

export function legTab(t) { window._legTab = t; rLeg() }

function _legBody() {
  const t = window._legTab
  if (t === 'prestige') return _prestige()
  if (t === 'hall') return _hall()
  if (t === 'dynasty') return _dynasty()
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
  return `<div>
    <div class="ke-card" style="margin-bottom:10px">
      <div style="font-size:10px;color:#7a7060;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Village Prestige</div>
      <div style="font-size:20px;font-weight:bold;color:${tier.color};margin-bottom:6px">${tier.n}</div>
      <div style="font-size:9px;color:#7a7060;margin-bottom:8px">Legend Score: ${legend} ${nextTier ? `/ ${nextTier.min} for Tier ${nextTier.id}` : '(Maximum)'}</div>
      <div class="bar" style="margin-bottom:8px"><div class="fill" style="width:${nextTier ? Math.min(100, Math.round((legend / nextTier.min) * 100)) : 100}%;background:${tier.color}"></div></div>
      <div style="font-size:9px;color:#7a7060">
        Scout Slots: ${tier.scoutSlots} · Staff Tier: ${tier.staffTier} · Exam Host: ${tier.examHostEligible ? '✓ Eligible' : '✗ Not yet'}
      </div>
    </div>
    <div class="ke-card">
      <div style="font-size:10px;color:#7a7060;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Kage Reputation</div>
      <div style="font-size:18px;color:#c9a84c;margin-bottom:6px">${repStars}</div>
      <div style="font-size:9px;color:#7a7060;margin-bottom:4px">${_repDesc(rep)}</div>
      <div style="font-size:9px;color:#555">Grows with reputation score, exam wins, diplomacy, and shinobi development. Affects scout attraction, staff quality, and negotiation respect.</div>
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
  const rows = [
    { label: 'Exam Promotions', value: dr.examWins || 0 },
    { label: 'Tailed Beasts Sealed', value: G.beasts?.filter(b => b.sealed).length || 0 },
    { label: 'Legends Enshrined', value: G.hallOfLegends?.length || 0 },
    { label: 'Peak Legend Score', value: dr.peakLegend || 0 },
    { label: 'Active Allied Villages', value: G.villages?.filter(v => v.allied).length || 0 },
    { label: 'Years Active', value: G.year || 1 },
    { label: 'Total Shinobi Graduated', value: G.shinobi?.length || 0 },
    { label: 'Village Prestige Tier', value: G.prestigeTier || 'D' },
  ]
  return `<div>
    <div style="font-size:10px;color:#c9a84c;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Dynasty Records — ${G.vName}</div>
    <div style="display:grid;gap:4px">
      ${rows.map(r => `<div style="display:flex;justify-content:space-between;padding:5px 8px;background:#0a0a0a;border-radius:3px">
        <span style="font-size:9px;color:#7a7060">${r.label}</span>
        <span style="font-size:10px;color:#e8e0cc;font-weight:bold">${r.value}</span>
      </div>`).join('')}
    </div>
    ${G.summitHistory?.length ? `<div style="margin-top:10px;font-size:9px;color:#7a7060">Summits attended: ${G.summitHistory.length}</div>` : ''}
  </div>`
}

// ── Generational Legacy Report ────────────────────────────────────────────────
function _legacyReport() {
  const gs = G.generationalSummary
  if (!gs) {
    const yearsLeft = 10 - (G.year - 1) % 10
    return `<div style="color:#555;font-size:11px;padding:20px 0">Generational legacy report generates at year 10 (and every 10 years after). ${yearsLeft} year${yearsLeft !== 1 ? 's' : ''} remaining until first report.</div>`
  }
  const cats = [
    { n: 'Development', score: gs.devScore, desc: 'Academy, hospital, training infrastructure.' },
    { n: 'Diplomacy', score: gs.dipScore, desc: 'Alliances, relations, summit influence.' },
    { n: 'Military', score: gs.milScore, desc: 'Exam wins, S-rank missions, top-tier shinobi.' },
    { n: 'Legacy', score: gs.legScore, desc: 'Hall of legends, legend score, chronicles.' },
  ]
  const gradeColor = gs.grade === 'S' ? '#f66' : gs.grade === 'A' ? '#f0a030' : gs.grade === 'B' ? '#c9a84c' : gs.grade === 'C' ? '#8fbc8f' : '#555'
  return `<div>
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
