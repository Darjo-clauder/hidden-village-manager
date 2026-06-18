import { G, ui, sPow, sn, clamp, fmt } from '../state.js'
import { RANKS, RKC } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { sBars, pCl } from './roster.js'
import { isEnabled } from '../../../config/features.js'
import { TRAINING_PLANS, PLAN_BY_ID } from '../../../shared/constants/trainingPlans.js'
import { applyGraduationBias } from '../prospectEngine.js'

// ── Hidden attribute display ──────────────────────────────────────────────────
const ATTR_LABELS = {
  resilience:    { short: 'RES', color: '#8fbc8f' },
  coachability:  { short: 'COA', color: '#87ceeb' },
  pressure:      { short: 'PRS', color: '#c9a84c' },
  adaptability:  { short: 'ADP', color: '#cc7fb8' },
  leadership:    { short: 'LDR', color: '#f0a030' },
}

function _hiddenAttrsHtml(p) {
  if (!isEnabled('SCOUTING')) return ''
  const attrs = p.hiddenAttributes
  if (!attrs || attrs.length === 0) return ''
  const revealedCount = attrs.filter(a => a.revealed).length
  if (revealedCount === 0 && !(p.bestConfidence >= 65)) return ''

  const slots = attrs.map(attr => {
    const meta = ATTR_LABELS[attr.key] || { short: attr.key.slice(0, 3).toUpperCase(), color: '#888' }
    if (!attr.revealed) {
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;opacity:.35">
        <div style="font-size:6px;color:#666">${meta.short}</div>
        <div style="font-size:9px;color:#555">?</div>
      </div>`
    }
    const pct = Math.round((attr.value / 20) * 100)
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px" title="${attr.key}: ${attr.value}/20">
      <div style="font-size:6px;color:${meta.color}">${meta.short}</div>
      <div style="font-size:9px;color:${meta.color};font-weight:bold">${attr.value}</div>
      <div style="width:18px;height:2px;background:#2e2a22;border-radius:1px">
        <div style="width:${pct}%;height:100%;background:${meta.color};border-radius:1px"></div>
      </div>
    </div>`
  }).join('')

  return `<div style="margin-top:7px;padding-top:6px;border-top:1px solid #2e2a22">
    <div style="font-size:7px;color:#555;margin-bottom:4px">Hidden Attributes — ${revealedCount}/5 revealed</div>
    <div style="display:flex;gap:8px">${slots}</div>
  </div>`
}

const CURVE_META = {
  linear:       { label: 'Linear',       color: '#87ceeb', desc: 'Steady growth across career' },
  early_peak:   { label: 'Early Peak',   color: '#c9a84c', desc: 'Fast growth, hard ceiling at 19' },
  late_bloomer: { label: 'Late Bloomer', color: '#cc7fb8', desc: 'Slow start, accelerates after 21' },
  volatile:     { label: 'Volatile',     color: '#f0a030', desc: 'Unpredictable swings each month' },
}

function _developmentHtml(p) {
  if (!isEnabled('SCOUTING')) return ''
  const ability = p.currentAbility ?? 0
  const potential = p.potential ?? null
  const hasPotential = potential !== null && (p.scouted || (p.potRange && p.potRange.exact))
  const pct = hasPotential ? Math.round((ability / potential) * 100) : null
  const milestones = p.milestones || []

  const curveHtml = p.curveRevealed && p.developmentCurve
    ? (() => {
        const m = CURVE_META[p.developmentCurve] || { label: p.developmentCurve, color: '#888', desc: '' }
        return `<span style="color:${m.color};font-size:7px" title="${m.desc}">⬡ ${m.label}</span>`
      })()
    : ''

  const progressHtml = hasPotential
    ? `<div style="margin-top:4px">
        <div style="display:flex;justify-content:space-between;font-size:7px;color:#555;margin-bottom:2px">
          <span>Dev progress <span style="color:#e8e0cc">${ability}</span> → pot <span style="color:#c9a84c">${potential}</span></span>
          <span style="color:#888">${pct}%</span>
        </div>
        <div style="background:#2e2a22;height:3px;border-radius:2px">
          <div style="background:linear-gradient(to right,#4a90a4,#c9a84c);height:3px;border-radius:2px;width:${pct}%"></div>
        </div>
      </div>`
    : ''

  const mileHtml = milestones.length
    ? `<div style="font-size:7px;color:#8fbc8f;margin-top:3px">✦ ${milestones[milestones.length - 1].ability} reached Y${milestones[milestones.length - 1].year}</div>`
    : ''

  if (!curveHtml && !progressHtml) return ''
  return `<div style="margin-top:5px;display:flex;flex-direction:column;gap:1px">
    ${curveHtml}${progressHtml}${mileHtml}
  </div>`
}

function _scoutHistoryHtml(p) {
  if (!isEnabled('SCOUTING')) return ''
  const history = p.scoutHistory
  if (!history || history.length === 0) return ''
  const latest = history[history.length - 1]
  const best = p.bestConfidence || latest.confidence
  const qualColor = best >= 80 ? '#c9a84c' : best >= 65 ? '#87ceeb' : best >= 50 ? '#9cf' : '#888'
  const qualLabel = best >= 80 ? 'Elite' : best >= 65 ? 'Detailed' : best >= 50 ? 'General' : 'Impression'
  return `<div style="margin-top:4px;font-size:7.5px;color:#555">
    ${history.length} report${history.length > 1 ? 's' : ''} ·
    Best: <span style="color:${qualColor}">${qualLabel} (${best}%)</span>
    ${p.conflictingRanges?.length ? ' · <span style="color:#f99">⚠ conflicting reads</span>' : ''}
    ${p.trialDayDone ? ' · <span style="color:#8fbc8f">✓ trial day</span>' : ''}
  </div>`
}

function _rivalOfferHtml(p) {
  const offer = p.rivalOffer
  if (!offer) return ''
  const canMatch   = (G.ryo || 0) >= offer.offerRyo
  const canExceed  = (G.ryo || 0) >= Math.round(offer.offerRyo * 1.2)
  const matchCost  = offer.offerRyo
  const exceedCost = Math.round(offer.offerRyo * 1.2)
  return `<div style="margin-top:7px;padding:7px;background:#1a0a00;border:1px solid #8b3a00;border-radius:3px">
    <div style="font-size:8px;color:#f90;font-weight:bold;margin-bottom:4px">⚔ ${offer.village} offer — ${offer.offerRyo.toLocaleString()} ryo</div>
    <div style="font-size:7px;color:#7a5a3a;margin-bottom:6px">Expires Y${offer.expiresYear}·M${offer.expiresMonth}. Match to secure, exceed for loyalty bonus.</div>
    <div style="display:flex;gap:5px">
      <button class="gb gb-g" onclick="matchRivalOffer('${p.id}')" ${canMatch ? '' : 'disabled'}
        style="font-size:7px">Match — ${matchCost.toLocaleString()} ryo</button>
      <button class="gb" onclick="exceedRivalOffer('${p.id}')" ${canExceed ? '' : 'disabled'}
        style="font-size:7px;color:#c9a84c;border-color:#c9a84c">Exceed +20% — ${exceedCost.toLocaleString()} ryo</button>
      <button class="gb gb-r" onclick="confirm('Let ${p.fn} ${p.ln} go to ${offer.village}? They will sign elsewhere.') && declineRivalOffer('${p.id}')"
        style="font-size:7px">Let go</button>
    </div>
  </div>`
}

function _trainingPlanHtml(p) {
  if (!isEnabled('ACADEMY')) return ''
  const active = PLAN_BY_ID[p.trainingPlanId]
  const coachAttr = (p.hiddenAttributes || []).find(a => a.key === 'coachability')
  const coachRevealed = coachAttr?.revealed

  const badge = active
    ? `<span style="font-size:7px;padding:1px 6px;border:1px solid ${active.color};color:${active.color};border-radius:2px">${active.icon} ${active.label}</span>`
    : `<span style="font-size:7px;color:#555">No plan assigned</span>`

  const coachHint = coachRevealed
    ? `<span style="font-size:7px;color:#cc7fb8;margin-left:6px" title="Coachability amplifies plan bonus">COA ${coachAttr.value}/20 +${Math.round(coachAttr.value / 20 * 10)}%</span>`
    : ''

  const opts = TRAINING_PLANS.map(pl =>
    `<option value="${pl.id}" ${p.trainingPlanId === pl.id ? 'selected' : ''}>${pl.icon} ${pl.label}</option>`
  ).join('')

  return `<div style="margin-top:7px;padding-top:6px;border-top:1px solid #2e2a22">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:4px">${badge}${coachHint}</div>
    </div>
    <div style="display:flex;gap:5px;align-items:center">
      <select onchange="setTrainingPlan('${p.id}',this.value)"
        style="flex:1;background:#1a1a12;border:1px solid #3a3620;color:#c9a84c;font-size:7px;padding:2px 4px;border-radius:2px">
        <option value="">— Assign plan…</option>
        ${opts}
      </select>
      ${active ? `<span style="font-size:7px;color:#555" title="${active.desc}">?</span>` : ''}
    </div>
    ${active ? `<div style="font-size:7px;color:#555;margin-top:3px;font-style:italic">${active.desc}</div>` : ''}
  </div>`
}

const MINOR_CLANS = [
  { n: 'Enzaru',    t: 'Fire Arts',    statKey: 'ninjutsu' },
  { n: 'Kagami',    t: 'Mirror Arts',  statKey: 'intelligence' },
  { n: 'Arashi',    t: 'Space-Time',   statKey: 'speed' },
  { n: 'Maboroshi', t: 'Illusion Web', statKey: 'genjutsu' },
  { n: 'Kushiro',   t: 'Sigil Arts',   statKey: 'chakra' },
  { n: 'Tsukikage', t: 'Moon Shadow',  statKey: 'taijutsu' },
  { n: 'Hariha',    t: 'Needle Art',   statKey: 'speed' },
  { n: 'Touma',     t: 'Pressure Arts', statKey: 'intelligence' },
]

function pk(a) { return a[Math.floor(Math.random() * a.length)] }
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a }

