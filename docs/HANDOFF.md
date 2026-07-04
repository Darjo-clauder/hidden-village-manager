# Session Handoff — Hidden Village Manager

**Last updated:** 2026-07-04 · **HEAD:** `9d60950` (committed + pushed, mirror ff'd) · **Branch:** `master` · **Tests:** 939 passing / 79 files

> **DIRECTION (2026-07-04): Steam launch DEFERRED** until the user is satisfied with feature polish — focus on gameplay, not store/signing gates. **Security audit + fixes shipped** (`docs/SECURITY_AUDIT.md`; MP XSS, combat clamps, rate limiting, playerId IDOR — all remediated). **Tauri `.exe` rebuilt** on the hardened code. Two prior `.exe` failures fixed: stale build, and the CSP auto-hash landmine (never add an inline `<script>` to index.html — it kills every onclick; see `dangerousDisableAssetCspModification`).

> **Second gameplay batch landed 2026-07-03 (see §1f)** — 6 routes + 3 polish in one session: **R6** exam host bidding, **R14** sponsor negotiation + mood, **R15** beast extraction arc, plus three brand-new routes **R25** medical/rehab depth, **R26** staff development, **R27** populace support; polish **R12+** agent downsides + Agents tab, **R8+** solo-mission micro-calls, and **save slots + balance pass**. Each is a pure tested module + panel wiring; live 24-month playthrough clean.

> **Desktop build + gameplay batch landed 2026-07-03 (see §1e)** — the **Tauri desktop `.exe` now builds and runs** (toolchain installed: Rustup + VS 2022 C++ Build Tools; `app.exe` + msi + nsis produced), with an **original leaf-emblem icon** and a **hardened CSP** (was `null`). Plus four gameplay routes: **R5** stage-math extraction (tested `shared/utils/stageMath.js`), **R8** live-battle micro-call (commit reserves / disengage — swings quality band + rewards, never the outcome), **R10** scouting dossiers (report timeline + trend + aging), **R12** agent relationships (persistent standing → fee cut + first-refusal tips). All committed, pushed, mirror ff'd; tree clean.

> **Gameplay + engineering batch landed 2026-07-02 (see §1d)** — 8 gameplay routes (R9 Youth Cup, R20 Hall of Fame, R16 minor-nation relations, R7 rival disruption ops, R13 prestige projects, R17 world eras, R18 journalist personas, R3 dynamic league membership) + engineering (R23 save versioning, R22 adv.js off-season slice extraction). All committed, pushed, mirror ff'd; tree clean. Test-suite writing was delegated to Sonnet/Haiku subagents (9 new suites, ~130 tests).

> ✅ **The four stacked changesets are now COMMITTED + PUSHED** (2026-07-02), as a 4-commit stack on top of `9ef785e`:
> 1. `4140d41` **IP-neutral conversion** (Tiers 1–2) — §1a + `docs/IP_NEUTRAL_PLAN.md`.
> 2. `a41ec2f` **Serverless SP + optional MP + Tauri scaffold** — §1b.
> 3. `989e062` **World-depth pass** (identities, minor nations, tactics, rivalry, promises, aces, season review) — §1c.
> 4. `6f36eed` **League balance** (player strength onto the rivals' band) — §1c end.
>
> Files entangled across changesets were committed with their *primary* purpose (noted in the messages); intermediate commits may not build standalone — the stack tip is the verified state. Working tree is clean.

This document lets a fresh session pick up cold. Read it top to bottom before touching code.

---

## 1. What this project is

A **Naruto-themed village management sim** being reshaped into a **Franchise Hockey Manager (FHM)-style sports simulator**. Express + Socket.IO backend, Vite + vanilla-JS ES-module frontend, Supabase persistence.

~~This is a private Naruto-IP build — keep all Naruto namesakes and IP.~~ **SUPERSEDED 2026-06-27** — see §1a.

---

## 1a. IP-neutral conversion (NEW DIRECTION, 2026-06-27)

The user is pursuing a **Steam release**, which requires removing Naruto IP. Decision: build a **single IP-neutral fork** (not a coexisting Naruto-skin toggle), **full scrub** (including lower-risk generic terms). The systems/engine are original and sellable; only the Naruto naming skin was the blocker. There is **no copyrighted art** (emoji only), which removed the most expensive part.

**Plan + full inventory:** `docs/IP_NEUTRAL_PLAN.md` (read it — has the locked lexicon, file-by-file map, and per-tier status).

**Done & verified in the working tree (uncommitted):**
- **Tier 1** — ranks (Genin/Chunin/Jonin/ANBU/Sannin → **Initiate/Adept/Veteran/Shadow/Legend**), `-kage` title → **Warden**, all `-gakure` villages → original names, clans (`Fuma`→Kusari), regions ("Land of X" → Emberlands/etc.), and canon landmines (Akatsuki→Syndicate, Eight Inner Gates→Eightfold Limit Break, Sabaku/Tendo/Akatsuchi kage names).
- **Tier 2** — beast subsystem: jinchūriki→**Vessel**, tailed beast/bijuu→**Primal**, the `N-Tails` structure → **Tier-N Primal** (original beast names + ◆ pips kept). Canon Ox-Octopus (Gyūki) form rewritten.
- **Verified:** 680/680 tests green, `npx vite build` clean, 16-tick browser playtest across 12 panels with **zero stray IP terms** and no console errors.

**Not done / open:**
- **Tier 3 (optional, low-value):** "jutsu" (~65 refs) → "technique/art" display; internal stat keys (`ninjutsu` etc.) stay.
- **Residual design item (NOT an IP blocker):** the 9 beasts' elements/forms still loosely parallel the canon tailed beasts; a deeper redesign (count/elements/forms) is the user's creative call.
- **Internal IDs deliberately kept** (non-display, safe to leave): `anbu` dev-path/tab ids, `.jk` host field, `.tb-tails` CSS class, `G.beasts`.
- **Non-code Steam workstream** (the real launch gate): Steam Direct ($100), original key art/capsule images, store copy, content-rights affirmation.

**Mechanical-rename technique (for resuming):** case-sensitive `perl -i -pe 's/\bWord\b/New/g'` over `$(find client shared -name '*.js'; ls client/index.html)`. Capitalized/word-boundary forms are safe because lowercase identifiers (`scout_jonin`, `anbuSuccessBonus`, `sp('kage')`, panel ids) lack a word boundary at the match site. **Always** re-run `npx vitest run` after each pass (it caught `NARUTO_ARCHETYPES`, `monthlySnapshot({vessel})`, and broken `${b.tails}` template-in-replacement bugs this session) + browser-verify adv.js (no test net).

---

## 1b. Serverless / offline + optional-MP + Tauri scaffold (NEW, 2026-06-30)

**Why:** the game was tethered to a paid **Railway** Node/Socket.IO host + **Supabase** just to *run* — the End-Turn button (`continueTurn → endTurn`) hard-returned without a live socket, and saves lived **only** in Supabase. For a Steam desktop release that's unacceptable. User's chosen direction: **single-player fully offline, multiplayer optional (opt-in, self-hostable), packaged as a desktop app.**

**Architecture reality (confirmed this session):** the whole FHM sim already runs **client-side**. The server only ever powered the *online-world* layer (world map, rooms/lobby, diplomacy, raids, gifts, and Supabase save/load). So this was **decoupling + gating**, not a rewrite.

**Done & verified in the working tree (uncommitted) — my files this session:**
- **Local persistence** — new **`client/js/save.js`**: `saveLocal/loadLocal/hasLocalSave/clearLocal/applySavedState/markGameActive` → `G` persists to `localStorage` (`hvm_save_v1`), trimmed the same way `server/db.js _trimState` bounds the Supabase copy. Autosaves each turn + on `beforeunload`.
- **Turn advance decoupled** — **`client/js/room.js`** `endTurn()` no longer `if(!socket?.connected) return`; it always `_adv()` + `saveLocal()`, and *only* syncs + `player_ready` when a socket is connected.
- **Network mode** — new **`client/js/net.js`**: `NET.online` + `getServerUrl/setServerUrl` (persisted `hvm_server_url`). Solo path = offline (no socket opened); online = opt-in.
- **Setup/lobby split** — **`client/js/setup.js`**: `showSetup()` forces offline + clears `RS.mode`; `beginGame`/`restoreGame` go online only when `RS.mode==='create'|'join'` (the lobby paths). Continue banner + restore now read the **local save** (worked offline). Lobby reads/writes a **Server address** field.
- **Configurable server + bundled client** — **`client/js/socket.js`**: `initSocket(name,kage,icon,serverUrl)` → `serverUrl ? io(serverUrl) : io()`; **`import { io } from 'socket.io-client'`** (added dep) and **removed** the `<script src="/socket.io/socket.io.js">` tag from `index.html` — the server-served client wouldn't exist in a desktop app. HTML: lobby "Server" field (`#sl-server-url`), solo button relabelled "Begin".
- **Tauri scaffold** — **`src-tauri/`** (Tauri v2): `tauri.conf.json` → `frontendDist ../dist`, `beforeBuildCommand npm run build`, `devUrl :5173` + `beforeDevCommand npm run vite:dev`, id `com.hiddenvillage.manager`, 1280×820 window. `package.json`: added `socket.io-client` dep, `@tauri-apps/cli` devDep, `vite:dev` + `tauri` scripts.
- **Verified:** 680/680 tests green; `vite build` clean (138 modules, socket.io-client bundled, no warnings). Browser playtest: solo start → **month advanced offline** (`villageId` null throughout) → reload → **Continue restored Y1 M2** with no server; online path (lobby → create room) connected via the bundled client (room `8WKADV` created), zero console errors.

**Open / next:**
- **✅ DESKTOP BUILD WORKS (2026-07-03):** toolchain installed via winget — **Rustup** (`Rustlang.Rustup`, stable-x86_64-pc-windows-msvc, rustc/cargo 1.96.1) + **VS 2022 Build Tools** (`Microsoft.VisualStudio.2022.BuildTools`, `--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended`); WebView2 already present. **Gotcha:** cargo bin (`~/.cargo/bin`) is NOT auto-added to PATH — prepend `$env:USERPROFILE\.cargo\bin` in the build shell. `npm run tauri build` compiled clean in ~1m33s (release) → **`src-tauri/target/release/app.exe` (8.5MB)** + **msi** & **nsis `-setup.exe`** in `bundle/` (build auto-fetched WiX 3.14 + NSIS 3.11). Smoke-tested: app.exe opens a "Hidden Village Manager" window and closes cleanly. Artifacts are gitignored; no source changed by the build.
- **Icons are placeholder Tauri logos** (`src-tauri/icons/`) — replace before shipping (`npm run tauri icon <png>`).
- **CSP is `null`** (permissive) — fine for now; tighten `connect-src` to the MP server before Steam.
- **Online-in-Tauri needs an explicit server URL** (no origin in a desktop app) — the lobby field handles it; `io()` with no URL only works in the web build.
- **The server/Supabase are now OPTIONAL infra** — only needed when someone actually plays online. Host cheaply on demand or let players self-host; single-player has zero recurring cost.

**Commit hygiene:** this changeset is intermingled with the §1a IP scrub. Split: commit the IP-neutral scrub first, then this serverless/Tauri set (`client/js/{net,save}.js`, `client/js/{room,setup,socket}.js`, `client/index.html`, `package.json`, `package-lock.json`, `src-tauri/**`, this doc).

---

## 1c. World-depth pass — village identities + minor nations (NEW, 2026-07-02)

User: "each village being unique in some form from each other while allowing flexibility" + "a series of minor nations to populate the world with talent and scheduling." Both landed, verified, uncommitted.

**Village identities** — new **`shared/constants/villageIdentity.js`**: all 12 `RIVAL_VILLAGE_POOL` villages get a fixed identity (label + blurb + **2-stat signature bias** + **matchday style**). Styles (`MATCH_STYLES`): `blitz` (wide variance, few draws), `fortress` (narrow variance, draw-prone), `opportunist` (+8% as underdog), `grinder` (+8% as favorite), `balanced`. **Flexibility:** per-run `identityIntensity` 0.75–1.25 (rolled in `genRivalVillages`, scales the stat bias); the player's own style follows coaching philosophy (aggressive→blitz, defensive→fortress).
- Wiring: `genVillageRoster` applies the bias to every roster member; `season.js simMatch/playMatchday` grew optional style params (**defaults reproduce legacy behavior exactly — locked by regression test**); adv.js season block passes `styleOf`; UI = style chips in SEASON standings (exam.js) + identity line on Diplomacy village cards (kage.js).

**Minor nations** — new **`shared/constants/minorNations.js`**: 8 nations (Reedmarsh/Saltcliff/Palewood/Kilnrock/Galecrest/Bronzegate/Hollowfen/Skylark), each region-tied (REGIONS ids), tier C (38–55 str) or D (26–42), with a specialty stat + blurb. Helpers: `pickMinorNation(rng, region?)`, `minorStrength`, `applyMinorOrigin` (tags origin + specialty bump C:6–10/D:4–8).
- **Talent:** `genTransferPool` — village-listed 45% from a minor (fee ×0.8) else from **live** `G.villages` (was stale `VILLAGES_DEF`); foreign specialists are now always minor-nation exports spiked in the nation's specialty. `mS()` origin roll: ~5% rival great village, ~4% minor nation. `genRegionProspect`: ~30% arrive "via" a region-matched minor nation.
- **Scheduling:** off-season months 1–3 each play one **exhibition** vs a minor nation (`simMatch`, player style = philosophy). Win: purse (C 3.5k / D 2k ryo) + morale +2; loss −1 morale. Stored `G.exhibitions` (cap 12); i18n toasts `toast.adv.exhibition*`. UI: 🏮 exhibition slate card in the SEASON tab; **Minor Nations grid** at the bottom of the World panel.

**Verified:** 695/695 tests (56 files; new `tests/villageIdentity.test.js` 9 + `tests/minorNations.test.js` 6), build clean. Browser: 13-month playtest across the Y1→Y2 boundary — exhibitions fired M1–M3 and resumed Y2 M1, identity chips/cards/nations grid all render, zero console errors. NB: browser state inspection now possible offline via `JSON.parse(localStorage.hvm_save_v1)` after `endTurn()` (direct `adv()` doesn't write the save).

**Files:** `shared/constants/{villageIdentity,minorNations}.js`, `shared/utils/season.js`, `shared/i18n/en.js`, `client/js/{state,adv,world}.js`, `client/js/panels/{exam,kage}.js`, `tests/{villageIdentity,minorNations}.test.js`.

**World-flavor deepening (same day, second pass — all landed + verified):**
- **Identity styles now reach the brackets** — `identityStageAdv(style, kind)` in villageIdentity.js (kinds: early/endurance/late; e.g. blitz +5% early/−3% late, opportunist +5% late). Applied to RIVAL squads only via `_postureAdv(c, kind)` (exam.js — squads now carry `vid`) and `_cmdAdv(c, kind)` (war.js via `c.vRef.n`); player behavior byte-identical (posture/command as before — semifinal effPow deliberately kept legacy for the player). Magnitudes < player's ±10% swing, locked by test.
- **Minor Nations Invitational** — annual 4-team knockout in off-season M2 (player + 3 minors; SF + Final resolved in the tick; cup ties → sudden-death coin). Champion: 6k ryo + legend +2 + morale +3 + chronicle; runner-up 2.5k. `G.invitationalHistory` (cap 10); slate rows tagged `cup:'SF'|'F'` with 🏆 chips + holder line in the SEASON tab card. M1/M3 stay friendlies.
- **Ambient world life** — off-season rival-vs-minor exhibition results in the world news ticker (identity-styled sims, upset variant); ~8%/mo a **minor-nation prodigy** (potential 78–96, 3–5mo window) joins `G.prospects` with an inbox narrative (rival GM bids already target it naturally).
- i18n keys: `toast.adv.inv*`, `toast.adv.minorProdigy`, `news.world.rivalExhibition*`.
- **Verified:** 696/696 tests; browser: full Y1 played — invitational SF+F fired M2 (champion recorded), news ticker carries rival exhibitions, and a **full 4-round Adept Exam driven interactively** with identity math live (squad created + nominated via DOM, all rounds clean, champion Verdancross). Tournament path structurally identical (guarded `vRef?.n`), not separately driven (Y1 village lacks elite squads).

**Feature audit:** **`docs/EXPANSION_ROUTES.md`** (NEW) — system-by-system depth audit, 24 routes T-shirt-sized, ranked shortlist. Top picks: R1 matchday tactics layer (play against identity styles), R19 season review special, R4 named rival aces, R11 promises ledger, R2 rivalry/derby system; engineering: R22 adv.js slice extraction, R23 local-save versioning before Steam, R24 Tauri toolchain.

**Third pass (2026-07-02, same day): audit top-5 ALL IMPLEMENTED (R1, R19, R4, R11, R2) — verified, uncommitted:**
- **R1 Matchday tactics** — `shared/constants/matchdayTactics.js`: Standard/Counter/Control/Overwhelm vs opponent identity style (+8% strong read / −4% bad read, `tacticMod`). Picker lives in the next-match card (`_tacticPicker` in exam.js, `setMatchdayTactic` on window); persists as `G.matchdayTactic`; applied to the player's league strength in the adv season block (opponent resolved via `roundPairings`).
- **R19 Season review** — December block (after draft order) assembles "📜 Year N in Review" from live data (standings verdict, exam champion, invitational, awards, the fallen, tournament-ahead note) → `pushNarrative` long-form inbox item (+ chronicle). HTML `<br>` bodies render (inbox desc is innerHTML).
- **R4 Named rival aces** — every January `tick/rivals.js` stores each rival's top-2 elites as `v.aces` `[{id,name,pow,ri}]`; new #1 fires an intel narrative. Shown on diplomacy cards (⭐ Ace), league match preview ("Their ace"), and ⭐-starred squads in exam semifinal duels.
- **R11 Promises ledger** — `shared/utils/promises.js` (`createPromise/resolvePromise/isPastDue`, cap 30 evicting resolved first). Created at transfer signing (role guarantee → 12-mo review; promotion timeline → deadline). Monthly resolution in adv: promotion KEPT on rank-up past `riAt` (+10 commit/+8 morale), deployment reviewed at due date via `s._rgBreaches` counter (≥5 → broken, −12/−8 + notice; else kept +5). Broken-promotion path ties into the pre-existing deadline-missed block. 🤝 Promises card in People Management overview (open + recently resolved).
- **R2 Rivalry/derby** — `shared/utils/rivalry.js` (`updateH2H/pickDerbyRival/h2hLabel`). All-time H2H per rival in `G.h2h` (updated from the player's fixture each matchday); derby rival named each January (hostility = 100−rel + grudge×5, +15 incumbent stickiness) → `G.derbyRival`, announce toast + notice. Derby fixtures: 🔥 DERBY banner in preview, win +3 morale/+2 rep, loss −3 morale + 30% press (`rivalry_heat`), draw neutral. H2H + derby chip on diplomacy cards.
- **Verified:** 711/711 tests (55 files + 3 new: matchdayTactics 5, promises 5, rivalry 5), build clean. Browser: fresh game → aces named for all rivals + derby designated on first tick; tactic picker renders w/ opponent style line ("They play 🛡 Fortress"), pick persists and applies; H2H accumulated across a full year + into Y2 (derby held by stickiness); Year-1 Review landed in inbox with league/invitational/honors sections; zero console errors.
- **New i18n keys:** `toast.adv.promise*`, `toast.adv.derby*` (+ inv/prodigy/news keys from the second pass).
- **✅ League balance FIXED (2026-07-02, follow-up):** root cause — `computePlayerStrength` (`shared/utils/rivalSim.js`) returned `count × (5 + avgRi×3)` ≈ **182 for a fresh village vs rivals at 50–90** on the same scale; with the ±30% match swing the player could not lose (9–0 seasons), diplomacy read "Dominant" from day one, and tribute gating was a formality. **Rewrite:** quality (avg stats of the roster's top half) + depth (headcount w/ diminishing returns past 20 — injuries now cost strength) + modest wall/seal, calibrated to the rivals' 10–200 band: fresh ≈ **67**, deep elite dynasty ≈ 130–140, cap 200. Consumers unchanged (league strOf, exhibitions/invitational, kage strength labels + tribute gating, `tick/rivals.js` monthly recompute — old saves self-heal on next tick). **Locked by 4 calibration tests** in `tests/rivalSim.test.js` (fresh 55–80, dynasty ≤160, injuries reduce, ≤200 cap). **Verified in browser:** fresh player 67 vs rivals 38–81; full season → **finished 2nd, 8W-0D-4L**, swept 0–2 by the 81-str Blitz leader (real bogey team), swept the weak sides; diplomacy reads Matched/Stronger honestly; 715/715 tests, zero console errors.

---

## 1d. Depth batch — 8 gameplay routes + engineering (NEW, 2026-07-02)

Landed the whole EXPANSION_ROUTES shortlist + follow-ons, committed as 7 commits (`419ecb6`→`40b5afa`). **New shared modules** (all pure + unit-tested; test suites written by delegated Sonnet/Haiku subagents): `shared/utils/{youthCup,hallOfFame,rivalOps,rivalry(existing),leagueMembership,saveMigrations}.js`, `shared/constants/{matchdayTactics(existing),minorNations rel-helpers,prestigeProjects,worldEras,journalists}.js`.
- **R9 Youth Cup** — M6 academy-age bracket (`G.youthCupHistory`), wins are career milestones + growth. Card in Youth Academy panel.
- **R20 Hall of Fame** — `maybeInduct(s,how)` (exported from adv.js) on retirement + all death sites (mission/defense/war). `G.hallOfFame`; section in Legacy›Legends.
- **R16 Minor-nation relations** — `G.minorRelations` moved by friendlies (+2)/poaching (−8); drives transfer fees + a standing bar in the World panel.
- **R7 Rival disruption ops** — Diplomacy "🗡 Disrupt" (3k ryo): dents a rival's strength (→ league slippage); success scales with strength/espionage/target identity.
- **R13 Prestige projects** — multi-year monuments (`G.prestigeBuilds`/`prestigeCompleted`) draining treasury for legend/morale-floor/defense/academy. Money sink; Upgrades panel.
- **R17 World eras** — climate re-rolls every 4–6yr with a named transition; `G.worldEra`/`eraHistory`; World-panel banner. Hooked at year rollover.
- **R18 Journalist personas** — 3-reporter corps ask press questions; `G.journalistRel` moves by tone; byline in the press inbox item.
- **R3 Dynamic league membership** — a great village collapsing 3+ yrs (`v.declineYears`) is relegated, strongest tier-C minor promoted with a full roster; **`G.season=null`** forces table rebuild. Foundational: promoted village plays `balanced` (no identity entry) — follow-up = dynamic identities.
- **R23 Save versioning** — `_saveVersion` stamp + `migrateSave` forward-migration (Steam gate). **R22** — off-season slate extracted to `client/js/tick/offSeason.js` (adv.js −90 lines).
- **Verified:** 850/850 tests (68 files); browser: 6-year run fired era shift + yearly Youth Cup + built/completed a prestige project, saves stamped v2, off-season extraction byte-identical, zero console errors.
- **Watch-outs:** adv.js is now ~3.95k lines and still has NO test net (verify tick changes in browser); several new `G.*` collections rely on the v2 migration for pre-batch saves; R3 relegation is rare (needs sustained collapse) so it wasn't hit in the 6-yr playtest — logic is unit-tested, not yet seen live.

---

## 1e. Desktop build + gameplay batch (NEW, 2026-07-03)

Six commits on top of `fdc84b5`: `cd289e7` icons/CSP/toolchain → `a61e3e5` R5 → `c0d8d11` R8 → `7ae59db` R10 → `fd65716` R12. **891 tests / 72 files**, build clean, tree clean, pushed + mirror ff'd.

**Tauri desktop build — R24 UNBLOCKED (`cd289e7`):** the `.exe` now builds and runs.
- **Toolchain (winget):** `Rustlang.Rustup` (stable-x86_64-pc-windows-msvc, rustc/cargo 1.96.1) + `Microsoft.VisualStudio.2022.BuildTools` (`--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended`); WebView2 already present. **Gotcha:** cargo bin (`~/.cargo/bin`) is NOT on PATH — prepend `$env:USERPROFILE\.cargo\bin` in the build shell.
- `npm run tauri build` → `src-tauri/target/release/app.exe` (8.5 MB) + `bundle/msi/*.msi` + `bundle/nsis/*-setup.exe` (build auto-fetches WiX 3.14 + NSIS 3.11). Smoke-tested: launches a titled window, closes clean.
- **Original icon:** `src-tauri/icon-source.svg` → `icon-1024.png` → `npm run tauri icon` regenerates the whole set (leaf emblem, game palette, no IP). `sharp` added as a devDep for SVG→PNG.
- **CSP hardened** (`tauri.conf.json`): `null` → `script-src 'self' 'unsafe-inline'` (the game uses inline `onclick=` handlers — verified a strict `script-src 'self'` breaks every button), `style-src 'unsafe-inline'`, `connect-src` open for the user-entered MP server, `object-src 'none'`, `base-uri`/`frame-ancestors` locked. Verified in-browser via the same CSP as a meta tag: renders + handlers fire, console clean. **Still open before ship:** code signing, Steam Direct, store page (all non-code).

**Gameplay routes (all pure-logic unit-tested + panel-wired):**
- **R5 stage math (`a61e3e5`):** `shared/utils/stageMath.js` (14 tests) — squad power, stat avg, seed edge, survival mult, exam/war advance probabilities, duel scoring. exam.js/war.js now delegate; behaviour legacy-exact.
- **R8 live-battle micro-call (`c0d8d11`):** `shared/utils/battleCalls.js` (8 tests). Before the final beat of a squad mission the viewer pauses and offers **Commit Reserves** (bet on the last beat — clutch upgrade if it lands, overcommit downgrade if not) or **Disengage** (safe). Only the quality band (one step, same success side) + a small ryo/legend/morale delta move — **never** the win/loss. `adv.js _buildMissionReport` attaches a live-only `applyCall` closure (dropped on save by design). Browser-verified both paths incl. the clutch outcome (+ryo, decisive verdict).
- **R10 scouting dossiers (`7ae59db`):** `shared/utils/scoutDossier.js` (10 tests) — chronological report timeline with confidence deltas, trend (rising/falling/volatile/steady), aging (>12mo = 'cold'), age-weighted consensus. Expandable "Dossier" toggle on the scouting card. Browser-verified live (month labels, trend, consensus, freshness).
- **R12 agent relationships (`fd65716`):** `shared/utils/agentRelations.js` (9 tests). Agents are now a **persistent roster** `G.agents` (was throwaway per-listing names); standing (0–100) → tier (Hostile..Trusted) that shifts the fee cut and, at Trusted, gives first-refusal tips on their other listed clients. Signing lifts standing. `state.js ensureAgents()`/`assignAgent` draw from the roster. Panels render error-free; the populated agent badge needs a live transfer window (not reached via endTurn in the quick playtest — logic is unit-tested).
- **Watch-outs:** R8's micro-call is intentionally **live-only** (the `applyCall` closure doesn't survive save/reload — re-watching a reloaded mission offers no call). R12's badge/first-refusal tip only shows once a transfer window populates the pool with an A-rank+ (agent-repped) entry. main.js `toggleScoutDossier` window-wiring for R10 landed in the R12 commit (harmless cross-attribution).

---

## 1f. Second gameplay batch — 6 routes + 3 polish (NEW, 2026-07-03)

Ten commits on top of §1e (`b8b1bd0`): `0f2960e` R12+ → `fc3959f` R8+ → `98a9040` R14 → `da54aec` R6 → `f8bc203` R27 → `e982faa` R25 → `b847f3a` R26 → `504b682` R15 → `a14fe60` save slots. **932 tests / 79 files**, build clean, tree clean, pushed + mirror ff'd. Every route follows the house pattern: a pure `shared/utils/*` module with its own test file, wired into the panels; adv.js tick systems verified in a live 24-month browser run (zero console errors).

**New routes:**
- **R6 host bidding** (`shared/utils/hostBidding.js`, 7 tests) — `G.examHosting` was read but never set; now eligible villages (prestige C+) bid ryo for hosting rights vs rival bids (prestige home-weight), with prestige-scaled gate revenue. Card on the exam setup screen; `G.examHostResolved` resets each cycle.
- **R14 sponsor depth** (`shared/utils/sponsors.js`, 9 tests) — negotiate a pending offer (push pay / ease clause; leverage from prestige+rep) and an active sponsor's `mood` (0-100) drifts with results/obligation, scaling payout 0.85–1.15× and walking away if it collapses. Finances panel shows negotiate buttons + mood.
- **R15 beast extraction** (`shared/utils/beastExtraction.js`, 9 tests) — 3-stage op (Intel→Infiltration→Extraction) on a rival-held primal, odds from your strength vs holder, failure risks war; success frees the beast to the wild. `G.beastOp` drives it; UI on the beasts panel.
- **R25 medical/rehab** (`shared/utils/medical.js`, 11 tests) — injured shinobi get a rehab plan (rush = 2× speed + re-injury risk + rusty form / standard / careful = needs a medic, best form + one-shot `s.injuryResist`). Recovery tick + `applyInjury` honor it; picker in the roster dossier. `s.rehabPlan`.
- **R26 staff development** (`shared/utils/staffDev.js`, 10 tests) — staff gain XP monthly and level Novice→Master; level-up bumps their primary stat (so scout/sensei/medic effects improve) and the level bonus scales medic recovery. `s.staffLevel`/`s.staffXp`; shown on staff cards.
- **R27 populace support** (`shared/utils/populace.js`, 8 tests) — a civilian support meter (`G.populace.support`) distinct from morale; reacts to results/treasury, scales gate revenue 0.90–1.15×, fires festival/unrest at the extremes. Dashboard strip.

**Polish:**
- **R12+** — poaching/lowballing now apply the `poached`/`lowballed` agent-standing penalties; new 🤝 Agents tab in transfers lists every agent with standing/fee/deals/clients.
- **R8+** — solo missions now build a viewer report (single-member squad shim) so they get the live viewer + micro-call (success + surviving-failure; skipped on KIA).
- **Save slots** — `save.js` gains `saveToSlot/loadSlot/slotMeta/deleteSlot/listSlots` (3 slots + metadata) alongside the autosave; `setup.js restoreSlot`; dashboard Save Slots card. `hvm_slot_N` keys.

**Watch-outs:** the R14 sponsor mood / R15 extraction / populace event visuals depend on reaching those states (sponsor offer ~6%/mo, rival-held beast requires a strong rival that pre-holds one); logic is unit-tested and panels render clean. adv.js is larger again (all six tick hooks land in it) — keep verifying tick changes in-browser. `v.hostile` (set on a failed extraction) is a new flag not yet consumed by the war system — a future hook.

---

## 2. Repo & workflow rules (IMPORTANT)

- **Canonical repo:** `C:\Users\Tyler\ninja\hidden-village-manager` — do all work here.
- **Stale mirror:** `C:\Users\Tyler\hidden-village-manager` (the "Darjo" copy) — **never edit**; fast-forward only.
- **GitHub:** `github.com/Darjo-clauder/hidden-village-manager` (Railway auto-deploys master).
- **Every commit:** push origin from `ninja`, then in the mirror: `git fetch origin && git merge --ff-only origin/master`.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (the current session's co-author; match whichever model you are).
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

- **`client/js/adv.js`** (~3580 lines) — the master monthly tick (`adv()`). All economy, missions, season matchday, schedulers live here. Game state is the global `G` object (built by `initState()` in `state.js`). **Modularity in progress:** cohesive tick slices are being extracted into **`client/js/tick/*`** (each operates on the global `G`, same architecture). First slice: `tick/rivals.js` (`tickRivalSim`/`tickRivalGMMoves`); shared `pushNarrative` lives in `tick/inbox.js`. **NB: `adv()` has NO direct test coverage** (it imports DOM/socket-coupled `ui.js`/`socket.js`, so it can't be imported headless) — verify adv.js changes via `npx vite build` + browser playtest, NOT the vitest suite.
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

- **Localization — foundation DONE, P2 ESSENTIALLY COMPLETE (2026-06-26):** P0/P1 shipped 2026-06-24 (see `docs/L10N_PLAN.md`). `shared/utils/i18n.js` (`t()` mini-ICU formatter), `shared/i18n/en.js` (string table, **~820 keys**), `shared/i18n/ipNames.js` (`ipName(kind,id)` IP swap point). **P2 — DONE:** (1) **Static chrome** across all 30 panels via DOM localizer **`client/js/i18nDom.js`** (`data-i18n="key"` → `t(key)`, re-runnable on `setLocale`); `main.js` runs `localizeDom()` on DOM-ready and `window.setLocale` re-localizes for the `en-XA` QA pass. (2) **ALL 657 `aL`/`ntf` toasts** keyed — a full-codebase sweep confirms **zero literal toasts remain** in any `client/js` file (incl. all 271 in `adv.js`, plus socket.js/scoutEngine/missionGen/world/prospectEngine/careerEngine/depthEngine/main/setup). Toast keys are namespaced `toast.<area>.<id>`; reusable commons like `toast.common.notEnoughRyo*`. Guardrail test asserts every `data-i18n` key resolves. **Conventions:** import `t` directly, or `import { t as tr }` when the file uses `t` as a loop var; static-HTML uses `data-i18n`; interpolate via params (never pre-concatenate), ICU plural in the value for counts. **WATCH OUT:** when bulk-editing JS template strings with `perl`, `${t(...)}` only interpolates inside backticks — perl kept landing it inside single-quoted literals (silent: literal text, not a build error). After any bulk pass, grep `(aL|ntf)\('[^']*\$\{t` and browser-check for literal `${t(`. **Remaining (minor):** deeper non-toast inline strings inside dynamic panel bodies (e.g. press-conference/inbox item bodies, scouting/meetings/beasts dynamic content) — diminishing-value, stop-anytime. Verify locale wiring with `setLocale('en-XA')` in console. Accessibility half of polish IS done (P5).
- **Grand Tournament internal naming:** display says "Grand Tournament" but state/chronicle keys are still `warSched`/`warActive`/`Nation War` internals (kept for save compat). Harmless; just don't be confused by the mismatch.
- **War/Exam stage logic lives in panels**, not unit-tested. Worth extracting stage math to shared pure utils.
- **Grand Tournament KIA on rivals** permanently removes roster ninja; replenishment is light — watch for rival roster depletion over many years.
- **Long-run balance swept (2026-06-24):** deterministic 20-year sweep added (`tests/dynastySweep.test.js`). Found + fixed a real drift — `tickRivalStrength` had positive-only drift with no mean reversion, so rivals saturated at the 200 cap over a dynasty and lost all differentiation. Now mean-reverts toward a personality/relations-shifted per-village baseline (`village.baseStrength`, lazily set). Kage XP/point curve verified healthy (no unbounded points within a realistic horizon); rep-income soft cap holds. Sweep model omits the real 50-roster wage bill / staff / upkeep, so it's a curve-regression harness, not an economy-tuning oracle.
- **Preview build + socket race:** `npx vite build` required before any browser verify (preview server :3000 serves static `dist/`). Also `endTurn()` no-ops until the socket connects — after a page reload, give it a beat before driving turns via preview_eval, or the date won't advance.
- **`window.G`/`window.upUI` are NOT exposed** — browser verification is DOM-only (read sidebar/panel text).

---

## 7. Next targets

As of 2026-06-25 the build is a "functioning sports sim that feels like one" with a now-**coherent, playtest-validated economy** (see the economy-overhaul block below) and a new-player polish pass across all four demo screens (dashboard / missions / season / roster dossier). It's at a clean, deployable checkpoint — a strong state to hand to playtesters. Candidate next targets (user's call):

1. **Localization P2 — DONE** (§6): all static panel chrome + all 657 `aL`/`ntf` toasts are keyed (~820 keys; zero literal toasts remain). What's left is low-value: deeper inline strings inside dynamic panel bodies (press-conference/inbox item text, etc.) and the actual translation of a second locale (only `en` + `en-XA` pseudo exist). Treat L10N as a closed milestone unless a real second-language build is requested.
2. **`adv.js` modularity** (now ~3580 lines) — continue extracting cohesive tick slices into `client/js/tick/*` (first slice landed: rivals). Candidates next: season-table block, academy/youth-dev tick, staff tick. **No vitest net for adv.js** — each slice needs build + browser playtest.
3. **Mid-season pressure follow-ups** / **live battle for solo missions** — smaller flavor items; solo missions still resolve without a Watch option (squad-only by design so far).

**Recently done (2026-06-26 — modularity + dynasty watch + L10N P2 session):**
- **adv.js modularity, first slice** (`53aae60`): rival sim extracted to `client/js/tick/rivals.js` (`tickRivalSim`/`tickRivalGMMoves`), shared `pushNarrative` → `tick/inbox.js`. Established the `tick/` pattern. adv.js 3667→3580. **Discovered adv() has no test net** (DOM/socket-coupled imports) — verified via build + 14-month browser playtest.
- **Late-dynasty economy watch — §7.2 CLOSED** (`2635312`): extended `tests/dynastySweep.test.js` to a 30-year horizon. Verdict: does NOT bleed out — year-end ryo grows monotonically 2.0M→4.7M and the passive net flips *positive* (−5k→+13k/mo) as rep lifts income past the soft cap while staff/roster plateau. Locked by 4 tests (LATE-SOLVENT / LATE-GROWTH / LATE-NET-STABILISES / LATE-SNAP).
- **Localization P2 — COMPLETE** (`c75f069`…`89367c8`): DOM localizer `client/js/i18nDom.js`; all static panel chrome (nav, status, turn-loop, 26 panel titles, 24+ panels' headers/buttons/empty-states) **and all 657 `aL`/`ntf` toasts** keyed across every panel + engine file (adv.js's 271 done in 6 chunks). ~820 keys; guardrail test green. Zero literal toasts remain (full-codebase sweep). Verified via build + browser playtest (incl. 24-month `adv()` run, no errors) + `en-XA` pseudo-loc. See §6.

**Recently done (2026-06-25 — production-prep + economy overhaul session):**
- **ECONOMY OVERHAUL (4 commits, one root cause).** The starting state and the balance constants had been authored independently and never reconciled. Traced through four layers, each fix exposing the next:
  - `5e76c20` revenue band-aid (`BASE_REVENUE` 22k→28k) — **later reverted, see below.**
  - `d4616a0` **hidden luxury-tax drain**: a fresh village sat ~2× over its own salary cap (staff wages counted against it), bleeding ~10.6k/mo luxury tax that NO display showed — real passive drain was −21k to −28k/mo while the panel read −7k "Stable". Fix: **cap counts shinobi payroll only (staff exempt)**, D cap 18k→24k; luxury tax folded into the recorded net (engine + both panels) and scout costs too; `salaryCap.js`.
  - `84ff8d4` **harness modeled a fictional prestige curve** — it proxied prestige off *reputation* with invented thresholds, but the live game derives it from *legend* (`adv.js` PTIERS). New **`shared/constants/prestige.js`** (`PRESTIGE_TIERS` + `prestigeFromLegend`) is now the single source of truth, used by BOTH adv.js and the sweep. Locked by `tests/prestige.test.js`.
  - `bd82520` **the actual root cause**: `seedPhase1` (QA scaffolding wired into live setup) injected a free **5-scout network (~11.8k/mo)** into every new village. Removed → village starts **lean** (starter scout + sensei from initState; player hires the rest). `BASE_REVENUE` reverted 28k→**22k**. Fresh village now sits **near break-even (~−1k/mo, "Stable")**; deficit pressure comes from the player's own spending, not unchosen costs.
  - **Net state:** economy is coherent; harness validates against the REAL prestige driver. New guards: `ECON-RUNWAY` (near-break-even band + cap-legal start), luxury-tax modeling in the sweep, `prestigeFromLegend`.
- **Production hardening** (`cdff97b`): new `shared/utils/debug.js` (`DEBUG` via `?debug=1` or `localStorage.hvm_debug`; `dlog`/`dwarn` no-op in prod) — gated the 5 unconditional console.logs in `socket.js`/`phase1.js`.
- **New-player polish** (`315cf89`/`6d2ccac`/`25ab4bd`): dashboard Treasury **runway readout** (`~N mo runway`, recolors <6/<3mo, hidden >24mo) + deficit onboarding step; missions board **color-tiered risk** (green≤15/amber≤30/red, `_riskColor`) + gold rewards + risk on squad cards; season standings **Edge column** (seed→Grand Tournament combat bonus, exact mirror of `war.js` `seedBonus`) + leader 👑.
- **AUDIT NOTE:** code itself is clean (7 debug markers in 23.8k LOC, all growth arrays capped, no listener leaks). The recurring bug class this session was *balance-constant vs seeded-state* drift, not code cruft. The DRY extraction of `prestigeFromLegend` + the harness fixes close that class. Largest remaining modularity target is `adv.js` (3.7k lines), a multi-session job. Tournament internal naming still `warSched`/`warActive` (display-only Grand Tournament rename).
- **Dossier polish** (`8b93922`): roster Full Dossier header now leads with at-a-glance `Ability ★ · Potential ★ · Pwr` (was buried at the bottom). Uses the table's `_potential()` helper — also fixed a pre-existing table-vs-dossier inconsistency (table showed potential stars, dossier hid them as `???`).
- **Lean-start playtest-validated** (4-yr active play, not just the harness): year-1 dip to ~30k (tighten up, never near bankruptcy) → steady growth 46k→81k→117k; prestige D→C→B via legend; no errors. **Roster attrition is BY DESIGN** — mission-KIA thins the roster down to a hard floor of 14 (`adv.js:1247` auto-signs the best prospect below 14); graduates feed the prospects pool, player recruits to grow past the floor. Not a bug; it's the "engage the academy" pressure.
- **Schedule depth** (`c1e4e8d`, League Fixture Grid); **mid-season pressure notices** (`seasonPressNotice`); **dynasty balance sweep** (`tests/dynastySweep.test.js` + rival mean-reversion fix in `rivalSim.js`); **P1 kit** on Academy + Depth Chart.
- **Localization foundation P0+P1** (`shared/utils/i18n.js`, `shared/i18n/en.js` + `ipNames.js`; see `docs/L10N_PLAN.md`).
- **Season experience M1–M4** (all in `season.js` pure helpers + `panels/exam.js` `_seasonTab`): M1 matchday scorelines + form guide + GD (`styledScore`/`teamForm`, `_seasonResultsCard`); M2 next-match build-up (`matchPreview`); M3 title-race banner (`seasonState`); M4 off-season awards ceremony (`_seasonReviewCard`).
- **Live battle viewer (complete)** — watch-it-unfold overlay, pure presentation over engine-decided results (`shared/utils/battleViewer.js` + `client/js/liveBattle.js`, `.bv-*` CSS). Covers: **missions** (`watchLastBattle`, ▶ Watch on mission report), **league matchday** (`watchMatchday` + `matchToBeats`), **Chunin Exam** (`watchExam`) and **Grand Tournament** (`watchTournament`) — the last two via safe per-stage bookkeeping `G._examRun`/`G._warRun` (no outcome change, stops at first elimination). **Auto-watch** toggle (`58833a2`): `G._autoWatchBattles` (default off) → `ui.js` `upUI()` one-shot opens the viewer once per turn after a squad mission (armed by `G._battleReportFresh` in adv.js), gated out of exam/war; ☐/☑ toggle beside the ▶ Watch button.
- **Repo cleanup** (`e079c1d`): removed stray `hidden_village_manager (1).html` prototype; deleted 4 merged stale branches (local + origin). Only `master` remains.

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
2. `git -C C:\Users\Tyler\ninja\hidden-village-manager log --oneline -5` — confirm HEAD matches above (`89367c8`).
3. `npx vitest run` — expect 680 passing / 54 files.
4. `npx vite build` before any browser playtest (see §6 build + socket-race notes).
5. Ask the user which target to take next (see §7), or continue whatever they were mid-stream on.
