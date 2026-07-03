import { G, sn, sPow, clamp, fmt, rnd, pk, pDesc, personalityJudge, genTransferPool, computeMarketValue } from '../state.js'
import { createPromise } from '../../../shared/utils/promises.js'
import { adjustMinorRel } from '../../../shared/constants/minorNations.js'
import { TRANSFER_CATS, TRANSFER_WINDOWS, BINGO_TIERS, RANKS, VILLAGES_DEF } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'
import { openContextMenu, showHoverPreview, hideHoverPreview, tblSort, tblToggleSort } from '../uikit.js'
import { t } from '../../../shared/utils/i18n.js'
import { standingTier, adjustStanding } from '../../../shared/utils/agentRelations.js'

// Market sort (P1 kit reuse — card grid, so a sort bar instead of table headers).
const _TR_SORTS = [
  { key: 'power', label: 'Power', val: p => sPow(p) },
  { key: 'potential', label: 'Potential', val: p => p.potential || 0 },
  { key: 'fee', label: 'Fee', val: p => p.askingFee || 0 },
  { key: 'avail', label: 'Avail', val: p => p.monthsAvailable || 1 },
]
const _TR_DEFAULT = { key: 'power', dir: 'desc' }

export function trSort(key) { tblToggleSort('transfers', key, _TR_DEFAULT); rTr() }

export function trCtx(e, id) {
  e.preventDefault()
  const p = (G.transferMarket?.pool || []).find(x => x.id === id); if (!p) return false
  const isFree = ['free_agent', 'missing_nin', 'retired_return', 'foreign_specialist'].includes(p.transferCategory)
  const items = isFree
    ? [{ label: 'Sign Direct…', fn: () => window.openPersonalTerms && window.openPersonalTerms(id) }]
    : [{ label: 'Open Negotiation…', fn: () => window.openNegotiation && window.openNegotiation(id) },
       { label: 'Poach (risky)', danger: true, fn: () => window.poachAttempt && window.poachAttempt(id) }]
  openContextMenu(e.clientX, e.clientY, items)
  return false
}

export function trHover(e, id) {
  const p = (G.transferMarket?.pool || []).find(x => x.id === id); if (!p) return
  const mv = computeMarketValue(p)
  const row = (k, v) => `<div class="hp-row"><span>${k}</span><b>${v}</b></div>`
  showHoverPreview(e.clientX, e.clientY, `
    <div class="hp-name">${p.fn} ${p.ln}</div>
    <div class="hp-sub">${RANKS[p.ri]} · ${p.clan || p.spec || '—'} · Age ${p.age}</div>
    ${row('Power', sPow(p))}${row('Potential', p.potential || 0)}
    ${row('Asking', fmt(p.askingFee))}${row('Market value', fmt(mv))}
    ${row('Available', (p.monthsAvailable || 1) + 'mo')}`)
}

// ── Pending negotiation state ─────────────────────────────────────────────────
let _negTarget = null   // { pool shinobi object }
let _negFee = 0         // agreed fee
let _termTarget = null  // pool shinobi for personal terms

export function rTr() {
  const el = document.getElementById('trl')
  if (!el) return
  const tm = G.transferMarket || {}
  const tw = TRANSFER_WINDOWS.find(w => w.id === tm.windowSeason)
  const judgeLevel = personalityJudge()

  const tabId = window._trTab || 'market'

  el.innerHTML = `
    <!-- Window status bar -->
    <div style="background:${tm.windowOpen ? '#1a2e1a' : '#1a1a1a'};border:1px solid ${tm.windowOpen ? '#4a7a4a' : '#333'};border-radius:6px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <span style="font-size:1.2rem">${tw?.icon || '🗓'}</span>
      <div style="flex:1">
        <div style="font-size:.85rem;color:${tm.windowOpen ? '#8fbc8f' : '#888'};font-weight:bold">
          ${tm.windowOpen ? (tw?.n || 'Transfer Window') + ' — OPEN' : 'Transfer Window Closed'}
        </div>
        <div style="font-size:.75rem;color:#666">
          ${tm.windowOpen
            ? `${tm.windowMonthsLeft} month${tm.windowMonthsLeft !== 1 ? 's' : ''} remaining · ${(tm.pool || []).length} shinobi available`
            : 'Next windows: 🌸 Month 3 (Spring) and 🍂 Month 9 (Autumn). Free agents and missing-nin available outside windows.'}
        </div>
      </div>
      ${tm.windowOpen
        ? `<button onclick="refreshTransferPool()" style="background:#2a2a1a;border:1px solid #554;color:#c9a84c;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:.75rem">${t("transfers.refreshPool")}</button>`
        : ''}
    </div>
    ${tm.deadlinePressure ? `<div style="background:#2e1500;border:1px solid #a64;border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:.78rem;color:#f0a030">⏰ Deadline pressure — final stretch of the window. Prices have inflated 10–20% and rival villages are making panic signings.</div>` : ''}

    <!-- Tabs -->
    <div style="display:flex;gap:4px;margin-bottom:14px;flex-wrap:wrap">
      ${[['market','🏪 Market',' ('+((tm.pool||[]).length)+')'],['sellpressure','📨 Approaches',' ('+(G.sellPressure||[]).length+')'],['loans','🔄 Loans',' ('+((tm.loanOut||[]).length + (tm.loanIn||[]).length)+')'],['bingo','📖 Bingo Book'],['offers','📋 Offer History',' ('+(tm.offers||[]).length+')'],['history','📜 History',' ('+((tm.completedDeals||[]).length)+')']].map(([tid,tlabel,tbadge]) =>
        `<button onclick="trTab('${tid}')" style="background:${tabId===tid?'#2a2a1a':'#111'};border:1px solid ${tabId===tid?'#c9a84c':'#333'};color:${tabId===tid?'#c9a84c':'#888'};border-radius:4px;padding:4px 10px;cursor:pointer;font-size:.78rem">${tlabel}${tbadge||''}</button>`
      ).join('')}
    </div>

    ${tabId === 'market' ? renderMarket(tm, judgeLevel) : ''}
    ${tabId === 'sellpressure' ? renderSellPressure() : ''}
    ${tabId === 'loans' ? renderLoans(tm) : ''}
    ${tabId === 'bingo' ? renderBingo(judgeLevel) : ''}
    ${tabId === 'offers' ? renderOffers(tm) : ''}
    ${tabId === 'history' ? renderHistory(tm) : ''}
  `
}

