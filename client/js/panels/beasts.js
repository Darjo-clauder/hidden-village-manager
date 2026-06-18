import { G, sn, fmt } from '../state.js'
import { aL, ntf, upUI, cm } from '../ui.js'
import { BEAST_DATA, SYNC_STAGES, getSyncStage, getBeastPassives } from '../beastEngine.js'

let _activeTab = 'overview'
let _activeLoreId = null

export function beastTab(tab) { _activeTab = tab; rBe() }

export function rBe() {
  const el = document.getElementById('p-beasts')
  if (!el) return

  const passives = getBeastPassives(G)
  const sealedBeasts = G.beasts.filter(b => b.sealed)
  const wildBeasts = G.beasts.filter(b => !b.sealed)
  const escapeNotices = (G.notices || []).filter(n => n.type === 'beast_escape')

  el.innerHTML = `
    <div class="pt">Tailed Beasts</div>

    ${escapeNotices.length > 0 ? `
      <div style="background:#3a0a0a;border:1px solid var(--red);padding:12px 14px;margin-bottom:14px">
        <div style="font-size:9px;color:var(--red);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">⚠ Beast Escape Alert</div>
        ${escapeNotices.map(n => `
          <div style="margin-bottom:8px;padding:8px 10px;background:rgba(255,0,0,0.05);border-left:2px solid var(--red)">
            <div style="font-size:9px;color:var(--text-hi);margin-bottom:6px">${n.beastName} has escaped containment!</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="gb" style="border-color:var(--red);color:var(--red);font-size:8px" onclick="resolveEscape('${n.beastName}','containment')">Containment Team (3,000 ryo)</button>
              <button class="gb" style="font-size:8px" onclick="resolveEscape('${n.beastName}','dismiss')">Dismiss</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
      ${['overview','lore','passives'].map(t => `
        <button class="tab${_activeTab === t ? ' active' : ''}" onclick="beastTab('${t}')">${t.charAt(0).toUpperCase()+t.slice(1)}</button>
      `).join('')}
    </div>

    ${_activeTab === 'overview' ? _renderOverview(sealedBeasts, wildBeasts, passives) : ''}
    ${_activeTab === 'lore'     ? _renderLore(sealedBeasts) : ''}
    ${_activeTab === 'passives' ? _renderPassives(passives)  : ''}
  `
}

// ── Overview tab ────────────────────────────────────────────────────────────

function _renderOverview(sealedBeasts, wildBeasts, passives) {
  const dualWarning = sealedBeasts.filter(b => b.jk).length >= 2

  return `
    ${dualWarning ? `
      <div style="background:#3a1010;border:1px solid var(--red);padding:10px 14px;margin-bottom:12px;font-size:9px;color:var(--red)">
        ⚠ Dual jinchuriki active — extraction attempts doubled, server-wide threat level increased.
      </div>
    ` : ''}

    ${sealedBeasts.length === 0 ? `
      <div style="text-align:center;padding:30px;color:var(--text-dim);font-size:10px">No sealed beasts. Launch a capture mission to begin.</div>
    ` : sealedBeasts.map(b => _renderSealedCard(b)).join('')}

    ${wildBeasts.length > 0 ? `
      <div style="margin-top:20px">
        <div style="font-size:7px;letter-spacing:2px;color:var(--text-dim);text-transform:uppercase;margin-bottom:10px">Wild Beasts</div>
        ${wildBeasts.map(b => _renderWildCard(b)).join('')}
      </div>
    ` : ''}
  `
}

function _renderSealedCard(b) {
  const data = BEAST_DATA[b.n] || {}
  const stage = getSyncStage(b)
  const stageInfo = SYNC_STAGES[stage] || SYNC_STAGES[1]
  const jkS = G.shinobi.find(s => s.id === b.jk)
  const syncM = b.syncMonths || 0
  const nextStageM = [3, 6, 12, 18, 999][Math.min(stage, 4)]
  const progressPct = stage >= 5 ? 100
    : Math.round(Math.min(100, ((syncM - [0,3,6,12,18][Math.min(stage-1,4)]) / Math.max(1, nextStageM - [0,3,6,12,18][Math.min(stage-1,4)])) * 100))
  const loreCount = (b.loreUnlocked || []).length
  const loreTot = (data.lore || []).length
  const escapes = (b.escapeHistory || []).length

  return `
    <div style="background:var(--surface);border:1px solid var(--border);padding:16px;margin-bottom:14px">
      <!-- Header -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:14px;color:var(--text-hi);font-weight:bold">${b.n}</div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:2px">
            ${'◆'.repeat(b.tails)} ${b.tails}-Tails · ${b.element || data.element || ''}
          </div>
          <div style="font-size:8px;color:var(--text-dim);margin-top:2px;font-style:italic">${data.personality || ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:8px;padding:3px 9px;border:1px solid ${stageInfo.color};color:${stageInfo.color}">${stageInfo.n}</div>
          <div style="font-size:8px;color:var(--text-dim);margin-top:4px">Month ${syncM}</div>
          ${b.loreBonusActive ? `<div style="font-size:7px;color:var(--gold);margin-top:3px">✦ Lore Mastered</div>` : ''}
        </div>
      </div>

      <!-- Sync Progress Bar -->
      ${stage < 5 ? `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--text-dim);margin-bottom:4px">
            <span>Sync Progress</span>
            <span>${syncM}m / ${nextStageM}m → ${SYNC_STAGES[Math.min(stage+1,5)].n}</span>
          </div>
          <div style="height:6px;background:var(--surface-3);border-radius:2px;overflow:hidden">
            <div style="height:100%;width:${progressPct}%;background:${stageInfo.color};transition:width .3s"></div>
          </div>
          ${data.syncCeiling && data.syncCeiling < 5 ? `<div style="font-size:7px;color:var(--text-dim);margin-top:3px">Sync ceiling: Stage ${data.syncCeiling} (${SYNC_STAGES[data.syncCeiling].n})</div>` : ''}
        </div>
      ` : `<div style="margin-bottom:12px;font-size:9px;color:var(--blue)">✦ Full Sync — Maximum bond achieved.</div>`}

      <!-- Unique Ability -->
      ${data.uniqueAbility ? `
        <div style="background:var(--surface-2);border:1px solid var(--border);padding:8px 12px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
          <div style="flex:1">
            <div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);margin-bottom:3px">Unique Ability</div>
            <div style="font-size:9px;color:${stage >= data.uniqueAbility.stage ? 'var(--green)' : 'var(--text-dim)'}">
              ${data.uniqueAbility.desc}
            </div>
          </div>
          ${stage >= data.uniqueAbility.stage
            ? `<div style="font-size:7px;font-weight:bold;color:var(--green);padding:2px 7px;border:1px solid var(--green)">ACTIVE</div>`
            : `<div style="font-size:7px;color:var(--text-dim);white-space:nowrap">Unlocks at Stage ${data.uniqueAbility.stage}</div>`
          }
        </div>
      ` : ''}

      <!-- Stage Description -->
      <div style="background:var(--surface-2);border-left:2px solid ${stageInfo.color};padding:8px 10px;font-size:9px;color:var(--text-dim);margin-bottom:12px;line-height:1.6">
        ${_stageFlavor(b, stage)}
      </div>

      <!-- Jinchuriki -->
      ${jkS ? `
        <div style="margin-bottom:12px;padding:10px;background:var(--surface-2);border:1px solid var(--border)">
          <div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);margin-bottom:6px">Jinchuriki</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font-size:11px;color:var(--text-hi)">${jkS.fn} ${jkS.ln}</div>
              <div style="font-size:8px;color:var(--text-dim);margin-top:2px">${jkS.status} · Commitment: ${jkS.commitment ?? 50}</div>
              ${jkS.title ? `<div style="font-size:8px;color:var(--gold);margin-top:2px">${jkS.title}</div>` : ''}
            </div>
            <div style="text-align:right;font-size:8px;color:var(--text-dim)">
              ${_statBonusLabel(b, stage)}
            </div>
          </div>
          ${G._ff_bloodlineActive ? `
            <div style="margin-top:8px">
              ${(b.activeUntil || 0) > G.month
                ? `<div style="font-size:8px;color:var(--green)">⚡ Bloodline channelled — active through M${b.activeUntil}</div>`
                : (b.cooldownUntil || 0) > G.month
                  ? `<div style="font-size:8px;color:var(--text-dim)">Bloodline on cooldown until M${b.cooldownUntil}</div>`
                  : stage >= 3
                    ? `<button class="gb" style="font-size:7px;border-color:var(--gold);color:var(--gold)" onclick="activateBloodline('${b.n}')">Channel Bloodline ▸</button>`
                    : `<div style="font-size:8px;color:var(--text-dim)">Channel unlocks at Stage 3</div>`}
            </div>` : ''}
          ${stage >= 4 && data.uniqueAbility ? `
            <div style="margin-top:8px;font-size:8px;background:var(--surface-3);padding:6px 8px;border-left:2px solid var(--gold)">
              <span style="color:var(--gold)">Unique Ability:</span> <span style="color:var(--text)">${data.uniqueAbility.desc}</span>
            </div>
          ` : stage < 4 && data.uniqueAbility ? `
            <div style="margin-top:8px;font-size:8px;color:var(--text-dim);padding:6px 8px;background:var(--surface-3)">
              🔒 Unique Ability unlocks at Stage ${data.uniqueAbility.stage} (${SYNC_STAGES[data.uniqueAbility.stage].n})
            </div>
          ` : ''}
        </div>
      ` : `
        <div style="margin-bottom:12px;padding:10px;background:var(--surface-2);border:1px solid var(--border)">
          <div style="font-size:9px;color:var(--orange)">No Jinchuriki assigned. Assign from the Roster (click any shinobi → Jinchuriki section).</div>
        </div>
      `}

      <!-- Lore & Escapes Row -->
      <div style="display:flex;gap:10px;font-size:8px;color:var(--text-dim)">
        <span>Lore: <b style="color:${loreCount>=loreTot?'var(--gold)':'var(--text)'}">${loreCount}/${loreTot}</b></span>
        ${escapes > 0 ? `<span style="color:var(--red)">Escape incidents: ${escapes}</span>` : '<span>No escape events</span>'}
        <span>Power: <b style="color:var(--text-hi)">${b.pow || data.pow}</b></span>
      </div>

      <!-- Actions -->
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="gb" onclick="beastTab('lore')">View Lore ▸</button>
        ${jkS ? `<button class="gb" onclick="releaseJinchuriki('${b.n}')" style="background:transparent;border-color:var(--red);color:var(--red)">Release Seal</button>` : ''}
      </div>
    </div>
  `
}

