// app/api/agents/battery/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Path B (local fault-injection battery) bridge. The browser collects the
// agent's raw per-scenario responses and posts them here; we authenticate the
// session, confirm the agent belongs to the user, decrypt the agent's secrets
// server-side, sign the request, and relay it to the Gateway's /evaluate_battery
// — which scores all five metrics server-side (tamper-resistant).
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
  const scenarioResults = Array.isArray(body.scenario_results) ? body.scenario_results : null
  const requiredInResponse = Array.isArray(body.required_in_response)
    ? body.required_in_response : []

  if (!agentRowId || !scenarioResults || scenarioResults.length === 0) {
    return NextResponse.json(
      { error: 'agent_row_id and a non-empty scenario_results array are required.' },
      { status: 400 },
    )
  }
  if (scenarioResults.length > 60) {
    return NextResponse.json(
      { error: 'Battery exceeds the maximum of 60 scenarios.' }, { status: 400 },
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
      '/evaluate_battery',
      agent.api_key,
      { aesKeyEncrypted: agent.aes_key_encrypted, hmacSecretEncrypted: agent.hmac_secret_encrypted },
      {
        scenario_results: scenarioResults,
        required_in_response: requiredInResponse,
        agent_id: agent.agent_id ?? 'battery-agent',
      },
      60000,
    )
    return NextResponse.json(result)
  } catch (e: any) {
    const msg = String(e?.message ?? 'Gateway error')
    const status = msg.includes('429') ? 429 : msg.includes('400') ? 400 : 502
    return NextResponse.json({ error: msg.slice(0, 300) }, { status })
  }
}
