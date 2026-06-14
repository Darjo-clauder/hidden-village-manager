const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const MAP_W = 80, MAP_H = 40;
const villages = new Map(); // socketId → village

function rndPos() {
  return {
    x: Math.floor(Math.random() * (MAP_W - 14)) + 7,
    y: Math.floor(Math.random() * (MAP_H - 8)) + 4,
  };
}

function worldSnapshot() {
  return Array.from(villages.values());
}

function getRelStatus(v, otherId) {
  return v.relations?.[otherId]?.status || 'neutral';
}

function setRel(a, b, status, relDelta = 0) {
  if (!a.relations[b.id]) a.relations[b.id] = { status: 'neutral', rel: 50 };
  if (!b.relations[a.id]) b.relations[a.id] = { status: 'neutral', rel: 50 };
  a.relations[b.id].status = status;
  b.relations[a.id].status = status;
  if (relDelta) {
    a.relations[b.id].rel = Math.max(0, Math.min(100, a.relations[b.id].rel + relDelta));
    b.relations[a.id].rel = Math.max(0, Math.min(100, b.relations[a.id].rel + relDelta));
  }
}

io.on('connection', (socket) => {
  console.log('+ connected:', socket.id);

  socket.on('join', ({ name, kageName, icon }) => {
    const village = {
      id: socket.id,
      name: (name || 'Hidden Village').slice(0, 32),
      kageName: (kageName || 'Unknown').slice(0, 24),
      icon: icon || '🍃',
      power: 0,
      reputation: 10,
      shinobiCount: 0,
      ryo: 60000,
      sealedBeasts: [],
      pos: rndPos(),
      relations: {},
      online: true,
    };

    villages.set(socket.id, village);

    // Send existing world to the joiner
    socket.emit('world_state', worldSnapshot());

    // Announce to everyone else
    socket.broadcast.emit('village_joined', village);

    console.log(`  "${village.name}" (${village.icon}) joined`);
  });

  socket.on('sync_state', ({ power, reputation, shinobiCount, sealedBeasts, ryo }) => {
    const v = villages.get(socket.id);
    if (!v) return;
    v.power = power ?? v.power;
    v.reputation = reputation ?? v.reputation;
    v.shinobiCount = shinobiCount ?? v.shinobiCount;
    v.sealedBeasts = sealedBeasts ?? v.sealedBeasts;
    v.ryo = ryo ?? v.ryo;
    io.emit('village_update', {
      id: socket.id, power: v.power, reputation: v.reputation,
      shinobiCount: v.shinobiCount, sealedBeasts: v.sealedBeasts,
    });
  });

  socket.on('propose_alliance', ({ targetId }) => {
    const from = villages.get(socket.id);
    const target = villages.get(targetId);
    if (!from || !target) return;
    if (getRelStatus(from, targetId) === 'war') {
      socket.emit('sv_notification', 'Cannot propose alliance while at war.');
      return;
    }
    const tSocket = io.sockets.sockets.get(targetId);
    if (tSocket) {
      tSocket.emit('alliance_proposed', { fromId: socket.id, fromName: from.name, fromIcon: from.icon });
    }
    socket.emit('sv_notification', `Alliance proposal sent to ${target.name}.`);
  });

  socket.on('respond_alliance', ({ fromId, accepted }) => {
    const responder = villages.get(socket.id);
    const proposer = villages.get(fromId);
    if (!responder || !proposer) return;

    if (accepted) {
      setRel(responder, proposer, 'allied', +30);
      const pSocket = io.sockets.sockets.get(fromId);
      if (pSocket) {
        pSocket.emit('alliance_accepted', { fromId: socket.id, fromName: responder.name, fromIcon: responder.icon });
      }
      io.emit('relations_update', { a: socket.id, b: fromId, status: 'allied' });
    } else {
      const pSocket = io.sockets.sockets.get(fromId);
      if (pSocket) {
        pSocket.emit('alliance_declined', { fromId: socket.id, fromName: responder.name });
      }
    }
  });

  socket.on('break_alliance', ({ targetId }) => {
    const from = villages.get(socket.id);
    const target = villages.get(targetId);
    if (!from || !target) return;
    setRel(from, target, 'neutral', -15);
    const tSocket = io.sockets.sockets.get(targetId);
    if (tSocket) {
      tSocket.emit('alliance_broken', { fromId: socket.id, fromName: from.name, fromIcon: from.icon });
    }
    io.emit('relations_update', { a: socket.id, b: targetId, status: 'neutral' });
    socket.emit('sv_notification', `Alliance with ${target.name} dissolved.`);
  });

  socket.on('declare_war', ({ targetId }) => {
    const from = villages.get(socket.id);
    const target = villages.get(targetId);
    if (!from || !target) return;
    setRel(from, target, 'war', -40);
    const tSocket = io.sockets.sockets.get(targetId);
    if (tSocket) {
      tSocket.emit('war_declared', { fromId: socket.id, fromName: from.name, fromIcon: from.icon });
    }
    io.emit('relations_update', { a: socket.id, b: targetId, status: 'war' });
    console.log(`  WAR: ${from.name} → ${target.name}`);
  });

  socket.on('launch_raid', ({ targetId }) => {
    const attacker = villages.get(socket.id);
    const defender = villages.get(targetId);
    if (!attacker || !defender) return;

    if (getRelStatus(attacker, targetId) === 'allied') {
      socket.emit('sv_notification', 'Cannot raid an ally.');
      return;
    }

    // Server-side combat resolution
    const atkRoll = attacker.power + Math.floor(Math.random() * 25);
    const defRoll = defender.power + Math.floor(Math.random() * 25);
    const attackerWins = atkRoll > defRoll;
    const ryoStolen = attackerWins ? Math.max(500, Math.floor((defender.ryo || 10000) * 0.12)) : 0;

    // Apply ryo on server
    if (attackerWins) {
      attacker.ryo = (attacker.ryo || 0) + ryoStolen;
      defender.ryo = Math.max(0, (defender.ryo || 0) - ryoStolen);
    }

    // Escalate to war if not already
    if (getRelStatus(attacker, targetId) !== 'war') {
      setRel(attacker, defender, 'war', -25);
      io.emit('relations_update', { a: socket.id, b: targetId, status: 'war' });
    }

    socket.emit('raid_result', {
      targetId, targetName: defender.name, targetIcon: defender.icon,
      won: attackerWins, atkRoll, defRoll,
      ryoStolen, repChange: attackerWins ? 10 : -3, isAttacker: true,
    });

    const dSocket = io.sockets.sockets.get(targetId);
    if (dSocket) {
      dSocket.emit('raid_result', {
        fromId: socket.id, fromName: attacker.name, fromIcon: attacker.icon,
        won: !attackerWins, atkRoll, defRoll,
        ryoStolen, isAttacker: false,
      });
    }

    console.log(`  RAID: ${attacker.name} vs ${defender.name} → ${attackerWins ? 'attacker wins' : 'defender holds'}`);
  });

  socket.on('send_gift', ({ targetId }) => {
    const from = villages.get(socket.id);
    const target = villages.get(targetId);
    if (!from || !target) return;

    const GIFT = 5000;
    if ((from.ryo || 0) < GIFT) {
      socket.emit('sv_notification', 'Not enough ryo for gifts.');
      return;
    }

    from.ryo -= GIFT;
    target.ryo = (target.ryo || 0) + GIFT;

    if (getRelStatus(from, targetId) === 'war') {
      setRel(from, target, 'neutral', +20);
      io.emit('relations_update', { a: socket.id, b: targetId, status: 'neutral' });
    } else {
      setRel(from, target, getRelStatus(from, targetId), +10);
    }

    const tSocket = io.sockets.sockets.get(targetId);
    if (tSocket) {
      tSocket.emit('gift_received', { fromId: socket.id, fromName: from.name, fromIcon: from.icon, amount: GIFT });
    }

    socket.emit('gift_sent', { targetName: target.name, amount: GIFT });
  });

  socket.on('disconnect', () => {
    const v = villages.get(socket.id);
    if (v) {
      console.log(`- disconnected: "${v.name}"`);
      villages.delete(socket.id);
      io.emit('village_left', { id: socket.id, name: v.name, icon: v.icon });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Hidden Village Manager → http://localhost:${PORT}`);
});
