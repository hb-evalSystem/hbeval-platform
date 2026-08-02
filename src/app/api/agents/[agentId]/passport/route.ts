// app/api/agents/[agentId]/passport/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fetch a signed passport for one agent.
//
// WHY A PROXY RATHER THAN A DIRECT CALL
// The Gateway authenticates with the agent's API key. The browser must never
// hold that key — putting it in client code would hand every visitor the
// ability to evaluate, monitor and spend quota as that agent.
//
// So the key stays server-side: this route proves the session owns the agent,
// reads the key with service_role, calls the Gateway, and returns only the
// passport. The key never crosses the boundary to the client.
//
// WHY NOT ASSEMBLE THE PASSPORT HERE
// Every figure in it could be queried from Supabase directly under RLS. But
// the signature is the point of the document, and only the Gateway holds the
// signing key. A passport assembled here would be unsigned — which is to say,
// not a passport.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const GATEWAY =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

const MAX_WINDOW_DAYS = 365
const DEFAULT_WINDOW_DAYS = 90

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } },
) {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const requested = Number(
    req.nextUrl.searchParams.get('days') ?? DEFAULT_WINDOW_DAYS,
  )
  const days = Number.isFinite(requested)
    ? Math.min(Math.max(1, Math.floor(requested)), MAX_WINDOW_DAYS)
    : DEFAULT_WINDOW_DAYS

  // Ownership is checked here AND repeated in the WHERE clause. service_role
  // bypasses RLS, so this predicate is the only thing standing between the
  // caller and somebody else's agent key.
  const { data: agent, error: findErr } = await supabaseAdmin
    .from('agents')
    .select('agent_id, api_key, user_id')
    .eq('id', params.agentId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (findErr || !agent) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }

  try {
    const res = await fetch(
      `${GATEWAY}/api/v1/passport/${encodeURIComponent(agent.agent_id)}?days=${days}`,
      {
        headers: { Authorization: `Bearer ${agent.api_key}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      },
    )

    if (!res.ok) {
      // The Gateway's own message is not forwarded: it is written for a client
      // holding an API key and could name the key or why it was rejected.
      return NextResponse.json(
        { error: 'The Gateway could not issue a passport for this agent.' },
        { status: res.status === 404 ? 404 : 502 },
      )
    }

    return NextResponse.json(await res.json(), {
      // A passport is a point-in-time record. A cached one presented as
      // current would be a signed document making a stale claim.
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the Gateway.' }, { status: 503 },
    )
  }
}
