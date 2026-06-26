import { G, sn, fmt, clamp } from '../state.js'
import { aL, ntf, upUI } from '../ui.js'
import { CLANS, CLAN_BY_ID, CLAN_CHAINS, getClanPassives, availableClanChains, clanCouncilInfluence } from '../../../shared/constants/clans.js'
import { t } from '../../../shared/utils/i18n.js'

// Human-readable name for each passive effect key.
const _PASSIVE_LABEL = {
  successMod:           v => `+${Math.round(v*100)}% mission success`,
  growthBonus:          v => `+${Math.round(v*100)}% shinobi growth`,
  missionRiskReduction: v => `−${Math.round(v*100)}% mission risk`,
  kiaRiskMod:           v => `${v < 0 ? '−' : '+'}${Math.abs(v*100).toFixed(0)}% KIA risk`,
  anbuSuccessBonus:     v => `+${Math.round(v*100)}% ANBU success`,
  scoutConfidenceBonus: v => `+${Math.round(v*100)}% scout confidence`,
}
function _passiveStr(passive) {
  return Object.entries(passive || {}).map(([k, v]) => (_PASSIVE_LABEL[k] ? _PASSIVE_LABEL[k](v) : k)).join(' · ')
}

// ── Clan Council: quarterly arbitration between rival houses ──────────────────
function _quarterKey() { return `Y${G.year}Q${Math.ceil(G.month / 3)}` }

function _activeClanCouncilEvent() {
  G.clanCouncil = G.clanCouncil || { resolvedQuarter: null }
  if (G.clanCouncil.resolvedQuarter === _quarterKey()) return null

  // Need at least two clans with active members to have a dispute.
  const active = CLANS.map(c => ({
    clan: c,
    count: (G.shinobi || []).filter(s => s.clan?.toLowerCase() === c.id && s.status !== 'retired').length,
    approval: (G.clanApproval || {})[c.id] ?? 80,
  })).filter(x => x.count > 0)
  if (active.length < 2) return null

  const byApproval = [...active].sort((a, b) => b.approval - a.approval)
  return { high: byApproval[0], low: byApproval[byApproval.length - 1] }
}

