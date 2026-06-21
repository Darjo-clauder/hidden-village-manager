import { G, pDesc, personalityJudge, fmt } from '../state.js'
import { REGIONS, REGION_EVENTS } from '../constants.js'
import { aL, ntf } from '../ui.js'
import { conductTrialDay } from '../scoutEngine.js'
import { openContextMenu, showHoverPreview, hideHoverPreview } from '../uikit.js'

// Right-click / hover grammar for prospect cards (P1 kit).
export function scoutCtx(e, id) {
  e.preventDefault()
  const p = (G.prospects || []).find(x => x.id === id); if (!p) return false
  const watching = (G.scoutWatchlist || []).includes(id)
  openContextMenu(e.clientX, e.clientY, [
    { label: watching ? 'Remove from Watchlist' : 'Add to Watchlist', fn: () => window.toggleWatchlist && window.toggleWatchlist(id) },
    ...(p.trialDayDone ? [] : [{ label: 'Trial Day (2,000 ryo)', fn: () => window.trialDay && window.trialDay(id) }]),
    { separator: true },
    { label: 'Sign Prospect…', fn: () => window.signProspect && window.signProspect(id) },
  ])
  return false
}

export function scoutHover(e, id) {
  const p = (G.prospects || []).find(x => x.id === id); if (!p) return
  const region = REGIONS.find(r => r.id === p.fromRegion)
  const pot = p.potential != null ? p.potential : (p.potentialRange ? `${p.potentialRange.min}-${p.potentialRange.max}` : '?')
  const row = (k, v) => `<div class="hp-row"><span>${k}</span><b>${v}</b></div>`
  showHoverPreview(e.clientX, e.clientY, `
    <div class="hp-name">${p.fn} ${p.ln}</div>
    <div class="hp-sub">${region ? region.icon + ' ' + region.n : 'Unknown region'}${p.clan ? ' · ' + p.clan : ''}</div>
    ${row('Potential', pot)}
    ${p.scoutConfidence != null ? row('Confidence', p.scoutConfidence + '%') : ''}
    ${p.urgencyMonths > 0 ? row('Rival interest', p.urgencyMonths + 'mo left') : ''}
    ${p.askingFee != null ? row('Asking', fmt(p.askingFee)) : ''}`)
}

