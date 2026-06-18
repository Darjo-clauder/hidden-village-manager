# Hidden Village Manager — Simulation Model Pack

> **Status:** Reverse-engineered from the live engine (post-fix build) by the Opus verification pass.
> Every equation is anchored to `file:line`. Where a term is computed by a helper whose internals
> were not fully read, it is named and cited at the interface level (engineers should confirm internals
> before writing tight-tolerance assertions). All randomness is `Math.random()` (uniform [0,1)) unless noted.

## 0. Global conventions

| Symbol | Meaning | Source |
|---|---|---|
| `G` | Root game state object (200+ fields, JSONB-persisted) | `state.js` |
| `s` | A shinobi record | `state.js` genShinobi |
| `s.ri` | Rank index 0=Genin,1=Chunin,2=Jonin,3=ANBU,4=S-Rank | `state.js` |
| `sPow(s)` | Scalar combat power of a shinobi | `state.js` (helper) |
| `sqP(sq)` | Aggregate squad power | `state.js` (helper) |
| `clamp(x,lo,hi)` | `min(max(x,lo),hi)` | `state.js` |
| `rnd(a,b)` | Uniform integer in `[a,b]` | `state.js` |
| `pk(arr)` | Uniform random element | `state.js` |

**Determinism note.** The engine calls `Math.random()` directly throughout — there is **no seedable RNG**.
To make any of these models deterministic for tests, inject a seeded PRNG (e.g. mulberry32) behind the
`rnd`/`pk`/`Math.random` call sites, or stub `Math.random` in the test harness. This is prerequisite #1
for the Deterministic Test Suite (step 5).

---

## 1. Economy

### State variables
| Var | Type | Notes |
|---|---|---|
| `G.ryo` | bigint-ish number | Treasury. Never asserted ≥ 0 except in crisis path |
| `G.tradeRoutes[]` | `{active, income}` | |
| `G.contracts[]` | `{active, income}` | |
| `G.beasts[]` | `{sealed, n, jk}` | Niryuu sealed → +3000/mo |
| `G.finances` | `{history[], deficitMonths, healthTier, missionCommissions{D..S}, examFees, loanFees}` | |
| `sb` | staffBonus() output | `tradeIncomeMultiplier`, mission bonuses |

### Update rule (monthly snapshot) — `adv.js:1344-1363`
```
trI   = round( Σ active tradeRoutes.income  × sb.tradeIncomeMultiplier )
coI   = round( Σ active contracts.income    × sb.tradeIncomeMultiplier )
jkI   = (#sealed Niryuu with jk) × 3000  + (G._kurenigykiBonus ? 5000 : 0)
daimyoB = round( computeDaimyoBonus() × (G.daimyoBudgetMult ?? 1) )
maintenance = computeMaintenance()                          # adv.js:164
shinobiSal  = Σ s.salary                                    # salary = 500 + ri*400
staffSal    = Σ staff.salary

totalIncome = trI + coI + jkI + daimyoB + examFees + loanFees + sponsorship
totalExpend = shinobiSal + staffSal + maintenance
monthlyNet  = totalIncome − totalExpend

G.ryo += totalIncome
G.ryo −= totalExpend
```

### Deficit spiral — `adv.js:1393-1405`
```
if monthlyNet < 0:  deficitMonths += 1
   if deficitMonths ≥ 3 and rand < 0.25:  apply pk(FINANCIAL_EVENTS); G.ryo = max(0, G.ryo+ev.ryo)
else: deficitMonths = 0
```

### ⚠ Invariant caveat (important for conservation tests)
`monthlyNet` (the snapshot) is **NOT** the full Δ`G.ryo` for the month. Other flows mutate `G.ryo`
**outside** the snapshot:
- Mission rewards `G.ryo += m.ryo` — `adv.js:928, 1033`
- Mission commissions `recordMissionCommission` — `adv.js:185`
- District/council/underworld passives — `adv.js:532, 548, 552`
- World-choice events, raids, black market, safehouses — various

