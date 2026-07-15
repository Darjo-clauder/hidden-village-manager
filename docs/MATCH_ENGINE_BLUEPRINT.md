# Match Engine Blueprint — 2D Tactical Battle Simulation

**Status:** Design document (v1, 2026-07-09). Engine-agnostic; no library assumptions.
**Scope:** The full visual + tactical overhaul of the battle simulation, taking it from
"circles that push each other around" to a readable tactical sim in the tradition of
Football Manager's 2D classic view, EHM, and FHM.

The sport modelled here is the game's own: squad-vs-squad shinobi encounters fought
over a contested objective (the scroll) in a hexagonal arena. It is *hockey-like* —
continuous flow, possession, zones, line changes — and every system below is written
so the same engine could render an actual hockey/football variant by swapping the
zone map and role table.

Existing systems this builds on (do not reinvent): squad roles
(`vanguard/support/intel/medical/flex`), stamina + touchline tactics
(`matchSim.js`), village identities/styles (`blitz/fortress/opportunist/grinder/
balanced`), matchday counter-tactics, formations (`FORMATIONS`), chakra elements,
the hex arena + venue theming (`arenas.js`), and the beat log (`battleViewer.js`).

---

## 1. High-Level Overview

### 1.1 What changes conceptually

The current engine renders a **beat recap**: three pre-resolved exchanges, each
choreographed as "everyone runs at a point, winner surges." The upgraded engine
renders a **possession simulation**: a continuous loop of *possession phases*
whose aggregate outcome is constrained to match the pre-resolved beat results.

This is the critical trick, and it keeps the sacred rule intact:

> **Outcomes never change.** The engine is a *renderer of a fixed result*, not a
> resolver. Each pre-resolved beat (won/lost) becomes a *script constraint*: during
> beat N's window, the possession sim is biased so that its micro-events accumulate
> toward the known result. The player watches a plausible, tactically-readable match
> that always lands on the recorded score.

### 1.2 The three layers

```
┌──────────────────────────────────────────────────────────────┐
│ LAYER 3 — PRESENTATION   circles, badges, arrows, overlays,  │
│                          event markers, commentary ticker    │
├──────────────────────────────────────────────────────────────┤
│ LAYER 2 — MICRO-SIM      possession phases, passing, press,  │
│ (deterministic, seeded)  interceptions, shots-on-objective,  │
│                          zone transitions, line fatigue      │
├──────────────────────────────────────────────────────────────┤
│ LAYER 1 — RESOLVED FACTS beat results, final outcome, KOs,   │
│ (from the game engine)   grades, stamina model, micro-call   │
└──────────────────────────────────────────────────────────────┘
```

Layer 2 is **seeded** from the report (mission id + year/month), so a replay of the
same match always renders the same sequence — replays are archival, not rerolls.

### 1.3 Match structure

A match = 3 **periods** (one per beat: Infiltration / Engagement / Extraction, or
the bracket-stage names). Each period = 6–10 **possession phases**. Each phase is
one team attempting to advance the objective through zones toward the opponent's
**goal zone** (the seal gate); the defending team presses, intercepts, blocks.

A period whose beat was WON must end with the player's side having scored more
**phase points** in it (the sim retro-biases pass success / interception odds to
guarantee this; see §4.6). The momentum bar becomes the running phase-point
differential rather than a fixed ±22 swing.

---

## 2. Visual Language Specification

Readability rule: **every mark on the board must answer a manager's question**
("who is that / what are they doing / why"). Anything decorative that costs
clarity is cut. Max 3 simultaneous overlay classes.

### 2.1 The player token (replaces the plain circle)

```
        ▲ facing wedge (orientation)
      ╭───╮
  ⚔  │ KM │  ← initials (2ch)          TOKEN ANATOMY
      ╰───╯
     ◠◠◠◠◠   ← stamina ring (arc, 0-100, band-coloured)
       ●     ← possession pip (only while carrying the objective)
```