export function rClans() {
  const el = document.getElementById('clan-main')
  if (!el) return

  const clP = getClanPassives(G)
  const influence = clanCouncilInfluence(G)
  const activeClanIds = new Set((G.shinobi || []).filter(s => s.status !== 'retired').map(s => s.clan).filter(Boolean))

  // ── Clan Council arbitration banner ──────────────────────────────────────
  const council = _activeClanCouncilEvent()
  const councilHtml = council ? `
    <div style="background:#0d0a04;border:1px solid #5a4800;border-left:3px solid #c9a84c;padding:11px 13px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:6px">⚖ Clan Council — ${_quarterKey()}</div>
      <div style="font-size:9px;color:#e8e0cc;margin-bottom:8px">
        ${council.high.clan.icon} <b>${council.high.clan.name}</b> (approval ${council.high.approval}%) and
        ${council.low.clan.icon} <b>${council.low.clan.name}</b> (approval ${council.low.approval}%) clash over council representation. Your ruling will be remembered.
      </div>
      <div style="display:grid;gap:5px">
        <button class="gb" style="text-align:left;font-size:8px;padding:5px 9px" onclick="resolveClanCouncil('high')">Back the ${council.high.clan.name} — reward your power base (+8 their approval, −5 ${council.low.clan.name})</button>
        <button class="gb" style="text-align:left;font-size:8px;padding:5px 9px" onclick="resolveClanCouncil('low')">Elevate the ${council.low.clan.name} — balance the houses (+8 their approval, −5 ${council.high.clan.name}, −2 morale)</button>
        <button class="gb" style="text-align:left;font-size:8px;padding:5px 9px" onclick="resolveClanCouncil('neutral')">Rule impartially — seen as fair (−3 both, +3 morale)</button>
      </div>
    </div>` : ''

  el.innerHTML = councilHtml + `
    <div style="background:#0a0a0a;border:1px solid #222;padding:10px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:6px">${t("clans.activePassives")}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:8px">
        ${clP.successMod     ? `<span style="color:#8fbc8f">+${(clP.successMod*100).toFixed(0)}% mission success</span>` : ''}
        ${clP.growthBonus    ? `<span style="color:#8fbc8f">+${(clP.growthBonus*100).toFixed(0)}% growth</span>` : ''}
        ${clP.missionRiskReduction ? `<span style="color:#8fbc8f">−${(clP.missionRiskReduction*100).toFixed(0)}% mission risk</span>` : ''}
        ${clP.kiaRiskMod     ? `<span style="color:#8fbc8f">${(clP.kiaRiskMod*100).toFixed(1)}% KIA risk</span>` : ''}
        ${clP.anbuSuccessBonus ? `<span style="color:#8fbc8f">+${(clP.anbuSuccessBonus*100).toFixed(0)}% ANBU</span>` : ''}
        ${clP.scoutConfidenceBonus ? `<span style="color:#8fbc8f">+${(clP.scoutConfidenceBonus*100).toFixed(0)}% scouting</span>` : ''}
        ${!activeClanIds.size ? `<span style="color:#3a3630">${t("clans.noMembers")}</span>` : ''}
      </div>
    </div>
    <div style="display:grid;gap:10px">
    ${CLANS.map(clan => {
      const members = (G.shinobi || []).filter(s => s.clan?.toLowerCase() === clan.id)
      const active = members.filter(s => s.status === 'available')
      const approval = (G.clanApproval || {})[clan.id] ?? 80
      const passiveActive = approval >= clan.approvalNeeded && active.length > 0
      const chains = availableClanChains(clan.id, G)
      const infPct = ((influence[clan.id] || 0) * 100).toFixed(1)
      const appColor = approval >= 70 ? '#8fbc8f' : approval >= 40 ? '#c9a84c' : '#f66'
      return `
        <div style="background:#0d0d0d;border:1px solid ${passiveActive?'#2a3a2a':'#222'};padding:10px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
              <span style="font-size:12px">${clan.icon}</span>
              <span style="font-size:10px;color:#e8e0cc;font-weight:bold;margin-left:6px">${clan.name}</span>
              <span style="font-size:7px;color:#7a7060;margin-left:6px">${clan.bloodline}</span>
            </div>
            <div style="text-align:right;font-size:7px">
              <div style="color:${appColor}">Approval: ${approval}%</div>
              <div style="color:#7a7060">Council: ${infPct}%</div>
            </div>
          </div>
          <div style="font-size:7px;color:#7a5030;margin-bottom:6px">${clan.desc}</div>
          <div style="background:#0a0a0a;border-left:2px solid ${passiveActive?'#8fbc8f':'#333'};padding:4px 7px;margin-bottom:6px">
            <div style="font-size:7px;color:${passiveActive?'#8fbc8f':'#7a7060'};font-weight:bold">${clan.bloodline} Bloodline ${passiveActive ? '— Active' : '— Dormant'}</div>
            <div style="font-size:7px;color:${passiveActive?'#a8c0a8':'#555'};margin-top:1px">${_passiveStr(clan.passive)}</div>
          </div>
          <div style="font-size:7px;color:${passiveActive?'#8fbc8f':'#555'};margin-bottom:6px">
            ${passiveActive ? '✓ Bloodline active' : members.length ? `⚠ Need ${clan.approvalNeeded}% approval or active member` : 'No members recruited'}
          </div>
          ${members.length ? `
            <div style="font-size:7px;color:#7a7060;margin-bottom:6px">
              Members: ${members.map(s => `<span style="color:${s.status==='available'?'#e8e0cc':'#555'}">${sn(s)}</span>`).join(', ')}
            </div>` : ''}
          ${chains.length ? `
            <div style="margin-top:8px">
              <div style="font-size:7px;letter-spacing:1px;color:#5a5040;text-transform:uppercase;margin-bottom:4px">${t("clans.chains")}</div>
              ${chains.map(({ chainId, chain, eligible, canRun }) => `
                <div style="background:#0a0a0a;border:1px solid #2a2000;padding:6px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <span style="font-size:8px;color:#e8e0cc">${chain.n}</span>
                    <span style="font-size:7px;color:#7a5030;margin-left:6px">[${chain.rk}-Rank]</span>
                    <div style="font-size:7px;color:#7a7060;margin-top:2px">${chain.desc}</div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-size:8px;color:#8fbc8f">+${chain.ryo.toLocaleString()} ryo</div>
                    ${canRun
                      ? `<button onclick="launchClanChain('${clan.id}','${chainId}')" style="font-size:7px;padding:2px 6px;background:#2a2000;color:#c9a84c;border:1px solid #4a3000;cursor:pointer;margin-top:3px">${t("clans.launch")}</button>`
                      : `<div style="font-size:7px;color:#555">Need ${chain.reqClanSize} member(s)</div>`}
                  </div>
                </div>`).join('')}
            </div>` : ''}
          ${approval < clan.approvalNeeded ? `
            <div style="margin-top:6px">
              <button onclick="clanGift('${clan.id}')" style="font-size:7px;padding:3px 8px;background:#111;color:#c9a84c;border:1px solid #3a2800;cursor:pointer">
                Gift (500 ryo) +5 Approval
              </button>
            </div>` : ''}
        </div>`
    }).join('')}
    </div>`
}