**Conservation assertion an engineer should add:**
```
ΔG.ryo_month == Σ(all credited flows) − Σ(all debited flows)
```
Track every `G.ryo +=`/`-=` site (there are ~20). The snapshot's `net` field is a *reporting* figure,
not a ledger total — do not assert `ΔG.ryo == snap.net`.

### Invariants
- `I-ECON-1`: `Number.isFinite(G.ryo)` after every tick (no NaN). High priority — Sonnet smoke check.
- `I-ECON-2`: `shinobiSal == Σ(500 + 400·s.ri)` exactly (catches salary desync).
- `I-ECON-3`: `deficitMonths` resets to 0 on any non-negative net month.

---

## 2. Mission Resolution

### 2a. Squad mission success — `adv.js:889-927`
```
syn   = sqSynergy(sq, shinobi)                  # {powerMult, successMod}
rawPw = sqP(sq) + (leader.pers.n=='Charismatic' ? 5 : 0)
pw    = round( rawPw × syn.powerMult )

sc = clamp(
        1 − m.risk − prepRiskMod
        + (pw − m.mp) × 0.005
        + iB + syn.successMod + bondBonus
        + sb.missionSuccessBonus + sb.squadMissionBonus
        + anbuBon + rB2.missionBonus − rB2.riskReduction
        + chemBonus + prepMod + sqJutsuMod
        + dp.missionRiskReduction + cp.successMod + sqBondMod
        + clP.successMod + shP.opSuccessBonus + sqDeclineMod,
     0.1, 0.97)

success ⇔ rand < sc
```
Modifier sources: `prepMod/prepRiskMod` from `G.missionPrepMode` (`±0.08/±0.06`, `±0.04/∓0.03`) `adv.js:909-910`;
`chemBonus` = +0.02 per pair with ≥5 missions together, cap +0.06 `adv.js:897-907`;
`sqJutsuMod` = Σ `jb.successMod·0.5 + jb.powerMod·0.25`; `clP.successMod` = clan passives (§4).

### 2b. KIA risk on a *failed* mission — `adv.js:978, 1058`
```
hL = squad healer level (0/1/2+)
kR = clamp( (hL≥2 ? 0.02 : hL≥1 ? 0.04 : 0.08) + dp.kiaRiskMod, 0.005, 0.15 )
KIA ⇔ rand < kR        # unless jkKIAImmune(s) fires (once/yr, Sakeru/Kureni) adv.js:45-56
```

### 2c. Beast capture — `adv.js:867`
```
ok ⇔ rand < clamp(0.35 + (sPow(s) − b.pow)·0.01)   # no explicit clamp in code → can exceed [0,1]
```
> **Audit flag M-CAP-1:** capture chance is unclamped. If `sPow−pow ≥ 65`, chance ≥ 1.0 (always);
> if `≤ −35`, chance ≤ 0. Probably intended but should be `clamp(..,0.05,0.95)` for honesty.

### Randomness model
One `rand` for success; on failure one `rand` for KIA, then injury rolls. Capture is one `rand`.

### Invariants
- `I-MIS-1`: `0.1 ≤ sc ≤ 0.97` always (clamp guarantees). Test the clamp boundaries.
- `I-MIS-2`: `0.005 ≤ kR ≤ 0.15` always.
- `I-MIS-3`: on success, `s.wins` increments by exactly 1 and `s.streak += 1`; on KIA the shinobi is removed and pushed to `G.memorial`.
- `I-MIS-4` (deadlock guard): every `am` with `daysLeft ≤ 0` is resolved or early-returned — no assignment can persist with `daysLeft < 0` and `status=='mission'`.

---

## 3. Progression & Leveling

