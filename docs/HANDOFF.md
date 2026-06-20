# Session Handoff — Hidden Village Manager

**Last updated:** 2026-06-20 · **HEAD:** `3640592` · **Branch:** `master` · **Tests:** 450 passing / 43 files

This document lets a fresh session pick up cold. Read it top to bottom before touching code.

---

## 1. What this project is

A **Naruto-themed village management sim** being reshaped into a **Franchise Hockey Manager (FHM)-style sports simulator**. Express + Socket.IO backend, Vite + vanilla-JS ES-module frontend, Supabase persistence.

This is a **private Naruto-IP build** — **keep all Naruto namesakes and IP** (clans, villages, jutsu, tailed beasts). A public IP-neutral version is a future goal, but do **not** scrub names now.

---

## 2. Repo & workflow rules (IMPORTANT)

- **Canonical repo:** `C:\Users\Tyler\ninja\hidden-village-manager` — do all work here.
- **Stale mirror:** `C:\Users\Tyler\hidden-village-manager` (the "Darjo" copy) — **never edit**; fast-forward only.
- **GitHub:** `github.com/Darjo-clauder/hidden-village-manager` (Railway auto-deploys master).
- **Every commit:** push origin from `ninja`, then in the mirror: `git fetch origin && git merge --ff-only origin/master`.
- Commit messages end with: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.
- Platform is **Windows / PowerShell** primary; a Bash tool is also available (Git Bash). `dist/` is gitignored.

### Build vs. dev — READ THIS
- The preview server (`server.js`, port 3000) serves the **static `dist/` bundle**. **Source edits do NOT appear until you run `npx vite build`.** (Vite dev w/ HMR is port 5173, not what the preview uses.)
- The **vitest suite runs real source** and is the authoritative correctness check: `npx vitest run`.

### Browser playtest technique
1. `npx vite build`
2. Start server (preview tool uses `.claude/launch.json`, port 3000).
3. Drive via preview_eval. Bootstrap a game:
   ```js
   beginGame({ name: 'Konoha', kage: 'Tester', icon: '🍃', nation: 'fire' })
   sp('roster') // or any panel id
   ```
   Then call `adv()` to advance months, `sp('panelId')` to switch panels.

---

## 3. The strategic arc

The user audited the game against FHM and decided: **before adding more flavor, build a functioning sports loop.** Strategy = **repurpose existing systems**, don't rebuild. The mental model:

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

- **`client/js/adv.js`** (~2800 lines) — the master monthly tick (`adv()`). All economy, missions, rival sim, season matchday, schedulers live here. Game state is the global `G` object (built by `initState()` in `state.js`).
- **`client/js/state.js`** — `G` init, the shinobi generator `mS(ri)`, rival roster generator `genVillageRoster(v)`, squad/finance helpers, `seedPhase1` data wiring.
- **`client/js/main.js`** — imports every panel, exposes functions on `window` for inline `onclick` handlers. **New panel functions must be exposed here.**
- **`client/js/panels/*.js`** — one file per UI panel; each exports a render fn + action fns.
- **`shared/utils/*.js`** — **pure, tested** logic (season, missionEngine, economy, bloodline, formation, debt, seasonStats, awards, pressConference, etc.). Prefer putting new logic here with tests.
- **`shared/constants/coachingPhilosophy.js`** — 4 philosophies with modifier objects.
- **`tests/*.test.js`** — vitest; deterministic RNG harness in `tests/helpers/rng.js` (`withSeed`, `stubRandom`).

### The core loop in code
1. Player assigns missions (`panels/missions.js`) → squads (`panels/squads.js`), depth chart, formation.
2. `adv()` resolves missions (`missionEngine.js` event resolution), updates economy, runs the **season matchday** (`season.js`), ticks rivals, fires events, schedules Exam/War.
3. Standings accrue → seed the Exam (`panels/exam.js`) and War (`panels/war.js`).

---

## 5. What's been built (recent → older)

