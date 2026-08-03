# Gameplay loop — comparison against the management-sim genre

Written at `8b11ac5`. Measured from the code, not from impressions.

The systems work and are tested. This is about whether the *loop* they add up to
holds a player, judged against how the genre builds loops.

A note on confidence: the descriptions of Football Manager, OOTP and FHM below
are **structural** — cadence, where agency sits, how feedback arrives. I'm
confident about those shapes. I have not verified specific numbers against
current builds, so treat any figure for those games as approximate.

---

## 1. What our loop actually is

Per month, a player:

1. Assigns up to ~3 shinobi/squads to missions (with an approach picker)
2. Answers whatever is in the inbox — and the turn gate now *forces* this
3. Occasionally: squad edits, academy tracks, scouting, transfers, diplomacy
4. Ends the turn

Then the tick resolves everything and hands back reports.

**Annual event calendar**, counted from month-gated branches in the tick:

| month | scheduled events |
|---|---|
| 1 (Jan) | **12** — mandates set, daimyo objectives, era shift, league table init, off-season |
| 2–3 | off-season slate (friendlies, Invitational) |
| 4 (Apr) | Academy intake, Adept Exam |
| 5 | 1 |
| 6 (Jun) | **4** — Youth Cup, Five Warden Summit |
| 7 | 1 |
| **8, 9, 11** | **none** |
| 10 (Oct) | Adept Exam, academy walk-ins |
| 12 (Dec) | **8** — mandate review, year-end finances, Grand Tournament, annual reviews |

Plus ~9 league matchdays (one per in-season month) and ~36 mission resolutions.

So event *volume* is not the problem. Roughly 45 resolved events a year is
respectable. The problems are **where the agency sits** and **how the year is
shaped**.

---

## 2. How the genre builds its loop

**Football Manager.** The loop is *prepare → contest → consequence*, repeated
about twice a week. Crucially the manager is **present for the contest**: team
selection, a pre-match talk, live tactical shifts, substitutions, a post-match
reaction. Results feed morale, which feeds selection, which feeds results —
and board confidence sits over all of it as a job-security clock. You are never
more than a few days from the next fixture.

**OOTP / FHM.** Same skeleton, far more repetitions — a baseball season is 162
games. The volume itself becomes the texture: slumps and hot streaks are
*emergent* because the sample is huge. Agency is distributed across lineup,
rotation, in-season trades, and a genuinely parallel development pipeline (the
minors) that runs on its own clock.

**The narrative cousins** — Crusader Kings, RimWorld, Dwarf Fortress — do
something different: low event frequency but very high *consequence memory*.
Characters persist, remember, and generate stories. The payoff is the story you
can retell afterwards, not the match you just watched.

---

## 3. Where we sit — three structural gaps

### 3.1 Our payoff events are replays, not contests

This is the big one, and it is explicit in the code. The live battle viewer is
documented as *"pure presentation over engine-decided results"*, and the
mid-battle micro-call in `shared/utils/battleCalls.js` swings the quality band
but **never win/loss**.

So the sequence is: the player commits everything at assignment, the tick
decides the outcome, and then — optionally, and after the fact — a very
handsome animated view narrates a result that was already fixed. Auto-resolve
is a preference, which tells you the viewer is understood as skippable.

That is why this game can still feel like *"pick a dial → wait → read a
report"* despite four depth passes. Every one of those passes added **inputs**
— approach pickers, tactics, postures, budget ramps, pacts. None added
**presence**. In FM the match is where the manager is most active; in ours the
mission is where the player is most absent.

The irony is that we already built the hard part. The hex arena, the possession
sim, the tactics layer, the overlays, the stats sheet — the whole apparatus of a
match engine exists and is genuinely good. It is just wired to be a cutscene.

### 3.2 The year has a hollow middle

