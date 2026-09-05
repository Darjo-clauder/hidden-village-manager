# Visual Overhaul — Art Direction Brief

Hidden Village Manager. Written at `f0e1184` against the real codebase, not
against impressions. Every number below was measured; the commands are in the
session log and re-runnable.

**The thesis in one line:** the palette is not the problem. This game is built
like a card-based mobile app and it is a desktop data simulation, and every
symptom below follows from that one mismatch.

---

## 1. Visual Audit

### 1.1 What is actually good, and must survive

Say this first, because a redesign that throws it away would be a downgrade.

- **The palette is genuinely well-made.** 55 tokens, a coherent "ink and
  parchment" identity, semantic colours (`--green`/`--red`/`--orange`/`--blue`)
  separated from the `--gold` brand accent, and each with a matching `-bg` and
  `-hi` variant. That is a real system and most projects never get there.
- **The type ramp is disciplined** — 8 steps (10/11/12/13/15/18/22/28) all
  multiplied through `--fs-scale`, so accessibility scaling works globally.
- **A spacing scale exists**: `--sp-1..5` at 4/8/12/16/24.
- **Per-nation accent retinting works** — `_applyNationTheme` rewrites
  `--accent` and derived tints at runtime.
- **The match viewer is the best-looking thing in the game** by a wide margin:
  hex arena, token anatomy, overlays, stats sheet.

### 1.2 The structural fault — measured

| | count |
|---|---|
| Inline `style="` attributes in panel JS | **3,072** |
| Shared CSS class rules | 410 |
| Raw hex literals still inline | 108 (**90 distinct**) |
| Design tokens defined | 55 |
| Panels | 30 |
| Panel JS | 11,564 lines |

**3,072 inline styles against 410 classes is the headline.** The "ink and
parchment" pass migrated *colour* onto tokens; it never migrated *layout*.
Padding, gaps, borders, font sizes, flex directions and widths are still typed
by hand at every call site. Consequences:

1. **Nothing can be restyled globally.** Changing card padding is a 3,072-site
   find-and-replace, not a token edit. This is why the elevation pass had to be
   shipped as "shadow only" — the CSS comment says so explicitly: *"`.surf`/
   `.well` add ONLY shadow, so the background and border already written inline
   on the element keep winning. That makes elevation one dial rather than 76
   markup edits."* That is the fault being worked around, in the source, in the
   author's own words.
2. **90 distinct raw hexes bypass the token system entirely.** The theme is not
   actually the single source of truth it appears to be.
3. **Visual drift is guaranteed.** Two panels written a month apart cannot look
   the same, because nothing enforces it.

### 1.3 One typeface for a numbers game

Measured font families in the entire codebase:

```
'Segoe UI', system-ui, -apple-system, Arial, sans-serif   ← everything
'Courier New', monospace                                  ← a few stat readouts
Georgia, serif                                            ← two places
```

The game runs on **the operating system's default UI font**. There is no
typographic voice at all. Worse, for a simulation whose entire surface is
numbers, the primary face has **proportional (non-tabular) figures**, so
columns of digits do not align, and `Courier New` — used where alignment
mattered enough to notice — is a 1955 typewriter face that is the single most
dated thing on screen.

### 1.4 A table game with no tables

**8 `<table>` elements across 30 panels.** Football Manager, OOTP and FHM are,
visually, *table applications*. This game renders almost everything as a grid
of bordered cards with inline styles. The consequences are structural:

- **No column sorting, no column selection, no comparison.** Scanning twenty
  shinobi across six stats means reading twenty separate card layouts.
- **Density is impossible.** A card costs ~5× the vertical space of a row, so
  fewer entities fit on screen, so the manager sees less of their world.
- The one dense-table rule that exists — `.tbl-dense`, with sticky headers and
  hover rows — is good, and used **8 times**.

### 1.5 No data visualisation layer

There is **no charting code in the project**. One hand-rolled sparkline in
`finances.js` is the entire data-viz surface. For a game whose subject is
*trends over decades* — form, morale, finances, development curves, standings,
legacy — this is the largest missing feature in the visual system.

### 1.6 Component vocabulary is thin and lopsided

