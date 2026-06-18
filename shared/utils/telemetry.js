/**
 * Lightweight in-memory telemetry buffer (Stage-0). Emits are side-effect-only
 * (push to a ring buffer) so they can never alter game logic. A real backend can
 * later drain getEvents(). See docs/SIMULATION_MODELS_V2.md §6.
 */
const MAX = 500
const _events = []

export function emit(type, fields = {}) {
  const ev = { type, t: Date.now(), ...fields }
  _events.push(ev)
  if (_events.length > MAX) _events.splice(0, _events.length - MAX)
  return ev
}

export function getEvents(type) {
  return type ? _events.filter(e => e.type === type) : _events.slice()
}

export function clearEvents() { _events.length = 0 }

/** Integrity scan: counts NaN/Infinity in treasury and shinobi stats (incidenceOfNaN). */
export function integrityCheck(G = {}) {
  let nanCount = 0
  if (!Number.isFinite(G.ryo)) nanCount++
  for (const s of (G.shinobi || [])) {
    for (const v of Object.values(s.stats || {})) if (!Number.isFinite(v)) nanCount++
  }
  return { nanCount, shinobiCount: (G.shinobi || []).length }
}
