import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { registerJoin } from './server/handlers/join.js'
import { registerSync } from './server/handlers/sync.js'
import { registerDiplomacy } from './server/handlers/diplomacy.js'
import { registerRaid } from './server/handlers/raid.js'
import { registerGift } from './server/handlers/gift.js'
import { registerDisconnect } from './server/handlers/disconnect.js'
import { registerRooms } from './server/handlers/rooms.js'
import { runStartupChecks } from './server/startup.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app    = express()
const server = createServer(app)
const io     = new Server(server)

// Serve built client in production
if (process.env.NODE_ENV !== 'development') {
  const dist = join(__dirname, 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
}

io.on('connection', (socket) => {
  console.log('+ connected:', socket.id)
  registerRooms(io, socket)
  registerJoin(io, socket)    // legacy join event (kept for backward compat)
  registerSync(io, socket)
  registerDiplomacy(io, socket)
  registerRaid(io, socket)
  registerGift(io, socket)
  registerDisconnect(io, socket)
})

const PORT = process.env.PORT || 3000
server.listen(PORT, async () => {
  console.log(`Hidden Village Manager → http://localhost:${PORT}`)
  await runStartupChecks()
})