Of 410 classes, the largest single group is `bv-*` (the battle viewer, ~60
classes). The general UI has `.mc` (mission card), `.card`, `.chip`, `.gb`
(button), `.tab`, `.surf`/`.well`/`.strip`, `.tbl-dense`, `.sect`, `.stat`.
There is no shared vocabulary for: page header, toolbar, filter bar, empty
state, inspector panel, data row, KPI tile, badge, progress meter, timeline,
avatar/portrait, modal, tooltip, or breadcrumb — all of which are hand-built
inline, repeatedly, differently.

### 1.7 Known, already-measured defects

Carried from the pinned audit so the artist has them in one place:

- `--text-faint` renders at **2.25–2.36:1** across ~354 text nodes. Below AA.
- **The elevation pass is invisible**: `.surf`'s contact shadow measures
  **1.02:1** against the page (1.00 = no difference), `.well`'s inset 1.05.
  The plain 1px `--border` already on those cards does **1.31** — roughly six
  times the separation of the shadow layered over it. On a near-black ground a
  *dark* shadow has nothing darker to fall onto.
- The vignette (`body::after`) darkens screen edges by up to **42%**, so every
  contrast figure above is the best case.
- No focus-visible styling on most interactive elements; the game is built on
  inline `onclick` handlers on `<div>`s in many places.

### 1.8 Screen flow

Shell is `sidebar 188px` + `topbar 44px` + `ticker 20px`, with 30 flat nav
entries grouped into collapsible sections. Problems:

- **30 destinations is a lot of flat navigation.** FM solves this with a
  persistent context (the club you are managing) plus a shallow, wide top bar.
- **No inspector pattern.** Selecting a shinobi opens a modal dossier
  (`oDos`), which destroys the list context behind it. Every sports sim of this
  type uses a master–detail split instead.
- **No breadcrumb or "where am I"** beyond the highlighted nav item.

---

## 2. Comparison to Industry Standards

### What the reference games do well

**Football Manager** — the strongest information architecture in the genre.
- Persistent **context bar**: club crest, date, next fixture, balance, always
  visible. You never lose your place.
- **Master–detail everywhere.** A squad list on the left, the selected player
  inline on the right. Selection never destroys context.
- **Attribute density with colour encoding**: 30+ attributes per player in one
  glance, each cell tinted by value band, sortable by any column.
- **Widgets are user-arranged**, which signals that the data is the product.

**Out of the Park Baseball** — the density benchmark.
- Tables are the primary interface, with column pickers, saved views, sorting
  and filtering as first-class features.
- **Tabular figures everywhere**, right-aligned, decimal-aligned.
- Historical charts on nearly every entity page.

**Franchise Hockey Manager / Eastside Hockey Manager** — the identity benchmark.
- **Team branding drives the UI palette per club** — the interface wears the
  colours of who you are managing.
- Strong use of crests and portraits so entities are recognisable at a glance.

### The gap, stated plainly

| Dimension | Reference standard | This game |
|---|---|---|
| Primary display mode | dense sortable tables | bordered card grids |
| Typography | purpose-built UI + tabular data face | OS default, proportional figures |
| Charts | on every entity page | one hand-rolled sparkline |
| Detail view | master–detail split | modal that hides the list |
| Component system | shared library | 3,072 inline styles |
| Per-entity identity | crests, colours, portraits | emoji icon + text name |
| Contextual persistence | always-visible context bar | top bar with global stats |

**Where this game already beats the references:** the match viewer. Nothing in
FM's 2D engine has this game's elemental FX, and the narrative layer
(chronicles, memorial, vendettas) has no equivalent in the genre at all. Those
are the differentiators and the redesign should give them *more* room, not less.

---

## 3. Full Redesign Plan

### 3.1 Typography — a two-voice system

The game has two jobs: it is a **simulation** (numbers, tables, decisions) and
it is a **chronicle** (deaths, grudges, legacies). One typeface cannot do both.
So: two voices, deliberately separated, with a rule for which speaks when.

| Role | Face | Usage |
|---|---|---|
| **Data / chrome** | **IBM Plex Sans** | All UI: labels, buttons, nav, table text, forms |
| **Numerals** | **IBM Plex Mono** | Every figure in a column, stat block, currency, date |
| **Editorial** | **Spectral** (serif) | Chronicle entries, memorial, narrative inbox, panel titles, flavour text |

**Why Plex.** It is a superfamily designed for technical interfaces, has true
**tabular figures**, ships Sans/Mono/Condensed that share skeletons, and is
open source (SIL OFL) so it bundles with the desktop app without licensing
work. It replaces both `Segoe UI` *and* `Courier New` with one coherent system.

