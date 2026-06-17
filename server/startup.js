import { detectOrphanedTicks } from './db.js'

/**
 * Run once when the server starts.
 * Detects any villages that were mid-tick when the server last crashed
 * and clears their tick_in_progress flag so they can resume normally.
 */
export async function runStartupChecks() {
  console.log('[Startup] Running startup checks...')
  const orphans = await detectOrphanedTicks()
  if (orphans.length === 0) {
    console.log('[Startup] No orphaned ticks — state is clean.')
  } else {
    console.warn(`[Startup] Recovered ${orphans.length} incomplete tick(s).`)
    console.warn('[Startup] Affected players will load their last clean save on next connect.')
  }
  console.log('[Startup] Done.')
}
