/**
 * DOM localizer (L10N P2) — applies the i18n string table to static markup.
 *
 * Any element carrying `data-i18n="key"` gets its textContent replaced with t(key).
 * Targets must be leaf text holders (no element children) — for controls that also
 * hold a badge/chevron, wrap the label text in its own <span data-i18n>.
 *
 * Re-runnable: call again after setLocale() to live-swap the chrome (e.g. the
 * `setLocale('en-XA')` pseudo-loc truncation QA pass).
 */
import { t } from '../../shared/utils/i18n.js'

export function localizeDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n)
  })
}
