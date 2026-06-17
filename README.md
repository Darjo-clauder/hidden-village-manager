# Hidden Village Manager

A Naruto-themed multiplayer village management sim. Each player runs their own hidden village as Kage — recruit shinobi, send them on missions, seal tailed beasts, and compete or cooperate with other players on a shared world map.

## Features

### Core Management
- **Roster & Shinobi** — Recruit, rank up (Genin → Chunin → Jonin → ANBU → S-Rank), manage injuries, retirements, jutsu loadouts
- **Squads** — Build squads with chemistry bonuses, synergy effects, depth charts with promotion rules
- **Missions** — D through S rank solo and squad missions, mission chains, tactical prep modes (Aggressive/Standard/Cautious), mission outcome feed with filters
- **Economy** — Trade routes, contracts, districts, sponsorships, council proposals, Daimyo relations, loans
- **Village Upgrades** — Buildable structures with passive bonuses across 5 district types
- **Academy** — Youth academy, training plans, scouting network with discovery pool and rival signing

### Depth Expansions (Phase 1–3)
- **Academy Hub** — Hidden attribute panel and prospect development engine with per-stat growth curves
- **Scout Network** — Aggregated discovery pool, expertise/burnout/poaching career arcs, rival offer matching
- **Depth Chart** — Per-role promotion rules (auto / seniority / power / manual), active-starter indicator, emergency call-ups
- **Mission Log** — Persistent outcome feed with outcome filters (all / success / failure / KIA)

### Advanced Systems (Phase 4)
- **Jutsu Loadout** — 3-slot active loadout per shinobi; loaded jutsu apply `powerMod` and `successMod` to mission rolls
- **Village Districts** — 5 buildable districts (Training Grounds, Hospital Wing, Intel Office, Forge, Market) with stacking passives: stat growth, injury reduction, KIA risk, ANBU bonus, scout confidence, mission risk, income
- **Council Politics** — 4 factions (Military, Merchant, Academy, Elder) with approval meters, monthly drift, proposals with yes/no outcomes, crisis events at < 20% approval
- **Rival Village Simulator** — Live rival strength tracking, personality-driven tick (Aggressive +1.5/mo, Honorable +0.8/mo), player-vs-rival strength ratio events
- **Dynasty Endgame** — 30-year clock, dynasty grade (S/A/B/C/D), inherited bonuses on handoff across 6 scoring axes

### Underground & World Systems (Phase 5)
- **Rivalry & Mentorship Bonds** — 4 typed bonds (Brothers-in-Arms, Mentor/Student, Rivals, Battle-Scarred); mission success mods, mentor growth acceleration, KIA morale ripple
- **Black Market** — 5 forbidden contracts (assassination, sabotage, scroll heist, espionage, bingo bounty); 5 underworld standing tiers (Unknown → Phantom) with passive income at Phantom; discovery risk on completion with reputation penalty; jutsu reward on scroll heist, intel reveal on espionage
- **Clan System** — 6 clans (Uchiha, Hyuga, Nara, Akimichi, Inuzuka, Aburame) with bloodline passives gated by approval; 12 clan-exclusive mission chains; council influence weighting; clan approval drift and gift mechanic
- **Scout Safehouse Network** — Up to 3 safehouses across 5 locations (8,000 ryo each); passive prospect lead generation monthly; 4 deep cover op types (Infiltration, Extraction, Sabotage, Double Agent Turn) requiring varying rank
- **World Events Calendar** — 6 recurring annual events at fixed months (Great Hunt, Spring Festival, Merchant Summit, Shadow War, Harvest Tribute, Winter Trials); 1-month advance notice; 3-choice resolution with risk-weighted outcomes and history log

### Multiplayer
- **World Map** — Live canvas map showing all connected villages
- **Diplomacy** — Propose alliances, declare war, send gifts, Five Kage Summit
- **PvP Raids** — Attack enemy villages; server-authoritative combat resolution
- **Real-time** — Socket.io; events broadcast instantly to all players

## Test Coverage

278 unit tests across 23 test files — all pure shared logic tested with Vitest (ESM compatible, no browser deps):

```
npx vitest run
```

## Run Locally

**Requirements:** Node.js 18+

```bash
git clone https://github.com/Darjo-clauder/hidden-village-manager.git
cd hidden-village-manager
npm install
npm start
```

Open **http://localhost:3000** in your browser. Open a second tab or share your local IP with others on the same network to test multiplayer.

**Development (auto-restart on changes):**

```bash
npm run dev
```

## Deploy to Railway

> Village state is held in memory — it resets when the server restarts. All players in an active session share one server instance.

### Option A — Railway CLI (fastest)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Railway auto-detects Node.js, runs `npm start`, and assigns a public URL.

### Option B — GitHub (recommended for ongoing use)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select the repo — Railway deploys automatically on every push
4. Your public URL appears in the Railway dashboard under **Settings → Domains**

### Environment Variables

No required variables — the server reads `process.env.PORT` automatically (Railway sets this).

Optional `.env` for local overrides:

```
PORT=3000
```

## How to Play

1. Open the public URL in your browser
2. Enter a village name, your Kage name, and pick a symbol
3. Click **Connect & Begin**
4. Manage your village — advance months, assign missions, recruit shinobi
5. Open **World Map** in the sidebar to see other players and take diplomatic actions

## Project Structure

```
client/js/
  panels/          # UI panels (roster, missions, clans, safehouses, etc.)
  adv.js           # Monthly tick — core game loop
  state.js         # Game state (G) and helpers
shared/
  bonds/           # Bond types (pure)
  constants/       # Districts, council, clans, safehouses, blackMarket, worldCalendar
  jutsu/           # Jutsu loadout (pure)
  types/           # Mission templates (pure)
  utils/           # Rival sim, dynasty logic (pure)
tests/             # Vitest unit tests — all pure shared modules
config/
  features.js      # Feature flags
```
