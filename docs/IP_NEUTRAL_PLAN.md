# IP-Neutral Conversion Plan — toward a sellable build

**Created:** 2026-06-27 · **Purpose:** make the build legally sellable (Steam) by removing Naruto IP, without rebuilding game systems.

## STATUS (2026-06-27)
- **Decisions locked:** single neutral fork (no `ipName` coexistence); full scrub incl. generic terms; lexicon below.
- **Tier 1 — DONE & verified** (ranks, villages, kage titles, clans, landmines). 680 tests green, build clean, in-browser playtest clean (16-tick run, zero stray terms across 12 panels).
  - Ranks: Genin/Chunin/Jonin/ANBU/Sannin → **Initiate/Adept/Veteran/Shadow/Legend**. `-kage` title → **Warden**. ANBU → Shadow.
  - Villages: all `-gakure` → original names (Dunehold, Tidefort, Stoneveil, Stormreach, Wellspring, Verdancross, Frostmere, Starhaven, Cragmoor, Emberfall, Mistral, Thornveil, Hollowmere). Kage names Sabaku/Tendo/Akatsuchi → Korin/Renji/Tetsuya.
  - Clans: `Fuma` → Kusari. Regions "Land of X" → The Emberlands/Tempest Reach/Tidewater/Dunelands/Stonelands/Iron Marches. Mission "Akatsuki" → Syndicate. Jutsu "Eight Inner Gates" → Eightfold Limit Break. `Tsukikage` style → Tsukimei. `NARUTO_ARCHETYPES` const → `NARRATIVE_ARCHETYPES`. Naruto-in-comments reworded.
