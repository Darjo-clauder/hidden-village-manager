# Matchday as a bet, not a lookup

Scope for turning the per-fixture tactic pick into an actual management
decision. Written at `0e3aa95`. Not started.

---

## 1. The problem, measured

The C/D pass made the matchday tactic a per-fixture choice instead of a
persisted dial. It did not make it a *decision*. Measured against the real
12-village field:

| Opponent style | Villages | Correct answer | Edge |
|---|---|---|---|
| Opportunist | 3 | Control | +8% |
| Grinder | 2 | Control | +8% |
| Fortress | 3 | Overwhelm | +8% |
| Blitz | 2 | Counter | +8% |
| Balanced | 2 | **none — every option identical** | 0% |

Three consequences:

1. **Every fixture has exactly one right answer, always worth the same +8%.**
   No tradeoff, no context. Once the table is learned the decision is over
   permanently — it is a memory test, not management.
2. **Control is the blind-pick default**: strong into 5 of 12, weak into 2
   (net +3). Counter is net −1. A player who never scouts and always picks
   Control does well.
3. **2 of 12 fixtures have no decision at all.**

This is the failure mode `LOOP_ANALYSIS_2026-08-03.md` named — *"every pass
added inputs, none added presence"*. A per-fixture pick with one correct
answer is still a dial; it is just operated more often.

## 2. The design

A management decision needs a **tradeoff**, not a solution. The question
should never be "which is best" — it should be **"what do I need from this
match?"**. The season state needed to make that question meaningful already
exists and is already on screen (`seasonState` gives position, gap to
leader, rounds left; `matchPreview` already prints "At stake: …").

### A. Tactics become risk profiles

Each tactic shapes the *distribution* of the result, not just its mean.

| Tactic | strengthMod (matchup) | varMult | drawMult | Reads as |
|---|---|---|---|---|
| Standard | ±0 | 1.00 | 1.00 | no strong view |
| Control | +6 / −3 | **0.75** | **1.50** | protect a lead, bank a point |
| Overwhelm | +6 / −3 | **1.35** | **0.60** | must-win, take the variance |
| Counter | +6 / −3 | 0.90 | 1.15 | soak pressure, punish |

The matchup read shrinks from ±8/−4 to ±6/−3 so the *profile* choice
matters more than the lookup. The lookup stops being the whole decision and
becomes a modifier on a bet the player is making for their own reasons.

The dilemma this creates, which does not currently exist: three points back
with four rounds left, away at a Fortress. Control is the correct
counter-read and a draw ends your title challenge. Taking Overwhelm into the
worst possible matchup because a point is worthless to you is a real call.

**Fortress stops needing a balance patch under this model.** Its 2-point
table deficit (measured: 6.92 avg finish vs blitz 6.17 across 4,000 equal
strength seasons) becomes the flavour rather than a flaw — those villages
exist to draw you out of a title race, which is an authentic thing for a
stubborn side to be. The `underdogEdge: 1.05` patch is only worth doing if
this piece is skipped.

### B. The style read is gated behind intel

`identityFor(name).style` is currently free, permanent and global. Gating it
gives the scouting layer a downstream payoff — the same shape as the
leverage plays, where *recon is ammunition*.

- Fresh intel on that village (existing `G.intelReports`, 3-month expiry) →
  style shown, tactic picker shows its ± hints as today.
- No fresh intel → style shows as **Unknown**, hints are hidden, and the
  player picks on reputation, form and head-to-head instead.

**Gate the information only, never the sim.** The opponent still plays their
style whether or not you scouted them. This is a fog-of-war change, not a
balance change.

## 3. Files

**Core**
- `shared/constants/matchdayTactics.js` — add `varMult`/`drawMult` per
  tactic; add `tacticProfile(tacticId, oppStyle)` returning
  `{ strengthMod, varMult, drawMult }`. Keep `tacticMod`/`tacticRead`
  exported: `exam.js` and the tests use them.
- `shared/utils/season.js` — `styleParams()` currently maps an id → params.
  Let it **pass through a params object** so a caller can hand it a composed
  style. This is the whole plumbing change: `simMatch` already consumes
  `varLo/varHi/drawMult/underdogEdge/favoriteEdge`, so nothing else in the
  sim needs to move.
- `client/js/tick/season.js` — compose the player's effective style for the
  fixture: philosophy base style × tactic profile, then pass the composed
  object to `playMatchday` via `styleOf`.

**UI**
- `client/js/panels/exam.js` — `_tacticPicker` shows the risk profile
  (draw/variance shape), not only the ± number; `_matchPreviewCard` hides
  the style line and hints when intel is stale.
- `client/js/panels/intel.js` — surface "matchday read" as a named benefit
  of recon so the link is discoverable rather than inferred.

**Watch-outs**
- `G.matchPrefs` (auto-resolve default tactic, `resolveMatchPrefs`) must
  understand the new model or auto-resolve silently diverges from watching.
- **Intel keying is already inconsistent**: reports are written with
  `v.id || v.n` but read in places against `v.n` as well —
  `_leverageCtx` checks *both*, which is evidence of existing drift. Reuse
  `_vKey` and do not invent a third convention.
- Only the player picks a tactic; rivals do not. That asymmetry is
  intentional and pre-existing — do not "fix" it into rival behaviour
  without deciding to.

## 4. Tests

- `tests/matchdayTactics.test.js` — extend: every tactic returns a complete
  profile; `varMult`/`drawMult` are within sane bounds; the matchup read
  still resolves strong/weak/neutral.
- `tests/season.test.js` — `styleParams` passes an object through unchanged
  and still resolves ids; `simMatch` respects a composed style.
- **New balance test**: no tactic may be dominant across the field. Assert
  that each of the four is the best expected-points choice in at least one
  (situation × opponent-style) cell, so the lookup cannot collapse again.
- Re-run the 4,000-season equal-strength harness (the one that produced the
  6.17→6.92 spread) and assert the spread does not widen.

**Snapshot warning:** changing the player's effective style changes matchday
RNG consumption, so `tickCharacterization` snapshots WILL regenerate. That is
expected here — it is a deliberate behaviour change, not a refactor. The
24-seed invariant sweep must stay green untouched.

## 5. Sequence

1. `styleParams` pass-through + `tacticProfile` + unit tests. No behaviour
   change yet if profiles are all 1.0 — land this neutral and verify the
   snapshots are byte-identical, which proves the plumbing is inert.
2. Turn the profiles on. Regenerate snapshots. Re-run the balance harness.
3. UI: picker shows the risk shape.
4. Intel gating (B) — independent of 1–3 and can ship separately.

Step 1 landing inert is the important part: it separates "did I wire this
correctly" from "did I balance this correctly", which is the mistake the
economy pass had to unwind twice.

## 6. Open numbers

All tunable, none load-bearing on the architecture: the ±6/−3 matchup read,
the four var/draw profiles, and the intel freshness window (currently 3
months, inherited from `G.intelReports`). Expect one balance pass on the
4,000-season harness after step 2.