### Update rule — `adv.js:765-771`
```
thresh = [0, 30, 55, 78, 90]                       # min sPow for rank ri
promote ⇔ s.ri < 4
        ∧ sPow(s) ≥ thresh[s.ri+1]
        ∧ s.months ≥ (s.ri+1)·12                    # tenure gate (months served)
        ∧ s.status == 'available'
on promote: s.ri++; s.salary = 500 + s.ri·400; addLegend(s.ri·3)
```
Stat growth, peak-age decline (`careerEngine.js:8` sets `peakAge` by rank), and `declineMod` feed `sPow`.

### Invariants
- `I-PROG-1` (monotonic rank): `s.ri` never decreases.
- `I-PROG-2` (XP/wins monotonic): `s.wins` is non-decreasing.
- `I-PROG-3`: salary is a pure function of rank: `s.salary == 500 + 400·s.ri` immediately post-promotion.
- `I-PROG-4`: tenure gate — no Genin promoted before 12 months, no Chunin before 24, etc.

---

## 4. Trait & Clan Interactions

### Clan passives — `shared/constants/clans.js:98-123`
```
activeClanIds = { s.clan.toLowerCase() : s ∈ shinobi, s.status=='available', s.clan }
for clanId in activeClanIds:
    clan = CLAN_BY_ID[clanId];  if !clan: continue          # 6 canonical clans only
    if (G.clanApproval[clanId] ?? 100) < clan.approvalNeeded: continue
    result += clan.passive                                   # successMod, growthBonus, kiaRiskMod, ...
```
> **Post-fix note:** region-sourced clans now resolve (O-2 fix). The 6 passive-bearing clans are
> `kageha, shiromi, kagero, tsuchida, okamura, mushiba`; `tamashii, fuma, mori` exist as flavor clans
> (`constants.js:1`) with stat bonuses but **no** council passive — that asymmetry is by design but
> worth surfacing in UI.

### Trait interactions (interface-level)
- `pers.n == 'Charismatic'` leader → +5 raw squad power `adv.js:890`.
- Trauma traits (`TRAUMA_TRAITS`) applied via `applyTrauma(s)` `adv.js:122`; affect commitment/morale.
- Bonds (`bondMissionBonus`) contribute `successMod` (half-weighted per member) `adv.js:916-919`.

### Invariants
- `I-CLAN-1`: passives apply **iff** clan has an available member **and** approval ≥ threshold (5 passing tests in `clans.test.js`).
- `I-CLAN-2` (post-fix): every `REGIONS[].clanAffinity` name ∈ `CLANS.map(n)` — guarded by `regions.test.js`.

---

## 5. Beast Systems

### Sync stage — `beastEngine.js:266-287`
```
SYNC_STAGES   = [Unsealed, Rejection, Suppression, Coexistence, Cooperation, Full Sync]   # indices 0..5
STAGE_THRESHOLDS = [0, 3, 6, 12, 18, 999]   # min syncMonths for stage i
getSyncStage(b):
    if !b.sealed or !b.jk: return 0
    m = b.syncMonths; ceil = BEAST_DATA[b.n].syncCeiling ?? 5
    return max i in [1..5] s.t. m ≥ THRESHOLDS[i-1] and i ≤ ceil   (else 1)
```

### Stat application — `beastEngine.js:290-302`
```
applyBeastStats(s,b): bonus = BEAST_DATA[b.n].statBonus[stage];  s.stats[k] = clamp(s.stats[k]+bonus[k], 0, 99)
```
> **Audit flag B-IDEMP-1 (corroborates Sonnet B-2):** if `applyBeastStats` runs on every load/tick
> without first removing the prior stage's bonus, stats inflate on repeated save/reload. Engineers must
> verify the bonus is applied as a *delta on change of stage*, or recomputed from a clean base — not
> additively each tick. **This is the single highest-risk invariant in the beast system.**

### Village passive — `beastEngine.js:193, 504-521`
```
getBeastPassives(G).missionLuck = Σ sealed beasts' passiveVillage.missionLuck   # e.g. +0.10
G._beastMissionLuck = beastPassives.missionLuck                                  # consumed in mission tick
```

