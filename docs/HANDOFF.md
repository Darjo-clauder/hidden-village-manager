# Session Handoff — Hidden Village Manager

**Last updated:** 2026-06-24 · **HEAD:** `9bfc971` · **Branch:** `master` · **Tests:** 639 passing / 51 files

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

The user audited the game against FHM and decided: **before adding more flavor, build a functioning sports loop.** Strategy = **repurpose existing systems**, don't rebuild. The year now reads as a visible, FM-shaped season (see the **SEASON** tab in Competitions):

```
ACADEMY INTAKE  →  CHUNIN EXAM  →  SEASON OF FIXTURES  →  GRAND TOURNAMENT
(prospects enter)  (little league:    (monthly matchdays     (deadly year-end
                    develop genin/      build the standings)   playoff, M12,
                    chunin squads)                             seeded by standings)
```

- **Chunin Exam = the farm / "little league":** genin/chunin **squads**, bi-annual (M4, M10), promotes academy-intake prospects up.
- **Grand Tournament = the big-league playoff** (formerly "Nation War", reframed): Jonin+ **elite squads**, annual (M12), shinobi **die**. Internal state is still `G.warSched`/`G.warActive` (display-only rename for save compat).
- Both are 5-village brackets **seeded by the season standings**. Standings come from rival-vs-rival sims **and the player's real monthly mission form**.

