/**
 * Resolve a CSS custom property to a real colour string.
 *
 * Canvas is not CSS: assigning `ctx.fillStyle = 'var(--gold)'` is an invalid
 * colour, which the spec says to IGNORE — so the context silently keeps
 * whatever colour was set before and the drawing comes out wrong. The theme
 * migration moved panel colour onto tokens and swept the canvas renderers up
 * with it, so every `var(--…)` that reached a 2D context stopped painting.
 * Anything drawn to a canvas has to come through here instead.
 *
 * Values are cached because the tokens are static per theme; `clearCssVarCache`
 * exists for when the nation accent is re-pointed at runtime.
 */
const _cache = new Map()

export function cssVar(name, fallback = '#000') {
  if (_cache.has(name)) return _cache.get(name)
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const val = raw || fallback
  _cache.set(name, val)
  return val
}

export function clearCssVarCache() { _cache.clear() }
