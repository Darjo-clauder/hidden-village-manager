# Simulation Model Pack v2 — New-System Specs (PROPOSALS)

> **Status:** Design proposals + Stage-0 reference sims. **No game code changed.**
> Builds on `SIMULATION_MODELS.md` (v1, the 7 existing systems). This doc covers the **net-new**
> systems requested (Nation, Bloodline/Jinchuriki active layer, HUD) reconciled to the real engine.
> Every guardrail number is backed by a runnable script (`scripts/bloodlineSweep.mjs`, `scripts/hudContrast.mjs`).

## 0. Reconciliation — template vs real engine
The brief's templates use generic terms; this spec maps them to what actually exists so engineers can implement without inventing a parallel game.

| Template term | Real engine binding |
|---|---|
| `reserves` / `gold` | `G.ryo` (bigint-ish, ≥0 in practice) |
| `resolveMission(baseDifficulty − skillRating + noise)` | real `sc = clamp(1 − risk + (pw−mp)·0.005 + Σmods, 0.1, successCeiling(rank))` (`adv.js:925/1024`) |
| `bloodline.multiplier` (active) | **NEW** — current bloodlines are *passive* (`shared/constants/clans.js` passives; beast `statBonus`/`passiveVillage`) |
| "Nation" | maps onto the 5 great-village identities (themed on `REGIONS`) |

**Design-change flags:** active bloodline activation, aggro, cooldowns, post-use debuffs, and the nation HUD are **all new design**. They are specced here but gated behind explicit approval before any code (per execution rules).

---

## 1. Nation Systems (proposal)
### State variables
| Var | Type | Range |
|---|---|---|
| `G.nationId` | enum | one of `ember, tempest, tide, dune, stone` |
| `nation.identity` | `{name, crest, accent}` | static table |
| `nation.traitMods` | `{successMod, ryoMod, ...}` | each ∈ [−0.1, +0.1] |
| `G.nationWinStreak` | int ≥0 | telemetry/affinity |

### Update rule
Nation trait mods fold into the **existing** `Σmods` term of `sc` and into economy income multipliers — no new resolution path:
```
sc_mods += nation.traitMods.successMod          # one term, existing clamp unchanged
income  *= (1 + nation.traitMods.ryoMod)        # existing economy snapshot
```
### Invariants
- `I-NAT-1`: exactly one `nationId` set; unknown id ⇒ neutral (all mods 0).
- `I-NAT-2`: `|Σ nation.traitMods.successMod| ≤ 0.1` (nation never dominates the success formula).

---

## 2. Nation HUD Spec (proposal)
### Palette (verified — `node scripts/hudContrast.mjs`)
| Nation | Theme | Accent | Contrast vs `#0d0d0f` | AA text |
|---|---|---|---|---|
| Ember | Fire | `#ff5a3c` | 6.27 | ✅ |
| Tempest | Lightning | `#ffd24a` | 13.47 | ✅ |
| Tide | Water | `#46b5ff` | 8.61 | ✅ |
| Dune | Wind | `#e6b873` | 10.60 | ✅ |
| Stone | Earth | `#7bd88f` | 11.15 | ✅ |

All ≥ 4.5:1 (WCAG AA for normal text). Crests use emoji already in `REGIONS`.

### Element mapping
| HUD element | Bound to |
|---|---|
| Sidebar crest + name tint | `nation.accent` |
| Treasury/resource bar fill | `nation.accent` (state colors `--green/--red` still override on alert) |
| Event banner border | `nation.accent` at 40% alpha |
| Alert accent | `brighten(nation.accent, 15%)` |

### Dynamic rules
```
if anyJinchurikiActive():  HUD.pulse = true;  alertAccent = brighten(nation.accent, 0.15)
else:                      HUD.pulse = false
```
- Pulse = CSS keyframe on the crest only (no full-screen flashing — photosensitivity safe; ≤3 Hz).

### Accessibility
- **Colorblind mode** (`G._a11yColorblind`): replace hue-only cues with **pattern overlays** — Ember=diagonal hatch, Tempest=dots, Tide=horizontal lines, Dune=cross-hatch, Stone=solid+border. Never rely on color alone for nation identity.
- Contrast floor enforced at 4.5:1 (verified above); state colors (`--red` alerts) take priority over nation tint.

---

## 3. Bloodline / Jinchuriki Active Layer (proposal, reconciled)
> **Big decision (see gate):** this is an *active* layer **on top of** the existing passive sync-stage
> system, OR a replacement. Spec below assumes **additive opt-in activation** that does not remove
> existing passives.

### State variables
| Var | Type | Range |
|---|---|---|
| `beast.activeUntil` | int (month) or null | activation window |
| `beast.cooldownUntil` | int (month) or null | post-use lock |
| `s._blDebuffUntil` | int (month) or null | post-use debuff window |
| `ACTIVATION_COST` | int (ryo) | **1500–3000** (sweep-derived sink) |
| `MAX_BLOODLINE_BONUS` | float | 0.35 (global clamp) |