> **Partly wrong, corrected in §5B.** I counted month-gated branches in the
> tick, which misses the world calendar entirely — it fires from a data lookup.
> Months 2/4/6/8/10/12 already had an event each. The genuinely empty months
> were **9 and 11**, both now filled (`db88b11`). The shape of the complaint
> stood; the specific months did not. Worth leaving visible as a reminder that
> "grep for `G.month ===`" is not the same as "read the calendar".

The calendar is front-and-back-loaded: 12 things in January, 8 in December.
A player in an empty month assigns three missions and presses End Turn — that
is the whole month. FM has no dead weeks; there is always a fixture three days
out.

### 3.3 A nine-fixture league cannot carry a season narrative

One matchday per month gives ~9 games. At that resolution you cannot have a run
of form, a slump, a title race that tightens over the closing weeks — the sample
is too small for any of it to read as a story. And matchday agency is a *single
persisted tactic dial* (`G.matchdayTactic`), set once and inherited each month:
the exact set-and-forget shape the depth pass was written to eliminate.

---

## 4. What we have that they do not

Being fair to the design, because the recommendations should build on this
rather than chase FM's match fidelity.

- **Death and permanence.** FM players get injured; ours die, get memorialised,
  and leave holes in a squad. That is a genuine differentiator and the emotional
  core the genre leaders cannot touch.
- **Cross-run legacy.** FM has no meta-progression between saves. We have
  tenures, dynasty grades, inherited standing.
- **Village construction.** Districts, monuments, upgrades — a building layer
  the sports sims lack entirely.
- **A narrative memory layer.** Chronicles, the memorial wall, bonds,
  personality evolution, rival grudges. This is closer to Crusader Kings than to
  Football Manager.

**Our actual genre position is not "FM with ninjas."** It is a sports-management
skeleton carrying a colony-sim/CK narrative layer. The strongest version of this
game leans into consequence and memory, not match fidelity.

---

## 5. Options, ranked by loop impact ÷ cost

Not started — this is a design call, same as the economy one.

**A. Let the player affect an outcome while watching it.** DONE (`4712aa6`) —
the micro-call can now salvage a close defeat. Loss→win only; a win is never
reversed, because that would retroactively kill someone.

_Original note:_
The viewer and the micro-call already exist; the call is simply forbidden from
mattering. Letting it swing win/loss on close results — say, when the margin is
inside some band — converts our best-looking system from a cutscene into the
contest the loop is missing. Small code change, large felt change. Risk: it
invalidates the "outcome is pre-decided" guarantee the whole viewer was built
on, so archive/replay paths need care.

**B. Fill the empty months.** DONE (`db88b11`).

**Correction to §3.2 above:** this analysis claimed months 8, 9 and 11 were
empty. Month 8 was not. World events fire through a data lookup
(`getEventForMonth`), not a `G.month ===` branch, so counting branches missed
the entire world calendar — months 2/4/6/8/10/12 already had one each. The
genuinely empty months were the odd pair, **9 and 11**.

Both are now filled, using the existing calendar so they inherit advance
notice, the choice UI and history: **The Displaced** (M9, placed right after
the Shadow War's onset so it reads as that conflict's consequence) and **The
Draw** (M11, tournament seeding, one month before the tournament tests it).
Every month from 8 to 12 now has an anchor.

**C. Double league resolution.** Two matchdays a month, or fixtures through the
off-season, taking a season to ~18–24 games so form and slumps can exist. Also
makes the standings worth checking more than once a month.

**D. Make matchday a per-match decision.** Opponent-specific tactic pick rather
than a persisted default — a small change that turns a set-once dial into a
monthly read of the opponent.

**E. Lean the other way instead.** Accept low event frequency and invest in
consequence memory — the CK path. More persistent character stories, more
long-tail consequence from deaths and rivalries. This plays to what we already
do better than the genre leaders.

A and B together would change the feel of the loop most for the least work. E is
the strategically distinctive choice and worth deciding deliberately rather than
by default, because it points at a different game from A/C/D.
