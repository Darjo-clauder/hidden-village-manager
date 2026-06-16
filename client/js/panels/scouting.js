import { G, pDesc, personalityJudge } from '../state.js'
import { REGIONS, REGION_EVENTS } from '../constants.js'
import { aL, ntf } from '../ui.js'

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
                  <span style="margin-right:10px">👁 JA:${scout.stats.perception||'?'}</span>
                  <span style="margin-right:10px">🔮 JP:${scout.stats.endurance||'?'}</span>
                  <span style="margin-right:10px">🌑 RK:${scout.stats.stealth||'?'}</span>
                  <span>🔥 Ad:${scout.stats.ninjutsu||'?'}</span>
                </div>
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
                <div style="display:flex;gap:12px;font-size:.75rem">
                  <span>Fatigue: <span style="color:${fatigueColor}">${scout.fatigue||0}%</span></span>
                  ${scout.regionAssigned ? `<span>Contacts: <span style="color:#c9a84c">${contacts}/20</span></span>` : ''}
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
    <h3 style="color:#aaa;font-size:.85rem;margin:0 0 10px;text-transform:uppercase;letter-spacing:.08em">Recent Reports (${reports.length})</h3>
    ${reports.length === 0
      ? '<div style="color:#555;font-size:.85rem">No reports yet. Assign scouts to regions.</div>'
      : `<div style="display:grid;gap:8px;margin-bottom:16px">
          ${reports.map(r => {
            const regionObj = REGIONS.find(reg => reg.id === r.region)
            const qualColor = r.quality === 'Detailed' ? '#8fbc8f' : r.quality === 'General' ? '#f0a030' : '#999'
            const confColor = (r.confidence||0) >= 75 ? '#8fbc8f' : (r.confidence||0) >= 55 ? '#f0a030' : '#f66'
            return `<div style="background:#1a1a1a;border:1px solid ${r.isSecondOpinion?'#a85':'#333'};border-radius:6px;padding:9px 11px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <span style="font-size:.8rem;color:#e8d5a3;font-weight:bold">${r.prospectName}</span>
                <span style="font-size:.72rem;color:#666">Y${r.year}M${r.month}</span>
              </div>
              <div style="font-size:.75rem;color:#aaa;margin-bottom:5px">
                ${regionObj?.icon||''} ${regionObj?.n||r.region} · via ${r.scoutName} ·
                <span style="color:${qualColor}">${r.quality}</span> ·
                Confidence: <span style="color:${confColor}">${r.confidence||'?'}%</span>
                ${r.rivalInterest ? ' · <span style="color:#f66">⚠ Rival interest</span>' : ''}
                ${r.isSecondOpinion ? ' · <span style="color:#daa">2nd opinion</span>' : ''}
                ${r.personalityRevealed ? ' · <span style="color:#9cf">Personality read available</span>' : ''}
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
  `
}

function prospectCard(p, inWatchlist) {
  const regionObj = REGIONS.find(r => r.id === p.fromRegion)
  const urgency = p.urgencyMonths > 0
  const watching = (G.scoutWatchlist || []).includes(p.id)
  const judgeLevel = personalityJudge()
  const persReady = p.personalityRevealed
  const history = p.scoutHistory || []
  const conflicts = p.conflictingRanges || []
  return `<div style="background:#1a1a1a;border:1px solid ${urgency&&p.urgencyMonths<=2?'#f66':'#333'};border-radius:6px;padding:10px;font-size:.8rem">
    ${urgency && p.urgencyMonths <= 2 ? `<div style="color:#f66;font-size:.72rem;margin-bottom:4px">⚠ Rival interest! ${p.urgencyMonths}m left</div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="color:#e8d5a3;font-weight:bold;margin-bottom:4px">${p.fn} ${p.ln}</div>
      <button onclick="toggleWatchlist('${p.id}')" style="background:none;border:none;cursor:pointer;font-size:.95rem;color:${watching?'#c9a84c':'#444'}" title="${watching?'Remove from':'Add to'} watchlist">★</button>
    </div>
    <div style="color:#999;margin-bottom:4px">${regionObj?.icon||''} ${regionObj?.n||p.fromRegion} · via ${p.scoutName||'?'}</div>
    ${p.clan ? `<div style="color:#c9a84c;font-size:.75rem;margin-bottom:4px">Clan: ${p.clan}</div>` : ''}
    <div style="color:#888;font-size:.73rem;margin-bottom:4px">
      ${p.statRanges
        ? `Pot: ${p.potRange?.exact ? p.potential : p.potRange?.lo+'–'+p.potRange?.hi}`
        : `Pot: ${p.potential}`}
      ${p.scoutConfidence ? ` · Confidence: ${p.scoutConfidence}%` : ''}
    </div>
    <div style="font-size:.72rem;color:#9cf;margin-bottom:4px">
      Personality: ${persReady ? `Loyalty ${pDesc(p.pMatrix.loyalty,'loyalty',Math.max(judgeLevel,p.personalityJudgeLevel||0))}, Ambition ${pDesc(p.pMatrix.ambition,'ambition',Math.max(judgeLevel,p.personalityJudgeLevel||0))}` : 'Unknown — needs a scout with sharper judgment'}
    </div>
    ${conflicts.length ? `<div style="font-size:.7rem;color:#daa;border-top:1px solid #332;padding-top:4px;margin-top:4px">
      ⚠ Conflicting reports: ${conflicts.map(c => c.scoutName + ' (' + c.confidence + '%)').join(', ')} disagree with the primary scout's read.
    </div>` : ''}
    ${history.length > 1 ? `<div style="font-size:.68rem;color:#666;margin-top:4px">History: ${history.length} reports filed, picture sharpening over time.</div>` : ''}
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
