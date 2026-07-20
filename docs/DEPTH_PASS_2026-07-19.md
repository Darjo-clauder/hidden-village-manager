# Depth Pass — Missions, Economy, Diplomacy, Staff/Academy (2026-07-19)

Context: `EXPANSION_ROUTES.md` (2026-07-02) is essentially fully shipped — R1,R2,R4,R5,
R6,R7,R8,R9,R11,R13,R14,R15,R16,R17,R18,R19,R20 all landed. That pass mostly added
**passive texture**: modifiers, cards, tickers, one-time dials. The match engine
overhaul then gave exam/tournament real spectacle. But the loop underneath four
systems is still thin: **pick a dial once → wait → read a report.** No recurring
tension, no compounding consequence, no moment where the player scrambles.

This pass targets that: real decisions with delayed payoff, stakes that compound
across turns, and failure states that aren't just "lower number this month."

---

## 1. Missions (solo/squad)

**Why it's still bland despite R7/R8 shipping:** approach picker (Stealth/Balanced/
Assault) and micro-calls are real choices, but they're **isolated per-mission** —
nothing carries forward, nothing escalates, no mission remembers the last one.

**Routes:**
- **M1. Mission chains with memory (M · HIGH)** — a chain mission's later stage reads
  state from the earlier stage (who got hurt, whether stealth was blown) instead of
  independent rolls. "Blew cover in stage 1" → stage 2 starts with defenders alerted
  (harder roll, different event pool). Turns chains from "3 missions in a trenchcoat"
  into an actual unfolding operation.
- **M2. Reputation-with-client (S/M · MED)** — recurring mission clients (a merchant
  guild, a minor nation, a rival's rival) with their own standing meter; repeat
  success unlocks better-paying/higher-prestige jobs from them, a failure locks them
  out for a season. Gives missions a "who" instead of a faceless job board.
- **M3. Squad fatigue/cohesion carryover (S · HIGH)** — squads that run missions
  back-to-back without rest degrade (a real morale/injury-risk curve, not just per-
  mission stamina) while squads left idle *lose* the cohesion bonus they built.
  Forces a real roster-rotation decision every turn instead of "send whoever's free."
- **M4. Consequence missions (S/M · MED)** — a failed S-rank doesn't just cost ryo —
  it can spawn a follow-up crisis mission next month (client goes public, rival
  exploits the intel gap). Failure becomes a plot hook, not a dead end.

**Recommended start: M3** — cheapest, and it's the one that changes turn-to-turn
decision-making immediately (every squad-assign screen now has real opportunity cost).

---

## 2. Economy / Upgrades / Finance

**Why it's still bland:** R13 (prestige sinks) and R14 (sponsor depth) added spend
targets and negotiation, but income generation itself is still "watch the tick."
There's no economic *decision* most months — money just accrues or drains on rails.

**Routes:**
- **E1. Budget allocation with real tradeoffs (M · HIGH)** — replace/extend the
  budget sliders with a genuine zero-sum allocation each quarter (scouting vs
  facilities vs marketing vs reserve) where over-investing in one starves another,
  and the payoff is delayed 1-2 quarters (so it's a bet, not an instant readout).
  This is the single biggest lever for making Finance feel like a decision screen
  instead of a dashboard.
- **E2. Market volatility events (S · MED)** — trade routes/districts currently tick
  smoothly; add discrete shock events (a district fire, a trade route embargo, a
  black-market bust) that hit a specific revenue stream and require a response
  (rebuild, reroute, absorb the loss) rather than a generic "world climate" mult.
- **E3. Investment projects with risk (S/M · MED)** — beyond the existing prestige
  megaprojects (guaranteed payoff), add a *risky* investment tier: stakes ryo now for
  a payoff that's a range, not a lock (new district could flop or boom based on
  world climate + your doctrine at completion). Gives the treasury a reason to *not*
  just monotonically grow.
- **E4. Debt/leverage as a tool, not just a penalty (S · LOW/MED)** — let the player
  deliberately take a loan to fund something now (academy expansion, emergency
  signing) with real interest and a visible repayment schedule, instead of debt only
  appearing as an emergency state.

**Recommended start: E1** — it's the one that turns Finance into a screen the player
visits with intent every quarter, and everything else (E2/E3) is more interesting
once there's a real allocation to disrupt.

---

## 3. Diplomacy / World / Rivals

**Why it's still bland:** R2 (rivalry/derby), R16 (minor-nation relations), R17
(world eras), R18 (journalists) all shipped — the *data* is rich (h2h, grudges,
climate, personas) but most of it is **read-only flavor**. The player's diplomatic
verbs are still just tribute/appease/gift — the same three buttons regardless of
which rich relationship state they're looking at.

**Routes:**
- **D1. Alliances with obligations (M · HIGH)** — a formal alliance isn't just a rel
  number crossing a threshold; it's an opt-in pact with real terms (mutual defense
  in war, shared exam seeding perks, trade discount) AND a real cost (called upon to
  join a rival's war, reputation hit if you refuse). First diplomatic verb with
  teeth.
- **D2. Espionage/leverage plays (S/M · MED)** — spend intel/agents to *act* on the
  rich rival data that already exists: blackmail a kage over a personal grudge,
  leak a rival's transfer target to jack up their cost, sabotage a summit bloc.
  Converts flavor text (personalities, grudges, memories) into playable levers.
- **D3. Minor-nation patronage (S · MED)** — go beyond "high rel = cheaper fees":
  let the player *sponsor* a minor nation (aid package) to fast-track them toward
  promotion (ties into R3 dynamic league membership) or install a favorable kage
  succession — a long-game diplomatic project with a visible multi-year arc.
- **D4. Summit stakes (S · MED)** — summits currently resolve via bloc math; give the
  player a real choice at the table (broker a peace / back a bloc / stay neutral)
  with consequences that ripple into next season's war/exam matchups, not just a
  relations tick.

**Recommended start: D2** — cheapest, and it's pure "make existing rich data
actionable" rather than new systems — highest payoff-per-line-of-code here.

---

## 4. Staff / Academy / Roster management

**Why it's still bland:** signing, training plans, dev paths, staff levels (R9 youth
cup, R10 scout dossiers, R26 staff dev all shipped) are all present, but they're
**independent dials per shinobi** — nothing about *building a roster as a system*
(depth chart tension, staff synergy, succession planning) is modeled.