export function rAc() {
  document.getElementById('acl').innerHTML = G.prospects.map(p => {
    const potText = p.scouted ? p.potential : '???'
    const potColor = p.scouted ? '#c9a84c' : '#7a7060'
    const scoutingAm = G.aM.find(am => am.isScout && am.scoutTargetId === p.id)
    const canRecruit = G.ryo >= 2000
    const archFlavorTrunc = (p.archetype?.flavor || '').slice(0, 90) + ((p.archetype?.flavor || '').length > 90 ? '…' : '')
    const rival = p.rivalId ? G.prospects.find(x => x.id === p.rivalId) : null

    // Patience bar (turns grey then red as they wait)
    const waited = p.monthsWaiting || 0
    const patience = Math.max(0, 100 - waited * 12.5)
    const patienceColor = patience > 60 ? '#8fbc8f' : patience > 30 ? '#fa0' : '#f66'
    const patienceLabel = patience > 60 ? 'Patient' : patience > 30 ? 'Restless' : 'Leaving soon'

    const currentSensei = p.mentor ? G.shinobi.find(s => s.id === p.mentor) : null
    const familySib = p.familyId ? G.prospects.filter(x => x.id !== p.id && x.familyId === p.familyId) : []
    const isScoutSourced = !!p.fromRegion
    const urgencyBorder = isScoutSourced && p.urgencyMonths <= 2 && p.rivalInterest ? 'border-color:#f66' : p.prodigy ? 'border-color:#c9a84c;box-shadow:0 0 8px rgba(201,168,76,0.2)' : waited >= 6 ? 'border-color:#f66' : ''
    return `<div class="card" style="${urgencyBorder}">
      ${isScoutSourced && p.rivalInterest && p.urgencyMonths > 0 ? `<div style="background:#3a0000;border-radius:3px;padding:2px 6px;font-size:7px;color:#f99;margin-bottom:5px">⚠ Rival village interest — ${p.urgencyMonths}m urgency window</div>` : ''}
      ${isScoutSourced ? `<div style="font-size:7px;color:#9b7fbf;margin-bottom:4px">🗺 Scouted by ${p.scoutName||'unknown'} · ${p.origin}</div>` : ''}
      <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:7px">
        <div style="flex:1">
          <div style="font-size:11px;color:${p.prodigy ? '#c9a84c' : '#e8e0cc'};font-weight:bold">${sn(p)}${p.prodigy ? ' <span style="font-size:8px;color:#c9a84c">✦ PRODIGY</span>' : ''}</div>
          <div style="font-size:8px;color:#7a7060">${p.clan ? p.clan + ' · ' + p.trait : p.spec} · Age ${p.age}${p.origin ? ' · <span style="color:#cc7fb8">from ' + p.origin + '</span>' : ''}</div>
          ${p.archetype ? `<div style="font-size:8px;color:#cc7fb8;margin-top:2px;letter-spacing:1px">${p.archetype.n}</div>` : ''}
          ${rival ? `<div style="font-size:8px;color:#f66;margin-top:2px">⚔ Rivals with ${sn(rival)}</div>` : ''}
          ${familySib.length ? `<div style="font-size:8px;color:#87ceeb;margin-top:2px">👪 ${p.ln} family — with ${familySib.map(x => x.fn).join(', ')}</div>` : ''}
          ${currentSensei ? `<div style="font-size:8px;color:#c9a84c;margin-top:2px">Sensei: ${sn(currentSensei)}</div>` : ''}
        </div>
        <span class="rk ${RKC[p.ri]}">${RANKS[p.ri]}</span>
      </div>
      <div style="font-size:8px;color:#7a7060;font-style:italic;margin-bottom:7px;line-height:1.5">${archFlavorTrunc}</div>
      <div class="sg">${sBars(p)}</div>
      <div style="margin-top:7px;display:flex;align-items:center;justify-content:space-between">
        ${p.pers ? `<span class="trait-tag ${pCl(p.pers)}">${p.pers.n}</span>` : ''}
        <div style="font-size:8px">
          Pwr <span style="color:#e8e0cc">${sPow(p)}</span>
          &nbsp;·&nbsp;
          Pot <span style="color:${potColor}">${isScoutSourced && p.potRange && !p.potRange.exact ? p.potRange.lo + '–' + p.potRange.hi + '?' : potText}</span>
          ${p.scouted ? '' : isScoutSourced ? '' : '<span style="color:#3a3630;font-size:7px"> (unverified)</span>'}
        </div>
      </div>
      ${_trainingPlanHtml(p)}
      ${_developmentHtml(p)}
      <div style="margin-top:6px">
        <div style="display:flex;justify-content:space-between;font-size:7px;color:#7a7060;margin-bottom:2px">
          <span>Patience — <span style="color:${patienceColor}">${patienceLabel}</span></span>
          <span style="color:${patienceColor}">${waited}m waiting</span>
        </div>
        <div style="background:#2e2a22;height:2px;border-radius:1px">
          <div style="background:${patienceColor};height:2px;border-radius:1px;width:${patience}%"></div>
        </div>
      </div>
      ${_scoutHistoryHtml(p)}
      ${_hiddenAttrsHtml(p)}
      ${_rivalOfferHtml(p)}
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <button class="gb gb-g" onclick="rec('${p.id}')" ${canRecruit ? '' : 'disabled'}>Recruit — 2,000 ryo ►</button>
        ${scoutingAm
          ? `<div style="font-size:9px;color:#fa0;align-self:center">⟳ Being scouted…</div>`
          : p.scouted
            ? `<div style="font-size:9px;color:#8fbc8f;align-self:center">✓ Scouted</div>`
            : `<button class="gb" onclick="oScout('${p.id}')" ${G.ryo >= 3000 ? '' : 'disabled'}>Scout — 3,000 ryo ►</button>`
        }
        ${!p.mentor ? `<button class="gb" onclick="oSensei('${p.id}')">Assign Sensei</button>` : ''}
      </div>
    </div>`
  }).join('') || '<div style="color:#7a7060;font-size:10px">No prospects. Advance month.</div>'
}

