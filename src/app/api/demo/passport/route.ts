// app/api/demo/passport/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Issue a signed passport for a demo run.
//
// WHY A PROXY
// Only the Gateway holds the signing key, and it should stay that way: a key
// present in two deployments is a key with two chances of leaking. This route
// forwards the demo's computed metrics and returns the signed document.
//
// The Gateway builds the passport itself — this route sends numbers, never a
// document. That distinction matters: if the client could supply the passport
// body, anyone could have us sign text of their choosing, and the signature
// would stop meaning "HB-Eval measured this" and start meaning nothing at all.
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GATEWAY =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Only the fields the Gateway expects are forwarded. It validates them again
  // — this is convenience, not the security boundary, and treating it as the
  // boundary would put the check on the wrong side of the network.
  const payload = {
    metrics: body.metrics ?? {},
    steps: body.steps ?? 0,
    halted: Boolean(body.halted),
    halt_reason: body.halt_reason ?? null,
    breaches: body.breaches ?? 0,
  }

  try {
    const res = await fetch(`${GATEWAY}/api/v1/passport/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'The Gateway could not issue a demo passport.' },
        { status: 502 },
      )
    }

    return NextResponse.json(await res.json(), {
      // A signed document is a point-in-time artefact; a cached one would be
      // handed out with a stale issue date and a nearer expiry than it claims.
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the Gateway.' }, { status: 503 },
    )
  }
}
