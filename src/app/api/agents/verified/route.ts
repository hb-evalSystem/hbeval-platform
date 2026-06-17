// app/api/agents/verified/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Path A (verified evaluation) bridge. The PLATFORM calls the user's agent
// endpoint across the fault battery — tamper-proof, marked `verified`. Relays to
// the Gateway's /evaluate_verified, which enforces paid-plan, explicit consent,
// and SSRF validation server-side (fail-closed).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { callGatewaySigned } from '@/lib/crypto/gateway-call'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch { body = {} }
  const agentRowId = String(body.agent_row_id ?? '').trim()
  const agentUrl = String(body.agent_url ?? '').trim()
  const baseTask = (body.base_task && typeof body.base_task === 'object') ? body.base_task : null
  const consent = body.consent === true
  const nScenarios = Math.max(6, Math.min(parseInt(body.n_scenarios ?? 30, 10) || 30, 100))
  const agentHeaders = (body.agent_headers && typeof body.agent_headers === 'object')
    ? body.agent_headers : {}

  if (!agentRowId || !agentUrl || !baseTask) {
    return NextResponse.json(
      { error: 'agent_row_id, agent_url, and base_task are required.' }, { status: 400 },
    )
  }
  if (!consent) {
    return NextResponse.json(
      { error: 'Explicit consent is required: the platform will call your agent endpoint.' },
      { status: 400 },
    )
  }

  const { data: agent, error: agErr } = await supabaseAdmin
    .from('agents')
    .select('api_key, aes_key_encrypted, hmac_secret_encrypted, agent_id')
    .eq('id', agentRowId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (agErr) {
    return NextResponse.json({ error: 'Could not load agent.' }, { status: 500 })
  }
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }

  try {
    const result = await callGatewaySigned(
      '/evaluate_verified',
      agent.api_key,
      { aesKeyEncrypted: agent.aes_key_encrypted, hmacSecretEncrypted: agent.hmac_secret_encrypted },
      {
        agent_url: agentUrl,
        base_task: baseTask,
        consent: true,
        n_scenarios: nScenarios,
        agent_headers: agentHeaders,
        required_in_response: Array.isArray(baseTask.required_in_response)
          ? baseTask.required_in_response : [],
        agent_id: agent.agent_id ?? 'verified-agent',
      },
      120000,
    )
    return NextResponse.json(result)
  } catch (e: any) {
    const msg = String(e?.message ?? 'Gateway error')
    let status = 502
    if (msg.includes('402')) status = 402
    else if (msg.includes('400')) status = 400
    else if (msg.includes('429')) status = 429
    return NextResponse.json({ error: msg.slice(0, 300) }, { status })
  }
}
