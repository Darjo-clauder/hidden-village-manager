# Session Handoff — Hidden Village Manager

**Last updated:** 2026-06-19 · **HEAD:** `2dcd940` · **Branch:** `master` · **Tests:** 388 passing / 36 files

This document lets a fresh session pick up cold. Read it top to bottom before touching code.

---

## 1. What this project is

A **Naruto-themed village management sim** being reshaped into a **Franchise Hockey Manager (FHM)-style sports simulator**. Express + Socket.IO backend, Vite + vanilla-JS ES-module frontend, Supabase persistence.

This is a **private Naruto-IP build** — **keep all Naruto namesakes and IP** (clans, villages, jutsu, tailed beasts). A public IP-neutral version is a future goal, but do **not** scrub names now.

---

## 2. Repo & workflow rules (IMPORTANT)

- **Canonical repo:** `C:\Users\Tyler\ninja\hidden-village-manager` — do all work here.
- **Stale mirror:** `C:\Users\Tyler\hidden-village-manager` (the "Darjo" copy) — **never edit**; fast-forward only.
- **GitHub:** `github.com/Darjo-clauder/hidden-village-manager`.
- **Every commit:** push origin from `ninja`, then in the mirror: `git fetch origin && git merge --ff-only origin/master`.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Platform is **Windows / PowerShell** primary; a Bash tool is also available (Git Bash). `dist/` is gitignored.

### Build vs. dev — READ THIS
- The preview server (`server.js`, port 3000) serves the **static `dist/` bundle**. **Source edits do NOT appear until you run `npx vite build`.** (Vite dev w/ HMR is port 5173, not what the preview uses.)
- The **vitest suite runs real source** and is the authoritative correctness check: `npx vitest run`.

### Browser playtest technique
1. Add a temp debug hook in `client/js/main.js` after `setAdvFn(adv)`: `window.__G = G`
2. `npx vite build`
3. Drive via preview_eval. Bootstrap a game:
   ```js
   window.showSetup();
   document.getElementById('sp-vname').value='Konoha';
   document.getElementById('sp-kname').value='Tester';
   [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='🍃').click();
   window.beginGame();
   const G = window.__G;
   ```
   Then call `window.adv()` to advance months, `window.sp('panelId')` to switch panels, inspect `G`.
4. **Revert the `window.__G` line and rebuild before committing.**

---

## 3. The strategic arc (why the recent work happened)

The user audited the game against FHM and decided: **before adding more flavor, build a functioning sports loop.** Strategy = **repurpose existing systems**, don't rebuild. The mental model that now drives everything:

```
REGULAR SEASON  →  PLAYOFFS  →  OFFSEASON
(monthly missions   (Chunin Exam = farm/prospects,   (roster moves)
 + league table)     Nation War = big leagues)
```

- **Chunin Exam = the farm system / "little league":** genin/chunin **squads**, bi-annual (M4, M10), promotes prospects up.
- **Nation War = the big leagues:** Jonin+ **elite squads**, annual (M12), shinobi **die**.
- Both are 5-village brackets **seeded by the season standings**. The standings are fed by rival-vs-rival sims **and the player's real monthly mission form**.

---

## 4. Architecture map

- **`client/js/adv.js`** (~2500 lines) — the master monthly tick (`adv()`). All economy, missions, rival sim, season matchday, schedulers live here. Game state is the global `G` object (built by `initState()` in `state.js`).
- **`client/js/state.js`** — `G` init, the shinobi generator `mS(ri)`, rival roster generator `genVillageRoster(v)`, squad/finance helpers, `seedPhase1` data wiring.
- **`client/js/main.js`** — imports every panel, exposes functions on `window` for inline `onclick` handlers. **New panel functions must be exposed here.**
- **`client/js/panels/*.js`** — one file per UI panel; each exports a render fn + action fns.
- **`shared/utils/*.js`** — **pure, tested** logic (season, missionEngine, economy, bloodline, formation, debt, etc.). Prefer putting new logic here with tests.
- **`tests/*.test.js`** — vitest; deterministic RNG harness in `tests/helpers/rng.js` (`withSeed`, `stubRandom`).

### The core loop in code
1. Player assigns missions (`panels/missions.js`) → squads (`panels/squads.js`), depth chart, formation.
2. `adv()` resolves missions (`missionEngine.js` event resolution), updates economy, runs the **season matchday** (`season.js`), ticks rivals, fires events, schedules Exam/War.
3. Standings accrue → seed the Exam (`panels/exam.js`) and War (`panels/war.js`).

---

## 5. What's been built (recent → older)