function renderMarket(tm, judgeLevel) {
  const pool = tm.pool || []
  const freeAgents = pool.filter(p => ['free_agent','missing_nin','retired_return','foreign_specialist'].includes(p.transferCategory))
  const windowOnly = pool.filter(p => p.transferCategory === 'village_listed')

  if (pool.length === 0 && !tm.windowOpen) {
    return `<div style="color:#555;text-align:center;padding:40px;font-size:.85rem">
      No transfer market pool active.<br>
      <span style="color:#444;font-size:.8rem">Windows open Month 3 (Spring) and Month 9 (Autumn).<br>Free agents and missing-nin may appear outside windows via scout contacts.</span>
    </div>`
  }
  if (pool.length === 0) {
    return `<div style="color:#555;text-align:center;padding:30px;font-size:.85rem">Window is open but pool is empty — try refreshing.</div>`
  }
  const sort = tblSort('transfers', _TR_DEFAULT)
  const sdef = _TR_SORTS.find(s => s.key === sort.key) || _TR_SORTS[0]
  const sorted = [...pool].sort((a, b) => (sdef.val(a) - sdef.val(b)) * (sort.dir === 'asc' ? 1 : -1))
  const sortBar = `<div style="display:flex;gap:5px;align-items:center;margin-bottom:10px;font-size:8px;color:#555">
    <span style="text-transform:uppercase;letter-spacing:1px">${t("transfers.sort")}</span>
    ${_TR_SORTS.map(s => { const a = sort.key === s.key; return `<button class="tbl-colbtn"${a ? ' style="color:var(--accent);border-color:var(--accent-border)"' : ''} onclick="trSort('${s.key}')">${s.label}${a ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</button>` }).join('')}
    <span style="margin-left:auto;color:#3a3630">right-click a card for actions</span>
  </div>`
  return sortBar + `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px">
    ${sorted.map(p => marketCard(p, judgeLevel)).join('')}
  </div>`
}

function marketCard(p, judgeLevel) {
  const catDef = TRANSFER_CATS.find(c => c.id === p.transferCategory) || TRANSFER_CATS[0]
  const isFree = p.transferCategory === 'free_agent' || p.transferCategory === 'missing_nin' || p.transferCategory === 'retired_return' || p.transferCategory === 'foreign_specialist'
  const canDirectSign = isFree
  const signable = G.ryo >= p.askingFee

  // Personality reads
  const showMatrix = judgeLevel >= 6 && p.pMatrix
  const matTraits = showMatrix ? ['loyalty','ambition','professionalism','temperament','adaptability'].map(k => {
    const d = pDesc(p.pMatrix[k], k, judgeLevel)
    return `<span style="font-size:.68rem;color:${p.pMatrix[k] >= 13 ? '#8fbc8f' : p.pMatrix[k] >= 8 ? '#aaa' : '#f99'}">${k.slice(0,3).toUpperCase()}: ${d}</span>`
  }).join('  ') : ''

  const marketVal = computeMarketValue(p)
  const valueDelta = marketVal - p.askingFee
  return `<div style="background:#1a1a1a;border:1px solid ${catDef.color}33;border-radius:6px;padding:12px;border-top:2px solid ${catDef.color}" oncontextmenu="return trCtx(event,'${p.id}')">
    <div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:6px">
      <div onmousemove="trHover(event,'${p.id}')" onmouseleave="hideHoverPreview()">
        <div style="color:#e8d5a3;font-weight:bold">${p.fn} ${p.ln}</div>
        <div style="font-size:.72rem;color:#888">${RANKS[p.ri]} · ${p.clan || p.spec} · Age ${p.age}</div>
      </div>
      <span style="font-size:.72rem;background:#111;border:1px solid ${catDef.color};color:${catDef.color};border-radius:3px;padding:2px 6px">${catDef.icon} ${catDef.n}</span>
    </div>
    ${p.originVillage ? `<div style="font-size:.72rem;color:#777;margin-bottom:4px">From: ${p.originVillage}</div>` : ''}
    <div style="font-size:.75rem;color:#888;margin-bottom:6px">${catDef.desc}</div>
    <div style="font-size:.75rem;color:#aaa;margin-bottom:8px">
      Power: <strong>${sPow(p)}</strong> · Pot: <strong>${p.potential}</strong>
      · Avail: <span style="color:${(p.monthsAvailable||1)<=1?'#f66':'#aaa'}">${p.monthsAvailable||1}mo</span>
    </div>
    <div style="font-size:.72rem;color:#777;margin-bottom:6px">Market value: <span style="color:${valueDelta>=0?'#8fbc8f':'#f0a030'}">${fmt(marketVal)} ryo</span> ${valueDelta>=0?'(bargain at asking price)':'(asking above value)'}</div>
    ${p.agent ? (() => {
      const ag = (G.agents || []).find(a => a.id === p.agentId)
      const tier = standingTier(ag?.standing)
      const standingTag = ag ? ` · <span style="color:${tier.color}" title="${tier.desc}">${tier.label}${ag.deals ? ` (${ag.deals} deal${ag.deals > 1 ? 's' : ''})` : ''}</span>` : ''
      // First-refusal tip: a Trusted agent flags their other listed client.
      let tip = ''
      if (ag && tier.tip) {
        const other = (G.transferMarket?.pool || []).find(x => x.agentId === ag.id && x.id !== p.id)
        if (other) tip = `<div style="font-size:.68rem;color:#8fbc8f;margin:2px 0 6px">🤝 First refusal: ${ag.name} also reps <b>${other.fn} ${other.ln}</b> — a quiet tip for a trusted partner.</div>`
      }
      return `<div style="font-size:.71rem;color:#cc7fb8;margin-bottom:6px">🤝 Agent: ${p.agent.name} (${p.agent.feePercent}% of signing bonus) — ${p.agent.agendaDesc}${standingTag}</div>${tip}`
    })() : ''}
    ${p.sellOnClause ? `<div style="font-size:.7rem;color:#f0a030;margin-bottom:6px">📜 Sell-on clause: ${p.sellOnClause.percent}% of any future sale owed to ${p.sellOnClause.village}</div>` : ''}
    ${(p.pursuedByVillages||[]).length ? `<div style="font-size:.7rem;color:#777;margin-bottom:6px">Previously pursued by: ${p.pursuedByVillages.join(', ')}</div>` : ''}
    ${showMatrix ? `<div style="margin-bottom:8px;line-height:1.8">${matTraits}</div>` : judgeLevel < 6 ? `<div style="font-size:.7rem;color:#444;margin-bottom:8px">Staff personality judgment too low to read character.</div>` : ''}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:.8rem;color:#c9a84c;font-weight:bold">${fmt(p.askingFee)} ryo</span>
      ${!signable ? `<span style="font-size:.7rem;color:#f66">${t("transfers.insufficientFunds")}</span>` : ''}
    </div>
    <div style="display:flex;gap:6px">
      ${canDirectSign
        ? `<button onclick="openPersonalTerms('${p.id}')" ${!signable?'disabled':''} style="flex:1;background:${signable?'#1a2e1a':'#111'};border:1px solid ${signable?'#4a7a4a':'#333'};color:${signable?'#8fbc8f':'#555'};border-radius:4px;padding:5px;cursor:${signable?'pointer':'not-allowed'};font-size:.75rem">
            ✓ Sign Direct
          </button>`
        : `<button onclick="openNegotiation('${p.id}')" ${!signable?'disabled':''} style="flex:1;background:#1a1a2e;border:1px solid #44a;color:#87ceeb;border-radius:4px;padding:5px;cursor:pointer;font-size:.75rem">
            ⇄ Negotiate
          </button>
          <button onclick="poachAttempt('${p.id}')" style="background:#2e1a1a;border:1px solid #744;color:#f99;border-radius:4px;padding:5px;cursor:pointer;font-size:.75rem" title="Approach directly — cheaper but risks diplomatic incident">
            🕵 Poach
          </button>`
      }
    </div>
  </div>`
}

function renderSellPressure() {
  const sp = G.sellPressure || []
  if (sp.length === 0) return `<div style="color:#555;text-align:center;padding:30px;font-size:.85rem">No rival approaches currently. Rival villages may approach your high-performing shinobi at any time.</div>`
  return sp.map(pressure => {
    const s = (G.shinobi || []).find(x => x.id === pressure.shinobiId)
    if (!s) return ''
    return `<div style="background:#1a1a1a;border:1px solid #f0a030;border-radius:6px;padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:1.1rem">📨</span>
        <div style="flex:1">
          <div style="color:#e8d5a3;font-weight:bold">${pressure.villageName} has approached ${sn(s)}</div>
          <div style="font-size:.75rem;color:#888">Offer: <strong style="color:#c9a84c">${fmt(pressure.offerRyo)} ryo</strong> · Expires Y${pressure.expiresYear}M${pressure.expiresMonth}</div>
        </div>
        <div style="font-size:.75rem;color:#aaa;text-align:right">
          <div>Loyalty: ${s.pMatrix?.loyalty ?? '?'}</div>
          <div>Commit: ${s.commitment ?? 70}</div>
        </div>
      </div>
      <div style="font-size:.78rem;color:#888;margin-bottom:10px">
        ${(s.pMatrix?.loyalty || 10) >= 14 ? '★ High loyalty — likely to stay if you act.' : (s.pMatrix?.loyalty || 10) >= 8 ? 'Moderate loyalty — outcome uncertain.' : '⚠ Low loyalty — genuine risk of accepting.'}
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="sellPressureBlock('${pressure.shinobiId}')" style="flex:1;background:#1a1a2e;border:1px solid #44a;color:#87ceeb;border-radius:4px;padding:6px;cursor:pointer;font-size:.75rem">
          🚫 Block approach<br><span style="font-size:.68rem;color:#666">−5 rel with ${pressure.villageName}</span>
        </button>
        <button onclick="sellPressureAccept('${pressure.shinobiId}')" style="flex:1;background:#1a2e1a;border:1px solid #4a7a4a;color:#8fbc8f;border-radius:4px;padding:6px;cursor:pointer;font-size:.75rem">
          💰 Accept offer<br><span style="font-size:.68rem;color:#666">+${fmt(pressure.offerRyo)} ryo</span>
        </button>
        <button onclick="sellPressureLetDecide('${pressure.shinobiId}')" style="flex:1;background:#2e1a1a;border:1px solid #744;color:#f99;border-radius:4px;padding:6px;cursor:pointer;font-size:.75rem">
          🤔 Let them decide<br><span style="font-size:.68rem;color:#666">${t("transfers.loyaltyCheck")}</span>
        </button>
      </div>
    </div>`
  }).join('')
}

function renderLoans(tm) {
  const lOut = tm.loanOut || []
  const lIn = tm.loanIn || []
  return `
    <h3 style="color:#aaa;font-size:.82rem;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px">Loans Out (${lOut.length})</h3>
    ${lOut.length === 0
      ? '<div style="color:#555;font-size:.8rem;margin-bottom:16px">No shinobi currently on loan. Loan shinobi out to earn monthly fees.</div>'
      : lOut.map(lo => {
          const s = (G.shinobi || []).find(x => x.id === lo.shinobiId)
          return s ? `<div style="background:#1a1a1a;border:1px solid #333;border-radius:5px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px;font-size:.8rem">
            <div style="flex:1"><span style="color:#e8d5a3">${sn(s)}</span> <span style="color:#888">· ${RANKS[s.ri]}</span></div>
            <div style="color:#8fbc8f">+${fmt(lo.monthlyFee)}/mo</div>
            <div style="color:#c9a84c">${lo.monthsRemaining}mo left</div>
            <button onclick="recallLoan('${lo.shinobiId}')" style="background:#2e1a1a;border:1px solid #744;color:#f99;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:.72rem">${t("transfers.recallEarly")}</button>
          </div>` : ''
        }).join('')
    }
    <h3 style="color:#aaa;font-size:.82rem;text-transform:uppercase;letter-spacing:.08em;margin:12px 0 8px">Loans In (${lIn.length})</h3>
    ${lIn.length === 0
      ? '<div style="color:#555;font-size:.8rem;margin-bottom:16px">No loan players. Bring in loan shinobi from the market to fill gaps — they cannot enter Adept Exams.</div>'
      : lIn.map(li => {
          const s = (G.shinobi || []).find(x => x.id === li.shinobiId)
          return s ? `<div style="background:#1a1a1a;border:1px solid #333;border-radius:5px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px;font-size:.8rem">
            <div style="flex:1"><span style="color:#e8d5a3">${sn(s)}</span> <span style="color:#888">· ${RANKS[s.ri]}</span> <span style="font-size:.68rem;color:#cc7fb8">[LOAN]</span></div>
            <div style="color:#f0a030">−${fmt(li.monthlyCost)}/mo</div>
            <div style="color:#c9a84c">${li.monthsRemaining}mo left</div>
          </div>` : ''
        }).join('')
    }
    <!-- Send out loan form -->
    <div style="background:#111;border:1px solid #333;border-radius:6px;padding:12px;margin-top:10px">
      <div style="font-size:.8rem;color:#aaa;margin-bottom:8px">${t("transfers.sendOnLoanHdr")}</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="loan-out-shinobi" style="background:#1a1a1a;color:#e8d5a3;border:1px solid #555;border-radius:4px;padding:4px 8px;font-size:.78rem;flex:1">
          <option value="">Select shinobi…</option>
          ${(G.shinobi || []).filter(s => s.status === 'available' && !lOut.find(l => l.shinobiId === s.id)).map(s => `<option value="${s.id}">${sn(s)} (${RANKS[s.ri]}) — ${fmt(s.salary)}/mo</option>`).join('')}
        </select>
        <select id="loan-out-dur" style="background:#1a1a1a;color:#e8d5a3;border:1px solid #555;border-radius:4px;padding:4px 8px;font-size:.78rem">
          <option value="3">3 months</option>
          <option value="6">6 months</option>
        </select>
        <button onclick="sendLoan()" style="background:#1a2e1a;border:1px solid #4a7a4a;color:#8fbc8f;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:.78rem">${t("transfers.sendOnLoan")}</button>
      </div>
      <div style="font-size:.7rem;color:#555;margin-top:4px">Monthly fee earned: salary × 1.5. Commitment decays slightly while on loan.</div>
    </div>
  `
}

function renderBingo(judgeLevel) {
  const listed = (G.shinobi || []).filter(s => s.bingoBookPresence > 0)
  const suppCost = 8000
  const promCost = 3000
  return `
    <div style="font-size:.8rem;color:#aaa;margin-bottom:12px">Shinobi in the Bingo Book attract rival assassins — but also generate prestige. Suppress entries to reduce risk; promote to maximize legend gain.</div>
    ${listed.length === 0
      ? '<div style="color:#555;text-align:center;padding:30px">No shinobi listed yet. S-rank shinobi and those with 3+ S-rank wins are auto-listed.</div>'
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
          ${listed.map(s => {
            const tier = BINGO_TIERS[Math.min(s.bingoBookPresence, BINGO_TIERS.length - 1)]
            return `<div style="background:#1a1a1a;border:1px solid ${tier.color}44;border-top:2px solid ${tier.color};border-radius:6px;padding:12px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="color:${tier.color};font-size:1.3rem">${tier.icon}</span>
                <div>
                  <div style="color:#e8d5a3;font-weight:bold">${sn(s)}</div>
                  <div style="font-size:.72rem;color:${tier.color}">${tier.n}</div>
                </div>
              </div>
              <div style="font-size:.75rem;color:#888;margin-bottom:8px">
                Assassination risk: <span style="color:#f66">${Math.round(tier.assasRisk * 100)}%/mo</span>
                · Prestige: <span style="color:#c9a84c">+${tier.prestigeBonus}/mo</span>
              </div>
              ${s.bingoBookSuppressed ? '<div style="font-size:.72rem;color:#8fbc8f;margin-bottom:6px">✓ Suppressed — attacks paused</div>' : ''}
              <div style="display:flex;gap:5px;flex-wrap:wrap">
                ${!s.bingoBookSuppressed
                  ? `<button onclick="bingoSuppress('${s.id}')" style="background:#1a1a2e;border:1px solid #44a;color:#87ceeb;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:.72rem">🛡 Suppress (${fmt(suppCost)})</button>`
                  : ''}
                ${s.bingoBookPresence < 3
                  ? `<button onclick="bingoPromote('${s.id}')" style="background:#2e1a00;border:1px solid #a64;color:#f0a030;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:.72rem">⬆ Promote (${fmt(promCost)})</button>`
                  : ''}
              </div>
            </div>`
          }).join('')}
        </div>`
    }
  `
}

function renderOffers(tm) {
  const offers = tm.offers || []
  if (offers.length === 0) return `<div style="color:#555;text-align:center;padding:30px;font-size:.85rem">No offer history. Negotiate with village-listed shinobi to create offers.</div>`
  return `<div>
    ${offers.slice().reverse().map(o => {
      const statusColor = o.status === 'accepted' ? '#8fbc8f' : o.status === 'rejected' ? '#f66' : o.status === 'countered' ? '#f0a030' : '#aaa'
      return `<div style="background:#1a1a1a;border:1px solid #333;border-radius:5px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:10px;font-size:.8rem">
        <div style="flex:1">
          <span style="color:#e8d5a3">${o.name}</span>
          <span style="color:#888"> — offered <strong style="color:#c9a84c">${fmt(o.amount)} ryo</strong></span>
          ${o.counterAmount ? ` <span style="color:#f0a030">· counter: ${fmt(o.counterAmount)}</span>` : ''}
        </div>
        <span style="color:${statusColor};font-size:.75rem">${o.status.toUpperCase()}</span>
        ${o.status === 'countered'
          ? `<button onclick="acceptCounter('${o.id}')" style="background:#1a2e1a;border:1px solid #4a7a4a;color:#8fbc8f;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:.72rem">${t("transfers.acceptCounter")}</button>`
          : ''}
      </div>`
    }).join('')}
  </div>`
}

function renderHistory(tm) {
  const deals = tm.completedDeals || []
  if (deals.length === 0) return `<div style="color:#555;text-align:center;padding:30px;font-size:.85rem">${t("transfers.noCompleted")}</div>`
  return `<div>${deals.slice().reverse().map(d => {
    const dirColor = d.direction === 'in' ? '#8fbc8f' : '#f66'
    const dirLabel = d.direction === 'in' ? '▶ IN' : '◀ OUT'
    return `<div style="background:#1a1a1a;border:1px solid #333;border-radius:5px;padding:9px 12px;margin-bottom:5px;display:flex;align-items:center;gap:10px;font-size:.8rem">
      <div style="color:#555;font-size:.72rem;min-width:70px">Yr${d.year}·M${d.month}</div>
      <div style="flex:1;color:#e8d5a3">${d.name}</div>
      <div style="color:${dirColor};font-size:.72rem;font-weight:bold">${dirLabel}</div>
      ${d.fee ? `<div style="color:#c9a84c;font-size:.78rem">${fmt(d.fee)} ryo</div>` : ''}
    </div>`
  }).join('')}</div>`
}

// ── Actions exposed to window ─────────────────────────────────────────────────

export function trTab(id) { window._trTab = id; rTr() }

export function refreshTransferPool() {
  if (!G.transferMarket) return
  G.transferMarket.pool = genTransferPool()
  rTr()
  ntf(t('toast.transfers.poolRefreshed'))
}

export function openNegotiation(poolId) {
  const p = (G.transferMarket?.pool || []).find(x => x.id === poolId)
  if (!p) return
  _negTarget = p
  document.getElementById('neg-title').textContent = p.fn + ' ' + p.ln + ' — Negotiation'
  document.getElementById('neg-asking').textContent = fmt(p.askingFee)
  document.getElementById('neg-offer').value = Math.round(p.askingFee * 0.85)
  document.getElementById('neg-result').textContent = ''
  document.getElementById('ov-negotiate').classList.add('open')
}

export function submitOffer() {
  if (!_negTarget) return
  const p = _negTarget
  const amount = parseInt(document.getElementById('neg-offer').value, 10) || 0
  if (G.ryo < amount) { document.getElementById('neg-result').textContent = 'Not enough ryo.'; return }
  const village = (G.villages || []).find(v => v.n === p.originVillage)
  const relScore = village?.rel ?? 50

  // Agent agenda shifts the effective threshold; previous pursuit colors the mood
  let acceptThresh = 0.88, counterThresh = 0.60
  if (p.agent?.agenda === 'ryo') { acceptThresh -= 0.04 } // purely money-motivated, slightly easier to satisfy with a strong offer
  if (p.agent?.agenda === 'prestige' && ['A','S'].includes(G.prestigeTier)) { acceptThresh -= 0.06 }
  const wasPreviouslyPursued = (p.pursuedByVillages || []).includes(G.vName)
  if (wasPreviouslyPursued) {
    // Professional types respect persistence; volatile/ambitious types resent being approached again
    if ((p.pMatrix?.professionalism || 10) >= 13) acceptThresh -= 0.03
    else if ((p.pMatrix?.temperament || 10) < 8 || (p.pMatrix?.ambition || 10) >= 15) acceptThresh += 0.05
  }

  let status, counter = 0
  if (amount >= p.askingFee * acceptThresh && relScore >= 25) {
    status = 'accepted'
    _negFee = amount
  } else if (amount >= p.askingFee * counterThresh && relScore >= 15) {
    status = 'countered'
    counter = p.askingFee
    _negFee = counter
  } else {
    status = 'rejected'
  }

  G.transferMarket.offers = G.transferMarket.offers || []
  const offerId = Math.random().toString(36).slice(2)
  G.transferMarket.offers.push({ id: offerId, name: p.fn + ' ' + p.ln, amount, counterAmount: counter || null, status })

  const resultEl = document.getElementById('neg-result')
  if (status === 'accepted') {
    resultEl.textContent = '✓ Offer accepted! Proceed to personal terms.'
    resultEl.style.color = '#8fbc8f'
    document.getElementById('neg-confirm').style.display = ''
    _termTarget = p
  } else if (status === 'countered') {
    resultEl.textContent = `Counteroffer: ${fmt(counter)} ryo. Accept or walk away.`
    resultEl.style.color = '#f0a030'
    document.getElementById('neg-confirm').style.display = ''
    document.getElementById('neg-confirm').textContent = `Accept Counter (${fmt(counter)})`
    _termTarget = p
  } else {
    resultEl.textContent = `Rejected.${relScore < 25 ? ' Diplomatic standing too low.' : ' Offer too low.'}`
    resultEl.style.color = '#f66'
    document.getElementById('neg-confirm').style.display = 'none'
    // Failed pursuit fallout: small prestige hit, target remembers the approach
    G.reputation = clamp(G.reputation - 1, 0, 999)
    if (!p.pursuedByVillages) p.pursuedByVillages = []
    if (!p.pursuedByVillages.includes(G.vName)) p.pursuedByVillages.push(G.vName)
    rTr()
  }
}

export function negConfirm() {
  if (!_termTarget) return
  document.getElementById('ov-negotiate').classList.remove('open')
  openPersonalTerms(_termTarget.id)
}

export function openPersonalTerms(poolId) {
  const p = (G.transferMarket?.pool || []).find(x => x.id === poolId)
  if (!p) return
  _termTarget = p
  document.getElementById('pt-title').textContent = p.fn + ' ' + p.ln + ' — Personal Terms'
  document.getElementById('pt-fee').textContent = fmt(_negFee || p.askingFee) + ' ryo' + (p.agent ? ' (+ agent fee on any signing bonus)' : '')
  document.getElementById('pt-rank-info').textContent = 'Currently: ' + RANKS[p.ri]
  document.getElementById('ov-personalterms').classList.add('open')
}

export function confirmTransfer() {
  const p = _termTarget
  if (!p) return
  if (G.sponsorship?.restrictedVillage && p.originVillage === G.sponsorship.restrictedVillage) {
    ntf(t('toast.transfers.sponsorForbid', { village: G.sponsorship.restrictedVillage })); return
  }
  const fee = _negFee || p.askingFee
  if (G.ryo < fee) { ntf(t('toast.transfers.notEnoughFee')); return }
  const roleGuar = document.getElementById('pt-role-guar')?.checked || false
  const rankTL = parseInt(document.getElementById('pt-rank-tl')?.value || '0', 10)
  const sigBonus = parseInt(document.getElementById('pt-sig-bonus')?.value || '0', 10)
  const agentFee = p.agent ? Math.round(sigBonus * (p.agent.feePercent / 100)) : 0
  const totalCost = fee + sigBonus + agentFee
  if (G.ryo < totalCost) { ntf(t('toast.transfers.notEnoughTotal')); return }

  G.ryo -= totalCost
  if (agentFee > 0) aL(t('toast.transfers.agentFee', { agent: p.agent.name, fee: fmt(agentFee) }), 'neutral')
  const catDef = TRANSFER_CATS.find(c => c.id === p.transferCategory)
  p.commitment = clamp(50 + (catDef?.loyaltyBonus || 0) * 4 + (roleGuar ? 10 : 0) + Math.floor(sigBonus / 500), 0, 100)
  p.roleGuarantee = roleGuar
  G.promises = G.promises || []
  if (roleGuar) {
    // Reviewed after a year: kept if they actually saw regular deployment.
    createPromise(G.promises, {
      shinobiId: p.id, name: p.fn + ' ' + p.ln, type: 'deployment',
      detail: 'Signing-day guarantee of regular mission deployment',
      madeYear: G.year, madeMonth: G.month,
      dueYear: G.year + 1, dueMonth: G.month,
    })
  }
  if (rankTL > 0) {
    p.promotionDeadline = G.month + rankTL
    p.promotionDeadlineYear = G.year + Math.floor((G.month + rankTL - 1) / 12)
    p.promotionDeadline = ((G.month + rankTL - 1) % 12) + 1
    createPromise(G.promises, {
      shinobiId: p.id, name: p.fn + ' ' + p.ln, type: 'promotion',
      detail: `Promotion to ${RANKS[Math.min(p.ri + 1, RANKS.length - 1)]} within ${rankTL} months`, riAt: p.ri,
      madeYear: G.year, madeMonth: G.month,
      dueYear: p.promotionDeadlineYear, dueMonth: p.promotionDeadline,
    })
  }
  p.status = 'available'
  p.months = 0
  // Poaching a minor nation's talent cools relations with them.
  if (p.minorNation) {
    G.minorRelations = G.minorRelations || {}
    adjustMinorRel(G.minorRelations, p.minorNation, -8)
  }
  // Missing-nin diplomatic risk
  if (p.transferCategory === 'missing_nin') {
    const v = pk(G.villages || [])
    if (v) { v.rel = clamp(v.rel - 10, 0, 100); aL(t('toast.transfers.missingNinAngered', { village: v.n }), 'warn') }
  }
  // Loan-in option
  const loanDur = parseInt(document.getElementById('pt-loan-dur')?.value || '0', 10)
  if (loanDur > 0) {
    G.transferMarket.loanIn = G.transferMarket.loanIn || []
    G.transferMarket.loanIn.push({ shinobiId: p.id, shinobiName: p.fn + ' ' + p.ln, monthsRemaining: loanDur, monthlyCost: Math.round(p.salary * 1.2) })
    p.loanIn = true
  }
  // Contract depth fields — set at signing
  p.noTrade = false
  p.twoWay  = false
  p.buyoutCost = Math.round((p.salary || 500) * 4)
  // R12: doing business lifts standing with the player's agent (carries forward).
  if (p.agentId) {
    const ag = (G.agents || []).find(a => a.id === p.agentId)
    if (ag) {
      ag.standing = adjustStanding(ag.standing, sigBonus >= p.askingFee * 0.15 ? 'exceeded_offer' : 'signed_client')
      ag.deals = (ag.deals || 0) + 1
    }
  }
  G.shinobi.push(p)
  G.transferMarket.pool = (G.transferMarket.pool || []).filter(x => x.id !== p.id)
  G.transferMarket.completedDeals = G.transferMarket.completedDeals || []
  G.transferMarket.completedDeals.push({ name: p.fn + ' ' + p.ln, direction: 'in', fee, year: G.year, month: G.month })
  aL(t('toast.transfers.signed', { name: `${p.fn} ${p.ln}`, fee: fmt(fee), bonus: sigBonus ? t('toast.transfers.signingBonus', { bonus: fmt(sigBonus) }) : '' }), 'good')
  ntf(t('toast.transfers.signedShort', { name: `${p.fn} ${p.ln}` }))
  document.getElementById('ov-personalterms').classList.remove('open')
  _negTarget = null; _negFee = 0; _termTarget = null
  rTr(); upUI()
}

export function poachAttempt(poolId) {
  const p = (G.transferMarket?.pool || []).find(x => x.id === poolId)
  if (!p) return
  if (G.sponsorship?.restrictedVillage && p.originVillage === G.sponsorship.restrictedVillage) {
    ntf(t('toast.transfers.sponsorForbid', { village: G.sponsorship.restrictedVillage })); return
  }
  const poachFee = Math.round(p.askingFee * 0.70)
  if (G.ryo < poachFee) { ntf(t('toast.transfers.notEnoughPoach', { need: fmt(poachFee) })); return }
  const loyLow = (p.pMatrix?.loyalty || 10) < 10
  const success = Math.random() < (loyLow ? 0.68 : 0.40)
  if (success) {
    G.ryo -= poachFee
    p.status = 'available'; p.commitment = 45; p.months = 0
    G.shinobi.push(p)
    G.transferMarket.pool = (G.transferMarket.pool || []).filter(x => x.id !== p.id)
    G.transferMarket.completedDeals = G.transferMarket.completedDeals || []
    G.transferMarket.completedDeals.push({ name: p.fn + ' ' + p.ln, direction: 'in', fee: poachFee, year: G.year, month: G.month })
    aL(t('toast.transfers.poachSigned', { name: `${p.fn} ${p.ln}`, fee: fmt(poachFee) }), 'good')
    ntf(t('toast.transfers.poachSignedShort', { name: p.fn }))
    rTr(); upUI()
  } else {
    // Diplomatic incident
    if (p.originVillage) {
      const v = (G.villages || []).find(x => x.n === p.originVillage)
      if (v) {
        v.rel = clamp(v.rel - 15, 0, 100)
        v.grudgeTicks = (v.grudgeTicks || 0) + 4
        aL(t('toast.transfers.poachFailIncident', { name: `${p.fn} ${p.ln}`, village: v.n }), 'bad')
      }
    } else {
      aL(t('toast.transfers.poachFail', { name: `${p.fn} ${p.ln}` }), 'bad')
    }
    // Failed pursuit fallout: small prestige hit, target remembers the approach
    G.reputation = clamp(G.reputation - 1, 0, 999)
    if (!p.pursuedByVillages) p.pursuedByVillages = []
    if (!p.pursuedByVillages.includes(G.vName)) p.pursuedByVillages.push(G.vName)
    ntf(t('toast.transfers.poachFailShort'))
    rTr()
  }
}

export function sellPressureBlock(shinobiId) {
  const sp = (G.sellPressure || []).find(x => x.shinobiId === shinobiId)
  if (!sp) return
  const v = (G.villages || []).find(x => x.n === sp.villageName)
  if (v) v.rel = clamp(v.rel - 5, 0, 100)
  G.sellPressure = (G.sellPressure || []).filter(x => x.shinobiId !== shinobiId)
  const s = G.shinobi.find(x => x.id === shinobiId)
  aL(t('toast.transfers.blockedApproach', { village: sp.villageName, name: s ? sn(s) : 'shinobi' }), 'neutral')
  rTr(); upUI()
}

export function sellPressureAccept(shinobiId) {
  const sp = (G.sellPressure || []).find(x => x.shinobiId === shinobiId)
  if (!sp) return
  const s = G.shinobi.find(x => x.id === shinobiId)
  G.ryo += sp.offerRyo
  const v = (G.villages || []).find(x => x.n === sp.villageName)
  if (v) v.rel = clamp(v.rel + 5, 0, 100)
  G.sellPressure = (G.sellPressure || []).filter(x => x.shinobiId !== shinobiId)
  G.transferMarket = G.transferMarket || {}
  G.transferMarket.completedDeals = G.transferMarket.completedDeals || []
  G.transferMarket.completedDeals.push({ name: s ? sn(s) : 'Unknown', direction: 'out', fee: sp.offerRyo, year: G.year, month: G.month })
  aL(t('toast.transfers.sold', { name: s ? sn(s) : 'Shinobi', village: sp.villageName, fee: fmt(sp.offerRyo) }), 'neutral')
  if (s) {
    // Sell-on clause: a cut of this sale is owed to whoever sold them to us originally
    if (s.sellOnClause) {
      const cut = Math.round(sp.offerRyo * (s.sellOnClause.percent / 100))
      G.ryo -= cut
      aL(t('toast.transfers.sellOn', { cut, pct: s.sellOnClause.percent, village: s.sellOnClause.village }), 'warn')
    }
    G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, year: G.year, month: G.month, wins: s.wins, lastWords: 'Transferred to ' + sp.villageName + '.', transfer: true })
    G.shinobi = G.shinobi.filter(x => x.id !== shinobiId)
  }
  rTr(); upUI()
}

export function sellPressureLetDecide(shinobiId) {
  const sp = (G.sellPressure || []).find(x => x.shinobiId === shinobiId)
  if (!sp) return
  const s = G.shinobi.find(x => x.id === shinobiId)
  G.sellPressure = (G.sellPressure || []).filter(x => x.shinobiId !== shinobiId)
  if (!s) { rTr(); return }
  const loyaltyCheck = (s.pMatrix?.loyalty || 10) + (s.commitment || 70) / 5
  const stays = Math.random() < loyaltyCheck / 25
  if (stays) {
    s.commitment = clamp((s.commitment || 70) + 5, 0, 100)
    aL(sn(s) + ' turned down ' + sp.villageName + '\'s offer and committed to staying.', 'good')
  } else {
    G.ryo += sp.offerRyo * 0.1  // small compensation
    G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, year: G.year, month: G.month, wins: s.wins, lastWords: 'Chose to transfer to ' + sp.villageName + '.', transfer: true })
    G.shinobi = G.shinobi.filter(x => x.id !== shinobiId)
    G.transferMarket = G.transferMarket || {}
    G.transferMarket.completedDeals = G.transferMarket.completedDeals || []
    G.transferMarket.completedDeals.push({ name: sn(s), direction: 'out', fee: 0, year: G.year, month: G.month })
    aL(sn(s) + ' chose to transfer to ' + sp.villageName + '!', 'bad')
  }
  rTr(); upUI()
}

export function sendLoan() {
  const shinobiId = document.getElementById('loan-out-shinobi')?.value
  const duration = parseInt(document.getElementById('loan-out-dur')?.value || '3', 10)
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!s) { ntf(t('toast.transfers.selectLoan')); return }
  const monthlyFee = Math.round(s.salary * 1.5)
  s.status = 'mission'  // unavailable while on loan
  G.transferMarket.loanOut = G.transferMarket.loanOut || []
  G.transferMarket.loanOut.push({ shinobiId: s.id, monthsRemaining: duration, monthlyFee })
  aL(t('toast.transfers.loanSent', { name: sn(s), dur: duration, fee: fmt(monthlyFee) }), 'good')
  ntf(t('toast.transfers.loanShort', { name: sn(s), dur: duration }))
  rTr(); upUI()
}

export function recallLoan(shinobiId) {
  const lo = (G.transferMarket?.loanOut || []).find(x => x.shinobiId === shinobiId)
  if (!lo) return
  G.transferMarket.loanOut = (G.transferMarket.loanOut || []).filter(x => x.shinobiId !== shinobiId)
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (s) { s.status = 'available'; s.commitment = clamp((s.commitment || 70) - 8, 0, 100) }
  aL(t('toast.transfers.loanRecalled', { name: s ? sn(s) : 'Shinobi' }), 'warn')
  rTr(); upUI()
}

export function bingoSuppress(shinobiId) {
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!s) return
  const cost = 8000
  if (G.ryo < cost) { ntf(t('toast.common.notEnoughRyoNeed', { need: fmt(cost) })); return }
  G.ryo -= cost
  s.bingoBookSuppressed = true
  aL(t('toast.transfers.bingoSuppressed', { name: sn(s) }), 'neutral')
  rTr(); upUI()
}

export function bingoPromote(shinobiId) {
  const s = G.shinobi.find(x => x.id === shinobiId)
  if (!s || s.bingoBookPresence >= 3) return
  const cost = 3000
  if (G.ryo < cost) { ntf(t('toast.common.notEnoughRyoNeed', { need: fmt(cost) })); return }
  G.ryo -= cost
  s.bingoBookPresence = Math.min(3, (s.bingoBookPresence || 1) + 1)
  const tier = BINGO_TIERS[s.bingoBookPresence]
  aL(t('toast.transfers.bingoPromoted', { name: sn(s), tier: tier.n }), 'warn')
  rTr(); upUI()
}

export function acceptCounter(offerId) {
  const offer = (G.transferMarket?.offers || []).find(o => o.id === offerId)
  if (!offer || offer.status !== 'countered') return
  if (!offer.counterAmount) return
  _negFee = offer.counterAmount
  const poolEntry = (G.transferMarket?.pool || []).find(p => p.fn + ' ' + p.ln === offer.name)
  if (poolEntry) {
    offer.status = 'accepted'
    _termTarget = poolEntry
    openPersonalTerms(poolEntry.id)
  }
  rTr()
}