**Why Spectral.** A serif with slightly calligraphic contrast and a warm colour
on dark grounds. It reads as ink rather than as a newspaper. It gives the
narrative layer — the thing this game has that FM does not — a distinct voice,
so a chronicle entry *feels* different from a stat block without needing a box
around it.

**Not Inter, not Space Grotesk.** Both are the current default choice for
"modern app", and both would make this look like every other product.

**Rules:**
- Numbers that appear in a column are **always** Plex Mono with
  `font-variant-numeric: tabular-nums`, right-aligned, decimal-aligned.
- Spectral is **never** used for UI chrome or anything clickable.
- Uppercase micro-labels keep the existing `--ls-caps: .14em`.

**Revised type ramp** — the current 8 steps are sound but need role names, and
the 10px floor should rise to 11px given the measured contrast problems:

```
--fs-micro   11px   uppercase labels, table headers, badges
--fs-small   12px   secondary text, table body
--fs-body    13px   default UI text
--fs-lead    15px   emphasised row text, card titles
--fs-sub     18px   section headings
--fs-head    22px   panel titles
--fs-title   28px   screen titles, key figures
--fs-display 40px   the single hero number on a screen (treasury, position)
```

### 3.2 Colour — keep the identity, fix the mechanics, add what is missing

**Keep** the entire ink-and-parchment palette. It is the game's identity and it
is well-built. Three additions and two corrections:

**Correction 1 — elevation must come from light, not shadow.** Replace the
shadow-based `.surf`/`.well` with edge-based tokens:

```
--edge-lit    rgba(255,255,255,.09)   top edge of a raised surface
--edge-dark   rgba(0,0,0,.55)         bottom edge, for a hairline seam
--edge-inset  rgba(0,0,0,.30)         top edge of a recessed surface
```

A raised surface is `background: var(--surface)` + `border-top: 1px solid
var(--edge-lit)`. Measured, an 8–12% white top edge gives 1.21–1.38:1 against
the surface, versus the current shadow's **1.02**.

**Correction 2 — `--text-faint` to `#6a6054`** (3.09–3.23:1, up from 2.25–2.36).

**Addition 1 — a four-step surface ladder**, so depth is a token not a guess:

```
--layer-0  --sunken    #070605   page ground, table wells
--layer-1  --bg        #0a0908   default panel ground
--layer-2  --surface   #12100e   cards, rows
--layer-3  --surface-2 #191613   hovered/selected rows, popovers
--layer-4  --surface-3 #211d19   modals, inspector
```

**Addition 2 — a data-visualisation palette.** None exists. Charts need a
categorical ramp that survives the dark ground and does not collide with the
semantic colours:

```
--viz-1  #c9a84c   gold      (primary series — your village)
--viz-2  #6b93b0   blue
--viz-3  #7d9c62   green
--viz-4  #a2789e   purple
--viz-5  #d4883a   orange
--viz-6  #8a8578   neutral   (comparison / league average)
```

Plus a diverging pair for above/below-average encoding: `--viz-pos #7d9c62`,
`--viz-neg #c8432f`, with a neutral midpoint `--viz-mid #544c42`.

**Addition 3 — promote the five element accents to first-class tokens.** They
already exist in `elementalIdentity.js` (`#ff5a3c` Fire, `#46b5ff` Water,
`#e6b873` Wind, `#7bd88f` Earth, `#ffd24a` Lightning). Mirror them into CSS
custom properties so a rival's colour can tint a table row, a crest, or a
fixture card without JS reaching into style attributes.

### 3.3 Layout — three zones, master–detail everywhere

Replace the current shell with a persistent three-zone frame:

```
┌──────────────────────────────────────────────────────────────┐
│ CONTEXT BAR  56px   crest · village · date · treasury · next │
├────────┬─────────────────────────────────┬───────────────────┤
│ NAV    │ WORK AREA                       │ INSPECTOR         │
│ 200px  │ fluid, min 640px                │ 340px, collapsible│
│        │                                 │                   │
│ 6      │ tables, cards, charts           │ selected entity   │
│ groups │                                 │ full detail       │
├────────┴─────────────────────────────────┴───────────────────┤
│ TICKER 22px                                                  │
└──────────────────────────────────────────────────────────────┘
```

