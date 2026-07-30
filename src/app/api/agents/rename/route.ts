// app/api/agents/rename/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Rename an agent.
//
// WHY THIS ROUTE EXISTS
// The browser used to write this directly:
//     supabase.from('agents').update({ name }).eq('id', agent.id)
// That required a blanket UPDATE policy on agents, and RLS constrains rows but
// not columns — so the same permission let any user rewrite plan_type and
// evaluation_limit from a console and grant themselves unmetered paid access.
// Migration 14 removes that policy; this route replaces the one legitimate use
// of it.
//
// SECURITY:
//   • Auth required; the user id comes from the session, never from the body.
//   • Ownership is checked, then repeated in the WHERE clause — service_role
//     bypasses RLS, so the ownership predicate is the only thing standing
//     between this route and someone else's agent.
//   • ONLY the name column is written. The column list is fixed here in server
//     code, so no request body can widen it.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const MAX_NAME_LENGTH = 80

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch { body = {} }

  const agentId = String(body.agent_pk ?? '').trim()      // the agents.id (UUID)
  const rawName = String(body.name ?? '')
  const name = rawName.trim().slice(0, MAX_NAME_LENGTH)

  if (!agentId) {
    return NextResponse.json({ error: 'Missing agent id.' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 })
  }

  // Ownership check first.
  const { data: existing, error: findErr } = await supabaseAdmin
    .from('agents').select('id, user_id').eq('id', agentId).single()
  if (findErr || !existing) {
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }
  if (existing.user_id !== user.id) {
    // Same message as not-found: do not confirm that an agent exists for
    // someone else.
    return NextResponse.json({ error: 'Agent not found.' }, { status: 404 })
  }

  const { error: updErr } = await supabaseAdmin
    .from('agents')
    .update({ name })                 // one column, named in server code
    .eq('id', agentId)
    .eq('user_id', user.id)           // ownership repeated in the WHERE

  if (updErr) {
    return NextResponse.json({ error: 'Could not rename the agent.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, name }, { status: 200 })
}
