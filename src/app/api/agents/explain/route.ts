// app/api/agents/explain/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Layer 2 (HCI-EDM) bridge. The browser cannot call the Gateway's /api/v1/explain
// directly — that needs the per-agent signing secret, which must never reach the
// client. So the browser calls THIS route; we authenticate the session, confirm
// the agent belongs to the user, decrypt the agent's secrets server-side, sign
// the request, and relay it to the Gateway.
//
// SECURITY:
//   • Session is read from the cookie (unforgeable), never from the body.
//   • We fetch the agent with service_role but ALWAYS scope to user_id from the
//     session — a user can only explain their own agent's evaluations.
//   • Encrypted secrets are decrypted only here, on the server; never returned.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { callGatewaySigned } from '@/lib/crypto/gateway-call'

export const runtime = 'nodejs'   // crypto needs the Node runtime, not edge

export async function POST(req: NextRequest) {
  // ── 1. Authenticate via session cookie ──
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  // ── 2. Parse input ──
  let body: any
  try { body = await req.json() } catch { body = {} }
  const agentRowId = String(body.agent_row_id ?? '').trim()
  const planSummary = String(body.plan_summary ?? '').trim().slice(0, 2000)

  if (!agentRowId || !planSummary) {
    return NextResponse.json(
      { error: 'agent_row_id and plan_summary are required.' },
      { status: 400 },
    )
  }

  // ── 3. Fetch the agent's secrets — SCOPED TO THIS USER (ownership check) ──
  const { data: agent, error: agErr } = await supabaseAdmin
    .from('agents')
    .select('api_key, aes_key_encrypted, hmac_secret_encrypted')
    .eq('id', agentRowId)
    .eq('user_id', user.id)          // a user can only explain their own agent
    .maybeSingle()

  if (agErr) {
    return NextResponse.json({ error: 'Could not load agent.' }, { status: 500 })
  }
  if (!agent) {
    // Either it doesn't exist or it isn't theirs — don't distinguish.
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }

  // ── 4. Relay to the Gateway, signed server-side ──
  try {
    const result = await callGatewaySigned(
      '/api/v1/explain',
      agent.api_key,
      {
        aesKeyEncrypted: agent.aes_key_encrypted,
        hmacSecretEncrypted: agent.hmac_secret_encrypted,
      },
      { plan_summary: planSummary },
    )
    return NextResponse.json(result)
  } catch (e: any) {
    // Fail honestly — never fabricate an explanation in the UI.
    return NextResponse.json(
      { error: 'Explanation service is temporarily unavailable.', detail: String(e?.message ?? e).slice(0, 200) },
      { status: 502 },
    )
  }
}