### Activation pseudocode (gated on sync stage, costs ryo)
```
function activateBloodline(beast, G):
    s = jinchuriki(beast)
    if getSyncStage(beast) < ACTIVATION_MIN_STAGE: return fail('not synced enough')   # gate on existing system
    if beast.cooldownUntil and G.month < beast.cooldownUntil: return fail('cooldown')
    if G.ryo < ACTIVATION_COST: return fail('insufficient ryo')
    if squadActivationsThisMission(s.squad) >= 1: return fail('rate limit (1/squad/mission)')
    G.ryo -= ACTIVATION_COST                       # resource sink
    beast.activeUntil = G.month + ACTIVE_DURATION
    beast.cooldownUntil = G.month + COOLDOWN
    s._aggro = (s._aggro||0) + AGGRO_INCREASE       # tradeoff: rivals target harder
    return ok
```
### Resolution (folds into the REAL sc, with guardrails)
```
rawBonus = Σ(beast.multiplier for active beasts on this squad)        # rate-limited to 1
effBonus = min( rawBonus / (1 + rawBonus/SOFTCAP_THRESHOLD), MAX_BLOODLINE_BONUS )   # softcap + clamp
sc_mods += effBonus                                                   # existing clamp(...,0.1,ceiling) still applies
```
### Post-use transition (explicit tradeoff)
```
when beast.activeUntil reached:
    s._blDebuffUntil = G.month + DEBUFF_DURATION    # squad effectiveness −DEBUFF% while set
    beast stays on cooldownUntil
```
### Guardrails (all enforced)
- **Softcap:** `eff = raw/(1+raw/0.5)` — diminishing returns.
- **Global clamp:** `MAX_BLOODLINE_BONUS = 0.35`.
- **Rate limit:** 1 activation / squad / mission.
- **Resource sink:** cost 1500–3000 ryo (≥1 mission's income — proven necessary by sweep §B).
- **Aggro tradeoff + post-use debuff** prevent spam.

### Invariants
- `I-BL-1`: `effBonus ≤ 0.35` always (clamp). Sweep confirms even 2 jinchuriki @0.5 → 0.333.
- `I-BL-2`: activation strictly decreases `G.ryo` by `ACTIVATION_COST`.
- `I-BL-3`: no activation while `cooldownUntil > G.month`.
- `I-BL-4`: `sc` final still ∈ `[0.1, successCeiling(rank)]` — bloodlines cannot break the success clamp.

---

## 4. Balance Sweep Results (`node scripts/bloodlineSweep.mjs`)
SWEEP_STEPS=20, SEEDS_PER_PAIR=100, base success 0.55.

**Effective bonus (softcap + clamp working):**
| multiplier | eff 1× | win 1× | eff 2× | win 2× |
|---|---|---|---|---|
| 0.05 | 0.045 | 0.62 | 0.083 | 0.63 |
| 0.24 | 0.162 | 0.65 | 0.245 | 0.68 |
| 0.50 | 0.250 | 0.68 | 0.333 | 0.75 |

**Recommended safe region:** `multiplier 0.12–0.38` (single-activation success delta +0.05..+0.12), `activationCost 1500–3000 ryo`. Below 1500 ryo the cost is absorbed by one mission's income (no sink); the 0.35 clamp keeps simultaneous activations non-dominant.

---

## 5. Deterministic Test Design (≥20 cases)
All use the `tests/helpers/rng.js` shim. Representative set (full table to be authored against real code once design is approved):

| # | Seed | Initial | Steps | Expected snapshot |
|---|---|---|---|---|
| 1 | 42 | no bloodline, base 0.55 | resolve | win ≈ baseline rate |
| 2 | 42 | 1 bloodline mult 0.25, ryo 20000, cost 1500 | activate→resolve | eff=0.162, ryo 18500, win↑ |
| 3 | 42 | 2 jinchuriki mult 0.5 | activate both | effBonus clamped ≤0.35 (I-BL-1) |
| 4 | 99 | income 0, expenses>0 | 3 ticks | ryo declines, deficit-spiral path arms |
| 5 | 7 | jinchuriki active | render HUD | pulse=true, accent brightened, contrast ≥4.5 |
| 6 | 42 | cooldownUntil>month | activate | fail('cooldown') (I-BL-3) |
| 7 | 42 | ryo<cost | activate | fail, ryo unchanged (I-BL-2) |
| 8–20 | … | zero-resource, simultaneous, max-stat, multi-nation edge cases | … | per invariants I-BL/I-NAT |

---

## 6. Rollout & Telemetry
**Stages:** 0 internal sim (this doc) → 1 closed playtest (10–20) → 2 limited A/B + telemetry → 3 full.
**Metrics:** `missionSuccessRate, avgReserves, bloodlineActivationRate, nationWinRate, incidenceOfNaN, crashRate`.
**Rollback / kill-switch:** `|missionSuccessRate − baseline| > 0.20` OR `NaN/crash rate > 0.001` → auto-disable bloodline-active flag (feature-flag gate `G._ff_bloodlineActive`).
**A/B sample size:** for ±5% success-rate detection at 80% power ≈ 1,500 missions/arm.

---

## 7. Prioritized Tasks (reconciled to reality)
| # | Task | Owner | Effort | Pri |
|---|---|---|---|---|
| 1 | **Decision:** active bloodline layer — additive vs replace existing passive | Lead Designer | S | Critical |
| 2 | Feature-flag scaffold `G._ff_bloodlineActive` + `G._ff_nationHud` | Engineer | S | Critical |
| 3 | Bloodline activation/resolution behind flag (uses real `sc`) | Engineer | M | High |
| 4 | Nation identity table + HUD tint (flagged) | UI Engineer | M | High |
| 5 | Deterministic tests (20+) for new flagged paths | Automation | M | High |
| 6 | Telemetry hooks for 6 metrics + kill-switch | Analytics | M | High |
| 7 | Colorblind pattern overlays | UI Engineer | S | Med |
| 8 | Closed-playtest plan | Producer | S | Med |