export function resolveClanCouncil(ruling) {
  const council = _activeClanCouncilEvent()
  if (!council) { ntf(t('toast.clans.noCouncil')); return }
  G.clanApproval = G.clanApproval || {}
  const hi = council.high.clan.id, lo = council.low.clan.id
  const setA = (id, d) => { G.clanApproval[id] = clamp((G.clanApproval[id] ?? 80) + d, 0, 100) }
  if (ruling === 'high') {
    setA(hi, 8); setA(lo, -5)
    aL(t('toast.clans.ruleBacked', { name: council.high.clan.name }), 'neutral')
  } else if (ruling === 'low') {
    setA(lo, 8); setA(hi, -5)
    G.morale = clamp((G.morale || 75) - 2, 0, 100)
    aL(t('toast.clans.ruleElevated', { low: council.low.clan.name, high: council.high.clan.name }), 'warn')
  } else {
    setA(hi, -3); setA(lo, -3)
    G.morale = clamp((G.morale || 75) + 3, 0, 100)
    aL(t('toast.clans.ruleImpartial'), 'good')
  }
  G.clanCouncil.resolvedQuarter = _quarterKey()
  ntf(t('toast.clans.councilResolved'))
  upUI()
}

export function clanGift(clanId) {
  if ((G.ryo || 0) < 500) { ntf(t('toast.clans.needGift')); return }
  const clan = CLAN_BY_ID[clanId]
  if (!clan) return
  G.ryo -= 500
  if (!G.clanApproval) G.clanApproval = {}
  G.clanApproval[clanId] = clamp((G.clanApproval[clanId] ?? 80) + 5, 0, 100)
  aL(t('toast.clans.gifted', { icon: clan.icon, name: clan.name, pct: G.clanApproval[clanId] }), 'good')
  rClans()
}

export function launchClanChain(clanId, chainId) {
  const chain = CLAN_CHAINS[chainId]
  const clan = CLAN_BY_ID[clanId]
  if (!chain || !clan) return
  const members = (G.shinobi || []).filter(s => s.clan?.toLowerCase() === clanId && s.status === 'available' && (s.ri || 0) >= (chain.reqRi || 0))
  if (members.length < (chain.reqClanSize || 1)) { ntf(t('toast.clans.needMembers', { n: chain.reqClanSize, name: clan.name })); return }

  // Send clan-size members on the chain (use highest-rank first)
  const squad = [...members].sort((a, b) => (b.ri || 0) - (a.ri || 0)).slice(0, chain.reqClanSize || 1)
  for (const s of squad) { s.status = 'mission'; s.missId = chainId }
  if (!G.aM) G.aM = []
  G.aM.push({ id: 'cc_' + Date.now(), missionId: chainId, assignedTo: squad.map(s => s.id), isClanChain: true, clanId, chainId, daysLeft: 1 })
  aL(t('toast.clans.chainLaunched', { icon: clan.icon, members: squad.map(s => sn(s)).join(' & '), chain: chain.n }), 'warn')
  upUI()
}