| Element | Encodes | Rules |
|---|---|---|
| Fill colour | **Squad role** (existing `ROLE_TINT`) | Home only; away = arena accent |
| Edge colour | Chakra element (Fire/Water/Wind/Earth/Lightning) | thin ring, from `s.element` |
| Role badge (corner glyph) | ⚔ vanguard, ✚ medic, ◆ intel, ⬡ support, ● flex | replaces glyph-in-fill |
| Stamina ring | arc around token, green→gold→amber→red | replaces bar-under-token |
| Facing wedge | current movement/attention direction | updates from velocity |
| Possession pip | gold dot under the carrier | exactly one on the board |
| KO state | grey fill + ✕, token drops to 60% opacity | existing rule kept |
| Spotlight | white ring + soft glow | narration subject only |

**Size discipline:** token Ø 14px at 400×250 internal resolution; badges 5px;
nothing smaller than 4px (readability floor at CSS scale).

### 2.2 Movement arrows

Two arrow classes, visually distinct so *plan* vs *reaction* is instantly legible:

- **Planned run** (off-ball tactical movement): dashed, role-tinted, drawn 0.4s
  before the token moves. `- - - ▶`
- **Reactive burst** (press, chase, retreat): solid, short, fades in 0.3s. `───▶`
- **Pass**: bright line from passer to receiver, flashes then fades; failed pass
  renders to the interception point instead and turns red.

### 2.3 Tactical overlays (toggleable, max one "field" overlay at a time)

| Overlay | Toggle | Rendering |
|---|---|---|
| **Passing lanes** | `L` chip | faint lines carrier→each teammate; opacity = lane safety (blocked lanes dotted red) |
| **Pressure** | `P` chip | red gradient blob around pressing defenders; radius = press intensity |
| **Zones** | `Z` chip | the hex's 5 zones tinted by current control (see §2.5) |
| **Shape** | `S` chip | thin lines linking each side's tokens into their formation silhouette |
| **Heat trail** | off by default | per-token afterimage, replay analysis only |

Chips sit in the pitch control row next to ⏸ / speed / ↻. One field overlay at a
time; event markers and tokens always render above overlays.

### 2.4 Event markers (transient, 1.2s lifetime)

```
✦  strike on the seal gate (shot)        ▣  block
✕  turnover (lost possession)            ⚡  interception
▽  hit / knockdown (KO feed)             ◎  scroll capture attempt
!  danger-zone entry                     ⚑  tactical switch acknowledged
```

Markers pop at the event point, drift 6px opposite to play direction, fade. Every
marker also emits a ticker line (§6) — the board and the text never disagree.

### 2.5 The field: zones on the hex

The hex arena divides into **5 zones** (hockey grammar, hex geometry):

```
            ╱▔▔▔▔▔▔▔▔▔▔▔╲
           ╱   HOME  │  AWAY ╲            HG = home goal zone (your seal gate)
          ╱  DEFENCE │ ATTACK ╲           AG = away goal zone (their seal gate)
         │ HG ├──────┼──────┤ AG │        Neutral band holds the centre circle
          ╲   HOME   │  AWAY ╱            and the objective spawn.
           ╲  ATTACK │DEFENCE╱
            ╲▁▁▁▁▁NEUTRAL▁▁▁╱
```

Flattened for implementation: `HG | HD | N | AD | AG` as vertical bands fit to the
hex, each with a control value −1..+1 (who has bodies + possession there). The
Zones overlay tints each band toward the controlling side's colour.

---

## 3. Tactical System Specification

Three tiers, mirroring FM's team / role / player instructions. Everything maps to
existing data first; new knobs are listed explicitly.

### 3.1 Team tactics (set pre-match; adjustable at period breaks)

| Knob | Values | Source | Sim effect |
|---|---|---|---|
| **Tempo** | patient / standard / direct | NEW (default by village style) | phase length, pass count before a strike attempt |
| **Aggression** | existing Press/Balanced/Conserve dial | `MATCH_TACTICS` | press radius + stamina drain (already wired) |
| **Width** | narrow / balanced / wide | NEW | lateral spread of off-ball runs |
| **Forecheck** | 1-2-0 passive / 2-1-0 standard / 2-2 swarm | NEW | how many tokens press into the opponent's build-up zone |
| **Defensive shape** | collapse (protect gate) / zone / man-press | NEW | defender target selection |

