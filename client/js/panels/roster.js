import { G, sPow, clamp, rnd, sn, fmt, pDesc, personalityJudge, computeMarketValue } from '../state.js'
import { RANKS, RKC, JUTSU_LIST, INJURY_TYPES, EVOLVED_TRAITS } from '../constants.js'
import { jutsuLoadoutBonus, toggleLoadoutSlot, LOADOUT_MAX } from '../../../shared/jutsu/loadout.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { PHASE_META, ensureCareerFields } from '../careerEngine.js'

export function sBars(s) {
  return ['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed'].map(k =>
    `<div class="sr"><div class="sl">${k.slice(0,5)}</div><div class="sw"><div class="bar"><div class="fill" style="width:${s.stats[k]}%"></div></div><div class="sn">${s.stats[k]}</div></div></div>`
  ).join('')
}

export function pCl(p) { return p.cat === 'pos' ? 'trait-pos' : p.cat === 'neg' ? 'trait-neg' : 'trait-neu' }

export function rRo() {
  const el = document.getElementById('rl')
  if (!G.shinobi.length) { el.innerHTML = '<div style="color:#7a7060;font-size:10px">No shinobi. Recruit from Academy.</div>'; return }
  el.innerHTML = G.shinobi.map(s => {
    const sq = G.squads.find(q => q.members.includes(s.id))
    const stT = s.status === 'available' ? '<span class="st st-a">Available</span>' : s.status === 'mission' ? '<span class="st st-m">Mission</span>' : s.status === 'injured' ? `<span class="st st-i">Injured ${s.injDays}m</span>` : '<span class="st st-e">Exam</span>'
    return `<div class="card" onclick="oDos('${s.id}')"><div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:6px"><div style="flex:1"><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${sn(s)}${s.jk ? ` <span style="font-size:8px;color:#c9a84c">[${s.jk} JK]</span>` : ''}</div><div style="font-size:8px;color:#7a7060">${s.clan ? s.clan + ' · ' + s.trait : s.spec} · Age ${s.age}${sq ? ' · ' + sq.n : ''}</div></div><span class="rk ${RKC[s.ri]}">${RANKS[s.ri]}</span></div><div class="sg">${sBars(s)}</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px"><div style="display:flex;align-items:center;gap:5px">${stT}<span class="trait-tag ${pCl(s.pers)}">${s.pers.n}</span></div><div style="font-size:8px;color:#7a7060">Pwr ${sPow(s)} · ${fmt(s.salary)}/mo</div></div></div>`
  }).join('')
}