**Audit status (2026-06-22):** re-audited as a "functioning sports sim that *feels* like one" — visible schedule + playoff, stat history, play-by-play, GM progression. Only open structural gap is **localization** (inline strings; large refactor, deferred). See §6.5.

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
| **Balance run + high-rep income fix** | `ef7d7e4` | `shared/utils/economy.js` | 5-yr playtest = stable. `villageRevenue` now has diminishing rep returns past `REP_SOFT_CAP=200` (below unchanged → no early bankruptcy); kills the rep→runaway-wealth spiral. |
| **Mission play-by-play** | `e8ddd33` | `adv.js`, `panels/missions.js` | Mission report shows 3 phase beats (Infiltration/Engagement/Extraction ✓/✕) + outcome band; `_buildMissionReport` carries `_mev.phases`. |
| **Season stat history** | `e20b9ac` | `panels/exam.js`, `shared/utils/seasonStats.js` | Records tab → per-year standing/MVP/leaders/fallen from `G.seasonStats`. Fixed name bug (read s.n→now fn+ln; ids were showing in leaders/awards). |
| **Season spine + Grand Tournament** | `eb28086` | `shared/utils/season.js`, `panels/exam.js`, `panels/war.js`, `adv.js` | `seasonSchedule`/`teamFixtures`; new **SEASON** tab (year overview + fixtures w/ W-D-L + standings). Nation War reframed → **Grand Tournament** (display only). |
| **Kage development (GM career)** | `033041f`, `2b4ae18` | `shared/constants/kageDev.js`, `panels/kagedev.js`, `adv.js`, many | 6 attrs + XP/levels + 5 GM paths w/ perks. Hooks: command→sc, tactics→exam/war, mentorship→growth, administration→income, diplomacy→relations, espionage→deep-cover. Nav "Kage Path"; dashboard strip; `tests/kageDev.test.js` (16). |
| **FM24 UI conversion (P0–P5)** | `bc8fc6f`…`03ad662` | `uikit.js`, `style.css`, many panels | P0 ContinueButton states; P1 reusable kit (`uikit.js`: context-menu portal, sortable/customizable tables, hover previews) on Roster/Intel/Transfers/Staff/Scouting; P2 Home inbox-digest turn-loop; P3 Missions briefing inspector + sortable Leaders; P4 charts/bars/heatmap/activity-grid; P5 a11y (focus-visible, reduced-motion, ARIA). Spec: `docs/FM24_UI_SPEC.json`. |
| **Depth + variability passes** | (pre-`bc8fc6f`) | many | Mission tactical-approach + mid-mission events; exam posture / war command; procedural rivals; founding scenarios; world climate; village doctrine; clan council; per-shinobi dev paths/trajectory; 8 dead-end panels fleshed out. |
| **Gap closure — phase/grades/rumors/aging** | `7f5b8d0` | `adv.js`, `main.js`, `panels/missions.js`, `panels/roster.js`, `panels/inbox.js` | Off-season gate (months 1–3): missions replaced with Training Camp (8k ryo, fatigue reset + stat boost + morale +5), Free Agent link, Contract Renewals link. `gradeShinobi()` S/A/B/C/D/F from power ratio+streak+fatigue+decline. Grade badge column in roster table; Grade in dossier stats footer. ★ PEAK and ↘ past-peak tags on roster names. Rumor mill 32%/mo → rival intel blurbs in Inbox › Intel (🕵). Quarterly intel report every 3 months → peak-year + grade callouts (📊). |
| **Pillar 5 + 6 — Social & Stability** | `992ef3a` | `adv.js`, `panels/inbox.js`, `panels/dashboard.js` | Alumni network (retired shinobi messages), fan/civic events (citizen morale extremes), sponsor inbox bridge. Hard morale floor by tier (D:20→S:60) enforced end-of-tick; rep floor (D:5→S:60) with passive recovery. Social dashboard card. |
| **Pillar 4 — Live HUD micro-decisions** | `26847b2` | `adv.js`, `main.js`, `panels/roster.js`, `panels/dashboard.js`, `panels/inbox.js` | Fatigue meter (0–100, mission rank-scaled, sc penalty at 40/60/80%), 7 monthly quick-decision events (55%/mo, urgent inbox items), tactics quick-bar on dashboard. |
| **FHM parity batch — 7 features** | `015a9a0` | `adv.js`, `main.js`, `panels/exam.js`, `panels/inbox.js` | Salary seniority (+5%/yr, +10% on promo), citizen morale (0–100, rev mult 0.7–1.3×), mission complications (30% mid-tick inbox choice, scMod wired), rival GM moves (prospect bids + trade proposals as inbox items), off-season flag months 1–3, LEADERS tab in exam (career/S-rank/veterans/awards), demand escalation (2nd underuse → transfer threat). |
| **Prospect Pipeline + Press Expansion** | `f95d179` | `pressConference.js`, `adv.js`, `panels/inbox.js`, `panels/academy.js`, `index.html` | Pipeline: Academy tab shows mentor→student cards with progress bar + milestones. Press: 6 tones, 12 questions, callout/emotional/deflect tones, follow-up copy, hydrateQuestion with live names, 4 new triggers. |
| **Mentorship + Story Threads UI** | `00d57d0` | `shared/utils/mentorship.js`, `adv.js`, `main.js`, `panels/roster.js`, `panels/inbox.js` | Mentorship: Jonin+ mentor→Genin/Chunin student; month 3 memory, month 6 morale, month 12 stat bonus. Inbox: Story Threads tab with state badges, collapsible event history. |
| **Memory + Threads + Rival Profiling + NPC Quotes** | `9d9d43b` | `shared/utils/memorySystem.js`, `narrativeThreads.js`, `personality.js`, `adaptiveAI.js`, `adv.js`, `state.js`, `panels/roster.js` | Deep Pillars 1–3 (see §5b below) |
| **Personality + Narrative + Adaptive AI** | `be4e7a4` | `shared/utils/personality.js`, `narrativeEngine.js`, `adaptiveAI.js`, `adv.js`, `state.js`, `panels/inbox.js` | Pillars 1–3 (see §5a below for detail) |
| **Rank canonicalization** | `be4e7a4` | `constants.js` + 4 panels | RANKS[4]: S-Rank → Sannin; village kageRank → Kazekage/Hyōkage/Gankage/Raikage; all hardcoded arrays replaced with RANKS[s.ri] |
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

### §5a — Narrative layer detail (Pillars 1–3)