### Invariants
- `I-BEAST-1` (idempotency): for fixed `syncMonths`, repeated `applyBeastStats` calls must NOT change `s.stats` (currently **unproven** — write this test first).
- `I-BEAST-2`: `0 ≤ getSyncStage ≤ min(5, syncCeiling)`.
- `I-BEAST-3`: unsealed/jk-less beast ⇒ stage 0 ⇒ no stat bonus, no passive.

---

## 6. Squad Formation & AI

### State: `G.squads[] = {id, members[], leaderId, wins, losses, cohesion, monthsActive, ...}`
- Power: `sqP(sq)`; synergy multiplier & success mod: `sqSynergy(sq, shinobi)` (`synergy.js`).
- Role bonuses: `roleBonus(sq)` (`depthEngine.js`) → `{missionBonus, riskReduction}`.
- Depth AI auto-promotion: `depthEngine.js:69-94` — if a starter is unavailable, the highest-rated
  eligible bench member is promoted into the role for that month (`promotionRule` ∈ auto/manual/locked).
- Bond formation: `tryFormBonds(sq)` fires once `sq.wins ≥ 5` `adv.js:975`.
- Cohesion: `sq.cohesion = min(100, prev + rnd(3,7))` per win `adv.js:929-930`.

### Invariants
- `I-SQ-1`: `0 ≤ cohesion ≤ 100`.
- `I-SQ-2`: a shinobi appears in at most one squad's `members`.
- `I-SQ-3`: `leaderId ∈ members`.

---

## 7. Inbox / Event Engine

- People-management meetings selected by type weighting — `adv.js:1738-1751`
  (`milestone` if `wins%25==0`, `promotion` if tenure>12 ∧ ambition≥13 ∧ rand<0.18, etc.).
- World calendar events: `getEventForMonth` / `resolveWorldEvent` (`shared/constants/worldCalendar.js`).
- Choice events resolved by `resolveChoiceEvent(fnKey)` `adv.js:260-275` — each branch mutates
  `G.ryo/morale/reputation` by fixed amounts.

### Invariants
- `I-INBOX-1`: every inbox item has a resolvable handler (no orphaned `fnKey`).
- `I-INBOX-2`: resolving an event removes it from the queue exactly once (no double-apply).
- `I-INBOX-3`: morale/reputation stay clamped `[0,100]` / `[0,999]` after every event branch.

---

## Appendix A — Worked example (Mission Resolution, deterministic)

**Setup:** squad power `sqP=70`, `syn={powerMult:1.1, successMod:0.05}`, leader not Charismatic,
mission `m={risk:0.45, mp:60, ryo:8000, rep:6, rk:'B'}`, all other modifiers 0, `prepMode='balanced'`.
```
pw = round(70 × 1.1) = 77
sc = clamp(1 − 0.45 − 0 + (77−60)×0.005 + 0.05, 0.1, 0.97)
   = clamp(1 − 0.45 + 0.085 + 0.05) = clamp(0.685) = 0.685
```
Inject `Math.random=()=>0.50` → 0.50 < 0.685 ⇒ **success**: `G.ryo += 8000`, `rep += 6`, `morale += 3`,
`sq.wins++`, each member `wins++`, `streak++`. Expected post-state snapshot is fully determined.

Inject `Math.random=()=>0.90` → 0.90 ≥ 0.685 ⇒ **failure**, then KIA roll with `kR` per §2b.

## Appendix B — Worked example (Economy, deterministic)

`tradeRoutes=[{active,income:1500}]`, `contracts=[]`, no beasts, `sb.tradeIncomeMultiplier=1`,
`daimyoBonus=0`, `maintenance=2000`, 4 shinobi at ri=[0,0,1,2] ⇒ `shinobiSal = 500+500+900+1300 = 3200`,
`staffSal=600`.
```
totalIncome = 1500;  totalExpend = 3200+600+2000 = 5800;  monthlyNet = −4300
G.ryo decreases by 4300 (from snapshot flows alone); deficitMonths += 1
```