export function oDos(id) {
  window._dosActiveId = id
  const s = G.shinobi.find(x => x.id === id); if (!s) return
  const jkB = s.jk ? G.beasts.find(b => b.n === s.jk) : null
  const sq = G.squads.find(q => q.members.includes(s.id))
  document.getElementById('dos-t').textContent = sn(s) + ' — Dossier'
  // Build jutsu section
  const knownJutsu = (s.jutsu || []).map(jId => JUTSU_LIST.find(j => j.id === jId)).filter(Boolean)
  const loadout = s.jutsuLoadout || []
  const jlb = jutsuLoadoutBonus(s, JUTSU_LIST)
  const tierColor = t => t === 'rare' ? '#cc7fb8' : t === 'uncommon' ? '#c9a84c' : '#87ceeb'
  const jutsuHtml = knownJutsu.length
    ? `<div style="margin-bottom:10px">
        <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">
          Jutsu Loadout <span style="color:#444;font-size:7px">(${loadout.length}/${LOADOUT_MAX} active)</span>
          ${jlb.powerMod > 0 || jlb.successMod > 0 ? `<span style="color:var(--green);font-size:7px;margin-left:6px">+${Math.round((jlb.powerMod*0.5+jlb.successMod)*100)}% mission</span>` : ''}
        </div>
        ${knownJutsu.map(j => {
          const active = loadout.includes(j.id)
          const canAdd = !active && loadout.length < LOADOUT_MAX
          const bonusStr = [j.bonus?.powerMod ? `+${Math.round(j.bonus.powerMod*100)}% pow` : '', j.bonus?.successMod ? `+${Math.round(j.bonus.successMod*100)}% sc` : ''].filter(Boolean).join(' ')
          return `<div style="margin-bottom:4px;padding:4px 6px;border:1px solid ${active?'var(--green)':'var(--border)'};background:${active?'rgba(143,188,143,0.08)':'transparent'}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:9px;color:${tierColor(j.tier)};font-weight:bold">${j.n}</span>
              <button onclick="toggleJutsuLoadout('${s.id}','${j.id}')"
                style="font-size:6px;padding:1px 5px;border:1px solid ${active?'var(--green)':'var(--border)'};background:${active?'rgba(143,188,143,0.15)':'transparent'};color:${active?'var(--green)':canAdd?'var(--text-dim)':'#333'};cursor:${canAdd||active?'pointer':'default'}">
                ${active ? '✓ Active' : canAdd ? '+ Equip' : '— Full'}
              </button>
            </div>
            <div style="font-size:7px;color:#3a3630;margin-top:1px">${bonusStr} · ${j.desc}</div>
          </div>`
        }).join('')}
      </div>`
    : ''
  // Build bonds section
  const bondsHtml = (s.bonds || []).length
    ? `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Bonds</div>
       ${s.bonds.map(bnd => { const other = G.shinobi.find(x => x.id === bnd.otherId); return other ? `<div style="font-size:9px;color:#c9a84c;margin-bottom:2px">${bnd.type} — ${sn(other)}</div>` : '' }).filter(Boolean).join('')}</div>`
    : ''
  // Dark moment
  const darkHtml = s.darkMoment
    ? `<div style="margin-bottom:10px;padding:6px 8px;border-left:2px solid #f66;background:rgba(255,80,80,0.04)"><div style="font-size:7px;color:#f66;letter-spacing:2px;text-transform:uppercase;margin-bottom:3px">Dark Moment</div><div style="font-size:8px;color:#7a7060;font-style:italic">${s.darkMoment}</div></div>`
    : ''

  // Injury & availability panel
  const injTypeDef = s.injuryType ? INJURY_TYPES.find(t => t.id === s.injuryType) : null
  const workload = s.workload || 0
  const wColor = workload >= 80 ? '#f44' : workload >= 60 ? '#f99' : workload >= 40 ? '#fa0' : '#8fbc8f'
  const workloadBar = `<div style="background:#222;height:5px;border-radius:2px;overflow:hidden"><div style="width:${workload}%;height:100%;background:${wColor};transition:width .3s"></div></div>`
  // Second opinion & specialist treatment options
  const hasMedical = (G.staff||[]).some(st => st.role === 'medical')
  const alliedVillages = G.villages.filter(v => v.rel >= 50)
  const bestAlly = alliedVillages.sort((a,b) => b.rel - a.rel)[0]
  const canSecondOpinion = s.status === 'injured' && s.injDays >= 2 && hasMedical && !s.secondOpinionUsed
  const canSpecialist = s.status === 'injured' && s.injDays >= 3 && bestAlly && !s.specialistTreated

  const injuryHtml = `<div style="margin-bottom:10px">
    <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Availability & Workload</div>
    ${s.status === 'injured' && injTypeDef
      ? `<div style="padding:7px 9px;border:1px solid ${injTypeDef.color};background:rgba(0,0,0,.3);margin-bottom:6px">
           <div style="font-size:9px;color:${injTypeDef.color};font-weight:bold">${injTypeDef.n}</div>
           <div style="font-size:8px;color:#7a7060;margin-top:2px">${injTypeDef.desc}</div>
           <div style="font-size:8px;color:#7a7060;margin-top:4px">Expected return: <b style="color:#e8e0cc">${s.injDays} month${s.injDays!==1?'s':''}</b>${s.secondOpinionUsed ? ' <span style="color:#87ceeb">(reviewed)</span>' : ''}</div>
           ${(s.returningForm||100) < 100 ? `<div style="font-size:8px;color:#fa0;margin-top:2px">Post-recovery form: ${s.returningForm}% (builds over 2–3 missions)</div>` : ''}
           <div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">
             ${canSecondOpinion ? `<button class="gb" style="font-size:7px;border-color:#87ceeb;color:#87ceeb" onclick="secondOpinion('${s.id}')">Second Opinion (3,000 ryo) ▸</button>` : ''}
             ${canSpecialist ? `<button class="gb gb-g" style="font-size:7px" onclick="specialistTreatment('${s.id}','${bestAlly.n}')">Specialist Treatment via ${bestAlly.n} (12,000 ryo) ▸</button>` : ''}
           </div>
         </div>`
      : s.status === 'injured'
      ? `<div style="font-size:8px;color:#f44">Injured — ${s.injDays} month${s.injDays!==1?'s':''} remaining</div>`
      : `<div style="font-size:8px;color:#2d5;margin-bottom:4px">${s.status === 'available' ? 'Available' : s.status}</div>`
    }
    ${s.traumaStatus ? `<div style="padding:5px 7px;border:1px solid #cc7fb8;margin-bottom:6px">
      <div style="font-size:8px;color:#cc7fb8">⚠ Psychological Trauma: <b>${s.traumaStatus}</b> (${s.traumaMonths||0} months remaining)</div>
      <div style="font-size:8px;color:#7a7060;margin-top:2px">Stat penalty active. ${s.traumaCount >= 2 ? '<b style="color:#f66">High defection risk</b>' : 'Assign medical ninja for faster recovery.'}</div>
      ${hasMedical ? `<button class="gb gb-g" style="margin-top:5px;font-size:7px" onclick="treatTrauma('${s.id}')">Treat Trauma (5,000 ryo) ▸</button>` : ''}
    </div>` : ''}
    <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
      <div style="font-size:7px;color:#7a7060;text-transform:uppercase;width:60px">Workload</div>
      <div style="flex:1">${workloadBar}</div>
      <div style="font-size:8px;color:${wColor};min-width:28px;text-align:right">${workload}%</div>
    </div>
    <div style="font-size:7px;color:#3a3630;margin-top:2px">High workload (60%+) increases injury risk.</div>
    ${(s.consecutiveMissions||0) >= 2 ? `<div style="font-size:7px;color:#fa0;margin-top:2px">⚠ ${s.consecutiveMissions} consecutive missions — overuse risk +10%</div>` : ''}
  </div>
  ${(s.injuryHistory||[]).length > 0 ? `<div style="margin-bottom:10px">
    <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Injury History (${s.injuryHistory.length})</div>
    ${s.injuryHistory.slice().reverse().slice(0,6).map(h => {
      const tDef = INJURY_TYPES.find(t => t.id === h.type)
      return `<div style="display:flex;gap:6px;font-size:8px;margin-bottom:3px;align-items:baseline">
        <span style="color:#3a3630;min-width:50px">Yr${h.year}·M${h.month}</span>
        <span style="color:${tDef?.color||'#f99'}">${h.typeName||h.type}</span>
        <span style="color:#7a7060">${h.duration}mo</span>
        ${h.treatment !== 'standard' ? `<span style="color:#87ceeb;font-size:7px">[${h.treatment}]</span>` : ''}
      </div>`
    }).join('')}
    ${s.injuryHistory.length > 6 ? `<div style="font-size:7px;color:#3a3630">+${s.injuryHistory.length-6} earlier entries</div>` : ''}
  </div>` : ''}`
  // Personality matrix section
  const judgeLevel = personalityJudge()
  const pm = s.pMatrix || {}
  const pmTraits = ['loyalty','ambition','professionalism','temperament','adaptability']
  const pmHtml = `<div style="margin-bottom:10px">
    <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Character Read ${judgeLevel >= 16 ? '(Precise)' : judgeLevel >= 11 ? '(General)' : judgeLevel >= 6 ? '(Broad)' : '(Unknown)'}</div>
    ${pmTraits.map(k => {
      const val = pm[k] !== undefined ? pm[k] : 10
      const desc = pDesc(val, k, judgeLevel)
      const color = judgeLevel < 6 ? '#3a3630' : val >= 13 ? '#8fbc8f' : val >= 8 ? '#aaa' : '#f99'
      return `<div style="display:flex;gap:6px;font-size:8px;margin-bottom:3px"><span style="color:#7a7060;width:80px;text-transform:capitalize">${k}</span><span style="color:${color}">${desc}</span></div>`
    }).join('')}
    ${judgeLevel < 6 ? '<div style="font-size:7px;color:#3a3630;margin-top:4px">Hire a Council Advisor or Head Sensei to read character more accurately.</div>' : ''}
  </div>`
  // Evolved traits (gained through events, not fixed at creation)
  const evolvedHtml = (s.traits || []).length
    ? `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Evolved Traits</div>
       ${s.traits.map(t => `<div style="margin-bottom:4px"><span class="trait-tag ${t==='Resilient'||t==='Confident'?'trait-pos':t==='Resentful'||t==='Haunted'?'trait-neg':'trait-neu'}">${t}</span><div style="font-size:8px;color:#7a7060;margin-top:2px">${EVOLVED_TRAITS[t] || ''}</div></div>`).join('')}</div>`
    : ''
  // Individual morale & commitment bars
  const indMor = s.indMorale ?? 70
  const commit = s.commitment ?? 70
  const mColor = indMor >= 70 ? '#8fbc8f' : indMor >= 45 ? '#f0a030' : '#f66'
  const cColor = commit >= 60 ? '#c9a84c' : commit >= 30 ? '#f0a030' : '#f66'
  const moraleCommitHtml = `<div style="margin-bottom:10px">
    <div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">State of Mind</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div style="font-size:7px;color:#7a7060;width:70px">Individual Morale</div>
      <div style="flex:1;background:#222;height:4px;border-radius:2px"><div style="width:${indMor}%;height:100%;background:${mColor}"></div></div>
      <div style="font-size:8px;color:${mColor};min-width:24px">${indMor}</div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
      <div style="font-size:7px;color:#7a7060;width:70px">Commitment</div>
      <div style="flex:1;background:#222;height:4px;border-radius:2px"><div style="width:${commit}%;height:100%;background:${cColor}"></div></div>
      <div style="font-size:8px;color:${cColor};min-width:24px">${commit}</div>
    </div>
    ${s.legendStatus ? '<div style="font-size:8px;color:#c9a84c;margin-top:2px">★ Village Legend — exceptionally loyal</div>' : ''}
    ${commit <= 25 ? '<div style="font-size:7px;color:#f66;margin-top:2px">⚠ Low commitment — transfer risk! Consider a 1-on-1 meeting.</div>' : ''}
    ${s.roleGuarantee ? '<div style="font-size:7px;color:#87ceeb;margin-top:2px">Role guarantee promised — must deploy regularly.</div>' : ''}
    ${s.promotionDeadline ? '<div style="font-size:7px;color:#f0a030;margin-top:2px">⏳ Promotion deadline: month ' + s.promotionDeadline + '</div>' : ''}
    ${s.bingoBookPresence > 0 ? '<div style="font-size:7px;color:#f0a030;margin-top:2px">📖 Bingo Book: ' + ['','Listed','Featured','Legendary'][s.bingoBookPresence] + (s.bingoBookSuppressed ? ' (suppressed)' : '') + '</div>' : ''}
  </div>`

  const marketVal = computeMarketValue(s)
  const dosActiveTab = window._dosTab || 'profile'
  ensureCareerFields(s)

  // ── Phase 4: Training focus + rest toggle + contract + pair chemistry ─────────
  const STAT_OPTIONS = ['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed']
  const contractYearsLeft = s.contractEnd ? (s.contractEnd - (window.G?.year || 1)) : null
  const contractColor = contractYearsLeft !== null && contractYearsLeft <= 1 ? '#f66' : contractYearsLeft === 2 ? '#f0a030' : '#8fbc8f'

  // Pair chemistry: find pairs with 5+ missions
  const provenPairs = []
  if (window.G?.pairChemistryLog) {
    G.shinobi.forEach(other => {
      if (other.id === s.id) return
      const key = [s.id, other.id].sort().join('_')
      const count = G.pairChemistryLog[key] || 0
      if (count >= 5) provenPairs.push({ name: sn(other), count })
    })
  }

  const phase4Html = `<div style="margin-bottom:12px;background:#1a1a0d;border:1px solid #444;padding:10px">
    <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:8px">Field Management</div>

    <div style="margin-bottom:8px">
      <div style="font-size:8px;color:#7a7060;margin-bottom:4px">Training Focus <span style="color:#3a3630">(+1–3 stat/month, +12% workload)</span></div>
      <select onchange="setTrainingFocus('${s.id}',this.value)" style="background:#111;border:1px solid #444;color:#e8e0cc;font-size:8px;padding:3px 6px;width:100%">
        <option value="" ${!s.trainingFocus?'selected':''}>— None —</option>
        ${STAT_OPTIONS.map(st => `<option value="${st}" ${s.trainingFocus===st?'selected':''}>${st.charAt(0).toUpperCase()+st.slice(1)}</option>`).join('')}
      </select>
    </div>

    <div style="margin-bottom:8px;display:flex;align-items:center;gap:10px">
      <div>
        <div style="font-size:8px;color:#7a7060;margin-bottom:3px">Rest Month <span style="color:#3a3630">(skip deployment, −30% workload)</span></div>
        <button onclick="toggleRestMonth('${s.id}')" style="font-size:8px;padding:3px 10px;background:${s.restMonth?'#1a2e1a':'#111'};border:1px solid ${s.restMonth?'#8fbc8f':'#444'};color:${s.restMonth?'#8fbc8f':'#7a7060'};cursor:pointer">
          ${s.restMonth ? '✓ Resting' : '○ Set Rest'}
        </button>
      </div>
      ${contractYearsLeft !== null ? `<div>
        <div style="font-size:8px;color:#7a7060;margin-bottom:3px">Contract</div>
        <div style="font-size:8px;color:${contractColor}">${contractYearsLeft <= 0 ? 'EXPIRED' : contractYearsLeft === 1 ? 'Final year' : `${contractYearsLeft}yr remaining`}</div>
        ${contractYearsLeft <= 1 && !s.contractRenewing ? `<button onclick="openContractRenewal('${s.id}')" style="font-size:7px;margin-top:3px;background:#1a1a2e;border:1px solid #4a4a8a;color:#9cf;padding:2px 7px;cursor:pointer">Offer Renewal ▸</button>` : ''}
        ${s.contractRenewing ? `<div style="font-size:7px;color:#f0a030;margin-top:2px">⏳ Renewal pending</div>` : ''}
      </div>` : ''}
    </div>

    ${provenPairs.length > 0 ? `<div style="margin-top:6px">
      <div style="font-size:7px;color:#4a9a4a;margin-bottom:3px">⚗ Proven chemistry:</div>
      ${provenPairs.map(p => `<span style="font-size:7px;color:#8fbc8f;margin-right:8px">${p.name} (${p.count} missions)</span>`).join('')}
    </div>` : ''}
  </div>`

  // ── Career arc section ────────────────────────────────────────────────────────
  const phase     = s.phase || 'prime'
  const pMeta     = PHASE_META[phase]
  const peakAge   = s.peakAge || 26
  const yearsLeft = phase === 'developing' ? (peakAge - 4) - s.age
                  : phase === 'prime'      ? (peakAge + 2) - s.age
                  : phase === 'veteran'    ? (peakAge + 7) - s.age
                  : null
  const decMod    = s.declineMod || 0
  const PHASES    = ['developing','prime','veteran','declining']
  const phaseIdx  = PHASES.indexOf(phase)
  const arcHtml = `<div style="margin-bottom:12px;background:var(--surface,#1a1a1a);border:1px solid var(--border,#333);padding:10px">
    <div style="font-size:7px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Career Arc</div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='developing'?'rgba(100,150,255,.12)':'transparent'};border:1px solid ${PHASE_META.developing.color};opacity:${phaseIdx===0?1:.35}">
        <div style="font-size:8px;color:${PHASE_META.developing.color}">${PHASE_META.developing.icon}</div>
        <div style="font-size:7px;color:${PHASE_META.developing.color}">Developing</div>
      </div>
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='prime'?'rgba(80,200,120,.12)':'transparent'};border:1px solid ${PHASE_META.prime.color};opacity:${phaseIdx===1?1:.35}">
        <div style="font-size:8px;color:${PHASE_META.prime.color}">${PHASE_META.prime.icon}</div>
        <div style="font-size:7px;color:${PHASE_META.prime.color}">Prime</div>
      </div>
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='veteran'?'rgba(201,168,76,.12)':'transparent'};border:1px solid ${PHASE_META.veteran.color};opacity:${phaseIdx===2?1:.35}">
        <div style="font-size:8px;color:${PHASE_META.veteran.color}">${PHASE_META.veteran.icon}</div>
        <div style="font-size:7px;color:${PHASE_META.veteran.color}">Veteran</div>
      </div>
      <div style="flex:1;text-align:center;padding:5px 8px;background:${phase==='declining'?'rgba(255,80,80,.12)':'transparent'};border:1px solid ${PHASE_META.declining.color};opacity:${phaseIdx===3?1:.35}">
        <div style="font-size:8px;color:${PHASE_META.declining.color}">${PHASE_META.declining.icon}</div>
        <div style="font-size:7px;color:${PHASE_META.declining.color}">Declining</div>
      </div>
    </div>
    <div style="display:flex;gap:16px;font-size:8px;flex-wrap:wrap;margin-bottom:6px">
      <span>Age: <b style="color:#e8e0cc">${s.age}</b></span>
      <span>Peak age: <b style="color:#c9a84c">${peakAge}</b></span>
      <span>Phase: <b style="color:${pMeta.color}">${pMeta.label}</b></span>
      ${yearsLeft !== null && yearsLeft > 0 ? `<span style="color:#7a7060">${yearsLeft}yr${yearsLeft!==1?'s':''} in phase</span>` : ''}
    </div>
    ${decMod < 0 ? `<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;font-size:7px;color:#7a7060;margin-bottom:2px">
        <span>Decline penalty</span><span style="color:#f66">${Math.round(decMod*100)}%</span>
      </div>
      <div style="background:#2a1a1a;height:4px;border-radius:2px">
        <div style="background:#f66;height:4px;border-radius:2px;width:${Math.min(100,Math.abs(decMod)/0.18*100)}%"></div>
      </div>
    </div>` : ''}
    ${s.retirementOffered ? `<div style="margin-top:8px;padding:8px 10px;background:#1a0505;border:1px solid #8b1a1a">
      <div style="font-size:8px;color:#f66;margin-bottom:6px">⚠ ${sn(s)} has been offered retirement options</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="gb" style="border-color:#8fbc8f;color:#8fbc8f;font-size:7px" onclick="retireShinobi('${s.id}')">Retire Honorably ▸</button>
        <button class="gb" style="border-color:#87ceeb;color:#87ceeb;font-size:7px" onclick="retireToCoach('${s.id}')">Transition to Staff ▸</button>
        <button class="gb" style="border-color:#7a7060;color:#7a7060;font-size:7px" onclick="extendCareer('${s.id}')">Request One More Year</button>
      </div>
    </div>` : ''}
  </div>`

  const careerInjHtml = (s.injuryHistory||[]).length > 0
    ? `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Injury History</div>${s.injuryHistory.slice().reverse().slice(0,5).map(h => { const tDef = INJURY_TYPES.find(t => t.id === h.type); return `<div style="display:flex;gap:6px;font-size:8px;margin-bottom:3px;align-items:baseline"><span style="color:#3a3630;min-width:50px">Yr${h.year}·M${h.month}</span><span style="color:${tDef?.color||'#f99'}">${h.typeName||h.type}</span><span style="color:#7a7060">${h.duration}mo</span>${h.treatment !== 'standard' ? `<span style="color:#87ceeb;font-size:7px">[${h.treatment}]</span>` : ''}</div>` }).join('')}</div>`
    : ''
  const traumaHistHtml = (s.traumaHistory||[]).length
    ? `<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Trauma History</div>${s.traumaHistory.map(t => `<div style="font-size:8px;color:#cc7fb8;margin-bottom:3px;padding:4px 7px;border-left:2px solid #cc7fb8">${t.year !== undefined ? `Yr${t.year}·M${t.month}: ` : ''}${t.type||String(t)}</div>`).join('')}</div>`
    : ''
  const careerHtml = `${arcHtml}<div style="margin-bottom:12px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Mission Record</div><div style="display:flex;gap:10px;flex-wrap:wrap"><div style="background:#1a1a1a;border:1px solid #333;padding:8px 12px;flex:1;min-width:70px;text-align:center"><div style="font-size:11px;color:#e8e0cc;font-weight:bold">${s.wins||0}</div><div style="font-size:7px;color:#7a7060;text-transform:uppercase;margin-top:2px">Total</div></div><div style="background:#1a1a1a;border:1px solid #c9a84c33;padding:8px 12px;flex:1;min-width:70px;text-align:center"><div style="font-size:11px;color:#c9a84c;font-weight:bold">${s.winsS||0}</div><div style="font-size:7px;color:#7a7060;text-transform:uppercase;margin-top:2px">S-Rank</div></div><div style="background:#1a1a1a;border:1px solid #87ceeb33;padding:8px 12px;flex:1;min-width:70px;text-align:center"><div style="font-size:11px;color:#87ceeb;font-weight:bold">${s.winsB||0}</div><div style="font-size:7px;color:#7a7060;text-transform:uppercase;margin-top:2px">B/C-Rank</div></div></div></div>${traumaHistHtml}${darkHtml}${bondsHtml}${careerInjHtml}`
  const profileHtml = phase4Html +
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px"><div><div style="font-size:14px;color:#e8e0cc;font-weight:bold">${sn(s)}</div><div style="font-size:9px;color:#7a7060;margin-top:2px">${RANKS[s.ri]} · ${s.clan ? s.clan + ' Clan' : s.spec} · Age ${s.age}${s.prodigy ? ' · <span style="color:#c9a84c">✦ Prodigy</span>' : ''}${s.homegrown ? ' · <span style="color:#8fbc8f">🌱 Homegrown</span>' : ''}</div>${jkB ? `<div style="font-size:9px;color:#c9a84c;margin-top:2px">Jinchuriki of ${jkB.n} (${jkB.tails} tails)</div>` : ''}${sq ? `<div style="font-size:9px;color:#cc7fb8;margin-top:2px">Member of ${sq.n}</div>` : ''}</div><span class="rk ${RKC[s.ri]}" style="font-size:10px">${RANKS[s.ri]}</span></div><div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Stats</div><div class="sg">${sBars(s)}</div></div>${injuryHtml}${moraleCommitHtml}<div style="margin-bottom:10px"><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Personality</div><span class="trait-tag ${pCl(s.pers)}">${s.pers.n}</span><div style="font-size:9px;color:#7a7060;margin-top:5px">${s.pers.desc}</div></div>${pmHtml}${evolvedHtml}<div>${s.archetype ? `<div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Archetype</div><div style="font-size:9px;color:#cc7fb8;margin-bottom:3px">${s.archetype.n}</div><div style="font-size:9px;color:#7a7060;margin-bottom:10px;font-style:italic">${s.archetype.flavor}</div>` : ''}</div>${darkHtml}${jutsuHtml}${bondsHtml}<div><div style="font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">Background</div><div class="dossier">${s.backstory}</div></div><div style="margin-top:10px;display:flex;gap:10px;font-size:9px;color:#7a7060;flex-wrap:wrap"><span>Power: <b style="color:#e8e0cc">${sPow(s)}</b></span><span>Potential: <b style="color:#c9a84c">${s.scouted === false ? '???' : s.potential}</b></span><span>Wins: <b style="color:#8fbc8f">${s.wins}</b></span><span>Streak: <b style="color:${(s.streak||0)>=3?'#c9a84c':'#7a7060'}">${s.streak||0}</b></span><span>Market Value: <b style="color:#f0a030">${fmt(marketVal)}</b></span></div>${s.status === 'available' && !jkB && G.beasts.some(b => b.sealed && !b.jk) ? `<div style="margin-top:10px"><div style="font-size:9px;color:#7a7060;margin-bottom:6px">Assign as Jinchuriki:</div>${G.beasts.filter(b => b.sealed && !b.jk).map(b => `<button class="gb gb-g" onclick="mkJK('${s.id}','${b.n}')" style="margin-right:5px">Seal ${b.n} ►</button>`).join('')}</div>` : ''}`
  document.getElementById('dos-c').innerHTML = `<div style="display:flex;gap:6px;margin-bottom:12px"><button class="tab${dosActiveTab==='profile'?' active':''}" onclick="dosTab('profile')">Profile</button><button class="tab${dosActiveTab==='career'?' active':''}" onclick="dosTab('career')">Career</button></div><div style="${dosActiveTab==='career'?'display:none':''}">${profileHtml}</div><div style="${dosActiveTab==='profile'?'display:none':''}">${careerHtml}</div>`
  document.getElementById('ov-dossier').classList.add('open')
}