- **Tier 2 — DONE & verified** (beast subsystem). jinchūriki → **Vessel**, tailed beast/bijuu → **Primal**, the `N-Tails` structure → **Tier-N Primal** (kept original beast names + ◆ pips + `tails` data field). `TAILED_BEASTS` const → `PRIMALS`. `releaseJinchuriki` fn → `releaseVessel`, `seal_bijuu` id → `seal_primal`. Canon "Ox-Octopus" (Gyūki) form description rewritten.
- **Residual (needs Tyler's creative input, NOT a blocker for "no obvious IP"):** the 9 beasts' *creature designs/elements* still loosely parallel the canon tailed beasts (Sand/Blue Fire/Lava/Steam/Acid/Ink/Pure Chakra + ordering). Names + framing are now original; deeper redesign (different count, original elements/forms) is a design choice to make later.
- **Tier 3 — NOT STARTED** (optional, low-value): "jutsu" (~65 refs) → "technique/art" display; internal stat keys (`ninjutsu` etc.) stay.
- **Internal IDs deliberately kept** (non-display, safe): `anbu` dev-path/tab ids, `.jk` beast-host field, `.tb-tails` CSS class, `G.beasts`.

---
**Original plan below (for reference):**

> **Not legal advice.** This is an engineering inventory + plan written by the dev assistant. Before committing money to a launch, run the borderline terms (esp. Genin/Chunin/Jonin, "jutsu", clan/bloodline flavor) past an IP attorney. The clearly-coined terms (ANBU, Sannin, jinchūriki, tailed beasts, `-gakure`/`-kage` names) should be scrubbed regardless.

---

## 0. The core finding

The game **systems** (economy, season sim, missions, GM career, the whole loop) are original and sellable. What isn't sellable is the **Naruto naming skin** on top. There is **no copyrighted art** to replace — the game is 100% emoji — which removes the single most expensive part of an IP scrub. This is a bounded rename job plus one small subsystem redesign.

**Estimated effort: ~3–4 focused coding sessions** for an IP-clean build, then a separate non-code Steam/store workstream.

---

## 1. Already IP-neutral ✅ (done in earlier work)

- **Clans (`shared/constants/clans.js`):** Kageha, Shiromi, Kagero, Tsuchida… — original names.
- **Bloodlines:** Kagan, Hakugan, Shadow Weave… — original.
- **Nations (`shared/constants/nations.js`):** Ember / Tempest / Tide / Dune / Stone — original (not Fire/Lightning/Water/Wind/Earth).
- **No sprite/character art** anywhere — emoji only. A generic 🍃 leaf is not the Konoha mark.

⚠️ **But note a duplicate:** there is a **second, different clan table** in `client/js/constants.js` (`CLANS=[{n:'Kageha',…},{n:'Fuma',…},{n:'Mori',…}…]`). `Fuma` is a canonical Naruto clan name and must be renamed. The two clan systems (`constants.js` vs `shared/constants/clans.js`) should be reconciled or both scrubbed — don't fix one and miss the other.

---

## 2. Inventory of remaining IP (by bucket, descending risk)

### Bucket A — Village & Kage names — **HIGH**
The `-gakure` ("hidden village") and `-kage` ("shadow/leader") naming is a Naruto convention, and several names are literal canon (Takigakure, Kusagakure, Yukigakure, Hoshigakure, Yugakure are real Naruto villages; Kazekage/Raikage are canon titles).

- `client/js/constants.js:VILLAGES_DEF` — Kazegakure/Shimogakure/Gangakure/Raikurokure + kageRank Kazekage/Hyōkage/Gankage/Raikage.
- `client/js/constants.js:RIVAL_VILLAGE_POOL` — 12 `-gakure` villages + 12 `-kage` titles.
- `client/js/constants.js:RIVAL_KAGE_NAMES` — includes **`Sabaku`** (Gaara's canon surname). Audit the whole list.
- `client/index.html` — `placeholder="Konohagakure"` on the village-name input.
- Rendered in ~hundreds of sites off this small data source — fix the **data**, not the call sites.

### Bucket B — Tailed-beast / jinchūriki system — **HIGH** (needs design, not just rename)
The "1–9 tailed beasts sealed into hosts" structure is one of Naruto's most recognizable concepts. Renaming alone isn't enough; the *structure* (numbered tails 1→9, "jinchūriki" hosts) should be reconceived.

- `client/js/constants.js:TAILED_BEASTS` — 9 entries with `tails:1..9` counters. (Names like Sakeru/Niryuu are already original; the `tails` ladder + "tailed beast" framing is the tell.)
- `client/js/beastEngine.js` (~597 LOC) + `client/js/panels/beasts.js` (~453 LOC) — full subsystem; ~40 `jinchuriki` + ~11 `bijuu` + "Tailed Beast" refs.
- Scattered refs in `economy.js`, `war.js`, `roster.js`, `finances.js`, `state.js`, `adv.js`, `index.html`, `en.js`.

### Bucket C — Rank ladder — **MIXED**
- `client/js/constants.js:RANKS=['Genin','Chunin','Jonin','ANBU','Sannin']` + `SPECS` includes `'ANBU Ops'`.
- **ANBU** and **Sannin** are Naruto-coined → **high risk**, scrub.
- **Genin / Chunin / Jonin** are real historical/fictional ninja-rank words that predate Naruto → lower risk, but heavily associated; recommend scrubbing for a clean conscience.
- ~150 hardcoded literals across panels **plus the values inside `shared/i18n/en.js`** (the L10N pass keyed the *toasts* but the English values still read "Chunin"/"ANBU"/etc.).

### Bucket D — "jutsu" + stat keys — **LOW** (generic, but pervasive)
- ~250 refs to `jutsu`; stat keys `ninjutsu`/`genjutsu`/`taijutsu` (generic Japanese: technique/illusion-art/body-art).
- Low legal risk (generic vocabulary), but evocative. Recommend **display-only** rename if scrubbed — do **not** churn the internal stat *keys* (`b:{ninjutsu:…}` is used as data everywhere; renaming keys is high-churn, low-reward).

---

## 3. The swap point exists but is NOT wired in

`shared/i18n/ipNames.js` was built as the single place to swap rank/role/clan/nation labels via `setIpOverrides()` + `ipName(kind,id)`. **`ipName()` currently has zero call sites** — scaffolded, never plumbed. It also doesn't yet cover **villages** or **beasts**.

So the foundation is real but the work is: (a) extend `ipName` to `village`/`kageTitle`/`beast`, (b) route render sites through it (or just rename the source data outright — simpler for a single-IP build), and (c) update `en.js` values.

**Recommendation:** for a single sellable build, **rename the source data directly** (Bucket A/C data, beast data) rather than routing everything through `ipName`. Keep `ipName`/`setIpOverrides` only if you still want the private Naruto build to coexist via overrides. Decide this first (see §6 Q1).

---

## 4. Proposed replacement lexicon (Tyler's call — these are drafts)

Designed to fit the existing Ember/Tempest/Tide/Dune/Stone nations.

| Naruto term | Proposed neutral term |
|---|---|
| `-gakure` villages | drop the suffix; original place-names (e.g. Dunehold, Frostmere, Stoneveil, Stormreach, Emberfall) |
| `-kage` titles + "Kage Path" | single title **"Warden"** (or "Overseer" / "Highmaster") |
| Genin / Chunin / Jonin / ANBU / Sannin | **Initiate / Adept / Veteran / Shadow / Legend** |
| ANBU / "ANBU Ops" | **Shadow Corps / Shadow Ops** |
| Sannin | **Legend** |
| jinchūriki (host) | **Vessel** (the benefit text already says "Vessel") |
| tailed beast / bijuu | **Primal / Titan-spirit / Relic** (reframe: named ancient powers, drop the 1–9 "tails" counter — replace with a power *tier* label) |
| jutsu (display) | **technique / art** |
| ninjutsu/genjutsu/taijutsu (display only) | Mystic / Illusion / Martial (keep internal keys unchanged) |
| shinobi / ninja | keep "shinobi" (generic) or → "operative/adept" |

---

## 5. Ordered task plan

**Tier 1 — Rename layer (Buckets A + C). ~1–2 sessions.**
1. Decide lexicon (§4) + the `ipName`-vs-direct-rename question (§3).
2. Rename village/kage data: `VILLAGES_DEF`, `RIVAL_VILLAGE_POOL`, `RIVAL_KAGE_NAMES` (kill `Sabaku`), `index.html` placeholder.
3. Rename `RANKS`, `SPECS` (`ANBU Ops`), the two `CLANS` tables (kill `Fuma`), `RKC`/`kageRank` flavor.
4. Sweep `shared/i18n/en.js` values for Chunin/Jonin/ANBU/Sannin/Kage/jutsu/jinchuriki/tailed-beast literals.
5. Sweep remaining hardcoded literals across `client/js/panels/*` + engines. **Heed the L10N warning:** bulk `perl`/`sed` passes have historically mis-landed edits — grep-verify + browser-check after each pass.

**Tier 2 — Beast subsystem redesign (Bucket B). ~1 session.**
6. Reframe `TAILED_BEASTS` → original "Primals/Relics"; replace `tails:N` with a tier label.
7. Rename `jinchuriki`→`vessel`, `bijuu`/`tailed beast`→new term across `beastEngine.js`, `panels/beasts.js`, and scattered refs.
8. Verify the subsystem still resolves names everywhere (war KIA edge, finances benefit, roster badge).

**Tier 3 — "jutsu" display pass (Bucket D, optional). ~½ session.**
9. Display-only rename of `jutsu`/technique terms; **leave internal stat keys alone.**

**Verification each tier:** `npx vitest run` (expect ~680 green — most IP is in strings, so tests should hold) + `npx vite build` + browser playtest (`beginGame` → run several `adv()` ticks → spot-check roster/exam/war/beasts panels for stray Naruto terms). Per HANDOFF §6, build before any browser verify.

**Final IP sweep:** re-run the audit grep (below) → expect zero high-risk hits. Also eyeball for any *character* names or quotes that slipped into flavor text (`BACKSTORIES`, narrative blurbs).

```
grep -rioE "naruto|konoha|uchiha|hyuga|sharingan|byakugan|jinchuriki|tailed beast|bijuu|kyuubi|kazekage|raikage|hokage|sannin|anbu|gakure|sabaku|fuma" client/ shared/ index.html
```

---

## 6. Decisions needed before Tier 1 (ask Tyler)

1. **Coexist or fork?** Keep the private Naruto build alive via `ipName`/`setIpOverrides`, or hard-rename the source data into a single neutral build? (Affects whether we wire the swap point or just rename.)
2. **Lexicon sign-off** (§4) — esp. the village/title/rank names.
3. **Scope of caution** — scrub Genin/Chunin/Jonin and "jutsu" too (recommended), or leave the generic terms?

---

## 7. Non-code workstream (the real launch gate)

Separate from the scrub, Steam needs: Steam Direct registration ($100/app fee), original key art + capsule images (store requires graphics even if the game is emoji), store description/trailer, a content-rights affirmation in Steamworks, and tax/payee setup. None of this is blocked by the code; flag it early because the art/store assets take real calendar time.

---

*Keep this doc in sync with [HANDOFF.md](HANDOFF.md) once conversion work begins.*