**Pillar 1 — Personality (`shared/utils/personality.js`):**
- 9 Naruto archetypes assigned at shinobi generation (`narrativeArchetype` field on mS): Will of Fire, Avenger, Prodigy, Gentle Fist, Wild Card, Sage Path, Clan Heir, Rogue Element, Medic Path
- `updateConfidence(s, quality, opts)` — called after every mission; archetype-specific floors/caps/swing
- `confidenceMod(s)` — ±0.05 wired into solo mission sc
- `formGrudge` / `grudgePenalty` — bonded survivors of KIA form grudges; grudges penalize co-deployed pairs −5/−10/−15
- `pairChemistryBonus` — shared missions + bond type = squad power bonus

**Pillar 2 — Narrative engine (`shared/utils/narrativeEngine.js`):**
- Blurbs for: decisive/disaster missions, KIA, injury, trade, bond, grudge, rank-up, war/exam results, prestige, intel
- `G.narrativeInbox[]` queue; inbox panel renders with tag icons, "Go →" panel links, dismiss button
- Naruto vocab: ryo, ANBU, Daimyo, rank names, Sannin

**Pillar 3 — Adaptive AI (`shared/utils/adaptiveAI.js`):**
- `recordPlayerTactic` tallies per-mission: elite ratio, success streak, squad usage into `G.rivalTendencies`
- `pickCounterStrategy` → `aggressive` (Border Blitz), `elite_wall`, `scout_study`, or `balanced`
- `applyCounterStrategy` mutates each rival village each January; strategy change fires a narrative intel blurb
- `rivalScPenalty` → summed scMod penalty from active rival strategies (wired into solo sc)

### §5b — Deep Pillar 1–3 layer (`9d9d43b`)

**Memory system (`shared/utils/memorySystem.js`):**
- 14 memory types: `saved_comrade`, `witness_kia`, `mission_triumph`, `mission_disaster`, `public_shame`, `betrayal`, `mentor_bond`, `rival_defeat`, `promotion_earned`, `war_hero`, `squad_kia`, `prestige_rise`, `grudge_escalated`, `reconciled`
- `addMemory(s, type, source, when)` — pushes to `s.memories[]`, cap 20
- `decayMemories(s, monthsElapsed)` — `intensity *= e^(−t/τ)`, prunes < 0.05
- `memoryMoraleMod(s)` → flat integer morale nudge each month (wired into monthly tick)
- `memoryStateBlurb(s)` → dossier flavor string; `mostSalientMemory(s)` → highest-intensity entry
- Emotional states (7): `angry/inspired/homesick/grieving/triumphant/fearful/focused` — `setEmotionalState` / `tickEmotionalState` / `emotionalScMod`
- Role identity tags (6): `Playmaker/Grinder/Enforcer/Tactician/Lone Wolf/Anchor` — assigned lazily after first mission

**Narrative threads (`shared/utils/narrativeThreads.js`):**
- Thread object: `{ id, type, title, actorIds, events[], state: open|escalating|resolved|tragedy, priority }`
- `linkToThread(threads, eventId, tag, actorIds, title, when)` — find-or-create, escalates open grudge/kia threads
- `pruneOldThreads` — removes resolved/tragedy threads older than 12 months
- All `pushNarrative` calls now thread-link automatically; `G.narrativeThreads[]` added to state

**Per-village rival profiling (extended `adaptiveAI.js`):**
- `ensureRivalProfile(v)` — lazy-init `v.rivalProfile` with `tacticFreq`, `aiPersonality`, `stanceHistory`
- `observePlayerTactic(v, rank, isSquad)` — EMA update (lr=0.15) per mission
- `explainStanceChange(v, strategy)` → specific blurb naming which tactic pattern triggered the shift
- 3 AI personalities: `conservative / opportunistic / reckless`
- `rollMetaEvent` — ~8%/yr June roll that forces a league-wide stance reset + narrative

**UI surfaces:**
- Dossier Career tab: NPC archetype quote, memory state blurb, salient memory, emotional state chip, role tag
- Dossier Profile tab: narrative archetype chip + confidence bar with color coding

---

## 6. Known open items

