import { G } from '../state.js'
import { REGIONS } from '../constants.js'
import { aL, ntf } from '../ui.js'

export function rSco() {
  const el = document.getElementById('scol')
  if (!el) return
  const scouts = (G.staff || []).filter(st => st.role === 'scout_jonin' || st.role === 'head_scout')
  const reports = (G.scoutReports || []).slice().reverse().slice(0, 15)

  // Regional coverage map
  const regionCoverage = {}
  REGIONS.forEach(r => { regionCoverage[r.id] = scouts.filter(s => s.regionAssigned === r.id) })

  el.innerHTML = `
    <h2 style="color:#c9a84c;margin:0 0 16px">🗺 Scouting Network</h2>

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
          return `<div style="background:#1a1a1a;border:1px solid ${covered?'#444':'#2a2a2a'};border-radius:5px;padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;gap:10px">
            <span style="font-size:1.2rem">${r.icon}</span>
            <div style="flex:1">
              <div style="font-size:.82rem;color:${covered?'#e8d5a3':'#555'}">${r.n}</div>
              <div style="font-size:.72rem;color:#666">${r.desc || ''}</div>
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

    <!-- Scout Reports -->
    <h3 style="color:#aaa;font-size:.85rem;margin:0 0 10px;text-transform:uppercase;letter-spacing:.08em">Recent Reports (${reports.length})</h3>
    ${reports.length === 0
      ? '<div style="color:#555;font-size:.85rem">No reports yet. Assign scouts to regions.</div>'
      : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.8rem">
          <tr style="color:#888;border-bottom:1px solid #333">
            <th style="text-align:left;padding:4px 8px">Date</th>
            <th style="text-align:left;padding:4px 8px">Scout</th>
            <th style="text-align:left;padding:4px 8px">Region</th>
            <th style="text-align:left;padding:4px 8px">Prospect</th>
            <th style="text-align:left;padding:4px 8px">Quality</th>
            <th style="text-align:left;padding:4px 8px">Rival?</th>
          </tr>
          ${reports.map(r => {
            const regionObj = REGIONS.find(reg => reg.id === r.region)
            const qualColor = r.quality === 'Detailed' ? '#8fbc8f' : r.quality === 'General' ? '#f0a030' : '#999'
            return `<tr style="border-bottom:1px solid #1e1e1e">
              <td style="padding:4px 8px;color:#666">Y${r.year}M${r.month}</td>
              <td style="padding:4px 8px;color:#aaa">${r.scoutName}</td>
              <td style="padding:4px 8px">${regionObj?.icon||''} ${regionObj?.n||r.region}</td>
              <td style="padding:4px 8px;color:#e8d5a3">${r.prospectName}</td>
              <td style="padding:4px 8px;color:${qualColor}">${r.quality}</td>
              <td style="padding:4px 8px">${r.rivalInterest ? '<span style="color:#f66">⚠ Yes</span>' : '—'}</td>
            </tr>`
          }).join('')}
        </table></div>`
    }

    <!-- Scout-sourced prospects in pool -->
    ${(() => {
      const scouted = G.prospects.filter(p => p.fromRegion)
      if (!scouted.length) return ''
      return `<h3 style="color:#aaa;font-size:.85rem;margin:20px 0 10px;text-transform:uppercase;letter-spacing:.08em">Scout-Sourced Prospects (${scouted.length})</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
          ${scouted.map(p => {
            const regionObj = REGIONS.find(r => r.id === p.fromRegion)
            const urgency = p.urgencyMonths > 0
            return `<div style="background:#1a1a1a;border:1px solid ${urgency&&p.urgencyMonths<=2?'#f66':'#333'};border-radius:6px;padding:10px;font-size:.8rem">
              ${urgency && p.urgencyMonths <= 2 ? `<div style="color:#f66;font-size:.72rem;margin-bottom:4px">⚠ Rival interest! ${p.urgencyMonths}m left</div>` : ''}
              <div style="color:#e8d5a3;font-weight:bold;margin-bottom:4px">${p.fn} ${p.ln}</div>
              <div style="color:#999;margin-bottom:4px">${regionObj?.icon||''} ${regionObj?.n||p.fromRegion} · via ${p.scoutName||'?'}</div>
              ${p.clan ? `<div style="color:#c9a84c;font-size:.75rem;margin-bottom:4px">Clan: ${p.clan}</div>` : ''}
              <div style="color:#888;font-size:.73rem">
                ${p.statRanges
                  ? `Pot: ${p.potRange?.exact ? p.potential : p.potRange?.lo+'–'+p.potRange?.hi}`
                  : `Pot: ${p.potential}`}
              </div>
            </div>`
          }).join('')}
        </div>`
    })()}
  `
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