export function dosTab(tab) { window._dosTab = tab; if (window._dosActiveId) oDos(window._dosActiveId) }

export function treatTrauma(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s || !s.traumaStatus) return
  if (G.ryo < 5000) { ntf('Not enough ryo (5,000 needed)'); return }
  G.ryo -= 5000
  s.traumaStatus = null
  s.traumaMonths = 0
  aL(sn(s) + '\'s psychological trauma has been treated. 5,000 ryo spent on medical care.', 'good')
  cm('dossier'); upUI()
}

export function secondOpinion(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s || s.status !== 'injured') return
  if (G.ryo < 3000) { ntf('Not enough ryo (3,000 needed)'); return }
  if (s.secondOpinionUsed) { ntf('Second opinion already obtained.'); return }
  G.ryo -= 3000
  s.secondOpinionUsed = true
  if (Math.random() < 0.25) {
    const change = Math.random() < 0.5 ? -rnd(1, 2) : rnd(1, 2)
    const old = s.injDays
    s.injDays = Math.max(1, s.injDays + change)
    // Update history entry treatment note
    const last = (s.injuryHistory || []).slice(-1)[0]
    if (last) last.treatment = 'second-opinion'
    aL('Second opinion for ' + sn(s) + ': revised estimate ' + s.injDays + ' months (was ' + old + ').', change < 0 ? 'good' : 'warn')
  } else {
    aL('Second opinion confirms original estimate — ' + sn(s) + ' needs ' + s.injDays + ' more month' + (s.injDays !== 1 ? 's' : '') + '.', 'neutral')
  }
  upUI(); cm('dossier'); oDos(sId)
}