- **Localization not started (the one open structural gap):** all UI strings are inline across ~28 panels. Full i18n (string table + ICU plurals + IP-vs-UI namespace split) is a large multi-session refactor — checklist in `docs/FM24_UI_SPEC.json` under `localization`. Accessibility half of polish IS done (P5).
- **Grand Tournament internal naming:** display says "Grand Tournament" but state/chronicle keys are still `warSched`/`warActive`/`Nation War` internals (kept for save compat). Harmless; just don't be confused by the mismatch.
- **War/Exam stage logic lives in panels**, not unit-tested. Worth extracting stage math to shared pure utils.
- **Grand Tournament KIA on rivals** permanently removes roster ninja; replenishment is light — watch for rival roster depletion over many years.
- **Long-run balance swept (2026-06-24):** deterministic 20-year sweep added (`tests/dynastySweep.test.js`). Found + fixed a real drift — `tickRivalStrength` had positive-only drift with no mean reversion, so rivals saturated at the 200 cap over a dynasty and lost all differentiation. Now mean-reverts toward a personality/relations-shifted per-village baseline (`village.baseStrength`, lazily set). Kage XP/point curve verified healthy (no unbounded points within a realistic horizon); rep-income soft cap holds. Sweep model omits the real 50-roster wage bill / staff / upkeep, so it's a curve-regression harness, not an economy-tuning oracle.
- **Preview build + socket race:** `npx vite build` required before any browser verify (preview server :3000 serves static `dist/`). Also `endTurn()` no-ops until the socket connects — after a page reload, give it a beat before driving turns via preview_eval, or the date won't advance.
- **`window.G`/`window.upUI` are NOT exposed** — browser verification is DOM-only (read sidebar/panel text).

---

## 7. Next targets

Build is re-audited (2026-06-22) as a "functioning sports sim that feels like one." The FM-spine, stat layer, presentation, GM progression, and a balance pass are all in. **Schedule depth (#2) is now done** — `c1e4e8d` added the League Fixture Grid to the SEASON tab (`_seasonFixtureGrid` in `panels/exam.js`): every village's matchup round-by-round with results + look-ahead. Candidate next targets (user's call):

1. **Localization foundation** — the one open structural gap (§6). Large; do as its own effort: `t()` helper + string table + IP-vs-UI namespace split, then extract panel-by-panel.
2. **Live match viewer** — turn the post-result play-by-play into a watch-it-unfold view (large feature).
3. **Roll the P1 entity-grammar kit onto remaining panels** (academy, finances, depth chart, etc.) for full UI consistency.

**Recently done:** Schedule depth (`c1e4e8d`, League Fixture Grid). Mid-season pressure events (`seasonPressNotice` in season.js → Standings noticeboard items: title race / clinching / slump / relegation; throttled 1/2mo, no back-to-back repeats; 6 tests). Dynasty balance sweep (`tests/dynastySweep.test.js` + rival mean-reversion fix in `rivalSim.js`).

---

## 8. Operating style (how the user works)

- **Senior-dev-partner micro-milestone mode:** one focused goal at a time; after each commit, run a quick QA pass + re-anchor; pivot when a system is solved.
- **No trailing summaries / recaps.** End responses with: one-line status + one-line next step.
- **"go" / "proceed" = full autonomy** for that task — don't ask sub-questions mid-implementation.
- Confirm genuine forks with a quick question; otherwise act and report.
- The user playtests with partners — **playtest readiness is a recurring gate**.

---

## 9. First moves for the new session

1. Read this doc + the auto-memory (`MEMORY.md` index loads automatically; `project_state.md` has the running log).
2. `git -C C:\Users\Tyler\ninja\hidden-village-manager log --oneline -5` — confirm HEAD matches above (`c1e4e8d`).
3. `npx vitest run` — expect 624 passing / 50 files.
4. `npx vite build` before any browser playtest (see §6 build + socket-race notes).
5. Ask the user which target to take next (see §7), or continue whatever they were mid-stream on.
