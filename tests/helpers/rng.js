/**
 * Seedable RNG harness for deterministic tests.
 *
 * The engine calls Math.random() directly everywhere (no injectable RNG), so to make
 * stochastic systems (mission resolution, raids, event rolls) reproducible we stub
 * Math.random with a seeded mulberry32 generator for the duration of a test.
 *
 * Usage:
 *   const restore = stubRandom(12345)
 *   try { ...call engine code... } finally { restore() }
 * or:
 *   withSeed(12345, () => { ...assertions... })
 */

/** mulberry32 — small, fast, well-distributed 32-bit seeded PRNG returning [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Replace Math.random with a seeded generator. Returns a restore() function. */
export function stubRandom(seed) {
  const rng = mulberry32(seed)
  const orig = Math.random
  Math.random = rng
  return function restore() { Math.random = orig }
}

/** Run fn with Math.random seeded; always restores, even on throw. */
export function withSeed(seed, fn) {
  const restore = stubRandom(seed)
  try { return fn() } finally { restore() }
}

/** Replace Math.random with a fixed, repeating sequence (exact control). Returns restore(). */
export function stubSequence(values) {
  let i = 0
  const orig = Math.random
  Math.random = () => values[i++ % values.length]
  return function restore() { Math.random = orig }
}