export function specialistTreatment(sId, villageName) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s || s.status !== 'injured') return
  const v = G.villages.find(x => x.n === villageName)
  if (!v || v.rel < 50) { ntf('Requires positive diplomatic relations (50+).'); return }
  if (G.ryo < 12000) { ntf('Not enough ryo (12,000 needed)'); return }
  if (s.specialistTreated) { ntf('Already sent for specialist treatment.'); return }
  G.ryo -= 12000
  v.rel = clamp(v.rel - 5, 0, 100)  // diplomatic favor used
  s.specialistTreated = true
  const reductionPct = rnd(30, 40)
  const reduction = Math.max(1, Math.round(s.injDays * reductionPct / 100))
  s.injDays = Math.max(1, s.injDays - reduction)
  const last = (s.injuryHistory || []).slice(-1)[0]
  if (last) last.treatment = 'specialist-' + villageName
  aL(sn(s) + ' sent to ' + villageName + ' for specialist care — ' + reduction + ' month(s) cut from recovery. 12,000 ryo, −5 relations with ' + villageName + '.', 'good')
  upUI(); cm('dossier'); oDos(sId)
}

export function mkJK(sId, bN) {
  const s = G.shinobi.find(x => x.id === sId), b = G.beasts.find(x => x.n === bN)
  if (!s || !b) return
  // Clear any previous jinchuriki
  if (b.jk && b.jk !== sId) {
    const prev = G.shinobi.find(x => x.id === b.jk)
    if (prev) prev.jk = null
  }
  s.jk = bN; b.jk = sId
  // Initialize sync progression — stats applied monthly by beastEngine
  b.syncMonths = b.syncMonths || 0
  b.loreUnlocked = b.loreUnlocked || []
  b.loreBonusActive = b.loreBonusActive || false
  b.escapeHistory = b.escapeHistory || []
  aL(`${sn(s)} chosen as Jinchuriki of ${bN}. Stage 1: Rejection begins.`, 'warn')
  cm('dossier'); upUI(); ntf(`${s.fn} is now Jinchuriki of ${bN} — Stage 1 begins.`)
}