export function rec(id) {
  if (G.ryo < 2000) { ntf('Not enough ryo!'); return }
  const p = G.prospects.find(x => x.id === id); if (!p) return
  G.ryo -= 2000

  const recruited = { ...p, status: 'available' }

  // Apply training plan graduation stat bias before any other bonuses
  applyGraduationBias(recruited)

  // 20% chance of minor clan affiliation on graduation (if no existing clan)
  if (!recruited.clan && Math.random() < 0.20) {
    const mc = pk(MINOR_CLANS)
    recruited.clan = mc.n; recruited.trait = mc.t
    if (recruited.stats) recruited.stats[mc.statKey] = clamp(recruited.stats[mc.statKey] + rnd(3, 8), 0, 99)
    aL(sn(recruited) + ' revealed hidden ' + mc.n + ' heritage on graduation! Trait: ' + mc.t + '.', 'good')
  }

  // Homegrown tag — Academy graduates get a loyalty floor and lower salary demands
  if (recruited.academyOrigin) {
    recruited.homegrown = true
    if (recruited.pMatrix) recruited.pMatrix.loyalty = Math.max(recruited.pMatrix.loyalty, 12)
    recruited.salary = Math.round(recruited.salary * 0.85)
  }

  G.shinobi.push(recruited)
  G.prospects = G.prospects.filter(x => x.id !== id)
  // Cancel any in-progress scout for this prospect
  G.aM = G.aM.filter(am => !(am.isScout && am.scoutTargetId === id))

  aL(sn(p) + ' recruited.' + (p.scouted ? ' (Potential verified: ' + p.potential + ')' : ''), 'good')
  ntf(p.fn + ' joins!'); upUI()
}

