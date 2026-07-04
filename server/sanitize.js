// Server-side input sanitizers for player-supplied identity fields.
//
// Defense in depth: the client escapes at its innerHTML sinks, but the server
// also strips angle brackets and bounds length here so malicious markup never
// enters world state / the DB / other clients in the first place (and so a
// modified client can't poison the shared world).

export function cleanText(s, max) {
  return String(s ?? '').replace(/[<>]/g, '').slice(0, max)
}

export function cleanIcon(s) {
  // Emoji can be multiple code points; keep a few, drop angle brackets, fall back to leaf.
  const t = String(s ?? '🍃').replace(/[<>]/g, '')
  return [...t].slice(0, 4).join('') || '🍃'
}

export function cleanStringArray(arr, maxItems = 20, maxLen = 24) {
  if (!Array.isArray(arr)) return []
  return arr.slice(0, maxItems).map(x => String(x ?? '').replace(/[<>]/g, '').slice(0, maxLen))
}
