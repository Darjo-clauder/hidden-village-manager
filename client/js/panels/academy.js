import { G, ui, sPow, sn, clamp, fmt } from '../state.js'
import { RANKS, RKC } from '../constants.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { sBars, pCl } from './roster.js'

const MINOR_CLANS = [
  { n: 'Sarutobi', t: 'Fire Sage',   statKey: 'ninjutsu' },
  { n: 'Hatake',   t: 'Copy Wheel',  statKey: 'intelligence' },
  { n: 'Namikaze', t: 'Space-Time',  statKey: 'speed' },
  { n: 'Kurama',   t: 'Illusion Arts', statKey: 'genjutsu' },
  { n: 'Mitarashi', t: 'Cursed Seal', statKey: 'chakra' },
  { n: 'Gekko',    t: 'Moon Shadow', statKey: 'taijutsu' },
  { n: 'Shiranui', t: 'Needle Art',  statKey: 'speed' },
  { n: 'Morino',   t: 'Torture Arts', statKey: 'intelligence' },
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

    return `<div class="card" style="${waited >= 6 ? 'border-color:#f66' : ''}">
      <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:7px">
        <div style="flex:1">
          <div style="font-size:11px;color:#e8e0cc;font-weight:bold">${sn(p)}</div>
          <div style="font-size:8px;color:#7a7060">${p.clan ? p.clan + ' · ' + p.trait : p.spec} · Age ${p.age}${p.origin ? ' · <span style="color:#cc7fb8">from ' + p.origin + '</span>' : ''}</div>
          ${p.archetype ? `<div style="font-size:8px;color:#cc7fb8;margin-top:2px;letter-spacing:1px">${p.archetype.n}</div>` : ''}
          ${rival ? `<div style="font-size:8px;color:#f66;margin-top:2px">⚔ Rivals with ${sn(rival)}</div>` : ''}
        </div>
        <span class="rk ${RKC[p.ri]}">${RANKS[p.ri]}</span>
      </div>
      <div style="font-size:8px;color:#7a7060;font-style:italic;margin-bottom:7px;line-height:1.5">${archFlavorTrunc}</div>
      <div class="sg">${sBars(p)}</div>
      <div style="margin-top:7px;display:flex;align-items:center;justify-content:space-between">
        <span class="trait-tag ${pCl(p.pers)}">${p.pers.n}</span>
        <div style="font-size:8px">
          Pwr <span style="color:#e8e0cc">${sPow(p)}</span>
          &nbsp;·&nbsp;
          Pot <span style="color:${potColor}">${potText}</span>
          ${p.scouted ? '' : '<span style="color:#3a3630;font-size:7px"> (unverified)</span>'}
        </div>
      </div>
      <div style="margin-top:6px">
        <div style="display:flex;justify-content:space-between;font-size:7px;color:#7a7060;margin-bottom:2px">
          <span>Patience — <span style="color:${patienceColor}">${patienceLabel}</span></span>
          <span style="color:${patienceColor}">${waited}m waiting</span>
        </div>
        <div style="background:#2e2a22;height:2px;border-radius:1px">
          <div style="background:${patienceColor};height:2px;border-radius:1px;width:${patience}%"></div>
        </div>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
        <button class="gb gb-g" onclick="rec('${p.id}')" ${canRecruit ? '' : 'disabled'}>Recruit — 2,000 ryo ►</button>
        ${scoutingAm
          ? `<div style="font-size:9px;color:#fa0;align-self:center">⟳ Being scouted…</div>`
          : p.scouted
            ? `<div style="font-size:9px;color:#8fbc8f;align-self:center">✓ Scouted</div>`
            : `<button class="gb" onclick="oScout('${p.id}')" ${G.ryo >= 3000 ? '' : 'disabled'}>Scout — 3,000 ryo ►</button>`
        }
      </div>
    </div>`
  }).join('') || '<div style="color:#7a7060;font-size:10px">No prospects. Advance month.</div>'
}

export function rec(id) {
  if (G.ryo < 2000) { ntf('Not enough ryo!'); return }
  const p = G.prospects.find(x => x.id === id); if (!p) return
  G.ryo -= 2000

  const recruited = { ...p, status: 'available' }

  // 20% chance of minor clan affiliation on graduation (if no existing clan)
  if (!recruited.clan && Math.random() < 0.20) {
    const mc = pk(MINOR_CLANS)
    recruited.clan = mc.n; recruited.trait = mc.t
    recruited.stats[mc.statKey] = clamp(recruited.stats[mc.statKey] + rnd(3, 8), 0, 99)
    aL(sn(recruited) + ' revealed hidden ' + mc.n + ' heritage on graduation! Trait: ' + mc.t + '.', 'good')
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