- **Context bar** replaces the current topbar and always shows: village crest
  and name (tinted by element), date, treasury with monthly delta, morale, and
  **the next thing that needs you** (fixture, decision, deadline).
- **Nav collapses 30 flat entries into 6 groups**: Village, Squad, Matches,
  World, Academy, Legacy.
- **Inspector replaces the modal dossier.** Selecting a shinobi in any table
  fills the inspector; the list stays visible. This single change is the
  biggest usability win available and it kills `oDos` as a modal.
- Below 1280px the inspector overlays instead of splitting.

### 3.4 Component library — the actual fix for 3,072 inline styles

Twenty-two components, in build order. Each replaces a repeated inline pattern.

**Primitives**
1. `.hv-stack` / `.hv-row` — flex with `gap` from the spacing scale. Kills most
   of the 3,072.
2. `.hv-panel` — the layer-2 surface with lit top edge, radius, padding.
3. `.hv-section` — titled block with the caps eyebrow, replaces `.sect`.
4. `.hv-divider`

**Data**
5. `.hv-table` — sortable, sticky header, zebra-free, hover row, tabular
   figures, right-aligned numerics. Supersedes `.tbl-dense`.
6. `.hv-cell-num` / `.hv-cell-name` / `.hv-cell-tag`
7. `.hv-attr` — an attribute chip with value-band tinting (the FM device).
8. `.hv-meter` — labelled progress bar, replaces the hand-built `.bar`/`.fill`.
9. `.hv-spark` — inline sparkline.
10. `.hv-kpi` — big-number tile with label, delta and trend.

**Entity**
11. `.hv-crest` — village/nation mark, element-tinted.
12. `.hv-portrait` — shinobi avatar frame (rank-coloured ring).
13. `.hv-entity-row` — portrait + name + rank + tags, the universal list item.
14. `.hv-card` — replaces `.mc`, `.card`, `.bm-card`, `.tr-card`, `.dip-card`,
    `.wv-card`, `.ke-card`, `.tb-card` (eight near-duplicates today).

**Chrome**
15. `.hv-btn` (variants: primary/ghost/danger) — replaces `.gb` and its five
    colour variants.
16. `.hv-tabs`
17. `.hv-filterbar` — search + facet chips + column picker.
18. `.hv-badge` / `.hv-chip`
19. `.hv-empty` — illustrated empty state. None exists today.
20. `.hv-tooltip`
21. `.hv-inspector`
22. `.hv-toast`

### 3.5 Data visualisation — the missing layer

Build a small chart module (`client/js/charts.js`) with five chart types, all
Canvas-rendered to match the existing `pitchView` approach and to avoid a
dependency:

1. **Line** — form, morale, treasury, reputation over time. With a league-average
   comparison line in `--viz-6`.
2. **Bar / column** — income vs expenditure, squad depth by rank.
3. **Sparkline** — inline in table rows, no axes.
4. **Radar** — the six-stat shinobi profile, overlaid against a role template.
   This is the single highest-value chart in the game: it makes a shinobi's
   *shape* legible instantly.
5. **Timeline** — career arcs, dynasty history, the chronicle. Horizontal,
   with event pips.

**Chart rules:** no gridline heavier than `--border-dim`; axis labels in
`--text-dim` at `--fs-micro`; the player's own series always `--viz-1` and
2px, everything else 1px; last data point always marked with a filled dot.

### 3.6 Iconography and motifs

**Replace emoji.** The game uses emoji throughout (🔥🌊💨🪨⚡🏯⚔🩹). They render
differently on every platform, cannot be tinted, and undercut the hand-made
identity. Commission or draw a **single-weight line icon set** at 16/20/24px on
a 24px grid, 1.5px stroke, in `currentColor` so they inherit token colours.

**Motifs to carry through** — these come from the existing art direction:
- **The seal disc** (already used behind the title mark) as the container for
  crests and portraits.
- **The brush rule** — the gold stroke under panel headers. Keep, formalise as
  `.hv-section` decoration.
- **Paper tooth** — the existing 1.6% grain. Keep; it is doing real work.
- **The hex** — from the match arena. Reuse as the shape language for element
  badges and squad slots, tying the best-looking screen to the rest.

### 3.7 Motion

Restrained, and always in service of orientation. All must respect
`prefers-reduced-motion`.

