/**
 * Intel freshness — do we currently know anything about this village?
 *
 * Extracted as a pure helper because the answer now gates real information,
 * not just a panel readout: from here on, a village's matchday STYLE is only
 * legible while you hold fresh intel on them. That gives scouting a downstream
 * payoff in the same shape the leverage plays already have — recon is
 * ammunition — instead of being a one-off readout you glance at once.
 *
 * A NOTE ON KEYING, WHICH IS ALREADY INCONSISTENT.
 *
 * `G.intelReports` entries are written with `villageId: v.id || v.n`, but
 * several readers compare against `v.n` as well — `_leverageCtx` in
 * panels/intel.js checks BOTH, which is evidence the two conventions have
 * already drifted apart in saved games. This helper therefore matches either,
 * deliberately. Do not "clean that up" by picking one without migrating old
 * saves first: a save written under the other convention would silently lose
 * every report it holds.
 *
 * Pure — no G access. Unit-tested.
 */

/** The key an intel report is filed under for a village. */
export function villageKey(v) {
  return v?.id || v?.n || null
}

/** Absolute month index, matching how expiresMonth is stamped. */
export function nowMonth(year, month) {
  return (year - 1) * 12 + month
}

/**
 * Every unexpired report we hold on a village.
 * `now` is an absolute month index — see nowMonth().
 */
export function reportsFor(intelReports, village, now) {
  const k = villageKey(village)
  if (!k) return []
  const n = village?.n
  return (intelReports || []).filter(r => {
    // Both sides must be present before comparing, or a malformed report with
    // no villageId matches a village with no name via undefined === undefined.
    if (!r?.villageId) return false
    const keyed = r.villageId === k || (!!n && r.villageId === n)
    return keyed && (r.expiresMonth ?? 0) >= now
  })
}

/** Do we hold ANY current intel on this village? */
export function hasFreshIntel(intelReports, village, now) {
  return reportsFor(intelReports, village, now).length > 0
}

/**
 * How many months until our intel on them goes stale, or 0 if we have none.
 * Surfaced so the player can see the window closing and act before it does.
 */
export function intelMonthsLeft(intelReports, village, now) {
  const rs = reportsFor(intelReports, village, now)
  if (!rs.length) return 0
  return Math.max(...rs.map(r => (r.expiresMonth ?? 0) - now))
}