function _renderWildCard(b) {
  const data = BEAST_DATA[b.n] || {}
  const capM = G.aM.find(am => am.isBeastCapture && am.beastName === b.n)
  const canCapture = G.shinobi.filter(s => s.ri >= 3 && s.status === 'available').length >= 1

  return `
    <div style="background:var(--surface);border:1px solid var(--border-dim);padding:14px;margin-bottom:10px;opacity:0.85">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-size:12px;color:var(--text-hi)">${b.n}</div>
          <div style="font-size:8px;color:var(--text-dim);margin-top:2px">
            ${'◆'.repeat(b.tails)} ${b.tails}-Tails · ${b.element || data.element || ''}
          </div>
          <div style="font-size:8px;color:var(--text-dim);margin-top:1px;font-style:italic">${data.personality || ''}</div>
        </div>
        <div style="font-size:8px;color:var(--text-dim);padding:2px 8px;border:1px solid var(--border)">Wild</div>
      </div>
      <div style="font-size:9px;color:var(--text-dim);margin-bottom:8px;line-height:1.5">${data.flavors?.[0] || ''}</div>
      <div style="font-size:8px;color:var(--text-dim);margin-bottom:8px">
        Capture: ~${data.captureMonths || 4} months · Power: ${data.pow || b.pow}
        ${data.syncCeiling < 5 ? ` · Sync ceiling: Stage ${data.syncCeiling}` : ''}
      </div>
      ${capM
        ? `<div style="font-size:9px;color:var(--gold)">⟳ Capture mission in progress — ${capM.daysLeft}m remaining</div>`
        : `<button class="gb" onclick="lCap('${b.n}')" ${!canCapture ? 'disabled title="Need ANBU+ available"' : ''}>Launch Capture (ANBU+) ▸</button>`
      }
    </div>
  `
}

