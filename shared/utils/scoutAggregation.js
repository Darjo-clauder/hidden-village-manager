/**
 * Pure functions for aggregating scout reports.
 * Shared between scoutEngine (browser) and tests (Node).
 */

/**
 * Merges all reports on a prospect into a summary view.
 * @param {object} prospect - Prospect with scoutHistory[]
 * @returns {object|null}
 */
export function aggregateReports(prospect) {
  const reports = prospect.scoutHistory || []
  if (!reports.length) return null

  const confidences = reports.map(r => r.confidence)
  const avgConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
  const bestConfidence = Math.max(...confidences)
  const reportCount = reports.length

  const mean = avgConfidence
  const variance = confidences.reduce((s, c) => s + (c - mean) ** 2, 0) / confidences.length
  const stddev = Math.sqrt(variance)

  const scoutIds = reports.map(r => r.scoutId)
  const uniqueScouts = new Set(scoutIds).size
  const conflictRanges = prospect.conflictingRanges || []

  let biasSeverity = 'none'
  if (conflictRanges.length >= 4) biasSeverity = 'high'
  else if (conflictRanges.length >= 2) biasSeverity = 'medium'
  else if (stddev >= 15 && uniqueScouts === 1) biasSeverity = 'low'

  const quality = bestConfidence >= 80 ? 'Elite'
    : bestConfidence >= 65 ? 'Detailed'
    : bestConfidence >= 50 ? 'General'
    : 'Impression'

  return {
    avgConfidence,
    bestConfidence,
    reportCount,
    uniqueScouts,
    stddev: Math.round(stddev),
    biasSeverity,
    quality,
    latestReport: reports[reports.length - 1],
  }
}

export const REGION_POOL_CAP = 12
