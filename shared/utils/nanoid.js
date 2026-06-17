/**
 * Generates a URL-safe random ID using Web Crypto (browser + Node 19+).
 * @param {number} [size=10]
 * @returns {string}
 */
export function nanoid(size = 10) {
  const bytes = new Uint8Array(size)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    // Node < 19 fallback (test environment)
    for (let i = 0; i < size; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, size)
}