function _stageFlavor(b, stage) {
  const data = BEAST_DATA[b.n]
  if (!data) return ''
  const flavorIdx = Math.min(stage - 1, (data.flavors?.length ?? 1) - 1)
  return data.flavors?.[Math.max(0, flavorIdx)] || ''
}

function _statBonusLabel(b, stage) {
  const data = BEAST_DATA[b.n]
  if (!data || !stage) return 'No bonuses yet'
  const bonus = data.statBonus[stage] || {}
  return Object.entries(bonus)
    .filter(([k]) => ['ninjutsu','taijutsu','chakra','speed','genjutsu','intelligence'].includes(k))
    .map(([k, v]) => `${k.slice(0,3).toUpperCase()} ${v > 0 ? '+' : ''}${v}`)
    .join(' · ') || 'Bonuses applying'
}

// ── Lore tab ────────────────────────────────────────────────────────────────

function _renderLore(sealedBeasts) {
  if (sealedBeasts.length === 0) {
    return `<div style="text-align:center;padding:30px;color:var(--text-dim)">Seal a beast to unlock its lore.</div>`
  }

  return sealedBeasts.map(b => {
    const data = BEAST_DATA[b.n] || {}
    const loreUnlocked = b.loreUnlocked || []
    const stage = getSyncStage(b)
    return `
      <div style="margin-bottom:20px">
        <div style="font-size:10px;color:var(--text-hi);margin-bottom:10px;font-weight:bold">
          ${b.n} — ${loreUnlocked.length}/${(data.lore || []).length} records
          ${b.loreBonusActive ? ' <span style="color:var(--gold);font-size:8px">✦ Bonus Active</span>' : ''}
        </div>
        ${(data.lore || []).map((l, i) => {
          const unlocked = loreUnlocked.includes(l.stage)
          return `
            <div style="margin-bottom:8px;padding:10px;background:var(--surface);border:1px solid ${unlocked ? 'var(--border)' : 'var(--border-dim)'}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${unlocked ? '6px' : '0'}">
                <div style="font-size:9px;color:${unlocked ? 'var(--gold)' : 'var(--text-dim)'}">
                  ${unlocked ? '' : '🔒 '}${l.title}
                </div>
                <div style="font-size:7px;color:var(--text-dim)">Stage ${l.stage} ${unlocked ? '✓' : '(locked)'}</div>
              </div>
              ${unlocked
                ? `<div style="font-size:9px;color:var(--text);line-height:1.6;font-style:italic">"${l.body}"</div>`
                : `<div style="font-size:8px;color:var(--text-dim)">Reach Stage ${l.stage} (${SYNC_STAGES[l.stage].n}) to unlock this record.</div>`
              }
            </div>
          `
        }).join('')}
        ${b.loreBonusActive ? `
          <div style="padding:8px 12px;background:var(--surface-2);border:1px solid var(--gold);font-size:9px">
            <span style="color:var(--gold)">Permanent Bonus:</span> <span style="color:var(--text)">${data.loreBonus?.desc || ''}</span>
          </div>
        ` : ''}
      </div>
    `
  }).join('')
}

