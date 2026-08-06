// app/api/demo/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// The demo and the playground, both computed by the real SDK.
//
// WHY THIS RUNS ON THE SERVER
// The metrics come from hb-eval-sdk-js — the package anyone can install from
// npm — not from numbers written into this file. A demo with hand-picked
// figures proves nothing, and a project whose argument is "measure, do not
// assert" cannot open with an assertion.
//
// It must be server-side because the SDK imports node:crypto for the wire
// protocol. The browser plays back a trace it did not compute, which is a real
// limitation and is stated on the page rather than hidden.
//
// THE PLAYGROUND, AND THE TRAP IT AVOIDS
// Visitors can change the halt policy, the thresholds and how many faults the
// agent meets. They cannot change the agent: the fault sequence is generated
// from a fixed pattern, so lowering a floor never improves behaviour, it only
// stops the floor from noticing.
//
// That constraint is the whole point. A playground where you can dial numbers
// until everything turns green teaches the opposite of what this system is
// for, and the page says so when a floor is lowered below the default.
import { NextRequest, NextResponse } from 'next/server'
import { HBEvalClient } from 'hb-eval-sdk-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ScriptStep {
  action: string
  success: boolean
  hadFault: boolean
  recoveredIntentionally: boolean | null
  traceable: boolean
  replanned: boolean
  note: string
}

/** The fixed demo: a support agent handling a delayed shipment. */
const SCRIPT: ScriptStep[] = [
  { action: 'plan the response', success: true, hadFault: false,
    recoveredIntentionally: null, traceable: true, replanned: false,
    note: 'Reads the ticket and forms a plan.' },
  { action: 'look up the order', success: true, hadFault: false,
    recoveredIntentionally: null, traceable: true, replanned: false,
    note: 'Internal database responds normally.' },
  { action: 'check carrier status', success: true, hadFault: false,
    recoveredIntentionally: null, traceable: true, replanned: false,
    note: 'Carrier API healthy.' },
  { action: 'fetch tracking detail', success: false, hadFault: true,
    recoveredIntentionally: false, traceable: false, replanned: false,
    note: 'Carrier API times out. The first real fault.' },
  { action: 'retry tracking detail', success: false, hadFault: true,
    recoveredIntentionally: false, traceable: false, replanned: false,
    note: 'Identical retry — same call, same arguments, no reasoning between.' },
  { action: 'retry tracking detail', success: false, hadFault: true,
    recoveredIntentionally: false, traceable: false, replanned: false,
    note: 'And again. This is where an unguarded agent starts burning money.' },
  { action: 're-plan approach', success: true, hadFault: true,
    recoveredIntentionally: true, traceable: true, replanned: true,
    note: 'Consults its own reasoning and changes tack. A deliberate recovery.' },
  { action: 'use cached tracking', success: true, hadFault: false,
    recoveredIntentionally: null, traceable: true, replanned: false,
    note: 'Falls back to cached data.' },
  { action: 'draft the reply', success: true, hadFault: false,
    recoveredIntentionally: null, traceable: true, replanned: false,
    note: 'Composes a response.' },
  { action: 'send the reply', success: true, hadFault: false,
    recoveredIntentionally: null, traceable: true, replanned: false,
    note: 'Delivers it. The task is complete.' },
]

/**
 * Build a script with a chosen number of faults and retries.
 *
 * Deterministic — no randomness — so the same settings always produce the same
 * run and two people comparing notes see the same figures.
 *
 * Faults are always followed by blind retries and then one deliberate
 * recovery, because that is the shape the metrics exist to distinguish. Making
 * the recovery pattern configurable too would let a visitor build an agent that
 * always recovers deliberately, which is not a lesson about measurement — it is
 * a lesson about writing a flattering script.
 */
function buildScript(faults: number, retriesPerFault: number): ScriptStep[] {
  if (faults === 3 && retriesPerFault === 2) return SCRIPT

  const steps: ScriptStep[] = [
    { action: 'plan the response', success: true, hadFault: false,
      recoveredIntentionally: null, traceable: true, replanned: false,
      note: 'Reads the ticket and forms a plan.' },
    { action: 'look up the order', success: true, hadFault: false,
      recoveredIntentionally: null, traceable: true, replanned: false,
      note: 'Internal database responds normally.' },
  ]

  for (let f = 0; f < faults; f++) {
    steps.push({
      action: `call dependency ${f + 1}`, success: false, hadFault: true,
      recoveredIntentionally: false, traceable: false, replanned: false,
      note: 'The dependency fails.',
    })
    for (let r = 0; r < retriesPerFault; r++) {
      steps.push({
        action: `retry dependency ${f + 1}`, success: false, hadFault: true,
        recoveredIntentionally: false, traceable: false, replanned: false,
        note: 'Identical retry — no reasoning between attempts.',
      })
    }
  }

  steps.push({
    action: 're-plan approach', success: true, hadFault: true,
    recoveredIntentionally: true, traceable: true, replanned: true,
    note: 'Consults its own reasoning and changes tack.',
  })
  steps.push({
    action: 'send the reply', success: true, hadFault: false,
    recoveredIntentionally: null, traceable: true, replanned: false,
    note: 'Delivers it. The task is complete.',
  })

  return steps
}

