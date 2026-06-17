/**
 * Scout Safehouse Network — locations, deep cover ops, passive prospect leads.
 */

export const MAX_SAFEHOUSES = 3
export const SAFEHOUSE_COST = 8000

export const SAFEHOUSE_LOCATIONS = [
  { id: 'sh_north', name: 'Northern Outpost',  icon: '🏔', prospectBonus: 0.10, opSuccessBonus: 0.04, desc: 'High-altitude mountain station. Solid intel on northern villages.' },
  { id: 'sh_east',  name: 'Eastern Harbor',     icon: '⚓', prospectBonus: 0.08, opSuccessBonus: 0.05, desc: 'Port city contact network. Strong trade-route intel.' },
  { id: 'sh_south', name: 'Southern Jungle Den',icon: '🌿', prospectBonus: 0.12, opSuccessBonus: 0.03, desc: 'Dense jungle safehouse. Best prospect pipeline.' },
  { id: 'sh_west',  name: 'Western Desert Cache',icon: '🏜', prospectBonus: 0.06, opSuccessBonus: 0.07, desc: 'Fortified desert cache. Deepest cover ops capability.' },
  { id: 'sh_city',  name: 'City Underground',   icon: '🏙', prospectBonus: 0.15, opSuccessBonus: 0.02, desc: 'Urban black-market nexus. Highest passive prospect rate.' },
]

export const SH_LOCATION_BY_ID = Object.fromEntries(SAFEHOUSE_LOCATIONS.map(l => [l.id, l]))

export const DEEP_COVER_OPS = [
  { id: 'dc_infiltrate', n: 'Village Infiltration', rk: 'A', ryo: 11000, rep: 7, reqRi: 3, daysActive: 2, desc: 'Agent embeds in target village for 2 months. Reveals rival strength.' },
  { id: 'dc_extraction', n: 'Asset Extraction',     rk: 'B', ryo: 8000,  rep: 5, reqRi: 2, daysActive: 1, desc: 'Extract a hidden asset. Single-month op.' },
  { id: 'dc_sabotage',   n: 'Deep Sabotage',        rk: 'A', ryo: 13000, rep: 6, reqRi: 3, daysActive: 1, desc: 'Sabotage rival infrastructure from inside.' },
  { id: 'dc_recruit',    n: 'Double Agent Turn',     rk: 'S', ryo: 22000, rep: 10, reqRi: 4, daysActive: 2, desc: 'Turn a rival agent. Massive intel value.' },
]

export const DC_OP_BY_ID = Object.fromEntries(DEEP_COVER_OPS.map(o => [o.id, o]))

/**
 * Aggregate safehouse network bonuses.
 * @param {object} G - game state
 * @returns {{ prospectBonus: number, opSuccessBonus: number, count: number }}
 */
export function getSafehousePassives(G) {
  const houses = (G.safehouses || []).filter(sh => sh.status === 'active')
  return {
    prospectBonus: houses.reduce((sum, sh) => sum + (SH_LOCATION_BY_ID[sh.locationId]?.prospectBonus || 0), 0),
    opSuccessBonus: houses.reduce((sum, sh) => sum + (SH_LOCATION_BY_ID[sh.locationId]?.opSuccessBonus || 0), 0),
    count: houses.length,
  }
}

/**
 * Rolls for a passive prospect lead from the safehouse network.
 * Returns a prospect object or null.
 * @param {object} G
 * @param {Function} rand - Math.random replacement for testing
 * @returns {{ name: string, ri: number, source: string } | null}
 */
export function rollProspectLead(G, rand = Math.random) {
  const { prospectBonus, count } = getSafehousePassives(G)
  if (count === 0) return null
  const baseChance = 0.15 + prospectBonus
  if (rand() > baseChance) return null
  const riTable = [0, 0, 1, 1, 1, 2]
  const ri = riTable[Math.floor(rand() * riTable.length)]
  const names = ['Kaito','Ren','Sora','Mika','Taro','Yuki','Hana','Jin','Nao','Ryu']
  const name = names[Math.floor(rand() * names.length)]
  const loc = (G.safehouses || []).filter(s => s.status === 'active')[Math.floor(rand() * count)]
  const locDef = SH_LOCATION_BY_ID[loc?.locationId]
  return { name, ri, source: locDef?.name || 'Network', clan: null }
}
