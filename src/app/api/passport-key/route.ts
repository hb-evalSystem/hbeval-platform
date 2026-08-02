// app/api/passport-key/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// The public key that verifies Agent Passports.
//
// WHY IT IS PUBLISHED HERE AND NOT ONLY ON THE GATEWAY
// A verifier has to trust that the key they fetched is really ours. They will
// trust hbeval.com — the name on the passport, and the domain everything else
// about this project points at. They have no particular reason to trust an
// opaque Railway hostname they have never seen.
//
// Unauthenticated, deliberately. A public key behind a login is not published,
// and the entire value of signing a passport is that a third party can check it
// without our involvement.
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
// Cached briefly. The key changes at most on rotation, so serving a stale one
// for a minute is harmless — but caching it for hours would leave verifiers
// holding a retired key after a rotation.
export const revalidate = 60

const GATEWAY =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY}/api/v1/passport/key`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(String(res.status))

    return NextResponse.json(await res.json(), {
      headers: {
        'Cache-Control': 'public, max-age=60',
        // Verification tools are frequently browser-based and run from
        // somewhere else entirely. A public key that cannot be fetched
        // cross-origin is a public key with an asterisk.
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return NextResponse.json(
      {
        available: false,
        reason: 'The key service is unreachable. Passports issued while it is '
              + 'down can still be verified later — a signature does not '
              + 'expire.',
      },
      { status: 503 },
    )
  }
}
