import { G, sn, clamp, rnd, pk, fmt, addChronicle } from '../state.js'
import { ANBU_OPS } from '../constants.js'
import { aL, ntf } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { openContextMenu } from '../uikit.js'
import { LEVERAGE_PLAYS, PLAY_BY_ID, playEligibility, leverageSuccessChance, leverageEffect } from '../../../shared/utils/leverage.js'
import { shiftKageRel } from '../rivalKage.js'
import { kageMod } from '../../../shared/constants/kageDev.js'

// Right-click a rival village → intel verb menu (reuses the P1 portal).
export function intelCtx(e, villageId) {
  e.preventDefault()
  const v = (G.villages || []).find(x => x.id === villageId || x.n === villageId); if (!v) return false
  openContextMenu(e.clientX, e.clientY, [
    { label: 'View Dossier', fn: () => { window._intelTab = 'dossiers'; rIn() } },
    { label: 'Shadow Scout', fn: () => window.shadowScout && window.shadowScout(v.id) },
    { label: 'Dispatch Shadow Op', fn: () => window.dispatchAnbu && window.dispatchAnbu(v.id) },
    { separator: true },
    { label: 'Send Gifts (5k)', fn: () => window.sGift && window.sGift(v.n) },
    { label: 'Demand Tribute', fn: () => window.demandTribute && window.demandTribute(v.n) },
    ...((v.threat || 0) > 0 ? [{ label: 'Appease (4k)', fn: () => window.appease && window.appease(v.n) }] : []),
  ])
  return false
}

window._intelTab = 'threats'

export function rIn() {
  const el = document.getElementById('itl')
  if (!el) return
  const tabs = ['threats', 'dossiers', 'anbu', 'leverage', 'caught', 'counter']
  const tabHtml = `<div style="display:flex;gap:6px;margin-bottom:12px">
    ${tabs.map(t => `<button class="btn${window._intelTab === t ? ' act' : ''}" onclick="intelTab('${t}')" style="font-size:var(--fs-body);padding:3px 8px">${({ anbu: 'SHADOW OPS' }[t] || t.toUpperCase())}</button>`).join('')}
  </div>`
  el.innerHTML = tabHtml + _intelBody()
}

function _intelBody() {
  const t = window._intelTab
  if (t === 'threats')  return _threats()
  if (t === 'dossiers') return _dossiers()
  if (t === 'anbu') return _anbu()
  if (t === 'leverage') return _leverage()
  if (t === 'caught') return _caught()
  if (t === 'counter') return _counter()
  return ''
}

