import { describe, it, expect } from 'vitest'
import { FEATURES, isEnabled } from '../config/features.js'

describe('Feature flags', () => {
  it('exports an object with the four Phase 1 flags', () => {
    expect(FEATURES).toHaveProperty('ACADEMY')
    expect(FEATURES).toHaveProperty('SCOUTING')
    expect(FEATURES).toHaveProperty('DEPTH_CHART')
    expect(FEATURES).toHaveProperty('MISSION_TEMPLATES')
  })

  it('isEnabled returns true for flags set to true', () => {
    FEATURES.ACADEMY = true
    expect(isEnabled('ACADEMY')).toBe(true)
  })

  it('isEnabled returns false for flags set to false', () => {
    FEATURES.SCOUTING = false
    expect(isEnabled('SCOUTING')).toBe(false)
    FEATURES.SCOUTING = true // restore
  })
})
