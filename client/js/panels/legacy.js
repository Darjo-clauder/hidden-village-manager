import { G, sn, fmt, clamp, addChronicle, addLegend, pk } from '../state.js'
import { RANKS, PRESTIGE_TIERS, LEGACY_DECISIONS } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'
import { dynastyProgress, computeDynastyGrade, inheritedBonuses, DYNASTY_YEARS } from '../../../shared/utils/dynasty.js'
import { bankTenure, loadLegacy, previewStartingBonuses } from '../legacyStore.js'
import { tierFor, nextTier } from '../../../shared/utils/legacy.js'
import { loadAchievements } from '../achievementsStore.js'
import { ACHIEVEMENTS, TIER_ORDER, achievementProgress } from '../../../shared/constants/achievements.js'

/** Years served before stepping down voluntarily becomes available. */
export const HANDOFF_MIN_YEARS = 8
import { leagueLeaders } from '../../../shared/utils/seasonStats.js'
import { t as tr } from '../../../shared/utils/i18n.js'

window._legTab = 'prestige'

export function rLeg() {
  const el = document.getElementById('legl')
  if (!el) return
  const tabs = ['prestige', 'relations', 'hall', 'dynasty', 'successor', 'legacy', 'records', 'achievements']
  const tabLabels = { prestige:'PRESTIGE', relations:'KAGE REL.', hall:'LEGENDS', dynasty:'DYNASTY', successor:'SUCCESSOR', legacy:'LEGACY', records:'RECORDS', achievements:'🏅 ACHIEVEMENTS' }
  el.innerHTML = `<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${tabs.map(t => `<button class="btn${window._legTab === t ? ' act' : ''}" onclick="legTab('${t}')" style="font-size:var(--fs-body);padding:3px 8px">${tabLabels[t]}</button>`).join('')}
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
  if (t === 'records') return _records()
  if (t === 'achievements') return _achievements()
  return ''
}

/**
 * Achievement gallery. Locked entries stay fully legible — this is a checklist
 * of things worth doing, so hiding them would defeat the point.
 */
function _achievements() {
  const store = loadAchievements()
  const have = new Set(store.unlocked || [])
  const prog = achievementProgress(store.unlocked || [])
  const TIER_COLOR = { bronze: '#b0763c', silver: '#9aa3ab', gold: 'var(--gold)' }

  const card = a => {
    const got = have.has(a.id)
    const when = store.at?.[a.id]
    const col = TIER_COLOR[a.tier] || 'var(--text-dim)'
    return `<div class="${got ? 'surf' : ''}" style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;margin-bottom:5px;
        background:${got ? 'var(--surface)' : 'transparent'};border:1px solid ${got ? col : 'var(--border-dim)'};opacity:${got ? 1 : 0.55}">
      <span style="font-size:var(--fs-head);line-height:1;filter:${got ? 'none' : 'grayscale(1)'}">${a.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--fs-body);color:${got ? 'var(--text-hi)' : 'var(--text-dim)'};font-weight:600">
          ${a.name}
          <span style="font-size:var(--fs-micro);color:${col};text-transform:uppercase;letter-spacing:1px;margin-left:6px">${a.tier}</span>
        </div>
        <div style="font-size:var(--fs-small);color:var(--text-dim)">${a.desc}</div>
      </div>
      <span style="font-size:var(--fs-micro);color:var(--text-faint);white-space:nowrap">
        ${got ? (when ? `Y${when.year} M${when.month}` : 'Unlocked') : 'Locked'}
      </span>
    </div>`
  }

  const pct = Math.round((prog.unlocked / prog.total) * 100)
  return `<div>
    <div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:10px 12px;margin-bottom:12px">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">
        <span style="font-size:var(--fs-title);color:var(--gold);font-family:'Courier New',monospace">${prog.unlocked}/${prog.total}</span>
        <span style="font-size:var(--fs-body);color:var(--text-dim)">${pct}% complete</span>
        <span style="margin-left:auto;font-size:var(--fs-small);color:var(--text-dim)">
          ${TIER_ORDER.map(t => `<span style="color:${TIER_COLOR[t]}">${prog.byTier[t].unlocked}/${prog.byTier[t].total} ${t}</span>`).join(' · ')}
        </span>
      </div>
      <div class="well" style="background:var(--sunken);border:1px solid var(--border);height:6px">
        <div style="height:100%;width:${pct}%;background:var(--gold)"></div>
      </div>
      <div style="font-size:var(--fs-micro);color:var(--text-dim);margin-top:6px">Achievements persist across every run and tenure.</div>
    </div>
    ${ACHIEVEMENTS.map(card).join('')}
  </div>`
}

// ── Prestige & Warden Reputation ───────────────────────────────────────────────
function _prestige() {
  const tier = PRESTIGE_TIERS.find(t => t.id === (G.prestigeTier || 'D')) || PRESTIGE_TIERS[0]
  const nextTier = PRESTIGE_TIERS[PRESTIGE_TIERS.findIndex(t => t.id === G.prestigeTier) + 1]
  const legend = G.legend || 0
  const rep = G.kageRep || 1
  const repStars = '★'.repeat(rep) + '☆'.repeat(5 - rep)
  const warConseq = G.warConsequences
  return `<div>
    ${warConseq ? `<div style="border:1px solid var(--red);background:#0d0404;padding:8px 10px;margin-bottom:10px;font-size:var(--fs-small);color:var(--red)">⚠ War defeat consequences active — prestige penalised for ${warConseq.prestigePenaltyMonths} more months. Academy intake quality reduced for ${warConseq.academyDebuffYears} more year(s).</div>` : ''}
    <div class="ke-card" style="margin-bottom:10px">
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">${tr("legacy.villagePrestige")}</div>
      <div style="font-size:20px;font-weight:bold;color:${tier.color};margin-bottom:6px">${tier.n}</div>
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:8px">Legend Score: ${legend} ${nextTier ? `/ ${nextTier.min} for Tier ${nextTier.id}` : '(Maximum)'}</div>
      <div class="bar" style="margin-bottom:8px"><div class="fill" style="width:${nextTier ? Math.min(100, Math.round((legend / nextTier.min) * 100)) : 100}%;background:${tier.color}"></div></div>
      <div style="font-size:var(--fs-body);color:var(--text-dim)">
        Scout Slots: ${tier.scoutSlots} · Staff Tier: ${tier.staffTier} · Exam Host: ${tier.examHostEligible ? '✓ Eligible' : '✗ Not yet'}
      </div>
    </div>
    ${G.worldReputationText ? `<div class="well" style="padding:8px 10px;border:1px solid var(--border);background:var(--bg);margin-bottom:10px;font-size:var(--fs-body);color:var(--text-dim);font-style:italic">"${G.worldReputationText}"</div>` : ''}
    <div class="ke-card">
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">${tr("legacy.kageReputation")}</div>
      <div style="font-size:var(--fs-head);color:var(--gold);margin-bottom:6px">${repStars}</div>
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:4px">${_repDesc(rep)}</div>
      <div style="font-size:var(--fs-body);color:var(--text-faint)">Grows with reputation score, exam wins, diplomacy, and shinobi development.</div>
    </div>
    ${PRESTIGE_TIERS.map(t => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--surface)">
      <span style="font-size:var(--fs-lead);color:${t.color};width:20px;font-weight:bold">${t.id}</span>
      <span style="font-size:var(--fs-body);color:var(--text-dim);flex:1">${t.n.split('— ')[1] || t.n}</span>
      <span style="font-size:var(--fs-body);color:var(--text-faint)">≥${t.min} legend</span>
      ${G.prestigeTier === t.id ? '<span style="font-size:var(--fs-small);color:var(--gold)">← current</span>' : ''}
    </div>`).join('')}
  </div>`
}

function _repDesc(rep) {
  return ['', 'Unknown newcomer — rivals pay no mind.', 'Emerging leader — some regional respect.', 'Established Warden — rivals negotiate carefully.', 'Renowned commander — feared and respected.', 'Legendary Warden — your name carries weight across all nations.'][rep] || ''
}

// ── Rival Warden Personal Relations ─────────────────────────────────────────────
function _kageRelations() {
  const kr = G.kageRelations || {}
  const entries = Object.values(kr)
  if (!entries.length) return '<div style="color:var(--text-faint);font-size:var(--fs-lead);padding:20px 0">No kage relations established yet. Relations develop as you interact with other villages.</div>'
  const bar = v => `<div class="bar" style="height:4px"><div class="fill" style="width:${v}%;background:${v >= 60 ? 'var(--green)' : v >= 40 ? 'var(--gold)' : 'var(--red)'}"></div></div>`
  const desc = v => v >= 70 ? 'Warm relationship — negotiations go smoothly.' : v >= 50 ? 'Neutral standing — no strong ties either way.' : v >= 30 ? 'Tense — past grievances color every exchange.' : 'Hostile — dialogue is strained and suspect.'
  return `<div>
    <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:10px">Personal relationships with rival Warden — distinct from village-level diplomacy. Shaped by summit interactions, war outcomes, and prestige.</div>
    <div style="display:grid;gap:8px">
      ${entries.map(k => `<div class="ke-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:var(--fs-lead);color:var(--text-hi)">${k.villageName}</span>
          <span style="font-size:var(--fs-body);color:${k.rep >= 60 ? 'var(--green)' : k.rep >= 40 ? 'var(--gold)' : 'var(--red)'};font-weight:bold">${k.rep}/100</span>
        </div>
        ${bar(k.rep)}
        <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:5px">${desc(k.rep)}</div>
        ${k.lastEvent ? `<div style="font-size:var(--fs-micro);color:var(--text-faint);margin-top:3px">Last: ${k.lastEvent}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>`
}

// ── Hall of Legends ───────────────────────────────────────────────────────────
function _hall() {
  const hall = G.hallOfLegends || []
  const bonus = Math.min(hall.length * 200, 2000)
  return `<div>
    <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:8px">Shinobi who served 10+ years, earned 100+ missions, and reached A-rank are enshrined here. Each legend provides a passive monthly bonus.</div>
    <div style="font-size:var(--fs-body);color:var(--gold);margin-bottom:12px">Current passive bonus: +${fmt(bonus)} ryo/month (${hall.length} enshrined)</div>
    <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:8px">Eligibility: 120+ months served · 100+ mission wins · A-rank (ri≥3)</div>
    ${hall.length === 0 ? '<div style="color:var(--text-faint);font-size:var(--fs-lead);padding:16px 0">No legends enshrined yet. Long-serving A-rank shinobi are automatically enshrined upon retirement.</div>' :
      `<div style="display:grid;gap:8px">${hall.map(l => `
        <div class="ke-card">
          <div style="font-size:var(--fs-lead);color:var(--gold);margin-bottom:4px">🏛 ${l.name}</div>
          <div style="font-size:var(--fs-body);color:var(--text-dim)">${['Initiate','Adept','Veteran','Special Veteran','Legend'][l.ri] || 'Unknown'} · ${l.months} months served · ${l.wins} wins · ${l.winsS} S-rank</div>
        </div>`).join('')}
      </div>`}
    ${_hallOfFame()}
  </div>`
}

// Hall of Fame — the broader career-legacy record. Inducts exceptional careers on
// retirement AND death (unlike the enshrined-legends passive bonus above), so the
// fallen and the youth-cup-winners-turned-greats are all remembered here.
function _hallOfFame() {
  const hof = (G.hallOfFame || []).slice().sort((a, b) => (b.year - a.year) || (b.score - a.score))
  if (!hof.length) return ''
  return `<div style="margin-top:20px;border-top:1px solid var(--surface-3);padding-top:12px">
    <div style="font-size:var(--fs-body);letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:6px">🏆 Hall of Fame — ${hof.length} inducted</div>
    <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:10px">Exceptional careers, inducted on retirement or in death. Missions are the spine; S-ranks, tournament titles, and Youth Cup pedigree add to the legend.</div>
    <div style="display:grid;gap:6px">${hof.map(e => `
      <div class="well" style="border:1px solid var(--border);background:var(--bg);padding:7px 9px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:var(--fs-lead)">${e.how === 'fallen' ? '🕊' : '🏛'}</span>
          <span style="font-size:var(--fs-body);color:var(--text-hi);font-weight:bold;flex:1">${e.name}</span>
          <span style="font-size:var(--fs-micro);color:var(--text-faint)">${RANKS[e.rankIndex] || ''} · Y${e.year}${e.how === 'fallen' ? ' · fell in service' : ''}</span>
        </div>
        <div style="font-size:var(--fs-small);color:var(--text-mid);margin-top:2px">${e.reason}</div>
      </div>`).join('')}
    </div>
  </div>`
}

// ── Dynasty Records ───────────────────────────────────────────────────────────
function _dynasty() {
  const dr = G.dynastyRecords || {}
  const year = G.year || 1
  const progress = dynastyProgress(year)
  const { grade, score, breakdown } = computeDynastyGrade(G)
  const gradeColor = { S: 'var(--gold)', A: 'var(--blue)', B: 'var(--green)', C: 'var(--orange)', D: 'var(--text-dim)' }[grade] || 'var(--text-dim)'
  const bonuses = inheritedBonuses(grade)
  const completedDynasty = year >= DYNASTY_YEARS
  const canHandoff = year >= HANDOFF_MIN_YEARS && !!G.successorId
  const rows = [
    { label: 'Exam Promotions', value: dr.examWins || 0 },
    { label: 'Primals Sealed', value: G.beasts?.filter(b => b.sealed).length || 0 },
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
        <div style="font-size:var(--fs-body);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Dynasty Clock — Year ${year} / ${DYNASTY_YEARS}</div>
        <div style="font-size:var(--fs-sub);font-weight:bold;color:${gradeColor}">Grade ${grade}</div>
      </div>
      <div class="bar" style="margin-bottom:8px">
        <div class="fill" style="width:${Math.round(progress*100)}%;background:${gradeColor}"></div>
      </div>
      <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:6px">
        Score: ${score}/130 — Legend:${breakdown.legend} Hall:${breakdown.hall} Alliances:${breakdown.alliances} Prestige:${breakdown.prestige} Continuity:${breakdown.continuity} Districts:${breakdown.districts}
      </div>
      ${bonuses.length ? `
        <div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Inherited bonuses next dynasty:</div>
        ${bonuses.map(b => `<div style="font-size:var(--fs-small);color:${gradeColor}">✦ ${b.desc}: ${typeof b.value === 'number' && b.value > 999 ? fmt(b.value) : b.value}${b.id.includes('ryo') ? ' ryo' : b.id.includes('rep') ? '' : ''}</div>`).join('')}
      ` : ''}
      ${canHandoff
        ? `<div style="margin-top:10px">
             <button class="gb gb-g" onclick="triggerDynastyHandoff()" style="font-size:var(--fs-body);padding:6px 14px">⚡ Pass the Torch — ${completedDynasty ? 'Complete the Dynasty' : 'Step Down'}</button>
             <div style="font-size:var(--fs-micro);color:var(--text-dim);margin-top:4px">${completedDynasty
               ? 'Full dynasty — banks legacy points AND leaves a one-time bequest to your successor.'
               : `Stepping down early banks legacy points. Serve to Year ${DYNASTY_YEARS} to also leave a bequest.`}</div>
           </div>`
        : !G.successorId
          ? `<div style="font-size:var(--fs-small);color:${year >= HANDOFF_MIN_YEARS ? 'var(--red)' : 'var(--text-dim)'};margin-top:8px">Designate a Successor to enable a handoff (Successor tab).</div>`
          : `<div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:8px">${HANDOFF_MIN_YEARS - year} year${HANDOFF_MIN_YEARS - year !== 1 ? 's' : ''} until you may step down.</div>`
      }
    </div>

    ${_legacyStandingCard()}

    <div style="font-size:var(--fs-body);color:var(--gold);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Dynasty Records — ${G.vName}</div>
    <div style="display:grid;gap:4px;margin-bottom:14px">
      ${rows.map(r => `<div style="display:flex;justify-content:space-between;padding:5px 8px;background:var(--bg);border-radius:3px">
        <span style="font-size:var(--fs-body);color:var(--text-dim)">${r.label}</span>
        <span style="font-size:var(--fs-body);color:var(--text-hi);font-weight:bold">${r.value}</span>
      </div>`).join('')}
    </div>
    ${upsets.length ? `<div style="font-size:var(--fs-body);color:var(--orange);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">${tr("legacy.recordedUpsets")}</div>
    ${upsets.map(u => `<div style="font-size:var(--fs-small);color:var(--text-dim);padding:4px 8px;background:var(--bg);margin-bottom:3px;border-left:2px solid var(--orange)">Year ${u.year}: ${u.desc}</div>`).join('')}` : ''}
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
    <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:10px">Designate a shinobi or staff member to carry your dynasty forward. They develop improved succession traits and contribute to dynasty continuity over time.</div>
    ${cur ? `<div style="border:1px solid var(--green);background:#040d06;padding:10px;margin-bottom:12px">
      <div style="font-size:var(--fs-body);color:var(--green);font-weight:bold;margin-bottom:2px">${tr("legacy.currentSuccessor")}</div>
      <div style="font-size:var(--fs-lead);color:var(--text-hi)">${sn(cur)}</div>
      <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:3px">Continuity Score: ${continuity} · ${curType === 'shinobi' ? 'Shinobi' : 'Staff'}</div>
      <button class="gb" onclick="designateSuccessor(null,null)" style="margin-top:8px;font-size:var(--fs-small);border-color:var(--text-faint);color:var(--text-faint)">${tr("legacy.clearDesignation")}</button>
    </div>` : `<div style="font-size:var(--fs-body);color:var(--text-faint);margin-bottom:12px;padding:8px;background:var(--bg)">No successor designated. Continuity score: ${continuity}</div>`}
    <div style="font-size:var(--fs-body);color:var(--gold);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">${tr("legacy.designateFromShinobi")}</div>
    <div style="display:grid;gap:4px;margin-bottom:12px">
      ${(G.shinobi || []).filter(s => s.ri >= 2 && s.status !== 'retired').slice(0, 8).map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:var(--bg);border-radius:3px;${curId === s.id ? 'border:1px solid var(--green)' : ''}">
          <div>
            <span style="font-size:var(--fs-body);color:var(--text-hi)">${sn(s)}</span>
            <span style="font-size:var(--fs-small);color:var(--text-dim);margin-left:6px">${RANKS[s.ri]} · Age ${s.age}</span>
          </div>
          ${curId !== s.id ? `<button class="gb" onclick="designateSuccessor('${s.id}','shinobi')" style="font-size:var(--fs-small)">${tr("legacy.designate")}</button>` : '<span style="font-size:var(--fs-small);color:var(--green)">★ Active</span>'}
        </div>`).join('') || '<div style="color:var(--text-faint);font-size:var(--fs-body)">${tr("legacy.noEligibleJonin")}</div>'}
    </div>
    <div style="font-size:var(--fs-body);color:var(--gold);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">${tr("legacy.designateFromStaff")}</div>
    <div style="display:grid;gap:4px">
      ${(G.staff || []).filter(s => s.role !== 'doctor').slice(0, 5).map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:var(--bg);border-radius:3px;${curId === s.id ? 'border:1px solid var(--green)' : ''}">
          <div>
            <span style="font-size:var(--fs-body);color:var(--text-hi)">${s.fn} ${s.ln}</span>
            <span style="font-size:var(--fs-small);color:var(--text-dim);margin-left:6px">${s.role}</span>
          </div>
          ${curId !== s.id ? `<button class="gb" onclick="designateSuccessor('${s.id}','staff')" style="font-size:var(--fs-small)">${tr("legacy.designate")}</button>` : '<span style="font-size:var(--fs-small);color:var(--green)">★ Active</span>'}
        </div>`).join('') || '<div style="color:var(--text-faint);font-size:var(--fs-body)">${tr("legacy.noStaff")}</div>'}
    </div>
  </div>`
}

// ── Generational Legacy Report + Legacy Decisions ─────────────────────────────
function _legacyReport() {
  let html = ''
  // Pending legacy decision
  const dec = G.legacyDecisionPending
  if (dec) {
    html += `<div style="border:1px solid var(--gold);background:var(--sunken);padding:10px;margin-bottom:14px">
      <div style="font-size:var(--fs-body);color:var(--gold);font-weight:bold;margin-bottom:4px">${dec.icon} Legacy Moment: ${dec.n}</div>
      <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:8px">${dec.desc}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${dec.choices.map(ch => `<button class="gb" onclick="resolveLegacyDecision('${dec.id}','${ch.id}')" style="font-size:var(--fs-small)">${ch.n}</button>`).join('')}
      </div>
    </div>`
  }
  // Legacy decision history
  if (G.legacyDecisionHistory?.length) {
    html += `<div style="font-size:var(--fs-body);color:var(--gold);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">${tr("legacy.pastDecisions")}</div>`
    html += G.legacyDecisionHistory.slice().reverse().map(d => `<div style="font-size:var(--fs-small);color:var(--text-dim);padding:5px 8px;background:var(--bg);margin-bottom:4px;border-left:2px solid var(--gold)">Year ${d.year}: ${d.decisionName} → ${d.choice}</div>`).join('')
    html += '<div style="margin-bottom:12px"></div>'
  }
  // Standard legacy report
  const gs = G.generationalSummary
  if (!gs) {
    const yearsLeft = 10 - (G.year - 1) % 10
    return html + `<div style="color:var(--text-faint);font-size:var(--fs-lead);padding:20px 0">Generational legacy report generates at year 10 (and every 10 years after). ${yearsLeft} year${yearsLeft !== 1 ? 's' : ''} remaining until first report.</div>`
  }
  const cats = [
    { n: 'Development', score: gs.devScore, desc: 'Academy, hospital, training infrastructure.' },
    { n: 'Diplomacy', score: gs.dipScore, desc: 'Alliances, relations, summit influence.' },
    { n: 'Military', score: gs.milScore, desc: 'Exam wins, S-rank missions, top-tier shinobi.' },
    { n: 'Legacy', score: gs.legScore, desc: 'Hall of legends, legend score, chronicles.' },
  ]
  const gradeColor = gs.grade === 'S' ? 'var(--red)' : gs.grade === 'A' ? 'var(--orange)' : gs.grade === 'B' ? 'var(--gold)' : gs.grade === 'C' ? 'var(--green)' : 'var(--text-faint)'
  return html + `<div>
    <div class="well" style="text-align:center;padding:16px 0;margin-bottom:12px;background:var(--bg);border:1px solid var(--border);border-radius:4px">
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:6px;text-transform:uppercase;letter-spacing:2px">Year ${gs.year} Legacy Grade</div>
      <div style="font-size:48px;font-weight:bold;color:${gradeColor}">${gs.grade}</div>
      <div style="font-size:var(--fs-lead);color:var(--text-dim)">${gs.overall}/100</div>
    </div>
    <div style="display:grid;gap:6px">
      ${cats.map(c => `<div class="ke-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:var(--fs-body);color:var(--text-hi)">${c.n}</span>
          <span style="font-size:var(--fs-body);color:var(--gold);font-weight:bold">${c.score}/100</span>
        </div>
        <div class="bar" style="margin-bottom:4px"><div class="fill" style="width:${c.score}%"></div></div>
        <div style="font-size:var(--fs-small);color:var(--text-faint)">${c.desc}</div>
      </div>`).join('')}
    </div>
  </div>`
}

/**
 * The lineage — what survives this run. Shown alongside the dynasty clock so
 * the two timescales sit next to each other: this tenure, and the name behind it.
 */
function _legacyStandingCard() {
  const store = loadLegacy()
  const tier = tierFor(store.points)
  const next = nextTier(store.points)
  const { total, bequest } = previewStartingBonuses()
  const past = [...(store.tenures || [])].reverse()

  const END_LABEL = { completed: 'completed the dynasty', retired: 'stepped down', dismissed: 'dismissed' }

  return `<div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:10px 12px;margin-bottom:12px">
    <div class="sect">The Lineage</div>
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">
      <span style="font-size:var(--fs-title);color:var(--gold);font-family:'Courier New',monospace">${store.points}</span>
      <span style="font-size:var(--fs-body);color:var(--text-hi)">${tier.name}</span>
      ${store.dynastiesCompleted ? `<span style="font-size:var(--fs-small);color:var(--text-dim)">· ${store.dynastiesCompleted} dynast${store.dynastiesCompleted === 1 ? 'y' : 'ies'} completed</span>` : ''}
      ${store.bestGrade ? `<span style="font-size:var(--fs-small);color:var(--text-dim)">· best grade ${store.bestGrade}</span>` : ''}
    </div>
    ${next
      ? `<div style="font-size:var(--fs-micro);color:var(--text-dim);margin-bottom:6px">${next.at - store.points} more legacy points → ${next.name}</div>`
      : `<div style="font-size:var(--fs-micro);color:var(--gold-2);margin-bottom:6px">Highest standing reached.</div>`}
    ${(total.ryo || total.legend || total.rep || total.monthly) ? `
      <div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Your next Warden begins with</div>
      <div style="font-size:var(--fs-small);color:var(--green)">
        ${[total.ryo && `${fmt(total.ryo)} ryo`, total.legend && `${total.legend} legend`, total.rep && `${total.rep} reputation`, total.monthly && `${fmt(total.monthly)}/mo stipend`].filter(Boolean).join(' · ')}
        ${bequest ? `<span style="color:var(--gold)"> (incl. ${bequest.grade}-grade bequest)</span>` : ''}
      </div>` : `
      <div style="font-size:var(--fs-small);color:var(--text-dim)">No legacy yet — conclude a tenure to leave one.</div>`}
    ${past.length ? `
      <div style="font-size:var(--fs-micro);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin:8px 0 3px">Wardens before you</div>
      ${past.slice(0, 6).map(t2 => `<div style="display:flex;gap:8px;font-size:var(--fs-small);color:var(--text-dim);padding:1px 0">
        <span style="color:var(--text-hi);min-width:9em">${t2.wardenName}</span>
        <span style="min-width:6em">${t2.vName}</span>
        <span style="min-width:5em">${t2.yearsServed}yr · ${t2.grade}</span>
        <span style="flex:1">${END_LABEL[t2.endedBy] || t2.endedBy}</span>
        <span style="color:var(--gold)">+${t2.earned}</span>
      </div>`).join('')}` : ''}
  </div>`
}

export function triggerDynastyHandoff() {
  const year = G.year || 1
  // Handing over is available well before the full dynasty so that a short
  // tenure is a real option, not a failure state -- but only reaching
  // DYNASTY_YEARS counts as *completing* the dynasty, which is what arms the
  // bequest. Stepping away early banks a smaller, still-compounding legacy.
  if (year < HANDOFF_MIN_YEARS) { ntf(tr('toast.legacy.handoffRequires', { year: HANDOFF_MIN_YEARS })); return }
  if (!G.successorId) { ntf(tr('toast.legacy.designateFirst')); return }
  const completed = year >= DYNASTY_YEARS
  const { grade, score } = computeDynastyGrade(G)
  const bonuses = inheritedBonuses(grade)
  const successor = G.shinobi?.find(x => x.id === G.successorId) || G.staff?.find(x => x.id === G.successorId)
  const successorName = successor ? sn(successor) : 'your heir'

  G.dynastyHandoffRecord = {
    year: G.year, grade, score, successorName,
    bonuses, vName: G.vName, legend: G.legend,
    hallCount: (G.hallOfLegends || []).length,
  }

  // Bank it to the cross-run store. THIS is what the old handoff never did --
  // it wrote the record above and nothing ever read it, so a completed dynasty
  // carried nothing into the next run.
  const banked = bankTenure(G, completed ? 'completed' : 'retired')
  G.dynastyHandoffRecord.earned = banked.record.earned
  G.dynastyHandoffRecord.legacyTotal = banked.store.points

  addChronicle('Dynasty Handoff',
    `${G.vName} ${completed ? 'dynasty concluded' : 'tenure ended'} at Year ${G.year}. Grade ${grade} (${score}/130). ${successorName} takes leadership.`,
    'milestone')
  aL(tr('toast.legacy.torchPassed', { name: successorName, grade }), 'good')
  aL(`Legacy earned: ${banked.record.earned} points (${banked.store.points} total).`, 'good')

  if (completed) {
    bonuses.forEach(b => {
      const value = `${typeof b.value === 'number' && b.value > 999 ? fmt(b.value) : b.value}${b.id.includes('ryo') ? ' ryo' : ''}`
      aL(tr('toast.legacy.inherited', { desc: b.desc, value }), 'good')
    })
  }

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

// ── Records tab ─────────────────────────────────────────────────────────────
function _records() {
  const stats = G.seasonStats || {}
  const awards = G.seasonAwards || {}
  const years = Object.keys(stats).map(Number).sort((a, b) => b - a)

  if (years.length === 0) {
    return `<div style="color:var(--text-dim);font-size:var(--fs-body);padding:12px 0">No seasonal records yet. Records populate at the end of each year (December).</div>`
  }

  const draftHtml = G.draftOrder?.length
    ? `<div class="ke-card" style="margin-bottom:14px">
        <div style="font-size:var(--fs-body);letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:8px">Draft Order — Year ${G.year}</div>
        <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:6px">Academy intake priority seeded by inverse standings. Your pick: <span style="color:var(--text-hi);font-weight:bold">#${G._draftPlayerPick || '?'}</span></div>
        ${G.draftOrder.map((n, i) => {
          const isYou = n === G.vName
          return `<div style="display:flex;gap:8px;align-items:center;padding:3px 0;border-bottom:1px solid var(--sunken)">
            <span style="font-size:var(--fs-body);color:${isYou?'var(--gold)':'var(--border-hi)'};width:20px">#${i+1}</span>
            <span style="font-size:var(--fs-body);color:${isYou?'var(--text-hi)':'var(--text-dim)'}">${n}${isYou?' (you)':''}</span>
          </div>`
        }).join('')}
        ${G.ryo >= 8000
          ? `<button class="gb gb-b" style="margin-top:8px;font-size:var(--fs-small)" onclick="sellDraftPick()">Sell pick #${G._draftPlayerPick} to rival (8k ryo)</button>`
          : `<div style="font-size:var(--fs-small);color:var(--text-faint);margin-top:6px">Need 8k ryo to trade pick</div>`}
      </div>`
    : ''

  const yearsHtml = years.map(yr => {
    const snap = stats[yr]
    const aw = awards[yr] || {}
    const ll = leagueLeaders(snap)

    const awardRows = Object.values(aw).filter(Boolean).map(a =>
      `<div style="font-size:var(--fs-small);padding:2px 0;border-bottom:1px solid var(--sunken)"><span style="color:var(--gold)">${a.label}:</span> <span style="color:var(--text-hi)">${a.name}</span> — <span style="color:var(--text-dim)">${a.reason}</span></div>`
    ).join('') || `<div style="font-size:var(--fs-small);color:var(--text-faint)">${tr("legacy.noAwards")}</div>`

    const standHtml = snap.standings.slice(0, 5).map((r, i) => {
      const isYou = r.name === G.vName
      return `<tr style="${isYou?'color:var(--gold);font-weight:bold':'color:var(--text-dim)'}">
        <td style="padding:2px 5px">${i+1}</td><td>${r.name}${isYou?' ★':''}</td>
        <td style="text-align:right;padding:2px 5px">${r.pts||0}pts</td>
        <td style="text-align:right;padding:2px 5px">${r.w||0}W/${r.l||0}L</td>
      </tr>`
    }).join('')

    const leaderHtml = ll.topWins.slice(0, 3).map((p, i) =>
      `<div style="font-size:var(--fs-small);color:var(--text-dim);padding:1px 0">${i+1}. ${p.name} — ${p.winsThisSeason} wins</div>`
    ).join('')

    return `<div class="ke-card" style="margin-bottom:10px">
      <div style="font-size:var(--fs-body);color:var(--gold);font-weight:bold;margin-bottom:8px">Year ${yr} · Prestige ${snap.prestige} · Standing #${snap.playerStanding}</div>
      <div style="font-size:var(--fs-body);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${tr("legacy.standings")}</div>
      <table style="width:100%;border-collapse:collapse;font-size:var(--fs-body);margin-bottom:10px">
        <tbody>${standHtml}</tbody>
      </table>
      <div style="font-size:var(--fs-body);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${tr("legacy.winLeaders")}</div>
      <div style="margin-bottom:10px">${leaderHtml || '<div style="font-size:var(--fs-small);color:var(--text-faint)">${tr("legacy.noData")}</div>'}</div>
      <div style="font-size:var(--fs-body);color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${tr("legacy.awards")}</div>
      <div>${awardRows}</div>
    </div>`
  }).join('')

  return draftHtml + yearsHtml
}

export function sellDraftPick() {
  if (!G.draftOrder || !G._draftPlayerPick) return
  if (G.ryo < 8000) { ntf(tr('toast.common.notEnoughRyo')); return }
  G.ryo += 8000
  const oldPick = G._draftPlayerPick
  G.draftOrder = G.draftOrder.filter(n => n !== G.vName)
  G._draftPlayerPick = null
  addChronicle('Draft Pick Traded', `Sold academy intake pick #${oldPick} to rivals for 8,000 ryo.`, 'economy')
  ntf(tr('toast.legacy.pickSold', { pick: oldPick })); upUI()
}
