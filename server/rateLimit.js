// Per-socket token-bucket rate limiter.
//
// Every inbound event costs one token; the bucket refills over time. This is a
// turn-based game — a legit client emits a handful of events per turn — so a
// generous bucket still lets normal play through while stopping an event flood
// (raid/gift/sync spam, private-room-code brute force) from pinning CPU/DB.

export function makeRateLimiter({ capacity = 40, refillPerSec = 8 } = {}) {
  return function attach(socket) {
    let tokens = capacity
    let last = Date.now()
    socket.use((_packet, next) => {
      const now = Date.now()
      tokens = Math.min(capacity, tokens + ((now - last) / 1000) * refillPerSec)
      last = now
      if (tokens < 1) return next(new Error('rate limited'))
      tokens -= 1
      next()
    })
  }
}