| Interaction | Motion | Duration |
|---|---|---|
| Panel change | crossfade + 4px rise | 140ms ease-out |
| Inspector open | slide from right | 180ms ease-out |
| Table sort | rows fade-shift | 120ms |
| Value change (treasury, morale) | count-up tween + brief tint | 400ms |
| Month advance | ticker sweep, date roll | 500ms |
| Toast | slide up, dwell, fade | 200 / 4000 / 200 |
| Chart draw-in | left-to-right reveal | 300ms, once |

**Nothing loops.** No idle animation anywhere — it is a game people leave open
for hours.

---

## 4. Screen-by-Screen Mockups

Written for a UI artist. Zones are given in the three-zone frame from §3.3.

### 4.1 Dashboard

> **Work area, 12-column grid, 16px gutters.**
>
> **Row 1 — four KPI tiles** (`.hv-kpi`, 3 columns each, 96px tall): Treasury
> with monthly delta and a 12-month sparkline; Reputation with rank band;
> Morale as a meter with band label; Squad Fitness as "19 of 22 available"
> with the strength cost beneath. Each tile: label in `--fs-micro` caps
> `--text-dim` top-left, figure in Plex Mono `--fs-display` `--text-hi`,
> delta chip bottom-right tinted `--viz-pos`/`--viz-neg`.
>
> **Row 2 — left 8 columns: "Needs You."** A stacked list of `.hv-entity-row`
> items, each an urgent decision, deadline or unread narrative. Priority
> encoded by a 3px left stripe (`--red` urgent / `--gold` standard / `--border`
> info) *and* by an icon, never colour alone.
>
> **Row 2 — right 4 columns: "Next Fixture."** Opponent crest tinted by their
> element, both sides' form as five W/D/L pips, the intel state ("Fortress ·
> intel good for 3mo" or "✖ No current intel"), and the tactic picker inline.
>
> **Row 3 — full width: season line chart.** League position over the 22
> rounds, your line in `--viz-1` 2px, the leader's in `--viz-6` 1px dashed.
> Y-axis inverted so 1st is at the top.

### 4.2 Roster — master–detail, the flagship change

> **Work area is a single `.hv-table`, full height, sticky header.**
>
> Default columns: Portrait (28px) · Name · Rank badge · Age · six stat cells ·
> Power · Potential · Morale meter · Status chip. Every numeric cell Plex Mono,
> right-aligned. Stat cells use `.hv-attr` tinting: 1–30 `--text-dim`, 31–60
> `--text`, 61–80 `--viz-3`, 81–95 `--gold`, 96+ `--gold-hi` bold.
>
> Above the table, `.hv-filterbar`: search field, facet chips (Available /
> Injured / Deployed / Academy), and a column-picker button on the right.
>
> **Row click fills the inspector; the table does not move.** Selected row gets
> `--layer-3` background and a 2px `--gold` left border.
>
> **Inspector (340px)** stacks: portrait in a seal disc with rank ring; name in
> Spectral `--fs-head`; rank, age, clan, element and combined element as chips;
> a **radar chart** of the six stats overlaid with the role template in
> `--viz-6`; then collapsible sections — Career (with a timeline), Defining
> Moments, Vendettas, Bonds, Jutsu, Contract, Medical. Narrative text in
> Spectral; all figures in Plex Mono.

### 4.3 Missions

> **Work area splits: available contracts (left 7 cols) / deployed (right 5).**
>
> Each contract is a `.hv-card` at layer-2 with a lit top edge. Header row:
> rank badge (letter in a hex, colour by rank) · title in `--fs-lead` ·
> expiry chip right-aligned. Second row is the **tag rail** — spec standing,
> terrain, counter, chain — as `.hv-badge`s, max four, overflow to "+2" with a
> tooltip. *This is the row currently at risk of clutter; the fix is a strict
> cap and consistent order: standing, terrain, counter, meta.*
>
> Body: a four-up figure strip (Reward / Rep / Duration / Risk) in Plex Mono,
> then a one-line flavour in Spectral `--text-dim`.
>
> Footer: approach picker as a segmented control, then the primary action.
>
> **Deployed column**: compact rows with a progress meter to completion and the
> squad's portraits stacked at 20px.

### 4.4 Match Day

> **This screen already works; the brief is to frame it, not rebuild it.**
>
> Give the existing hex arena the full work area with the context bar dimmed to
> 40% opacity during playback. Beneath the canvas: the momentum bar full width,
> then a three-column strip — home XI, event ticker, away XI.
>
> Post-match, the stats sheet slides up over the lower third: possession,
> strikes, per-actor grades in a `.hv-table`, MOTM highlighted with a gold seal
> disc. Keep the elemental FX exactly as they are.

