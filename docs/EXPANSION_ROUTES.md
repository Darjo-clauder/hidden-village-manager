# Expansion Routes — Depth Audit (2026-07-02)

A system-by-system pass over what exists and where each system can deepen. Effort is
T-shirt sized (S = a session, M = 2–3 sessions, L = multi-week). Payoff is judged
against the game's identity: **an FHM-style sports sim wearing an original shinobi
skin, headed to Steam as a single-player desktop game.**

The ranked shortlist is at the bottom (§Top Picks).

---

## 1. Season / League (season.js, exam.js SEASON tab)
**Exists:** monthly round-robin, standings w/ form + seed edge, fixtures grid, title-race
banner, match previews, matchday viewer, mission-form feeding fixtures, village identity
styles in the sim, off-season friendlies + Minor Nations Invitational.

**Routes:**
- **R1. Matchday tactics layer (S/M · HIGH)** — a pre-match instruction (e.g. Counter /
  Control / Overwhelm) chosen from the next-match card, playing rock-paper-scissors
  against the opponent's identity style (revealed in the preview). Turns identities from
  flavor into a monthly decision. Builds directly on `simMatch` style params.
- **R2. Rivalry/derby system (M · HIGH)** — persistent head-to-head records per rival
  (`G.h2h`), a designated "derby" rival (highest grudge/rel-hostility), derby fixtures
  worth extra morale/rep + press. `grudgeTicks`, kage personal rels, and press triggers
  all already exist to feed it.
- **R3. League expansion / dynamic membership (L · HIGH, long-game)** — a great village
  in multi-year collapse drops out; the strongest tier-C minor nation gets promoted with
  a generated roster + identity. The world visibly evolves across a dynasty. Needs care
  with save-compat and bracket sizes.

## 2. Competitions — Adept Exam & Grand Tournament (exam.js, war.js)
**Exists:** squad brackets, stage variety (written/forest/duels), postures & commands,
seeding from standings, judge bias/protest, sabotage, S-rank bids, summit blocs, KIA
with survival edges, recap viewers, identity stage tendencies (new).

