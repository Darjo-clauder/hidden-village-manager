# Hidden Village Manager

A Naruto-themed multiplayer village management sim. Each player runs their own hidden village as Kage — recruit shinobi, send them on missions, seal tailed beasts, and compete or cooperate with other players on a shared world map.

## Features

- **Single-player management** — Roster, squads, missions (D through S rank), chunin exams, economy, village upgrades, tailed beasts
- **Multiplayer world map** — See all connected villages on a live canvas map
- **Diplomacy** — Propose alliances, declare war, send gifts
- **PvP raids** — Attack enemy villages; server-authoritative combat resolution
- **Real-time** — Powered by Socket.io; events broadcast instantly to all players

## Run Locally

**Requirements:** Node.js 18+

```bash
git clone <your-repo-url>
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