// ── Route F: Rival Threat Board ──────────────────────────────────────────────
function _threats() {
  const villages = G.villages || []
  if (!villages.length) return `<div style="color:var(--text-faint);font-size:var(--fs-lead);padding:20px 0">${tr("intel.noData")}</div>`

  const _tier = v => {
    if (v.rel < 25 && v.str > 65) return { label:'CRITICAL', col:'var(--red)' }
    if (v.rel < 40 || v.str > 70)  return { label:'HIGH',     col:'var(--red-soft)' }
    if (v.rel < 60 || v.str > 50)  return { label:'MEDIUM',   col:'var(--orange)' }
    return { label:'LOW', col:'var(--green)' }
  }
  const _momentum = v => {
    if (v.threat)     return { icon:'↑', col:'var(--red)', txt:'Threatening' }
    if (v.allied)     return { icon:'↔', col:'var(--green)', txt:'Allied' }
    if (v.str > 60)   return { icon:'↑', col:'var(--orange)', txt:'Growing' }
    return { icon:'→', col:'var(--text-dim)', txt:'Stable' }
  }

  const sorted = [...villages].sort((a, b) => {
    const scoreA = (100 - a.rel) * 0.6 + a.str * 0.4
    const scoreB = (100 - b.rel) * 0.6 + b.str * 0.4
    return scoreB - scoreA
  })

  return `<div>
    <div style="font-size:var(--fs-body);color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">Threat Assessment — Y${G.year} M${G.month}</div>
    <div style="display:grid;gap:8px">
      ${sorted.map(v => {
        const t    = _tier(v)
        const mom  = _momentum(v)
        const recon = (G.intelReports || []).find(r => r.villageId === v.id && r.type === 'recon')
        const deep  = (G.intelReports || []).find(r => r.villageId === v.id && r.type === 'deep_cover')
        const rcCol = v.rel > 60 ? 'var(--green)' : v.rel > 30 ? 'var(--orange)' : 'var(--red)'
        return `<div style="background:var(--sunken);border:1px solid var(--surface-3);border-left:3px solid ${t.col};padding:10px 12px;cursor:context-menu" oncontextmenu="return intelCtx(event,'${(v.id || v.n)}')" title="Right-click for actions">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="font-size:var(--fs-head)">${v.ico}</span>
            <div style="flex:1">
              <div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold">${v.n}</div>
              <div style="font-size:var(--fs-small);color:var(--text-faint)">${v.kageRank || ''} ${v.kage || ''}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:var(--fs-body);font-weight:bold;color:${t.col}">${t.label}</div>
              <div style="font-size:var(--fs-small);color:${mom.col}">${mom.icon} ${mom.txt}</div>
            </div>
          </div>
          <div style="display:flex;gap:16px;font-size:var(--fs-small);flex-wrap:wrap">
            <span style="color:var(--text-faint)">Relations <b style="color:${rcCol}">${v.rel}/100</b></span>
            <span style="color:var(--text-faint)">Strength <b style="color:var(--text-hi)">${v.str}/100</b></span>
            ${v.allied ? '<span style="color:var(--green)">✓ Allied</span>' : ''}
            ${v.threat ? `<span style="color:var(--red)">⚠ ${v.threat}</span>` : ''}
          </div>
          ${recon ? `<div style="font-size:var(--fs-small);color:var(--accent);margin-top:5px">👁 Intel: ~${recon.data.rosterSize} shinobi, economy ${recon.data.economyLevel}/5</div>` : ''}
          ${deep  ? `<div style="font-size:var(--fs-small);color:var(--accent);margin-top:2px">🕵 Defense ${deep.data.defenseRating}/20 · ${deep.data.activeSquads} active squads</div>` : ''}
          ${!recon && !deep ? `<div style="font-size:var(--fs-small);color:var(--border);margin-top:5px;font-style:italic">No field data — dispatch Shadow to reveal</div>` : ''}
        </div>`
      }).join('')}
    </div>
  </div>`
}