**Routes:**
- **S1. Staff synergy & clashes (S/M · MED)** — pair specific staff combos with real
  bonuses (a sensei + a tactics-focused assistant compound) or friction (two staff
  competing for the same mentee slot degrade each other's effectiveness). Makes
  hiring a *roster* decision, not independent slot-filling.
- **S2. Depth chart pressure (S · HIGH)** — a real minutes/opportunity model: bench
  players who don't get reps lose development speed and morale, starters who never
  rotate risk burnout. Currently role assignment has no downside to "just always
  play your best 5." Forces genuine squad rotation.
- **S3. Succession planning as a mechanic (M · MED)** — retiring veterans should
  train their replacement (a formal mentor-successor pairing with a visible XP
  transfer bonus, distinct from generic mentorBoost) so losing a legend to
  retirement is a managed transition, not just "roster slot empties, sign someone."
- **S4. Coaching staff development arcs (S · LOW/MED)** — staff themselves get
  poached by rivals once they level up (mirrors player transfer market), so
  building a great academy staff has retention risk, not just accrual.

**Recommended start: S2** — smallest, and it's the one that makes every single
lineup/role screen a real decision every month instead of "set once."

---

## Suggested order across all four (mixing quick wins + one flagship)

1. **S2 Depth chart pressure** (S) — cheapest, touches every turn immediately.
2. **M3 Squad fatigue/cohesion carryover** (S) — same shape, missions side.
3. **D2 Espionage/leverage plays** (S/M) — makes existing rival data playable.
4. **E1 Budget allocation with real tradeoffs** (M) — biggest single lever for
   Finance, worth a dedicated session.
5. Regroup — pick a flagship from **M1 mission chains**, **D1 alliances**, or
   **S3 succession** for a multi-session arc once the quick wins prove out.

**Engineering note:** none of these need new modules beyond `shared/utils/*` pure
functions in the existing pattern (missionEngine, economy calc, relations) — same
shape as everything already shipped, so `tests/*` coverage should stay easy to hold.
