# Localization Plan

**Status:** P0 + P1 shipped (2026-06-24). P2+ is optional, incremental, stop-anytime.

## Why
Full string extraction across 30 panels for a solo English-only build has little
immediate payoff — but the **infrastructure + IP-namespace boundary** is genuinely
valuable: it's the swap point for a future IP-neutral build of this Naruto-themed game.
So the architecture (P0–P1) is front-loaded; bulk extraction (P2+) is deferred.

## Architecture
- **`shared/utils/i18n.js`** — pure, DOM-free mini-ICU formatter + locale registry.
  `t(key, params)`, `setLocale`, `formatNum/formatRyo` (Intl), `makePseudoLocale`.
  Supports interpolation, `plural` (incl. `=N`), `select`, `number`, `#` token.
  Missing key → fallback locale → key itself (visible, never throws).
- **`shared/i18n/en.js`** — the `ui.*` namespace: translatable microcopy, dotted keys
  (`nav.*`, `btn.*`, `turn.*`, `season.*`). Seeded with foundational/high-traffic chrome.
- **`shared/i18n/ipNames.js`** — the IP namespace. `ipName(kind, id)` for rank/role/clan/
  nation. **The single swap point**: an IP-neutral build calls `setIpOverrides({...})`
  once at boot; no UI strings change. Entity names already living as data in
  `shared/constants` (clans, nations) are sourced from there; rank/role IP labels are
  owned by this module.
- **Boot** (`client/js/main.js`): registers `en` + `en-XA` (pseudo), `setLocale('en')`,
  exposes `t/setLocale/getLocale/ipName/setIpOverrides` on `window`.
- **Pseudo-locale `en-XA`**: `setLocale('en-XA')` in console → accented + bracketed +30%
  text with placeholders preserved. This is the truncation-QA gate.

## Phases
- **P0 — Infra (DONE):** formatter, registry, Intl helpers, pseudo-locale, 16 tests.
- **P1 — IP boundary (DONE):** `ipName` accessor + override hook; representative wiring
  (Season tab titles via `t()`). No bulk panel changes.
- **P2 — Extraction tranche 1 (next):** nav labels, buttons, ContinueButton states
  (`turn.*` keys already exist), dashboard, inbox, the ~656 `ntf`/`aL` toasts → keyed.
  Pseudo-loc truncation pass on nav + buttons.
- **P3…Pn — Per-panel tranches:** remaining panels in batches. Each: extract → key →
  pseudo-loc check. Stoppable anytime.

## Guardrail (build in P2)
Grep-based test flagging **new** hardcoded capitalized strings in already-converted
panels, so feature work doesn't regress coverage.

## Gotchas
- innerHTML string-concat makes inline plurals awkward — formatter handles it, but call
  sites need care (pass params, don't pre-concatenate counts).
- `vite build` required before browser verify; `window.G` not exposed (DOM-only verify).
- The volume of P2+ is the whole reason P0/P1 were gated ahead of it.

## Migration recipe (per string, for P2+)
1. Add `ui.*` key to `shared/i18n/en.js` (ICU if it has a count/gender).
2. Replace the inline literal with `t('key', { …params })`; import `t` in the panel.
3. For entity names, use `ipName(kind, id)` instead of `RANKS[ri]` / clan/nation literals.
4. `setLocale('en-XA')` and eyeball for truncation; revert to `en`.
