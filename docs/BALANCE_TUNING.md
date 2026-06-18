# Balance & Tuning Report (Step 6)

> Generated from `scripts/balanceSweep.mjs` (run: `node scripts/balanceSweep.mjs`), which drives the
> live formulas from `docs/SIMULATION_MODELS.md`. **No code changed** — these are recommendations with
> impact/risk for design sign-off, per the no-design-change-without-approval rule.

## Executive summary
The formulas are well-behaved (no divide-by-zero, no unbounded growth — all clamped). Three tuning
observations worth a design decision; none are bugs.

**Decisions (applied 2026-06-18):**
- §1 Mission power spike → **APPLIED** as per-rank success ceiling (S=0.85, A=0.90) via `shared/utils/missionOdds.js`.
- §2 Economy early deficit → **No change** (deliberate difficulty).
- §3 S-Rank pacing → **No change** (10yr horizon kept).

## 1. Mission success — power-gap power spike
`sc = clamp(1 − risk + (pw−mp)·0.005 + Σmods, 0.10, 0.97)`

| gap (pw−mp) | risk 0.30 | risk 0.45 | risk 0.60 |
|---|---|---|---|
| 0 | 0.70 | 0.55 | 0.40 |
| +40 | 0.90 | 0.75 | 0.60 |
| +84 | 0.97 (cap) | 0.97 (cap) | ~0.82 |
| +120 | 0.97 | 0.97 | 0.97 |

- **Finding:** at typical risk 0.45, success caps at the 0.97 ceiling once power gap ≥ **+84**. Missions become near-trivial.
- **Compounding factor:** `Σmods` (synergy + bonds + clan + prep + jutsu + chemistry) can add **~+0.30** before any power advantage. A maxed squad hits the 0.97 cap on most non-S missions regardless of power.
- **Recommendation (Low risk):** leave the clamp (the 3% residual fail is healthy), but consider **risk floors per rank** (e.g. S-rank `risk ≥ 0.5`) so end-game missions retain tension. *Impact:* preserves late-game stakes. *Effort:* S (data-only).

## 2. Economy — deficit threshold
`net = income − Σ(500+400·ri) − staffSal − maintenance`

| roster (avg ri≈1) | shinobiSal | net @12k income, 7k fixed |
|---|---|---|
| 5 | 4,500 | **+500** |
| 10 | 9,000 | −4,000 |
| 20 | 18,000 | −13,000 |

- **Finding:** at a 12k income / 7k fixed-cost baseline, the roster goes **net-negative past ~6 shinobi**. Three negative months → 25% monthly crisis roll (`adv.js:1393`).
- **Recommendation (Medium risk):** ensure early-game income (trade routes/contracts/daimyo) scales with roster, **or** cap starting roster size. *Impact:* prevents new players spiraling into forced crises. *Effort:* S–M. **Needs design intent** — the deficit pressure may be deliberate difficulty.

## 3. Progression — time-to-S-Rank
Tenure gate `(ri+1)·12` months stacks: 12 + 24 + 36 + 48 = **120 months (10 in-game years)** minimum to S-Rank, even with perfect stats (power thresholds `[30,55,78,90]` are reached far sooner).

- **Finding:** progression is **tenure-bound, not skill-bound** past mid-game. Stats plateau against the wall of required months.
- **Recommendation (Low risk):** confirm 10-year S-Rank horizon is intended for the campaign length. If shorter arcs are desired, soften gates to `(ri+1)·9` → 7.5yr. *Impact:* faster elite progression. *Effort:* S (one-line).

## 4. KIA risk (informational, no change)
Healer level 0/1/2 → 8% / 4% / 2% KIA per failed mission. A maxed healer quarters lethality — a strong, sensible incentive. No change recommended.

## Parameter table (current values, for reference)
| Param | Location | Value |
|---|---|---|
| success per power point | `adv.js:925` | `0.005` |
| success clamp | `adv.js:925` | `[0.10, 0.97]` |
| KIA base (hL 0/1/2) | `adv.js:978` | `0.08 / 0.04 / 0.02` |
| KIA clamp | `adv.js:978` | `[0.005, 0.15]` |
| salary | `adv.js:767` | `500 + 400·ri` |
| tenure gate | `adv.js:766` | `(ri+1)·12 mo` |
| power thresholds | `adv.js:765` | `[0,30,55,78,90]` |
| capture chance | `beastEngine.js` (M-CAP-1) | `clamp(0.35+gap·0.01, 0.05, 0.95)` |
| deficit-crisis trigger | `adv.js:1393` | `≥3 deficit mo, 25%/mo` |
