import { randomBytes } from 'crypto'

/**
 * Generates a URL-safe random ID.
 * Falls back to Math.random in browser environments (no `crypto.randomBytes`).
 * @param {number} [size=10]
 * @returns {string}
 */
export function nanoid(size = 10) {
  try {
    return randomBytes(size).toString('base36').slice(0, size)
  } catch {
    // browser fallback
    return Math.random().toString(36).slice(2, 2 + size)
  }
}