// ── Retirement actions ────────────────────────────────────────────────────────

export function retireShinobi(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s) return
  if (s.jk) { ntf('Cannot retire a Jinchuriki while they carry a tailed beast.'); return }
  // Move to retired roster
  if (!G.retired) G.retired = []
  G.retired.push({
    id: s.id, fn: s.fn, ln: s.ln,
    ri: s.ri, age: s.age, wins: s.wins || 0,
    winsS: s.winsS || 0, phase: s.phase || 'declining',
    retiredYear: G.year, retiredMonth: G.month,
    reason: 'honourable_discharge',
  })
  // Remove from squads
  G.squads.forEach(sq => {
    sq.members = sq.members.filter(id => id !== sId)
    if (sq.leaderId === sId) sq.leaderId = sq.members[0] || null
  })
  G.shinobi = G.shinobi.filter(x => x.id !== sId)
  aL(`${sn(s)} has retired with honour after ${s.wins || 0} missions. Their legacy endures.`, 'good')
  ntf(`${s.fn} ${s.ln} retired.`)
  document.getElementById('ov-dossier').classList.remove('open')
  upUI(); cm('retirement')
}

export function retireToCoach(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s) return
  if (s.jk) { ntf('Cannot transition a Jinchuriki while they carry a tailed beast.'); return }
  if (!G.staff) G.staff = []
  // Create a coaching staff member from the shinobi
  const coachRating = Math.min(10, Math.round((s.wins || 0) / 10 + (s.ri || 0) * 1.5 + 2))
  G.staff.push({
    id: s.id + '_coach',
    fn: s.fn, ln: s.ln,
    role: 'sensei',
    rating: coachRating,
    salary: Math.round(s.salary * 0.4),
    monthsEmployed: 0,
    morale: 80,
    hiddenFlaw: null,
    fromRetirement: true,
    retiredShinobiId: s.id,
    stats: {
      leadership: Math.min(20, Math.round((s.winsS || 0) / 2 + 6)),
      endurance: Math.min(20, Math.round(coachRating * 1.2)),
      ninjutsu: Math.min(20, s.stats?.ninjutsu || 10),
    },
  })
  // Remove from active roster
  G.squads.forEach(sq => {
    sq.members = sq.members.filter(id => id !== sId)
    if (sq.leaderId === sId) sq.leaderId = sq.members[0] || null
  })
  G.shinobi = G.shinobi.filter(x => x.id !== sId)
  aL(`${sn(s)} transitions from the field to coaching. They join the staff as Sensei (rating ${coachRating}).`, 'good')
  ntf(`${s.fn} is now a Sensei on staff.`)
  document.getElementById('ov-dossier').classList.remove('open')
  upUI(); cm('retirement')
}

