import { G, sn } from './state.js'
import { SQUAD_ROLES } from './constants.js'
import { aL, ntf } from './ui.js'
import { isEnabled } from '../../config/features.js'
import { resolveActiveStarter } from '../../shared/types/DepthChart.js'

/**
 * Bridges the existing {starter, backup, emergency} slot format to the shared
 * resolveActiveStarter() logic, which uses {starterId, backupIds[]}.
 * Returns the shinobi id of whoever should play, accounting for injuries.
 * @param {string} squadId
 * @param {string} roleId
 * @returns {string|null}
 */
export function resolveActiveShinobi(squadId, roleId) {
  if (!isEnabled('DEPTH_CHART')) return G.depthChart?.[squadId]?.[roleId]?.starter ?? null
  const slot = G.depthChart?.[squadId]?.[roleId]
  if (!slot) return null
  // Convert legacy slot shape → shared entity shape for the resolver
  const sharedSlot = {
    starterId: slot.starter ?? null,
    backupIds: [slot.backup, slot.emergency].filter(Boolean),
    promotionRules: slot.locked ? 'manual' : 'auto',
  }
  const shinobiIndex = Object.fromEntries((G.shinobi || []).map(s => [s.id, s]))
  return resolveActiveStarter(sharedSlot, shinobiIndex)
}

// ── Ensure depth chart entry exists for a squad ───────────────────────────────
export function ensureDepthEntry(squadId) {
  if (!G.depthChart) G.depthChart = {}
  if (!G.depthChart[squadId]) {
    G.depthChart[squadId] = {}
    SQUAD_ROLES.forEach(r => {
      G.depthChart[squadId][r.id] = { starter: null, backup: null, emergency: null, locked: false }
    })
  }
  return G.depthChart[squadId]
}

// ── Assign a shinobi to a role slot in a squad ────────────────────────────────
export function assignDepthSlot(squadId, roleId, slot, shinobiId) {
  const entry = ensureDepthEntry(squadId)
  if (!entry[roleId]) entry[roleId] = { starter: null, backup: null, emergency: null, locked: false }
  entry[roleId][slot] = shinobiId || null
  // Also update shinobi's squadRole field for display
  if (shinobiId && slot === 'starter') {
    const s = G.shinobi.find(x => x.id === shinobiId)
    if (s) s.squadRole = roleId
  }
  evalDepth(G)
}

// ── Toggle role-based auto-promote lock ───────────────────────────────────────
export function toggleDepthLock(squadId, roleId) {
  const entry = ensureDepthEntry(squadId)
  if (entry[roleId]) entry[roleId].locked = !entry[roleId].locked
}

// ── Monthly evaluation: check gaps and run auto-promotions ───────────────────
export function evalDepth(G) {
  if (!G.depthChart) G.depthChart = {}
  if (!G.depthGaps) G.depthGaps = []
  G.depthGaps = []

  Object.entries(G.depthChart).forEach(([squadId, roles]) => {
    const squad = G.squads.find(sq => sq.id === squadId)
    if (!squad) return

    Object.entries(roles).forEach(([roleId, slot]) => {
      if (!slot) return
      const roleDef = SQUAD_ROLES.find(r => r.id === roleId)
      if (!roleDef || roleId === 'flex') return

      const starter   = slot.starter   ? G.shinobi.find(s => s.id === slot.starter)   : null
      const backup    = slot.backup    ? G.shinobi.find(s => s.id === slot.backup)     : null
      const emergency = slot.emergency ? G.shinobi.find(s => s.id === slot.emergency)  : null

      // Auto-promote: if starter unavailable, resolve who actually plays
      if (starter && starter.status !== 'available' && !slot.locked) {
        const activeId = resolveActiveShinobi(squadId, roleId)
        const active = activeId ? G.shinobi.find(s => s.id === activeId) : null
        if (active && active.id !== starter.id) {
          const reason = starter.status === 'mission' ? 'deployed' : starter.status === 'injured' ? 'injured' : 'unavailable'
          aL(`Depth: ${active.fn} ${active.ln} promoted to ${roleDef.n} (${squad.n} — starter ${sn(starter)} is ${reason}).`, 'neutral')
        }
      }

      // Gap detection
      if (!starter || !squad.members.includes(starter.id)) {
        G.depthGaps.push({ squadId, squadName: squad.n, roleId, roleName: roleDef.n, severity: 'critical', reason: 'No starter assigned' })
      } else if (!backup) {
        G.depthGaps.push({ squadId, squadName: squad.n, roleId, roleName: roleDef.n, severity: 'warn', reason: 'No backup assigned' })
      }
    })
  })

  // Emergency call-up: if a squad has only 1 available member, flag near-grads
  G.squads.forEach(sq => {
    const available = sq.members.filter(id => {
      const s = G.shinobi.find(x => x.id === id)
      return s && s.status === 'available'
    })
    if (available.length <= 1) {
      const nearGrads = (G.intakeClass || []).filter(s => (s.monthsInClass || s.monthsEnrolled || 0) >= 10)
      if (nearGrads.length > 0 && !G.depthGaps.find(g => g.squadId === sq.id && g.severity === 'emergency')) {
        G.depthGaps.push({
          squadId: sq.id, squadName: sq.n, roleId: 'roster', roleName: 'Roster',
          severity: 'emergency',
          reason: `Only ${available.length} member available — ${nearGrads.length} near-grad(s) could be called up early`,
          nearGradIds: nearGrads.map(s => s.id),
        })
      }
    }
  })
}

// ── Best available shinobi for a role (used in mission auto-assign) ───────────
export function bestForRole(squadId, roleId) {
  const entry = G.depthChart?.[squadId]?.[roleId]
  if (!entry) return null
  for (const slot of ['starter', 'backup', 'emergency']) {
    if (!entry[slot]) continue
    const s = G.shinobi.find(x => x.id === entry[slot] && x.status === 'available')
    if (s) return s
  }
  return null
}

// ── Role bonus modifier applied to mission success calc ───────────────────────
export function roleBonus(squad) {
  if (!squad || !G.depthChart?.[squad.id]) return { missionBonus: 0, riskReduction: 0, injReduction: 0 }
  let missionBonus = 0, riskReduction = 0, injReduction = 0

  Object.entries(G.depthChart[squad.id]).forEach(([roleId, slot]) => {
    if (!slot?.starter) return
    const s = G.shinobi.find(x => x.id === slot.starter && x.status !== 'injured')
    if (!s) return
    const roleDef = SQUAD_ROLES.find(r => r.id === roleId)
    if (!roleDef) return
    missionBonus  += roleDef.missionBonus  || 0
    riskReduction += roleDef.riskReduction || 0
    injReduction  += roleDef.injReduction  || 0
  })

  return { missionBonus, riskReduction, injReduction }
}