// ── Dossiers ────────────────────────────────────────────────────────────────
function _dossiers() {
  const now = (G.year - 1) * 12 + G.month
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
    ${(G.villages || []).map(v => {
      const reports = (G.intelReports || []).filter(r => r.villageId === v.id)
      const rc = v.rel > 60 ? 'var(--green)' : v.rel > 30 ? 'var(--orange)' : 'var(--red)'
      const recon = reports.find(r => r.type === 'recon')
      const deep = reports.find(r => r.type === 'deep_cover')
      const assn = reports.find(r => r.type === 'assn_intel')
      return `<div class="ke-card">
        <div style="font-size:var(--fs-lead);color:var(--text-hi);font-weight:bold;margin-bottom:8px">${v.ico} ${v.n}</div>
        <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:2px">${v.kageRank} ${v.kage}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:var(--fs-small);color:var(--text-dim);width:55px">${tr("intel.relations")}</span>
          <div class="bar" style="flex:1"><div class="fill" style="width:${v.rel}%;background:${rc}"></div></div>
          <span style="font-size:var(--fs-body);color:var(--text-dim)">${v.rel}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:var(--fs-small);color:var(--text-dim);width:55px">${tr("intel.strength")}</span>
          <div class="bar" style="flex:1"><div class="fill" style="width:${v.str}%"></div></div>
          <span style="font-size:var(--fs-body);color:var(--text-dim)">${v.str}</span>
        </div>
        ${v.allied ? '<div style="font-size:var(--fs-small);color:var(--green);margin-bottom:3px">✓ Allied</div>' : ''}
        ${v.threat ? `<div style="font-size:var(--fs-small);color:var(--red);margin-bottom:3px">⚠ Threat: ${v.threat}</div>` : ''}
        ${recon ? `<div style="font-size:var(--fs-small);color:var(--gold);margin-bottom:2px">👁 Recon: Roster ~${recon.data.rosterSize}, Econ ${recon.data.economyLevel}/5 <span style="color:var(--text-faint)">(exp M${recon.expiresMonth % 12 || 12})</span></div>` : '<div style="font-size:var(--fs-small);color:var(--border-hi);margin-bottom:2px">👁 No recon data</div>'}
        ${deep ? `<div style="font-size:var(--fs-small);color:var(--gold);margin-bottom:2px">🕵 Defense ${deep.data.defenseRating}/20, ${deep.data.activeSquads} squads active</div>` : ''}
        ${assn ? `<div style="font-size:var(--fs-small);color:var(--red-soft);margin-bottom:2px">💀 Warden rating ${assn.data.kageRating}/20 — weakness: ${assn.data.weaknesses}</div>` : ''}
        <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
          <button class="btn" onclick="shadowScout('${v.id}')" style="font-size:var(--fs-small);padding:2px 6px">${tr("intel.shadowScout")}</button>
          <button class="btn" onclick="dispatchAnbu('${v.id}')" style="font-size:var(--fs-small);padding:2px 6px">${tr("intel.anbuOp")}</button>
        </div>
      </div>`
    }).join('')}
  </div>`
}

// ── Shadow Dispatch ────────────────────────────────────────────────────────────
function _anbu() {
  const anbuCmd = (G.staff || []).find(st => st.role === 'anbu_commander')
  if (!anbuCmd) return `<div style="color:var(--red);font-size:var(--fs-lead);padding:20px 0">Shadow Commander required. Hire one from the Staff panel.</div>`
  const activeOps = G.anbuOps || []
  const cmdRating = anbuCmd.stats?.stealth || anbuCmd.rating || 8
  return `<div>
    <div style="font-size:var(--fs-body);color:var(--gold);margin-bottom:10px">Shadow Commander: ${sn(anbuCmd)} — Stealth ${cmdRating}/20</div>
    ${activeOps.length > 0 ? `
      <div style="font-size:var(--fs-body);color:var(--text-hi);margin-bottom:8px">Active Operations (${activeOps.length})</div>
      <div style="display:grid;gap:6px;margin-bottom:12px">
        ${activeOps.map(op => {
          const v = (G.villages || []).find(v => v.id === op.targetVillageId)
          const opDef = ANBU_OPS.find(o => o.id === op.type)
          return `<div class="ke-card" style="padding:8px">
            <span style="font-size:var(--fs-body);color:var(--text-hi)">${opDef?.icon || '👁'} ${opDef?.n || op.type} → ${v?.n || 'Unknown'}</span>
            <span style="font-size:var(--fs-body);color:var(--text-dim);float:right">${op.monthsLeft} mo left</span>
          </div>`
        }).join('')}
      </div>` : `<div style="font-size:var(--fs-body);color:var(--text-faint);margin-bottom:10px">${tr("intel.noOps")}</div>`}
    <div style="font-size:var(--fs-body);color:var(--text-hi);margin-bottom:8px">${tr("intel.dispatchOp")}</div>
    <div style="display:grid;gap:6px;margin-bottom:10px">
      ${ANBU_OPS.map(op => `
        <div class="ke-card" style="padding:8px">
          <div style="font-size:var(--fs-lead);color:var(--text-hi);margin-bottom:4px">${op.icon} ${op.n} — ${fmt(op.cost)} ryo</div>
          <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:6px">${op.desc} Duration: ${op.minDur}–${op.maxDur} months.</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${(G.villages || []).map(v => `<button class="btn" onclick="launchAnbu('${op.id}','${v.id}')" style="font-size:var(--fs-small);padding:2px 6px">${v.ico} ${v.n}</button>`).join('')}
          </div>
        </div>`).join('')}
    </div>
  </div>`
}

// ── Caught Shadow ──────────────────────────────────────────────────────────────
function _caught() {
  const caught = G.caughtAnbu || []
  if (caught.length === 0) return `<div style="color:var(--text-faint);font-size:var(--fs-lead);padding:20px 0">${tr("intel.noCaptured")}</div>`
  return `<div style="display:grid;gap:8px">
    ${caught.filter(c => c.status !== 'resolved').map(c => {
      const v = (G.villages || []).find(v => v.id === c.targetVillageId)
      return `<div class="ke-card">
        <div style="font-size:var(--fs-body);color:var(--red-soft);margin-bottom:6px">Agent captured by ${v?.n || 'Unknown'} — ${c.status.toUpperCase()}</div>
        <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:8px">Captured Y${Math.floor(c.month / 12) + 1} M${c.month % 12 || 12}</div>
        ${c.status === 'imprisoned' ? `
          <div style="display:flex;gap:6px">
            <button class="btn" onclick="ransomAnbu('${c.id}')" style="font-size:var(--fs-body)">Ransom (15,000 ryo)</button>
            <button class="btn" onclick="abandonAnbu('${c.id}')" style="font-size:var(--fs-body);color:var(--red)">${tr("intel.abandon")}</button>
          </div>` : '<div style="font-size:var(--fs-body);color:var(--text-faint)">Agent is KIA — no recovery possible.</div>'}
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
    <div style="font-size:var(--fs-lead);color:var(--text-hi);margin-bottom:12px">${tr("intel.counterIntel")}</div>
    <div class="ke-card" style="margin-bottom:10px">
      <div style="font-size:var(--fs-body);color:var(--gold);margin-bottom:8px">Effective Rating: ${effective}/20</div>
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:4px">Intel Building: +${intelBld * 2} (Lvl ${intelBld})</div>
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:4px">Shadow Commander: +${cmdBonus} (${anbuCmd ? sn(anbuCmd) : 'none hired'})</div>
      <div style="font-size:var(--fs-body);color:var(--text-dim);margin-bottom:10px">Base rating: ${rating}/10</div>
      ${rating < 10 ? `
        <button class="gb gb-g" onclick="upgradeCounterIntel()" ${canUpg ? '' : 'disabled'}>
          Train Counter-Intel Network — ${fmt(upgCost)} ryo ►
        </button>
        <div style="font-size:var(--fs-small);color:var(--text-dim);margin-top:4px">Each rank reduces enemy Shadow success chance by ~5%.</div>
      ` : `<div style="font-size:var(--fs-body);color:var(--green)">${tr("intel.counterMax")}</div>`}
    </div>
    <div style="font-size:var(--fs-body);color:var(--text-dim);line-height:1.5">
      Higher counter-intel rating reduces enemy Shadow success against your village. Upgrade the Intel building and hire an Shadow Commander for additional bonuses.
    </div>
  </div>`
}

export function upgradeCounterIntel() {
  const rating = G.counterIntelRating || 2
  if (rating >= 10) { ntf(tr('toast.intel.maxRating')); return }
  const cost = 8000 + rating * 4000
  if (G.ryo < cost) { ntf(tr('toast.common.notEnoughRyoDot')); return }
  G.ryo -= cost
  G.counterIntelRating = rating + 1
  aL(tr('toast.intel.counterTrained', { rating: G.counterIntelRating }), 'good')
  ntf(tr('toast.intel.counterUpgraded'))
  rIn()
}

// ── Leverage plays — spend what you know ─────────────────────────────────────
// Every rival row shows each play's live eligibility, so the reason a play is
// closed to you reads as world state ("relations are too cordial") rather than
// a greyed-out button with no explanation.
// Procedural villages carry no `id` — name is the only stable key.
const _vKey = v => v.id || v.n

function _leverageCtx(v) {
  const now = (G.year - 1) * 12 + G.month
  const k = _vKey(v)
  const hasIntel = (G.intelReports || []).some(r => (r.villageId === k || r.villageId === v.n) && (r.expiresMonth ?? 0) >= now)
  return {
    hasIntel,
    kagePersonalRel: v.kagePersonalRel ?? 50,
    aceCount: (v.aces || []).length,
    hasBlocOffer: !!G.summitBlocOffer,
    grudgeTicks: v.grudgeTicks || 0,
    counterIntel: v.counterIntelRating || 0,
    espionageBonus: kageMod(G, 'espionage'),
  }
}

function _leverage() {
  const villages = G.villages || []
  if (!villages.length) return `<div style="color:var(--text-faint);font-size:var(--fs-lead);padding:20px 0">${tr('intel.noData')}</div>`
  const now = (G.year - 1) * 12 + G.month

  return `<div>
    <div style="font-size:var(--fs-body);color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Leverage Plays</div>
    <div style="font-size:var(--fs-small);color:var(--text-dim);margin-bottom:12px;line-height:1.5">
      Recon is ammunition — every play needs a current intel report on the target. Failure exposes you: relations sour and their guard goes up.
    </div>
    ${villages.map(v => {
      const ctx = _leverageCtx(v)
      const suppressed = (v.demandsSuppressedUntil || 0) > now
      return `<div class="surf" style="background:var(--surface);border:1px solid var(--border);padding:10px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:var(--fs-body);color:var(--text-hi)">${v.ico || ''} ${v.n}</div>
          <div style="font-size:var(--fs-micro);color:${ctx.hasIntel ? 'var(--green)' : 'var(--text-dim)'}">
            ${ctx.hasIntel ? '📄 intel on file' : 'no current intel'}
          </div>
        </div>
        <div style="font-size:var(--fs-micro);color:var(--text-dim);margin-bottom:7px">
          Warden rel ${ctx.kagePersonalRel} · aces ${ctx.aceCount} · heat ${ctx.grudgeTicks}
          ${suppressed ? ` · <span style="color:var(--green)">silenced ${(v.demandsSuppressedUntil - now)}mo</span>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${LEVERAGE_PLAYS.map(p => {
            const el = playEligibility(p.id, ctx)
            const chance = Math.round(leverageSuccessChance(p.id, ctx) * 100)
            const afford = G.ryo >= p.cost
            const ok = el.ok && afford
            return `<div style="border:1px solid ${ok ? 'var(--border)' : 'var(--border)'};padding:6px">
              <div style="font-size:var(--fs-small);color:${ok ? 'var(--text-hi)' : 'var(--text-dim)'};margin-bottom:2px">${p.n}</div>
              <div style="font-size:var(--fs-micro);color:var(--text-dim);margin-bottom:4px;line-height:1.4">${p.desc}</div>
              <div style="font-size:var(--fs-micro);color:${ok ? 'var(--gold)' : 'var(--text-dim)'};margin-bottom:4px">${fmt(p.cost)} ryo · ${chance}%</div>
              ${ok
                ? `<button class="btn" style="font-size:var(--fs-micro);padding:2px 6px;width:100%" onclick="runLeveragePlay('${p.id}','${_vKey(v)}')">Run ▸</button>`
                : `<div style="font-size:var(--fs-micro);color:#6a6255;line-height:1.4">${afford ? el.reason : 'Not enough ryo.'}</div>`}
            </div>`
          }).join('')}
        </div>
      </div>`
    }).join('')}
  </div>`
}

export function runLeveragePlay(playId, villageId) {
  const v = (G.villages || []).find(x => _vKey(x) === villageId); if (!v) return
  const play = PLAY_BY_ID[playId]; if (!play) return
  const ctx = _leverageCtx(v)
  const el = playEligibility(playId, ctx)
  if (!el.ok) { ntf(el.reason); return }
  if (G.ryo < play.cost) { ntf(tr('toast.common.notEnoughRyoDot')); return }

  G.ryo -= play.cost
  const success = Math.random() < leverageSuccessChance(playId, ctx)
  const fx = leverageEffect(playId, success)

  v.rel = clamp((v.rel ?? 50) + fx.relDelta, 0, 100)
  v.threat = clamp((v.threat || 0) + fx.threatDelta, 0, 100)
  v.grudgeTicks = (v.grudgeTicks || 0) + fx.grudgeDelta
  if (fx.strengthDelta) v.strength = Math.max(10, (v.strength || 50) + fx.strengthDelta)
  if (fx.kageRelDelta) aL(shiftKageRel(v, fx.kageRelDelta, play.n, G), 'neutral')
  if (fx.clearBloc) G.summitBlocOffer = null
  if (fx.suppressDemandsMonths) {
    v.demandsSuppressedUntil = (G.year - 1) * 12 + G.month + fx.suppressDemandsMonths
  }
  // The play consumes the report it was built on — leverage is spent, not permanent.
  G.intelReports = (G.intelReports || []).filter(r => r.villageId !== _vKey(v) && r.villageId !== v.n)

  aL(`${play.n} vs ${v.n}: ${success ? 'succeeded' : 'FAILED'}. ${fx.note}`, success ? 'good' : 'bad')
  addChronicle(success ? 'Leverage' : 'Exposed', `${play.n} against ${v.n} — ${success ? 'it landed' : 'it was traced back to you'}.`, 'diplomacy')
  ntf(success ? `${play.n} landed.` : `${play.n} exposed.`)
  rIn()
}

// ── Exported action handlers ─────────────────────────────────────────────────
export function intelTab(t) { window._intelTab = t; rIn() }

export function dispatchAnbu(villageId) {
  const anbuCmd = (G.staff || []).find(st => st.role === 'anbu_commander')
  if (!anbuCmd) { ntf(tr('toast.intel.needCommander')); return }
  // Open op selection via prompt (simplified — pick via buttons in panel)
  ntf(tr('toast.intel.selectOp'))
  window._intelTab = 'anbu'
  rIn()
}

export function launchAnbu(opId, villageId) {
  const anbuCmd = (G.staff || []).find(st => st.role === 'anbu_commander')
  if (!anbuCmd) { ntf(tr('toast.intel.commanderRequired')); return }
  const op = ANBU_OPS.find(o => o.id === opId)
  if (!op) return
  if (G.ryo < op.cost) { ntf(tr('toast.intel.insufficientOp')); return }
  G.ryo -= op.cost
  G.anbuOps = G.anbuOps || []
  G.anbuOps.push({
    id: Math.random().toString(36).slice(2),
    type: opId, targetVillageId: villageId,
    monthsLeft: rnd(op.minDur, op.maxDur),
    catchRisk: op.catchRisk,
  })
  aL(tr('toast.intel.anbuDispatched', { op: op.n, cost: fmt(op.cost) }), 'neutral')
  ntf(tr('toast.intel.anbuDispatchedShort'))
  rIn()
}

export function shadowScout(villageId) {
  const scout = (G.staff || []).find(st => st.role === 'scout_jonin')
  if (!scout) { ntf(tr('toast.intel.scoutRequired')); return }
  const v = (G.villages || []).find(v => v.id === villageId)
  const rosterEst = rnd(5, 18)
  const now = (G.year - 1) * 12 + G.month
  G.intelReports = G.intelReports || []
  // Shadow scouting gives a minimal recon without diplomatic risk
  const existing = G.intelReports.find(r => r.villageId === villageId && r.type === 'recon')
  const report = { villageId, type: 'recon', data: { rosterSize: rosterEst, economyLevel: rnd(1, 3) }, expiresMonth: now + 2 }
  if (existing) Object.assign(existing, report)
  else G.intelReports.push(report)
  aL(tr('toast.intel.shadowDone', { village: v?.n || 'target', est: rosterEst }), 'neutral')
  ntf(tr('toast.intel.shadowFiled'))
  rIn()
}

export function ransomAnbu(agentId) {
  if (G.ryo < 15000) { ntf(tr('toast.intel.needRansom')); return }
  G.ryo -= 15000
  const agent = (G.caughtAnbu || []).find(c => c.id === agentId)
  if (agent) { agent.status = 'resolved'; aL(tr('toast.intel.ransomed'), 'neutral') }
  ntf(tr('toast.intel.ransomedShort'))
  rIn()
}

export function abandonAnbu(agentId) {
  const agent = (G.caughtAnbu || []).find(c => c.id === agentId)
  if (agent) { agent.status = 'resolved'; aL(tr('toast.intel.abandoned'), 'bad') }
  ntf(tr('toast.intel.abandonedShort'))
  rIn()
}
