// app/api/agents/[agentId]/passport/publish/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Publish a passport to a public URL, or withdraw one.
//
// PUBLISHING IS AN EXPLICIT ACT
// A public link makes an agent's behaviour readable by anyone holding it. That
// is the point — a passport nobody outside the team can reach is not a
// passport — and it is also a disclosure, so it happens only when the owner
// asks for it and can be undone at any moment.
//
// WHY THE DOCUMENT IS FROZEN
// The signature covers exact bytes. Regenerating on each view would produce a
// new document every time — new issue date, new figures as sessions
// accumulate, new signature — so a link cited in a compliance response would
// show something different by the time anyone opened it.
//
// What was published stays published. Reissuing is deliberate and replaces it.
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const GATEWAY =
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  'https://hbeval-reliability-os-production.up.railway.app'

/** Token length. 192 bits: unguessable, and the security of an unlisted link
 *  rests entirely on it not being guessable. */
const TOKEN_BYTES = 24

async function loadAgent(userId: string, rowId: string) {
  // Ownership is asserted in the query itself. service_role bypasses RLS, so
  // this predicate is the only thing between the caller and another account's
  // agent key.
  const { data } = await supabaseAdmin
    .from('agents')
    .select('agent_id, api_key, user_id')
    .eq('id', rowId)
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const agent = await loadAgent(user.id, params.agentId)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }

  // Fetched fresh at the moment of publication: what gets frozen should be
  // current as of the act of publishing, not whatever the browser happened to
  // be showing.
  let passport: Record<string, unknown>
  try {
    const res = await fetch(
      `${GATEWAY}/api/v1/passport/${encodeURIComponent(agent.agent_id)}?days=90`,
      {
        headers: { Authorization: `Bearer ${agent.api_key}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      },
    )
    if (!res.ok) throw new Error(String(res.status))
    passport = await res.json()
  } catch {
    return NextResponse.json(
      { error: 'Could not issue a passport to publish.' }, { status: 502 },
    )
  }

  const signature = passport.signature as { signed?: boolean } | undefined
  if (!signature?.signed) {
    // Publishing an unsigned passport would put a document on a public URL
    // that nobody can verify — which is a claim resting on trusting us, the
    // exact thing this is built to avoid.
    return NextResponse.json(
      {
        error: 'This deployment is not configured to sign passports, so there '
             + 'is nothing verifiable to publish. Set PASSPORT_SIGNING_KEY on '
             + 'the Gateway first.',
      },
      { status: 409 },
    )
  }

  const token = randomBytes(TOKEN_BYTES).toString('base64url')

  const { error: insErr } = await supabaseAdmin
    .from('published_passports')
    .insert({
      token,
      agent_id: agent.agent_id,
      user_id: user.id,
      passport_id: String(passport.passport_id ?? ''),
      document: passport,
      issued_at: String(passport.issued_at ?? new Date().toISOString()),
      expires_at: String(passport.expires_at ?? new Date().toISOString()),
    })

  if (insErr) {
    return NextResponse.json({ error: 'Could not publish.' }, { status: 500 })
  }

  return NextResponse.json({
    token,
    url: `/p/${token}`,
    passport_id: passport.passport_id,
    expires_at: passport.expires_at,
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { agentId: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'token is required.' }, { status: 400 })
  }

  // Revoked, not deleted. A record of what was published and when it was
  // withdrawn is itself worth keeping — and someone who followed the link
  // deserves to be told it was withdrawn rather than that it never existed.
  const { error } = await supabaseAdmin
    .from('published_passports')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Could not revoke.' }, { status: 500 })
  }
  return NextResponse.json({ revoked: true })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { agentId: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const agent = await loadAgent(user.id, params.agentId)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }

  // The document itself is not returned here — only what was published and
  // whether it is still live. The owner already has the document.
  const { data } = await supabaseAdmin
    .from('published_passports')
    .select('token, passport_id, issued_at, expires_at, revoked_at, view_count, published_at')
    .eq('agent_id', agent.agent_id)
    .eq('user_id', user.id)
    .order('published_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ publications: data ?? [] })
}
