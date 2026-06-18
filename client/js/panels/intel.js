import { G, sn, clamp, rnd, pk, fmt, addChronicle } from '../state.js'
import { ANBU_OPS } from '../constants.js'
import { aL, ntf } from '../ui.js'

window._intelTab = 'dossiers'

export function rIn() {
  const el = document.getElementById('itl')
  if (!el) return
  const tabs = ['dossiers', 'anbu', 'caught', 'counter']
  const tabHtml = `<div style="display:flex;gap:6px;margin-bottom:12px">
    ${tabs.map(t => `<button class="btn${window._intelTab === t ? ' act' : ''}" onclick="intelTab('${t}')" style="font-size:9px;padding:3px 8px">${t.toUpperCase()}</button>`).join('')}
  </div>`
  el.innerHTML = tabHtml + _intelBody()
}

function _intelBody() {
  const t = window._intelTab
  if (t === 'dossiers') return _dossiers()
  if (t === 'anbu') return _anbu()
  if (t === 'caught') return _caught()
  if (t === 'counter') return _counter()
  return ''
}

// ── Dossiers ────────────────────────────────────────────────────────────────
function _dossiers() {
  const now = (G.year - 1) * 12 + G.month
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
    ${(G.villages || []).map(v => {
      const reports = (G.intelReports || []).filter(r => r.villageId === v.id)
      const rc = v.rel > 60 ? '#8fbc8f' : v.rel > 30 ? '#fa0' : '#f66'
      const recon = reports.find(r => r.type === 'recon')
      const deep = reports.find(r => r.type === 'deep_cover')
      const assn = reports.find(r => r.type === 'assn_intel')
      return `<div class="ke-card">
        <div style="font-size:11px;color:#e8e0cc;font-weight:bold;margin-bottom:8px">${v.ico} ${v.n}</div>
        <div style="font-size:9px;color:#7a7060;margin-bottom:2px">${v.kageRank} ${v.kage}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:8px;color:#7a7060;width:55px">Relations</span>
          <div class="bar" style="flex:1"><div class="fill" style="width:${v.rel}%;background:${rc}"></div></div>
          <span style="font-size:9px;color:#7a7060">${v.rel}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:8px;color:#7a7060;width:55px">Strength</span>
          <div class="bar" style="flex:1"><div class="fill" style="width:${v.str}%"></div></div>
          <span style="font-size:9px;color:#7a7060">${v.str}</span>
        </div>
        ${v.allied ? '<div style="font-size:8px;color:#8fbc8f;margin-bottom:3px">✓ Allied</div>' : ''}
        ${v.threat ? `<div style="font-size:8px;color:#f66;margin-bottom:3px">⚠ Threat: ${v.threat}</div>` : ''}
        ${recon ? `<div style="font-size:8px;color:#c9a84c;margin-bottom:2px">👁 Recon: Roster ~${recon.data.rosterSize}, Econ ${recon.data.economyLevel}/5 <span style="color:#555">(exp M${recon.expiresMonth % 12 || 12})</span></div>` : '<div style="font-size:8px;color:#444;margin-bottom:2px">👁 No recon data</div>'}
        ${deep ? `<div style="font-size:8px;color:#c9a84c;margin-bottom:2px">🕵 Defense ${deep.data.defenseRating}/20, ${deep.data.activeSquads} squads active</div>` : ''}
        ${assn ? `<div style="font-size:8px;color:#f88;margin-bottom:2px">💀 Kage rating ${assn.data.kageRating}/20 — weakness: ${assn.data.weaknesses}</div>` : ''}
        <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
          <button class="btn" onclick="shadowScout('${v.id}')" style="font-size:8px;padding:2px 6px">Shadow Scout</button>
          <button class="btn" onclick="dispatchAnbu('${v.id}')" style="font-size:8px;padding:2px 6px">ANBU Op</button>
        </div>
      </div>`
    }).join('')}
  </div>`
}

// ── ANBU Dispatch ────────────────────────────────────────────────────────────
function _anbu() {
  const anbuCmd = (G.staff || []).find(st => st.role === 'anbu_commander')
  if (!anbuCmd) return `<div style="color:#f66;font-size:11px;padding:20px 0">ANBU Commander required. Hire one from the Staff panel.</div>`
  const activeOps = G.anbuOps || []
  const cmdRating = anbuCmd.stats?.stealth || anbuCmd.rating || 8
  return `<div>
    <div style="font-size:10px;color:#c9a84c;margin-bottom:10px">ANBU Commander: ${sn(anbuCmd)} — Stealth ${cmdRating}/20</div>
    ${activeOps.length > 0 ? `
      <div style="font-size:10px;color:#e8e0cc;margin-bottom:8px">Active Operations (${activeOps.length})</div>
      <div style="display:grid;gap:6px;margin-bottom:12px">
        ${activeOps.map(op => {
          const v = (G.villages || []).find(v => v.id === op.targetVillageId)
          const opDef = ANBU_OPS.find(o => o.id === op.type)
          return `<div class="ke-card" style="padding:8px">
            <span style="font-size:10px;color:#e8e0cc">${opDef?.icon || '👁'} ${opDef?.n || op.type} → ${v?.n || 'Unknown'}</span>
            <span style="font-size:9px;color:#7a7060;float:right">${op.monthsLeft} mo left</span>
          </div>`
        }).join('')}
      </div>` : '<div style="font-size:9px;color:#555;margin-bottom:10px">No active operations.</div>'}
    <div style="font-size:10px;color:#e8e0cc;margin-bottom:8px">Dispatch New Op</div>
    <div style="display:grid;gap:6px;margin-bottom:10px">
      ${ANBU_OPS.map(op => `
        <div class="ke-card" style="padding:8px">
          <div style="font-size:11px;color:#e8e0cc;margin-bottom:4px">${op.icon} ${op.n} — ${fmt(op.cost)} ryo</div>
          <div style="font-size:9px;color:#7a7060;margin-bottom:6px">${op.desc} Duration: ${op.minDur}–${op.maxDur} months.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${(G.villages || []).map(v => `<button class="btn" onclick="launchAnbu('${op.id}','${v.id}')" style="font-size:8px;padding:2px 6px">${v.ico} ${v.n}</button>`).join('')}
          </div>
        </div>`).join('')}
    </div>
  </div>`
}

// ── Caught ANBU ──────────────────────────────────────────────────────────────
function _caught() {
  const caught = G.caughtAnbu || []
  if (caught.length === 0) return `<div style="color:#555;font-size:11px;padding:20px 0">No agents in foreign custody.</div>`
  return `<div style="display:grid;gap:8px">
    ${caught.filter(c => c.status !== 'resolved').map(c => {
      const v = (G.villages || []).find(v => v.id === c.targetVillageId)
      return `<div class="ke-card">
        <div style="font-size:10px;color:#f88;margin-bottom:6px">Agent captured by ${v?.n || 'Unknown'} — ${c.status.toUpperCase()}</div>
        <div style="font-size:9px;color:#7a7060;margin-bottom:8px">Captured Y${Math.floor(c.month / 12) + 1} M${c.month % 12 || 12}</div>
        ${c.status === 'imprisoned' ? `
          <div style="display:flex;gap:6px">
            <button class="btn" onclick="ransomAnbu('${c.id}')" style="font-size:9px">Ransom (15,000 ryo)</button>
            <button class="btn" onclick="abandonAnbu('${c.id}')" style="font-size:9px;color:#f66">Abandon</button>
          </div>` : '<div style="font-size:9px;color:#666">Agent is KIA — no recovery possible.</div>'}
      </div>`
    }).join('')}
  </div>`
}

// ── Counter-Intel ─────────────────────────────────────────────────────────────
function _counter() {
  const rating = G.counterIntelRating || 2
  const intelBld = G.upgrades?.intel || 0
  const anbuCmd = (G.staff || []).find(st => st.role === 'anbu_commander')
  const cmdBonus = anbuCmd ? Math.floor((anbuCmd.stats?.stealth || 5) / 4) : 0
  const effective = clamp(rating + intelBld * 2 + cmdBonus, 1, 20)
  const upgCost = 8000 + rating * 4000
  const canUpg = G.ryo >= upgCost && rating < 10
  return `<div>
    <div style="font-size:11px;color:#e8e0cc;margin-bottom:12px">Counter-Intelligence</div>
    <div class="ke-card" style="margin-bottom:10px">
      <div style="font-size:10px;color:#c9a84c;margin-bottom:8px">Effective Rating: ${effective}/20</div>
      <div style="font-size:9px;color:#7a7060;margin-bottom:4px">Intel Building: +${intelBld * 2} (Lvl ${intelBld})</div>
      <div style="font-size:9px;color:#7a7060;margin-bottom:4px">ANBU Commander: +${cmdBonus} (${anbuCmd ? sn(anbuCmd) : 'none hired'})</div>
      <div style="font-size:9px;color:#7a7060;margin-bottom:10px">Base rating: ${rating}/10</div>
      ${rating < 10 ? `
        <button class="gb gb-g" onclick="upgradeCounterIntel()" ${canUpg ? '' : 'disabled'}>
          Train Counter-Intel Network — ${fmt(upgCost)} ryo ►
        </button>
        <div style="font-size:8px;color:#7a7060;margin-top:4px">Each rank reduces enemy ANBU success chance by ~5%.</div>
      ` : `<div style="font-size:9px;color:#8fbc8f">Counter-intel network at maximum base rating.</div>`}
    </div>
    <div style="font-size:9px;color:#7a7060;line-height:1.5">
      Higher counter-intel rating reduces enemy ANBU success against your village. Upgrade the Intel building and hire an ANBU Commander for additional bonuses.
    </div>
  </div>`
}

export function upgradeCounterIntel() {
  const rating = G.counterIntelRating || 2
  if (rating >= 10) { ntf('Already at maximum base rating.'); return }
  const cost = 8000 + rating * 4000
  if (G.ryo < cost) { ntf('Not enough ryo.'); return }
  G.ryo -= cost
  G.counterIntelRating = rating + 1
  aL(`Counter-intel network trained. Base rating now ${G.counterIntelRating}/10.`, 'good')
  ntf('Counter-Intel upgraded!')
  rIn()
}

// ── Exported action handlers ─────────────────────────────────────────────────
export function intelTab(t) { window._intelTab = t; rIn() }

export function dispatchAnbu(villageId) {
  const anbuCmd = (G.staff || []).find(st => st.role === 'anbu_commander')
  if (!anbuCmd) { ntf('Hire an ANBU Commander first.'); return }
  // Open op selection via prompt (simplified — pick via buttons in panel)
  ntf('Select an operation type from the ANBU tab.')
  window._intelTab = 'anbu'
  rIn()
}

export function launchAnbu(opId, villageId) {
  const anbuCmd = (G.staff || []).find(st => st.role === 'anbu_commander')
  if (!anbuCmd) { ntf('ANBU Commander required.'); return }
  const op = ANBU_OPS.find(o => o.id === opId)
  if (!op) return
  if (G.ryo < op.cost) { ntf('Insufficient ryo for this operation.'); return }
  G.ryo -= op.cost
  G.anbuOps = G.anbuOps || []
  G.anbuOps.push({
    id: Math.random().toString(36).slice(2),
    type: opId, targetVillageId: villageId,
    monthsLeft: rnd(op.minDur, op.maxDur),
    catchRisk: op.catchRisk,
  })
  aL(`ANBU ${op.n} dispatched. Cost: ${fmt(op.cost)} ryo.`, 'neutral')
  ntf('ANBU operation dispatched.')
  rIn()
}

export function shadowScout(villageId) {
  const scout = (G.staff || []).find(st => st.role === 'scout_jonin')
  if (!scout) { ntf('Scout Jonin required.'); return }
  const v = (G.villages || []).find(v => v.id === villageId)
  const rosterEst = rnd(5, 18)
  const now = (G.year - 1) * 12 + G.month
  G.intelReports = G.intelReports || []
  // Shadow scouting gives a minimal recon without diplomatic risk
  const existing = G.intelReports.find(r => r.villageId === villageId && r.type === 'recon')
  const report = { villageId, type: 'recon', data: { rosterSize: rosterEst, economyLevel: rnd(1, 3) }, expiresMonth: now + 2 }
  if (existing) Object.assign(existing, report)
  else G.intelReports.push(report)
  aL(`Shadow scouting complete — ${v?.n || 'target'} roster estimated at ~${rosterEst}.`, 'neutral')
  ntf('Shadow scout report filed.')
  rIn()
}

export function ransomAnbu(agentId) {
  if (G.ryo < 15000) { ntf('Need 15,000 ryo for ransom.'); return }
  G.ryo -= 15000
  const agent = (G.caughtAnbu || []).find(c => c.id === agentId)
  if (agent) { agent.status = 'resolved'; aL('Ransomed captured ANBU agent for 15,000 ryo.', 'neutral') }
  ntf('Agent ransomed.')
  rIn()
}

export function abandonAnbu(agentId) {
  const agent = (G.caughtAnbu || []).find(c => c.id === agentId)
  if (agent) { agent.status = 'resolved'; aL('Abandoned captured ANBU agent to their fate.', 'bad') }
  ntf('Agent abandoned.')
  rIn()
}