### 4.5 League / Season

> Full-width `.hv-table` standings: position, crest, village, P/W/D/L, GF/GA/GD,
> points, and a five-pip form column. Your row permanently tinted `--gold-bg`
> with a 2px gold left border. Promotion/relegation and seeding bands marked by
> a subtle horizontal rule and a right-margin label, not by row colour.
>
> Beneath: two panels side by side — the fixture grid (round columns, your
> fixtures highlighted) and the season line chart from 4.1.

### 4.6 Scouting / Transfers

> Master–detail again. Table of prospects with columns for Potential (as a
> star meter, since it is uncertain), Scouted % , Age, Position, Asking Price,
> and Interest (rival crests, stacked). Inspector shows the scout report
> timeline — *when* each report arrived and how the estimate moved — which is
> the thing the current dossier cannot express at all.

### 4.7 Chronicle / Memorial — the editorial screens

> **These are where Spectral earns its place.** No tables, no chrome. A single
> centred column, 62 characters wide, on `--layer-0`.
>
> Memorial: each fallen shinobi as an entry — name in Spectral `--fs-sub`
> `--text-hi`, rank and dates in Plex Mono `--fs-micro` `--text-dim`, last words
> in Spectral italic `--seal`, then the "still carried by" line. Separated by
> 32px and a hairline rule, not by cards. The page should feel like a book, and
> should be the one screen in the game with generous whitespace.

---

## 5. Asset List

### 5.1 Fonts (bundle locally — do not link a CDN)
- IBM Plex Sans — Regular 400, Medium 500, SemiBold 600 (woff2)
- IBM Plex Mono — Regular 400, Medium 500 (woff2)
- Spectral — Regular 400, Italic 400, SemiBold 600 (woff2)

### 5.2 Icon set — 48 icons, 24px grid, 1.5px stroke, `currentColor`
Navigation (12): dashboard, village, roster, squads, missions, matches, world,
academy, scouting, transfers, legacy, settings.
Status (10): available, injured, deployed, retired, deceased, promoted,
warning, locked, unread, pinned.
Domain (14): ryo, reputation, morale, legend, chakra, taijutsu, ninjutsu,
genjutsu, intelligence, speed, mission-rank, contract, medical, training.
Action (12): sort, filter, columns, search, expand, collapse, close, confirm,
cancel, advance-turn, save, watch.

### 5.3 Element marks — 5 crests
Fire, Water, Wind, Earth, Lightning. Hex-framed, single colour, three sizes
(16/24/48). These replace the emoji crests and inherit the element accent.

### 5.4 Village crests — 12 great villages + 8 minor nations
Simple heraldic marks inside the seal disc. Monochrome + accent, so they tint.

### 5.5 Rank insignia — 5
Initiate, Adept, Veteran, Shadow, Legend. Used as the portrait ring and badge.

### 5.6 Portraits
No faces. Use a **silhouette system**: 6 base silhouettes × element tint ×
rank ring. Cheap, consistent, and avoids the uncanny mismatch of generated
faces in a hand-drawn UI.

### 5.7 Surfaces and frames
- Paper-tooth tile (already exists — extract to a reusable asset)
- Seal disc (3 sizes)
- Brush rule (3 widths, for section headers)
- Hex frame (3 sizes)
- Empty-state illustrations (6): no missions, no prospects, no squads, no
  intel, empty memorial, no history.

### 5.8 What you do NOT need
No 3D, no photographic textures, no per-shinobi art, no animated backgrounds.
The identity is line, ink and paper.

---

## 6. Implementation Guide

### 6.1 Folder structure

```
client/
  styles/
    tokens.css        colour, type, space, elevation, motion
    base.css          reset, html/body, focus-visible, scrollbars
    layout.css        the three-zone frame
    components/       one file per component, .hv- prefix
      table.css  card.css  button.css  kpi.css  inspector.css …
    screens/          only genuine one-offs (match viewer, memorial)
  assets/
    fonts/            woff2
    icons/            SVG sprite + individual
    crests/           element/, village/
    ui/               seal, brush, hex, grain
  js/
    charts.js         the five chart types
    components/       JS builders that emit component markup
```

### 6.2 Naming