export function rSco() {
  const el = document.getElementById('scol')
  if (!el) return
  const scouts = (G.staff || []).filter(st => st.role === 'scout_jonin' || st.role === 'head_scout')
  const reports = (G.scoutReports || []).slice().reverse().slice(0, 15)
  if (!G.scoutBudget) G.scoutBudget = { domestic: 40, foreign: 30, shadow: 30 }
  if (!G.scoutWatchlist) G.scoutWatchlist = []

  // Regional coverage map
  const regionCoverage = {}
  REGIONS.forEach(r => { regionCoverage[r.id] = scouts.filter(s => s.regionAssigned === r.id) })

  el.innerHTML = `
    <h2 style="color:#c9a84c;margin:0 0 16px">🗺 Scouting Network</h2>

    <!-- Budget allocation -->
    <div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:12px;margin-bottom:16px">
      <h3 style="color:#aaa;font-size:.85rem;margin:0 0 8px;text-transform:uppercase;letter-spacing:.08em">Scouting Budget Allocation</h3>
      <div style="font-size:.72rem;color:#777;margin-bottom:8px">Domestic boosts report frequency · Foreign boosts contact growth · Shadow boosts head-scout covert intel chance. Must total 100%.</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
        ${['domestic','foreign','shadow'].map(k => `
          <div style="flex:1;min-width:140px">
            <div style="font-size:.75rem;color:#999;margin-bottom:2px;text-transform:capitalize">${k}: <span style="color:#c9a84c">${G.scoutBudget[k]}%</span></div>
            <input type="range" min="0" max="100" value="${G.scoutBudget[k]}" oninput="setScoutBudget('${k}', this.value)" style="width:100%">
          </div>`).join('')}
      </div>
      <div style="font-size:.7rem;color:${(G.scoutBudget.domestic+G.scoutBudget.foreign+G.scoutBudget.shadow)===100?'#8fbc8f':'#f66'};margin-top:6px">
        Total: ${G.scoutBudget.domestic+G.scoutBudget.foreign+G.scoutBudget.shadow}% ${(G.scoutBudget.domestic+G.scoutBudget.foreign+G.scoutBudget.shadow)!==100?'(should equal 100%)':''}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <!-- Scout Roster -->
      <div>
        <h3 style="color:#aaa;font-size:.85rem;margin:0 0 10px;text-transform:uppercase;letter-spacing:.08em">Scout Roster</h3>
        ${scouts.length === 0
          ? '<div style="color:#666;font-size:.85rem">No scouts assigned. Hire Scout Jonin or Head of Scouting from Staff panel.</div>'
          : scouts.map(scout => {
              const regionObj = REGIONS.find(r => r.id === scout.regionAssigned)
              const fatigueColor = (scout.fatigue || 0) >= 75 ? '#f66' : (scout.fatigue || 0) >= 50 ? '#f0a030' : '#8fbc8f'
              const contacts = scout.regionAssigned ? (scout.contacts?.[scout.regionAssigned] || 0) : 0
              return `<div style="background:#1a1a1a;border:1px solid #333;border-radius:6px;padding:10px;margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                  <strong style="color:#e8d5a3">${scout.fn} ${scout.ln}</strong>
                  <span style="font-size:.75rem;color:#999">${scout.role === 'head_scout' ? '★ Head of Scouting' : 'Scout Jonin'} · R${scout.rating}</span>
                </div>
                <div style="font-size:.78rem;color:#aaa;margin-bottom:6px">
                  <span style="margin-right:10px" title="Stat accuracy">👁 Perc:${scout.stats.perception||'?'}</span>
                  <span style="margin-right:10px" title="Potential & personality read">🔮 Judg:${scout.stats.judgement??scout.stats.endurance??'?'}</span>
                  <span style="margin-right:10px" title="Covert scouting, evasion">🌑 Stealth:${scout.stats.stealth||'?'}</span>
                  <span title="Handles unfamiliar regions">⚡ Adapt:${scout.stats.adaptability??scout.stats.ninjutsu??'?'}</span>
                </div>
                ${scout.biasDetected ? `<div style="font-size:.72rem;color:#f0a030;margin-bottom:6px;padding:3px 6px;border:1px solid #8b4a00;background:#150d00">⚠ Bias pattern detected in reports — cross-check assessments</div>` : ''}
                <div style="margin-bottom:6px">
                  <div style="font-size:.75rem;color:#999;margin-bottom:3px">Assigned Region:</div>
                  ${regionObj
                    ? `<span style="background:#2a2a1a;border:1px solid #554;border-radius:4px;padding:2px 8px;font-size:.82rem">${regionObj.icon} ${regionObj.n}</span>`
                    : '<span style="color:#666;font-size:.8rem">— Resting —</span>'}
                  <select onchange="assignScout('${scout.id}',this.value)" style="margin-left:8px;background:#222;color:#e8d5a3;border:1px solid #555;border-radius:4px;font-size:.75rem;padding:2px">
                    <option value="">Reassign…</option>
                    <option value="">⬜ Rest (recover fatigue)</option>
                    ${REGIONS.map(r => `<option value="${r.id}" ${scout.regionAssigned===r.id?'selected':''}>${r.icon} ${r.n}</option>`).join('')}
                  </select>
                </div>
                ${(() => {
                  const mem = scout.regionMemory?.[scout.regionAssigned]
                  const contactLevel = mem?.contactLevel || 0
                  const pct = Math.round(contactLevel / 20 * 100)
                  const famLabel = contactLevel >= 15 ? 'Expert' : contactLevel >= 10 ? 'Familiar' : contactLevel >= 5 ? 'Learning' : 'New'
                  return scout.regionAssigned ? `
                    <div style="margin-bottom:6px">
                      <div style="display:flex;justify-content:space-between;font-size:.7rem;color:#888;margin-bottom:2px">
                        <span>Regional Familiarity — ${famLabel}</span>
                        <span style="color:#c9a84c">${contactLevel}/20</span>
                      </div>
                      <div style="background:#111;border-radius:3px;height:4px">
                        <div style="background:#c9a84c;height:4px;border-radius:3px;width:${pct}%"></div>
                      </div>
                    </div>` : ''
                })()}
                <div style="display:flex;gap:12px;font-size:.75rem">
                  <span>Fatigue: <span style="color:${fatigueColor}">${scout.fatigue||0}%</span></span>
                  ${scout.regionAssigned ? `<span style="color:#666;font-size:.72rem">${(scout.regionMemory?.[scout.regionAssigned]?.monthsWorked||0)}mo in region</span>` : ''}
                </div>
              </div>`
            }).join('')
        }
      </div>

      <!-- Regional Coverage -->
      <div>
        <h3 style="color:#aaa;font-size:.85rem;margin:0 0 10px;text-transform:uppercase;letter-spacing:.08em">Regional Coverage</h3>
        ${REGIONS.map(r => {
          const assigned = regionCoverage[r.id]
          const covered = assigned.length > 0
          const dblCover = assigned.length >= 2
          const meta = G.regionalMeta?.[r.id]
          const metaEv = meta ? REGION_EVENTS.find(e => e.id === meta.eventId) : null
          return `<div style="background:#1a1a1a;border:1px solid ${covered?'#444':'#2a2a2a'};border-radius:5px;padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;gap:10px">
            <span style="font-size:1.2rem">${r.icon}</span>
            <div style="flex:1">
              <div style="font-size:.82rem;color:${covered?'#e8d5a3':'#555'}">${r.n}</div>
              <div style="font-size:.72rem;color:#666">${r.desc || ''}</div>
              ${metaEv ? `<div style="font-size:.7rem;color:${metaEv.qualityMod<0?'#f88':'#8fbc8f'};margin-top:3px">${metaEv.icon} ${metaEv.n} (${meta.monthsLeft}mo left) — ${metaEv.qualityMod>0?'+':''}${Math.round(metaEv.qualityMod*100)}% yield</div>` : ''}
            </div>
            <div style="text-align:right;font-size:.75rem">
              ${covered
                ? `<span style="color:${dblCover?'#c9a84c':'#8fbc8f'}">${dblCover?'◉◉ Double':'◉ Active'}</span><br>
                   <span style="color:#999">${assigned.map(s=>s.fn).join(', ')}</span>`
                : '<span style="color:#555">◯ No Coverage</span>'}
              ${(() => {
                const pool = G.regionPool?.[r.id] ?? 12
                const pct = Math.round((pool / 12) * 100)
                const poolColor = pool >= 8 ? '#8fbc8f' : pool >= 4 ? '#fa0' : '#f66'
                return `<div style="margin-top:4px;font-size:.68rem;color:${poolColor}" title="Talent pool: ${pool}/12 undiscovered prospects remaining">Pool ${pool}/12</div>`
              })()}
            </div>
          </div>`
        }).join('')}
      </div>
    </div>

    <!-- Watchlist -->
    ${G.scoutWatchlist.length > 0 ? `
    <h3 style="color:#aaa;font-size:.85rem;margin:0 0 10px;text-transform:uppercase;letter-spacing:.08em">⭐ Watchlist (${G.scoutWatchlist.length})</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:20px">
      ${G.scoutWatchlist.map(id => G.prospects.find(p => p.id === id)).filter(Boolean).map(p => prospectCard(p, true)).join('')}
    </div>` : ''}

    <!-- Scout Reports -->
    <h3 style="color:#aaa;font-size:.85rem;margin:0 0 6px;text-transform:uppercase;letter-spacing:.08em">Recent Reports (${reports.length})</h3>
    <div style="display:flex;gap:8px;margin-bottom:10px;font-size:.7rem">
      <span style="padding:1px 7px;border:1px solid #999;color:#999">Impression</span>
      <span style="padding:1px 7px;border:1px solid #f0a030;color:#f0a030">General</span>
      <span style="padding:1px 7px;border:1px solid #8fbc8f;color:#8fbc8f">Detailed</span>
      <span style="padding:1px 7px;border:1px solid #c9a84c;color:#c9a84c">Elite</span>
      <span style="color:#555;margin-left:6px">← quality rises with scout familiarity & judgement</span>
    </div>
    ${reports.length === 0
      ? '<div style="color:#555;font-size:.85rem">No reports yet. Assign scouts to regions.</div>'
      : `<div style="display:grid;gap:8px;margin-bottom:16px">
          ${reports.map(r => {
            const regionObj = REGIONS.find(reg => reg.id === r.region)
            const qualColor = r.quality === 'Elite' ? '#c9a84c' : r.quality === 'Detailed' ? '#8fbc8f' : r.quality === 'General' ? '#f0a030' : '#999'
            const confColor = (r.confidence||0) >= 75 ? '#8fbc8f' : (r.confidence||0) >= 55 ? '#f0a030' : '#f66'
            return `<div style="background:#1a1a1a;border:1px solid ${r.isSecondOpinion?'#a85':'#333'};border-radius:6px;padding:9px 11px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span style="font-size:.8rem;color:#e8d5a3;font-weight:bold">${r.prospectName}</span>
                <div style="display:flex;gap:6px;align-items:center">
                  <span style="font-size:.68rem;padding:1px 5px;border:1px solid ${qualColor};color:${qualColor}">${r.quality}</span>
                  <span style="font-size:.72rem;color:#666">Y${r.year}M${r.month}</span>
                </div>
              </div>
              <div style="font-size:.75rem;color:#aaa;margin-bottom:5px">
                ${regionObj?.icon||''} ${regionObj?.n||r.region} · via ${r.scoutName} ·
                Confidence: <span style="color:${confColor}">${r.confidence||'?'}%</span>
                ${r.rivalInterest ? ' · <span style="color:#f66">⚠ Rival interest</span>' : ''}
                ${r.isSecondOpinion ? ' · <span style="color:#daa">2nd opinion</span>' : ''}
                ${r.personalityRevealed ? ' · <span style="color:#9cf">Personality revealed</span>' : ''}
              </div>
              ${r.narrative ? `<div style="font-size:.76rem;color:#888;font-style:italic;border-left:2px solid #444;padding-left:8px">"${r.narrative}"</div>` : ''}
            </div>`
          }).join('')}
        </div>`
    }

    <!-- Scout-sourced prospects in pool -->
    ${(() => {
      const scouted = G.prospects.filter(p => p.fromRegion)
      if (!scouted.length) return ''
      return `<h3 style="color:#aaa;font-size:.85rem;margin:20px 0 10px;text-transform:uppercase;letter-spacing:.08em">Scout-Sourced Prospects (${scouted.length})</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
          ${scouted.map(p => prospectCard(p, false)).join('')}
        </div>`
    })()}

    <!-- Draft Board -->
    ${_draftBoard()}
  `
}