**Village identities auto-map** so the AI needs no new authoring:
`blitz → direct/wide/swarm · fortress → patient/narrow/collapse ·
opportunist → standard/zone (counter bias) · grinder → patient/man-press ·
balanced → all standard`. The matchday counter-tactic (`matchdayTactics.js`)
keeps its ±% and *additionally* previews the opponent's mapped row pre-match.

### 3.2 Role instructions (per squad role — the unit-comp layer made visible)

| Role | Default behaviour | Risk dial (safe/standard/bold) changes |
|---|---|---|
| **Vanguard** | leads entries, contests the carrier, screens the gate | bold: solo entries, more hits, more turnovers |
| **Support** | trails the carrier, safety outlet pass, second wave | bold: joins the strike, vacates the outlet |
| **Intel** | finds lanes: highest pass-success when they assist a phase | bold: intercept-hunting jumps, gets caught upfield |
| **Medic** | anchors HD zone, sweeps loose objectives, tends KO'd tokens (removes ✕ after 1 phase) | bold: pushes to N, faster recovery, weaker gate |
| **Flex** | mirrors the phase's needs (lowest variance) | risk dial shifts which role they mirror |

Risk dial is a NEW per-squad setting (one dial for the squad, not per player —
keep the management load FM-light). Stored on the squad, editable pre-match and
in the assign overlay next to the condition read.

### 3.3 Situational logic (auto-triggers, announced via ⚑ marker + ticker)