| System | Commit | Files | Notes |
|---|---|---|---|
| **FHM roster UI** | `3640592` | `panels/roster.js`, `main.js` | Split-panel: compact table (RANK\|NAME\|AGE\|ABILITY★\|POTENTIAL★\|STATUS\|SALARY) left + Active Assignments + quick-detail right. Click row → inline stat grid, contract clause buttons, "Full Dossier" overlay. `rosSelect(id)` exported and wired to window. |
| **FHM parity batch** | `01de722` | many | 8 features (below): |
| └ Rival decay fix | `01de722` | `adv.js` | Soft decay above 150 strength: −2–4/mo at 25% chance. |
| └ Coaching philosophy | `01de722` | `shared/constants/coachingPhilosophy.js`, `panels/kage.js` | 4 philosophies (balanced/aggressive/defensive/youth_focus) with mods on missionSuccess, kiaRisk, morale, prospectGrowth, academyCostMult. Selector in Kage panel. |
| └ Season stats + league leaders | `01de722` | `shared/utils/seasonStats.js` | `snapshotSeasonStats(G)` + `leagueLeaders(snapshot)`; December snapshot + reset. |
| └ Awards ceremony | `01de722` | `shared/utils/awards.js` | MVP (most wins), Rookie of Year, War Hero (kills), Iron Wall (zero KIA). Shown in Legacy › Records tab. |
| └ Contract depth | `01de722` | `panels/roster.js`, `panels/transfers.js`, `adv.js` | `noTrade`, `twoWay`, `buyoutCost` on shinobi. Cap excludes twoWay. noTrade blocks sell pressure. Buyout executes for 4× salary. New transfers get clauses auto-set. |
| └ Draft order + pick trading | `01de722` | `panels/legacy.js`, `adv.js` | `G.draftOrder` seeded by inverse standings each December. Legacy › Records tab shows draft order. `sellDraftPick()` removes slot, adds 8k ryo. |
| └ Budget priority sliders | `01de722` | `panels/finances.js`, `adv.js`, `state.js` | `G.budgetPriority {training, warPrep, infra}` — 3 sliders in Finances. training → dev speed mult, warPrep → war squad power bonus, infra → maintenance reduction. |
| └ Press conference / media sim | `01de722` | `shared/utils/pressConference.js`, `adv.js`, `panels/inbox.js`, `panels/war.js`, `panels/exam.js` | `G.pendingPress` queued on exam win/loss, war win/loss, win/loss streaks, KIA. Shows in inbox with 3 tone choices (confident/humble/dismissive) each with rep/morale/rivalRel effects. |
| **Economy fix** | `2dcd940` | `shared/utils/economy.js`, `adv.js`, `panels/finances.js` | `villageRevenue(rep,prestige)` baseline revenue. Was bankrupt in 2 months; now passive ~−7k/mo (8mo runway), active solvent+growing. |
| **Nation War** | `437efbf` | `panels/war.js`, `adv.js` | Annual Jonin+ elite bracket; KIA with jinchuriki/bloodline survival edge; memorial/chronicle; rival replenishment. |
| **50-ninja rosters + cap** | `eb264c9` | `state.js` | Every village 50-ninja roster; Chunin Exam cap = 24. |
| **Squad-based Chunin Exam** | `417fce0` | `panels/exam.js` | Squad vs squad (was solo); rivals field cells from rosters; promotions to surviving squad members. |
| **Event-based missions + form→standings** | `ab850f7` | `shared/utils/missionEngine.js`, `adv.js` | 3-phase resolution; quality bands decisive/narrow/costly/disaster; monthly mission margin biases league matchday. |
| **Season league table** | `99476ac` | `shared/utils/season.js`, `adv.js` | Monthly round-robin matchday → W/D/L/pts table; seeds bracket; archived + reset on champion. |

Earlier session work (pre-FHM-pivot): audit fixes (B-IDEMP-1 beast inflation, O-1/O-2, M-CAP-1, B-RISK-1 success ceilings), v2 systems behind flags (bloodline active layer, nation HUD, formation, support events, debt) — **all flags default ON for playtest**.

---

## 6. Known open items

- **Rep/morale decay too steep (open):** a year of zero missions decays reputation→0 and morale 75→30. Intended "you must play" pressure, but the rate likely needs softening.
- **War/Exam stage logic lives in panels**, not unit-tested. Worth extracting stage math to shared pure utils.
- **Nation War KIA on rivals** permanently removes roster ninja; replenishment (recruits toward 40) is light — watch for rival roster depletion over many years.
- **Month-12 war trigger** fires during the same tick that rolls to year+1 (cosmetic ordering quirk; works).
- **Preview always needs a build:** `npx vite build` required before any browser verify — Vite HMR (5173) and the preview server (3000) are separate processes.

---

## 7. Remaining FHM gaps / next polish targets

The FHM parity features are done. Remaining candidate work:

1. **Loop feedback polish** — standings visible on main dashboard (currently only in Exam panel), season-phase clarity (yearly rhythm countdowns), surface decisive/disaster mission outcomes better.
2. **Rep/morale decay tuning** — see §6.
3. **Hard salary cap by village tier** — cap math exists but ceiling isn't tiered by village level yet.
4. **Owner/council mandate + dismissal** — annual goals, no-confidence vote consequences.
5. **Aging/regression curve** — shinobi peak ~28–30, decline after.
6. **Nice-to-have:** richer free-agency market, trade deadline, multi-season dynasty mode.

---

## 8. Operating style (how the user works)

- **Senior-dev-partner micro-milestone mode:** one focused goal at a time; after each commit, run a quick QA pass + re-anchor; pivot when a system is solved.
- **No trailing summaries / recaps.** End responses with: one-line status + one-line next step.
- **"go" / "proceed" = full autonomy** for that task — don't ask sub-questions mid-implementation.
- Confirm genuine forks with a quick question; otherwise act and report.
- The user playtests with partners — **playtest readiness is a recurring gate**.

---

## 9. First moves for the new session

1. Read this doc + the auto-memory (`MEMORY.md` index loads automatically).
2. `git -C C:\Users\Tyler\ninja\hidden-village-manager log --oneline -5` — confirm HEAD matches above.
3. `npx vitest run` — expect 450 passing / 43 files.
4. Ask the user which target to take next (see §7), or continue whatever they were mid-stream on.
