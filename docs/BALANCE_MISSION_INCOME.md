# Balance finding — mission income under active play (2026-08-03)

Verified in a driven browser game at `6b29093`, per the flag raised in `c515689`.

## Method

Two runs, same build, same driver, both answering every decision the same way.
The only difference is that one assigns missions through the real UI path
(`oA` → click a `.pi` with `doA`), three per month where shinobi are available.
24 months each.

This matters because the original flag came from the test harness, which
compares against an idle baseline that *also* never answers decisions — many of
which grant resources. That inflated the apparent gap.

## Result

| month | idle | active | ratio |
|---:|---:|---:|---:|
| 6  | 96,235  | 102,557   | 1.07× |
| 12 | 115,476 | 405,368   | 3.51× |
| 18 | 142,384 | 855,161   | 6.01× |
| 24 | 193,885 | 1,447,786 | 7.47× |

76 missions run, 1 death, roster 22 → 21.

**The harness's ~26× was an overstatement.** The real figure is ~3.5× at year 1
and ~7.5× at year 2. But the shape is worse than a constant multiplier: the
ratio is *widening*, and late in the active run the treasury gains ~100k every
month with no sign of levelling off. Financial health reads "Thriving" from
early year 2 onward.

## Mechanism — it is not the mission payouts

The obvious reading is "missions pay too much." That is not what the numbers
say. The dominant term is **reputation**, and missions are the reputation
faucet.

`villageRevenue()` in `shared/utils/economy.js`:

```
BASE_REVENUE (22,000)
  + min(rep, 200) × 400
  + max(0, rep − 200) × 100     ← REP_SOFT_CAP diminishing returns
  + PRESTIGE_REVENUE[tier]
```

The active run finished at **rep 296, tier B**, giving
`22,000 + 80,000 + 9,600 + 9,000 = 120,600/month` — which is exactly what the
Finances panel showed, so the model is confirmed rather than inferred.

For comparison:

- fresh village (rep 10, D): **26,000**
- at the soft cap (rep 200, D): **102,000**

So the soft cap is doing its job on the *slope* past 200 — marginal reputation
is worth 100 rather than 400. The problem is the *level* it caps at. Reaching
rep 200 costs nothing but time and three missions a month, and at that point
village revenue alone is ~4× a fresh village's, against a payroll that has not
grown anything like as fast.

This is the same multiplicative-reputation effect that had to be damped in the
legacy bequest (`f86bc09`), showing up in the main loop rather than the
meta-loop.

## What this does and does not mean

- The early economy genuinely is tight — for a player who does not run
  missions. Every "lean start" validation to date, including the 2026-06-25
  economy overhaul, was measured without mission resolution ever executing.
- Mid-game has no economic pressure at all. Prestige sinks (grand works, the
  Grand Festival) exist and are affordable long before they are interesting.
- Nothing here is a bug. The systems do what they were written to do; they were
  simply never measured together.

## Options, not recommendations

Deliberately not tuned — this wants a design call, and any change should be
re-measured with the same two-run method.

1. **Flatten the sub-cap rate.** 400/rep below 200 is the single steepest term
   in the game. Lowering it compresses the whole curve without touching missions.
2. **Lower REP_SOFT_CAP.** Cheaper than (1) and more targeted, but it makes
   reputation feel less rewarding earlier.
3. **Make reputation decay or cost.** Rep currently only ratchets up. A carrying
   cost (upkeep scaling with standing) would make it a resource rather than a score.
4. **Grow payroll with standing.** Wage demands that track reputation would let
   income rise while keeping net pressure roughly constant.
5. **Leave it.** If the intended fantasy is "a well-run village becomes rich",
   this is working. The cost is that the finance screen stops being a decision
   surface after year 2.

Option 4 is the one that preserves the existing feel while restoring pressure,
but it is the largest change and interacts with the salary cap.