export function oScout(prospectId) {
  const p = G.prospects.find(x => x.id === prospectId); if (!p) return
  const scouts = G.shinobi.filter(s => s.ri >= 2 && s.status === 'available')
  if (!scouts.length) { ntf('No available Jonin+ for scouting!'); return }
  if (G.ryo < 3000) { ntf('Need 3,000 ryo to scout!'); return }

  ui.scoutTarget = prospectId
  document.getElementById('scout-prospect-name').textContent = sn(p) + ' — ' + (p.archetype?.n || 'Unknown')
  document.getElementById('scout-list').innerHTML = scouts.map(s =>
    `<div class="pi" onclick="doScout('${s.id}')">
      <div>
        <div style="font-size:10px;color:#e8e0cc">${sn(s)}</div>
        <div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</div>
      </div>
      <span style="font-size:9px;color:#8fbc8f">Deploy ►</span>
    </div>`
  ).join('')
  document.getElementById('ov-scout').classList.add('open')
}

export function oSensei(prospectId) {
  const p = G.prospects.find(x => x.id === prospectId); if (!p) return
  const available = G.shinobi.filter(s => s.ri >= 2 && s.status === 'available' && !G.prospects.some(pr => pr.mentor === s.id))
  if (!available.length) { ntf('No available Jonin+ free to mentor!'); return }
  ui.scoutTarget = prospectId
  document.getElementById('sensei-prospect-name').textContent = sn(p)
  document.getElementById('sensei-list').innerHTML = available.map(s =>
    `<div class="pi" onclick="doSensei('${s.id}')">
      <div>
        <div style="font-size:10px;color:#e8e0cc">${sn(s)}</div>
        <div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · ${s.pers.n} · Pwr ${sPow(s)}</div>
      </div>
      <span style="font-size:9px;color:#c9a84c">Assign ►</span>
    </div>`
  ).join('')
  document.getElementById('ov-sensei').classList.add('open')
}