export function extendCareer(sId) {
  const s = G.shinobi.find(x => x.id === sId)
  if (!s) return
  s.retirementOffered = false
  s.careerExtended = true
  // Slight commitment boost from respect shown
  s.commitment = Math.min(100, (s.commitment || 60) + 10)
  aL(`${sn(s)} accepts one more year. Their commitment to the village is renewed.`, 'neutral')
  ntf(`${s.fn} will continue their career for another year.`)
  upUI(); cm('dossier'); oDos(sId)
}

// ── Phase 4 handlers ──────────────────────────────────────────────────────────

export function setTrainingFocus(sId, statKey) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  s.trainingFocus = statKey || null
  if (statKey) aL(`${sn(s)} is now focused on training ${statKey}. Expect steady gains (+workload).`, 'neutral')
  else aL(`${sn(s)} returns to general training rotation.`, 'neutral')
  upUI(); oDos(sId)
}

export function toggleJutsuLoadout(sId, jutsuId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  if (!(s.jutsu || []).includes(jutsuId)) return
  s.jutsuLoadout = toggleLoadoutSlot(s.jutsuLoadout, jutsuId)
  upUI(); oDos(sId)
}

export function toggleRestMonth(sId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  if (s.status !== 'available') { ntf('Cannot rest a shinobi who is currently deployed or injured.'); return }
  s.restMonth = !s.restMonth
  if (s.restMonth) aL(`${sn(s)} is scheduled for a rest month — they'll recover workload faster.`, 'neutral')
  else aL(`${sn(s)}'s rest month cancelled — back to regular rotation.`, 'neutral')
  upUI(); oDos(sId)
}

export function openContractRenewal(sId) {
  const s = G.shinobi.find(x => x.id === sId); if (!s) return
  const demand = G.contractRenewalQueue?.find(r => r.shinobiId === sId)
  const demandSal = demand?.demandSalary || Math.round(s.salary * 1.15)
  if (G.ryo < demandSal * 12) { ntf(`Can't afford renewal — need ~${(demandSal*12).toLocaleString()} ryo/year.`); return }
  s.salary = demandSal
  s.contractEnd = (G.year || 1) + 3
  s.contractRenewing = false
  G.contractRenewalQueue = (G.contractRenewalQueue || []).filter(r => r.shinobiId !== sId)
  s.commitment = Math.min(100, (s.commitment || 60) + 15)
  aL(`${sn(s)} renewed for 3 years at ${demandSal.toLocaleString()} ryo/month. Commitment boosted.`, 'good')
  ntf(`${s.fn} renewed!`)
  upUI(); cm('contract'); oDos(sId)
}