function clamp(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : fallback
}

// Credentials the SDK requires structurally but never uses: streaming and
// summary upload are both off, so nothing leaves this process.
const PLACEHOLDER_KEY = Buffer.alloc(32).toString('base64')

// The defaults the SDK ships with. Reported alongside any override so a
// visitor can see they moved the goalposts rather than the agent.
const DEFAULT_FLOORS = { pei: 0.7, frr: 0.65, irs: 0.6, ti: 3.0 }

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const mode = q.get('mode') === 'guarded' ? 'guarded' : 'unguarded'

  const faults = clamp(q.get('faults'), 0, 8, 3)
  const retries = clamp(q.get('retries'), 0, 5, 2)
  const below = clamp(q.get('below'), 0.05, 0.95, 0.5)
  const forSteps = clamp(q.get('for_steps'), 1, 10, 3)
  const metric = (['pei', 'frr', 'irs', 'ti'] as const)
    .includes(q.get('metric') as never) ? q.get('metric')! : 'frr'

  const thresholds = {
    pei: clamp(q.get('floor_pei'), 0, 1, DEFAULT_FLOORS.pei),
    frr: clamp(q.get('floor_frr'), 0, 1, DEFAULT_FLOORS.frr),
    irs: clamp(q.get('floor_irs'), 0, 1, DEFAULT_FLOORS.irs),
    ti: clamp(q.get('floor_ti'), 0, 5, DEFAULT_FLOORS.ti),
  }

  const script = buildScript(faults, retries)

  const client = new HBEvalClient({
    apiKey: 'demo',
    aesKey: PLACEHOLDER_KEY,
    signingSecret: PLACEHOLDER_KEY,
  })

  const session = client.monitor({
    agentId: 'demo-support-agent',
    stream: false,
    sendSummary: false,
    thresholds,
    ...(mode === 'guarded'
      ? { haltPolicy: { metric: metric as never, below, forSteps } }
      : {}),
  })

  const steps: unknown[] = []
  let haltedAt: number | null = null

  for (let i = 0; i < script.length; i++) {
    const s = script[i]!
    session.recordStep({
      action: s.action,
      success: s.success,
      hadFault: s.hadFault,
      recoveredIntentionally: s.recoveredIntentionally,
      traceable: s.traceable,
      replanned: s.replanned,
    })

    steps.push({
      index: i + 1,
      action: s.action,
      note: s.note,
      success: s.success,
      hadFault: s.hadFault,
      replanned: s.replanned,
      metrics: { ...session.liveMetrics },
      breaches: session.breachCount,
      halted: session.shouldHalt,
    })

    if (session.shouldHalt) {
      haltedAt = i + 1
      break
    }
  }

  // Named explicitly so the page can say "you lowered a floor" rather than
  // letting a visitor read an easier pass as a better agent.
  const loweredFloors = (Object.keys(DEFAULT_FLOORS) as Array<keyof typeof DEFAULT_FLOORS>)
    .filter(k => thresholds[k] < DEFAULT_FLOORS[k])

  return NextResponse.json({
    mode,
    steps,
    haltedAt,
    totalScripted: script.length,
    haltReason: session.haltReason,
    haltRecord: session.haltRecord,
    finalMetrics: session.liveMetrics,
    breachCount: session.breachCount,
    settings: {
      faults, retries, metric, below, forSteps, thresholds,
      defaults: DEFAULT_FLOORS,
      loweredFloors,
      isDefault: faults === 3 && retries === 2 && below === 0.5
                 && forSteps === 3 && metric === 'frr'
                 && loweredFloors.length === 0,
    },
    computedBy: {
      package: 'hb-eval-sdk-js',
      protocol: '2.7.0',
      note: 'Metrics computed by the published SDK, not written into the demo.',
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