| System | Files | Notes |
|---|---|---|
| **Economy fix** (`2dcd940`) | `shared/utils/economy.js`, `adv.js`, `panels/finances.js`, `panels/dashboard.js` | `villageRevenue(rep,prestige)` = baseline "ticket revenue". Was bankrupt in 2 months; now passive ~-7k/mo (8mo runway), active solvent+growing. Displays now accurate. |
| **Nation War** (`437efbf`) | `panels/war.js`, `adv.js` (M12 trigger) | Annual Jonin+ elite bracket; KIA with jinchuriki ×0.35 / bloodline ×0.6 survival edge; champion + war veterans; memorial/chronicle for fallen; rival roster replenishment. NATION WAR tab in competitions panel. |
| **23→50 rosters + cap** (`eb264c9`) | `state.js` | Every village 50-ninja roster (war-ready pyramid). Chunin Exam cap = 24 (8 squads). |
| **Squad-based Chunin Exam** (`417fce0`) | `panels/exam.js` | Exam pits squads vs squads (was solo); rivals field cells from rosters; promotions to surviving squad members. |
| **23-ninja rosters** (`417fce0`) | `state.js` `genVillageRoster` | (superseded to 50 above). Player starts ~15, grows. |
| **Event-based missions + form→standings** (`ab850f7`) | `shared/utils/missionEngine.js`, `adv.js` | 3-phase resolution (Infiltration/Engagement/Extraction); quality bands decisive/narrow/costly/disaster (balance preserved — `sc` still decides success). Monthly mission margin biases the player's league matchday. |
| **Season league table** (`99476ac`) | `shared/utils/season.js`, `adv.js`, `panels/exam.js` | Monthly round-robin matchday → W/D/L/pts table; seeds the bracket; archived + reset when champion crowned. |
| **Exam → 5-village bracket + stage depth** (`43db9b0`, `fd9d4b0`) | `panels/exam.js` | 4 stages (Qualifier/Forest/Semifinal/Final); judge bias, sabotage, marquee duels, forest injuries, champion crowning. |

Earlier session work (pre-FHM-pivot): audit fixes (B-IDEMP-1 beast inflation, O-1/O-2, M-CAP-1, B-RISK-1 success ceilings), v2 systems behind flags (bloodline active layer, nation HUD, formation, support events, debt) — **all flags default ON for playtest**.

---

## 6. Known open items / findings

- **Rep/morale decay too steep (open):** a year of zero missions decays reputation→0 and morale 75→30. Intended "you must play" pressure, but the rate likely needs softening. Found in the full-year economy playtest.
- **War/Exam stage logic lives in panels**, verified by browser playtest, not unit tests. Worth extracting stage math to a shared pure util with tests.
- **Nation War KIA on rivals** permanently removes roster ninja; replenishment exists (`adv.js` village tick, recruits toward 40) but is light — watch for rival roster depletion over many years.
- **Month-12 war trigger** fires during the tick that also rolls to month 1 of the next year (cosmetic ordering quirk; works).

## 7. Remaining FHM gaps (ranked, NOT yet built)

The user paused late-game content to polish the core loop. Candidate next steps:
1. **Loop polish** (current focus): rep/morale decay tuning, **standings visible in the main loop/dashboard** (currently only in Exam panel), **season-phase clarity** (yearly rhythm/countdowns), **mission-as-game feedback** (surface decisive/disaster outcomes).
2. **Hard salary cap** (payroll ceiling by village tier — the central FHM roster-construction tension).
3. **Owner/council mandate + dismissal** (annual goals, no-confidence).
4. **Statistical record layer** (season stat lines, league leaders, awards).
5. Aging/regression curve, contract depth (two-way/clauses/buyouts), budget-allocation sliders, draft order/pick trading.

---

## 8. Operating style (how the user works)

- **Senior-dev-partner micro-milestone mode:** one focused goal at a time; after each commit, run a quick QA pass + re-anchor; pivot when a system is solved (avoid circular polish).
- **No trailing summaries / recaps.** End responses with: one-line status + one-line next step.
- **"go" / "proceed" = full autonomy** for that task — don't ask sub-questions mid-implementation.
- Confirm genuine forks with a quick question; otherwise act and report.
- The user playtests with partners — **playtest readiness is a recurring gate**.

## 9. First moves for the new session

1. Read this doc + the auto-memory (`MEMORY.md` index loads automatically).
2. `git -C C:\Users\Tyler\ninja\hidden-village-manager status` (expect clean) and confirm HEAD matches.
3. `npx vitest run` (expect 388 passing).
4. Ask the user which polish target to take next (see §7.1), or continue whatever they were mid-stream on.