function _draftBoard() {
  const all = (G.prospects || []).slice()
  if (!all.length) return ''
  const sortKey = window._draftSort || 'potential'
  const sortDir = window._draftDir ?? -1

  const sorted = all.slice().sort((a, b) => {
    const va = sortKey === 'potential' ? (a.potential || 0)
      : sortKey === 'age' ? (a.age || 0)
      : sortKey === 'cost' ? (4000 + ((a.potential || 50) >= 85 ? 3 : (a.potential || 50) >= 70 ? 2 : 1) * 2500)
      : sortKey === 'confidence' ? (a.scoutHistory?.length ? Math.max(...a.scoutHistory.map(r => r.confidence || 0)) : 0)
      : 0
    const vb = sortKey === 'potential' ? (b.potential || 0)
      : sortKey === 'age' ? (b.age || 0)
      : sortKey === 'cost' ? (4000 + ((b.potential || 50) >= 85 ? 3 : (b.potential || 50) >= 70 ? 2 : 1) * 2500)
      : sortKey === 'confidence' ? (b.scoutHistory?.length ? Math.max(...b.scoutHistory.map(r => r.confidence || 0)) : 0)
      : 0
    return (va - vb) * sortDir
  })

  const cols = [
    { key: 'name', label: 'Name', sortable: false },
    { key: 'age', label: 'Age', sortable: true },
    { key: 'potential', label: 'Potential', sortable: true },
    { key: 'confidence', label: 'Confidence', sortable: true },
    { key: 'cost', label: 'Cost', sortable: true },
    { key: 'watch', label: '★', sortable: false },
  ]

  const thStyle = (k) => `cursor:pointer;padding:5px 8px;text-align:left;font-size:.72rem;color:${sortKey===k?'#c9a84c':'#888'};white-space:nowrap`

  return `
    <h3 style="color:#aaa;font-size:.85rem;margin:24px 0 10px;text-transform:uppercase;letter-spacing:.08em">📋 Draft Board (${all.length})</h3>
    <div style="font-size:.72rem;color:#555;margin-bottom:8px">Click column headers to sort. All known prospects.</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:.78rem">
        <thead>
          <tr style="border-bottom:1px solid #333">
            ${cols.map(c => c.sortable
              ? `<th onclick="draftSort('${c.key}')" style="${thStyle(c.key)}">${c.label} ${sortKey===c.key?(sortDir>0?'↑':'↓'):''}</th>`
              : `<th style="padding:5px 8px;text-align:left;font-size:.72rem;color:#888">${c.label}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>
          ${sorted.map((p, i) => {
            const potTier = (p.potential || 50) >= 85 ? 3 : (p.potential || 50) >= 70 ? 2 : 1
            const cost = 4000 + potTier * 2500 + (p.urgencyMonths > 0 && p.urgencyMonths <= 2 ? 3000 : 0)
            const bestConf = p.scoutHistory?.length ? Math.max(...p.scoutHistory.map(r => r.confidence || 0)) : 0
            const confColor = bestConf >= 70 ? '#8fbc8f' : bestConf >= 50 ? '#f0a030' : '#666'
            const potLabel = p.statRanges ? `${p.potRange?.lo ?? '?'}–${p.potRange?.hi ?? '?'}` : String(p.potential || '?')
            const watching = (G.scoutWatchlist || []).includes(p.id)
            const rowBg = i % 2 === 0 ? '#111' : '#161616'
            const urgency = p.urgencyMonths > 0 && p.urgencyMonths <= 2
            return `<tr style="background:${rowBg};border-bottom:1px solid #1a1a1a;${urgency?'border-left:2px solid #f66;':''}">
              <td style="padding:6px 8px;color:#e8d5a3">${p.fn} ${p.ln}${urgency ? ' <span style="color:#f66;font-size:.68rem">⚠'+p.urgencyMonths+'m</span>' : ''}</td>
              <td style="padding:6px 8px;color:#aaa">${p.age || '?'}</td>
              <td style="padding:6px 8px;color:#c9a84c;font-weight:bold">${potLabel}</td>
              <td style="padding:6px 8px;color:${confColor}">${bestConf ? bestConf+'%' : '—'}</td>
              <td style="padding:6px 8px;color:${(G.ryo||0)>=cost?'#8fbc8f':'#f66'}">${cost.toLocaleString()}</td>
              <td style="padding:6px 8px"><button onclick="toggleWatchlist('${p.id}')" style="background:none;border:none;cursor:pointer;font-size:.9rem;color:${watching?'#c9a84c':'#333'}">★</button></td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>
  `
}

export function draftSort(key) {
  if (window._draftSort === key) {
    window._draftDir = (window._draftDir ?? -1) * -1
  } else {
    window._draftSort = key
    window._draftDir = -1
  }
  rSco()
}

export function trialDay(prospectId) { conductTrialDay(prospectId); rSco() }

function prospectCard(p, inWatchlist) {
  const regionObj = REGIONS.find(r => r.id === p.fromRegion)
  const urgency = p.urgencyMonths > 0
  const watching = (G.scoutWatchlist || []).includes(p.id)
  const judgeLevel = personalityJudge()
  const persReady = p.personalityRevealed
  const history = p.scoutHistory || []
  const conflicts = p.conflictingRanges || []
  return `<div style="background:#1a1a1a;border:1px solid ${urgency&&p.urgencyMonths<=2?'#f66':'#333'};border-radius:6px;padding:10px;font-size:.8rem" oncontextmenu="return scoutCtx(event,'${p.id}')">
    ${urgency && p.urgencyMonths <= 2 ? `<div style="color:#f66;font-size:.72rem;margin-bottom:4px">⚠ Rival interest! ${p.urgencyMonths}m left</div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="color:#e8d5a3;font-weight:bold;margin-bottom:4px" onmousemove="scoutHover(event,'${p.id}')" onmouseleave="hideHoverPreview()">${p.fn} ${p.ln}</div>
      <button onclick="toggleWatchlist('${p.id}')" style="background:none;border:none;cursor:pointer;font-size:.95rem;color:${watching?'#c9a84c':'#444'}" title="${watching?'Remove from':'Add to'} watchlist">★</button>
    </div>
    <div style="color:#999;margin-bottom:4px">${regionObj?.icon||''} ${regionObj?.n||p.fromRegion} · via ${p.scoutName||'?'}</div>
    ${p.clan ? `<div style="color:#c9a84c;font-size:.75rem;margin-bottom:4px">Clan: ${p.clan}</div>` : ''}
    ${p.scoutConfidence ? (() => {
      const conf = p.scoutConfidence
      const qualLabel = conf >= 80 ? 'Elite' : conf >= 65 ? 'Detailed' : conf >= 50 ? 'General' : 'Impression'
      const qualColor = conf >= 80 ? '#c9a84c' : conf >= 65 ? '#8fbc8f' : conf >= 50 ? '#f0a030' : '#999'
      const confColor = conf >= 70 ? '#8fbc8f' : conf >= 50 ? '#f0a030' : '#f66'
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="font-size:.7rem;padding:1px 6px;border:1px solid ${qualColor};color:${qualColor}">${qualLabel}</span>
        <span style="font-size:.72rem;color:${confColor}">${conf}% confidence</span>
      </div>`
    })() : ''}
    <div style="color:#888;font-size:.73rem;margin-bottom:4px">
      ${p.statRanges
        ? `Pot: ${p.potRange?.exact ? p.potential : (p.potRange?.lo ?? '?')+'–'+(p.potRange?.hi ?? '?')}`
        : `Pot: ${p.potential}`}
    </div>
    <div style="font-size:.72rem;color:#9cf;margin-bottom:4px">
      Personality: ${persReady ? `Loyalty ${pDesc(p.pMatrix.loyalty,'loyalty',Math.max(judgeLevel,p.personalityJudgeLevel||0))}, Ambition ${pDesc(p.pMatrix.ambition,'ambition',Math.max(judgeLevel,p.personalityJudgeLevel||0))}` : 'Unknown — needs a scout with sharper judgment'}
    </div>
    ${p.trialDayDone ? `<div style="font-size:.72rem;color:#8fbc8f;margin-bottom:5px;padding:3px 6px;border:1px solid #1a4a1a;background:#050d05">✓ Trial Day complete — ${p.trialDayReport?.slice(0,80)||''}…</div>` : `<button onclick="trialDay('${p.id}')" style="width:100%;background:#1a1a2e;border:1px solid #4a4a8a;color:#9cf;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:.73rem;margin-bottom:5px">🏋 Trial Day — 2,000 ryo</button>`}
    ${(() => {
      const potTier = (p.potential || 50) >= 85 ? 3 : (p.potential || 50) >= 70 ? 2 : 1
      const urgPrem = p.urgencyMonths > 0 && p.urgencyMonths <= 2 ? 3000 : 0
      const cost = 4000 + potTier * 2500 + urgPrem
      const canAfford = (G.ryo || 0) >= cost
      return `<button onclick="signProspect('${p.id}')" style="width:100%;background:${canAfford?'#0d200d':'#1a0a0a'};border:1px solid ${canAfford?'#3a7a3a':'#5a2a2a'};color:${canAfford?'#8fbc8f':'#f66'};border-radius:4px;padding:4px 8px;cursor:${canAfford?'pointer':'not-allowed'};font-size:.76rem;font-weight:bold">
        ✦ Sign — ${cost.toLocaleString()} ryo${urgPrem>0?' (rival premium)':''}
      </button>`
    })()}
    ${(() => {
      const bias = p.aggBiasSeverity
      if (!bias || bias === 'none') return ''
      const biasColors = { low: '#fa0', medium: '#f90', high: '#f55' }
      const biasLabels = { low: '⚠ Possible bias in reports', medium: '⚠ Scout bias likely — cross-check readings', high: '⛔ Strong bias detected — get a second scout' }
      return `<div style="font-size:.7rem;color:${biasColors[bias]};border-top:1px solid #332;padding-top:4px;margin-top:4px">${biasLabels[bias]}</div>`
    })()}
    ${conflicts.length ? `<div style="font-size:.7rem;color:#daa;border-top:1px solid #332;padding-top:4px;margin-top:4px">
      ⚠ Conflicting reports: ${conflicts.map(c => c.scoutName + ' (' + c.confidence + '%)').join(', ')} disagree with the primary read.
    </div>` : ''}
    ${history.length > 1 ? `<div style="font-size:.68rem;color:#666;margin-top:4px">📋 ${history.length} reports · avg ${p.aggConfidence ?? Math.round(history.reduce((s,r)=>s+r.confidence,0)/history.length)}% confidence.</div>` : ''}
  </div>`
}

export function assignScout(staffId, regionId) {
  const scout = (G.staff || []).find(st => st.id === staffId)
  if (!scout) return
  scout.regionAssigned = regionId || null
  if (!regionId) {
    ntf(scout.fn + ' ' + scout.ln + ' is now resting.')
  } else {
    const regionObj = REGIONS.find(r => r.id === regionId)
    ntf(scout.fn + ' ' + scout.ln + ' → ' + (regionObj?.n || regionId))
    aL(scout.fn + ' ' + scout.ln + ' assigned to scout the ' + (regionObj?.n || regionId) + '.', 'neutral')
  }
  rSco()
}

export function setScoutBudget(key, value) {
  if (!G.scoutBudget) G.scoutBudget = { domestic: 40, foreign: 30, shadow: 30 }
  G.scoutBudget[key] = Number(value)
  rSco()
}

export function toggleWatchlist(prospectId) {
  if (!G.scoutWatchlist) G.scoutWatchlist = []
  if (G.scoutWatchlist.includes(prospectId)) {
    G.scoutWatchlist = G.scoutWatchlist.filter(id => id !== prospectId)
  } else {
    G.scoutWatchlist.push(prospectId)
  }
  rSco()
}

export function signProspect(prospectId) {
  const p = (G.prospects || []).find(x => x.id === prospectId)
  if (!p) { ntf('Prospect not found.'); return }

  // Signing cost: base 5000 + potential-tier premium + urgency premium
  const potTier = (p.potential || 50) >= 85 ? 3 : (p.potential || 50) >= 70 ? 2 : 1
  const urgencyPremium = p.urgencyMonths > 0 && p.urgencyMonths <= 2 ? 3000 : 0
  const cost = 4000 + potTier * 2500 + urgencyPremium

  if (G.ryo < cost) { ntf(`Not enough ryo. Signing this prospect costs ${cost.toLocaleString()} ryo.`); return }

  // Rival snipe chance if urgency active
  if (p.urgencyMonths > 0 && Math.random() < 0.2) {
    aL(`${p.fn} ${p.ln} was signed by a rival village before you could act!`, 'warn')
    G.prospects = (G.prospects || []).filter(x => x.id !== prospectId)
    G.scoutWatchlist = (G.scoutWatchlist || []).filter(id => id !== prospectId)
    rSco(); return
  }

  G.ryo -= cost

  // Materialise stat ranges into real stats
  const stats = {}
  const BASE_STATS = ['ninjutsu','taijutsu','genjutsu','chakra','intelligence','speed']
  BASE_STATS.forEach(k => {
    if (p.statRanges?.[k]) {
      const lo = p.statRanges[k].lo || 20
      const hi = p.statRanges[k].hi || 60
      stats[k] = Math.round(lo + Math.random() * (hi - lo))
    } else {
      stats[k] = Math.round(30 + Math.random() * 25)
    }
  })

  // Resolve potential
  const truePot = p.potRange?.exact
    ? p.potential
    : Math.round((p.potRange?.lo ?? 50) + Math.random() * ((p.potRange?.hi ?? 80) - (p.potRange?.lo ?? 50)))

  const newShinobi = {
    id: Math.random().toString(36).slice(2),
    fn: p.fn, ln: p.ln,
    ri: 0,  // Join as Genin
    age: p.age || 14,
    stats,
    potential: truePot,
    scouted: true,
    status: 'available',
    salary: 400 + potTier * 100,
    wins: 0, winsB: 0, winsS: 0,
    streak: 0, injDays: 0, missId: null, months: 0,
    workload: 0, consecutiveMissions: 0,
    clan: p.clan || null,
    spec: p.spec || 'Ninjutsu Specialist',
    pers: p.personality || { n: 'Determined', cat: 'neu', desc: 'Steady under pressure.', effect: {} },
    pMatrix: p.pMatrix || {},
    backstory: `Recruited from ${p.fromRegion || 'a distant region'} after being scouted by ${p.scoutName || 'village scouts'}.`,
    traits: [], jutsu: [], bonds: [],
    homegrown: false,
    fromRegion: p.fromRegion,
    peakAge: p.age ? p.age + 8 + Math.floor(Math.random() * 6) : 22,
    phase: 'developing',
    declineMod: 0,
    retirementOffered: false,
    squadRole: 'flex',
  }

  G.shinobi.push(newShinobi)
  G.prospects = (G.prospects || []).filter(x => x.id !== prospectId)
  G.scoutWatchlist = (G.scoutWatchlist || []).filter(id => id !== prospectId)

  aL(`${p.fn} ${p.ln} signed for ${cost.toLocaleString()} ryo and joins as a Genin!`, 'good')
  ntf(`${p.fn} ${p.ln} signed!`)
  rSco()
}
