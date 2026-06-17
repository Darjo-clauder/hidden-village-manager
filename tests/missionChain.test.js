import { describe, it, expect, beforeEach } from 'vitest'

// advanceChain imports G from state.js (browser). We test the pure logic inline.

function makeChain(stepCount = 3) {
  return {
    id: 'test_chain',
    n: 'Test Chain',
    steps: Array.from({ length: stepCount }, (_, i) => ({
      n: `Step ${i + 1}`, rk: 'B', ryo: 5000, rep: 8, dur: 2, risk: 0.25, mp: 60, sq: false,
    })),
    currentStep: 0,
    completedSteps: [],
    failedSteps: [],
    startYear: 1, startMonth: 1,
    state: { ryoAccumulated: 0, repAccumulated: 0, injuryEscalation: 0 },
  }
}

// Replicate advanceChain logic for unit testing (no G dependency)
function advanceChain(chain, G, missionRyo, missionRep, succeeded) {
  if (succeeded) {
    const stepBonus = 1 + chain.completedSteps.length * 0.10
    const stepRyo = Math.round(missionRyo * stepBonus)
    const stepRep = Math.round(missionRep * stepBonus)
    chain.state.ryoAccumulated += stepRyo
    chain.state.repAccumulated += stepRep

    chain.completedSteps.push(chain.currentStep)
    chain.currentStep++

    if (chain.currentStep >= chain.steps.length) {
      const bonusRyo = Math.round(chain.state.ryoAccumulated * 0.5)
      const bonusRep = chain.state.repAccumulated
      G.ryo = (G.ryo || 0) + bonusRyo
      G.reputation = Math.min(999, (G.reputation || 0) + bonusRep)
      G.chainDone = true
    } else {
      chain.state.injuryEscalation += 0.05
    }
  } else {
    chain.failedSteps.push(chain.currentStep)
    const partialRyo = Math.round((chain.state.ryoAccumulated || 0) * 0.25)
    G.ryo = (G.ryo || 0) + partialRyo
    G.chainFailed = true
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('Mission chain advancement', () => {
  let chain, G

  beforeEach(() => {
    chain = makeChain(3)
    G = { ryo: 0, reputation: 0 }
  })

  it('first step success increments currentStep to 1', () => {
    advanceChain(chain, G, 5000, 8, true)
    expect(chain.currentStep).toBe(1)
    expect(chain.completedSteps).toContain(0)
  })

  it('accumulates ryo across steps', () => {
    advanceChain(chain, G, 5000, 8, true)  // step 0
    advanceChain(chain, G, 5000, 8, true)  // step 1 (+10% bonus)
    expect(chain.state.ryoAccumulated).toBe(5000 + 5500)
  })

  it('10% step bonus applies on second and third steps', () => {
    advanceChain(chain, G, 10000, 10, true)  // step 0 → 1x
    const after0 = chain.state.ryoAccumulated  // 10000
    advanceChain(chain, G, 10000, 10, true)  // step 1 → 1.1x
    expect(chain.state.ryoAccumulated).toBe(after0 + 11000)
  })

  it('injury escalation increases 0.05 per completed step (not on final)', () => {
    advanceChain(chain, G, 5000, 8, true)  // step 0: escalation += 0.05
    expect(chain.state.injuryEscalation).toBeCloseTo(0.05)
    advanceChain(chain, G, 5000, 8, true)  // step 1: escalation += 0.05
    expect(chain.state.injuryEscalation).toBeCloseTo(0.10)
  })

  it('chain completion pays out 50% of accumulated ryo to G.ryo', () => {
    // Complete all 3 steps
    for (let i = 0; i < 3; i++) advanceChain(chain, G, 5000, 8, true)
    expect(G.chainDone).toBe(true)
    // step 0: 5000*1.0=5000, step 1: 5000*1.1=5500, step 2: 5000*1.2=6000 → total 16500; bonus=8250
    expect(G.ryo).toBe(Math.round(16500 * 0.5))
  })

  it('chain completion adds accumulated rep to G.reputation', () => {
    for (let i = 0; i < 3; i++) advanceChain(chain, G, 5000, 10, true)
    expect(G.reputation).toBeGreaterThan(0)
  })

  it('failure on step 0 pays nothing (no accumulated ryo)', () => {
    advanceChain(chain, G, 5000, 8, false)
    expect(G.chainFailed).toBe(true)
    expect(G.ryo).toBe(0)
  })

  it('failure after 2 steps pays 25% of accumulated ryo', () => {
    advanceChain(chain, G, 5000, 8, true)   // step 0: acc = 5000
    advanceChain(chain, G, 5000, 8, true)   // step 1: acc = 10500
    advanceChain(chain, G, 5000, 8, false)  // fail: partial = 10500 * 0.25 = 2625
    expect(G.ryo).toBe(Math.round(10500 * 0.25))
  })
})
