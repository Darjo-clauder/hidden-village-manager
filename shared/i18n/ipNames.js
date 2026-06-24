/**
 * IP namespace (L10N P1) — the single swap point for IP-named entities.
 *
 * The game's flavor terms (shinobi ranks, squad roles, clan & nation names, jutsu,
 * beasts) are Naruto-derived IP. This module is the ONLY place those display labels
 * resolve, so a future IP-neutral build can replace/override them here without
 * touching a single UI string in the `ui.*` locale tables.
 *
 * Names that already live as data in shared/constants (clans, nations) are sourced
 * from there; rank/role labels — which are pure IP flavor — are owned here.
 *
 * Pure + DOM-free. An IP-neutral build calls `setIpOverrides({ rank:{...}, ... })`
 * once at boot to swap labels wholesale.
 */
import { CLAN_BY_ID } from '../constants/clans.js'
import { NATIONS } from '../constants/nations.js'

// Canonical IP labels owned by this module (the swap targets).
export const IP_RANKS = ['Genin', 'Chunin', 'Jonin', 'ANBU', 'Sannin']
export const IP_ROLES = { vanguard: 'Vanguard', support: 'Support', intel: 'Intel', medical: 'Medical', flex: 'Flex' }

let _overrides = {}
/** Swap IP labels for an IP-neutral build, e.g. { rank: ['Rookie','Agent',...] }. */
export function setIpOverrides(o) { _overrides = o || {} }

/**
 * Resolve an entity's display name through the IP namespace.
 * @param {'rank'|'role'|'clan'|'nation'} kind
 * @param {number|string} id  rank index, role id, clan id, or nation id
 */
export function ipName(kind, id) {
  const ov = _overrides[kind]
  if (ov != null) {
    if (Array.isArray(ov) && ov[id] != null) return ov[id]
    if (!Array.isArray(ov) && id in ov) return ov[id]
  }
  switch (kind) {
    case 'rank':   return IP_RANKS[id] ?? String(id)
    case 'role':   return IP_ROLES[id] ?? String(id)
    case 'clan':   return CLAN_BY_ID[id]?.name ?? String(id)
    case 'nation': return NATIONS[id]?.name ?? String(id)
    default:       return String(id)
  }
}
