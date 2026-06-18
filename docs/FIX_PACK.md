# Fix Pack (Step 8)

Consolidated, prioritized fixes from the Opus verification pass. Each item: implicated file, root
cause, fix, validating test, effort, owner role. Status reflects the post-fix build.

| ID | Sev | Title | Status |
|---|---|---|---|
| O-2 | Med | Region clan-affinity dead feature + verbatim names | ✅ Fixed |
| B-IDEMP-1 | High | Beast stat cumulative inflation (Sonnet B-2) | ✅ Fixed |
| O-1 | Low | Jinchuriki panel wrong commitment field | ✅ Fixed |
| M-CAP-1 | Low | Unclamped beast-capture chance | ✅ Fixed |
| MIG-1 | Med | Old-save healing for B-IDEMP-1 | 🔲 Proposed |
| C-1 / IP | — | Naming strategy (private/public) | ↪ Owner-managed |

---

## O-2 — Region clan-affinity is a dead feature (and held verbatim names) ✅
- **Files:** `client/js/constants.js:148-152`, consumed at `client/js/state.js:336-338`
- **Root cause:** `REGIONS[].clanAffinity` held Naruto surnames (`Uchiha`…); `state.js` resolves them via `CLANS.find(c => c.n === clanName)` against the **renamed** clan table → never matched → no prospect ever received a region clan, and passives never applied to region-sourced shinobi.
- **Fix:** repointed affinities to existing renamed clans (`Kageha, Mori, Shiromi, Okamura, Mushiba, Kagero, Tsuchida, Tamashii`). Revives the feature, makes passives apply, removes verbatim strings.
- **Test:** `tests/regions.test.js` — every affinity resolves to a `CLANS` entry; no banned surnames.
- **Effort:** S · **Owner:** Gameplay

## B-IDEMP-1 — Beast stat cumulative inflation ✅ (resolves Sonnet B-2)
- **File:** `client/js/beastEngine.js:290` (`applyBeastStats`), called from `tickBeast:319-322`
- **Root cause:** `statBonus[stage]` are **absolute** per-stage totals, but the function **added** them; `tickBeast` applies once per stage-up, so bonuses stacked (`−5+12+20+28 = +55` vs intended `+28`). Inflated every jinchuriki's stats → skewed mission/combat balance.
- **Fix:** track `s._beastBonusApplied` and apply only the **delta** (idempotent; correct across transitions; reverses to base on beast loss).
- **Test:** `tests/beastStats.test.js` — re-apply no-op, stages 1→4 → speed 68 (not 95), stage-0 drop → base.
- **Effort:** M · **Owner:** Gameplay
- **Note:** mechanism differs from Sonnet's "save/reload" framing — the real trigger is normal stage progression.

## O-1 — Jinchuriki commitment shows wrong field ✅
- **File:** `client/js/panels/beasts.js:147`
- **Root cause:** read `jkS.commitmentScore` (nonexistent); real field is `commitment` (`state.js:56`) → always displayed fallback `50`.
- **Fix:** `commitmentScore` → `commitment`.
- **Test:** covered by build + manual; field-name change. **Effort:** S · **Owner:** UI

## M-CAP-1 — Unclamped beast-capture chance ✅
- **File:** `client/js/adv.js:867` → extracted to `beastEngine.captureChance`
- **Root cause:** `0.35 + (sPow−pow)·0.01` had no bounds → could exceed 1.0 (guaranteed) or go ≤0.
- **Fix:** `captureChance(a,b) = clamp(0.35 + (a−b)·0.01, 0.05, 0.95)`.
- **Test:** `tests/beastStats.test.js` — base/cap/floor/scaling. **Effort:** S · **Owner:** Gameplay

## MIG-1 — Heal previously-inflated saves (proposed) 🔲
- **Root cause:** `tickBeast` only calls `applyBeastStats` on stage change, so jinchuriki already at max in existing saves keep their inflated stats after the B-IDEMP-1 fix.
- **Proposed fix (on load, once):** for each sealed beast with a jk, recompute `jk.stats = base + statBonus[getSyncStage]`. Requires a clean stat base — if none is stored, derive by subtracting the inflated cumulative or gate behind a `state_version` bump.
- **Test:** load a fixture save with an inflated jinchuriki; assert stats normalize to `base + statBonus[stage]`.
- **Effort:** M · **Owner:** Gameplay · **Needs:** decision on whether to migrate or let saves age out.

## IP / Naming — owner-managed ↪
- **Decision (owner):** maintain a **Naruto-named private build** + an **IP-safe public build**.
- **Reality:** the repo is **already the IP-safe base** (beasts `Sakeru/Kureni`, clans `Kageha/Shiromi`, minor clans `Enzaru…`). O-2 removed the last consumed strings.
- **Recommended architecture:** a single **name-map overlay** (`{canonicalName → narutoName}`) applied at render time, rather than forking. Keeps one codebase; private build = overlay on, public = overlay off.
- **Remaining verify-only (deferred):** `grep -rE 'gakure'` and audit `narratives.js` for residual character names before any public release.