- CSS: `.hv-<component>__<part>--<variant>` (BEM-lite). The `hv-` prefix
  guarantees no collision with the 410 legacy classes during migration.
- Tokens: `--<category>-<role>-<variant>` (`--text-dim`, `--viz-1`,
  `--edge-lit`). Never name a token after its value.
- Assets: `<category>-<name>-<size>.<ext>` (`icon-roster-24.svg`,
  `crest-fire-48.svg`).

### 6.3 Migration strategy — the part that matters

**Do not rewrite 30 panels at once.** That is how this becomes a six-month
project that never lands. Strangler-fig, in this order:

1. **Land `tokens.css` and the font bundle.** No visual change beyond the
   typeface. Verify nothing breaks. One commit.
2. **Build the component library against a demo page**, not against a panel.
   Every component rendered on one scratch screen, in both a dense and a sparse
   state. This is the artist's review surface.
3. **Convert ONE panel end to end — Roster.** It is the second-largest (962
   lines), it is master–detail, and it exercises table, inspector, chart,
   portrait, badge and filter bar. If the library survives Roster it will
   survive everything.
4. **Measure after Roster**: inline `style="` count in that file must fall by
   >80%. If it does not, the library is missing a component; find it before
   converting panel two.
5. Then Missions, Dashboard, League, Scouting, and the long tail.
6. **Delete a legacy class only when its last use is gone.** Track with
   `grep -c`.

### 6.4 Guardrails — enforce it, do not hope for it

Add these as tests, in the style this project already uses:

- **No new raw hex in panel JS.** A test greps `client/js/panels/` for
  `#[0-9a-f]{6}` and fails above the current count of 108, ratcheting down.
- **Inline-style budget.** Same shape: fail if `style="` in panel JS rises
  above the current 3,072. Every PR must hold or lower it.
- **Contrast floor.** For every `--text-*` token against every `--layer-*`
  token, assert ≥ 3.0:1. This is computable and would have caught
  `--text-faint` automatically.
- **Token coverage.** Assert every colour used in `styles/components/` is a
  `var(--…)`, never a literal.

### 6.5 Consistency rules for whoever builds it

1. Spacing only from `--sp-*`. No arbitrary pixel padding.
2. Colour only from tokens. If a colour is needed that is not a token, the
   answer is a new token, agreed once.
3. Every number in a column is Plex Mono, tabular, right-aligned.
4. Spectral never labels a control.
5. Meaning is never carried by colour alone — always colour **plus** icon,
   shape or text.
6. Every interactive element has a visible `:focus-visible` ring.
7. Every list has a designed empty state.

---

## 7. Final Summary — The New Visual Identity

**Name it: Ink and Ledger.**

The game keeps its ink-and-parchment soul — the warm near-black ground, the
gold seal, the paper tooth, the brush rule — and gains the thing it has been
missing: **the discipline of a ledger.** Rows, columns, aligned figures,
charts, and a component system that makes every screen look like it was made by
the same hand on the same day.

Two voices, held apart on purpose. **Plex** speaks for the simulation: clear,
tabular, unsentimental, the voice of the numbers. **Spectral** speaks for the
chronicle: the deaths, the grudges carried for nine years, the names on the
memorial. That separation is not decoration — it is the game's own thesis made
visible, because this was never "FM with ninjas". It is a sports-management
skeleton carrying a chronicle, and the interface should say so before the
player reads a word.

**The three changes that matter most, in order:**

1. **Tables and a master–detail inspector.** Density and context. Everything
   else is polish next to this.
2. **The component library**, because 3,072 inline styles means no visual
   decision can ever be made once.
3. **Charts**, because a game about decades currently cannot draw a trend.

**What must not change:** the palette, the match viewer, the grain, and the
narrative layer's prominence. Those are already better than the genre standard.

---

## Appendix — measured baseline, for tracking

| Metric | Today | Target |
|---|---|---|
| Inline `style="` in panel JS | 3,072 | < 400 |
| Raw hexes in panel JS | 108 (90 distinct) | 0 |
| CSS class rules | 410 | ~250 shared + screens |
| Design tokens | 55 | ~85 |
| `<table>` elements | 8 | 20+ |
| Chart types | 0 | 5 |
| Typefaces | 1 (OS default) | 3 (one superfamily + serif) |
| Panels with an empty state | 0 | all 30 |
| Lowest text contrast | 2.25:1 | ≥ 3.0:1 |
