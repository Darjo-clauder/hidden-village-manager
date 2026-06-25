/**
 * Debug-mode toggle — single source of truth for development-only logging.
 *
 * Production builds stay silent. Verbose logs are opt-in at runtime (no rebuild) via:
 *   - URL query:    ?debug=1
 *   - localStorage: localStorage.setItem('hvm_debug', '1')
 *
 * `dlog` / `dwarn` are no-ops unless DEBUG is on, so call sites read cleanly and carry
 * effectively zero cost in production. Genuine error-path warnings (e.g. an unknown
 * locale, a thrown context-menu handler) should keep using console.warn directly —
 * those are not debug noise and must surface in production.
 */
function resolveDebug() {
  try {
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search || '')
      if (qs.get('debug') === '1') return true
      if (window.localStorage && window.localStorage.getItem('hvm_debug') === '1') return true
    }
  } catch {
    /* sandboxed / storage disabled / non-browser env — fall through to off */
  }
  return false
}

export const DEBUG = resolveDebug()

export function dlog(...args) { if (DEBUG) console.log(...args) }
export function dwarn(...args) { if (DEBUG) console.warn(...args) }