export function doSensei(shinobiId) {
  const prospectId = ui.scoutTarget
  const p = G.prospects.find(x => x.id === prospectId)
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!p || !s) { cm('sensei'); return }
  p.mentor = shinobiId
  aL(sn(s) + ' assigned as sensei to ' + sn(p) + '. Training accelerated.', 'good')
  ntf(sn(s) + ' mentoring ' + p.fn + '!')
  cm('sensei'); upUI()
}

export function doScout(shinobiId) {
  const prospectId = ui.scoutTarget
  const p = G.prospects.find(x => x.id === prospectId)
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!p || !s) { cm('scout'); return }
  if (G.ryo < 3000) { ntf('Not enough ryo!'); cm('scout'); return }

  G.ryo -= 3000
  s.status = 'mission'; s.missId = 'scout-' + prospectId
  G.aM.push({
    id: Math.random().toString(36).slice(2),
    isScout: true,
    scoutTargetId: prospectId,
    assignedTo: shinobiId,
    daysLeft: 1,
    missionId: null,
    squadId: null,
    isSquad: false,
  })

  aL(sn(s) + ' sent to scout ' + sn(p) + '.', 'neutral')
  ntf('Scouting ' + p.fn + '…')
  cm('scout'); upUI()
}

export function matchRivalOffer(prospectId) {
  const p = G.prospects.find(x => x.id === prospectId)
  if (!p?.rivalOffer) return
  const cost = p.rivalOffer.offerRyo
  if (G.ryo < cost) { ntf('Not enough ryo to match!'); return }
  G.ryo -= cost
  const village = p.rivalOffer.village
  p.rivalOffer = null
  p.rivalInterest = false
  aL(`Matched ${village}'s offer — ${p.fn} ${p.ln} signs with us for ${cost.toLocaleString()} ryo.`, 'good')
  ntf(`${p.fn} ${p.ln} secured!`)
  upUI()
}

