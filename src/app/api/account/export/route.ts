// app/api/account/export/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Lets a user download all their data as JSON (the "right to data portability").
// Returns the user's profile, their agents (WITHOUT secret columns), and their
// evaluations. Auth required; only ever exports the authenticated user's data.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  // Agents — safe columns only (never the encrypted secrets).
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, description, agent_id, api_key, plan_type, evaluation_limit, evaluations_this_month, created_at')

  const agentIds = (agents || []).map(a => a.id)
  let evaluations: any[] = []
  if (agentIds.length > 0) {
    const { data } = await supabase
      .from('evaluations')
      .select('id, verdict, pei_score, irs_score, frr_score, ti_score, csi_score, created_at, project_id')
      .in('project_id', agentIds)
    evaluations = data || []
  }

  const payload = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || null,
      created_at: user.created_at,
    },
    agents: agents || [],
    evaluations,
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="hbeval-my-data.json"',
    },
  })
}