| Situation | Trigger | Behaviour shift |
|---|---|---|
| **Late push** | losing the period with <25% of it left | tempo→direct, forecheck→swarm, medic joins attack |
| **Protect the lead** | winning the match, final period | shape→collapse, tempo→patient, bold→safe |
| **Man down** (KO'd token) | any KO | shape compresses one band; medic prioritises recovery |
| **Power phase** (opponent KO'd) | opponent KO | width→wide, +1 forecheck body |
| **Redline squad** | avg stamina < 25 | tempo forced patient (legs gone) — visible, punishing |

These are the "powerplay/penalty-kill" analogues; all derive from state the sim
already tracks (score, clock, KOs, stamina).

---

## 4. AI Decision-Making Model

A utility-scored decision tree per token, evaluated on a 250ms think-tick
(not per frame). Deterministic given the seed.

### 4.1 Decision cascade (carrier)

```
CARRIER THINK-TICK
├─ pressured? (defender within press radius)
│   ├─ yes → escape option: pass(best lane) > dodge(open dir) > shield(hold)
│   └─ no  → advance option:
│        ├─ in AD/AG zone → STRIKE if lane to gate ≥ threshold(tempo, risk)
│        ├─ teammate in better zone + lane safe → PASS
│        └─ else CARRY toward next zone (weighted by width/tempo)
```

### 4.2 Off-ball attackers
`score(run) = zoneValue(target) + laneOpenness(from carrier) − congestion −
staminaCost` — top-scoring run becomes a **planned arrow**, then the token moves.
Intel adds +lane bonus; vanguard adds +gate-proximity bonus.

### 4.3 Defenders
Assignment by defensive shape: `collapse` ranks gate proximity, `zone` ranks
band responsibility, `man-press` ranks nearest-attacker lock. Press commitment
costs stamina per §matchSim `beatDrain` (press tactic multiplies).

### 4.4 Pass resolution
`p(complete) = base(0.78) + intelAssist + laneOpenness − pressure − distance
− fatigue(passer)`, clamped 0.15–0.95, rolled from the seeded RNG. Fail →
⚡ interception at lane midpoint, possession flips, reactive arrows fire.

### 4.5 Strike resolution
Strikes never score "goals" — they bank **phase points** and fire the ✦ marker
(▣ if a defender blocks). Phase ends on: strike, turnover in HG/AG, or shot-clock
(tempo-scaled). Phase points accumulate into the period.

### 4.6 The outcome governor (the critical constraint)
A PID-like bias controller per period: it watches `phasePointDiff` vs the
required sign (beat won → player must finish the period ahead). Each think-tick
it nudges the *odds inputs* (±0.10 max on pass/strike/interception rolls) toward
the required trajectory; in the final two phases of a period the nudge cap rises
to ±0.25. Because it biases inputs rather than forcing events, sequences stay
plausible — you *see* the losing side's passes start clicking rather than a
teleporting scoreline. KO events keep their existing rule (most-spent shinobi,
during a lost phase in a lost period).

---

## 5. Movement + Animation Rules

1. **Steering:** current model kept (accel toward target, damped) with per-role
   profiles: vanguard accel ×1.2; medic ×0.85; carrier −10% (burdened).
2. **Separation:** tokens repel inside 1.5×radius (no more stacking into one blob
   — the current "push each other around" artifact dies here).
3. **Arrive behaviour:** decelerate into target, hold ±2px orbit (no vibration).
4. **Facing:** wedge lerps to velocity direction; on pass receipt, snaps to ball.
5. **Planned-move telegraph:** dashed arrow renders 0.4s before the run (§2.2).
6. **Stamina coupling:** max speed scales `0.6 + 0.4×(stamina/100)` — a spent
   squad *visibly* slows, which is the tactic dial's feedback loop made physical.
7. **Beat/period boundary:** no hard teleports; period transitions re-anchor via
   planned arrows over 1.2s (a visible "line change").
8. **Frame budget:** think 4Hz, steer 60Hz, overlays 10Hz. Everything canvas-2D.
9. **Reduced motion:** existing rule kept — pitch hidden, text view intact.

---

## 6. Event System + Commentary Hooks

### 6.1 Event log (single source of truth)

Every micro-event appends `{t, period, phase, type, actorId, targetId, zone, xy}`
to a match log. The board marker, ticker line, and stats all render **from the
same record** — the board can never disagree with the text.

Event types: `pass, pass_fail, intercept, strike, block, turnover, hit, ko,
recover, capture, zone_entry, tactic_switch, situation(late_push|protect|…)`.

### 6.2 Commentary ticker

One-line feed under the beat list; template banks per event type reusing the
`battleViewer.js` voice, with role-flavoured inserts from `roleBeatFlavor`:
`"⚡ {intel} reads the lane — turnover in the neutral band."` Priority filter:
at speed 1× show all; at 2× only strikes/turnovers/KOs; at 4× only period
summaries. (Existing beat lines become the period-summary tier.)

### 6.3 Stats out

Aggregate the log into a post-match sheet: possession %, strikes/blocked, pass %,
interceptions by shinobi, pressure events survived, zone-control graph. Feeds the
existing MOTM tie-break (replace flat stamina tiebreak with `strikes+intercepts`)
and archives with the replay snapshot so archived matches show their sheet.

---

## 7. Example In-Engine Sequences

**Seq A — clean build-up (Engagement period, player pressing 2-1-0):**
1. Medic sweeps loose scroll in HD `◎` → outlet pass to support (lane overlay
   flashes green) → 2. intel's planned arrow cuts N-band, receives, ⚡-hunting
   defender arrives late → 3. vanguard's dashed run to AG gate-screen →
4. intel feeds vanguard, `✦ strike`, blocked `▣`, phase point banked anyway
   (strike on target); ticker: *"✦ Kira forces the breach — the gate holds."*

**Seq B — collapse under a swarm (lost beat, governor visible-but-plausible):**
Opponent forecheck 2-2; your carrier's lanes all render dotted-red; pass forced
under pressure fails `⚡`; turnover in HD; two strikes against in one phase;
`▽` hit KOs your most-spent shinobi (existing rule); situation `man down` fires
⚑; period ends behind — matching the recorded ✕ beat.

---

## 8. ASCII Tactical Diagrams

**Formation shapes (3-token squads, hex halves):**

```
   AGGRESSIVE (blitz)        BALANCED               FORTRESS (collapse)
   ╱▔▔▔│▔▔▔╲                ╱▔▔▔│▔▔▔╲               ╱▔▔▔│▔▔▔╲
  │  ⚔→ │    │             │ ⚔  │    │             │⚔   │    │
  │ ⬡→  │ ◎  │             │  ⬡ │◎   │             │ ⬡  │  ◎ │
  │  ◆→ │    │             │ ◆  │    │             │✚⌂  │    │
   ╲▁▁▁│▁▁▁╱                ╲▁▁▁│▁▁▁╱               ╲▁▁▁│▁▁▁╱
  all three push N        support trails         medic anchors gate ⌂
```

**Pressing overlay (P) during opponent build-up:**

```
   ╱▔▔▔▔▔▔│▔▔▔▔▔▔╲        ░ = pressure gradient
  │   HD  │░░⚔░░  │        ⚔ presses carrier ●
  │  ✚    │░●░░   │        ◆ shadows the outlet lane (dotted)
  │   ◆┈┈┈┈┈┈▷    │        ✚ holds home-defence band
   ╲▁▁▁▁▁▁│▁▁▁▁▁▁╱
```

**Zone-control strip (Z overlay, mid-match):**

```
  HG        HD        N         AD        AG
  ▓▓▓▓▓  |  ▓▓▓░░  |  ▓░░░░  |  ░░░░░  |  ░░░░░
  yours     yours     contested  theirs    theirs
```

**A scripted lost period, as the viewer sees it:**

```
  phase:   1     2     3     4     5     6     7
  pts:    +1    −1    −1     0    +1    −1    −1     → period −2 (✕ beat honoured)
  events:  ✦     ⚡▽!   ✕     ▣     ✦     ⚡     ✦(them)
```

---

## 9. Consolidated Engine Blueprint

**Modules (maps to this codebase):**

| Module | Role | Builds on |
|---|---|---|
| `shared/utils/matchEngine.js` (NEW, pure) | possession sim: phases, decisions, governor, event log — seeded, unit-testable | matchSim, battleViewer |
| `shared/constants/tactics.js` (NEW, pure) | team-tactic knobs, identity auto-map, situations, role instructions | villageIdentity, matchdayTactics |
| `client/js/pitchView.js` (REWORK) | token anatomy, arrows, overlays, markers, zones | existing hex/stadium/FX kept |
| `client/js/liveBattle.js` (EXTEND) | ticker, overlay chips, period breaks, stats sheet | existing clock/controls/closures |
| Report closures (adv.js) | unchanged — rewards/outcomes stay engine-side | applyCall/Condition/Scroll |

**Invariants (non-negotiable):**
1. Outcomes, rewards, KO selection rules never change — the sim renders, the
   governor constrains, closures apply exactly once.
2. Deterministic per report seed — replays are archival.
3. Board and text render from one event log — zero divergence by construction.
4. Every visual mark answers a manager question; ≤1 field overlay at a time.
5. Reduced-motion users lose nothing informational (ticker + beat list remain).

**Build order (each step shippable + verifiable in-browser):**
1. Token anatomy (badges, stamina ring, possession pip, facing) + separation
   steering — kills the "dots pushing around" read immediately.
2. Zones + phase loop + event log + ticker (sim behind the same 3-beat script).
3. Passing/press/strike decisions + governor (watch odds, verify script honour).
4. Overlays (L/P/Z/S chips) + event markers.
5. Team tactics + identity auto-map + situational triggers + period breaks.
6. Stats sheet + archive integration + MOTM upgrade.
7. Larger encounters: exam/tournament render multi-squad sides (5v5 lines with
   "line changes" between stages) on the same engine.

Testing: matchEngine.js is pure — lock the governor (a scripted loss can never
end ahead), pass-model bounds, situation triggers, and seed determinism in vitest;
visual layers verified via driven browser sessions per project convention.
