/**
 * i18n foundation (L10N P0) — a tiny, dependency-free message formatter + locale
 * registry for the vanilla-JS build. Pure and DOM-free so it runs in tests and on
 * both client and server.
 *
 * Supports the subset of ICU MessageFormat the game actually needs:
 *   • interpolation        "Signed {name} for {fee} ryo"
 *   • plural               "{n, plural, one {# decision} other {# decisions}}"
 *   • select               "{role, select, kage {Hokage} other {Captain}}"
 *   • number               "{amount, number}"  (Intl.NumberFormat, locale-aware)
 *   • the # token inside plural branches → the formatted count
 *
 * Branches may themselves contain interpolations (one level of nesting is handled
 * by recursing the chosen branch). Missing keys fall back to the `en` table, then
 * to the key itself — so a gap is visible but never throws.
 */

const _locales = {}          // code → flat key→message table
let _active = 'en'
let _fallback = 'en'

export function registerLocale(code, table) { _locales[code] = { ...(_locales[code] || {}), ...table } }
export function setLocale(code) { _active = _locales[code] ? code : (console.warn(`[i18n] unknown locale "${code}", keeping "${_active}"`), _active) }
export function getLocale() { return _active }
export function setFallbackLocale(code) { _fallback = code }
export function hasKey(key, code = _active) { return !!(_locales[code] && key in _locales[code]) }

/** Translate: look up `key`, then format with `params`. */
export function t(key, params = {}) {
  const table = _locales[_active] || {}
  const fb = _locales[_fallback] || {}
  const msg = (key in table) ? table[key] : (key in fb) ? fb[key] : key
  return formatMessage(msg, params, _active)
}

// ── Mini-ICU formatter ──────────────────────────────────────────────────────────

/** Index of the `}` matching the `{` at `open`, respecting nesting. */
function matchBrace(str, open) {
  let depth = 0
  for (let i = open; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}' && --depth === 0) return i
  }
  return str.length          // unbalanced → treat rest as the argument
}

/** Parse "one {a} other {b}" → { one: 'a', other: 'b' }. */
function parseBranches(body) {
  const out = {}
  let i = 0
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i])) i++
    let kw = ''
    while (i < body.length && body[i] !== '{' && !/\s/.test(body[i])) kw += body[i++]
    while (i < body.length && /\s/.test(body[i])) i++
    if (body[i] !== '{') break
    const end = matchBrace(body, i)
    out[kw] = body.slice(i + 1, end)
    i = end + 1
  }
  return out
}

function resolveArg(inner, params, locale) {
  const comma = inner.indexOf(',')
  if (comma === -1) {                                   // {name}
    const v = params[inner.trim()]
    return v == null ? '' : String(v)
  }
  const name = inner.slice(0, comma).trim()
  const rest = inner.slice(comma + 1)
  const comma2 = rest.indexOf(',')
  const type = (comma2 === -1 ? rest : rest.slice(0, comma2)).trim()
  const body = comma2 === -1 ? '' : rest.slice(comma2 + 1)
  const val = params[name]

  if (type === 'number') return new Intl.NumberFormat(locale).format(Number(val) || 0)
  if (type === 'plural' || type === 'selectordinal') {
    const branches = parseBranches(body)
    const n = Number(val) || 0
    const cat = new Intl.PluralRules(locale, { type: type === 'selectordinal' ? 'ordinal' : 'cardinal' }).select(n)
    const chosen = branches[`=${n}`] ?? branches[cat] ?? branches.other ?? ''
    return formatMessage(chosen.replace(/#/g, new Intl.NumberFormat(locale).format(n)), params, locale)
  }
  if (type === 'select') {
    const branches = parseBranches(body)
    const chosen = branches[String(val)] ?? branches.other ?? ''
    return formatMessage(chosen, params, locale)
  }
  return ''
}

/** Format an ICU-lite message string with params. */
export function formatMessage(msg, params = {}, locale = _active) {
  if (msg == null) return ''
  let out = '', i = 0
  while (i < msg.length) {
    if (msg[i] === '{') {
      const end = matchBrace(msg, i)
      out += resolveArg(msg.slice(i + 1, end), params, locale)
      i = end + 1
    } else { out += msg[i++] }
  }
  return out
}

// ── Intl helpers ────────────────────────────────────────────────────────────────

export function formatNum(n, locale = _active) { return new Intl.NumberFormat(locale).format(Number(n) || 0) }
/** Grouped ryo amount (caller appends the unit so it can be localized separately). */
export function formatRyo(n, locale = _active) { return new Intl.NumberFormat(locale).format(Math.round(Number(n) || 0)) }

// ── Pseudo-locale (QA: +30% expansion, accented, bracketed) ──────────────────────

const _accent = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', n: 'ñ', c: 'ç', s: 'š', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' }
/** Transform one message into pseudo-text WITHOUT touching {placeholders}. */
export function pseudoMessage(msg) {
  let out = '', i = 0
  while (i < msg.length) {
    if (msg[i] === '{') { const end = matchBrace(msg, i); out += msg.slice(i, end + 1); i = end + 1; continue }
    const ch = msg[i++]
    out += _accent[ch] || ch
  }
  // +~30% width via a padded bracket wrapper (only on visible text).
  const pad = '~'.repeat(Math.max(1, Math.ceil(out.replace(/\{[^}]*\}/g, '').length * 0.3)))
  return `⟦${out}${pad}⟧`
}
/** Build a pseudo-locale table from a base (usually `en`) table. */
export function makePseudoLocale(baseTable) {
  const out = {}
  for (const k in baseTable) out[k] = pseudoMessage(baseTable[k])
  return out
}
