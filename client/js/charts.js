// ── Charts (VISUAL_OVERHAUL §3.5) — dependency-free inline SVG ─────────────────
// Inline SVG rather than Canvas: it inherits the CSS tokens (so a nation
// retint or the text-size setting reaches the chart for free), stays crisp at
// any DPR, and matches the existing lineChartSvg / barRowsSvg in uikit.js.
//
// Chart rules from the brief: no gridline heavier than --border-dim; axis
// labels in --text-dim at --fs-micro; the player's own series is --viz-1 and
// 2px, everything else 1px; the last point of a series is marked.

export { lineChartSvg, barRowsSvg } from './uikit.js'

/**
 * Radar of N axes on a 0–max scale. The primary series is filled; an optional
 * `compare` series (same axes) is drawn as a thin neutral outline — the village
 * average, a role template, last year's self.
 *
 * axes:    [{ key, label, color? }]      color tints that axis label (role stats)
 * values:  { key: number }
 * compare: { key: number } | null
 */
export function radarSvg(axes, values, opts = {}) {
  const { size = 140, max = 100, compare = null, color = 'var(--viz-1, var(--accent))', compareColor = 'var(--viz-6, var(--text-faint))', rings = 4, label = 'Attribute radar' } = opts
  const n = axes.length
  if (n < 3) return ''
  const cx = size / 2, cy = size / 2
  const pad = 16                                        // room for labels
  const r = size / 2 - pad
  const ang = i => -Math.PI / 2 + (i / n) * Math.PI * 2 // first axis straight up
  const pt = (i, v) => {
    const k = Math.max(0, Math.min(1, (v || 0) / max)) * r
    return [cx + Math.cos(ang(i)) * k, cy + Math.sin(ang(i)) * k]
  }
  const poly = src => axes.map((a, i) => pt(i, src?.[a.key]).map(v => v.toFixed(1)).join(',')).join(' ')
  // concentric rings + spokes
  const gridRings = Array.from({ length: rings }, (_, k) => {
    const rr = r * ((k + 1) / rings)
    const pts = axes.map((_, i) => [cx + Math.cos(ang(i)) * rr, cy + Math.sin(ang(i)) * rr].map(v => v.toFixed(1)).join(',')).join(' ')
    return `<polygon points="${pts}" fill="none" stroke="var(--border-dim)" stroke-width="1"/>`
  }).join('')
  const spokes = axes.map((_, i) => { const [x, y] = pt(i, max); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border-dim)" stroke-width="1"/>` }).join('')
  // axis labels just outside the outer ring
  const labels = axes.map((a, i) => {
    const lx = cx + Math.cos(ang(i)) * (r + 9), ly = cy + Math.sin(ang(i)) * (r + 9)
    const anchor = Math.abs(Math.cos(ang(i))) < 0.2 ? 'middle' : Math.cos(ang(i)) > 0 ? 'start' : 'end'
    return `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="${anchor}" font-size="9" font-family="var(--font-ui)" fill="${a.color || 'var(--text-dim)'}" letter-spacing=".06em">${a.label}</text>`
  }).join('')
  const cmp = compare ? `<polygon points="${poly(compare)}" fill="none" stroke="${compareColor}" stroke-width="1" stroke-dasharray="3 2"/>` : ''
  const main = `<polygon points="${poly(values)}" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`
  const dots = axes.map((a, i) => { const [x, y] = pt(i, values?.[a.key]); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="${color}"/>` }).join('')
  const desc = axes.map(a => `${a.label} ${values?.[a.key] ?? 0}`).join(', ')
  return `<svg class="hv-radar" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${label}: ${desc}">${gridRings}${spokes}${cmp}${main}${dots}${labels}</svg>`
}

/** Inline sparkline — no axes, last point marked. */
export function sparklineSvg(values, opts = {}) {
  const { width = 80, height = 18, color = 'var(--viz-1, var(--accent))' } = opts
  if (!values || values.length < 2) return ''
  const min = Math.min(...values), max = Math.max(...values), range = (max - min) || 1
  const x = i => 1 + (i / (values.length - 1)) * (width - 2)
  const y = v => (height - 2) - ((v - min) / range) * (height - 4)
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const lx = x(values.length - 1), ly = y(values[values.length - 1])
  return `<svg class="hv-spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.8" fill="${color}"/></svg>`
}