// ── Passives tab ────────────────────────────────────────────────────────────

function _renderPassives(passives) {
  const sealedWithJk = G.beasts.filter(b => b.sealed && b.jk)

  return `
    <div style="background:var(--surface);border:1px solid var(--border);padding:14px;margin-bottom:14px">
      <div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);margin-bottom:12px">Active Village Passives</div>
      ${sealedWithJk.length === 0 ? `<div style="color:var(--text-dim);font-size:9px">No jinchuriki — no passive bonuses active.</div>` : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
          ${[
            { label: 'Mission Luck',       val: passives.missionLuck > 0 ? `+${Math.round(passives.missionLuck*100)}%` : '—', color: passives.missionLuck > 0 ? 'var(--green)' : 'var(--text-dim)' },
            { label: 'Defense Bonus',      val: passives.defBonus > 0 ? `+${passives.defBonus}` : '—', color: passives.defBonus > 0 ? 'var(--green)' : 'var(--text-dim)' },
            { label: 'Injury Recovery',    val: passives.injuryRecoveryMod < 0 ? `${passives.injuryRecoveryMod} months` : '—', color: passives.injuryRecoveryMod < 0 ? 'var(--green)' : 'var(--text-dim)' },
            { label: 'Academy Growth',     val: passives.academyGrowthMod > 0 ? `+${Math.round(passives.academyGrowthMod*100)}%` : '—', color: passives.academyGrowthMod > 0 ? 'var(--green)' : 'var(--text-dim)' },
            { label: 'Village Morale',     val: passives.moraleBonus !== 0 ? (passives.moraleBonus > 0 ? `+${passives.moraleBonus}` : passives.moraleBonus) : '—', color: passives.moraleBonus > 0 ? 'var(--green)' : passives.moraleBonus < 0 ? 'var(--red)' : 'var(--text-dim)' },
          ].map(row => `
            <div style="background:var(--surface-2);padding:8px 12px">
              <div style="font-size:7px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">${row.label}</div>
              <div style="font-size:12px;color:${row.color}">${row.val}</div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    ${sealedWithJk.map(b => {
      const data = BEAST_DATA[b.n] || {}
      const stage = getSyncStage(b)
      const pv = data.passiveVillage || {}
      return `
        <div style="background:var(--surface);border:1px solid var(--border);padding:12px;margin-bottom:8px">
          <div style="font-size:9px;color:var(--text-hi);margin-bottom:6px;font-weight:bold">${b.n} (Stage ${stage}: ${SYNC_STAGES[stage].n})</div>
          <div style="font-size:8px;color:var(--text-dim);line-height:1.8">
            ${Object.entries(pv).filter(([k,v]) => v && k !== 'wind').map(([k,v]) => `
              <div>${_pvLabel(k)}: <b style="color:var(--text)">${_pvVal(k,v)}</b></div>
            `).join('')}
            ${data.destabilizeChance > 0.1 ? `<div style="color:var(--red)">Destabilize risk: ${Math.round(data.destabilizeChance*100)}%/month</div>` : ''}
          </div>
        </div>
      `
    }).join('')}

    ${passives.featuredBonuses.length > 0 ? `
      <div style="background:var(--surface);border:1px solid var(--gold);padding:12px;margin-top:8px">
        <div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:8px">Lore Mastery Bonuses</div>
        ${passives.featuredBonuses.map(lb => `<div style="font-size:9px;color:var(--text);margin-bottom:4px">✦ ${lb.desc}</div>`).join('')}
      </div>
    ` : ''}
  `
}

function _pvLabel(k) {
  return { missionLuck: 'Mission Luck', def: 'Defense', injuryRecovery: 'Injury Recovery', academyGrowth: 'Academy Growth', morale: 'Monthly Morale', rep: 'Reputation', fear: 'Fear (rival villages)' }[k] || k
}
function _pvVal(k, v) {
  if (k === 'missionLuck') return `+${Math.round(v*100)}%`
  if (k === 'injuryRecovery') return `${v} month/month`
  if (k === 'academyGrowth') return `+${Math.round(v*100)}%`
  return v > 0 ? `+${v}` : String(v)
}

// ── Actions ─────────────────────────────────────────────────────────────────

export function lCap(bN) {
  const b = G.beasts.find(x => x.n === bN)
  if (!b) return
  const sh = G.shinobi.filter(s => s.ri >= 3 && s.status === 'available')
  if (!sh.length) { ntf('Need ANBU or higher!'); return }
  const s = sh[0]; s.status = 'mission'; s.missId = 'beast-' + bN
  const data = BEAST_DATA[bN] || {}
  G.aM.push({
    id: Math.random().toString(36).slice(2),
    missionId: 'beast-' + bN,
    assignedTo: s.id, squadId: null,
    daysLeft: data.captureMonths || 4,
    isSquad: false, isBeastCapture: true, beastName: bN,
  })
  aL(`${sn(s)} deployed to capture ${bN}. Expected return: ${data.captureMonths || 4} months.`, 'warn')
  ntf(`${bN} capture operation begun!`)
  upUI()
}

export function resolveEscape(beastName, action) {
  if (action === 'containment') {
    if (G.ryo < 3000) { ntf('Not enough ryo (3,000 needed)'); return }
    G.ryo -= 3000
    const b = G.beasts.find(x => x.n === beastName)
    if (b) b._escapeContained = G.month + 3
    aL(`Containment team deployed for ${beastName}. 3,000 ryo spent. Escape chance reduced for 3 months.`, 'good')
  } else {
    aL(`${beastName} escape notice dismissed.`, 'neutral')
  }
  G.notices = (G.notices || []).filter(n => !(n.type === 'beast_escape' && n.beastName === beastName))
  rBe(); upUI()
}

export function releaseJinchuriki(bN) {
  const b = G.beasts.find(x => x.n === bN)
  if (!b || !b.jk) return
  const jk = G.shinobi.find(s => s.id === b.jk)
  if (jk) {
    // Remove stat bonuses (rough reversal)
    jk.jk = null
    jk.title = jk.title === `Jinchuriki of ${bN}` ? null : jk.title
  }
  b.jk = null
  b.syncMonths = 0
  b.loreUnlocked = []
  b.loreBonusActive = false
  aL(`The seal on ${bN} was released. The beast is freed.`, 'warn')
  ntf(`${bN} seal released.`)
  upUI()
}
