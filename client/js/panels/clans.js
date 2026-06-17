import { G, sn, fmt, clamp } from '../state.js'
import { aL, ntf, upUI } from '../ui.js'
import { CLANS, CLAN_BY_ID, CLAN_CHAINS, getClanPassives, availableClanChains, clanCouncilInfluence } from '../../../shared/constants/clans.js'

export function rClans() {
  const el = document.getElementById('clan-main')
  if (!el) return

  const clP = getClanPassives(G)
  const influence = clanCouncilInfluence(G)
  const activeClanIds = new Set((G.shinobi || []).filter(s => s.status !== 'retired').map(s => s.clan).filter(Boolean))

  el.innerHTML = `
    <div style="background:#0a0a0a;border:1px solid #222;padding:10px;margin-bottom:12px">
      <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:6px">Active Bloodline Passives</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:8px">
        ${clP.successMod     ? `<span style="color:#8fbc8f">+${(clP.successMod*100).toFixed(0)}% mission success</span>` : ''}
        ${clP.growthBonus    ? `<span style="color:#8fbc8f">+${(clP.growthBonus*100).toFixed(0)}% growth</span>` : ''}
        ${clP.missionRiskReduction ? `<span style="color:#8fbc8f">−${(clP.missionRiskReduction*100).toFixed(0)}% mission risk</span>` : ''}
        ${clP.kiaRiskMod     ? `<span style="color:#8fbc8f">${(clP.kiaRiskMod*100).toFixed(1)}% KIA risk</span>` : ''}
        ${clP.anbuSuccessBonus ? `<span style="color:#8fbc8f">+${(clP.anbuSuccessBonus*100).toFixed(0)}% ANBU</span>` : ''}
        ${clP.scoutConfidenceBonus ? `<span style="color:#8fbc8f">+${(clP.scoutConfidenceBonus*100).toFixed(0)}% scouting</span>` : ''}
        ${!activeClanIds.size ? '<span style="color:#3a3630">No clan members active</span>' : ''}
      </div>
    </div>
    <div style="display:grid;gap:10px">
    ${CLANS.map(clan => {
      const members = (G.shinobi || []).filter(s => s.clan === clan.id)
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
          <div style="font-size:7px;color:${passiveActive?'#8fbc8f':'#555'};margin-bottom:6px">
            ${passiveActive ? '✓ Bloodline active' : members.length ? `⚠ Need ${clan.approvalNeeded}% approval or active member` : 'No members recruited'}
          </div>
          ${members.length ? `
            <div style="font-size:7px;color:#7a7060;margin-bottom:6px">
              Members: ${members.map(s => `<span style="color:${s.status==='available'?'#e8e0cc':'#555'}">${sn(s)}</span>`).join(', ')}
            </div>` : ''}
          ${chains.length ? `
            <div style="margin-top:8px">
              <div style="font-size:7px;letter-spacing:1px;color:#5a5040;text-transform:uppercase;margin-bottom:4px">Clan Chains</div>
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
                      ? `<button onclick="launchClanChain('${clan.id}','${chainId}')" style="font-size:7px;padding:2px 6px;background:#2a2000;color:#c9a84c;border:1px solid #4a3000;cursor:pointer;margin-top:3px">Launch</button>`
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

export function clanGift(clanId) {
  if ((G.ryo || 0) < 500) { ntf('Need 500 ryo to gift the clan.'); return }
  const clan = CLAN_BY_ID[clanId]
  if (!clan) return
  G.ryo -= 500
  if (!G.clanApproval) G.clanApproval = {}
  G.clanApproval[clanId] = clamp((G.clanApproval[clanId] ?? 80) + 5, 0, 100)
  aL(`${clan.icon} ${clan.name} gifted — approval now ${G.clanApproval[clanId]}%.`, 'good')
  rClans()
}

export function launchClanChain(clanId, chainId) {
  const chain = CLAN_CHAINS[chainId]
  const clan = CLAN_BY_ID[clanId]
  if (!chain || !clan) return
  const members = (G.shinobi || []).filter(s => s.clan === clanId && s.status === 'available' && (s.ri || 0) >= (chain.reqRi || 0))
  if (members.length < (chain.reqClanSize || 1)) { ntf(`Need ${chain.reqClanSize} eligible ${clan.name} members.`); return }

  // Send clan-size members on the chain (use highest-rank first)
  const squad = [...members].sort((a, b) => (b.ri || 0) - (a.ri || 0)).slice(0, chain.reqClanSize || 1)
  for (const s of squad) { s.status = 'mission'; s.missId = chainId }
  if (!G.aM) G.aM = []
  G.aM.push({ id: 'cc_' + Date.now(), missionId: chainId, assignedTo: squad.map(s => s.id), isClanChain: true, clanId, chainId, daysLeft: 1 })
  aL(`${clan.icon} ${squad.map(s => sn(s)).join(' & ')} launched "${chain.n}".`, 'warn')
  upUI()
}