**Routes:**
- **R4. Named rival aces (M · HIGH)** — surface each rival's best 1–2 shinobi as
  recurring characters: shown in exam previews, tracked across years ("beaten twice by
  Kestrel"), retiring eventually. Rival rosters + adaptiveAI profiles already exist;
  this is mostly selection + display + a memory hook. Cheap star power.
- **R5. Stage math extraction (S · MED, engineering)** — pull exam/war stage formulas
  into `shared/utils` pure functions with tests (currently panel-locked, browser-verify
  only). Prerequisite for balancing deeper bracket features safely.
- **R6. Tournament host bidding (S/M · MED)** — exam hosting exists as a flag; expand to
  an annual bid (ryo + prestige) with home-crowd effects and hosting revenue.

## 3. Missions (adv.js, missionEngine.js, missionGen.js)
**Exists:** 3-phase event resolution, quality bands, tactical approaches, mid-mission
complications, chains, crisis missions, play-by-play, live battle viewer, risk tiers.

**Routes:**
- **R7. Mission targets w/ identity (S/M · MED)** — missions *against* rival villages
  (sabotage their exhibition camp, intercept their transfer) where opponent identity
  shifts phase difficulty; success dents their season strength. Connects missions ↔
  league table more tightly than the current form-bonus.
- **R8. Live battle micro-calls (L · HIGH, flagship)** — one real decision mid-viewer
  (commit reserves / disengage) that swings the *quality band*, not the outcome, keeping
  engine balance intact. Turns the viewer from presentation into play. Do after R5-style
  extraction of the beat math.

## 4. Academy / Youth / Prospects (youthacademy.js, prospectEngine.js, scouting)
**Exists:** intake classes, curves, hidden attributes, training plans, sensei, mentor
pipeline, trial days, rival bids, region scouting w/ minor-nation origins, prodigies (new).

**Routes:**
- **R9. Youth tournaments (M · HIGH)** — an annual U-17 bracket (academy classes of all
  villages + minor nations) using the exam stage engine. Gives prospects visible arcs
  ("won the youth cup at 14") feeding legend/confidence — the FM wonderkid fantasy.
- **R10. Scouting reports as artifacts (S · MED)** — persistent per-prospect scout dossiers
  (who scouted, when, confidence deltas over time) instead of live ranges only; makes
  scout quality legible and old reports age interestingly.

## 5. Transfers / Contracts / Agents (transfers.js, state.js agents)
**Exists:** categories (free/listed/missing-nin/specialists), agents w/ agendas, clauses
(no-trade, two-way, buyout, sell-on), loans, poaching, bingo book, sell pressure, minor-
nation market (new).

**Routes:**
- **R11. Promises ledger (M · HIGH)** — FM-style promises made in negotiations ("regular
  deployment", "title push", "promote within a year") tracked with deadlines; broken
  promises hit morale/commitment and agent rep. `roleGuarantee`/`promotionDeadline`
  fields already exist as seeds — generalize them.
- **R12. Agent relationships (S/M · MED)** — per-agent standing with your village
  (fee %s, first-refusal tips on their other clients); agents already have agendas + fees.

## 6. Economy (economy.js, salaryCap.js, districts, trade routes, black market)
**Exists:** baseline revenue w/ rep soft-cap, salary cap + luxury tax, budget sliders,
districts, trade routes w/ piracy, sponsorships, black market heat, debt, runway UI.

**Routes:**
- **R13. Late-game money sinks (S/M · MED)** — prestige projects (monument, academy wing,
  arena tier) with multi-year build times and dynasty-visible payoffs; the 30-year sweep
  showed treasuries grow monotonically late — sinks are the missing pressure.
- **R14. Sponsor negotiation depth (S · LOW/MED)** — counter-offers, exclusivity clauses,
  sponsor mood reacting to season results (data exists in sponsorship + season table).

## 7. Beasts / Vessels / Bloodlines (beastEngine.js, beasts panel)
**Exists:** capture, sealing, sync stages, control drift + incidents, bloodline
activation economy, rival-held beasts, war survival edge.

**Routes:**
- **R15. Beast diplomacy/extraction arcs (M · MED)** — negotiate/steal a rival-held
  primal via a mission chain (intel → infiltration → extraction) with war-declaration
  risk. The display for rival-held beasts already exists; this makes it playable.

## 8. Diplomacy / World (kage.js, world.js, rivalKage.js, worldCalendar)
**Exists:** relations + personal kage rels, tribute, appeasement, summits w/ blocs,
world climate, doctrines, calendar events, minor nations grid (new), rival exhibitions
in the news ticker (new).

**Routes:**
- **R16. Minor-nation relations (S/M · MED)** — a rel score per minor nation moved by
  exhibitions, signings (poaching their talent angers them), gifts; high rel = scouting
  access + cheaper fees, low rel = they favor rivals. Makes the new layer interactive.
- **R17. World eras (M/L · MED)** — climate is rolled once; let it *shift* every 4–6
  years with a named era transition event ("The Long Peace ends") re-rolling modifiers
  and seeding narrative. Cheap dynasty texture via existing climate hooks.

## 9. Narrative / Media (personality, memorySystem, narrativeThreads, pressConference)
**Exists:** archetypes, confidence, grudges, memories w/ decay, emotional states, story
threads, adaptive rival AI w/ explained stance changes, press w/ tones, rumors, alumni.

**Routes:**
- **R18. Journalist personas (S/M · MED)** — 2–3 named reporters with memory of your
  past answers; a beef with one colors their season-review coverage. Press system
  already has tones/triggers — this adds *who's asking*.
- **R19. Season review special (S · LOW/MED)** — year-end inbox digest stitching the
  chronicle: title race verdict, exam/war arcs, breakout star, obituaries. All data
  exists (seasonStats, awards, chronicles, memorial) — pure assembly, big payoff/effort.

## 10. GM Career / Legacy (kagedev.js, legacy.js, dynasty.js)
**Exists:** 6 attrs, XP, 5 paths w/ perks, mandates + dismissal, successors, dynasty
grades, draft order + pick trading.

**Routes:**
- **R20. Hall of Fame + retired legends (S/M · MED)** — career-stat thresholds induct
  shinobi; inductees appear at ceremonies/alumni events. memorySystem + alumni exist.
- **R21. New-game+ dynasty perks (M · MED)** — completed-dynasty grade unlocks starting
  scenario modifiers (a "legacy" meta-layer). Good Steam replayability lever.

## 11. Engineering / Platform (not gameplay, but gating)
- **R22. adv.js modularization (M · HIGH, hygiene)** — continue `tick/` extraction
  (season block, off-season slate, academy tick are clean next slices). adv.js is
  ~3,700 lines again and has no test net; every gameplay route above lands in it.
- **R23. Save versioning + migration harness (S · HIGH for Steam)** — `state_version`
  exists server-side only; local saves (new) need a version field + migration table
  before Steam players accumulate long dynasties.
- **R24. Steam build chain (M · gating)** — Rust/MSVC toolchain → `tauri build`,
  real icons, CSP tightening, playtest the packaged exe. Blocks shipping, not design.

---

## Top Picks (recommended order)

1. **R1 Matchday tactics layer** — small, lands on brand-new identity rails, converts
   this session's flavor into a real monthly decision. Best payoff-per-effort in the list.
2. **R19 Season review special** — pure assembly of existing data; massive "my story"
   feel for one session of work.
3. **R4 Named rival aces** — recurring characters make the league feel alive; everything
   needed already exists in rival rosters + profiles.
4. **R11 Promises ledger** — the biggest missing FM pillar; seeds already in the data model.
5. **R2 Rivalry/derby system** — multiplies press/morale/identity systems already built.

**Engineering to schedule alongside:** R22 (extract the next adv.js slice with whichever
route you pick), R23 before any public build, R24 when the toolchain gets installed.

**The long-game flagship** (when ready for a multi-week arc): R3 dynamic league
membership + R17 world eras — a world that visibly evolves over a 30-year dynasty is
the thing no competitor in this niche has.
