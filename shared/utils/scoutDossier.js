/**
 * Scout dossier (R10) — turns a prospect's raw scoutHistory into a persistent,
 * legible artifact: a chronological timeline with per-report confidence deltas, a
 * trend read, and report aging so old intel visibly goes cold. Pure + deterministic
 * (DOM-free) so it can be unit-tested; the panel renders what it returns.
 */

export const STALE_MONTHS = 12    // a report older than a year has gone cold

/** Age of a report in months relative to the current game date. */
export function reportAgeMonths(report, year, month) {
  return (year - report.year) * 12 + (month - report.month)
}

const _avg = a => a.reduce((s, v) => s + v, 0) / a.length

/**
 * Classify the chronological confidence reads:
 * 'single' (one report), 'volatile' (wide spread), 'rising' / 'falling' (trend),
 * or 'steady'. Expects reports already in chronological order.
 */
export function confidenceTrend(reports) {
  const confs = (reports || []).map(r => r.confidence).filter(c => typeof c === 'number')
  if (confs.length < 2) return 'single'
  const spread = Math.max(...confs) - Math.min(...confs)
  if (spread >= 25) return 'volatile'
  const mid = Math.floor(confs.length / 2)
  const d = _avg(confs.slice(mid)) - _avg(confs.slice(0, mid || 1))
  if (d >= 8) return 'rising'
  if (d <= -8) return 'falling'
  return 'steady'
}

// Age-decayed weight for one report in the consensus read.
function _weight(entry) {
  if (entry.stale) return 0.4
  return 1 - Math.min(0.5, entry.ageMonths / (STALE_MONTHS * 2))
}

/**
 * Build the dossier view for a prospect.
 * @returns null when there are no reports, else
 *   { entries[], trend, freshness, reportCount, uniqueScouts, latest, consensus }
 *   where each entry adds { ageMonths, stale, delta } to the report.
 */
export function buildDossier(prospect, year, month) {
  const raw = (prospect.scoutHistory || []).slice()
  if (!raw.length) return null
  const sorted = raw.sort((a, b) => (a.year - b.year) || (a.month - b.month))
  const entries = sorted.map((rep, i) => {
    const ageMonths = reportAgeMonths(rep, year, month)
    const prev = i > 0 ? sorted[i - 1].confidence : null
    return {
      scoutId: rep.scoutId, scoutName: rep.scoutName, region: rep.region,
      year: rep.year, month: rep.month, confidence: rep.confidence,
      quality: rep.quality, narrative: rep.narrative,
      ageMonths, stale: ageMonths >= STALE_MONTHS,
      delta: prev == null ? null : rep.confidence - prev,
    }
  })
  const latest = entries[entries.length - 1]
  const freshness = latest.stale ? 'cold' : latest.ageMonths >= STALE_MONTHS / 2 ? 'aging' : 'fresh'
  let wsum = 0, w = 0
  entries.forEach(e => { const wt = _weight(e); wsum += e.confidence * wt; w += wt })
  return {
    entries,
    trend: confidenceTrend(sorted),
    freshness,
    reportCount: entries.length,
    uniqueScouts: new Set(sorted.map(r => r.scoutId)).size,
    latest,
    consensus: w ? Math.round(wsum / w) : 0,
  }
}