export function exceedRivalOffer(prospectId) {
  const p = G.prospects.find(x => x.id === prospectId)
  if (!p?.rivalOffer) return
  const cost = Math.round(p.rivalOffer.offerRyo * 1.2)
  if (G.ryo < cost) { ntf('Not enough ryo to exceed!'); return }
  G.ryo -= cost
  const village = p.rivalOffer.village
  p.rivalOffer = null
  p.rivalInterest = false
  // Loyalty floor bonus for outbidding a rival
  if (p.pMatrix) p.pMatrix.loyalty = Math.max((p.pMatrix.loyalty || 0) + 3, 15)
  p.loyaltyBonus = true
  aL(`Outbid ${village} — ${p.fn} ${p.ln} joins with loyalty bonus (+3 loyalty floor).`, 'good')
  ntf(`${p.fn} ${p.ln} committed!`)
  upUI()
}

export function declineRivalOffer(prospectId) {
  const p = G.prospects.find(x => x.id === prospectId)
  if (!p?.rivalOffer) return
  const village = p.rivalOffer.village
  aL(`${village}'s offer for ${p.fn} ${p.ln} declined — they will sign elsewhere shortly.`, 'warn')
  G.prospects = G.prospects.filter(x => x.id !== prospectId)
  upUI()
}

export function setTrainingPlan(prospectId, planId) {
  const p = G.prospects.find(x => x.id === prospectId)
  if (!p) return
  const plan = PLAN_BY_ID[planId]
  p.trainingPlanId = planId || null
  if (plan) {
    aL(`${p.fn} ${p.ln} assigned to ${plan.label} training — ${plan.desc}`, 'neutral')
    ntf(`${p.fn}: ${plan.label}`)
  } else {
    aL(`${p.fn} ${p.ln} removed from training plan.`, 'neutral')
  }
  upUI()
}
